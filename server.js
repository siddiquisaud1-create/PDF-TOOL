const express = require("express");
const multer = require("multer");
const fs = require("fs");
const axios = require("axios");
const FormData = require("form-data");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
require("dotenv").config();

const { PDFDocument } = require("pdf-lib");

const app = express();
app.set("trust proxy", 1);

// 🔐 Security
app.use(helmet());
app.use(cors());
app.use(express.static("public"));

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
}));

// 🔐 Upload config
const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 20 * 1024 * 1024 }
});

const API_KEY = process.env.API_KEY;

// =======================
// 🔥 CLEAN CONVERTER
// =======================
async function convertFile(path, input, output) {

  const job = await axios.post(
    "https://api.cloudconvert.com/v2/jobs",
    {
      tasks: {
        "import-1": { operation: "import/upload" },

        "convert-1": {
          operation: "convert",
          input: "import-1",
          input_format: input,
          output_format: output
        },

        "export-1": {
          operation: "export/url",
          input: "convert-1"
        }
      }
    },
    {
      headers: { Authorization: `Bearer ${API_KEY}` }
    }
  );

  const uploadTask = job.data.data.tasks.find(t => t.name === "import-1");

  const form = new FormData();
  form.append("file", fs.createReadStream(path));

  await axios.post(uploadTask.result.form.url, form, {
    headers: form.getHeaders()
  });

  let fileUrl;

  while (true) {
    const status = await axios.get(
      `https://api.cloudconvert.com/v2/jobs/${job.data.data.id}`,
      {
        headers: { Authorization: `Bearer ${API_KEY}` }
      }
    );

    const exportTask = status.data.data.tasks.find(t => t.name === "export-1");

    if (exportTask && exportTask.status === "finished") {
      fileUrl = exportTask.result.files[0].url;
      break;
    }

    await new Promise(r => setTimeout(r, 2000));
  }

  const fileRes = await axios.get(fileUrl, {
    responseType: "arraybuffer"
  });

  return fileRes.data;
}

// =======================
// 🥇 TOOL #1 PDF → WORD
// =======================
app.post("/pdf-to-word", upload.single("file"), async (req, res) => {
  try {
    const result = await convertFile(req.file.path, "pdf", "docx");

    res.setHeader("Content-Disposition", "attachment; filename=converted.docx");
    res.send(result);

  } catch (err) {
    console.error("PDF→Word error:", err.message);
    res.status(500).send("Conversion failed");
  } finally {
    if (req.file) fs.unlinkSync(req.file.path);
  }
});

// =======================
// 🔥 GENERIC ROUTE MAKER
// =======================
function createRoute(path, input, output, filename) {
  app.post(path, upload.single("file"), async (req, res) => {
    try {
      const result = await convertFile(req.file.path, input, output);

      res.setHeader(
        "Content-Disposition",
        `attachment; filename=${filename}`
      );

      res.send(result);

    } catch (err) {
      console.error(`${path} error:`, err.message);
      res.status(500).send("Conversion failed");
    } finally {
      if (req.file) fs.unlinkSync(req.file.path);
    }
  });
}

// =======================
// 🔥 OTHER TOOLS
// =======================
createRoute("/word-to-pdf", "docx", "pdf", "converted.pdf");
createRoute("/pdf-to-excel", "pdf", "xlsx", "converted.xlsx");
createRoute("/excel-to-pdf", "xlsx", "pdf", "converted.pdf");
createRoute("/jpg-to-pdf", "jpg", "pdf", "converted.pdf");
createRoute("/png-to-jpg", "png", "jpg", "converted.jpg");
createRoute("/compress-pdf", "pdf", "pdf", "compressed.pdf");

// =======================
// 🔥 MERGE PDF (LOCAL)
// =======================
app.post("/merge-pdf", upload.array("file", 10), async (req, res) => {
  try {
    const merged = await PDFDocument.create();

    for (let f of req.files) {
      const bytes = fs.readFileSync(f.path);
      const pdf = await PDFDocument.load(bytes);
      const pages = await merged.copyPages(pdf, pdf.getPageIndices());
      pages.forEach(p => merged.addPage(p));
    }

    const result = await merged.save();

    res.setHeader("Content-Type", "application/pdf");
    res.send(Buffer.from(result));

  } catch {
    res.status(500).send("Merge error");
  } finally {
    req.files?.forEach(f => fs.unlinkSync(f.path));
  }
});

// =======================
app.listen(process.env.PORT || 3000, () =>
  console.log("🚀 Server running")
);

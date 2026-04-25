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

// 🔐 Security middlewares
app.use(helmet());
app.use(cors());
app.use(express.static("public"));

// 🔐 Rate limit
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
}));

// 🔐 Multer (strict validation)
const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 20 * 1024 * 1024,
    files: 10
  },
  fileFilter: (req, file, cb) => {
    const allowed = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ];

    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Invalid file type"));
  }
});

const API_KEY = process.env.API_KEY;

// =======================
// 🔥 CloudConvert helper
// =======================
async function convertFile(path, input, output) {
  try {
    const job = await axios.post("https://api.cloudconvert.com/v2/jobs", {
      tasks: {
        upload: { operation: "import/upload" },
        convert: {
          operation: "convert",
          input: "upload",
          input_format: input,
          output_format: output
        },
        export: { operation: "export/url", input: "convert" }
      }
    }, {
      headers: { Authorization: `Bearer ${API_KEY}` }
    });

    const uploadTask = job.data.data.tasks.find(t => t.name === "upload");

    const form = new FormData();
    form.append("file", fs.createReadStream(path));

    await axios.post(uploadTask.result.form.url, form, {
      headers: form.getHeaders()
    });

    let url = null;

    for (let i = 0; i < 10; i++) {
      const status = await axios.get(
        `https://api.cloudconvert.com/v2/jobs/${job.data.data.id}`,
        { headers: { Authorization: `Bearer ${API_KEY}` } }
      );

      const exportTask = status.data.data.tasks.find(t => t.name === "export");

      if (exportTask?.result) {
        url = exportTask.result.files[0].url;
        break;
      }

      await new Promise(r => setTimeout(r, 2000));
    }

    if (!url) throw new Error("Conversion timeout");

    return url;

  } catch (err) {
    console.error("Conversion error:", err.message);
    throw err;
  }
}

// =======================
// 🔥 Merge PDF
// =======================
app.post("/merge-pdf", upload.array("file", 10), async (req, res) => {
  try {
    if (!req.files || req.files.length < 2) {
      return res.status(400).send("Upload at least 2 PDFs");
    }

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
// 🔥 Split PDF
// =======================
app.post("/split-pdf", upload.single("file"), async (req, res) => {
  try {
    const bytes = fs.readFileSync(req.file.path);
    const pdf = await PDFDocument.load(bytes);

    const newPdf = await PDFDocument.create();
    const [page] = await newPdf.copyPages(pdf, [0]);
    newPdf.addPage(page);

    const result = await newPdf.save();

    res.setHeader("Content-Type", "application/pdf");
    res.send(Buffer.from(result));

  } catch {
    res.status(500).send("Split error");
  } finally {
    if (req.file) fs.unlinkSync(req.file.path);
  }
});

// =======================
// 🔥 CloudConvert routes
// =======================
function route(path, input, output) {
  app.post(path, upload.single("file"), async (req, res) => {
    try {
      const url = await convertFile(req.file.path, input, output);
      res.redirect(url);
    } catch {
      res.status(500).send("Conversion failed");
    } finally {
      if (req.file) fs.unlinkSync(req.file.path);
    }
  });
}

route("/pdf-to-word", "pdf", "docx");
route("/word-to-pdf", "docx", "pdf");
route("/pdf-to-excel", "pdf", "xlsx");
route("/excel-to-pdf", "xlsx", "pdf");
route("/jpg-to-pdf", "jpg", "pdf");
route("/png-to-jpg", "png", "jpg");
route("/compress-pdf", "pdf", "pdf");

// =======================
app.listen(process.env.PORT || 3000, () =>
  console.log("Server running")
);

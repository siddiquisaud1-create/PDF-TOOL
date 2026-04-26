require("dotenv").config();

const express = require("express");
const multer = require("multer");
const fs = require("fs");
const axios = require("axios");
const FormData = require("form-data");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const sharp = require("sharp");

const app = express();

// =======================
// 🔐 SECURITY
// =======================
app.use(helmet());
app.use(cors({ origin: "*" })); // change to your domain later
app.disable("x-powered-by");

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use(limiter);

// =======================
// 📂 FILE UPLOAD
// =======================
const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 15 * 1024 * 1024 }
});

// =======================
const API_KEY = process.env.API_KEY;

// =======================
// 🔥 CORE CONVERTER
// =======================
async function convertFile(path, input, output) {

  console.log("🚀 Creating job...");

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
      headers: { Authorization: "Bearer " + API_KEY }
    }
  );

  console.log("🆔 Job ID:", job.data.data.id);

  const uploadTask = job.data.data.tasks.find(t => t.name === "import-1");

  // Upload file
  const form = new FormData();

  Object.entries(uploadTask.result.form).forEach(([k, v]) => {
    form.append(k, v);
  });

  form.append("file", fs.createReadStream(path));

  await axios.post(uploadTask.result.url, form, {
    headers: form.getHeaders()
  });

  console.log("📤 File uploaded");

  // Poll job
  let fileUrl = null;
  let attempts = 0;

  while (!fileUrl && attempts < 30) {

    const status = await axios.get(
      `https://api.cloudconvert.com/v2/jobs/${job.data.data.id}`,
      {
        headers: { Authorization: "Bearer " + API_KEY }
      }
    );

    const exportTask = status.data.data.tasks.find(t => t.name === "export-1");

    console.log("⏳ Status:", exportTask?.status);

    if (
      exportTask &&
      exportTask.status === "finished" &&
      exportTask.result?.files?.length
    ) {
      fileUrl = exportTask.result.files[0].url;
    }

    await new Promise(r => setTimeout(r, 2000));
    attempts++;
  }

  if (!fileUrl) throw new Error("Conversion timeout");

  console.log("⬇️ Downloading file...");

  const fileRes = await axios.get(fileUrl, {
    responseType: "arraybuffer"
  });

  console.log("📦 File size:", fileRes.data.length);

  return fileRes.data;
}

// =======================
// 🔄 UNIVERSAL CONVERT
// =======================
app.post("/convert", upload.single("file"), async (req, res) => {
  try {

    if (!req.file) return res.status(400).send("No file");

    const { input, output } = req.body;

    console.log("🔁 Convert:", input, "→", output);

    const result = await convertFile(req.file.path, input, output);

    res.setHeader("Content-Disposition", `attachment; filename=converted.${output}`);
    res.send(result);

  } catch (err) {
    console.error("❌ ERROR:", err.response?.data || err.message);
    res.status(500).send("Conversion failed");
  } finally {
    if (req.file) fs.unlinkSync(req.file.path);
  }
});

// =======================
// 📄 MERGE PDF
// =======================
app.post("/merge-pdf", upload.array("files"), async (req, res) => {
  try {
    if (!req.files || req.files.length < 2) {
      return res.status(400).send("Upload at least 2 files");
    }

    console.log("🧩 Merging PDFs...");

    const job = await axios.post(
      "https://api.cloudconvert.com/v2/jobs",
      {
        tasks: {
          "import-1": { operation: "import/upload" },
          "merge-1": {
            operation: "merge",
            input: ["import-1"],
            output_format: "pdf"
          },
          "export-1": {
            operation: "export/url",
            input: "merge-1"
          }
        }
      },
      {
        headers: { Authorization: "Bearer " + API_KEY }
      }
    );

    const uploadTask = job.data.data.tasks.find(t => t.name === "import-1");

    for (let file of req.files) {
      const form = new FormData();
      Object.entries(uploadTask.result.form).forEach(([k, v]) => form.append(k, v));
      form.append("file", fs.createReadStream(file.path));

      await axios.post(uploadTask.result.url, form, {
        headers: form.getHeaders()
      });
    }

    let fileUrl = null;

    while (!fileUrl) {
      const status = await axios.get(
        `https://api.cloudconvert.com/v2/jobs/${job.data.data.id}`,
        {
          headers: { Authorization: "Bearer " + API_KEY }
        }
      );

      const exportTask = status.data.data.tasks.find(t => t.name === "export-1");

      if (exportTask?.status === "finished") {
        fileUrl = exportTask.result.files[0].url;
      }

      await new Promise(r => setTimeout(r, 2000));
    }

    const fileRes = await axios.get(fileUrl, { responseType: "arraybuffer" });

    res.setHeader("Content-Disposition", "attachment; filename=merged.pdf");
    res.send(fileRes.data);

  } catch (err) {
    console.error(err);
    res.status(500).send("Merge failed");
  } finally {
    req.files.forEach(f => fs.unlinkSync(f.path));
  }
});

// =======================
// 🗜️ COMPRESS PDF
// =======================
app.post("/compress-pdf", upload.single("file"), async (req, res) => {
  try {

    const result = await convertFile(req.file.path, "pdf", "pdf");

    res.setHeader("Content-Disposition", "attachment; filename=compressed.pdf");
    res.send(result);

  } catch (err) {
    console.error(err);
    res.status(500).send("Compress failed");
  } finally {
    fs.unlinkSync(req.file.path);
  }
});

// =======================
// 🖼️ RESIZE IMAGE
// =======================
app.post("/resize-image", upload.single("file"), async (req, res) => {
  try {

    const width = parseInt(req.body.width);
    const height = parseInt(req.body.height);

    const buffer = await sharp(req.file.path)
      .resize(width || null, height || null)
      .toBuffer();

    res.setHeader("Content-Disposition", "attachment; filename=resized.jpg");
    res.send(buffer);

  } catch (err) {
    console.error(err);
    res.status(500).send("Resize failed");
  } finally {
    fs.unlinkSync(req.file.path);
  }
});

// =======================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🚀 Server running on port", PORT);
});

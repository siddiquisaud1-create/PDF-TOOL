require("dotenv").config();

const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
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
app.use(cors({ origin: "*" }));
app.disable("x-powered-by");

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
}));

// =======================
// 📁 STATIC FILES
// =======================
app.use(express.static(path.join(__dirname, "public")));

// =======================
// 📂 FILE UPLOAD
// =======================
const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 15 * 1024 * 1024 }
});

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error("❌ API_KEY missing in Render environment");
}

// =======================
// 🔥 CORE CONVERTER
// =======================
async function convertFile(filePath, input, output) {

  if (!API_KEY) throw new Error("Missing API_KEY");

  try {
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

    const uploadTask = job.data.data.tasks.find(t => t.name === "import-1");

    // 🔥 FIXED UPLOAD (BUFFER METHOD)
    const form = new FormData();

    Object.entries(uploadTask.result.form).forEach(([k, v]) => {
      form.append(k, v);
    });

    const fileBuffer = fs.readFileSync(filePath);

    form.append("file", fileBuffer, {
      filename: path.basename(filePath)
    });

    await axios.post(uploadTask.result.url, form, {
      headers: form.getHeaders()
    });

    console.log("📤 File uploaded");

    // Poll for result
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

  } catch (err) {
    console.error("🔥 CloudConvert ERROR:");
    console.error(err.response?.data || err.message || err);
    throw err;
  }
}

// =======================
// 🔄 CONVERT ROUTE
// =======================
app.post("/convert", upload.single("file"), async (req, res) => {
  try {

    if (!req.file) {
      return res.status(400).send("No file uploaded");
    }

    console.log("📥 File received:", req.file.originalname);

    const { input, output } = req.body;

    if (!input || !output) {
      return res.status(400).send("Missing format");
    }

    console.log("🔁 Convert:", input, "→", output);

    const result = await convertFile(req.file.path, input, output);

    res.setHeader("Content-Disposition", `attachment; filename=converted.${output}`);
    res.send(result);

  } catch (err) {
    console.error("🔥 FULL ERROR:");
    console.error(err.response?.data || err.message || err);
    res.status(500).send("Conversion failed");
  } finally {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
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
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
  }
});

// =======================
// 🌐 ROUTES
// =======================
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/:page", (req, res) => {
  const filePath = path.join(__dirname, "public", req.params.page + ".html");

  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send("Page not found");
  }
});

// =======================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🚀 Server running on port", PORT);
});

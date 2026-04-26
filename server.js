require("dotenv").config();

const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const sharp = require("sharp");
const CloudConvert = require("cloudconvert");

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

// =======================
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error("❌ API_KEY missing");
}

const cloudConvert = new CloudConvert(API_KEY);

// =======================
// 🔄 CONVERT ROUTE
// =======================
app.post("/convert", upload.single("file"), async (req, res) => {
  try {

    if (!req.file) {
      return res.status(400).send("No file uploaded");
    }

    const { input, output } = req.body;

    console.log("📥 File:", req.file.originalname);
    console.log("🔁 Convert:", input, "→", output);

    // 🔥 CREATE JOB
    const job = await cloudConvert.jobs.create({
      tasks: {
        importFile: { operation: "import/upload" },
        convertFile: {
          operation: "convert",
          input: "importFile",
          input_format: input,
          output_format: output
        },
        exportFile: {
          operation: "export/url",
          input: "convertFile"
        }
      }
    });

    console.log("🧠 JOB CREATED:", job.id);

    // 🔥 GET UPLOAD TASK
    const uploadTask = job.tasks.find(t => t.name === "importFile");

    if (!uploadTask) {
      throw new Error("Upload task not found");
    }

    console.log("📤 Uploading...");

    // 🔥 FIXED UPLOAD (IMPORTANT)
    await cloudConvert.tasks.upload(
      uploadTask,
      fs.createReadStream(req.file.path),
      req.file.originalname
    );

    console.log("✅ Upload complete");

    // 🔥 WAIT FOR COMPLETION
    const completedJob = await cloudConvert.jobs.wait(job.id);

    console.log("🧠 JOB RESULT:", JSON.stringify(completedJob, null, 2));

    // =======================
    // CHECK CONVERT
    // =======================
    const convertTask = completedJob.tasks.find(t => t.name === "convertFile");

    if (!convertTask || convertTask.status !== "finished") {
      console.error("🔥 Convert failed:", convertTask);
      throw new Error(convertTask?.message || "Conversion failed");
    }

    // =======================
    // CHECK EXPORT
    // =======================
    const exportTask = completedJob.tasks.find(t => t.name === "exportFile");

    if (!exportTask || !exportTask.result || !exportTask.result.files) {
      console.error("🔥 Export failed:", exportTask);
      throw new Error("Export failed");
    }

    const fileUrl = exportTask.result.files[0].url;

    console.log("⬇️ Downloading...");

    const response = await fetch(fileUrl);
    const buffer = Buffer.from(await response.arrayBuffer());

    console.log("📦 File size:", buffer.length);

    res.setHeader("Content-Disposition", `attachment; filename=converted.${output}`);
    res.send(buffer);

  } catch (err) {
    console.error("🔥 FINAL ERROR:", err.message || err);
    res.status(500).send(err.message || "Conversion failed");
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

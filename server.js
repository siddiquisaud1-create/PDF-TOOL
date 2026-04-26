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
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],

        scriptSrc: [
          "'self'",
          "'unsafe-inline'", // allow inline scripts
          "https://pagead2.googlesyndication.com",
          "https://www.googletagmanager.com"
        ],
scriptSrc: [
  "'self'",
  "'unsafe-inline'",
  "https://pagead2.googlesyndication.com",
  "https://www.googletagmanager.com",
  "https://ep1.adtrafficquality.google",
  "https://ep2.adtrafficquality.google"
],

        imgSrc: [
          "'self'",
          "data:",
          "https://www.google-analytics.com"
        ],

        frameSrc: [
          "https://googleads.g.doubleclick.net",
          "https://tpc.googlesyndication.com"
        ]
      }
    }
  })
);
app.use(cors({ origin: "*" }));
app.disable("x-powered-by");

// Global limiter (light)
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200
}));

// =======================
// 🚫 STRICT LIMIT FOR CONVERT (IMPORTANT)
// =======================
const convertLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 5, // max 5 conversions per minute per IP
  message: "Too many conversions, please wait 1 minute"
});

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
// 🧠 COOLDOWN MEMORY
// =======================
const lastRequestMap = new Map();

// =======================
// 🔄 CONVERT ROUTE
// =======================
app.post("/convert", convertLimiter, upload.single("file"), async (req, res) => {
  try {

    // 🚫 BLOCK BOTS (Googlebot etc.)
    const ua = req.headers["user-agent"] || "";
    if (ua.includes("Googlebot") || ua.includes("bot")) {
      return res.status(403).send("Bots not allowed");
    }

    // ⏱️ COOLDOWN PER IP (3 sec)
    const ip = req.ip;
    const now = Date.now();

    if (lastRequestMap.has(ip) && now - lastRequestMap.get(ip) < 3000) {
      return res.status(429).send("Wait 3 seconds before next request");
    }

    lastRequestMap.set(ip, now);

    if (!req.file) {
      return res.status(400).send("No file uploaded");
    }

    const { input, output } = req.body;

    console.log("📥 File:", req.file.originalname);
    console.log("🔁 Convert:", input, "→", output);

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

    const uploadTask = job.tasks.find(t => t.name === "importFile");

    if (!uploadTask) {
      throw new Error("Upload task not found");
    }

    console.log("📤 Uploading...");

    await cloudConvert.tasks.upload(
      uploadTask,
      fs.createReadStream(req.file.path),
      req.file.originalname
    );

    console.log("✅ Upload complete");

    const completedJob = await cloudConvert.jobs.wait(job.id);

    const convertTask = completedJob.tasks.find(t => t.name === "convertFile");

    if (!convertTask || convertTask.status !== "finished") {
      throw new Error(convertTask?.message || "Conversion failed");
    }

    const exportTask = completedJob.tasks.find(t => t.name === "exportFile");

    if (!exportTask || !exportTask.result || !exportTask.result.files) {
      throw new Error("Export failed");
    }

    const fileUrl = exportTask.result.files[0].url;

    const response = await fetch(fileUrl);
    const buffer = Buffer.from(await response.arrayBuffer());

    res.setHeader("Content-Disposition", `attachment; filename=converted.${output}`);
    res.send(buffer);

  } catch (err) {
    console.error("🔥 FINAL ERROR:", err.message || err);

    // 👇 HANDLE 429 FROM API CLEANLY
    if (err.message && err.message.includes("429")) {
      return res.status(429).send("Server busy, try again after few seconds");
    }

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

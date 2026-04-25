const express = require("express");
const multer = require("multer");
const { PDFDocument } = require("pdf-lib");
const fs = require("fs");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const app = express();
app.set("trust proxy", 1);
app.use(cors());
app.use(express.static("public"));

// 🔐 RATE LIMIT
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
}));

// 🔐 MULTER SETUP (LIMITS + VALIDATION)
const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per file
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files allowed"));
    }
  }
});

// ✅ MERGE ROUTE (FIXED)
app.post("/merge-pdf", upload.array("file", 10), async (req, res) => {
  try {

    if (!req.files || req.files.length < 2) {
      return res.status(400).send("Upload at least 2 PDFs");
    }

    const merged = await PDFDocument.create();

    for (let file of req.files) {
      const bytes = fs.readFileSync(file.path);
      const pdf = await PDFDocument.load(bytes);
      const pages = await merged.copyPages(pdf, pdf.getPageIndices());
      pages.forEach(p => merged.addPage(p));
    }

    const result = await merged.save();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=merged.pdf");
    res.send(Buffer.from(result));

    // 🧹 CLEAN FILES
    req.files.forEach(f => fs.unlinkSync(f.path));

  } catch (err) {
    console.error(err);
    res.status(500).send("Error merging PDF");
  }
});

// 🚀 SERVER
app.listen(3000, () => console.log("Running on http://localhost:3000"));

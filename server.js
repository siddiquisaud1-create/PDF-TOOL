const express = require("express");
const multer = require("multer");
const { PDFDocument } = require("pdf-lib");
const fs = require("fs");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.static("public"));

const upload = multer({ dest: "uploads/" });

app.post("/merge", upload.array("pdfs"), async (req, res) => {
  try {
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

    req.files.forEach(f => fs.unlinkSync(f.path));

  } catch {
    res.status(500).send("Error merging PDF");
  }
});

app.listen(3000, () => console.log("Running on http://localhost:3000"));
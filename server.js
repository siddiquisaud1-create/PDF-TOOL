const express = require("express");
const multer = require("multer");
const fs = require("fs");
const axios = require("axios");
const FormData = require("form-data");
const sharp = require("sharp");
require("dotenv").config();

const app = express();
app.use(express.static("public"));

const upload = multer({ dest: "uploads/" });
const API_KEY = process.env.API_KEY;

// =======================
// COMMON CONVERT FUNCTION
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
      headers: { Authorization: "Bearer " + API_KEY }
    }
  );

  const uploadTask = job.data.data.tasks.find(t => t.name === "import-1");

  const form = new FormData();
  Object.entries(uploadTask.result.form).forEach(([k, v]) => form.append(k, v));
  form.append("file", fs.createReadStream(path));

  await axios.post(uploadTask.result.url, form, {
    headers: form.getHeaders()
  });

  let fileUrl = null;
  let attempts = 0;

  while (!fileUrl && attempts < 25) {
    const status = await axios.get(
      `https://api.cloudconvert.com/v2/jobs/${job.data.data.id}`,
      { headers: { Authorization: "Bearer " + API_KEY } }
    );

    const exportTask = status.data.data.tasks.find(t => t.name === "export-1");

    if (exportTask && exportTask.status === "finished") {
      fileUrl = exportTask.result.files[0].url;
    }

    await new Promise(r => setTimeout(r, 2000));
    attempts++;
  }

  if (!fileUrl) throw new Error("Timeout");

  const fileRes = await axios.get(fileUrl, { responseType: "arraybuffer" });
  return fileRes.data;
}

// =======================
// UNIVERSAL CONVERT ROUTE
// =======================
app.post("/convert", upload.single("file"), async (req, res) => {
  try {
    const { input, output } = req.body;

    const result = await convertFile(req.file.path, input, output);

    res.setHeader("Content-Disposition", `attachment; filename=converted.${output}`);
    res.send(result);

  } catch (e) {
    res.status(500).send("Error");
  } finally {
    fs.unlinkSync(req.file.path);
  }
});

// =======================
// MERGE PDF
// =======================
app.post("/merge-pdf", upload.array("files"), async (req, res) => {
  try {

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
        { headers: { Authorization: "Bearer " + API_KEY } }
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

  } catch (e) {
    res.status(500).send("Merge error");
  } finally {
    req.files.forEach(f => fs.unlinkSync(f.path));
  }
});

// =======================
// COMPRESS PDF
// =======================
app.post("/compress-pdf", upload.single("file"), async (req, res) => {
  try {

    const job = await axios.post(
      "https://api.cloudconvert.com/v2/jobs",
      {
        tasks: {
          "import-1": { operation: "import/upload" },
          "compress-1": {
            operation: "optimize",
            input: "import-1",
            optimize_print: true
          },
          "export-1": {
            operation: "export/url",
            input: "compress-1"
          }
        }
      },
      {
        headers: { Authorization: "Bearer " + API_KEY }
      }
    );

    const uploadTask = job.data.data.tasks.find(t => t.name === "import-1");

    const form = new FormData();
    Object.entries(uploadTask.result.form).forEach(([k, v]) => form.append(k, v));
    form.append("file", fs.createReadStream(req.file.path));

    await axios.post(uploadTask.result.url, form, {
      headers: form.getHeaders()
    });

    let fileUrl = null;

    while (!fileUrl) {
      const status = await axios.get(
        `https://api.cloudconvert.com/v2/jobs/${job.data.data.id}`,
        { headers: { Authorization: "Bearer " + API_KEY } }
      );

      const exportTask = status.data.data.tasks.find(t => t.name === "export-1");

      if (exportTask?.status === "finished") {
        fileUrl = exportTask.result.files[0].url;
      }

      await new Promise(r => setTimeout(r, 2000));
    }

    const fileRes = await axios.get(fileUrl, { responseType: "arraybuffer" });

    res.setHeader("Content-Disposition", "attachment; filename=compressed.pdf");
    res.send(fileRes.data);

  } catch (e) {
    res.status(500).send("Compression error");
  } finally {
    fs.unlinkSync(req.file.path);
  }
});

// =======================
// RESIZE IMAGE (LOCAL)
// =======================
app.post("/resize-image", upload.single("file"), async (req, res) => {
  try {

    const width = parseInt(req.body.width) || null;
    const height = parseInt(req.body.height) || null;

    const buffer = await sharp(req.file.path)
      .resize(width, height)
      .toBuffer();

    res.setHeader("Content-Disposition", "attachment; filename=resized.jpg");
    res.send(buffer);

  } catch (e) {
    res.status(500).send("Resize error");
  } finally {
    fs.unlinkSync(req.file.path);
  }
});

// =======================
app.listen(3000, () => console.log("Server running"));

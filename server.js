const express = require("express");
const multer = require("multer");
const fs = require("fs");
const axios = require("axios");
const FormData = require("form-data");
require("dotenv").config();

const app = express();

// Upload config
const upload = multer({ dest: "uploads/" });

const API_KEY = process.env.API_KEY;

// =======================
// CLEAN CONVERTER
// =======================
async function convertFile(path, input, output) {

// 1. Create job
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

const uploadTask = job.data.data.tasks.find(function(t) {
return t.name === "import-1";
});

// 2. Upload file
const form = new FormData();

Object.entries(uploadTask.result.form.parameters).forEach(function(entry) {
form.append(entry[0], entry[1]);
});

form.append("file", fs.createReadStream(path));

await axios.post(uploadTask.result.form.url, form, {
headers: form.getHeaders()
});

// 3. Wait for result
let fileUrl = null;

while (!fileUrl) {
const status = await axios.get(
"https://api.cloudconvert.com/v2/jobs/" + job.data.data.id,
{
headers: { Authorization: "Bearer " + API_KEY }
}
);

```
const exportTask = status.data.data.tasks.find(function(t) {
  return t.name === "export-1";
});

if (exportTask && exportTask.status === "finished") {
  fileUrl = exportTask.result.files[0].url;
}

await new Promise(function(r) {
  setTimeout(r, 2000);
});
```

}

// 4. Download file
const fileRes = await axios.get(fileUrl, {
responseType: "arraybuffer"
});

return fileRes.data;
}

// =======================
// PDF → WORD
// =======================
app.post("/pdf-to-word", upload.single("file"), async function(req, res) {
try {

```
const result = await convertFile(req.file.path, "pdf", "docx");

res.setHeader("Content-Disposition", "attachment; filename=converted.docx");
res.send(result);
```

} catch (err) {

```
console.error("Error:", err.message);
res.status(500).send("Conversion failed");
```

} finally {

```
if (req.file) fs.unlinkSync(req.file.path);
```

}
});

// =======================
// START SERVER
// =======================
app.listen(3000, function() {
console.log("Server running on port 3000");
});

const fileInput = document.getElementById("fileInput");
const fileName = document.getElementById("fileName");
const convertBtn = document.getElementById("convertBtn");
const uploadBox = document.getElementById("uploadBox");
const addBox = document.getElementById("addBox");

// 🔥 auto detect formats
const inputFormat = document.body.dataset.input;
const outputFormat = document.body.dataset.output;

// =======================
// OPEN FILE (ALL BUTTONS)
// =======================
if (uploadBox) {
  uploadBox.addEventListener("click", () => fileInput.click());
}

if (addBox) {
  addBox.addEventListener("click", () => fileInput.click());
}

// =======================
// SHOW FILE NAME / COUNT
// =======================
if (fileInput) {
  fileInput.addEventListener("change", function(){
    if(this.files.length > 1){
      fileName.innerText = this.files.length + " files selected";
    } else if (this.files.length === 1){
      fileName.innerText = "Selected: " + this.files[0].name;
    }
  });
}

// =======================
// MAIN ACTION BUTTON
// =======================
if (convertBtn) {
  convertBtn.addEventListener("click", async function(){

    const files = fileInput.files;

    if(!files.length){
      alert("Please upload file first");
      return;
    }

    convertBtn.innerText = "Processing...";
    convertBtn.disabled = true;

    const formData = new FormData();

    try {

      // =======================
      // 🔥 MERGE PDF TOOL
      // =======================
      if (window.location.pathname.includes("merge")) {

        for (let i = 0; i < files.length; i++) {
          formData.append("files", files[i]);
        }

        const res = await fetch("/merge-pdf", {
          method: "POST",
          body: formData
        });

        if (!res.ok) throw new Error(await res.text());

        const blob = await res.blob();

        downloadFile(blob, "merged.pdf");

      }

      // =======================
      // 🔥 RESIZE IMAGE TOOL
      // =======================
      else if (window.location.pathname.includes("resize")) {

        const width = document.getElementById("width")?.value;
        const height = document.getElementById("height")?.value;

        formData.append("file", files[0]);
        formData.append("width", width);
        formData.append("height", height);

        const res = await fetch("/resize-image", {
          method: "POST",
          body: formData
        });

        if (!res.ok) throw new Error(await res.text());

        const blob = await res.blob();

        downloadFile(blob, "resized.jpg");

      }

      // =======================
      // 🔥 NORMAL CONVERSION
      // =======================
      else {

        formData.append("file", files[0]);
        formData.append("input", inputFormat);
        formData.append("output", outputFormat);

        const res = await fetch("/convert", {
          method: "POST",
          body: formData
        });

        if (!res.ok) throw new Error(await res.text());

        const blob = await res.blob();

        downloadFile(blob, "converted." + outputFormat);
      }

      setTimeout(() => location.reload(), 1000);

    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      convertBtn.innerText = "Convert";
      convertBtn.disabled = false;
    }

  });
}

// =======================
// DOWNLOAD HELPER
// =======================
function downloadFile(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = filename;
  a.click();
}

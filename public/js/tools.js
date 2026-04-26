const fileInput = document.getElementById("fileInput");
const fileName = document.getElementById("fileName");
const convertBtn = document.getElementById("convertBtn");
const uploadBox = document.getElementById("uploadBox");
const addBox = document.getElementById("addBox");
const filePreview = document.getElementById("filePreview");

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
// SHOW FILE NAME + PREVIEW
// =======================
if (fileInput) {
  fileInput.addEventListener("change", function(){

    // file name / count
    if(this.files.length > 1){
      fileName.innerText = this.files.length + " files selected";
    } else if (this.files.length === 1){
      fileName.innerText = "Selected: " + this.files[0].name;
    }

    // 🔥 PREVIEW
    if (filePreview) {
      filePreview.innerHTML = "";

      Array.from(this.files).forEach(file => {

        const div = document.createElement("div");
        div.style.display = "flex";
        div.style.alignItems = "center";
        div.style.gap = "10px";
        div.style.background = "#fff";
        div.style.padding = "10px";
        div.style.marginTop = "10px";
        div.style.borderRadius = "8px";
        div.style.boxShadow = "0 2px 8px rgba(0,0,0,0.05)";

        // IMAGE PREVIEW
        if (file.type.startsWith("image/")) {
          const img = document.createElement("img");
          img.src = URL.createObjectURL(file);
          img.style.width = "50px";
          img.style.height = "50px";
          img.style.objectFit = "cover";
          img.style.borderRadius = "6px";
          div.appendChild(img);
        }

        // PDF ICON
        else if (file.type === "application/pdf") {
          const icon = document.createElement("img");
          icon.src = "https://cdn-icons-png.flaticon.com/512/337/337946.png";
          icon.style.width = "40px";
          div.appendChild(icon);
        }

        // FILE NAME
        const name = document.createElement("span");
        name.innerText = file.name;

        div.appendChild(name);
        filePreview.appendChild(div);

      });
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

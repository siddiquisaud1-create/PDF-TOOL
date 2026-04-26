const fileInput = document.getElementById("fileInput");
const fileName = document.getElementById("fileName");
const convertBtn = document.getElementById("convertBtn");
const uploadBox = document.getElementById("uploadBox");

// 🔥 auto detect formats
const inputFormat = document.body.dataset.input;
const outputFormat = document.body.dataset.output;

// open file
if (uploadBox) {
  uploadBox.addEventListener("click", () => fileInput.click());
}

// show file name
if (fileInput) {
  fileInput.addEventListener("change", function(){
    if(this.files.length > 0){
      fileName.innerText = "Selected: " + this.files[0].name;
    }
  });
}

// convert
if (convertBtn) {
  convertBtn.addEventListener("click", async function(){

    const file = fileInput.files[0];

    if(!file){
      alert("Please upload file first");
      return;
    }

    convertBtn.innerText = "Processing...";
    convertBtn.disabled = true;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("input", inputFormat);
    formData.append("output", outputFormat);

    try {
      const res = await fetch("/convert", {
        method: "POST",
        body: formData
      });

      if (!res.ok) throw new Error(await res.text());

      const blob = await res.blob();

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");

      a.href = url;
      a.download = "converted." + outputFormat;
      a.click();

      setTimeout(() => location.reload(), 1000);

    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      convertBtn.innerText = "Convert";
      convertBtn.disabled = false;
    }

  });
}

const fileInput = document.getElementById("fileInput");
const fileName = document.getElementById("fileName");
const convertBtn = document.getElementById("convertBtn");
const uploadBox = document.getElementById("uploadBox");

function openFile(){
  fileInput.click();
}

uploadBox.addEventListener("click", openFile);

fileInput.addEventListener("change", function(){
  if(this.files.length > 0){
    fileName.innerText = "Selected: " + this.files[0].name;
  }
});

convertBtn.addEventListener("click", function(){

  const file = fileInput.files[0];

  if(!file){
    alert("Please upload file first");
    return;
  }

  convertBtn.innerText = "Processing...";
  convertBtn.disabled = true;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("input", "pdf");
  formData.append("output", "docx");

  fetch("/convert", {
    method: "POST",
    body: formData
  })
  .then(res => {
    if(!res.ok) throw new Error("Conversion failed");
    return res.blob();
  })
  .then(blob => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = "converted.docx";
    a.click();

    setTimeout(() => location.reload(), 1000);
  })
  .catch(err => {
    console.error(err);
    alert("Error: " + err.message);
  })
  .finally(() => {
    convertBtn.innerText = "Convert to Word";
    convertBtn.disabled = false;
  });

});

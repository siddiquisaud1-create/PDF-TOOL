let selectedFile;

// WAIT until DOM loads
document.addEventListener("DOMContentLoaded", () => {

  const btn = document.getElementById("btn");
  const fileInput = document.getElementById("file");

  if (!btn || !fileInput) return;

  // Choose file
  btn.addEventListener("click", () => {
    fileInput.click();
  });

  fileInput.addEventListener("change", (e) => {
    selectedFile = e.target.files[0];

    if (selectedFile) {
      btn.innerText = selectedFile.name;
    }
  });

});

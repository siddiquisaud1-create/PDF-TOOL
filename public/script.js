let selectedFile;

// INIT
document.addEventListener("DOMContentLoaded", () => {
  initDrop();

  // File input change
  document.getElementById("file").addEventListener("change", function () {
    filePicked(this);
  });

  // Upload button
  document.getElementById("startUpload").addEventListener("click", () => {
    upload("/upload", "output.pdf"); // change endpoint if needed
  });
});

// DROP AREA SETUP
function initDrop() {
  const drop = document.getElementById("drop");
  const fileInput = document.getElementById("file");

  // Click → open file picker
  drop.addEventListener("click", () => fileInput.click());

  // Drag over
  drop.addEventListener("dragover", (e) => {
    e.preventDefault();
    drop.classList.add("dragover");
  });

  // Drag leave
  drop.addEventListener("dragleave", () => {
    drop.classList.remove("dragover");
  });

  // Drop file
  drop.addEventListener("drop", (e) => {
    e.preventDefault();
    drop.classList.remove("dragover");

    selectedFile = e.dataTransfer.files[0];

    if (selectedFile) {
      document.getElementById("btn").innerText = selectedFile.name;
    }
  });
}

// FILE PICKED
function filePicked(input) {
  selectedFile = input.files[0];

  if (selectedFile) {
    document.getElementById("btn").innerText = selectedFile.name;
  }
}

// UPLOAD FUNCTION
function upload(endpoint, outputName) {
  if (!selectedFile) {
    alert("Select file first");
    return;
  }

  const formData = new FormData();
  formData.append("file", selectedFile);

  const xhr = new XMLHttpRequest();

  // Progress
  xhr.upload.onprogress = (e) => {
    if (e.lengthComputable) {
      const percent = (e.loaded / e.total) * 100;
      document.getElementById("bar").style.width = percent + "%";
    }
  };

  document.getElementById("status").innerText = "Uploading...";

  xhr.onload = () => {
    if (xhr.status === 200) {
      document.getElementById("status").innerText = "Processing...";

      const blob = new Blob([xhr.response]);
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = outputName;
      a.click();

      document.getElementById("status").innerText = "Done";
    } else {
      document.getElementById("status").innerText = "Upload failed";
    }
  };

  xhr.onerror = () => {
    document.getElementById("status").innerText = "Error uploading";
  };

  xhr.open("POST", endpoint);
  xhr.responseType = "blob";
  xhr.send(formData);
}

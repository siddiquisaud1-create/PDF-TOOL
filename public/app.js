let selectedFile;

function init() {
  const drop = document.getElementById("drop");

  drop.onclick = () => document.getElementById("file").click();

  drop.ondragover = e => {
    e.preventDefault();
    drop.style.background = "#eef2ff";
  };

  drop.ondragleave = () => {
    drop.style.background = "white";
  };

  drop.ondrop = e => {
    e.preventDefault();
    drop.style.background = "white";

    selectedFile = e.dataTransfer.files[0];
    drop.innerText = selectedFile.name;
  };
}

function filePicked(input) {
  selectedFile = input.files[0];
  document.getElementById("drop").innerText = selectedFile.name;
}

function upload(endpoint, output) {
  if (!selectedFile) return alert("Select file");

  const formData = new FormData();
  formData.append("file", selectedFile);

  const xhr = new XMLHttpRequest();

  // 🔥 STATUS: Uploading
  document.getElementById("status").innerText = "Uploading...";

  // 🔥 PROGRESS BAR
  xhr.upload.onprogress = e => {
    const percent = Math.round((e.loaded / e.total) * 100);
    document.getElementById("bar").style.width = percent + "%";
    document.getElementById("status").innerText = "Uploading " + percent + "%";
  };

  xhr.onload = () => {
    // 🔥 STATUS: Processing
    document.getElementById("status").innerText = "Processing...";

    const blob = new Blob([xhr.response]);
    const url = URL.createObjectURL(blob);

    // 🔥 STATUS: Downloading
    document.getElementById("status").innerText = "Downloading...";

    const a = document.createElement("a");
    a.href = url;
    a.download = output;
    a.click();

    // 🔥 FINAL STATUS
    document.getElementById("status").innerText = "Done ✅";
  };

  xhr.onerror = () => {
    document.getElementById("status").innerText = "❌ Error occurred";
  };

  xhr.open("POST", endpoint);
  xhr.responseType = "blob";
  xhr.send(formData);
}
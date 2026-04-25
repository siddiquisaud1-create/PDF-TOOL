let selectedFile;

function initDrop() {
  const drop = document.getElementById("drop");

  drop.onclick = () => document.getElementById("file").click();

  drop.ondragover = e => {
    e.preventDefault();
    drop.classList.add("dragover");
  };

  drop.ondragleave = () => drop.classList.remove("dragover");

  drop.ondrop = e => {
    e.preventDefault();
    drop.classList.remove("dragover");
    selectedFile = e.dataTransfer.files[0];
    drop.innerText = selectedFile.name;
  };
}

function filePicked(input) {
  selectedFile = input.files[0];
  document.getElementById("drop").innerText = selectedFile.name;
}

function upload(endpoint, outputName) {
  if (!selectedFile) return alert("Select file");

  const formData = new FormData();
  formData.append("file", selectedFile);

  const xhr = new XMLHttpRequest();

  xhr.upload.onprogress = e => {
    if (e.lengthComputable) {
      document.getElementById("bar").style.width =
        (e.loaded / e.total) * 100 + "%";
    }
  };

  document.getElementById("status").innerText = "Uploading...";

  xhr.onload = () => {
    document.getElementById("status").innerText = "Processing...";

    const blob = new Blob([xhr.response]);
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = outputName;
    a.click();

    document.getElementById("status").innerText = "Done";
  };

  xhr.open("POST", endpoint);
  xhr.responseType = "blob";
  xhr.send(formData);
}
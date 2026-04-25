document.body.insertAdjacentHTML("afterbegin", `
<header style="
  background: linear-gradient(90deg,#4f46e5,#2563eb);
  color:white;
  padding:20px;
  text-align:center;
  font-weight:bold;
">
  PDF Master Hub
</header>
`);

let selectedFile;

function init() {
  const drop = document.getElementById("drop");
  if (!drop) return;

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

  xhr.upload.onprogress = e => {
    document.getElementById("bar").style.width =
      (e.loaded / e.total) * 100 + "%";
  };

  document.getElementById("status").innerText = "Uploading...";

  xhr.onload = () => {
    document.getElementById("status").innerText = "Processing...";

    const blob = new Blob([xhr.response]);
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = output;
    a.click();

    document.getElementById("status").innerText = "Done";
  };

  xhr.open("POST", endpoint);
  xhr.responseType = "blob";
  xhr.send(formData);
}
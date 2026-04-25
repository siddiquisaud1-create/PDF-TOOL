let selectedFile;
let endpoint = "";
let outputName = "";

// select tool
document.querySelectorAll(".card").forEach(card => {
  card.addEventListener("click", () => {
    document.querySelectorAll(".card").forEach(c => c.classList.remove("active"));
    card.classList.add("active");

    endpoint = card.dataset.endpoint;
    outputName = card.dataset.output;

    document.getElementById("status").innerText = "Selected: " + card.innerText;
  });
});

// choose file
document.getElementById("btn").addEventListener("click", () => {
  document.getElementById("file").click();
});

document.getElementById("file").addEventListener("change", e => {
  selectedFile = e.target.files[0];
  document.getElementById("btn").innerText = selectedFile.name;
});

// upload
document.getElementById("startUpload").addEventListener("click", () => {

  if (!selectedFile) return alert("Select file");
  if (!endpoint) return alert("Select tool");

  const formData = new FormData();
  formData.append("file", selectedFile);

  const xhr = new XMLHttpRequest();
  xhr.open("POST", endpoint);

  xhr.upload.onprogress = e => {
    document.getElementById("bar").style.width =
      (e.loaded / e.total) * 100 + "%";
  };

  xhr.onload = () => {
    if (xhr.status !== 200) {
      document.getElementById("status").innerText = "Upload failed";
      return;
    }

    const blob = new Blob([xhr.response]);
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = outputName;
    a.click();

    document.getElementById("status").innerText = "Done ✅";
  };

  xhr.responseType = "arraybuffer";
  xhr.send(formData);
});

let selectedFile;
let endpoint = "";
let outputName = "";

document.addEventListener("DOMContentLoaded", () => {

  // SELECT TOOL
  document.querySelectorAll(".card").forEach(card => {
    card.addEventListener("click", () => {

      document.querySelectorAll(".card").forEach(c => c.classList.remove("active"));
      card.classList.add("active");

      endpoint = card.dataset.endpoint;
      outputName = card.dataset.output;

      document.getElementById("status").innerText =
        "Selected: " + card.innerText;

      // auto scroll to upload
      document.getElementById("drop").scrollIntoView({
        behavior: "smooth"
      });
    });
  });

  // FILE PICK
  const btn = document.getElementById("btn");
  const fileInput = document.getElementById("file");

  btn.addEventListener("click", () => fileInput.click());

  fileInput.addEventListener("change", (e) => {
    selectedFile = e.target.files[0];

    if (selectedFile) {
      btn.innerText = selectedFile.name;
    }
  });

  // UPLOAD
  document.getElementById("startUpload").addEventListener("click", () => {

    if (!selectedFile) {
      alert("Select file first");
      return;
    }

    if (!endpoint) {
      alert("Select a tool first");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", endpoint);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const percent = (e.loaded / e.total) * 100;
        document.getElementById("bar").style.width = percent + "%";
      }
    };

    document.getElementById("status").innerText = "Uploading...";

    xhr.onload = () => {
      if (xhr.status !== 200) {
        document.getElementById("status").innerText = "Failed ❌";
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

    xhr.onerror = () => {
      document.getElementById("status").innerText = "Error ❌";
    };

    xhr.responseType = "arraybuffer";
    xhr.send(formData);
  });

});

let currentEndpoint = "";
let currentOutput = "";

// TOOL CLICK
document.querySelectorAll(".tool").forEach(tool => {
  tool.addEventListener("click", () => {
    currentEndpoint = tool.dataset.endpoint;
    currentOutput = tool.dataset.output;

    document.querySelectorAll(".tool").forEach(t => t.classList.remove("active"));
    tool.classList.add("active");

    document.getElementById("status").innerText = "Selected: " + tool.innerText;
  });
});

// START UPLOAD
document.getElementById("startUpload").addEventListener("click", () => {
  if (!currentEndpoint) {
    alert("Select a tool first");
    return;
  }
  upload(currentEndpoint, currentOutput);
});

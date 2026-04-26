const bar = document.getElementById("globalBar");
const container = document.getElementById("globalProgress");

// run only if exists
if (bar && container) {

  document.querySelectorAll("a").forEach(link => {

    link.addEventListener("click", () => {

      container.style.display = "block";
      bar.style.width = "30%";

      let progress = 30;

      const interval = setInterval(() => {
        if (progress < 90) {
          progress += 10;
          bar.style.width = progress + "%";
        }
      }, 200);

      window.addEventListener("load", () => {
        clearInterval(interval);
        bar.style.width = "100%";

        setTimeout(() => {
          container.style.display = "none";
          bar.style.width = "0%";
        }, 300);
      });

    });

  });

}

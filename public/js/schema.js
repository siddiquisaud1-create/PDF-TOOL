(function () {

  const title = document.title;
  const description = document.querySelector("meta[name='description']")?.content || "";
  const url = window.location.href;

  // 🔥 detect tool name from title
  let toolName = title.split("|")[0].trim();

  if (!toolName) {
    toolName = "PDF Tool";
  }

  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": toolName,
    "applicationCategory": "Utility",
    "operatingSystem": "All",
    "url": url,
    "description": description,

    // ✅ CORRECT PLACE (INSIDE OBJECT)
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.6",
      "reviewCount": "320"
    }
  };

  // inject into head
  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.text = JSON.stringify(schema);

  document.head.appendChild(script);

})();

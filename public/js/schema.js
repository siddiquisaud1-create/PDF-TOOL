(function () {
  const path = window.location.pathname;

  let schema = null;

  // 🔥 Detect tool from URL
  if (path.includes("pdf-to-word")) {
    schema = {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "PDF to Word Converter",
      "applicationCategory": "Utility",
      "operatingSystem": "All",
      "url": "https://pdfmasterhub.com/pdf-to-word.html",
      "description": "Convert PDF to Word online for free."
    };
  }

  else if (path.includes("word-to-pdf")) {
    schema = {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "Word to PDF Converter",
      "applicationCategory": "Utility",
      "operatingSystem": "All",
      "url": "https://pdfmasterhub.com/word-to-pdf.html",
      "description": "Convert Word to PDF online for free."
    };
  }

  else if (path.includes("merge-pdf")) {
    schema = {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "Merge PDF Tool",
      "applicationCategory": "Utility",
      "operatingSystem": "All",
      "url": "https://pdfmasterhub.com/merge-pdf.html",
      "description": "Merge multiple PDF files into one document."
    };
  }

  else if (path.includes("jpg-to-png")) {
    schema = {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "JPG to PNG Converter",
      "applicationCategory": "Utility",
      "operatingSystem": "All",
      "url": "https://pdfmasterhub.com/jpg-to-png.html",
      "description": "Convert JPG images to PNG format online."
    };
  }

  else if (path.includes("resize-image")) {
    schema = {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "Resize Image Tool",
      "applicationCategory": "Utility",
      "operatingSystem": "All",
      "url": "https://pdfmasterhub.com/resize-image.html",
      "description": "Resize images online easily."
    };
  }

  // 🔥 Inject schema if found
  if (schema) {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.text = JSON.stringify(schema);
    document.head.appendChild(script);
  }

})();

(function () {

  const title = document.title || "";
  const description = document.querySelector("meta[name='description']")?.content || "";
  const url = window.location.href;

  // 🔥 Extract tool name from title
  let toolName = title.split("|")[0].trim();
  if (!toolName) toolName = "PDF Tool";

  // =======================
  // 🔥 MAIN TOOL SCHEMA
  // =======================
  const mainSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": toolName,
    "applicationCategory": "Utility",
    "operatingSystem": "All",
    "url": url,
    "description": description,

    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },

    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.6",
      "reviewCount": "320"
    }
  };

  // =======================
  // 🔥 FAQ SCHEMA
  // =======================
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Is this PDF tool free?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes, all tools on PDFMasterHub are completely free to use."
        }
      },
      {
        "@type": "Question",
        "name": "Are my files safe?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes, all uploaded files are securely processed and automatically deleted."
        }
      },
      {
        "@type": "Question",
        "name": "Can I use this on mobile?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes, all tools work on mobile, tablet, and desktop devices."
        }
      }
    ]
  };

  // =======================
  // 🔥 BREADCRUMB SCHEMA
  // =======================
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://pdfmasterhub.com"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": toolName,
        "item": url
      }
    ]
  };

  // =======================
  // 🔥 FUNCTION TO INJECT
  // =======================
  function injectSchema(data) {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.text = JSON.stringify(data);
    document.head.appendChild(script);
  }

  // =======================
  // 🚀 INJECT ALL SCHEMAS
  // =======================
  injectSchema(mainSchema);
  injectSchema(faqSchema);
  injectSchema(breadcrumbSchema);

})();

function footer(){
  const htmlOutput =
  `<div class="footer">
    <p>Made By <a href="https://www.torn.com/profiles.php?XID=2323763">Bilbosaggings[2323763]</a>. Any Issues Mail Me.</p>
  </div>
  <style>
    .footer {
      background-color: var(--primary-dark); 
      color: var(--text-light);
      padding: 10px 20px;
      text-align: center;
      position: sticky;
      bottom: 0;
      z-index: 1000;
      border: solid thin var(--border-colour); 
    }
    .footer a {
      color: var(--text-light);
      text-decoration: none;
    }
    .footer a:hover {
      text-decoration: underline;
    }
  </style>`
  return stripCommas(htmlOutput)
}

function navBar() {
  const navItems = [ 
    { title: "View By Crime", relativeLink: "page-view-by-crime" },
    { title: "View By Member", relativeLink: "page-view-by-member" },
    { title: "Test Page", relativeLink: "page-x" },
  ];

  const baseAppUrl = ScriptApp.getService().getUrl();
  const navLinksHTML = navItems.map(({ title, relativeLink, absoluteLink }) =>
    absoluteLink ? 
    `<a href="${absoluteLink}" class="nav-link">${title}</a>` 
    : 
    `<a href="${baseAppUrl}?v=${relativeLink}" class="nav-link">${title}</a>`
  ).join('');

  const htmlString = `
  <div class="navbar">
    <a href="${baseAppUrl}" class="logo">Bilbo's Dumb Creations</a>
    <div class="nav-links">${navLinksHTML}</div>
    <div class="burger" id="burger">
      <div class="bar"></div>
      <div class="bar"></div>
      <div class="bar"></div>
    </div>
  </div>

  <script defer>
    document.addEventListener("DOMContentLoaded", function () {
      const burger = document.getElementById("burger");
      const navLinks = document.querySelector(".nav-links");

      burger.addEventListener("click", function () {
        navLinks.classList.toggle("active");
        burger.classList.toggle("active");
      });
    });
  </script>

  <style>

    .navbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: var(--primary-dark);
      padding: 0 1rem;
      height: 60px;
      color: var(--text-light);
      font-family: Arial, sans-serif;
      z-index: 999;
    }

    .logo {
      text-decoration: none;
      color: var(--text-light);
      font-weight: bold;
      font-size: 1.2rem;
    }

    .nav-links {
      display: flex;
      gap: 1rem;
    }

    .nav-link {
      text-decoration: none;
      color: var(--text-light);
      padding: 8px 12px;
      border-radius: 4px;
      transition: background 0.3s;
    }

    .nav-link:hover {
      background: var(--button-hover-bg);
    }

    .burger {
      display: none;
      flex-direction: column;
      cursor: pointer;
      gap: 4px;
    }

    .bar {
      width: 25px;
      height: 3px;
      background: var(--text-light);
    }

    @media (max-width: 768px) {
      .nav-links {
        display: none;
        flex-direction: column;
        position: absolute;
        top: 60px;
        right: 0;
        background: var(--primary-dark);
        width: 100%;
        padding: 1rem;
      }

      .nav-links.active {
        display: flex;
      }

      .burger {
        display: flex;
      }
    }
  </style>`;

  const html = HtmlService.createTemplate(htmlString);
  return stripCommas(htmlString); // or html.getRawContent() depending on usage
}


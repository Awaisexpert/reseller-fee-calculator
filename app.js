/* Reseller Fee Calculator: calculation engine, calculator UI, and mobile menu. */
(function () {
  "use strict";
  var FEES = {
    eBay: { rate: 0.1325, fixed: 0.30 }, Poshmark: { rate: 0.20, fixed: 0 }, Mercari: { rate: 0.10, fixed: 0 },
    Etsy: { rate: 0.095, fixed: 0.45 }, Depop: { rate: 0.10, fixed: 0 }
  };
  var ALL = Object.keys(FEES);
  var usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
  var money = function (v) { return usd.format(Number.isFinite(v) ? v : 0); };
  var clean = function (v) { return Math.max(0, Number(v) || 0); };
  var round = function (v) { return Math.round((v + Number.EPSILON) * 100) / 100; };
  var feeLabel = function (p) { var f = FEES[p]; return parseFloat((f.rate * 100).toFixed(2)) + "% fee" + (f.fixed ? " + " + money(f.fixed) : ""); };

  function reverse(platform, cost, target, shipping, type) {
    cost = clean(cost); target = clean(target); shipping = clean(shipping);
    var expenses = cost + shipping, fee = FEES[platform], out = [];
    if (type === "margin") {
      var m = Math.min(0.99, target / 100);
      if (platform === "Poshmark") {
        var flat = (expenses + 2.95) / (1 - m);
        if (flat < 15) out.push({ price: flat, fee: 2.95, label: "Flat $2.95 fee" });
        var d = 1 - fee.rate - m, pp = d > 0 ? expenses / d : Infinity;
        if (Number.isFinite(pp) && pp >= 15) out.push({ price: pp, fee: pp * fee.rate, label: "20% fee" });
        return out;
      }
      var den = 1 - fee.rate - m;
      if (den <= 0) return out;
      var price = (expenses + fee.fixed) / den;
      return [{ price: price, fee: price * fee.rate + fee.fixed, label: feeLabel(platform) }];
    }
    var base = expenses + target;
    if (platform === "Poshmark") {
      if (base + 2.95 < 15) out.push({ price: base + 2.95, fee: 2.95, label: "Flat $2.95 fee" });
      var pct = base / (1 - fee.rate);
      if (pct >= 15) out.push({ price: pct, fee: pct * fee.rate, label: "20% fee" });
      return out;
    }
    var p2 = (base + fee.fixed) / (1 - fee.rate);
    return [{ price: p2, fee: p2 * fee.rate + fee.fixed, label: feeLabel(platform) }];
  }

  function forward(platform, price, cost, shipping, buyerShipping) {
    price = clean(price); cost = clean(cost); shipping = clean(shipping); buyerShipping = clean(buyerShipping);
    var base = price + buyerShipping;
    var fee = platform === "Poshmark" ? (base < 15 ? 2.95 : base * 0.20) : base * FEES[platform].rate + FEES[platform].fixed;
    var net = base - fee - shipping;
    return { name: platform, fee: fee, net: net, profit: net - cost, margin: price ? ((net - cost) / price) * 100 : 0 };
  }

  var read = function (root, key) { var el = root.querySelector('[data-in="' + key + '"]'); return el ? el.value : ""; };
  var card = function (html, cls) { return '<article class="result-card' + (cls ? " " + cls : "") + '">' + html + "</article>"; };

  function renderReverse(root) {
    var out = root.querySelector("[data-out]"), type = read(root, "type") || "amount", target = clean(read(root, "target")), html = "";
    ALL.forEach(function (p) {
      var branches = reverse(p, read(root, "cost"), target, read(root, "ship"), type);
      if (!branches.length) { html += card("<h3>" + p + "</h3><p>This target margin is not achievable with the selected assumptions.</p>"); return; }
      branches.forEach(function (b) {
        html += card("<h3>" + p + '</h3><p>Required listing price</p><p class="value">' + money(round(b.price)) + "</p><p>Estimated fee: " + money(round(b.fee)) + "</p><p>" + b.label + "</p><p>" + (type === "margin" ? "Target margin" : "Target amount") + ": " + (type === "margin" ? target + "%" : money(target)) + "</p>");
      });
    });
    out.innerHTML = html;
  }

  function renderForward(root) {
    var out = root.querySelector("[data-out]"), reco = root.querySelector("[data-reco]");
    var list = (root.getAttribute("data-platforms") || ALL.join(",")).split(",");
    var rows = list.map(function (p) { return forward(p, read(root, "price"), read(root, "cost"), read(root, "ship"), read(root, "buyer")); });
    if (rows.length > 1) rows.sort(function (a, b) { return b.profit - a.profit; });
    out.innerHTML = rows.map(function (r, i) {
      return card("<h3>" + r.name + "</h3>" + (rows.length > 1 && i === 0 ? '<p class="badge">Best estimated profit</p>' : "") + "<p>Estimated fees: " + money(r.fee) + "</p><p>Net payout: " + money(r.net) + "</p><p>Profit after costs: " + money(r.profit) + "</p><p>Margin: " + round(r.margin) + "%</p>");
    }).join("");
    if (reco && rows.length > 1) reco.innerHTML = "<p>Based on these assumptions, <strong>" + rows[0].name + "</strong> produces the highest estimated profit at <strong>" + money(rows[0].profit) + "</strong>.</p>";
  }

  function renderVinted(root) {
    var p = clean(read(root, "price")), s = clean(read(root, "ship"));
    root.querySelector("[data-out]").innerHTML = "<strong>Seller receives: " + money(p - s) + "</strong><br><small>Vinted selling fee: $0.00 · Buyer Protection is paid by the buyer</small>";
  }

  var RENDER = { reverse: renderReverse, forward: renderForward, vinted: renderVinted };
  function initCalcs() {
    document.querySelectorAll("[data-calc]").forEach(function (root) {
      var fn = RENDER[root.getAttribute("data-calc")];
      if (!fn) return;
      var go = function () { fn(root); };
      root.addEventListener("input", go); root.addEventListener("change", go); go();
    });
    var btns = document.querySelectorAll("[data-mode-btn]");
    btns.forEach(function (b) {
      b.addEventListener("click", function () {
        var mode = b.getAttribute("data-mode-btn");
        btns.forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
        document.querySelectorAll("[data-mode-panel]").forEach(function (p) { p.hidden = p.getAttribute("data-mode-panel") !== mode; });
      });
    });
  }

  var PAGE_LINKS = [
    { path: "/", label: "Home" },
    { path: "/reverse-price-calculator", label: "Reverse Price Calculator" },
    { path: "/ebay-fee-calculator", label: "eBay Fee Calculator" },
    { path: "/poshmark-fee-calculator", label: "Poshmark Fee Calculator" },
    { path: "/mercari-fee-calculator", label: "Mercari Fee Calculator" },
    { path: "/etsy-fee-calculator", label: "Etsy Fee Calculator" },
    { path: "/depop-fee-calculator", label: "Depop Fee Calculator" },
    { path: "/poshmark-vs-ebay", label: "Poshmark vs eBay" },
    { path: "/depop-vs-poshmark", label: "Depop vs Poshmark" },
    { path: "/mercari-vs-poshmark", label: "Mercari vs Poshmark" },
    { path: "/reseller-profit-calculator", label: "Reseller Profit Calculator" },
    { path: "/reseller-tax-guide", label: "Reseller Tax Guide" },
    { path: "/marketplace-fee-guide", label: "Marketplace Fee Guide" }
  ];

  function normalizePathname(pathname) {
    var value = (pathname || "/");
    value = value.split("?")[0].split("#")[0];
    if (!value || value === "/index.html") return "/";
    value = value.replace(/\/index\.html$/, "/");
    value = value.replace(/\.html$/, "");
    if (value.length > 1 && value.endsWith("/")) value = value.slice(0, -1);
    return value || "/";
  }

  function normalizeLocalUrl(raw) {
    if (!raw) return raw;
    if (raw.charAt(0) === "#") return raw;
    if (raw.indexOf("mailto:") === 0 || raw.indexOf("tel:") === 0 || raw.indexOf("http://") === 0 || raw.indexOf("https://") === 0 || raw.indexOf("javascript:") === 0) {
      return raw;
    }
    if (raw.indexOf("//") === 0) return raw;
    var rel = raw.trim();
    if (rel === "./" || rel === ".") return "/";
    if (rel === "index.html") return "/";
    if (rel.indexOf("/") === 0) {
      if (rel.indexOf(".html") > -1) rel = rel.replace(/\.html$/, "");
      return rel;
    }
    if (rel.indexOf(".") === 0) {
      rel = rel.replace(/^\.\//, "");
      if (rel.indexOf(".html") > -1) rel = rel.replace(/\.html$/, "");
      return "/" + rel;
    }
    if (rel.indexOf(".html") > -1) {
      return "/" + rel.replace(/\.html$/, "");
    }
    if (rel === "" || rel === "/") return "/";
    return "/" + rel.replace(/^\//, "");
  }

  function updateCanonical() {
    var target = "https://www.reseller-fee-calculator.com" + normalizePathname(window.location.pathname);
    if (target === "https://www.reseller-fee-calculator.com/") {
      target = "https://www.reseller-fee-calculator.com/";
    }
    var canon = document.querySelector('link[rel="canonical"]');
    if (canon) canon.setAttribute("href", target);
  }

  function getPageTitle() {
    var titleNode = document.querySelector("main h1") || document.querySelector("h1");
    if (titleNode) return titleNode.textContent.trim();
    var text = document.title || "Home";
    return text.split("|")[0].trim() || "Home";
  }

  function ensureBreadcrumb() {
    var main = document.querySelector("main") || document.getElementById("main") || document.querySelector("body > .page");
    if (!main) return;
    var existing = main.querySelector(".crumbs");
    if (existing) existing.remove();
    var current = normalizePathname(window.location.pathname);
    var label = getPageTitle();
    if (current === "/") label = "Home";
    var crumbs = document.createElement("nav");
    crumbs.className = "crumbs";
    crumbs.setAttribute("aria-label", "Breadcrumb");
    crumbs.innerHTML = '<ol><li><a href="/">Home</a></li><li aria-current="page">' + label + '</li></ol>';
    if (current !== "/") main.insertBefore(crumbs, main.firstChild);
  }

  function buildNavMarkup(currentPath) {
    var navLinks = PAGE_LINKS.map(function (page) {
      var active = normalizePathname(page.path) === currentPath ? ' aria-current="page"' : "";
      return '<a href="' + page.path + '"' + active + '>' + page.label + '</a>';
    }).join("");
    return '<div class="wrap nav"><a class="brand" href="/" aria-label="Reseller Fee Calculator home">Reseller <span>Fee Calculator</span></a><button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav" aria-label="Toggle navigation">Menu</button><nav id="site-nav" class="site-nav" aria-label="Main navigation"><div class="nav-links">' + navLinks + '</div></nav></div>';
  }

  function ensureSharedLayout() {
    var currentPath = normalizePathname(window.location.pathname);
    var header = document.querySelector("header.site-header") || document.querySelector("header.topbar") || document.querySelector("header");
    if (!header || !header.classList.contains("site-header")) {
      var newHeader = document.createElement("header");
      newHeader.className = "site-header";
      newHeader.innerHTML = buildNavMarkup(currentPath);
      var first = document.body.firstChild;
      if (first) document.body.insertBefore(newHeader, first); else document.body.appendChild(newHeader);
    } else {
      header.className = "site-header";
      header.innerHTML = buildNavMarkup(currentPath);
    }

    var footer = document.querySelector("footer.site-footer") || document.querySelector("footer.foot") || document.querySelector("footer");
    if (!footer || !footer.classList.contains("site-footer")) {
      var newFooter = document.createElement("footer");
      newFooter.className = "site-footer";
      newFooter.innerHTML = '<div class="wrap foot-grid"><div><h2>Reseller Fee Calculator</h2><p>Simple, U.S.-friendly fee estimates for marketplace resellers.</p></div><div><h2>Marketplaces</h2><ul><li><a href="/ebay-fee-calculator">eBay</a></li><li><a href="/poshmark-fee-calculator">Poshmark</a></li><li><a href="/mercari-fee-calculator">Mercari</a></li><li><a href="/etsy-fee-calculator">Etsy</a></li><li><a href="/depop-fee-calculator">Depop</a></li></ul></div><div><h2>Tools</h2><ul><li><a href="/reverse-price-calculator">Reverse price calculator</a></li><li><a href="/reseller-profit-calculator">Profit calculator</a></li><li><a href="/reseller-tax-guide">Tax guide</a></li></ul></div><div><h2>Compare</h2><ul><li><a href="/poshmark-vs-ebay">Poshmark vs eBay</a></li><li><a href="/depop-vs-poshmark">Depop vs Poshmark</a></li><li><a href="/mercari-vs-poshmark">Mercari vs Poshmark</a></li><li><a href="/marketplace-fee-guide">Fee guide</a></li></ul></div></div><div class="wrap legal"><p>© 2026 Reseller Fee Calculator. All fees and estimates are planning tools.</p></div>';
      document.body.appendChild(newFooter);
    } else {
      footer.className = "site-footer";
      footer.innerHTML = '<div class="wrap foot-grid"><div><h2>Reseller Fee Calculator</h2><p>Simple, U.S.-friendly fee estimates for marketplace resellers.</p></div><div><h2>Marketplaces</h2><ul><li><a href="/ebay-fee-calculator">eBay</a></li><li><a href="/poshmark-fee-calculator">Poshmark</a></li><li><a href="/mercari-fee-calculator">Mercari</a></li><li><a href="/etsy-fee-calculator">Etsy</a></li><li><a href="/depop-fee-calculator">Depop</a></li></ul></div><div><h2>Tools</h2><ul><li><a href="/reverse-price-calculator">Reverse price calculator</a></li><li><a href="/reseller-profit-calculator">Profit calculator</a></li><li><a href="/reseller-tax-guide">Tax guide</a></li></ul></div><div><h2>Compare</h2><ul><li><a href="/poshmark-vs-ebay">Poshmark vs eBay</a></li><li><a href="/depop-vs-poshmark">Depop vs Poshmark</a></li><li><a href="/mercari-vs-poshmark">Mercari vs Poshmark</a></li><li><a href="/marketplace-fee-guide">Fee guide</a></li></ul></div></div><div class="wrap legal"><p>© 2026 Reseller Fee Calculator. All fees and estimates are planning tools.</p></div>';
    }

    ensureBreadcrumb();
    updateCanonical();
    normalizeLinks();
  }

  function normalizeLinks() {
    document.querySelectorAll("a[href]").forEach(function (link) {
      var raw = link.getAttribute("href");
      if (!raw || raw.charAt(0) === "#") return;
      if (raw.indexOf("mailto:") === 0 || raw.indexOf("tel:") === 0 || raw.indexOf("http://") === 0 || raw.indexOf("https://") === 0 || raw.indexOf("javascript:") === 0) return;
      if (raw.indexOf("//") === 0) return;
      var next = normalizeLocalUrl(raw);
      if (next && next !== raw) link.setAttribute("href", next);
    });
    document.querySelectorAll("link[href]").forEach(function (link) {
      var raw = link.getAttribute("href");
      if (!raw || raw.charAt(0) === "#") return;
      if (raw.indexOf("http://") === 0 || raw.indexOf("https://") === 0 || raw.indexOf("mailto:") === 0) return;
      if (raw.indexOf("/") === 0 || raw.indexOf("./") === 0 || raw.indexOf("../") === 0 || raw.indexOf(".css") > -1 || raw.indexOf(".svg") > -1 || raw.indexOf(".png") > -1 || raw.indexOf(".ico") > -1) {
        if (raw.indexOf(".html") > -1) link.setAttribute("href", normalizeLocalUrl(raw));
      }
    });
    document.querySelectorAll("script[src]").forEach(function (script) {
      var raw = script.getAttribute("src");
      if (!raw || raw.indexOf("http://") === 0 || raw.indexOf("https://") === 0 || raw.indexOf("//") === 0) return;
      if (raw.indexOf(".js") > -1 && raw.indexOf("/") !== 0) script.setAttribute("src", "/" + raw.replace(/^\.\//, "").replace(/^\.\//, ""));
      if (raw.indexOf("/") !== 0 && raw.indexOf(".js") > -1) script.setAttribute("src", "/" + raw);
    });
  }

  function initMenu() {
    var toggle = document.querySelector(".nav-toggle");
    var nav = document.getElementById("site-nav");
    if (!toggle || !nav) return;
    var setOpen = function (open) {
      nav.classList.toggle("open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.textContent = open ? "Close" : "Menu";
    };
    toggle.addEventListener("click", function () {
      setOpen(!nav.classList.contains("open"));
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && nav.classList.contains("open")) {
        setOpen(false);
        toggle.focus();
      }
    });
    nav.addEventListener("click", function (event) {
      if (event.target && event.target.closest("a")) {
        setOpen(false);
      }
    });
  }

  window.ResellerCalculator = { FEES: FEES, money: money, round: round, reverse: reverse, forward: forward };
  document.addEventListener("DOMContentLoaded", function () {
    ensureSharedLayout();
    initCalcs();
    initMenu();
  });
})();

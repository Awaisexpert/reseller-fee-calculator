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
        html += card("<h3>" + p + '</h3><p>Required listing price</p><p class="value">' + money(round(b.price)) + "</p><p>Estimated fee: " + money(round(b.fee)) + "</p><p>" + b.label + "</p><p>" + (type === "margin" ? target + "% target margin" : money(target) + " target profit") + "</p>");
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
      return card("<h3>" + r.name + "</h3>" + (rows.length > 1 && i === 0 ? '<p class="badge">Best estimated profit</p>' : "") + "<p>Estimated fees: " + money(r.fee) + "</p><p>Net payout: " + money(r.net) + '</p><p>Estimated profit: <strong>' + money(r.profit) + "</strong></p><p>Profit margin: " + r.margin.toFixed(1) + "%</p>", rows.length > 1 && i === 0 ? "result-card--best" : "");
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

  function initMenu() {
    var t = document.querySelector(".nav-toggle"), n = document.getElementById("site-nav");
    if (!t || !n) return;
    var set = function (o) { n.classList.toggle("open", o); t.setAttribute("aria-expanded", String(o)); t.textContent = o ? "Close" : "Menu"; };
    t.addEventListener("click", function () { set(!n.classList.contains("open")); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && n.classList.contains("open")) { set(false); t.focus(); } });
    n.addEventListener("click", function (e) { if (e.target.closest("a")) set(false); });
  }

  function injectSpeedInsights() {
    if (document.querySelector('script[data-speed-insights="true"]')) return;
    var s = document.createElement("script");
    s.src = "/_vercel/speed-insights/script.js";
    s.defer = true;
    s.setAttribute("data-speed-insights", "true");
    document.body.appendChild(s);
  }

  window.ResellerCalculator = { FEES: FEES, money: money, round: round, reverse: reverse, forward: forward };
  document.addEventListener("DOMContentLoaded", function () { initCalcs(); initMenu(); injectSpeedInsights(); });
})();
                                      

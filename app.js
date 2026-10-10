/* Reseller Fee Calculator: calculation engine, calculator UI, and mobile menu. */
(function () {
  "use strict";
  var FEES = {
    eBay: { rate: 0.136, fixed: 0.40 }, Poshmark: { rate: 0.20, fixed: 0 }, Mercari: { rate: 0.10, fixed: 0 },
    Etsy: { rate: 0.095, fixed: 0.45 }, Depop: { rate: 0.033, fixed: 0.45 }
  };
  var ALL = Object.keys(FEES);
  var usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
  var money = function (v) { return usd.format(Number.isFinite(v) ? v : 0); };
  var clean = function (v) { return Math.max(0, Number(v) || 0); };
  var round = function (v) { return Math.round((v + Number.EPSILON) * 100) / 100; };
  var feeLabel = function (p) { if (p === "eBay") return "13.6% fee + $0.30-$0.40"; var f = FEES[p]; return parseFloat((f.rate * 100).toFixed(2)) + "% fee" + (f.fixed ? " + " + money(f.fixed) : ""); };

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
      var fx = platform === "eBay" ? 0.30 : fee.fixed, price = (expenses + fx) / den;
      if (platform === "eBay" && price > 10) { fx = 0.40; price = (expenses + fx) / den; }
      return [{ price: price, fee: price * fee.rate + fx, label: feeLabel(platform) }];
    }
    var base = expenses + target;

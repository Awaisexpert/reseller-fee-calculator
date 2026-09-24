/* Shared fee assumptions and calculation engine for the homepage and reverse calculator. */
(function (window) {
  const FEES = {
    eBay: { rate: 0.1325, fixed: 0.30 },
    Poshmark: { rate: 0.20, fixed: 0 },
    Mercari: { rate: 0.10, fixed: 0 },
    Etsy: { rate: 0.095, fixed: 0.45 },
    Depop: { rate: 0.10, fixed: 0 }
  };

  const money = (value) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number.isFinite(value) ? value : 0);
  const clean = (value) => Math.max(0, Number(value) || 0);
  const round = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

  function reverse(platform, cost, target, shipping, type) {
    cost = clean(cost); target = clean(target); shipping = clean(shipping);
    const expenses = cost + shipping;
    const fee = FEES[platform] || { rate: 0, fixed: 0 };
    const branches = [];

    if (type === "margin") {
      const margin = Math.min(0.99, target / 100);
      if (platform === "Poshmark") {
        const flatDenominator = 1 - margin;
        const flatPrice = flatDenominator > 0 ? (expenses + 2.95) / flatDenominator : Infinity;
        if (Number.isFinite(flatPrice) && flatPrice < 15) branches.push({ price: flatPrice, fee: 2.95, label: "Flat $2.95 fee" });
        const percentageDenominator = 1 - fee.rate - margin;
        const percentagePrice = percentageDenominator > 0 ? expenses / percentageDenominator : Infinity;
        if (Number.isFinite(percentagePrice) && percentagePrice >= 15) branches.push({ price: percentagePrice, fee: percentagePrice * fee.rate, label: "20% fee" });
        return branches;
      }
      const denominator = 1 - fee.rate - margin;
      if (denominator <= 0) return branches;
      const price = (expenses + fee.fixed) / denominator;
      return [{ price, fee: price * fee.rate + fee.fixed, label: `${fee.rate * 100}% fee${fee.fixed ? ` + ${money(fee.fixed)}` : ""}` }];
    }

    const base = expenses + target;
    if (platform === "Poshmark") {
      const flatPrice = base + 2.95;
      if (flatPrice < 15) branches.push({ price: flatPrice, fee: 2.95, label: "Flat $2.95 fee" });
      const percentagePrice = base / (1 - fee.rate);
      if (percentagePrice >= 15) branches.push({ price: percentagePrice, fee: percentagePrice * fee.rate, label: "20% fee" });
      return branches;
    }
    const denominator = 1 - fee.rate;
    if (denominator <= 0) return branches;
    const price = (base + fee.fixed) / denominator;
    return [{ price, fee: price * fee.rate + fee.fixed, label: `${fee.rate * 100}% fee${fee.fixed ? ` + ${money(fee.fixed)}` : ""}` }];
  }

  function forward(platform, price, cost, shipping, buyerShipping) {
    price = clean(price); cost = clean(cost); shipping = clean(shipping); buyerShipping = clean(buyerShipping);
    const feeBase = price + buyerShipping;
    const fee = platform === "Poshmark" ? (feeBase < 15 ? 2.95 : feeBase * 0.20) : feeBase * FEES[platform].rate + FEES[platform].fixed;
    const net = feeBase - fee - shipping;
    return { name: platform, fee, net, profit: net - cost, margin: price ? ((net - cost) / price) * 100 : 0 };
  }

  window.ResellerCalculator = { FEES, money, round, reverse, forward };
})(window);

const STATES = { AL:.041, AK:0, AZ:.056, AR:.065, CA:.073, CO:.029, CT:.063, DE:0, DC:.06, FL:.06, GA:.04, HI:.04, ID:.06, IL:.063, IN:.07, IA:.06, KS:.065, KY:.06, LA:.045, ME:.055, MD:.06, MA:.0625, MI:.06, MN:.0688, MS:.07, MO:.0423, MT:0, NE:.055, NV:.0685, NH:0, NJ:.0663, NM:.0513, NY:.08, NC:.0475, ND:.05, OH:.0575, OK:.045, OR:0, PA:.06, RI:.07, SC:.06, SD:.06, TN:.07, TX:.0625, UT:.061, VT:.06, VA:.053, WA:.065, WV:.06, WI:.05, WY:.04 };
const PLATFORMS = ["eBay", "Poshmark", "Mercari", "Etsy", "Depop"];
const valueOf = (id) => Math.max(0, Number(document.getElementById(id)?.value) || 0);
const core = () => window.ResellerCalculator;

function reverseCard(platform, branch, type, target) {
  const card = document.createElement("article");
  card.className = "result-card";
  card.innerHTML = `<h3>${platform}</h3><p class="result-card__label">Required listing price</p><p class="result-card__value">${core().money(core().round(branch.price))}</p><p>Estimated fee: ${core().money(core().round(branch.fee))}</p><p>${branch.label}</p><p class="result-card__detail">${type === "margin" ? `${target}% target margin` : `${core().money(target)} target profit`}</p>`;
  return card;
}

function renderReverse() {
  const output = document.getElementById("reverseResults");
  if (!output || !core()) return;
  const cost = valueOf("reverseCost");
  const target = valueOf("reverseTarget");
  const shipping = valueOf("reverseShipping");
  const type = document.getElementById("reverseTargetType")?.value || "amount";
  output.innerHTML = "";
  PLATFORMS.forEach((platform) => {
    const branches = core().reverse(platform, cost, target, shipping, type);
    if (!branches.length) {
      const card = document.createElement("article");
      card.className = "result-card";
      card.innerHTML = `<h3>${platform}</h3><p>This target margin is not achievable with the selected assumptions.</p>`;
      output.appendChild(card);
    } else branches.forEach((branch) => output.appendChild(reverseCard(platform, branch, type, target)));
  });
}

function renderForward() {
  const output = document.getElementById("results");
  if (!output || !core()) return;
  const values = { price:valueOf("salePrice"), cost:valueOf("itemCost"), shipping:valueOf("sellerShipping"), buyerShipping:valueOf("buyerShipping") };
  const calculations = PLATFORMS.map((platform) => core().forward(platform, values.price, values.cost, values.shipping, values.buyerShipping)).sort((a,b) => b.profit - a.profit);
  output.innerHTML = calculations.map((item, index) => `<article class="result-card${index === 0 ? " result-card--best" : ""}"><h3>${item.name}</h3>${index === 0 ? "<strong>Best estimated profit</strong>" : ""}<p>Estimated fees: ${core().money(item.fee)}</p><p>Net payout: ${core().money(item.net)}</p><p>Estimated profit: ${core().money(item.profit)}</p><p>Profit margin: ${item.margin.toFixed(1)}%</p></article>`).join("");
  const recommendation = document.getElementById("recommendation");
  if (recommendation && calculations[0]) recommendation.innerHTML = `<p>Based on these assumptions, <strong>${calculations[0].name}</strong> produces the highest estimated profit at <strong>${core().money(calculations[0].profit)}</strong>.</p>`;
}

function setMode(mode) {
  const reverse = mode === "reverse";
  document.getElementById("reverseCalculator")?.toggleAttribute("hidden", !reverse);
  document.getElementById("forwardCalculator")?.toggleAttribute("hidden", reverse);
  document.getElementById("reverseModeButton")?.setAttribute("aria-selected", String(reverse));
  document.getElementById("forwardModeButton")?.setAttribute("aria-selected", String(!reverse));
  document.getElementById("reverseModeButton")?.classList.toggle("secondary", !reverse);
  document.getElementById("forwardModeButton")?.classList.toggle("secondary", reverse);
  reverse ? renderReverse() : renderForward();
}

function bindInput(ids, handler) { ids.forEach((id) => { document.getElementById(id)?.addEventListener("input", handler); document.getElementById(id)?.addEventListener("change", handler); }); }

function initReversePage() {
  if (!document.getElementById("reversePageResults")) return;
  const output = document.getElementById("reversePageResults");
  const render = () => {
    const type = document.getElementById("pageTargetType")?.value || "amount";
    const cost = valueOf("pageCost"); const target = valueOf("pageTarget"); const shipping = valueOf("pageShipping");
    output.innerHTML = "";
    PLATFORMS.forEach((platform) => core().reverse(platform, cost, target, shipping, type).forEach((branch) => output.appendChild(reverseCard(platform, branch, type, target))));
  };
  bindInput(["pageCost", "pageTarget", "pageShipping", "pageTargetType"], render); render();
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("reverseModeButton")?.addEventListener("click", () => setMode("reverse"));
  document.getElementById("forwardModeButton")?.addEventListener("click", () => setMode("forward"));
  bindInput(["reverseCost", "reverseTarget", "reverseShipping", "reverseTargetType"], renderReverse);
  bindInput(["salePrice", "itemCost", "sellerShipping", "buyerShipping"], renderForward);
  if (document.getElementById("reverseResults")) setMode("reverse");
  initReversePage();
});

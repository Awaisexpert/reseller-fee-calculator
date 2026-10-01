const FEES = {
  eBay: { rate: 0.1325, fixed: 0.30, sourceUrl: 'https://www.ebay.com/help/selling', lastVerified: '2026-10-01', rules: 'eBay final value fee assumption' },
  Poshmark: { rate: 0.20, fixed: 0, sourceUrl: 'https://help.poshmark.com', lastVerified: '2026-10-01', rules: 'Flat $2.95 under $15; 20% at $15 and above' },
  Mercari: { rate: 0.10, fixed: 0, sourceUrl: 'https://www.mercari.com', lastVerified: '2026-10-01', rules: '10% seller fee assumption' },
  Etsy: { rate: 0.095, fixed: 0.45, sourceUrl: 'https://www.etsy.com/help/article/266', lastVerified: '2026-10-01', rules: '9.5% plus $0.45 fixed fee assumption' },
  Depop: { rate: 0.10, fixed: 0, sourceUrl: 'https://help.depop.com', lastVerified: '2026-10-01', rules: '10% fee assumption' },
  Vinted: { rate: 0, fixed: 0, sourceUrl: 'https://www.vinted.com', lastVerified: '2026-10-01', rules: 'Buyer protection assumed to be paid by buyer' }
};

window.__FEES__ = FEES;

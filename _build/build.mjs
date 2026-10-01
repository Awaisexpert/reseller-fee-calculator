#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = process.cwd();
const pages = [
  { name: 'index', title: 'Reseller Fee Calculator: Price for Your Target Profit', slug: '/' },
  { name: 'reverse-price-calculator', title: 'Reverse Price Calculator for Resellers: Target Profit', slug: '/reverse-price-calculator' },
  { name: 'reseller-profit-calculator', title: 'Reseller Profit Calculator: Fees, Shipping & Net Profit', slug: '/reseller-profit-calculator' },
  { name: 'ebay-fee-calculator', title: 'eBay Fee Calculator for U.S. Sellers: Estimate Profit', slug: '/ebay-fee-calculator' },
  { name: 'poshmark-fee-calculator', title: 'Poshmark Fee Calculator for U.S. Sellers: Net Profit', slug: '/poshmark-fee-calculator' },
  { name: 'mercari-fee-calculator', title: 'Mercari Fee Calculator for U.S. Sellers: Net Profit', slug: '/mercari-fee-calculator' },
  { name: 'etsy-fee-calculator', title: 'Etsy Fee Calculator for U.S. Sellers: Fees & Payout', slug: '/etsy-fee-calculator' },
  { name: 'depop-fee-calculator', title: 'Depop Fee Calculator for U.S. Sellers: Payout & Profit', slug: '/depop-fee-calculator' },
  { name: 'vinted-fee-calculator', title: 'Vinted Fee Calculator for U.S. Sellers: Profit & Payout', slug: '/vinted-fee-calculator' },
  { name: 'poshmark-vs-ebay', title: 'Poshmark vs eBay Fees: Which Pays More?', slug: '/poshmark-vs-ebay' },
  { name: 'depop-vs-poshmark', title: 'Depop vs Poshmark Fees: Which Marketplace Pays More?', slug: '/depop-vs-poshmark' },
  { name: 'mercari-vs-poshmark', title: 'Mercari vs Poshmark Fees: Which Pays More?', slug: '/mercari-vs-poshmark' },
  { name: 'marketplace-fee-guide', title: 'Marketplace Fee Guide for Resellers: eBay, Etsy & More', slug: '/marketplace-fee-guide' },
  { name: 'reseller-tax-guide', title: 'Reseller Tax Guide for U.S. Sellers: Sales Tax & Profit', slug: '/reseller-tax-guide' },
  { name: 'about', title: 'About Reseller Fee Calculator', slug: '/about' },
  { name: 'methodology', title: 'Methodology | Reseller Fee Calculator', slug: '/methodology' }
];
let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
pages.forEach((page) => {
  xml += `  <url><loc>https://www.reseller-fee-calculator.com${page.slug}</loc><lastmod>2026-10-01</lastmod></url>\n`;
});
xml += `</urlset>\n`;
fs.writeFileSync(path.join(root, 'sitemap.xml'), xml, 'utf8');
console.log('sitemap.xml generated');

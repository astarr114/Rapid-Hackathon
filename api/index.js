// Vercel serverless entry — bundled Express app (see backend build:bundle)
const mod = require('./_bundle.cjs');

module.exports = mod.default ?? mod;

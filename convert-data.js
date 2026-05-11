/* ============================================================
   PERIODICALS DASHBOARD — convert-data.js
   Reads PeriodicalTransferPmts.xlsx and outputs data.js
   ============================================================ */
const XLSX = require('xlsx');
const fs   = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'PeriodicalTransferPmts.xlsx');
const OUT = path.join(__dirname, 'data.js');

// Province code normalization
const PROV_NORMALIZE = {
  'AB': 'AB', 'BC': 'BC', 'MB': 'MB', 'NB': 'NB',
  'NFLD': 'NL', 'NL': 'NL',
  'NS': 'NS', 'NV': 'NU', 'NU': 'NU',
  'NWT': 'NT', 'NT': 'NT',
  'ON': 'ON', 'PEI': 'PE', 'PE': 'PE',
  'QC': 'QC', 'Qc': 'QC',
  'SK': 'SK', 'YK': 'YT', 'YT': 'YT',
  'Unknown': 'Unknown'
};

const wb = XLSX.readFile(SRC);
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws);

const data = rows.map(r => ({
  year:      r.Year,
  province:  PROV_NORMALIZE[r.Province] || r.Province || 'Unknown',
  city:      r.City || '',
  recipient: r.Recipient || '',
  count:     Number(r.Count) || 0,
  amount:    Number(r.Amount) || 0,
  link:      r.Link || ''
}));

const js = `/* Auto-generated — ${new Date().toISOString()} */\nconst rawData = ${JSON.stringify(data)};\n`;

fs.writeFileSync(OUT, js, 'utf8');
console.log(`Wrote ${data.length} records to data.js`);

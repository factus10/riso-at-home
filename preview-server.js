// Standalone fixed-port server for browser-based preview/testing of the web
// content (the Electron shell itself can't be screenshotted by browser tooling).
const path = require('path');
const { createServer } = require('./server');

const STATIC_DIR = path.join(__dirname, 'www');
const DATA_DIR = path.join(__dirname, 'www', 'data');
const PORT = 4173;

createServer(STATIC_DIR, DATA_DIR).listen(PORT, '127.0.0.1', () => {
  console.log(`preview server listening on http://127.0.0.1:${PORT}`);
});

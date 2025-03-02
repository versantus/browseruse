// This file is a bridge to the actual main.js file
// It's needed because electron-builder expects the entry point to be in build/electron.js
const path = require('path');
const { spawn } = require('child_process');

// Import the actual main.js file
require(path.join(__dirname, '../main.js'));

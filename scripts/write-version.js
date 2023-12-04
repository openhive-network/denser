#!/usr/bin/env node

const { execSync } = require('child_process');

let outputFile = 'version.json';
// Get output file name from first positional argument.
const args = process.argv.slice(2);
if (args.length > 0) {
  outputFile = args[0];
}
// console.log(`Starting to create ${outputFile}`);

// stderr is sent to stdout of parent process
// you can set options.stdio if you want it to go elsewhere

let cmd;

cmd = 'git rev-parse --abbrev-ref HEAD';
process.env.branch = execSync(cmd).toString().trim();
// console.log('branch', process.env.branch);

cmd = 'git rev-parse HEAD';
process.env.commithash = execSync(cmd).toString().trim();
// console.log('commithash', process.env.commithash);

cmd = 'git describe --always --tags --dirty';
let version = execSync(cmd).toString().trim();

process.env.version = version.replace(
  /-g[0-9a-fA-F]{7}/, '-' + (process.env.commithash).substring(0, 8)
);
// console.log('version', process.env.version);

// Write file version.js.
var fs = require('fs');
var stream = fs.createWriteStream(outputFile);
stream.once('open', function(fd) {
  const parts = [
    `{"branch":"${process.env.branch}"`,
    `"commithash":"${process.env.commithash}"`,
    `"version":"${process.env.version}"}`,
  ];
  stream.write(parts.join(','));
  stream.end();
});

console.log(`File ${outputFile} has been created`);

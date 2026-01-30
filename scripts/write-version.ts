#!/usr/bin/env tsx

import { execSync } from "child_process";
import fs from "fs";

let outputFile = "version.json";

const args = process.argv.slice(2);
if (args.length > 0) {
  outputFile = args[0];
}

function execGit(cmd: string): string {
  return execSync(cmd).toString().trim();
}

const branch = execGit("git rev-parse --abbrev-ref HEAD");
const commithash = execGit("git rev-parse HEAD");
const version = execGit("git describe --always --tags --dirty");

const finalVersion = version.replace(
  /-g[0-9a-fA-F]{7}/,
  "-" + commithash.substring(0, 8)
);

const stream = fs.createWriteStream(outputFile);
stream.once("open", () => {
  const parts = [
    `{"branch":"${branch}"`,
    `"commithash":"${commithash}"`,
    `"version":"${finalVersion}"}`
  ];
  stream.write(parts.join(","));
  stream.end();
});

console.log(`File ${outputFile} has been created`);

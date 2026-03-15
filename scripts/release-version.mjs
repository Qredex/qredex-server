import { execFileSync } from "node:child_process";

const version = process.argv[2];

if (!version) {
  console.error("Usage: npm run release:version -- <version>");
  process.exit(1);
}

if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z-.]+)?$/.test(version)) {
  console.error(`Invalid semver version: ${version}`);
  process.exit(1);
}

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

execFileSync(npmCommand, ["version", version, "--no-git-tag-version"], {
  stdio: "inherit",
});

console.log("");
console.log(`Updated package version to ${version}.`);
console.log("Next steps:");
console.log("1. Update CHANGELOG.md.");
console.log("2. Commit the version change.");
console.log("3. Push to main so GitHub Actions can create the release tag.");

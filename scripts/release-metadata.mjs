import fs from "node:fs";
import { execFileSync } from "node:child_process";

const command = process.argv[2];

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, "utf8"));
}

function writeOutput(key, value) {
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${value}\n`);
    return;
  }

  console.log(`${key}=${value}`);
}

function getGitValue(args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function readPackageMetadata() {
  const packageJson = readJson("package.json");
  const packageLock = readJson("package-lock.json");
  const packageLockRoot = packageLock.packages?.[""] ?? {};
  const problems = [];

  if (packageLock.name !== packageJson.name) {
    problems.push(
      `package-lock.json name (${packageLock.name}) does not match package.json name (${packageJson.name}).`,
    );
  }

  if (packageLock.version !== packageJson.version) {
    problems.push(
      `package-lock.json version (${packageLock.version}) does not match package.json version (${packageJson.version}).`,
    );
  }

  if (packageLockRoot.name !== packageJson.name) {
    problems.push(
      `package-lock.json packages[\"\"] name (${packageLockRoot.name}) does not match package.json name (${packageJson.name}).`,
    );
  }

  if (packageLockRoot.version !== packageJson.version) {
    problems.push(
      `package-lock.json packages[\"\"] version (${packageLockRoot.version}) does not match package.json version (${packageJson.version}).`,
    );
  }

  if (problems.length > 0) {
    for (const problem of problems) {
      console.error(problem);
    }
    process.exit(1);
  }

  return {
    packageName: packageJson.name,
    version: packageJson.version,
    tag: `v${packageJson.version}`,
  };
}

function verifyVersionFiles() {
  const metadata = readPackageMetadata();
  writeOutput("package_name", metadata.packageName);
  writeOutput("version", metadata.version);
  writeOutput("tag", metadata.tag);
}

function resolveRelease() {
  const metadata = readPackageMetadata();
  const currentCommit = getGitValue(["rev-parse", "HEAD"]);
  let tagCommit = "";

  try {
    tagCommit = getGitValue(["rev-list", "-n", "1", metadata.tag]);
  } catch {
    tagCommit = "";
  }

  const shouldPublish = tagCommit !== "" && tagCommit === currentCommit;

  writeOutput("package_name", metadata.packageName);
  writeOutput("version", metadata.version);
  writeOutput("tag", metadata.tag);
  writeOutput("current_commit", currentCommit);
  writeOutput("tag_commit", tagCommit);
  writeOutput("should_publish", shouldPublish ? "true" : "false");

  if (!shouldPublish) {
    console.log(
      `No release tag ${metadata.tag} for commit ${currentCommit}; skipping npm publish.`,
    );
  }
}

if (command === "verify-version-files") {
  verifyVersionFiles();
} else if (command === "resolve-release") {
  resolveRelease();
} else {
  console.error(
    "Usage: node scripts/release-metadata.mjs <verify-version-files|resolve-release>",
  );
  process.exit(1);
}

import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const rules = [
  ["absolute Windows path", /\b[A-Za-z]:[\\/]+[^\s"'<>]/],
  ["personal home path", /(?:^|[^A-Za-z0-9_])\/(?:Users|home)\/[^/\s"'<>]+/im],
  ["Windows network share", /(?:^|[\s"'=(])\\\\[A-Za-z0-9_.-]+\\[A-Za-z0-9_.-]+/m],
  ["private key", /-----BEGIN (?:[A-Z0-9 ]+ )?PRIVATE KEY-----/],
];

export function findings(content) {
  return rules.filter(([, pattern]) => pattern.test(content)).map(([name]) => name);
}

export function checkIndex() {
  const git = (args) => execFileSync("git", args, { maxBuffer: 16 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] });
  const paths = git(["ls-files", "-z"]).toString("utf8").split("\0").filter(Boolean);
  let count = 0;
  for (const path of new Set(paths)) {
    const filenameFindings = findings(path);
    const bytes = git(["show", ":" + path]);
    const reasons = new Set([...filenameFindings, ...findings(bytes.toString("utf8"))]);
    if (bytes.includes(0)) reasons.add("binary content requires explicit review");
    if (reasons.size > 0) {
      // Never print a match, its surrounding line, or a potentially sensitive filename.
      console.error("Public source rejected: " + [...reasons].join(", "));
      count++;
    }
  }
  if (count) {
    console.error(count + " indexed file(s) require local review; do not paste raw findings into public issues.");
    return false;
  }
  console.log("Public source privacy patterns: passed");
  return true;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (!checkIndex()) process.exitCode = 1;
  } catch {
    console.error("Unable to inspect Git index; public source check failed.");
    process.exitCode = 1;
  }
}

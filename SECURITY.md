# Security

Report vulnerabilities through [private vulnerability reporting](https://github.com/logohere/architecture-lab/security/advisories/new). Do not put sensitive evidence in a public issue or pull request.

Public source, issue descriptions, PRs and artifacts must not contain credentials, personal contact details, workstation paths, hostnames, device serial numbers, local configuration, proprietary files or withheld workloads. Use repository-relative paths and synthetic examples. Keep raw local Vivado outputs, screenshots, checkpoints and logs private; publish only explicitly reviewed, allowlisted aggregate evidence (source revision, tool version, device part, constraints, timing and resources). Do not publish absolute paths or machine identifiers embedded in tool reports.

Run `node scripts/check-public-source.mjs` after staging. This is a limited pattern check, not comprehensive secret or personal-data detection. GitHub secret scanning and push protection supplement manual review. Use a GitHub noreply commit email if the contributor's email is private.

Run untrusted candidate code in an isolated environment without credentials or hardware access. Hardware programming is an explicit operator action.

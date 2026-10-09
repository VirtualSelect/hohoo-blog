import { spawnSync } from "node:child_process";

// Enforce in local and Vercel builds, not just a parallel GitHub check.
// Uncompressed static output is an estimate, separate from retained cloud usage.
const result = spawnSync(process.execPath, ["scripts/storage-report.mjs"], {
  stdio: "inherit",
  env: {
    ...process.env,
    STORAGE_STATIC_BUDGET_MB: process.env.STORAGE_STATIC_BUDGET_MB || "250",
  },
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);

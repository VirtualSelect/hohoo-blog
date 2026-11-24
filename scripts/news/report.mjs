import fs from "node:fs";
import { formatCollectionReport } from "./diagnostics.mjs";

const file = ".cache-loader/news-report.json";
const report = fs.existsSync(file)
  ? JSON.parse(fs.readFileSync(file, "utf8"))
  : null;
const body = report
  ? formatCollectionReport(report)
  : "\n采集报告不可用；检查前面的安装、测试或采集步骤，不能据此判断为正常零新增。\n";
for (const source of report?.sources || [])
  if (source.status === "failed")
    console.log(`::warning::News source failed: ${source.source}`);
if (process.env.GITHUB_STEP_SUMMARY)
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, "\n" + body);
else console.log(body);

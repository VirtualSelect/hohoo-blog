import reproduction from "@site/data/reproduction.json";
import { useText } from "./Shell";

export default function ReproductionGuide({ id }: { id: string }) {
  const t = useText();
  const record = reproduction[id as keyof typeof reproduction];
  if (!record) return null;
  const code = `git clone https://github.com/VirtualSelect/${record.repository}.git ${record.repository}-study
cd ${record.repository}-study
git checkout ${record.commit}
python -m venv .venv
$py = '.\\.venv\\Scripts\\python.exe'
& $py -m pip install -r ${record.requirements}
& $py ${record.run} --out outputs/my-run
& $py ${record.audit} outputs/my-run`;
  return (
    <details className="reproduction-guide" id="reproduction-setup">
      <summary>
        {t(
          "从干净环境复现 · 本篇固定版本",
          "Reproduce from a clean checkout · this article’s revision",
          "從乾淨環境重現 · 本篇固定版本",
        )}
      </summary>
      <p>
        {t(
          "以下为 Windows PowerShell，Python 3.12。使用新的目录；不要在有未保存改动的工程里切换版本。每篇固定提交不同，首篇的旧提交不包含后续实验。",
          "Windows PowerShell with Python 3.12. Use a new directory, not a working copy with unsaved changes. Each article pins its own revision; the first article’s revision does not contain later experiments.",
          "以下為 Windows PowerShell，Python 3.12。使用新目錄；不要在有未儲存改動的工程裡切換版本。每篇固定提交不同，首篇的舊提交不包含後續實驗。",
        )}
      </p>
      <pre>
        <code className="language-powershell">{code}</code>
      </pre>
      <p>
        {t(
          "预期得到原始轨迹、摘要和审计结果。请使用新的输出目录，避免覆盖旧结果；不同实验对已存在目录的处理并不相同。E8–E10 共用一组实验入口。以上命令不调用模型；先运行数值部分，视频回放按正文单独执行。",
          "Expect raw trajectories, summaries and audit results. Use a new output directory to preserve earlier results; runners differ in how they handle existing directories. E8–E10 share one experiment runner. No model calls are made; run the numeric experiment first and use the article’s separate replay command for video.",
          "預期得到原始軌跡、摘要與稽核結果。請使用新的輸出目錄，避免覆蓋舊結果；不同實驗對既有目錄的處理並不相同。E8–E10 共用一組實驗入口。以上指令不呼叫模型；先執行數值部分，影片回放依正文單獨執行。",
        )}
      </p>
      <p>
        {t(
          "排错：找不到实验目录先核对提交；导入失败检查解释器与安装环境；OpenGL 报错仅影响需要渲染的步骤。Linux/macOS 将解释器替换为 .venv/bin/python，尚未在这些平台复测。",
          "Troubleshooting: a missing experiment directory usually means the wrong revision; import failures require checking the interpreter and environment. OpenGL errors concern rendering steps. On Linux/macOS use .venv/bin/python; those platforms have not been retested.",
          "排錯：找不到實驗目錄先核對提交；匯入失敗檢查解譯器與安裝環境；OpenGL 錯誤僅影響需要渲染的步驟。Linux/macOS 將解譯器替換為 .venv/bin/python，尚未在這些平台複測。",
        )}
      </p>
      <a
        href={`https://github.com/VirtualSelect/${record.repository}/tree/${record.commit}/${record.directory}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        {t("查看本篇固定代码", "Inspect the pinned code", "查看本篇固定程式碼")}{" "}
        ↗
      </a>
    </details>
  );
}

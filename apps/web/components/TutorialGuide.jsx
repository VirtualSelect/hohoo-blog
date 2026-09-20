"use client";
import { useText } from "./Shell";
import LabSketch from "./LabSketch";
import ExpandableFigure from "./ExpandableFigure";
export default function TutorialGuide({ headings }) {
  const t = useText();
  const chapters = headings.filter(
    (h) => h.depth === 2 && /^0[123]/.test(h.text),
  );
  return (
    <section
      className="tutorial-guide"
      aria-label={t("阅读导览", "Reading guide", "閱讀導覽")}
    >
      <div className="tutorial-guide-heading">
        <div>
          <p className="eyebrow">
            {t(
              "先看全貌，再动手",
              "The big picture, then the practice",
              "先看全貌，再動手",
            )}
          </p>
          <h2>
            {t(
              "一篇文章，串起三件事。",
              "Three ideas. One working conversation.",
              "一篇文章，串起三件事。",
            )}
          </h2>
        </div>
        <ExpandableFigure
          title={t(
            "Java → HTTP → 模型 · 示意",
            "Java → HTTP → model · schematic",
            "Java → HTTP → 模型 · 示意",
          )}
        >
          <LabSketch />
        </ExpandableFigure>
      </div>
      <ol className="tutorial-steps">
        {chapters.map((h, i) => (
          <li key={h.id}>
            <a href={"#" + h.id}>
              <span className="eyebrow">0{i + 1}</span>
              <strong>
                {
                  [
                    t("发送请求", "Send a request", "傳送請求"),
                    t("解析回答", "Parse the response", "解析回答"),
                    t("接上前文", "Carry the context", "接上前文"),
                  ][i]
                }
              </strong>
              <span>
                {
                  [
                    t(
                      "Java → HTTP → 模型",
                      "Java → HTTP → model",
                      "Java → HTTP → 模型",
                    ),
                    t(
                      "JSON → message → content",
                      "JSON → message → content",
                      "JSON → message → content",
                    ),
                    t(
                      "历史消息 + 新问题",
                      "Message history + new question",
                      "歷史訊息 + 新問題",
                    ),
                  ][i]
                }
              </span>
            </a>
          </li>
        ))}
      </ol>
      <details className="context-note">
        <summary>
          {t(
            "为什么下一轮要重新发送历史？",
            "Why send the history again?",
            "為什麼下一輪要重新傳送歷史？",
          )}
        </summary>
        <p className="guide-label">{t("概念说明", "Concept", "概念說明")}</p>
        <p>
          {t(
            "这个 Demo 的“记忆”保存在 Java 程序中。每次请求都要把需要的历史消息带给模型。",
            "In this demo, memory lives in the Java program. Each request carries the history the model needs.",
            "這個 Demo 的「記憶」保存在 Java 程式中。每次請求都要把需要的歷史訊息帶給模型。",
          )}
        </p>
        <div className="message-sequence">
          <span>{t("用户①", "User ①", "使用者①")}</span>
          <span>{t("助手①", "Assistant ①", "助手①")}</span>
          <strong>{t("用户②", "User ②", "使用者②")}</strong>
          <span aria-hidden="true">→</span>
          <span>{t("本次请求", "This request", "本次請求")}</span>
        </div>
        <p className="context-takeaway">
          <strong>{t("注意事项：", "Keep in mind: ", "注意事項：")}</strong>
          {t(
            "携带上下文 ≠ 模型获得了永久记忆。",
            "Providing context does not give the model permanent memory.",
            "攜帶上下文 ≠ 模型獲得了永久記憶。",
          )}
        </p>
      </details>
    </section>
  );
}

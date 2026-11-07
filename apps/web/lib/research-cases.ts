import type { Domain } from "./site-types";
export type QuestionId = "java" | "cache" | "robot" | "rag";
export const researchCases = [
  {
    id: "java",
    domain: "ai-apps",
    label: ["AI 应用", "AI applications", "AI 應用"],
    cue: ["重试之后", "After a retry", "重試之後"],
    question: [
      "没收到回复，再试一次就好？",
      "No reply. Just try again?",
      "沒收到回覆，再試一次就好？",
    ],
    context: [
      "服务端已经完成一次加一。客户端再次发送请求，最终只执行一次吗？",
      "The server has already applied +1. If the client sends again, will the effect occur only once?",
      "伺服器已經完成一次加一。用戶端再次傳送請求，最終只執行一次嗎？",
    ],
    yes: ["只执行一次", "One effect", "只執行一次"],
    no: ["会执行两次", "Two effects", "會執行兩次"],
  },
  {
    id: "cache",
    domain: "llm",
    label: ["LLM", "LLM", "LLM"],
    cue: ["省下的计算", "Saved computation", "省下的計算"],
    question: [
      "少算了，为什么还更慢？",
      "Less work. Still slower?",
      "少算了，為什麼還更慢？",
    ],
    context: [
      "12 Token 的输入复用前 8 个 Token。只续算剩下 4 个，总查询会比完整重算更快吗？",
      "Reuse the first 8 of 12 tokens and continue with 4. Will the total query beat a full recompute?",
      "12 Token 的輸入重用前 8 個 Token。只續算剩下 4 個，總查詢會比完整重算更快嗎？",
    ],
    yes: ["缓存更快", "Cache is faster", "快取更快"],
    no: ["这次反而更慢", "Slower in this run", "這次反而更慢"],
  },
  {
    id: "robot",
    domain: "embodied-ai",
    label: ["具身智能", "Embodied AI", "具身智能"],
    cue: ["到达与停住", "Arrive or settle", "到達與停住"],
    question: [
      "经过目标，就算到达了吗？",
      "Passing the target is enough?",
      "經過目標，就算到達了嗎？",
    ],
    context: [
      "把一个球形执行器推向 0.6 米处。改变质量和阻尼，观察它能否在最后 0.3 秒持续保持低误差、低速度。",
      "Drive a spherical actuator toward 0.6 m. Change mass and damping: can it maintain low error and speed for the final 0.3 seconds?",
      "把一個球形執行器推向 0.6 公尺處。改變質量和阻尼，觀察它能否在最後 0.3 秒持續保持低誤差、低速度。",
    ],
    yes: ["能稳定停住", "It settles", "能穩定停住"],
    no: ["还停不住", "It does not settle", "還停不住"],
  },
  {
    id: "rag",
    domain: "rag",
    label: ["RAG", "RAG", "RAG"],
    cue: ["引用与依据", "Citation or support", "引用與依據"],
    question: [
      "引用是真的，答案就对吗？",
      "A real quote. A correct answer?",
      "引用是真的，答案就對嗎？",
    ],
    context: [
      "一份回答附上了真实存在的配置原文。它是否属于当前服务、环境和版本，数值也与回答相符？",
      "An answer includes an exact configuration quote. Does it match the requested service, environment, revision and value?",
      "一份回答附上了真實存在的配置原文。它是否屬於目前服務、環境和版本，數值也與回答相符？",
    ],
    yes: ["这一字段可接受", "Accept this field", "這一欄位可接受"],
    no: ["应该拒绝", "Reject it", "應該拒絕"],
  },
] as const;

export function researchFinding(
  active: QuestionId,
  variant: number,
  t: (zh: string, en: string, tw?: string) => string,
) {
  return active === "java"
    ? [
        t(
          "丢的是回复，不是已经发生的操作。没有幂等身份，第二次请求又执行了加一。",
          "The reply was lost, not the completed effect. Without an idempotency identity, the retry applies +1 again.",
          "遺失的是回覆，不是已經發生的操作。沒有冪等身分，第二次請求又執行了加一。",
        ),
        t(
          "相同键与相同请求体命中已有记录，返回之前的结果。这一条件下，执行次数仍为一。",
          "The same key and body find the existing record and return its result. Under this condition, the effect occurs once.",
          "相同鍵與相同請求內容命中已有記錄，回傳先前的結果。這一條件下，執行次數仍為一。",
        ),
        t(
          "这份实现把幂等记录放在内存。服务重启后记录消失，同一个键也可能再次执行；持久副作用与持久回执需要一起设计。",
          "This implementation keeps idempotency records in memory. Restarting loses them, so even the same key can execute again. Durable effects and receipts need a joint design.",
          "這份實作把冪等記錄放在記憶體。服務重啟後記錄消失，同一個鍵也可能再次執行；持久副作用與持久回執需要一起設計。",
        ),
      ][variant]
    : active === "cache"
      ? t(
          "命中缓存省下部分投影，却增加签名、查找、复制和续算工作。固定签名改善了结果，但这组小规模 CPU 实验仍未胜过完整重算。",
          "A hit saves some projection work but adds signature, lookup, copying and continuation costs. Freezing the signature helps, yet this small CPU workload still loses to full recomputation.",
          "命中快取省下部分投影，卻增加簽章、查找、複製和續算工作。固定簽章改善了結果，但這組小規模 CPU 實驗仍未勝過完整重算。",
        )
      : active === "robot"
        ? t(
            "位置误差接近零时，速度未必为零。阻尼帮助减速，质量改变相同力下的响应；有超调也可能最终稳定。比较过程与完成判据，不能只看一帧。",
            "Near-zero position error does not imply zero speed. Damping helps decelerate; mass changes the response to the same force. Overshoot can still end in settling. Inspect the process and completion criteria together.",
            "位置誤差接近零時，速度未必為零。阻尼幫助減速，質量改變相同力下的響應；有超調也可能最終穩定。比較過程與完成判據，不能只看一幀。",
          )
        : t(
            "找到原文只完成第一步。还要核对环境、修订和字段值；引用存在不能替答案的正确性作保证。这里的规则适用于闭合配置表，不是自由文本事实核查器。",
            "Finding the quote is only the first step. Scope, revision and field value must also match. These rules apply to a closed configuration table, not arbitrary natural-language fact checking.",
            "找到原文只完成第一步。還要核對環境、修訂和欄位值；引用存在不能替答案的正確性作保證。這裡的規則適用於閉合配置表，不是自由文字事實核查器。",
          );
}
export const sceneForDomain: Record<Domain, QuestionId> = {
  "ai-apps": "java",
  llm: "cache",
  "embodied-ai": "robot",
  rag: "rag",
};

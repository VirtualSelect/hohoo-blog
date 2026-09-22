// Teaching experiences, not published research or measured experiments.
export const workshops = [
  {
    id: "failure",
    domain: "ai-apps",
    mark: "↺",
    title: [
      "重试以后，为什么多了一条消息？",
      "Why did retry duplicate a message?",
      "重試以後，為什麼多了一條訊息？",
    ],
    description: [
      "注入一次超时，对照两种历史提交方式。",
      "Inject a timeout and compare two history commit strategies.",
      "注入一次逾時，對照兩種歷史提交方式。",
    ],
    task: [
      "先触发超时，再选择成功响应并重试，比较左右两份历史。",
      "Trigger a timeout, then retry with a successful response. Compare both histories.",
      "先觸發逾時，再選擇成功回應並重試，比較左右兩份歷史。",
    ],
    href: "/docs/ai-apps/java-first-llm",
    tags: ["Java", "HTTP", "timeout", "retry", "超时", "重试"],
  },
  {
    id: "memory",
    domain: "llm",
    mark: "[ ]",
    title: [
      "删掉一句话，就真的忘了吗？",
      "Delete a message. Is the fact gone?",
      "刪掉一句話，就真的忘了嗎？",
    ],
    description: [
      "检查真实对话摘录中，哪些消息仍藏着线索。",
      "Inspect where evidence survives in a recorded conversation.",
      "檢查真實對話摘錄中，哪些訊息仍藏著線索。",
    ],
    task: [
      "切换到裁剪模式，删掉用户说 Java 的消息，再检查助手的回答。",
      "Switch to trimming, remove the user's Java message, then inspect the assistant replies.",
      "切換到裁剪模式，刪掉使用者說 Java 的訊息，再檢查助手的回答。",
    ],
    href: "/projects/hohoo-ai-lab",
    tags: ["memory", "context", "记忆", "上下文"],
  },
  {
    id: "retrieval",
    domain: "ai-apps",
    mark: "A↔B",
    title: [
      "找到资料，就能答对吗？",
      "Does retrieval guarantee a good answer?",
      "找到資料，就能答對嗎？",
    ],
    description: [
      "选择证据、改变排序，观察回答依据如何变化。",
      "Choose evidence and change ranking to inspect the answer's basis.",
      "選擇證據、改變排序，觀察回答依據如何變化。",
    ],
    task: [
      "先选一份无关资料，再加入相关证据；分清找到内容和足够回答。",
      "Start with an irrelevant document, then add relevant evidence. Is it enough to answer?",
      "先選一份無關資料，再加入相關證據；分清找到內容和足夠回答。",
    ],
    href: "/docs/ai-apps",
    tags: ["RAG", "retrieval", "检索", "排序"],
  },
  {
    id: "context",
    domain: "llm",
    mark: "▤",
    title: [
      "上下文满了，先放下什么？",
      "What goes when context is full?",
      "上下文滿了，先放下什麼？",
    ],
    description: [
      "在有限容量里取舍历史、资料和输出空间。",
      "Balance history, references and output space within a limited budget.",
      "在有限容量裡取捨歷史、資料和輸出空間。",
    ],
    task: [
      "缩小容量，再切换压缩资料，观察哪些信息被保留。容量是教学单位，不是 Token 测量。",
      "Reduce capacity and compress references. Units illustrate trade-offs; they are not measured tokens.",
      "縮小容量，再切換壓縮資料，觀察哪些資訊被保留。容量是教學單位，不是 Token 測量。",
    ],
    href: "/docs/llm",
    tags: ["context", "Token", "上下文"],
  },
  {
    id: "robot",
    domain: "embodied-ai",
    mark: "⌁",
    title: [
      "只看见附近，还能到达终点吗？",
      "Can local vision still find the goal?",
      "只看見附近，還能到達終點嗎？",
    ],
    description: [
      "放置障碍，对比全局地图与局部视野的路径。",
      "Place obstacles and compare full-map and local-vision navigation.",
      "放置障礙，對比全域地圖與局部視野的路徑。",
    ],
    task: [
      "挡住原路线，再启用局部视野逐步移动。这里是网格算法，不是机器人仿真。",
      "Block the original path, enable local vision and move step by step. This is a grid algorithm, not physics simulation.",
      "擋住原路線，再啟用局部視野逐步移動。這裡是網格演算法，不是機器人模擬。",
    ],
    href: "/journey/virtual-lab",
    tags: ["robot", "path", "机器人", "路径", "具身"],
  },
  {
    id: "trust-desk",
    domain: "ai-apps",
    mark: "⊣",
    title: [
      "网页里的指令，该听谁的？",
      "Whose instructions should we trust?",
      "網頁裡的指令，該聽誰的？",
    ],
    description: [
      "把不可信来源和应用指令分开，检查提示注入边界。",
      "Separate untrusted sources from application instructions.",
      "把不可信來源和應用指令分開，檢查提示注入邊界。",
    ],
    task: [
      "切换来源，检查同一段文字应被当作资料还是授权。",
      "Change the source and decide whether the text is data or authorization.",
      "切換來源，檢查同一段文字應被當作資料還是授權。",
    ],
    href: "/docs/ai-apps",
    tags: ["security", "prompt injection", "安全", "注入"],
  },
  {
    id: "json-desk",
    domain: "ai-apps",
    mark: "{}",
    title: [
      "这段 JSON，程序真的读得懂吗？",
      "Can your program read this JSON?",
      "這段 JSON，程式真的讀得懂嗎？",
    ],
    description: [
      "展开字段路径，分清字符串、数组与结构错误。",
      "Inspect field paths, strings, arrays and malformed structure.",
      "展開欄位路徑，分清字串、陣列與結構錯誤。",
    ],
    task: [
      "输入一段不含隐私的 JSON，检查嵌套字段的路径和类型。",
      "Enter non-sensitive JSON and inspect nested paths and types.",
      "輸入一段不含隱私的 JSON，檢查巢狀欄位的路徑和型別。",
    ],
    href: "/docs/ai-apps/java-first-llm",
    tags: ["JSON", "schema", "结构化", "解析"],
  },
  {
    id: "decision-desk",
    domain: "ai-apps",
    mark: "≠",
    title: [
      "有把握，就能自动执行吗？",
      "Does confidence grant permission?",
      "有把握，就能自動執行嗎？",
    ],
    description: [
      "改变置信度、权限和操作风险，观察决策规则。",
      "Vary confidence, permission and risk to inspect a decision rule.",
      "改變信心程度、權限和操作風險，觀察決策規則。",
    ],
    task: [
      "把置信度拉满，再撤销权限；观察哪个条件优先。",
      "Maximize confidence, then revoke permission. Which condition wins?",
      "把信心程度拉滿，再撤銷權限；觀察哪個條件優先。",
    ],
    href: "/docs/ai-apps",
    tags: ["Agent", "permission", "权限", "安全"],
  },
];
export const workshopText = (value, locale) =>
  value[locale === "en" ? 1 : locale === "zh-TW" ? 2 : 0];
export function workshopSearchEntries(locale) {
  const prefix = locale === "zh-CN" ? "" : "/" + locale;
  return workshops.map((w) => ({
    id: "workshop:" + w.id,
    type: "workshop",
    topic: w.domain,
    title: workshopText(w.title, locale),
    description: workshopText(w.description, locale),
    tags: w.tags,
    href: `${prefix}/build?tool=${w.id}#workbench`,
  }));
}
export function filterWorkshops({
  domain = "all",
  query = "",
  locale = "zh-CN",
} = {}) {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return workshops.filter(
    (w) =>
      (domain === "all" || w.domain === domain) &&
      words.every((word) =>
        [
          workshopText(w.title, locale),
          workshopText(w.description, locale),
          ...w.tags,
        ]
          .join(" ")
          .toLowerCase()
          .includes(word),
      ),
  );
}

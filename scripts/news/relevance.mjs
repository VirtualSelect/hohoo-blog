// Conservative editorial rules: a source's name or default category is never evidence.
// Editorial ordering only; not a claim about research quality or factual accuracy.
const evidenceText = item => `${item.title} ${item.relevanceText || item.originalSummary || item.summary || ''}`;
const coding = /\b(ai.coding|codex|copilot|claude.code|grok.build|coding.agent\w*|harness|context.engineering)\b|AI\s*编程|智能编程|编码智能体|上下文工程/i;
const robotics = /\b(ros\s?2|mujoco|gazebo|maniskill|isaac(?:.sim|.lab)?|lerobot|robot\w*|embodied|humanoid|locomotion|manipulation|vla|vision.language.action)\b|具身|机器人|机械臂/i;
function mechanisms(text) {
  const context = /context.engineering|上下文工程|\bharness\b/i.test(text)
    && /budget|offload|compact|todo.state|预算|卸载|压缩|跨会话记忆/i.test(text);
  const memory = /\b(memory|memories)\b|记忆/i.test(text)
    && /cross.session|persist\w*|memory.file|retriev\w*|consolidat\w*|跨会话|持久化|记忆文件|主题文件|检索|分层存储/i.test(text);
  const code = coding.test(text)
    && /sandbox|test.suite|unit.test|code.review|static.analysis|type.check|tool.call|沙箱|单元测试|测试用例|代码审查|静态分析|类型检查|工具调用/i.test(text);
  const robot = robotics.test(text)
    && /\b(topic|publisher|subscriber|qos|urdf|joint|trajectory|timestamp|synchron\w*|episode|parquet|mcap|domain.randomization|sim2real)\b|话题|发布订阅|关节|轨迹|时间戳|观测.*动作|动作.*观测|数据对齐|领域随机化|仿真环境|控制器/i.test(text);
  const document = /\bocr\b/i.test(text)
    && /two.pass|just.in.time|两遍|解析器|粗读/i.test(text)
    && /retriev|检索|相关页面/i.test(text);
  return context || memory || code || robot || document;
}
export function researchPriority(item) {
  if (!assessRelevance(item).accepted) return 0;
  const text = evidenceText(item);
  const focus = /\b(rag|tool.call\w*|mcp|harness|eval\w*|observability|vla|manipulation|locomotion|attention|embedding\w*)\b|上下文工程|结构化输出|工具调用|检索增强|可观测|评测|注意力|仿真|动作表示/i;
  return focus.test(text) || coding.test(text) || robotics.test(text) || mechanisms(text) ? 2 : 1;
}
export function assessRelevance(item) {
  if (/\b(missile|warfare)\b|导弹|军事冲突|战争/i.test(item.title))
    return {accepted: false, reason: '军事事件报道偏离本站研究实践主线'};
  if (item.sourceId === 'simon-willison' && /^Quoting\s/i.test(item.title))
    return {accepted: false, reason: '引用短条目，不作为独立技术文章收录'};
  if (/\b(differential diagnosis|clinical diagnosis|cognitive behavioral therapy)\b|临床诊断|心理治疗/i.test(item.title))
    return {accepted: false, reason: '临床应用论文偏离本站当前研究主线'};
  const text = evidenceText(item);
  const excluded = /\b(funding|fundrais\w*|acquisition|partnership|appoint\w*|sponsorship|earnings|antimicrobial|genom\w*|weather|climate)\b|融资|收购|人事任命|气象|基因组|指控|传闻|谣言/i;
  if (excluded.test(text)) return {accepted: false, reason: '泛商业或非本站研究领域'};
  const domains = [
    ['embodied-ai', robotics],
    ['ai-apps', /\b(rag|retrieval.augmented|agent\w*|tool.call\w*|mcp|llm.application\w*|gradio|vllm|sglang|ai.coding|codex|copilot|claude.code|grok.build|harness|context.engineering)\b|智能体|检索增强|工具调用|AI\s*编程|智能编程|编码智能体|上下文工程/i],
    ['llm', /\b(llm\w*|language.model\w*|transformer\w*|tokeniz\w*|fine.tun\w*|lora|quantiz\w*|distill\w*)\b|语言模型|微调|量化|蒸馏/i],
  ];
  const domain = domains.find(([, pattern]) => pattern.test(text));
  if (!domain) return {accepted: false, reason: '缺少明确研究主题证据'};
  const mechanism = mechanisms(text);
  const ranking = /leaderboard|ranking|ranked|tops? the|榜单|排行榜|排名|登顶|夺冠/i;
  const reproducible = /ablation|evaluation.protocol|test.harness|reproduc\w*|消融|评测方法|评测协议|复现步骤|测试脚本|评测代码/i;
  if (ranking.test(text) && !mechanism && !reproducible.test(text))
    return {accepted: false, reason: '纯榜单或排名信息，缺少可复用技术方法'};
  if (/上线|上架|推出|launch|available/i.test(item.title) && /定价|价格|pricing|price per/i.test(text) && !mechanism && !reproducible.test(text))
    return {accepted: false, reason: '产品上架与定价宣传，缺少可复用技术方法'};
  if (/限时优惠|立即购买|立即订阅|discount|buy.now|subscribe.now/i.test(text) && !mechanism && !reproducible.test(text))
    return {accepted: false, reason: '商业推广，缺少可复用技术方法'};
  const technical = /\b(benchmark\w*|evaluat\w*|dataset\w*|train\w*|inference|implement\w*|code|github|tutorial|latency|throughput|architect\w*|rebuild\w*|simulat\w*|policy|policies|fine.tun\w*|quantiz\w*|distill\w*)\b|评测|数据集|训练|推理|教程|实现|延迟|吞吐|仿真|策略|微调|量化|蒸馏/i;
  if (!technical.test(text) && !mechanism && !reproducible.test(text)) return {accepted: false, reason: '缺少技术方法、实现或评测信息'};
  return {accepted: true, category: domain[0], reason: '研究主题匹配且包含技术信息'};
}

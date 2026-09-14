// Conservative editorial rules: a source's name or default category is never evidence.
export function assessRelevance(item) {
  const text = `${item.title} ${item.originalSummary || item.summary || ''}`;
  const excluded = /\b(funding|fundrais\w*|acquisition|partnership|appoint\w*|sponsorship|earnings|antimicrobial|genom\w*|weather|climate)\b|融资|收购|人事任命|气象|基因组|指控|传闻|谣言/i;
  if (excluded.test(text)) return {accepted: false, reason: '泛商业或非本站研究领域'};
  const domains = [
    ['embodied-ai', /\b(robot\w*|embodied|humanoid|locomotion|manipulation|vla|vision.language.action)\b|具身|机器人/i],
    ['ai-apps', /\b(rag|retrieval.augmented|agent\w*|tool.call\w*|mcp|llm.application\w*|gradio|vllm|sglang)\b|智能体|检索增强|工具调用/i],
    ['llm', /\b(llm\w*|language.model\w*|transformer\w*|tokeniz\w*|fine.tun\w*|lora|quantiz\w*|distill\w*)\b|语言模型|微调|量化|蒸馏/i],
  ];
  const domain = domains.find(([, pattern]) => pattern.test(text));
  if (!domain) return {accepted: false, reason: '缺少明确研究主题证据'};
  const technical = /\b(benchmark\w*|evaluat\w*|dataset\w*|train\w*|inference|implement\w*|code|github|tutorial|latency|throughput|architect\w*|rebuild\w*|simulat\w*|policy|policies|fine.tun\w*|quantiz\w*|distill\w*)\b|评测|数据集|训练|推理|教程|实现|延迟|吞吐|仿真|策略|微调|量化|蒸馏/i;
  // Require both a concrete engineering topic and an identifiable mechanism.
  const contextEngineering = /context.engineering|上下文工程|\bharness\b/i.test(text)
    && /budget|offload|compact|todo.state|预算|卸载|压缩|跨会话记忆/i.test(text);
  const documentPipeline = /\bocr\b/i.test(text)
    && /two.pass|just.in.time|两遍|解析器|粗读/i.test(text)
    && /retriev|检索|相关页面/i.test(text);
  if (!technical.test(text) && !contextEngineering && !documentPipeline) return {accepted: false, reason: '缺少技术方法、实现或评测信息'};
  return {accepted: true, category: domain[0], reason: '研究主题匹配且包含技术信息'};
}

import AstraParticleHero from '@/components/AstraParticleHero';
export default function Home() {
  return <>
    <a className="skip" href="#explore">跳至正文</a>
    <header className="nav"><a className="brand" href="/">Hohoo.</a><nav aria-label="主导航">
      <a href="https://huhohoo.com/learning">Learn</a><a href="https://huhohoo.com/projects">Build</a>
      <a href="https://huhohoo.com/blog">Blog</a><a href="https://github.com/VirtualSelect">GitHub ↗</a>
    </nav></header>
    <main><AstraParticleHero />
      <section className="explore" id="explore">
        <p className="eyebrow">LEARN / BUILD / SHARE</p>
        <h2>探索智能，<br /><span>构建可能。</span></h2>
        <p className="lead">你好，我是 Hohoo。从 Java 到 AI，从模型到应用，再走向真实世界。<br />在这里公开学习、记录实验，把想法做成看得见的东西。</p>
        <div className="tracks">
          <a href="https://huhohoo.com/docs/ai-apps"><small>01 / BUILD</small><h3>AI 应用开发</h3><p>把模型能力变成真正可用的软件。</p><span>探索学习路线 ↗</span></a>
          <a href="https://huhohoo.com/docs/llm"><small>02 / UNDERSTAND</small><h3>LLM</h3><p>整理大语言模型的学习笔记、论文阅读与实验观察。</p><span>深入模型原理 ↗</span></a>
          <a href="https://huhohoo.com/docs/embodied-ai"><small>03 / EXPLORE</small><h3>具身智能</h3><p>从感知、决策到行动，探索智能与真实世界的连接。</p><span>走向真实世界 ↗</span></a>
        </div>
      </section>
    </main>
    <footer><span>Hohoo. Learning in public. Building in public.</span><a href="https://huhohoo.com/about">关于 Hohoo ↗</a></footer>
  </>;
}

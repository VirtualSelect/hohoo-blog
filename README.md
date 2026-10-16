# Hohoo's AI Lab 🌐

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-26.8.2-brightgreen.svg)](.node-version)
[![Next.js](https://img.shields.io/badge/Next.js-App%20Router-black.svg)](https://nextjs.org/)
[![Deploy with Vercel](https://img.shields.io/badge/deploy%20with-vercel-black?logo=vercel)](https://vercel.com/new/clone?repository-url=https://github.com/VirtualSelect/hohoo-blog)

> 一个开箱即用的三语言 AI 技术博客模板 —— Next.js App Router + TypeScript + MDX + 自动化资讯采集管线。
>
> A trilingual tech-blog starter: Next.js App Router, TypeScript, MDX content, and an automated AI-news pipeline.

## ✨ 特性

- 🌍 **三语言 i18n**：中 / 英 / 繁，URL 本地化，`i18n:check` 自动校验翻译完整性
- 🤖 **AI 资讯自动采集**：GitHub Actions 定时抓取 → 翻译 → 发布，全流程脚本化（见 `NEWS.md`）
- 📝 **MDX 内容系统**：技术教程、随笔、学习路线、阅读时间轴，草稿与已发布严格区分
- 🔍 **全文搜索 + 技术雷达（Radar）**：开箱即用的内容发现页
- ✅ **CI 全套校验**：format / typecheck（严格模式）/ 单元测试 / i18n / 资讯新鲜度检查
- 🚀 **Vercel 一键部署**：`vercel.json` 已配好

## 🚀 快速开始

**方式一：用模板创建（推荐）**

1. 点击本仓库右上角 **Use this template** → 创建你的新仓库
2. 克隆到本地，按 `.node-version` 安装 Node.js（26.8.2）
3. 安装并启动：

```sh
npm ci
npm ci --prefix apps/web
npm start
```

4. 打开 http://localhost:4181 🎉

**方式二：直接克隆**

```sh
git clone https://github.com/VirtualSelect/hohoo-blog.git my-blog
cd my-blog
npm ci && npm ci --prefix apps/web && npm start
```

## 🧩 换成你自己的内容（ checklist ）

- [ ] `blog/`、`docs/`：换成你的文章（支持 MDX）
- [ ] `i18n/{locale}/`：更新各语言译文；`code.json`：界面文案
- [ ] `data/`：项目、实验、路线、Radar 数据换成你的
- [ ] `static/`：换 logo 和图片资源
- [ ] `apps/web/app`：站点标题、SEO、导航文案
- [ ] GitHub About 里的 homepage 换成你的域名

## 🛠 技术栈

| 层 | 技术 |
|---|---|
| 框架 | Next.js（App Router） |
| 语言 | TypeScript（严格模式，渐进迁移中）+ JS/JSX 共存 |
| 内容 | MDX，`lib/content` 提供框架无关的内容/RSS 工具 |
| 样式 | CSS 变量主题（`--hh-*`），共享阅读样式 |
| 自动化 | GitHub Actions（资讯采集 `ai-news.yml`、CI 校验 `validate.yml`） |
| 部署 | Vercel |

## 📁 项目结构

```
apps/web/           # Next.js 应用：路由、SEO、组件、运行时
  app/              # 路由与页面
  components/       # 首页、导航、搜索、Radar、阅读器
  runtime/          # 站点上下文、翻译、链接
lib/content         # 框架无关的内容、学习索引、RSS 工具
blog/ docs/         # 随笔与技术教程（MDX）
i18n/{locale}/      # 三语言译文
data/               # 项目、实验、路线、Radar 数据
scripts/news/       # 资讯采集 / 渲染 / 翻译脚本
scripts/i18n/       # 翻译完整性检查
tests/              # 资讯管线测试
```

## ✍️ 写文章

在 `blog/` 或 `docs/` 下新建 `.mdx` 文件，frontmatter 里写标题、日期、语言即可发布。
草稿不要伪装成已发布内容——学习状态与收藏只保存在浏览器本地，不污染仓库。

## 🤖 自动化资讯管线

```sh
npm run news:collect    # 采集
npm run news:render     # 渲染
npm run news:translate  # 翻译
npm run news:check      # 校验（含新鲜度）
```

定时任务见 `.github/workflows/ai-news.yml`，运行说明见 `NEWS.md`。

## ✅ 本地校验（CI 跑的同一套）

```sh
npm run format:check
npm run typecheck
npm run test:web
npm run i18n:check
npm run news:check
npm run build
```

Windows 旧终端 Node 路径未更新时，先运行 `. ./scripts/use-node.ps1`。

## 🚢 部署

Fork 后在 Vercel 导入本仓库即可部署（已含 `vercel.json`）。
Docusaurus 历史代码保留在 Git 记录中可查，无需维护第二套构建。

## 📄 License

[MIT](LICENSE) —— 可自由使用、修改、商用，保留版权声明即可。

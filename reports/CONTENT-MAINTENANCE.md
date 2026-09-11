# 本轮内容结构与维护

## 单一数据源
- data/current.json：首页 Currently、Now、About；updated 只在实质更新时调整。
- data/projects.json：真实项目及详情；date 为项目说明发布时间，不是自动推测的上线日期。
- data/experiments.json：保留旧实验 ID，默认 planning；完成实验必须提供 method/result，观察与结论分开。
- data/learning-paths.json：三条主线与 planned 种子选题。AI Engineering 为 ai-apps 下的 area，不是第四条轨道。
- data/notes.json：当前为空；只有 published 项生成公开详情。
- data/radar-digests.json：显式周汇总发布记录；itemIds 保留来源。没有发布记录的后续周仍可按现有信号生成阅读索引，但不冒充新的成长事件。

## 原生内容
Docs 使用 domain、difficulty、learning_step、published_at、reading_minutes、related、prerequisites。非 published/planning 项不应标注已发布。开发模板位于 docs/templates，构建明确排除。

Blog 保持阶段复盘与个人表达。Latest 使用框架提供的真实日期、阅读时间和地址，不在首页重新硬编码文章副本。

## 关联
采用 doc:<原生 ID>、project:<slug>、lab:<旧实验 ID>、note:<slug>。现有 paper:<arxiv ID> 保持稳定。关系显式定义；未知关系、重复 ID、无效日期使构建失败。

## Radar 边界
保留 AIHOT 主来源、现有筛选、自动检查和发布。页面适配器支持稳定分类、同标题同日/显式 eventId 合并、官方来源优先和 Related Coverage。它不是语义聚类模型，不展示未测量的评分。自动翻译仍关闭。WHY IT MATTERS 仅在有真实字段时显示；本轮不生成个人观点。

现有三份论文内容是摘要导读，不表示作者完成精读。未提供本站阅读日期，所以不进入成长时间轴。

## 本地进度
huhohoo.learning.v1，结构含 version/items/saved/lastOpened。从 hohoo-learning-v1 迁移，保留旧键。保存失败退化为会话内存；SSR 不访问存储。最近阅读只链接真实发布的路线文章。

## 路由兼容
/about 为 canonical，/aboutMe 保留；/radar 为 canonical，/news 保留；a new milestone → a-new-milestone。静态兼容文件、客户端跳转与 Vercel 永久重定向同时覆盖；英文前缀保留。

## 暂不做
无登录、云同步、新评论系统、CMS、图谱、Ask Hohoo、趋势榜单。已有 About 评论保留。

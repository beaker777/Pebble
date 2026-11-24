# Pebble Press · 拾石集

参考 **Stripe Press** 出版美学打造的个人面试八股知识库（基于 **Astro + Tailwind CSS + Markdown**，纯静态 0 成本部署）。

## 快速启动

```bash
pnpm install
pnpm dev
```

启动后访问终端提示的地址（默认 `http://localhost:4321`）。

## 如何快捷新增一篇面试八股

### 方式一：命令行一键生成模板（推荐）

```bash
pnpm run new
```

按提示选择专题、输入标题，即可自动在 `src/content/notes/<专题>/` 下生成带规范 Frontmatter 的 `.md` 文件，无需修改任何前端代码。

### 方式二：直接新建 Markdown 文件

在 `src/content/notes/<专题名>/` 目录下新建 `.md` 文件（例如 `src/content/notes/java/03-aqs.md`），顶部写好元数据即可自动出现在首页书架、总索引、侧边栏和 `Ctrl+K` 搜索结果中：

```markdown
---
title: AQS 抽象队列同步器原理
volume: java
order: 3
frequency: 高频必问
readTime: 5 min
summary: 用一句话写下这道题的面试核心回答。
tags: [并发, 锁机制]
updatedAt: 2026-11-23
---

## 核心原理
正文直接写 Markdown，支持代码块、表格、引用块和图片...
```

## 部署到 Cloudflare Pages（免费 + 自定义域名）

1. 将仓库推送到 GitHub（公开或私有仓库均可）。
2. 打开 Cloudflare 控制台 → **Workers 和 Pages** → **创建** → **Pages** → **导入现有 Git 存储库**。
3. 构建配置：
   - **构建命令**：`pnpm run build`（或 `npm run build`）
   - **构建输出目录**：`dist`
4. 部署完成后在 **自定义域** 绑定你的域名即可自动开启 HTTPS。

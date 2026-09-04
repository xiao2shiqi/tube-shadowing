# 🎧 Tube Shadowing：把整个 YouTube 变成你的影子跟读教材

<p align="center">
  <a href="https://github.com/xiao2shiqi/tube-shadowing/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"></a>
  <a href="https://react.dev/"><img src="https://img.shields.io/badge/React-19.x-61dafb?logo=react" alt="React 19"></a>
  <a href="https://vitejs.dev/"><img src="https://img.shields.io/badge/Vite-7.x-646cff?logo=vite" alt="Vite"></a>
  <a href="https://developers.cloudflare.com/workers/"><img src="https://img.shields.io/badge/Cloudflare-Workers%20%2B%20D1-f38020?logo=cloudflare&logoColor=white" alt="Cloudflare Workers"></a>
</p>

<p align="center">
  <strong>影子跟读（shadowing）最难的不是听，是"听完那一秒来不及开口"。这个播放器把那一秒还给你。</strong>
</p>

---

## 🚀 在线体验

**[shadowing.xiao27.com](https://shadowing.xiao27.com/)**

贴一个 YouTube 链接就能开始，无需注册。

---

## 💭 为什么做这个

市面上的跟读工具，要么素材是别人选好的（内容陈旧、不是你感兴趣的），要么只是个普通播放器（暂停靠手动，一句话要拖三次进度条）。

而真实的影子跟读需要三件事：**能反复听同一句、听完有留白让你开口、卡住的地方能立刻查清楚**。这三件事在普通播放器上都要手动完成，练 20 分钟有一半时间花在操作上。

所以做了这个：素材来自整个 YouTube，跟读的节奏交给程序。

---

## ✨ 核心功能

### 🔁 智能影子跟读
单句精听循环，并根据句子时长自动计算跟读留白——句子长，留白就长，不用手动暂停。

### 🤖 AI 语境精析
遇到长难句或地道表达，一键拆解语法结构与实际用法，不只是翻译。

### 📖 欧路词典云端联动
点击生词即时查询，一键同步到你的欧路生词本，跟读过程不被打断。

### ⌨️ 全键盘操作
听、停、复读、上一句下一句全部有快捷键，手不用离开键盘，也不用把注意力从字幕上移开。

### 📚 云端书架
登录后保存练习过的视频与进度，换设备继续。

---

## 🛠️ 技术栈

| 层 | 选型 |
| --- | --- |
| 前端 | React 19 + TypeScript 5.9 + Vite 7 |
| 样式 | Tailwind CSS v4 |
| 图标 | lucide-react |
| 后端 | Cloudflare Workers（`src/worker.ts`） |
| 数据库 | Cloudflare D1（SQLite） |
| 本地缓存 | IndexedDB |
| 登录 | Google / GitHub OAuth + JWT |

---

## 🗂️ 项目结构

```
src/
├── components/      # UI 组件（Player / Transcript / Bookshelf / Settings）
├── hooks/           # useShadowing、useYouTubePlayer 等核心逻辑
├── services/        # 字幕抓取、AI 翻译、词典、鉴权、数据接口
├── types/           # TypeScript 类型定义
├── worker.ts        # Cloudflare Worker：API 与字幕代理
└── styles/
migrations/          # D1 数据库迁移脚本
```

---

## 🛠️ 本地运行

```bash
git clone git@github.com:xiao2shiqi/tube-shadowing.git
cd tube-shadowing
npm install

# 配置本地环境变量（见下）
cp .env.example .dev.vars

npm run dev
```

### 环境变量

本地开发在 `.dev.vars` 中配置，生产环境用 `wrangler secret put <NAME>` 写入：

| 变量 | 说明 |
| --- | --- |
| `JWT_SECRET` | 签发登录态 JWT 的密钥 |
| `GOOGLE_CLIENT_ID` | Google OAuth 客户端 ID |
| `ALLOWED_ORIGIN` | 允许的跨域来源 |
| `API_KEY_ENC_SECRET` | 用户 API Key 的加密密钥 |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub OAuth（可选） |

> ⚠️ `.dev.vars`、`.env` 及任何 `client_secret*.json` 均已在 `.gitignore` 中排除，请勿提交。

### 部署

```bash
npm run deploy   # 构建并 wrangler deploy 到 Cloudflare
```

---

## 🗺️ 后续计划

- [ ] 跟读录音回放与自我比对
- [ ] 生词本导出（Anki / CSV）
- [ ] 练习时长与句数统计

---

## 📄 License & 免责声明

代码以 [MIT](LICENSE) 协议开源。

本项目不存储、不分发任何 YouTube 视频内容，仅作为播放器调用 YouTube 官方 iframe API，字幕亦来自 YouTube 公开接口。视频版权归原作者所有，请在遵守 YouTube 服务条款的前提下用于个人语言学习。

---

<p align="center">
  作者 <a href="https://xiao27.com">xiaobin</a> ｜ 更多作品见 <a href="https://xiao27.com">xiao27.com</a>
</p>

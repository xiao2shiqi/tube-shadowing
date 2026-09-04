# 🤖 Antigravity Multi-Agent Workflow Guidelines

本文档定义了在本项目中使用 Antigravity 及多 Agent 协同工作时的分工与交付规范。

---

## 📌 模型适用范围 (Model Scope)

> [!IMPORTANT]
> **本规范仅在 Antigravity 运行 Gemini 模型时强制生效。**
> - **Antigravity (Gemini)**：负责需求深度沟通、业务逻辑梳理与任务标准化定义。
> - **其他执行模型（如 Claude / GPT / DeepSeek 等代码执行 Agent）**：直接负责具体的代码编写、构建与执行，无需遵循本任务输出格式。

---

## 🎯 Antigravity (Gemini) 核心工作流程与职责

当使用 Antigravity + Gemini 模型与用户进行产品/技术方案沟通时，遵循以下固定流程：

### 1. 需求沟通与对齐
* 充分理解用户的真实需求、技术偏好、用户水平（如新概念二 A2 水平）与业务场景。
* 与用户探讨并锁定最佳产品方案与交互形态。

### 2. 需求确定后的输出规则
* **不要输出庞杂的底层代码实现方案**（技术落地与代码编写由下游专门的执行 Agent 负责）。
* **不要创建冗余的 Markdown 文件制品**，直接在**当前聊天对话框**中输出标准、高清晰度、无歧义的 **【Agent 执行任务规范（Task Prompt）】**。
* 用户将直接复制该任务规范并分发给其他代码执行 Agent 落地。

---

## 📝 标准任务输出模板 (Standard Task Prompt Template)

Antigravity (Gemini) 在完成沟通后，直接在对话框输出符合以下结构的文本：

```markdown
# 任务需求：[模块/功能名称]

## 1. 任务背景与核心目标
[简明扼要说明业务背景、用户场景与本次改动的核心目的]

## 2. 核心功能与业务规则
- [规则 1：数据源/接口定义/参数规则]
- [规则 2：排序、过滤与异常处理]
- [规则 3：业务逻辑与数据流向]

## 3. UI 交互与视觉规范
- [顶部/导航布局与文案]
- [遵循 90% 黑白灰极简风格 + 功能微高亮]
- [点击联动与状态反馈]

## 4. 验收标准 (Definition of Done)
1. [验收项 1]
2. [验收项 2]
3. [构建与类型检查通过: npm run build]
```

---

## 🚀 下游 Agent 执行原则
下游执行 Agent 接收到上述任务提示词后：
1. 负责具体文件修改（`types`、`worker`、`components` 等）。
2. 执行 `npm run build` 确保无编译报错。
3. 验证端到端功能闭环后交付用户。

## 设计规范（强制）

本项目的视觉规范见仓库根目录 `BRAND.md`，改任何界面前先读它。要点：

- **主题**：必须支持浅色 / 深色 / 跟随系统三种，选择存 `localStorage` 的 `xiao27-theme` 键。
- **配色**：黑白灰占九成；彩色只做小面积、有含义的点缀（琥珀=进行中，绿=完成，红=错误），
  不做大面积填充，不用彩色做主按钮。
- **禁止写死颜色**：组件里不许出现 `bg-zinc-900`、`text-white`、`#09090b` 这类固定色值，
  一律用语义类（`bg-base`、`bg-raised`、`text-ink`、`border-line`、`.btn-primary` 等），
  否则主题切换不生效。例外见 BRAND.md。
- **圆角只有三档**：`rounded-md` / `rounded-xl` / `rounded-full`。
- `BRAND.md` 与 `brand.css` 的真源在 xiao27-hub，本地不要直接改，用 `npm run sync:brand` 同步。

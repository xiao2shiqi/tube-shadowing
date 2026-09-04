# YouTube 双语影子跟读工作台 & 个人精听书架 (Tube Shadowing & Study Bookshelf)
## 完整技术方案与 Agent 执行指导书 (v2.0 全量规划版)

> **定位说明**：本文档为 YouTube 双语影子跟读工作台的**终极全量架构与执行指导方案**。包含：**个人视频书架与断点续播书签系统**、**词级卡拉OK实时发音点亮**、**DeepSeek AI 双语智能精翻**、**IndexedDB 本地永久缓存** 与 **Mac 欧路词典联动**。任何执行 Agent 须严格按本文档的规范进行无偏差开发与交付。

---

## 1. 项目整体架构与交互模型

### 1.1 核心设计理念
- **像读书一样学视频（Bookshelf Metaphor）**：每一个导入的 YouTube 视频都是书架上的一本“精读书籍”。系统自动记录阅读进度、时间坐标和翻译结果。
- **断点记忆，开卷即学（Resume from Bookmark）**：下次点开任意视频，自动定位至上次离开的**毫秒时间坐标与对应句子**，无缝继续精听。
- **声词合一，逐词点亮（Word-Level Karaoke）**：提取 YouTube 毫秒级原生词频时间轴，嘉宾发音落到哪个单词，光标就精准点亮哪个单词。
- **一次翻译，永久免费（Zero Token Waste）**：基于 IndexedDB 本地数据库存储双语字幕，同视频仅翻译一次，二次打开 0 毫秒加载、0 消耗 Token。
- **零服务端数据库、纯前端直连（Stateless & Edge）**：运行于 Cloudflare Worker + Static Assets，API Key 仅存储于用户本地浏览器，隐私绝对安全。

---

### 1.2 系统架构拓扑图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           浏览器用户界面 (Web App)                            │
├──────────────────────────────────────┬──────────────────────────────────────┤
│          【顶部导航与书架入口】        │         【用户配置与 API Key】       │
│  • 📚 我的书架 (含未读/进度统计)     │  • DeepSeek API Key (localStorage)   │
│  • 🔍 YouTube URL / Demo 快速导入    │  • 快捷键速查速览弹窗                │
├──────────────────────────────────────┴──────────────────────────────────────┤
│                             【双栏工作台核心区】                              │
├──────────────────────────────────────┬──────────────────────────────────────┤
│       【左侧：播放与跟读控制区】      │       【右侧：双语交互字幕流】       │
│ • YouTube 嵌入播放器 (毫秒时钟同步)   │ • 实时居中平滑滚动高亮当前句         │
│ • 断点记忆进度条 (上次研读坐标)      │ • 🔥 词级卡拉OK点亮 (实时跟随发音)   │
│ • 单句循环 (A-B Loop)                │ • 单词级点击 ➔ 调起 Mac 欧路词典     │
│ • 句尾自动暂停 (跟读留白)            │ • 英文主字幕 (大字) + 中文副字幕     │
│ • 0.5x ~ 2.0x 无级变速调节           │ • 4 种字幕模式 (双语/单英/单中/盲盒) │
├──────────────────────────────────────┴──────────────────────────────────────┤
│                     【本地持久化存储层 (IndexedDB)】                         │
│  • Store 1 (bookshelf_items): 视频书籍元数据、封面、总句数、上次播放秒数/句号 │
│  • Store 2 (video_transcripts): 包含 words 词级时间轴与中英双语的完整字幕流   │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                ┌──────────────────────┴──────────────────────┐
                ▼                                             ▼
  ┌───────────────────────────┐                 ┌───────────────────────────┐
  │    Cloudflare Edge API    │                 │   DeepSeek 官方 API 直连   │
  │ • 提取原生 ASR 词级 <s> 轨│                 │ • 30句/批次，并发池精翻   │
  │ • 无状态绕过 CORS & 防反爬│                 │ • 精听专用口语化 Prompt   │
  └───────────────────────────┘                 └───────────────────────────┘
```

---

## 2. 核心功能详细规范

### 2.1 个人视频书架与断点记忆书签系统 (Bookshelf & Resume System)

#### A. 书架数据结构 (`src/types/bookshelf.ts`)
```typescript
export interface BookshelfItem {
  videoId: string;
  title: string;
  thumbnailUrl: string;       // https://img.youtube.com/vi/${videoId}/hqdefault.jpg
  duration: number;           // 视频总秒数
  sentenceCount: number;      // 字幕总句数
  hasTranslation: boolean;    // 是否已拥有中文翻译
  lastPlayedTime: number;     // 上次离开时的秒数 (如 1719.5 秒)
  lastSentenceIndex: number;  // 上次离开时的句子索引 (如 第 142 句)
  progressPercent: number;    // 研读进度百分比 (0 ~ 100)
  addedAt: number;            // 加入书架时间戳
  lastStudiedAt: number;      // 最近一次研读时间戳
}
```

#### B. 书架交互与抽屉设计 (`src/components/Bookshelf/BookshelfModal.tsx`)
1. **书架入口**：在 Header 中放置 `📚 我的书架 (数量)` 按钮，点击滑出精美暗色抽屉/弹窗。
2. **书籍卡片展示**：
   - 视频封面图（16:9 高清缩略图）+ 悬浮播放图标。
   - 视频标题与总句数。
   - **学习进度指示器**：底部进度条，直观展示已学百分比（如 `学习至 28:39 / 5:15:51 (9%)`）。
   - **状态标签**：`✨ 已AI精翻` / `原版双语` / `纯英文`。
   - **最近研读时间**（如 `10分钟前`、`昨天`）。
3. **断点续播逻辑**：
   - 点击书架中任意视频：
     1. 从 `IndexedDB` 毫秒级读出缓存的双语字幕（0 Token 消耗）。
     2. YouTube 播放器自动跳转（`player.seekTo(item.lastPlayedTime, true)`）。
     3. 字幕列表平滑滚动至 `lastSentenceIndex` 处。
     4. 弹出 Toast 提示：`已恢复上次进度：第 ${lastSentenceIndex + 1} 句 (${formatTime(lastPlayedTime)})`。
4. **书籍管理**：
   - 视频播放过程中，每隔 3 秒或页面卸载/切视频时自动更新当前 `lastPlayedTime` 和 `lastSentenceIndex`。
   - 卡片右上角支持「移出书架 / 清除本地缓存」。

---

### 2.2 词级卡拉OK对齐与发音逐词点亮 (Word-Level Karaoke Engine)

#### A. 词级时间戳数据结构 (`src/types/subtitle.ts`)
```typescript
export interface WordTiming {
  word: string;  // 单词文本，如 "agentic"
  start: number; // 该词发音开始秒数 (如 12.35)
  end: number;   // 该词发音结束秒数 (如 12.80)
}

export interface TranscriptSentence {
  id: number;
  start: number;
  end: number;
  en: string;
  zh: string;
  words?: WordTiming[]; // 每个单词的高精度起止时间轴
}
```

#### B. Edge 端词级时间轴提取 (`src/worker.ts`)
YouTube 原生 Format 3 字幕 XML 在 `<p t="..." d="...">` 内包含 `<s t="...">` 标签。
升级解析算法：
```typescript
// 示例 XML: <p t="1000" d="3000"><s>Like, </s><s t="250">at </s><s t="600">this </s><s t="1100">agentic </s></p>
// 提取 logic:
// startMs = 1000
// word 1: "Like,"   start = 1.000, end = 1.250
// word 2: "at"      start = 1.250, end = 1.600
// word 3: "this"    start = 1.600, end = 2.100
// word 4: "agentic" start = 2.100, end = 4.000
```
- **智能平滑插值降级**：若遇到作者上传的人工字幕缺少 `<s>` 标签，根据整句 `start` 与 `end`，结合每个单词的字符长度/音节权重自动插值生成 `words` 数组，保证 100% 视频都有词级光标。

#### C. 高频时钟与卡拉OK发音状态渲染 (`ClickableWord.tsx`)
1. **30ms 高频进度同步**：`useYouTubePlayer` 同步间隔优化为 30ms，消除跳词卡顿与延迟。
2. **三态实时点亮视觉规范**：
   - 🔥 **当前发音单词（Active Word）**：
     `bg-amber-400 text-zinc-950 font-bold px-1 py-0.5 rounded shadow-sm scale-105 transition-all duration-75`
   - ✅ **已读过单词（Spoken Words）**：
     `text-white font-medium`
   - ⏳ **未读到单词（Upcoming Words）**：
     `text-zinc-400`
3. **无缝联动 Mac 欧路词典**：
   - 无论单词是否处于高亮状态，点击单词立即触发 `eudic://dict/{cleanWord}`，不中断视频播放。

---

### 2.3 DeepSeek AI 智能双语精翻与本地持久化

1. **零服务端存储**：DeepSeek API Key 存储在 `localStorage`。
2. **分批并发池**：30 句/批次，并发 3 组，支持实时增量上屏（`onPartialResult`）与随时中断。
3. **精听专用 Prompt**：严控口语化、精准地道翻译、专有名词准确。
4. **永久持久化**：翻译完成的双语及词级字幕直接写入 `IndexedDB`，同视频二次打开 **0 请求、0 费用**。

---

## 3. IndexedDB 双表存储架构设计 (`src/services/indexedDbService.ts`)

```typescript
const DB_NAME = 'TubeShadowingDB';
const DB_VERSION = 2; // 升级版本支持书架

// Store 1: 'bookshelf_items' (keyPath: 'videoId')
// 存储书架书籍卡片、上次播放时间点与进度
// Store 2: 'video_transcripts' (keyPath: 'videoId')
// 存储完整的双语字幕及词级时间轴数组 sentences: TranscriptSentence[]
```

---

## 4. 关键组件与模块代码实现蓝图

### 4.1 词级时间戳解析实现 (`src/worker.ts`)

```typescript
function parseAndMergeTimedText(enXml: string, zhXml: string): TranscriptItem[] {
  const parseItems = (xml: string) => {
    const list: { start: number; end: number; text: string; words?: WordTiming[] }[] = [];

    // Format 3: <p t="100" d="4720"><s>word1 </s><s t="250">word2 </s></p>
    const pRegex = /<p\s+t="(\d+)"\s+d="(\d+)"[^>]*>([\s\S]*?)<\/p>/g;
    let m;
    while ((m = pRegex.exec(xml)) !== null) {
      const pStartMs = parseInt(m[1], 10);
      const pDurMs = parseInt(m[2], 10);
      const innerContent = m[3];
      const pStart = pStartMs / 1000;
      const pEnd = (pStartMs + pDurMs) / 1000;

      // 提取内部 <s> 标签构建词级时间戳
      const words: WordTiming[] = [];
      const sRegex = /<s(?:\s+t="(\d+)")?[^>]*>([\s\S]*?)<\/s>/g;
      let sm;
      let fullText = '';
      const sMatches: { offsetMs: number; text: string }[] = [];

      while ((sm = sRegex.exec(innerContent)) !== null) {
        const offsetMs = sm[1] ? parseInt(sm[1], 10) : 0;
        const text = decodeXmlEntities(sm[2]);
        if (text) {
          sMatches.push({ offsetMs, text });
          fullText += text;
        }
      }

      if (sMatches.length > 0) {
        for (let i = 0; i < sMatches.length; i++) {
          const curr = sMatches[i];
          const wStart = (pStartMs + curr.offsetMs) / 1000;
          const nextOffset = i < sMatches.length - 1 ? sMatches[i + 1].offsetMs : pDurMs;
          const wEnd = Math.max(wStart + 0.1, (pStartMs + nextOffset) / 1000);
          
          // 按空格拆分纯单词
          const cleanWord = curr.text.trim();
          if (cleanWord) {
            words.push({ word: cleanWord, start: wStart, end: wEnd });
          }
        }
      } else {
        fullText = decodeXmlEntities(innerContent);
      }

      if (fullText.trim()) {
        list.push({
          start: pStart,
          end: pEnd,
          text: fullText.trim(),
          words: words.length > 0 ? words : undefined,
        });
      }
    }

    // 针对缺少 <s> 标签的字幕自动进行音节/字符线性插值
    for (const item of list) {
      if (!item.words || item.words.length === 0) {
        item.words = interpolateWords(item.text, item.start, item.end);
      }
    }

    return list;
  };

  const enItems = parseItems(enXml);
  const zhItems = parseItems(zhXml);

  return enItems.map((item, idx) => {
    const zhItem = zhItems[idx] || zhItems.find((z) => Math.abs(z.start - item.start) < 0.8);
    return {
      id: idx + 1,
      start: item.start,
      end: item.end,
      en: item.text,
      zh: zhItem ? zhItem.text : '',
      words: item.words,
    };
  });
}

function interpolateWords(sentence: string, start: number, end: number): WordTiming[] {
  const rawTokens = sentence.split(/\s+/).filter(Boolean);
  if (rawTokens.length === 0) return [];
  const totalChars = rawTokens.reduce((acc, t) => acc + t.length, 0);
  const totalDuration = end - start;
  let currentStart = start;

  return rawTokens.map((token) => {
    const ratio = token.length / totalChars;
    const dur = Math.max(0.15, totalDuration * ratio);
    const wStart = currentStart;
    const wEnd = Math.min(end, currentStart + dur);
    currentStart = wEnd;
    return { word: token, start: wStart, end: wEnd };
  });
}
```

---

### 4.2 卡拉OK发音点亮组件 (`src/components/Transcript/ClickableWord.tsx`)

```tsx
// src/components/Transcript/ClickableWord.tsx
import React from 'react';
import type { WordTiming } from '../../types/subtitle';
import { openInEudic } from '../../services/eudicService';

interface ClickableWordProps {
  sentence: string;
  words?: WordTiming[];
  currentTime: number;
  isActiveSentence: boolean;
}

export default function ClickableWord({
  sentence,
  words,
  currentTime,
  isActiveSentence,
}: ClickableWordProps) {
  // 如果有精确定位的 words 数组且是当前激活句
  if (isActiveSentence && words && words.length > 0) {
    return (
      <span className="leading-relaxed inline-flex flex-wrap gap-x-1.5 gap-y-1">
        {words.map((w, index) => {
          const isCurrentlySpeaking = currentTime >= w.start && currentTime < w.end;
          const isSpoken = currentTime >= w.end;

          return (
            <span
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                openInEudic(w.word);
              }}
              className={`cursor-pointer rounded px-1 transition-all duration-75 select-none ${
                isCurrentlySpeaking
                  ? 'bg-amber-400 text-zinc-950 font-bold shadow-md scale-105 ring-2 ring-amber-300/50'
                  : isSpoken
                  ? 'text-white font-medium'
                  : 'text-zinc-400 hover:text-amber-300'
              }`}
              title="点击在 Mac 欧路词典中查看"
            >
              {w.word}
            </span>
          );
        })}
      </span>
    );
  }

  // 兜底分词渲染 (非激活句或常规状态)
  const tokens = sentence.split(/(\s+|[.,!?;:"()[\]{}]+)/);
  return (
    <span className="leading-relaxed">
      {tokens.map((token, index) => {
        const isWord = /[a-zA-Z0-9]/.test(token);
        if (!isWord) return <span key={index} className="text-zinc-500">{token}</span>;
        return (
          <span
            key={index}
            onClick={(e) => {
              e.stopPropagation();
              openInEudic(token);
            }}
            className="cursor-pointer rounded px-0.5 transition-colors duration-150 hover:bg-amber-400/20 hover:text-amber-300 active:bg-amber-400/40"
            title="点击在 Mac 欧路词典中查看"
          >
            {token}
          </span>
        );
      })}
    </span>
  );
}
```

---

### 4.3 个人视频书架组件 (`src/components/Bookshelf/BookshelfModal.tsx`)

```tsx
import React from 'react';
import { X, BookOpen, Clock, Trash2, Sparkles, Play } from 'lucide-react';
import type { BookshelfItem } from '../../types/bookshelf';

interface BookshelfModalProps {
  items: BookshelfItem[];
  currentVideoId?: string;
  onSelectVideo: (videoId: string, resumeTime: number) => void;
  onDeleteItem: (videoId: string) => void;
  onClose: () => void;
}

export default function BookshelfModal({
  items,
  currentVideoId,
  onSelectVideo,
  onDeleteItem,
  onClose,
}: BookshelfModalProps) {
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-semibold text-zinc-100">
              我的精读书架 ({items.length})
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-zinc-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
              <BookOpen className="w-12 h-12 mb-3 stroke-[1.5]" />
              <p className="text-sm">书架空空如也，在上方输入 YouTube 链接开始精听研读吧！</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((item) => {
                const isCurrent = item.videoId === currentVideoId;
                return (
                  <div
                    key={item.videoId}
                    onClick={() => {
                      onSelectVideo(item.videoId, item.lastPlayedTime);
                      onClose();
                    }}
                    className={`group relative bg-zinc-800/80 hover:bg-zinc-800 border rounded-xl overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-xl hover:border-amber-500/50 flex flex-col ${
                      isCurrent ? 'border-amber-500 ring-1 ring-amber-500/50' : 'border-zinc-700/60'
                    }`}
                  >
                    {/* 封面图 */}
                    <div className="relative aspect-video bg-black overflow-hidden">
                      <img
                        src={item.thumbnailUrl}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-amber-500 text-zinc-900 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                          <Play className="w-5 h-5 fill-current ml-0.5" />
                        </div>
                      </div>
                      {/* 进度条 */}
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/60">
                        <div
                          className="h-full bg-amber-400"
                          style={{ width: `${item.progressPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* 卡片详情 */}
                    <div className="p-3.5 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-zinc-200 line-clamp-2 leading-snug group-hover:text-amber-300 transition-colors">
                          {item.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-2 text-xs text-zinc-400">
                          <span>{item.sentenceCount} 句字幕</span>
                          {item.hasTranslation && (
                            <span className="flex items-center gap-0.5 text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">
                              <Sparkles className="w-3 h-3" /> 已精翻
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 底部续播信息与删除 */}
                      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-zinc-700/50 text-xs text-zinc-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-amber-400/80" />
                          上次看到: {formatTime(item.lastPlayedTime)} ({item.progressPercent}%)
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteItem(item.videoId);
                          }}
                          className="p-1 hover:text-red-400 transition-colors"
                          title="从书架移除"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

## 5. Agent 执行步骤分解清单 (Step-by-Step)

执行 Agent 需按以下顺序无偏差执行：

### 阶段 1：数据类型与存储扩展
1. 在 `src/types/subtitle.ts` 中增加 `WordTiming` 接口，在 `TranscriptSentence` 中加入 `words?: WordTiming[]`。
2. 创建 `src/types/bookshelf.ts`，定义 `BookshelfItem`。
3. 升级 `src/services/indexedDbService.ts`（数据库升至 `v2`），创建 `bookshelf_items` 对象仓库，实现书架读写与删除函数（`getBookshelfItems`, `saveBookshelfItem`, `deleteBookshelfItem`）。

### 阶段 2：Edge API 词级时间轴提取升级
1. 改造 `src/worker.ts` 中的 `parseAndMergeTimedText`，解析 `<p>` 内的 `<s>` 标签提取毫秒偏移量。
2. 编写 `interpolateWords` 作为无原生词级标签时的音节/字符线性插值兜底算法。

### 阶段 3：高频时钟与卡拉OK组件改造
1. 修改 `src/hooks/useYouTubePlayer.ts`，将轮询间隔优化至 `30ms`。
2. 改造 `src/components/Transcript/ClickableWord.tsx` 与 `TranscriptItem.tsx`，传入 `currentTime` 与 `words`，实现**当前发音词琥珀金放大高亮、已读词纯白、未读词浅灰**的三态渲染。
3. 保持 Mac 欧路词典查词事件冒泡拦截。

### 阶段 4：书架组件与断点记忆逻辑
1. 创建 `src/components/Bookshelf/BookshelfModal.tsx`。
2. 在 `src/components/Header.tsx` 中增加 `📚 书架 (${count})` 按钮。
3. 在 `src/App.tsx` 中集成书架与断点记忆调度：
   - 视频播放时定时记录 `lastPlayedTime` 与 `lastSentenceIndex` 并写回 IndexedDB 书架。
   - 点击书架书籍时，自动加载缓存双语字幕并跳转至 `lastPlayedTime`，平滑滚动至对应句子。

### 阶段 5：验证与构建
1. 运行 `npm run build`，确保 TypeScript 检查 100% 通过无任何类型报错。
2. 验证：
   - 打开长视频，观察发音是否严丝合缝逐词点亮跳动。
   - 播放至视频中间某一句后关闭网页或刷新。
   - 打开书架，点击该视频，验证是否瞬间秒开、0 Token 消耗，且播放器和字幕完美恢复在上次中断的位置。

---

## 6. 验收标准与质检清单 (QA Checklist)

- [ ] **卡拉OK同步**：当前发音单词是否与嘉宾声音同步放大并高亮为琥珀金色。
- [ ] **词典兼容**：逐词跳动时，点击任意单词能否正常调起 Mac 欧路词典。
- [ ] **书架封面与进度**：书架卡片是否正确展示 YouTube 缩略图与已看百分比。
- [ ] **断点续播**：从书架打开视频是否能精确跳转至上次播放的秒数与句子。
- [ ] **零费用秒开**：书架打开已翻译视频是否 0 请求 DeepSeek API、0 延迟瞬间呈现双语。
- [ ] **代码构建**：`tsc -b && vite build` 0 错误。

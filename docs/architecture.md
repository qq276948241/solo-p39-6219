# 记忆翻牌小游戏 - 架构文档

## 一、项目整体架构

### 1.1 目录结构

```
project39/
├── docs/
│   └── architecture.md              # 本文档
├── public/                          # 前端静态资源（由 Express 托管）
│   ├── index.html                   # 页面结构
│   ├── style.css                    # 样式（3D翻牌动画、发光效果、响应式）
│   └── game.js                      # 游戏核心逻辑（GameManager 类）
├── api/
│   └── data/
│       └── leaderboard.json         # 排行榜持久化存储
├── server.js                        # Node.js 后端（Express + 文件系统）
├── package.json                     # 项目依赖（Express 4.18）
└── README.md
```

### 1.2 技术栈

| 层 | 技术 | 说明 |
|----|------|------|
| 后端 | Node.js + Express 4.18 | 提供静态文件服务和 REST API |
| 数据存储 | JSON 文件 | 排行榜数据持久化到 `api/data/leaderboard.json` |
| 前端 | 原生 HTML/CSS/JS | 无框架依赖，纯 DOM 操作 |
| 动画 | CSS 3D Transform | `rotateY()` 实现翻牌，`@keyframes` 实现发光/抖动 |
| 通信 | Fetch API | 前后端通过 REST JSON 交互 |

### 1.3 架构总览

```
┌─────────────────────────────────────────────────────────┐
│                        Browser                           │
│  ┌──────────────┐    ┌──────────────────────────────┐   │
│  │  index.html  │───▶│     GameManager Class        │   │
│  │  style.css   │    │  (全部游戏状态+逻辑封装)      │   │
│  └──────────────┘    └──────────────┬───────────────┘   │
│                                     │                   │
│                          GET/POST /api/leaderboard       │
└─────────────────────────────────────┼───────────────────┘
                                      │ HTTP
┌─────────────────────────────────────┼───────────────────┐
│               Node.js               │                   │
│  ┌──────────────────────────────────▼───────────────┐   │
│  │                Express App                       │   │
│  │  GET  /api/leaderboard  →  readLeaderboard()     │   │
│  │  POST /api/leaderboard  →  writeLeaderboard()    │   │
│  └───────────────────┬──────────────────────────────┘   │
│                      │  fs.readFile / fs.writeFile      │
│  ┌───────────────────▼──────────────────────────────┐   │
│  │         api/data/leaderboard.json                │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## 二、前端游戏状态流转

游戏状态机由 `GameManager` 类统一管理，核心状态保存在实例属性中。

### 2.1 核心状态字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `difficulty` | `'easy' \| 'normal' \| 'hard' \| null` | 当前难度，难度选择界面为 null |
| `cards` | `string[]` | 随机打乱后的 emoji 数组（每个出现两次） |
| `flippedCards` | `HTMLElement[]` | 当前翻开等待配对的 0~2 张牌 |
| `matchedPairs` | `number` | 已成功配对的对数 |
| `steps` | `number` | 翻牌步数（每翻两张算一步） |
| `timeElapsed` | `number` | 游戏用时（秒） |
| `gameStarted` | `boolean` | 倒计时结束、正式开始翻牌标志 |
| `canFlip` | `boolean` | 当前是否允许翻牌（用于防抖） |
| `gameEnded` | `boolean` | 是否通关 |

### 2.2 状态流转主线

```
          ┌─────────────────────┐
          │   showDifficultySelect()
          │  难度选择界面（null）│
          └──────────┬──────────┘
                     │ 用户点击难度按钮
                     ▼
          ┌─────────────────────┐
          │     startGame()     │
          │  生成棋盘、所有牌正面朝上
          └──────────┬──────────┘
                     │
                     ▼
          ┌─────────────────────┐
          │   startCountdown()  │────┐
          │  显示"2→1→0"倒计时 │    │ setInterval
          └──────────┬──────────┘    │ 每秒 -1
                     │ 倒计时结束     │
                     ▼                ▼
          ┌─────────────────────┐   clearInterval
          │    flipAllDown()    │
          │  0.6s 动画全部翻背面
          └──────────┬──────────┘
                     │ setTimeout 0.6s
                     ▼
          ┌─────────────────────┐
          │    startTimer()     │◀───────────────────┐
          │  开始计时 1s 递增   │                    │
          │  canFlip = true     │                    │
          └──────────┬──────────┘                    │
                     │ 用户点击卡牌                   │
                     ▼                               │
          ┌─────────────────────┐                    │
          │   handleCardClick() │                    │
          │  翻开第 1/2 张牌     │                    │
          └──────────┬──────────┘                    │
                     │ 已翻开 2 张                    │
                     ▼                               │
          ┌─────────────────────┐                    │
          │    checkMatch()     │                    │
          └──────┬──────────┬───┘                    │
                 │ 配对成功  │ 配对失败              │
                 ▼          ▼                        │
      ┌──────────────┐  ┌──────────────┐            │
      │  加发光特效  │  │  抖动动画    │            │
      │ matchedPairs │  │  1s 后翻回   │            │
      │    +1        │  │              │            │
      └──────┬───────┘  └──────┬───────┘            │
             │                 │                    │
             └────────┬────────┘                    │
                      ▼                             │
         ┌──────────────────────┐                   │
         │ matchedPairs === ?   │                   │
         │ DIFFICULTY_CONFIG[*] │                   │
         │       .pairs         │                   │
         └──┬───────────────┬───┘                   │
            │ 未通关        │ 已通关                 │
            ▼               ▼                        │
    ┌──────────────┐  ┌──────────────┐               │
    │ canFlip=true │  │  endGame()   │               │
    │ 继续翻牌     │  │ stopAllTimers│               │
    └──────────────┘  │ showResult() │               │
                      └──────┬───────┘               │
                             │ 用户点击按钮            │
                             ▼                        │
                  ┌───────────────────────┐          │
                  │ playAgainBtn          │          │
                  │   → startGame()重新开始├──────────┘
                  │ changeDifficultyBtn   │
                  │   → showDifficultySelect()
                  │ submitScoreBtn        │
                  │   → POST /api/leaderboard
                  └───────────────────────┘
```

### 2.3 关键时序细节

**开局亮牌阶段**：
1. `startGame()` 创建所有 `card.flipped`（正面朝上）的 DOM 节点
2. 同时调用 `startCountdown()` 显示 2 秒倒计时
3. 倒计时归零后 `flipAllDown()` 移除所有 `.flipped` 类，触发 0.6s CSS 3D 翻转动画
4. 动画结束（setTimeout 600ms）后 `canFlip=true`，允许玩家操作

**翻牌配对阶段**：
- 点击 `canFlip=false` 的牌直接忽略（防抖）
- 翻开第 1 张：直接加 `.flipped`，加入 `flippedCards`
- 翻开第 2 张：加 `.flipped`，`steps++`，`canFlip=false`（锁定），然后 `checkMatch()`
  - 成功：加 `.matched`（发光动画），清空 `flippedCards`，`canFlip=true`
  - 失败：加 `.shake`，1s 后移除 `.flipped .shake`，清空 `flippedCards`，`canFlip=true`

---

## 三、排行榜前后端交互

### 3.1 接口定义

#### `GET /api/leaderboard` — 获取排行榜

**响应**：
```json
[
  {
    "name": "测试防重复",
    "steps": 12,
    "time": 3,
    "date": "2026-06-23T15:51:54.174Z"
  }
]
```
数组按步数升序、步数相同按用时升序排列，最多 10 条。

#### `POST /api/leaderboard` — 提交成绩

**请求体**：
```json
{ "name": "玩家昵称", "steps": 12, "time": 45 }
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | ✅ | 昵称，前端限制最大 10 字符 |
| `steps` | number | ✅ | 步数（整数） |
| `time` | number | ✅ | 用时秒数（整数） |

**响应**：返回更新后的排行榜（同 GET 格式）。

### 3.2 前端调用流程

```
GameManager.handleSubmitScore()
        │
        │ 1. 防重：isSubmitting=true，按钮 disabled
        │ 2. 校验：name.trim() 非空
        │
        ▼
 fetch('/api/leaderboard', { method: 'POST', body: {name, steps, time} })
        │
        │ 3. await 响应
        │
        ▼
 renderLeaderboard(data) ──▶ 更新右侧排行榜 DOM
        │
        │ 4. finally：isSubmitting=false，按钮恢复
        ▼
 hideResult() ──▶ 关闭结算弹窗
```

### 3.3 后端 JSON 读写逻辑

后端核心在 [server.js](file:///d:/code/ai-prompt/solo-chrome-dev-F12/repos/repo39/project39/server.js)：

```
HTTP 请求到达
    │
    ▼
 ensureDataDir() ──▶ 检查 api/data/ 目录和 leaderboard.json 是否存在
    │                    不存在则创建目录 + 写入空数组 []
    ▼
 readLeaderboard() ──▶ fs.readFileSync(DATA_FILE) → JSON.parse
    │                    异常容错：解析失败返回 []
    │
    ├── GET 请求：直接 res.json(leaderboard)
    │
    └── POST 请求：
         │
         1. 参数校验，缺失返回 400
         2. leaderboard.push({name, steps: parseInt, time: parseInt, date: ISOString})
         3. 排序：a.steps - b.steps || a.time - b.time
         4. 截取前 10 条：top10 = leaderboard.slice(0, 10)
         5. writeLeaderboard(top10) ──▶ fs.writeFileSync(JSON.stringify(data, null, 2))
         6. res.json(top10)
```

**文件格式**（[leaderboard.json](file:///d:/code/ai-prompt/solo-chrome-dev-F12/repos/repo39/project39/api/data/leaderboard.json)）：
```json
[
  {
    "name": "测试防重复",
    "steps": 12,
    "time": 3,
    "date": "2026-06-23T15:51:54.174Z"
  }
]
```

---

## 四、GameManager 类核心方法与职责

完整实现位于 [game.js](file:///d:/code/ai-prompt/solo-chrome-dev-F12/repos/repo39/project39/public/game.js)。

### 4.1 构造与初始化

| 方法 | 职责 |
|------|------|
| `constructor()` | 初始化所有状态为默认值；收集所有 DOM 元素引用到 `this.elements`；调用 `bindEvents()` 绑定事件 |
| `bindEvents()` | 绑定全局按钮事件（难度按钮、重新开始、再来一局、更换难度、提交、Enter 键提交）。**只在构造时执行一次**，不会重复绑定 |

### 4.2 工具方法（static）

| 方法 | 职责 |
|------|------|
| `static shuffle(array)` | Fisher-Yates 洗牌算法，用于随机打乱 emoji 和卡片顺序 |
| `static formatTime(seconds)` | 秒数格式化为 `MM:SS` 字符串（补零） |
| `static escapeHtml(text)` | XSS 防护，将用户昵称转义为安全 HTML |

### 4.3 游戏流程控制

| 方法 | 职责 |
|------|------|
| `showDifficultySelect()` | 清除所有定时器 → 显示难度弹窗 → 清空棋盘 → `difficulty=null` |
| `startGame(difficulty)` | 主入口：保存难度 → `resetState()` → 生成棋盘 DOM（`card.flipped` 正面朝上） → 隐藏难度弹窗 → `startCountdown()` |
| `resetState()` | 重置翻牌状态、步数、用时、标志位为初始值，同步更新 DOM 显示 |
| `startCountdown()` | 先 `stopAllTimers()` 清除残留 → 显示"2→1→0"倒计时 → 结束后 `flipAllDown()` |
| `flipAllDown()` | 移除所有 `.flipped` 类触发翻转动画 → 600ms 后 `canFlip=true` 并 `startTimer()` |
| `endGame()` | `gameEnded=true` → `stopAllTimers()` → `showResult()` |

### 4.4 定时器管理

| 方法/字段 | 职责 |
|-----------|------|
| `this.timerInterval` | 游戏主计时器 `setInterval` id |
| `this.countdownInterval` | 开局倒计时 `setInterval` id |
| `this.flipTimeout` | `flipAllDown()` 中 0.6s 翻牌动画等待 `setTimeout` id |
| `this.matchTimeout` | 配对失败后 1s 抖动翻回 `setTimeout` id |
| `startTimer()` | 先 `stopAllTimers()` → 创建 1s 递增计时器，更新 `#timer` DOM |
| `stopAllTimers()` | **统一清除所有 4 个定时器**，并将引用置为 null。核心防御：任何重开/结束前必须调用 |

### 4.5 游戏核心逻辑

| 方法 | 职责 |
|------|------|
| `getEmojisForDifficulty(difficulty)` | 从 `EMOJI_POOL`（32个）中随机抽取 `DIFFICULTY_CONFIG[diff].pairs` 个 emoji |
| `calculateRating(steps, difficulty)` | 根据难度动态计算评级：≤S级阈值→S，≤A级→A，≤B级→B，否则C |
| `handleCardClick(card)` | 点击卡牌入口：4 层守卫（`canFlip` / `gameEnded` / 已翻开 / 已配对 / 超过2张）→ 翻牌 → 2张时计步并 `checkMatch()` |
| `checkMatch()` | 比较两张牌的 `dataset.emoji`：<br>✅ 成功 → 加 `.matched` 发光，`matchedPairs++`，检查通关<br>❌ 失败 → 加 `.shake`，1s 后翻回 |

### 4.6 UI 交互

| 方法 | 职责 |
|------|------|
| `showResult()` | 计算评级 → 填充难度标签、评级、步数、用时 → 显示结算弹窗 → 清空昵称输入框 |
| `hideResult()` | 隐藏结算弹窗 |
| `handleRestart()` | `stopAllTimers()` → 有难度则 `startGame(当前难度)`，否则 `showDifficultySelect()` |
| `handlePlayAgain()` | 再来一局：同难度 `startGame()` |
| `handleChangeDifficulty()` | 更换难度：返回 `showDifficultySelect()` |
| `handleSubmitScore()` | 提交成绩：`isSubmitting` 防重锁 → 校验昵称 → `fetch POST` → 更新排行榜 → 关闭弹窗 → `finally` 释放锁 |

### 4.7 排行榜

| 方法 | 职责 |
|------|------|
| `loadLeaderboard()` | 页面加载时 `GET /api/leaderboard` → `renderLeaderboard()` |
| `renderLeaderboard(data)` | 渲染右侧排行榜 DOM，前三名有金银铜渐变样式，XSS 转义昵称 |

---

## 五、难度配置

所有难度参数集中在 `DIFFICULTY_CONFIG`，修改配置即可调整游戏平衡：

| 难度 | 棋盘 | 对数 | S级 | A级 | B级 |
|------|------|------|-----|-----|-----|
| easy | 4×4 | 8 | ≤10 步 | ≤14 步 | ≤20 步 |
| normal | 6×6 | 18 | ≤24 步 | ≤32 步 | ≤44 步 |
| hard | 8×8 | 32 | ≤44 步 | ≤58 步 | ≤80 步 |

CSS 中对应的网格和字体大小也按 `size-4 / size-6 / size-8` 分档，在 [style.css](file:///d:/code/ai-prompt/solo-chrome-dev-F12/repos/repo39/project39/public/style.css) 中响应式调整。

---

## 六、维护注意事项

1. **定时器泄漏**：新增 `setTimeout` / `setInterval` 时，必须：
   - 将 id 保存为实例属性（如 `this.xxxTimeout`）
   - 在 `stopAllTimers()` 中加上对应的清除逻辑
   - 启动前调用 `stopAllTimers()` 防止叠加

2. **事件重复绑定**：`bindEvents()` 只在构造函数执行一次。如果后续需要动态创建带事件的 DOM（如卡片），事件回调直接在创建时绑定（如 `card.addEventListener`），因为 DOM 会被 `innerHTML=''` 清除，不会泄漏。

3. **防重复提交**：异步操作前检查 `this.isSubmitting`，完成后在 `finally` 中释放。按钮 `disabled` 是给用户的视觉反馈。

4. **排行榜数据兼容**：新增字段时旧数据可能缺失，后端 `parseInt` 和前端渲染都需要容错。

5. **emoji 池扩展**：`EMOJI_POOL` 至少 32 个（困难模式需要），新增 emoji 直接 push 即可，`getEmojisForDifficulty()` 会随机抽取。

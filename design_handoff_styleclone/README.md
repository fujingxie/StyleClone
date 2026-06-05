# Handoff: StyleClone · 主播分身（直播台词生成工具）

## Overview
StyleClone 是一个面向直播带货团队的 **B 端桌面 Web 工具**。运营把某位主播的历史「直播稿」上传进来，系统训练出一个"分身"，之后即可用该主播本人的口吻、节奏和高频话术，自动生成从**开场 → 卖点 → 互动 → 异议处理 → 逼单**的整套带货台词。本次交接覆盖该工具的 **设计系统（样式规范 + 组件库）+ 主工作台 6 个页面状态 + 4 个弹窗/抽屉**。

产品调性：clean modern · tool-like · 浅色主题。动效严格克制——只保留三类：流式打字光标、自动化运行的橙色脉冲点、120ms 悬停过渡。

---

## About the Design Files
本包内的 HTML/JSX 文件是用 **HTML + React(Babel inline)** 做的**设计参考稿**——它们表达的是**最终外观与交互意图**，不是可以直接搬进生产环境的代码。

任务是：**在目标代码库的既有技术栈里（React / Vue / SwiftUI / 原生等）按这些设计稿重新实现 UI**，复用代码库已有的组件库、主题与工程规范。如果目标项目还没有前端环境，则自行选择最合适的框架来实现。

> 不要直接打包发布这些 HTML 文件。它们是"长什么样、怎么动"的高保真说明书。

设计稿的呈现方式：所有页面铺在一张可缩放的 **设计画布（design canvas）** 上，分 4 个区（样式规范 / 组件库 / 主工作台 6 状态 / 弹窗 4 个）。画布本身（平移缩放、聚焦放大）只是查看工具，**不属于要实现的产品**。

---

## Fidelity
**高保真（hi-fi）。** 所有颜色、字阶、间距、圆角、阴影、各组件的悬停/按下/聚焦/禁用/加载状态都已最终确定（见下方 Design Tokens 与 Components）。请按像素级还原，但用目标代码库已有的组件与样式体系来实现。

交互保真度为**静态稿**：每个状态是一张独立的图，状态之间的跳转逻辑见 "Interactions & Behavior" 与 "State Management"，需开发者据此串联。

---

## 产品信息架构 / 整体布局
桌面应用，单窗口，设计基准尺寸 **1180 × 800**（实现时整体自适应铺满视口；左栏定宽，主列弹性）。

```
┌────────────┬──────────────────────────────────────────┐
│            │  CharacterHeader  (高 56)                 │
│  LeftRail  ├──────────────────────────────────────────┤
│  (定宽240) │                                          │
│            │  消息流区 / 空态 / 训练态                 │
│  角色列表  │  (flex:1, 背景 #F8FAFC, 内部居中 max760)  │
│            │                                          │
│            ├──────────────────────────────────────────┤
│  [设置]    │  InputBar  (底栏, padding 16/24/20)       │
└────────────┴──────────────────────────────────────────┘
```

- **LeftRail**：宽 `240px` 定宽，白底，右侧 `1px #E2E8F0` 分隔。顶部 16px padding 内放整宽「+ 新建角色」主按钮；中部角色列表；底部分隔线上方放「⚙ 设置」ghost 按钮（左对齐、整宽）。
- **主列 MainCol**：`flex:1`，纵向 flex。顶部可选 CharacterHeader；中部消息流区（`flex:1`，相对定位，背景 `#F8FAFC`，内容用 `max-width:760px; margin:0 auto` 居中）；底部可选 InputBar。
- 空态（无 header 场景）下消息流区背景用白色 `#FFFFFF`，内容用 `.empty` 垂直居中。

---

## Screens / Views（主工作台 6 状态）

> 通用：左栏始终在场。下方只描述每个状态的差异点。所有状态选中的角色都是「珠宝主播·小雅」（紫色头像，字「雅」，类目标签=珠宝）。

### ① 空状态 · 无角色
- **Purpose**：首次进入、尚无任何角色时的引导。
- **LeftRail**：角色列表为空——居中显示 caption 文案「还没有角色 / 点上方按钮创建第一个」（`color:#94A3B8`，12px，行高1.6）。「+ 新建角色」按钮仍在顶部。
- **主列**：无 header、无 InputBar，背景白色。`.empty` 居中：
  - 圆角方形插画块 `112×112, radius 28, 背景#EEF2FF, 图标primary色 sparkle`
  - 标题「先创建一个角色」（20/600）
  - 说明「上传 TA 的直播稿，几分钟后即可让分身用 TA 的口吻生成带货台词。」（`#475569`, 14, 行高1.7, max-width 320）
  - 主按钮「+ 新建角色」（40 高，padding 0 20）

### ② 训练中 · 解析分阶段
- **Purpose**：上传素材后，系统正在训练该角色。
- **Header**：状态药丸「● 训练中 · 抽风格 3/4」（琥珀点 `#D97706`，文字 `#475569`），右侧放 ghost「⚙ 设置」。
- **主列**：居中一张卡片（`max-width 460, 白底, 1px边框, radius14, padding24, shadow-sm`）：
  - 区块标题「正在训练「珠宝主播·小雅」」（16/600）
  - caption「已解析 珠宝主播直播稿.txt · 约 4.2 万字」
  - 进度条 `62%`（高6，radius999，槽`#F1F5F9`，填充primary）+ 下方「整体进度 / 62%」
  - 分阶段列表（stage-list）：切片 ✓done、向量化 ✓done、抽风格 ◌active(转圈)、抽范本 ④todo
- **InputBar**：禁用态，placeholder「训练中，暂不可输入…」，背景 `#F8FAFC`。

### ③ 就绪 · 对话空
- **Purpose**：角色训练完成，等待第一次提问。
- **Header**：状态药丸「● 已就绪」（绿点 `#16A34A`），右侧放 **AutoToggle idle**（橙色实底「✦ 开始自动化」）。
- **主列**：`.empty` 居中：sparkle 插画块 + 标题「小雅已就绪，问点什么试试」+ 说明 + 一排**建议气泡**（pill：高34, radius999, 1px边框, 白底, 13px, `#475569`）：「✦ 这条珍珠项链怎么开场」「讲讲 18K 金的卖点」「有人嫌贵怎么回」「来一段逼单话术」。
- **InputBar**：默认态。

### ④ 对话流式生成
- **Purpose**：用户提问后，分身逐字流式回复并产出自动台词。
- **Header**：同 ③（已就绪 + 开始自动化）。
- **消息流**（max760 居中）：
  1. 用户气泡（右对齐，`#EEF2FF` 底，右下角 radius 4）：「这条 18K 金珍珠项链怎么介绍给新进直播间的家人？」
  2. 角色气泡（左对齐，白底1px边框，左下角 radius4）：正文 + 悬停浮现复制按钮
  3. 自动台词卡（`.bubble.auto`：白底，顶部有 head 条= kind标签「卖点」+「自动台词」caption + 复制按钮；body 为台词正文）
  4. 角色气泡，**流式中**（末尾带 typing 光标 `caret`，无标点结尾）
- **InputBar**：聚焦态（primary 色边框 + focus ring + caret），发送按钮变 primary。

### ⑤ 自动化运行中
- **Purpose**：开启自动化后，系统按直播节奏连续吐台词。
- **Header**：状态药丸「● 自动化运行中」（橙点+橙字 `#EA580C`），右侧 **AutoToggle running**（白底、橙描边 `#FED7AA`、左侧橙色脉冲点、文字「停止自动化」）。
- **消息流**：顶部居中一个运行标记药丸「● 自动化运行中 · 已生成 7 条」（橙系），下方连续 4 张自动台词卡，kind 依次为 **开场 / 卖点 / 互动 / 逼单**（台词文案见源码 sec-screens.jsx Screen5）。
- **InputBar**：禁用态，placeholder「自动化进行中，正在按节奏生成台词…」。

### ⑥ 训练失败
- **Purpose**：训练中断的错误态。
- **Header**：状态药丸「● 训练失败」（红点 `#DC2626`），右侧 secondary「↻ 重试训练」。
- **主列**：`.empty` 居中：红色插画块（`背景#FEE2E2, 色#DC2626, alert 图标`）+ 标题「训练失败」+ 说明「素材在「抽风格」阶段中断——可能是直播稿内容过短或格式异常。可重新上传更完整的直播稿后重试。」+ 一排按钮「↑ 重新上传」(secondary)、「↻ 重试训练」(primary) + 错误码 caption「错误码 STYLE_EXTRACT_TIMEOUT · 14:32」(`#94A3B8`)。
- **InputBar**：禁用态。

---

## Modals / Drawers（4 个弹窗）

> 通用：弹窗叠在变暗的「就绪态外壳」之上。遮罩 `rgba(15,23,42,.45)`。居中弹窗用 `.modal`（白底，radius 14，shadow `0 24px 64px rgba(15,23,42,.28)`）；右侧抽屉用 `.drawer`（贴右，全高，shadow `-8px 0 24px rgba(15,23,42,.08)`）。每个弹窗右上角有关闭 ✕ 按钮。

### ① 新建角色（居中弹窗，宽 500）
- 标题「新建角色」(18/600) + 副标题「给分身起个名字，选好类目，上传 TA 的直播稿」
- 表单：
  - 「角色名称」文本框（高38），值「珠宝主播·小雅」
  - 「类目」分段选择器（seg）：珠宝(选中,primary系)/生鲜/团购/其他
  - 「直播稿素材」dropzone（虚线框 `1.5px dashed #CBD5E1`，背景 `#FCFDFE`，圆形上传图标块，「拖入文件，或 选择文件」+ caption「支持 .txt / .md · 也可直接粘贴文本」）
- 底部：ghost「取消」+ primary「✦ 创建并训练」

### ② 风格设置（右侧抽屉，宽 440）
- 抽屉头：标题「风格设置」+ 副「珠宝主播·小雅」+ ✕
- 表单：
  - 「风格强度」slider（值 4/5=75%，拖动态 thumb 带 focus ring）+ 两端标签「更自由发挥 / 更贴近原话」+ caption「当前 4/5 · 尽量复用 TA 的高频话术与口头禅」
  - 分隔线
  - 「单条长度偏好」seg：精简 / 适中(选中) / 详尽
  - 「口头禅 / 必带词」textarea，内容「家人们、扣个 1、压得住场、骨折价」+ caption「逗号分隔，生成时会自然融入」
  - 「规避词」textarea（placeholder「例如：最便宜、全网最低…（违规词不会出现）」）
- 底部：ghost「恢复默认」+ primary「保存设置」

### ③ 上传素材（居中弹窗，宽 520）
- 标题「上传素材」+ 副「为小雅补充更多直播稿，提升话术覆盖面」
- dropzone **拖拽悬停态**（primary 边框 + `#EEF2FF` 底，「松手即可上传」+ 文件名）
- 已选文件行（1px 边框 radius10：文件图标 + 文件名 +「3.8 万字 · 解析中」+ 右侧转圈 spinner）
- 分阶段列表：切片 ✓done、向量化 ◌active、抽风格 ③todo、抽范本 ④todo
- 底部：ghost「取消」+ primary 禁用态「解析中…」

### ④ 删除角色确认（居中弹窗，宽 420，危险态）
- 无标准 head；body 内：左侧红色方块图标（`40×40 radius10 背景#FEE2E2 色#DC2626 alert`）+ 右侧标题「删除角色「珠宝主播·小雅」？」(17/600) + 说明「删除后该角色的训练结果与全部对话记录将一并清除，且无法恢复。」
- 底部：ghost「取消」+ **danger**「删除角色」

---

## Interactions & Behavior

- **流式打字**：角色气泡/自动台词在生成时，文末显示闪烁竖线光标（`caret`，2px 宽，primary 色，`@keyframes` 1s steps(1) 闪烁）。生成完毕光标消失。
- **自动化脉冲**：AutoToggle running 态左侧的橙点有向外扩散的脉冲环（`scale(1)→scale(2.6)`，opacity `.6→0`，1s ease-out infinite）。
- **悬停过渡**：所有按钮/可点项统一 `transition: …120ms ease`。角色气泡悬停时右上角浮现复制按钮。
- **复制**：点段内复制按钮 → toast「已复制到剪贴板」（info 蓝）。
- **导航/跳转流**：
  - 空态 ① →（新建角色弹窗 M1）→ 提交 → 进入训练中 ②
  - 训练中 ② → 成功 → 就绪 ③；失败 → ⑥
  - 就绪 ③ → 提问 → 对话流式 ④
  - ③/④ → 点「开始自动化」→ 自动化运行中 ⑤；⑤ 点「停止自动化」→ 回到 ④/③
  - 角色 header / 右键菜单 → 删除确认 M4；设置 → 风格设置抽屉 M2；上传素材 → M3
- **Loading 态**：进度条（训练整体进度）、分阶段 stage-list（done/active/todo 三态）、消息骨架屏（shimmer 动画）。
- **减少动效**：实现时请遵守 `prefers-reduced-motion`，关闭脉冲与流式动画的循环。

---

## State Management
- `characters[]`：每个角色 `{ id, name, category(jewel|fresh|group|other), avatarColor, status }`；`status ∈ idle|training|ready|error`。
- `selectedCharacterId`：当前选中角色。
- `training`：`{ stage(切片|向量化|抽风格|抽范本), progress(0-100), fileName, wordCount }`。
- `autoRunning: boolean`：是否自动化运行中（决定 Header 的 AutoToggle 与 InputBar 是否禁用）。
- `messages[]`：`{ role(user|assistant|auto), kind?(open|sell|inter|obj|close), text, streaming?:boolean }`。
- `styleSettings`：`{ strength(1-5), length(精简|适中|详尽), mustWords[], avoidWords[] }`。
- `activeModal`：`null | newCharacter | styleSettings | upload | deleteConfirm`。
- 数据获取：训练进度与流式生成建议走 SSE / WebSocket（流式逐字推送）。

---

## Design Tokens

### 颜色
| Token | Hex | 用途 |
|---|---|---|
| primary | `#4F46E5` | 主按钮·选中·链接 |
| primary-hover | `#4338CA` | 主按钮悬停 |
| primary-light | `#EEF2FF` | 选中底·用户气泡·插画块 |
| accent | `#F97316` | 开始自动化·热度 |
| accent-hover | `#EA580C` | accent 悬停 |
| bg-page | `#FFFFFF` | 主背景 |
| bg-canvas | `#F8FAFC` | 消息流区底 |
| surface | `#FFFFFF` | 卡片/弹窗 |
| border | `#E2E8F0` | 边框·分隔线 |
| text-1 | `#0F172A` | 标题·正文 |
| text-2 | `#475569` | 辅助说明 |
| text-3 | `#94A3B8` | placeholder·禁用 |
| success | `#16A34A` | 就绪·完成 |
| warning | `#D97706` | 警告·训练中 |
| error | `#DC2626` | 错误·危险 |

**类目色（低饱和，badge）**：珠宝 底`#FCE7F3`/字`#BE185D`；生鲜 底`#DCFCE7`/字`#15803D`；团购 底`#FFEDD5`/字`#C2410C`；其他 底`#E2E8F0`/字`#475569`。

**kind 标签色**：开场 底`#EEF2FF`/字`#4F46E5`；卖点 底`#FEF3C7`/字`#B45309`；互动 底`#DCFCE7`/字`#15803D`；异议 底`#F3E8FF`/字`#7E22CE`；逼单 底`#FFE4E6`/字`#BE123C`。

### 字体
`-apple-system, "PingFang SC", "Microsoft YaHei", Inter, "Segoe UI", sans-serif`

### 字阶 Type Scale
| 名称 | size / weight / line-height |
|---|---|
| 页面标题 | 20 / 600 / 1.3 |
| 区块标题 | 16 / 600 / 1.3 |
| 对话气泡 | 15 / 400 / 1.6 |
| 正文 | 14 / 400 / 1.6 |
| 按钮文字 | 14 / 500 |
| 辅助 caption | 12 / 400 / 1.5（`#475569`） |

### 间距 Spacing（基数 4px）
`4 · 8 · 12 · 16 · 24 · 32`

### 圆角 Radius
`sm 6px` · `md 10px` · `lg 14px` · `full 999px`

### 阴影 Shadow
- sm：`0 1px 2px rgba(15,23,42,.06)`
- md：`0 4px 12px rgba(15,23,42,.08)`
- focus-ring：`0 0 0 3px rgba(79,70,229,.25)`
- modal：`0 24px 64px rgba(15,23,42,.28)`

### 组件关键尺寸
- 按钮高 36（弹窗内 38/40）；输入框高 38；slider 轨道高 4 / thumb 18；头像 40（header 内 32）；角色项 padding `10 12 10 16`；CharacterHeader 高 56；气泡 max-width 76%、padding `12 16`。
- 选中角色项左侧有 3px primary 色竖条（`radius 0 3 3 0`）。

---

## Assets
- **图标**：全部为内联 SVG（plus / gear / send / download / copy / check / upload / file / x / refresh / eye / alert / sparkle），1.4–1.7 描边、`currentColor`。见 `shared.jsx` 的 `I` 对象。实现时可替换为目标库（如 lucide / heroicons）的等价图标。
- **头像**：纯 CSS 渐变 + 单字，无图片资源。
- **无外部图片/字体依赖**——字体走系统字体栈。
- 无 Anthropic 品牌资产。若目标代码库已有自己的设计系统，请优先用其等价 token 与组件。

---

## Files（本包内文件，作为实现参考）
- `StyleClone 设计系统.html` — 主入口：把下列文件铺到设计画布上（画布仅查看用，非产品）。
- `tokens.css` — **所有设计 token + 组件样式**（最权威的样式来源，建议精读）。
- `shared.jsx` — 图标集 `I`、通用组件：`Btn / Badge / Kind / Avatar / CharItem / LeftRail`。
- `sec-styleguide.jsx` — 样式规范页（色板/字阶/圆角/间距/阴影展示）。
- `sec-components.jsx` — 组件库：每个组件 × 全部状态的静态枚举（**还原各交互态的最佳参照**）。
- `sec-screens.jsx` — 主工作台 6 个页面状态（Screen1–6）+ 外壳组件（Frame/Header/Footer/Flow/MainCol/气泡）。
- `sec-modals.jsx` — 4 个弹窗/抽屉（Modal1–4）。
- `design-canvas.jsx` — 设计画布脚手架（**查看工具，无需实现**）。

> 精读顺序建议：`tokens.css` → `shared.jsx` → `sec-components.jsx` → `sec-screens.jsx` / `sec-modals.jsx`。

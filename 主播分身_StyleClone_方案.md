# 主播分身 · StyleClone — 方案文档（v1 MVP）

> 一句话：上传某主播/类目的直播文本，几分钟"训练"出一个角色；既能像聊天一样问它问题（基于素材、带该主播口语风格回答），也能一键让它**持续滚动生成带货台词**。
>
> 形态：Web 工具，**单人自用、无账号体系**。技术核心：**角色画像 + 范本驱动的 RAG**（非模型微调）。

---

# 一、开发方案（交给 coding agent）

## 1. 技术选型（已拍板）

| 层 | 选型 | 理由 |
|---|---|---|
| 全栈框架 | **Next.js 14（App Router）+ TypeScript** | 单人自用，前后端一体，API Routes 省去独立后端，左列表/右对话的 UI 用 React 实现最快 |
| 样式/组件 | **Tailwind CSS + shadcn/ui** | 快速搭出克制的工具型界面，组件可控可改 |
| 生成模型 | **DeepSeek API（`deepseek-v4-flash`）** | 中文口语/带货话术强、价格极低（输出 $0.28/百万 token，固定前缀命中缓存后输入近乎免费）、OpenAI 兼容接口、支持流式与 JSON；适合高频滚动生成 |
| 向量化 | **Voyage AI（voyage-3.5）embeddings** | 多语言/中文检索质量高、托管免运维；单人用量在 2 亿 token 免费额度内 ≈ 0 元 |
| 向量库 | **LanceDB（嵌入式，文件存储）** | 单人数据量小，无需独立服务，零运维；将来多租户再迁 Qdrant |
| 结构化数据 | **SQLite + Prisma ORM** | 角色/素材/消息等结构化数据，文件落盘、零服务；将来可平滑迁 Postgres |
| 原始素材存储 | 本地文件系统 + SQLite 引用 | 自用，无需对象存储 |
| 部署 | **本地运行（Node + pm2），数据落本地磁盘** | 自动生成是长连接流式 + LanceDB/SQLite 需持久磁盘，**不适合 serverless**；自用本地跑最省事 |

> 说明：API Key（DeepSeek / Voyage）放本地 `.env`，并在界面提供一个轻量设置入口可改。

## 2. 系统架构（模块划分）

```
主播分身 StyleClone
├── 角色管理模块 Character        # 角色 CRUD、切换、元数据
├── 素材与训练模块 Ingestion      # 上传文本 → 切片 → 向量化入库 → 抽风格摘要 + 抽范本
├── 检索模块 Retrieval (RAG)      # query → embed → 向量检索 top-k 片段
├── 对话问答模块 Chat/QA          # 检索 + 组 prompt + DeepSeek 流式回答
├── 自动生成模块 AutoScript       # 滚动生成：上下文窗口 + 话术类型轮转 + start/stop
├── 风格校准模块 Calibration      # 生成样例、调风格强度、补范本
└── 通用 UI 模块                  # 复制/导出、空/加载/错误态、Toast
```

**训练的核心理念（务实点）**：不做模型微调。"训练"= ①素材切片入向量库；②让 DeepSeek 生成一段**简短风格摘要** + 抽 **10~20 条最典型原话当"范本库"**。生成时：风格摘要进 system prompt，范本 + 检索片段作为 few-shot 示例。**风格"像不像"主要靠范本示例，而非抽象描述。**

## 3. 数据模型（核心表 / 实体）

| 表 | 关键字段 | 关系 |
|---|---|---|
| `Character` | id, name, category(珠宝/生鲜/团购…), type(主播), style_summary(text), status(training/ready/error), created_at | 1—N → Material / Chunk / Exemplar / Conversation |
| `Material` | id, character_id(FK), filename, raw_text, uploaded_at | 属于 Character |
| `Chunk` | id, character_id(FK), material_id(FK), content, lance_id(对应向量库), token_count | 属于 Material；向量存 LanceDB |
| `Exemplar`（范本） | id, character_id(FK), content, kind(开场/卖点/互动/异议/逼单/通用), source_material_id | 属于 Character |
| `Conversation` | id, character_id(FK), started_at | 1—N → Message |
| `Message` | id, conversation_id(FK), role(user/assistant), content, mode(qa/auto), created_at | 属于 Conversation |

**LanceDB 向量表** `vectors`：`{ id, character_id, chunk_id, vector, content }`，检索时按 `character_id` 过滤，保证角色间隔离。

## 4. 接口设计（关键 API）

| 方法 | 路径 | 入参 | 出参 |
|---|---|---|---|
| POST | `/api/characters` | `{name, category, type}` | `{id, name, category, status}` |
| GET | `/api/characters` | — | `Character[]` |
| DELETE | `/api/characters/:id` | — | `{ok}` |
| POST | `/api/characters/:id/materials` | `{text}` 或文件上传 | `{materialId, status:'training'}`（触发训练） |
| GET | `/api/characters/:id/training-status` | — | `{status, progress, stage:'切片/向量化/抽风格/抽范本'}` |
| POST | `/api/characters/:id/chat` | `{message}` | **SSE 流式** assistant 文本 |
| POST | `/api/characters/:id/auto/start` | `{}`（无需商品入参，角色自带类目素材） | **SSE 流式** 持续滚动台词，每段带 `kind` |
| POST | `/api/characters/:id/auto/stop` | — | `{ok}` |
| GET | `/api/characters/:id/messages` | `?mode=qa\|auto` | `Message[]` |
| POST | `/api/characters/:id/calibrate` | `{style_strength, extra_exemplars?}` | 流式样例文本 |
| GET | `/api/characters/:id/export` | `?mode=auto` | `{text}`（拼接台词，供复制/下载） |

## 5. 建议目录结构

```
styleclone/
├── app/
│   ├── page.tsx                 # 主工作台（唯一一级页面）
│   └── api/
│       └── characters/
│           ├── route.ts                 # GET/POST 角色
│           └── [id]/
│               ├── route.ts             # DELETE
│               ├── materials/route.ts   # 上传+触发训练
│               ├── training-status/route.ts
│               ├── chat/route.ts        # SSE 问答
│               ├── auto/start/route.ts  # SSE 自动生成
│               ├── auto/stop/route.ts
│               ├── messages/route.ts
│               ├── calibrate/route.ts
│               └── export/route.ts
├── lib/
│   ├── llm.ts          # DeepSeek 封装（OpenAI 兼容，流式）
│   ├── embed.ts        # Voyage 向量化
│   ├── vector.ts       # LanceDB 读写/检索
│   ├── training.ts     # 切片 + 抽风格摘要 + 抽范本
│   ├── retrieval.ts    # query→embed→search
│   ├── prompt.ts       # 组装 system + few-shot 范本
│   └── autoscript.ts   # 滚动生成：上下文窗口 + 类型轮转
├── components/
│   ├── CharacterList.tsx / CharacterItem.tsx
│   ├── ChatPanel.tsx / MessageBubble.tsx
│   ├── InputBar.tsx / AutoToggle.tsx
│   ├── NewCharacterModal.tsx / UploadDrawer.tsx / CalibrateModal.tsx
│   └── ui/ (shadcn)
├── prisma/schema.prisma
├── data/ (sqlite + lancedb 文件)
└── .env
```

## 6. 开发任务拆解（按依赖顺序，每个适合一次提交）

1. **T1 脚手架**：Next.js+TS+Tailwind+shadcn 初始化；Prisma+SQLite schema（建表）；`.env` 与 LLM/Voyage/LanceDB 客户端封装。
2. **T2 角色 CRUD**：`/api/characters` 增删查 + 左栏列表 UI + 新建角色弹窗（名称/类目/类型）。
3. **T3 素材上传 + 训练（入库）**：上传文本 → 切片 → Voyage 向量化 → 写入 LanceDB 与 Chunk 表；返回训练状态。
4. **T4 风格摘要 + 范本抽取**：调用 DeepSeek 生成 `style_summary` 并抽 10~20 条 `Exemplar`（带 kind 标签）。
5. **T5 检索模块**：query → embed → LanceDB 按 character_id 过滤检索 top-k。
6. **T6 问答对话**：检索 + `prompt.ts` 组 system+few-shot → DeepSeek 流式 → 右区流式渲染气泡。
7. **T7 自动滚动生成**：`autoscript.ts` 实现「上下文窗口（带前 2~3 段）+ 话术类型轮转（开场→卖点→互动→逼单循环）」；start/stop 控制；SSE 持续追加。
8. **T8 复制/导出**：每段台词悬停复制；整段导出（复制到剪贴板 + 下载 .txt）。
9. **T9 风格校准**：训练完弹出样例 + 风格强度滑块 + 补范本 + 重新生成。
10. **T10 打磨**：空态/加载/错误态、训练进度、Toast、窄屏左栏收起。

---

# 二、设计方案（交给 UI 设计 agent）

## 1. 整体设计风格

**简洁现代 · 专业工具感（clean modern, tool-like）。** 这是一个 B 端生产力工具，信息密度中等，视觉气质要"克制、专注内容、可信赖"——参考调性接近 Linear / Notion / 现代 AI 对话工具的冷静感，用一点暖色点缀呼应"直播带货"的热度。MVP 使用浅色主题。

## 2. 设计变量（Design Tokens）

**配色（HEX）**
- 主色 primary：`#4F46E5`（靛蓝，专业可信）；hover `#4338CA`；浅底 `#EEF2FF`
- 辅助/强调 accent：`#F97316`（橙，用于"开始自动化"等高能动作）；hover `#EA580C`
- 中性·背景：页面 `#FFFFFF`；画布/次级 `#F8FAFC`
- 中性·表面/边框：面板 `#FFFFFF`；边框 `#E2E8F0`
- 中性·文字：主 `#0F172A`；次 `#475569`；辅助/占位 `#94A3B8`
- 语义色：成功 `#16A34A`／警告 `#D97706`／错误 `#DC2626`
- 运行中状态：accent 橙 `#F97316` + 脉冲圆点

**字体**
- 字体族：`-apple-system, "PingFang SC", "Microsoft YaHei", Inter, sans-serif`
- 字号层级：页面标题 20px/600；区块标题 16px/600；正文 14px/400；**对话气泡 15px/400**（稍大易读）；辅助 caption 12px/400
- 字重：Regular 400 / Medium 500 / Semibold 600

**间距**：基础单位 4px；常用 4 / 8 / 12 / 16 / 24 / 32。组件内 padding 12~16，区块间距 24。

**圆角**：sm 6px（按钮/输入）；md 10px（卡片/角色项）；lg 14px（大面板）；full 9999（头像/状态点）。

**阴影**：sm `0 1px 2px rgba(15,23,42,.06)`；md `0 4px 12px rgba(15,23,42,.08)`（弹窗/悬浮）；聚焦环 `0 0 0 3px rgba(79,70,229,.25)`。

## 3. 组件清单（含变体/状态）

| 组件 | 变体 | 状态 |
|---|---|---|
| Button | 主要/次要(描边)/文字(ghost)/危险 | 默认·悬停·按下·禁用·加载 |
| AutoToggle（开始/停止自动化） | accent 主按钮 | idle「开始自动化」／running「停止自动化」(橙+脉冲) |
| Input / Textarea（底部多行自适应） | 单行/多行 | 默认·聚焦·禁用·错误 |
| CharacterItem（左栏角色项） | 主播/客服(置灰) | 默认·悬停·选中(左侧色条+浅底) |
| CategoryBadge | 珠宝/生鲜/团购…（不同色） | — |
| MessageBubble | 用户(右,主色浅底)／角色(左,白底描边)／自动台词(带 kind 标签条) | typing 流式·完成 |
| Panel / 角色信息条 | — | — |
| Uploader（上传区） | 拖拽/选择/粘贴 | 拖拽态·上传中·解析中·完成·失败 |
| Modal / Drawer | 新建角色·上传素材·风格校准 | — |
| EmptyState | 无角色／无对话 | — |
| Loading | 训练进度条·生成 typing·骨架屏 | — |
| Toast | 成功/错误/复制成功 | — |
| CopyButton / ExportButton | 段内复制·整段导出 | 悬停显示·点击→Toast |

## 4. 页面布局规格

**页面层级**
- 一级（唯一主界面）：**主工作台** = 左角色栏 + 右内容区 + 底输入栏
- 二级/弹窗：新建角色弹窗、上传素材抽屉、风格校准弹窗、设置抽屉(API Key)
- 无登录页、无独立设置页（MVP 自用）

**主工作台（对应你给的草图）**
- **左栏（固定 ~240px）**：顶部「+ 新建角色」按钮；下方角色列表（可滚动，每项=CharacterItem，名称+类目 Badge+首字头像，选中态左侧色条）；底部设置入口。
- **右主区（flex-1）**：
  - 顶部「角色信息条」：当前角色名 + 类目 Badge + 训练状态 + 「风格校准」入口
  - 中部「消息/台词流区」：可滚动；问答消息与自动台词同区呈现，自动台词用 `kind` 标签条 + 段内复制区分
- **底栏**：左 = 多行自适应输入框 +「发送」；右 = 「开始/停止自动化」+「导出」
- **页面状态**：无角色(空态引导新建) / 训练中(右区进度、输入禁用) / 训练完成空对话(提示可提问或开始自动化) / 对话进行中 / 自动生成运行中(滚动追加、停止可用) / 错误(重试)
- **响应式**：桌面优先（自用）；窄屏左栏收起为抽屉

**弹窗规格**
- 新建角色：名称、类目(下拉/标签)、类型(主播；客服置灰"即将支持") → 创建
- 上传素材抽屉：拖拽/选择 .txt/.md 或粘贴文本 → 上传 → 实时显示「切片 / 向量化 / 抽风格 / 抽范本」进度 → 完成 → 自动跳转校准
- 风格校准：展示一段样例生成 + 风格强度滑块 + 「补几条范本」 + 重新生成 → 满意保存

## 5. 核心用户旅程

**旅程 A · 训练并对话**
1. 点「+ 新建角色」→ 填"珠宝主播 / 珠宝" → 创建
2. 上传抽屉里拖入该主播直播稿 → 看到 切片/向量化/抽风格 进度
3. 完成 → 校准弹窗出现一段样例，判断"像" → 调强度/补范本 → 保存
4. 底部输入「这条项链怎么介绍」→ 右区流式吐出该主播风格回答 → 段内复制

**旅程 B · 自动滚动生成台词**
1. 左栏选中角色 → 点「开始自动化」
2. 右区一段段滚动输出带货台词（开场→卖点→互动→逼单 循环，每段带类型标签）
3. 觉得够了 → 点「停止自动化」→ 点「导出」拿走整段台词

---

# 三、运营方案（按"自用打磨 → 未来对外"重写）

> 你目前自用、无账号，所以这里不套商业化模型，而是给"把它打磨到成熟"的实操路径。

- **冷启动（自用）**：用你手上最好的 3~5 份直播稿，先训 2~3 个不同类目角色（珠宝/生鲜/团购），亲自验证"像不像"。
- **打磨循环**：每天用它生成，记录"哪段不像 / 哪段尬"，回头调 范本 / 风格摘要 / prompt；维护一个**"翻车样本集"**持续迭代——这就是你说的"调试到成熟"。
- **北极星指标**：**生成内容可直接用的比例**（无需大改即可发布的台词占比）。
- **核心指标（3~5 个）**：① 风格相似度（你主观 1~5 打分）② 单角色"训练到可用"耗时 ③ 自动生成连贯性（连续 N 段无重复/跑题）④ 你每周实际使用次数 / 产出条数。
- **未来若对外**：再补 账号体系 + 计费 + 多租户；获客从 MCN/直播运营社群 + 案例对比（同卖点：通用 AI vs 你的角色）切入；留存靠「素材越攒越像」的飞轮；商业化按 角色数 / 生成量 订阅。

---

## 待确认假设
1. 素材格式默认 **纯文本（.txt/.md/粘贴）**，暂不处理 .docx/PDF/音视频（音视频转写属二期）。
2. 自动生成的「话术类型轮转」节奏（开场→卖点→互动→逼单循环）由我预设，可在校准里微调。
3. 「客服」角色类型本版**置灰预留**，架构已兼容，稍后开启。

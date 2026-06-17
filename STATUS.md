# STATUS.md

Last updated: 2026-06-17

## 已上线功能

- 已基于 `主播分身_StyleClone_方案.md` 初始化 Next.js 14 + TypeScript + Tailwind CSS + shadcn 风格本地组件工程。
- 已接入 Prisma Client + SQLite 角色数据层：
  - 本地数据库初始化脚本 `npm run db:init`。
  - 角色表 `Character`，素材表 `Material`，切片表 `Chunk`，范本表 `Exemplar`。
  - 3 个 demo 角色 seed。
  - `/api/characters` GET/POST。
  - `/api/characters/:id` DELETE。
  - `/api/characters/:id/auto/start` POST。
  - `/api/characters/:id/auto/stop` POST。
  - `/api/characters/:id/calibrate` POST。
  - `/api/characters/:id/chat` POST。
  - `/api/characters/:id/materials` POST。
  - `/api/characters/:id/retrieve` POST。
  - `/api/characters/:id/training-status` GET。
- 已实现 StyleClone 主工作台：
  - 左侧角色栏、角色选中态、空角色提示、底部设置入口。
  - 主列 `CharacterHeader`、消息流区域、底部输入栏。
  - 6 个状态：无角色、训练中、已就绪空对话、对话流式生成、自动化运行中、训练失败。
  - 5 个弹窗/抽屉：新建角色、风格设置、上传素材、删除角色确认、风格校准。
- 已实现关键前端交互：
  - URL query 状态预览：`state=empty|training|ready|chat|auto|error`。
  - URL query 弹窗预览：`modal=newCharacter|styleSettings|upload|deleteConfirm|calibration`。
  - 开始/停止自动化状态切换、新建角色弹窗、复制 toast、typing caret、自动化脉冲点。
  - 左栏角色列表从 API 读取；新建角色写入 SQLite；删除确认调用 API 删除。
  - 上传素材弹窗支持 .txt/.md 选择、拖拽、粘贴文本；提交后调用 Voyage 向量化并写入 `Chunk`。
  - 训练完成后自动打开风格校准弹窗，可查看样例、调节风格强度、补充范本并重新生成。
  - 初始角色读取有加载骨架和失败重试态。
  - Toast 支持 success/info/error 三种状态。
  - 窄屏下左栏收起为抽屉，左上角按钮唤起，遮罩点击关闭。
  - `prefers-reduced-motion` 下关闭循环动效。
- 已实现 T3 素材上传 + 训练入库：
  - 上传文本清洗、长度校验、按段落切片。
  - Voyage embeddings 批量向量化。
  - `Material` 记录训练状态、阶段、进度、错误信息。
  - `Chunk` 写入文本片段、token 估算和向量 JSON。
  - 训练完成后角色状态更新为 `ready`，失败时更新为 `error`。
- 已实现 T4 风格摘要 + 范本抽取：
  - DeepSeek JSON 模式抽取 `styleSummary`。
  - 抽取 10-20 条典型原话范本，写入 `Exemplar`，kind 支持 `open|sell|inter|obj|close|general`。
  - 素材训练流程扩展为：切片 → 向量化 → 抽风格 → 抽范本 → 完成。
  - `training-status` 返回 `styleSummary`、`exemplarCount`。
- 已实现 T5 检索模块：
  - 查询文本调用 Voyage `input_type=query` 向量化。
  - 按 `characterId` 读取当前角色 `Chunk`，解析 SQLite 中的 `embeddingJson`。
  - 使用 cosine similarity 排序返回 top-k 相关片段。
  - `/api/characters/:id/retrieve` 支持 `{ query, topK }` 检索。
- 已实现 T6 问答对话：
  - `prompt.ts` 组装 system prompt、范本 few-shot 和检索片段上下文。
  - `/api/characters/:id/chat` 支持 POST 后返回 SSE。
  - DeepSeek 流式返回逐段 delta，前端右区 assistant 气泡同步流式渲染。
  - 发送按钮在生成期间显示 loading，生成完成后气泡支持复制。
- 已实现 T7 自动滚动生成：
  - `autoscript.ts` 实现开场 → 卖点 → 互动 → 逼单 kind 轮转。
  - 自动生成 prompt 带最近 3 段上下文，减少重复和断裂。
  - `/api/characters/:id/auto/start` 返回 SSE，按段发送 `segment-start` / `delta` / `segment-done` / `done`。
  - `/api/characters/:id/auto/stop` 标记当前角色自动化停止。
  - 前端开始自动化后持续追加自动台词卡，停止后保留已生成内容并支持复制。
- 已实现 T8 复制/导出：
  - 问答 assistant 气泡和自动台词卡支持段内复制。
  - Header 在有真实问答/自动台词内容时显示「复制全部」「下载」。
  - 复制全部会按角色、模式、导出时间和分段内容格式化后写入剪贴板。
  - 下载会生成 `.txt` 文件，文件名包含角色名、模式和时间戳。
- 已实现 T9 风格校准：
  - `/api/characters/:id/calibrate` 生成一段校准样例。
  - 风格强度滑块影响校准样例的贴近程度。
  - 「补几条范本」按行切分、去重后写入当前角色 `Exemplar`。
  - 训练完成自动弹出校准弹窗；Header ready 状态可手动再次打开。
- 已实现 T10 打磨：
  - `training-status` 返回最新素材文件名、字数、chunk 数、范本数、阶段、进度和错误信息。
  - 训练页改为真实进度轮询，不再展示固定 62% 和假文件名。
  - 上传素材开始后立即进入 training 状态并展示本地初始进度。
  - 错误页展示真实训练错误信息，支持重新上传和刷新状态。
  - 初始加载、读取失败、空角色、训练失败都有独立 UI。
  - 640px 以下左栏收起为移动抽屉。

## 进行中 / 待处理项

- 尚未接入消息持久化或跨刷新会话管理。
- T10 已做构建验证；由于当前会话没有 Browser/Playwright 工具，窄屏抽屉和 toast 的真实点击视觉需本机浏览器手测。
- 复制功能在受限自动化浏览器中可能无法真正写入系统剪贴板；前端会记录错误日志，并按设计展示复制 toast。真实浏览器点击场景需在后续集成阶段复测。

## 已知问题和技术债务

- 项目当前只有本地 UI primitives，未通过 `shadcn/ui` CLI 生成完整组件集。
- 窄屏已做收缩以避免裁切，但产品仍按桌面工具优先设计。
- 当前环境下 `prisma db push` 的 schema engine 返回裸错误；已改用 `scripts/init-db.mjs` 创建 SQLite 表，再用 Prisma Client seed。后续若固定 Node LTS，可复测 Prisma CLI 推库。
- T3/T5 暂用 `Chunk.embeddingJson` 在 SQLite 中保存向量并做本地 cosine 检索，未引入 LanceDB native 依赖；如后续角色/素材规模明显变大，再迁到 LanceDB。

## 关键架构决策及原因

- 使用 `app/page.tsx` 接收 query 并把初始状态传给 client component：便于 QA 直接打开每个设计状态，同时不在产品 UI 内加入额外状态切换面板。
- 将主要 UI 放在 `components/styleclone-workbench.tsx`，样式 token 与组件状态放在 `app/globals.css`：当前需求是高保真静态工作台，单文件组件可降低过早抽象成本。
- 用 lucide-react 替代 handoff 中的内联 SVG：符合现有 React 组件库方向，避免直接搬设计参考代码。
- 角色 CRUD 先只建 `Character` 表：符合当前 T2 切片，避免在素材/训练实现前提前铺开 Material/Chunk/Message 等表。
- T3/T5 先把向量落在 SQLite `Chunk.embeddingJson` 并用内存 cosine top-k：当前单人本地数据规模很小，能少引入一个 native 依赖，同时保留未来迁 LanceDB 的边界。
- T4 用 DeepSeek `response_format: { type: "json_object" }` 并做本地字段校验：避免模型输出 Markdown 或脏 kind 直接污染范本库。
- T6 问答先不持久化 Conversation/Message：当前切片重点是可用的流式问答链路，持久化留到 T8 导出或后续会话管理时补。
- T7 前端默认自动生成最多 12 段：避免一键无限消耗 API；后端硬上限 24 段，停止按钮通过 AbortController + stop API 双保险。
- T8 导出先基于当前前端可见内容，不新增 Conversation/Message 持久化；本地自用优先保证拿走当前生成结果。
- T9 校准先复用 `Exemplar` 表保存补充范本；风格强度暂不持久化，只用于本次校准样例生成，避免提前扩展设置表。
- T10 打磨不新增业务表；训练进度继续复用 `Material.stage/progress/errorMessage`，前端通过 `training-status` 轮询展示。
- T10 窄屏先用 CSS off-canvas 左栏，不改信息架构；桌面仍保持 240px 常驻左栏。

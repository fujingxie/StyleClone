# CHANGELOG.md

## 2026-06-18 · T13 Lint 配置固化

- 新增 `.eslintrc.json`：
  - 使用 `next/core-web-vitals` 作为项目 ESLint 基线。
  - `npm run lint` 不再进入 Next.js 首次配置交互。
- 清理 lint warning：
  - 为初始角色加载、历史加载、训练轮询、校准样例初始生成这 4 处有意控制触发时机的 `useEffect` 添加局部 `react-hooks/exhaustive-deps` 说明。

关键决策：

- 不全局关闭 `react-hooks/exhaustive-deps`；只在行为上需要固定触发时机的位置局部说明。
- 不为消除 lint warning 改变校准滑块行为；风格强度变化仍需用户显式点击「重新生成」。

验证：

- `npm run lint` 通过，且无 warning/error。
- `npm run build` 通过。

## 2026-06-18 · T12 多会话管理

- 扩展会话服务：
  - `lib/conversations.ts` 增加会话列表、指定会话读取、重命名、删除能力。
  - 最近历史读取继续跳过空会话，避免空记录覆盖有效历史。
- 新增会话管理 API：
  - `app/api/characters/[id]/conversations/route.ts`
  - `app/api/characters/[id]/conversations/[conversationId]/route.ts`
  - GET 列表返回最近消息预览、消息数、创建/更新时间。
  - POST 新建 chat/auto 空会话。
  - PATCH 重命名会话。
  - DELETE 删除会话及其消息。
- 更新历史读取与生成 API：
  - `/api/characters/:id/messages` 支持 `conversationId` 查询指定会话。
  - chat API 支持传入 `conversationId` 并向指定问答会话追加消息。
  - auto/start 支持复用选中的空 auto 会话；非空会话仍创建新的自动生成轮次。
- 更新前端工作台：
  - Header ready 状态增加「历史」入口。
  - 新增历史会话抽屉，支持 chat/auto 分段、空态、新建、改名、删除、切换会话。
  - `modal=history` 可直接打开历史抽屉。
  - 生成完成后刷新会话列表，让新消息预览和消息数保持同步。

关键决策：

- 会话列表展示空会话，方便用户先新建再写入；默认最近历史仍跳过空会话，避免刷新后被空会话抢占。
- 自动台词只复用选中的空 auto 会话；已有消息的 auto 会话不继续追加新一轮，避免混淆导出内容。
- T12 只做本地多会话管理，不新增搜索、分页游标或跨角色聚合历史。

验证：

- `npm run build` 通过。
- `git diff --check` 通过。
- `npm run lint` 已尝试；项目尚未配置 ESLint，Next.js 进入首次配置交互，未执行实际 lint。
- 浏览器冒烟通过：`http://127.0.0.1:3001/?state=ready` 加载成功，Header「历史」可见，历史抽屉可打开，问答/自动台词空态和新建入口可见，切换分段正常。
- dev server 日志确认 `/api/characters` 与 `/api/characters/demo-jewel/conversations?mode=chat|auto&limit=40` 返回 200。
- 可回滚 create/rename/delete HTTP 冒烟因本机权限额度限制未执行完成。

## 2026-06-17 · T11 消息与会话持久化

- 扩展数据层：
  - 新增 Prisma 模型 `Conversation` / `Message`。
  - 更新 `scripts/init-db.mjs`，SQLite 初始化会创建会话表、消息表和索引。
  - 新增 `lib/conversations.ts`，封装最近会话、创建会话、追加消息、读取历史。
- 新增历史读取 API：
  - `app/api/characters/[id]/messages/route.ts`
  - GET `?mode=chat|auto&limit=...` 返回当前角色最近一组会话和消息。
- 更新生成 API：
  - chat API 在生成前保存用户消息，在生成完成后保存 assistant 回复。
  - auto/start API 每次启动创建新的 auto 会话，并在每段完成后保存台词和 kind。
  - SSE 事件补充返回 `conversationId` / `messageId`，为后续前端对齐 DB id 预留。
- 更新前端工作台：
  - 刷新或切换角色时加载最近 chat/auto 历史。
  - `state=chat` 会展示最近问答历史；`state=auto` 会展示最近自动台词。
  - 复制/下载沿用当前已加载消息，因此刷新后仍能导出历史内容。

关键决策：

- T11 先实现每个角色最近一组 chat/auto 会话，不做多会话列表、重命名、删除等管理 UI。
- chat 复用最近 chat 会话持续追加；auto 每次启动创建新会话，更符合“重新生成一轮台词”的使用心智。
- 读取 auto 历史时跳过空会话，避免用户启动后立刻停止导致上一轮有效台词被空会话覆盖。

验证：

- `npm run db:init` 通过，并生成新的 Prisma Client。
- `npm run build` 通过。
- `git diff --check` 通过。
- Prisma 烟测通过：创建临时角色 → 写入 chat 会话 2 条消息和 auto 会话 1 条消息 → 按序读取 → 删除角色后 `Conversation/Message` 级联清理为 0。
- 当前沙箱禁止监听临时端口，`next start --port 3102` 返回 `listen EPERM`；未做 HTTP route 级别烟测。

## 2026-06-17 · T10 状态与窄屏打磨

- 更新训练状态：
  - `TrainingStatus` 增加 `filename` 和 `wordCount`。
  - `training-status` 继续返回最新素材的阶段、进度、错误、chunk 数和范本数。
  - 前端训练页改为展示真实文件名、字数、阶段、进度、chunk 数和范本数。
  - 上传素材开始后立即把当前角色置为 training 并展示本地初始进度。
  - 训练中按 1.4s 轮询 `training-status`，完成后刷新角色，失败后进入 error。
- 更新状态 UI：
  - 初始角色读取增加左栏骨架和主区加载态。
  - 读取角色失败增加独立错误页和「重新读取」。
  - 训练错误页展示真实 `errorMessage` 和失败阶段，支持重新上传和刷新状态。
  - Toast 改为 success/info/error 三种视觉状态，错误 toast 延长展示时间。
- 更新窄屏体验：
  - 640px 以下左栏改为 off-canvas 抽屉。
  - 左上角菜单按钮唤起角色列表，遮罩或关闭按钮收起。
  - 选择角色、新建角色、设置、删除入口会自动收起左栏。

关键决策：

- T10 只做状态和响应式打磨，不新增 Conversation/Message 或设置表。
- 训练进度继续复用 `Material.stage/progress/errorMessage`，避免引入额外任务队列表。
- 窄屏先做左栏收起，不改桌面信息架构和主工作台结构。

验证：

- `npm run build` 通过。
- `git diff --check` 通过。
- 当前会话未暴露 Browser/Playwright 工具；窄屏抽屉和 toast 点击视觉需本机浏览器手测。

## 2026-06-06 · T9 风格校准

- 新增校准服务与 API：
  - `lib/calibration.ts`
  - `app/api/characters/[id]/calibrate/route.ts`
- 校准流程：
  - 生成一段中文直播口语校准样例。
  - 风格强度 `1-5` 影响样例贴近原话的程度。
  - `saveOnly` 支持只保存补充范本，不重复调用模型。
  - 补充范本按行切分、去重后写入当前角色 `Exemplar`。
- 更新前端工作台：
  - `ModalKey` 增加 `calibration`，URL 支持 `?modal=calibration`。
  - 训练完成后自动打开「风格校准」弹窗。
  - Header ready 状态增加「校准」按钮。
  - 弹窗支持查看样例、风格强度滑块、补范本、重新生成、满意保存。

关键决策：

- T9 不新增设置表；风格强度先只作用于校准样例生成。
- 补充范本复用已有 `Exemplar` 表，kind 固定为 `general`，note 标记为风格校准补充范本。
- 「重新生成」不会保存补充范本；「满意保存」使用 `saveOnly` 保存，避免重复消耗模型调用。

验证：

- `npm run build` 通过。
- API 烟测通过：创建临时 ready 角色 → `POST calibrate` `saveOnly=true` 保存 1 条补充范本 → `POST calibrate` 生成样例 `sampleLength=70` → 删除临时角色；T9 临时数据已清理。

## 2026-06-06 · T8 复制与导出

- 更新前端工作台：
  - Header 在当前问答/自动台词有真实内容时显示「复制全部」「下载」。
  - 「复制全部」会格式化当前可见内容并写入剪贴板。
  - 「下载」会导出 `.txt` 文件，文件名包含角色名、模式和时间戳。
  - 问答导出按用户/角色消息分段。
  - 自动台词导出按 kind 标签和序号分段。

关键决策：

- T8 先基于当前前端可见内容导出，不新增 Conversation/Message 持久化；后续如果要跨刷新保留历史，再补消息表和导出 API。
- 保留已有段内复制行为，本轮只补整段复制和下载。

验证：

- `npm run build` 通过。
- 本轮未新增后端 API；Browser/Playwright 工具当前不可用，下载和剪贴板行为需在本机浏览器手测确认。

## 2026-06-06 · T7 自动滚动生成

- 新增自动生成服务：
  - `lib/autoscript.ts`
  - `lib/auto-sessions.ts`
- 新增自动化 API：
  - `app/api/characters/[id]/auto/start/route.ts`
  - `app/api/characters/[id]/auto/stop/route.ts`
- 自动生成流程：
  - kind 按 `open → sell → inter → close` 轮转。
  - 每段 prompt 带角色风格摘要、范本、当前 kind 的检索片段、最近 3 段上下文。
  - start API 返回 SSE：`start` / `segment-start` / `delta` / `segment-done` / `done` / `error`。
  - stop API 标记当前角色自动化停止。
- 更新前端工作台：
  - Header「开始自动化」调用真实 auto SSE。
  - 自动化运行中持续追加自动台词卡。
  - 停止时 abort 当前流并调用 stop API。
  - 停止后保留已生成台词，卡片支持复制。

关键决策：

- T7 先实现可用的自动生成流，不新增 Message 持久化；导出/保存留到 T8。
- 前端默认请求最多 12 段，后端硬上限 24 段，避免一键无限消耗 API。
- 停止控制采用客户端 AbortController + 服务端内存 stop flag；符合当前本地单人运行形态。

验证：

- `npm run build` 通过。
- API 烟测通过：POST 临时角色 → POST 素材完整训练 → POST auto/start `{ maxSegments: 2 }` → SSE 返回 2 段，kind=`open,sell`，segmentLengths=`98,97`，deltaEvents=`135`，generatedCount=`2` → POST auto/stop → DELETE 临时角色；T7 临时数据已清理。
- 当前数据库里还有一个既有手测角色「测试主播」；本轮未删除该用户数据。

## 2026-06-06 · T6 问答对话

- 新增 prompt 组装：
  - `lib/prompt.ts`
  - system prompt 使用角色名、类目、`styleSummary`。
  - few-shot 使用 `Exemplar`。
  - 用户问题附带 T5 检索片段。
- 扩展 DeepSeek 封装：
  - `streamDeepSeekChat()` 支持 Chat Completions streaming。
- 新增 chat API：
  - `app/api/characters/[id]/chat/route.ts`
  - POST `{ message, topK? }`。
  - 返回 SSE：`context` / `delta` / `done` / `error`。
- 更新前端工作台：
  - 底部输入框发送真实 chat 请求。
  - 右区 assistant 气泡随 SSE delta 流式更新。
  - 建议气泡直接触发真实问答。
  - 生成中发送按钮显示 loading。

关键决策：

- T6 先实现可用的流式问答链路，不新增 Conversation/Message 持久化；持久化留到导出或会话管理切片。
- DeepSeek streaming 使用 `thinking: { type: "disabled" }`，让前端直接收到可展示正文。

验证：

- `npm run build` 通过。
- API 烟测通过：POST 临时角色 → POST 素材完整训练 → POST chat 查询“有人嫌这条珍珠项链贵，怎么用小雅的口吻回应？” → SSE 返回 `retrievedChunkCount=1 / exemplarCount=11 / deltaEvents=107 / answerLength=150` → DELETE 临时角色；测试数据已清理。
- Browser 插件工具本轮未暴露，项目内也没有 Playwright/Puppeteer 依赖；未做真实浏览器 UI 自动化点击验证。

## 2026-06-06 · T5 检索模块

- 新增 SQLite 向量检索服务：
  - `lib/retrieval.ts`
- 新增检索 API：
  - `app/api/characters/[id]/retrieve/route.ts`
- 检索流程：
  - query 调用 Voyage `input_type=query` 向量化。
  - 按 `characterId` 过滤读取 `Chunk`。
  - 解析 `Chunk.embeddingJson`。
  - 使用 cosine similarity 排序并返回 top-k。

关键决策：

- 继续沿用 T3 的 SQLite 向量 JSON 存储，不在 T5 引入 LanceDB native 依赖。
- `/api/characters/:id/retrieve` 是薄调试入口，后续 T6 的 chat API 会直接复用 `lib/retrieval.ts`。

验证：

- `npm run build` 通过。
- API 烟测通过：POST 临时角色 → POST 素材完整训练 → POST retrieve 查询“有人嫌这条珍珠项链贵，应该怎么回应？” → 返回 top chunk，score=`0.6547`，命中文本包含“贵” → DELETE 临时角色；测试数据已清理。

## 2026-06-06 · T4 风格摘要与范本抽取

- 扩展 Prisma + SQLite 数据层：
  - `Exemplar`
  - `Character.exemplars`
  - `Material.exemplars`
- 新增 DeepSeek 与风格画像服务：
  - `lib/llm.ts`
  - `lib/style-profile.ts`
- 更新训练流程：
  - 向量化后调用 DeepSeek JSON 模式抽取 `styleSummary` 和 10-20 条范本。
  - 写入 `Character.styleSummary`。
  - 写入 `Exemplar`，kind 支持 `open|sell|inter|obj|close|general`。
  - 失败时清理当前素材关联范本，并把素材/角色置为 `error`。
- 更新 API 返回：
  - `/api/characters/:id/materials` 返回 `exemplarCount` 和 `styleSummary`。
  - `/api/characters/:id/training-status` 返回 `exemplarCount` 和 `styleSummary`。

关键决策：

- T4 只做风格摘要和范本抽取，不提前接 T5 检索或 T6 问答。
- DeepSeek 默认模型使用 `deepseek-v4-flash`；仍尊重本地 `.env` 的 `DEEPSEEK_MODEL` 覆盖。
- DeepSeek 返回 JSON 后再做本地校验和 kind 归一化，避免脏输出写入数据库。

验证：

- `npm run db:init` 通过。
- `npm run build` 通过。
- API 烟测通过：POST 临时角色 → POST 素材训练 → Voyage 向量化 → DeepSeek 抽风格/范本 → GET training-status 返回 `ready / 完成 / 100% / exemplarCount=15 / styleSummaryLength=153` → DELETE 临时角色；测试数据已清理。

## 2026-06-05 · T3 素材上传与训练入库

- 扩展 Prisma + SQLite 数据层：
  - `Material`
  - `Chunk`
  - `Character.styleSummary`
- 新增 Voyage 向量化与训练服务：
  - `lib/embed.ts`
  - `lib/training.ts`
- 新增 T3 API：
  - `app/api/characters/[id]/materials/route.ts`
  - `app/api/characters/[id]/training-status/route.ts`
- 更新删除角色 API：
  - 删除角色时同步清理 `Material` 和 `Chunk`。
- 更新上传素材前端：
  - 上传弹窗支持 .txt/.md 文件选择、拖拽、粘贴文本。
  - 新建角色后自动进入上传素材弹窗。
  - Header 在训练/就绪状态提供「上传素材」入口。
- 更新环境模板：
  - `DEEPSEEK_*`
  - `VOYAGE_*`

关键决策：

- T3 聚焦素材入库，不接 DeepSeek 风格摘要、范本抽取、问答或自动生成。
- 本轮先把向量保存在 SQLite `Chunk.embeddingJson`，避免现在引入 LanceDB native 依赖；T5 检索阶段再决定是否迁移向量库。

验证：

- 使用 Homebrew Node 执行 `npm run db:init` 通过，并写入 3 个 demo 角色。
- `npm run build` 通过。
- API 烟测通过：POST 临时角色 → POST 素材训练 → GET training-status 返回 `ready / 完成 / 100% / chunkCount=1` → DELETE 临时角色；测试数据已清理。

## 2026-06-05 · StyleClone 主工作台 UI

- 新增 Next.js 14 + TypeScript + Tailwind CSS 工程脚手架：
  - `package.json`
  - `next.config.mjs`
  - `tsconfig.json`
  - `tailwind.config.ts`
  - `postcss.config.js`
  - `app/layout.tsx`
  - `app/page.tsx`
  - `components.json`
  - `lib/utils.ts`
  - `components/ui/button.tsx`
- 新增 StyleClone 工作台实现：
  - `components/styleclone-workbench.tsx`
  - `app/globals.css`
- 新增项目维护文件：
  - `.gitignore`
  - `STATUS.md`
  - `CHANGELOG.md`

关键决策：

- 不直接复用 `design_handoff_styleclone/*.jsx` / HTML 代码，仅按 README、tokens 和设计稿语义重新实现。
- 用 query 参数承载 6 个状态与 4 个弹窗的 QA 入口，避免把状态预览控件放进产品界面。
- 当前只实现前端壳与静态状态；真实训练、RAG、流式生成和自动化服务留待下一阶段 API 集成。

验证：

- `npm run build` 通过。
- 浏览器验证通过：6 个状态和 4 个弹窗关键文案均可见，当前测试视口无横向溢出。

## 2026-06-05 · 角色 CRUD 数据层

- 新增 Prisma + SQLite 角色数据层：
  - `prisma/schema.prisma`
  - `prisma/seed.mjs`
  - `scripts/init-db.mjs`
  - `lib/db.ts`
  - `lib/characters.ts`
  - `data/.gitkeep`
  - `.env.example`
- 新增角色 API：
  - `app/api/characters/route.ts`
  - `app/api/characters/[id]/route.ts`
- 更新前端工作台：
  - 左侧角色列表从 `/api/characters` 拉取。
  - 新建角色弹窗提交 POST，创建后进入训练态。
  - 删除确认调用 DELETE，删除后更新左栏。
- 更新 `package.json` 脚本：
  - `db:init`
  - `db:push`
  - `db:seed`

关键决策：

- 本轮只实现角色 CRUD，不提前实现素材、训练、检索和生成，保持切片可验证。
- 当前环境下 `prisma db push` 返回 schema engine 裸错误；改用 `scripts/init-db.mjs` 直接创建 SQLite 表，Prisma Client 继续负责 API 读写。

验证：

- `npm run db:init` 通过，并写入 3 个 demo 角色。
- `npm run build` 通过。
- API 烟测通过：GET 角色列表、POST 临时角色、DELETE 临时角色。
- 浏览器验证通过：`state=chat` 正常渲染 API 角色；UI 新建临时角色后进入训练态；测试数据已清理。

# STATUS.md

Last updated: 2026-06-05

## 已上线功能

- 已基于 `主播分身_StyleClone_方案.md` 初始化 Next.js 14 + TypeScript + Tailwind CSS + shadcn 风格本地组件工程。
- 已实现 StyleClone 主工作台：
  - 左侧角色栏、角色选中态、空角色提示、底部设置入口。
  - 主列 `CharacterHeader`、消息流区域、底部输入栏。
  - 6 个状态：无角色、训练中、已就绪空对话、对话流式生成、自动化运行中、训练失败。
  - 4 个弹窗/抽屉：新建角色、风格设置、上传素材、删除角色确认。
- 已实现关键前端交互：
  - URL query 状态预览：`state=empty|training|ready|chat|auto|error`。
  - URL query 弹窗预览：`modal=newCharacter|styleSettings|upload|deleteConfirm`。
  - 开始/停止自动化状态切换、新建角色弹窗、复制 toast、typing caret、自动化脉冲点。
  - `prefers-reduced-motion` 下关闭循环动效。

## 进行中 / 待处理项

- 当前为前端静态状态实现，尚未接入真实 API、SSE/WebSocket、角色 CRUD、训练进度、RAG 或自动生成服务。
- 复制功能在受限自动化浏览器中可能无法真正写入系统剪贴板；前端会记录错误日志，并按设计展示复制 toast。真实浏览器点击场景需在后续集成阶段复测。

## 已知问题和技术债务

- 项目当前只有本地 UI primitives，未通过 `shadcn/ui` CLI 生成完整组件集。
- 窄屏已做收缩以避免裁切，但产品仍按桌面工具优先设计。

## 关键架构决策及原因

- 使用 `app/page.tsx` 接收 query 并把初始状态传给 client component：便于 QA 直接打开每个设计状态，同时不在产品 UI 内加入额外状态切换面板。
- 将主要 UI 放在 `components/styleclone-workbench.tsx`，样式 token 与组件状态放在 `app/globals.css`：当前需求是高保真静态工作台，单文件组件可降低过早抽象成本。
- 用 lucide-react 替代 handoff 中的内联 SVG：符合现有 React 组件库方向，避免直接搬设计参考代码。

# CHANGELOG.md

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

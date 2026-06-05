/* sec-screens.jsx — Section 3 主工作台 6 状态稿 → window.Screens
   桌面 B 端工具壳：240 左栏 + 主列（CharacterHeader / 消息流 / InputBar）
   复用 shared.jsx 组件 + tokens.css 样式 */

const SCREEN_W = 1180;
const SCREEN_H = 800;

/* ---------- 外壳 ---------- */
function Frame({ children }) {
  return (
    <div className="sc" style={{ width: SCREEN_W, height: SCREEN_H, display: "flex", background: "#fff", overflow: "hidden" }}>
      {children}
    </div>
  );
}

/* 主列：header(可选) + 流区 + 底栏(可选) */
function MainCol({ header, children, footer, flowBg = "var(--bg-canvas)" }) {
  return (
    <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
      {header}
      <div style={{ flex: 1, minHeight: 0, background: flowBg, position: "relative", overflow: "hidden" }}>
        {children}
      </div>
      {footer}
    </main>
  );
}

/* 角色信息条 */
function Header({ status }) {
  const variants = {
    training: <span className="status-pill" style={{ color: "var(--text-2)" }}><span className="dot amber" />训练中 · 抽风格 3/4</span>,
    ready: <span className="status-pill" style={{ color: "var(--success)" }}><span className="dot green" />已就绪</span>,
    running: <span className="status-pill" style={{ color: "var(--accent-hover)" }}><span className="dot amber" style={{ background: "var(--accent)" }} />自动化运行中</span>,
    error: <span className="status-pill" style={{ color: "var(--error)" }}><span className="dot red" />训练失败</span>,
  };
  return (
    <div className="char-header">
      <Avatar color="violet" letter="雅" size={32} />
      <span className="t-block">珠宝主播·小雅</span>
      <Badge cat="jewel" />
      <div style={{ flex: 1 }} />
      {variants[status]}
      <div style={{ width: 12 }} />
      {status === "ready" && <React.Fragment><button className="auto-toggle idle">{I.sparkle}<span>开始自动化</span></button></React.Fragment>}
      {status === "running" && <button className="auto-toggle running"><span className="pulse-dot" /><span>停止自动化</span></button>}
      {status === "error" && <Btn variant="secondary" icon={I.refresh} style={{ height: 32 }}>重试训练</Btn>}
      {status === "training" && <Btn variant="ghost" icon={I.gear} style={{ height: 32 }}>设置</Btn>}
    </div>
  );
}

/* 底部输入栏 */
function Footer({ state = "default", value }) {
  const ph = "输入问题，例如：这条项链怎么介绍？";
  const cls = "input-bar" + (state === "focus" ? " focus" : "") + (state === "disabled" ? " disabled" : "");
  return (
    <div style={{ padding: "16px 24px 20px", borderTop: "1px solid var(--border)", background: "#fff" }}>
      <div className={cls}>
        <div className={"fake-input" + (value ? "" : " placeholder")}>
          {state === "disabled" ? "训练中，暂不可输入…" : (value || ph)}
          {state === "focus" && <span className="caret" />}
        </div>
        <Btn variant={value || state === "focus" ? "primary" : "ghost"} icon={I.send} state={state === "disabled" ? "disabled" : ""} style={{ height: 38, width: 38, padding: 0 }} />
      </div>
    </div>
  );
}

/* 消息流容器 */
function Flow({ children, style }) {
  return <div style={{ position: "absolute", inset: 0, overflow: "hidden", padding: "28px 24px", ...style }}>
    <div style={{ maxWidth: 760, margin: "0 auto" }}>{children}</div>
  </div>;
}

/* 气泡 */
function UserMsg({ children }) {
  return <div className="msg-row user"><div className="bubble user">{children}</div></div>;
}
function RoleMsg({ children, streaming, copy }) {
  return (
    <div className="msg-row role">
      <div className="bubble role" style={{ position: "relative" }}>
        {children}{streaming && <span className="caret" />}
        {copy && <button className="copy-fab">{I.copy}</button>}
      </div>
    </div>
  );
}
function AutoMsg({ kind, children }) {
  return (
    <div className="msg-row role">
      <div className="bubble auto">
        <div className="auto-head"><Kind k={kind} /><span className="t-cap">自动台词</span><div style={{ flex: 1 }} /><button className="copy-fab" style={{ position: "static", width: 22, height: 22 }}>{I.copy}</button></div>
        <div className="auto-body">{children}</div>
      </div>
    </div>
  );
}

/* 建议气泡（就绪空态） */
function Suggest({ children }) {
  return <button style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 34, padding: "0 14px", borderRadius: 999, border: "1px solid var(--border)", background: "#fff", fontSize: 13, color: "var(--text-2)", cursor: "pointer", fontFamily: "var(--font)" }}>{children}</button>;
}

/* ============================================================
   S1 · 空状态（无角色）
   ============================================================ */
function Screen1() {
  return (
    <Frame>
      <LeftRail empty />
      <MainCol flowBg="#fff">
        <div className="empty" style={{ position: "absolute", inset: 0 }}>
          <div className="art" style={{ width: 112, height: 112, borderRadius: 28 }}>{I.sparkle}</div>
          <div style={{ marginTop: 4 }}>
            <div className="t-page" style={{ fontSize: 20 }}>先创建一个角色</div>
            <p className="muted" style={{ marginTop: 8, maxWidth: 320, lineHeight: 1.7 }}>上传 TA 的直播稿，几分钟后即可让分身用 TA 的口吻生成带货台词。</p>
          </div>
          <Btn variant="primary" icon={I.plus} style={{ height: 40, padding: "0 20px" }}>新建角色</Btn>
        </div>
      </MainCol>
    </Frame>
  );
}

/* ============================================================
   S2 · 训练中（上传素材解析分阶段）
   ============================================================ */
function Screen2() {
  return (
    <Frame>
      <LeftRail sel="jewel" />
      <MainCol header={<Header status="training" />} footer={<Footer state="disabled" />}>
        <Flow style={{ padding: "40px 24px" }}>
          <div style={{ maxWidth: 460, margin: "0 auto", background: "#fff", border: "1px solid var(--border)", borderRadius: 14, padding: 24, boxShadow: "var(--sh-sm)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <span className="t-block">正在训练「珠宝主播·小雅」</span>
            </div>
            <p className="t-cap" style={{ marginBottom: 18 }}>已解析 珠宝主播直播稿.txt · 约 4.2 万字</p>

            <div className="progress" style={{ marginBottom: 4 }}><i style={{ width: "62%" }} /></div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}><span className="t-cap">整体进度</span><span className="t-cap" style={{ fontVariantNumeric: "tabular-nums" }}>62%</span></div>

            <div className="stage-list">
              <div className="stage done"><span className="tick">{I.check}</span><span className="stage-label">切片 · 把直播稿拆成语段</span></div>
              <div className="stage done"><span className="tick">{I.check}</span><span className="stage-label">向量化 · 建立语义索引</span></div>
              <div className="stage active"><span className="tick"><span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} /></span><span className="stage-label">抽风格 · 提炼口吻与节奏</span></div>
              <div className="stage todo"><span className="tick">4</span><span className="stage-label">抽范本 · 沉淀高频话术</span></div>
            </div>
          </div>
        </Flow>
      </MainCol>
    </Frame>
  );
}

/* ============================================================
   S3 · 就绪 · 对话空
   ============================================================ */
function Screen3() {
  return (
    <Frame>
      <LeftRail sel="jewel" />
      <MainCol header={<Header status="ready" />} footer={<Footer state="default" />}>
        <div className="empty" style={{ position: "absolute", inset: 0 }}>
          <div className="art">{I.sparkle}</div>
          <div>
            <div className="t-page" style={{ fontSize: 20 }}>小雅已就绪，问点什么试试</div>
            <p className="muted" style={{ marginTop: 8 }}>用 TA 的口吻生成开场、卖点、互动到逼单的整套话术。</p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center", maxWidth: 520, marginTop: 4 }}>
            <Suggest>{I.sparkle}这条珍珠项链怎么开场</Suggest>
            <Suggest>讲讲 18K 金的卖点</Suggest>
            <Suggest>有人嫌贵怎么回</Suggest>
            <Suggest>来一段逼单话术</Suggest>
          </div>
        </div>
      </MainCol>
    </Frame>
  );
}

/* ============================================================
   S4 · 对话流式生成
   ============================================================ */
function Screen4() {
  return (
    <Frame>
      <LeftRail sel="jewel" />
      <MainCol header={<Header status="ready" />} footer={<Footer state="focus" />}>
        <Flow>
          <UserMsg>这条 18K 金珍珠项链怎么介绍给新进直播间的家人？</UserMsg>
          <RoleMsg copy>家人们看过来！这条是 18K 金镶天然淡水珍珠，光泽特别温润，颗颗手工挑过，圆度高、瑕疵少。</RoleMsg>
          <AutoMsg kind="sell">珠子直径 9–10mm，戴上立刻显气质，日常通勤、约会、见客户都能压得住场，一条顶三条。</AutoMsg>
          <RoleMsg streaming>而且 18K 金比镀金耐戴得多，不掉色、不过敏，夏天出汗也不怕，可以放心戴着洗手</RoleMsg>
        </Flow>
      </MainCol>
    </Frame>
  );
}

/* ============================================================
   S5 · 自动化运行中（连续台词流）
   ============================================================ */
function Screen5() {
  return (
    <Frame>
      <LeftRail sel="jewel" />
      <MainCol header={<Header status="running" />} footer={<Footer state="disabled" value="自动化进行中，正在按节奏生成台词…" />}>
        <Flow>
          <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", marginBottom: 22 }}>
            <span className="badge other" style={{ background: "#FFEDD5", color: "var(--accent-hover)" }}>● 自动化运行中 · 已生成 7 条</span>
          </div>
          <AutoMsg kind="open">欢迎刚进来的家人们，今天给大家上的是镇店的 18K 金珍珠项链，名额不多，喜欢的先扣 1。</AutoMsg>
          <AutoMsg kind="sell">天然淡水珍珠，9–10mm 大珠，18K 真金链托，专柜同款品质，今天直播间价格直接打到骨折。</AutoMsg>
          <AutoMsg kind="inter">想要的家人扣个「想要」，扣到 100 我去跟老板申请加 20 个名额，3、2、1，扣起来！</AutoMsg>
          <AutoMsg kind="close">最后 30 单，拍下立减 200，还送绒布收纳袋，犹豫就没了，左上角链接直接拍！</AutoMsg>
        </Flow>
      </MainCol>
    </Frame>
  );
}

/* ============================================================
   S6 · 训练失败
   ============================================================ */
function Screen6() {
  return (
    <Frame>
      <LeftRail sel="jewel" />
      <MainCol header={<Header status="error" />} footer={<Footer state="disabled" />}>
        <div className="empty" style={{ position: "absolute", inset: 0 }}>
          <div className="art" style={{ background: "#FEE2E2", color: "var(--error)" }}>{I.alert}</div>
          <div>
            <div className="t-page" style={{ fontSize: 20 }}>训练失败</div>
            <p className="muted" style={{ marginTop: 8, maxWidth: 360, lineHeight: 1.7 }}>素材在「抽风格」阶段中断——可能是直播稿内容过短或格式异常。可重新上传更完整的直播稿后重试。</p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Btn variant="secondary" icon={I.upload}>重新上传</Btn>
            <Btn variant="primary" icon={I.refresh}>重试训练</Btn>
          </div>
          <div style={{ marginTop: 4 }}>
            <span className="t-cap" style={{ color: "var(--text-3)" }}>错误码 STYLE_EXTRACT_TIMEOUT · 14:32</span>
          </div>
        </div>
      </MainCol>
    </Frame>
  );
}

Object.assign(window, { Screen1, Screen2, Screen3, Screen4, Screen5, Screen6, SCREEN_W, SCREEN_H, Frame, Header, Footer, Flow, MainCol, UserMsg, RoleMsg, AutoMsg, Suggest });

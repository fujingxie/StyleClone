/* shared.jsx — 图标 + 通用小组件（导出到 window 供各 Section 复用） */

const I = {
  plus: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M8 3v10M3 8h10"/></svg>,
  gear: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="8" cy="8" r="2.3"/><path d="M8 1.5v1.6M8 12.9v1.6M14.5 8h-1.6M3.1 8H1.5M12.6 3.4l-1.1 1.1M4.5 11.5l-1.1 1.1M12.6 12.6l-1.1-1.1M4.5 4.5L3.4 3.4" strokeLinecap="round"/></svg>,
  send: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"><path d="M14 8L2.5 2.5l2 5.5-2 5.5L14 8z"/></svg>,
  download: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2v8m0 0L5 7m3 3l3-3M3 13h10"/></svg>,
  copy: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="5.5" y="5.5" width="8" height="8" rx="1.6"/><path d="M3.5 10.5h-.5a1 1 0 01-1-1v-6a1 1 0 011-1h6a1 1 0 011 1v.5"/></svg>,
  check: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3.5 8.5l3 3 6-6.5"/></svg>,
  upload: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 11V3m0 0L5 6m3-3l3 3M3 13h10"/></svg>,
  file: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M4 2h5l3 3v9a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z"/><path d="M9 2v3h3"/></svg>,
  x: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>,
  refresh: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M13 8a5 5 0 11-1.5-3.6M13 2v2.8h-2.8"/></svg>,
  eye: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z"/><circle cx="8" cy="8" r="1.8"/></svg>,
  alert: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M8 5v4M8 11.2v.1"/><circle cx="8" cy="8" r="6.2"/></svg>,
  sparkle: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"><path d="M8 2l1.4 3.6L13 7l-3.6 1.4L8 12l-1.4-3.6L3 7l3.6-1.4L8 2z"/></svg>,
};

/* 按钮（静态展示用，state 通过 className 注入：is-hover/is-active/is-focus/is-disabled） */
function Btn({ variant = "primary", state, icon, loading, children, style }) {
  const cls = `btn btn-${variant}` + (state ? ` is-${state}` : "");
  return (
    <button className={cls} style={style} disabled={state === "disabled"}>
      {loading && <span className="spinner" />}
      {!loading && icon}
      {children}
    </button>
  );
}

function Badge({ cat }) {
  const map = { jewel: ["jewel", "珠宝"], fresh: ["fresh", "生鲜"], group: ["group", "团购"], other: ["other", "其他"] };
  const [c, t] = map[cat] || map.other;
  return <span className={`badge ${c}`}>{t}</span>;
}

function Kind({ k }) {
  const map = { open: ["open", "开场"], sell: ["sell", "卖点"], inter: ["inter", "互动"], obj: ["obj", "异议"], close: ["close", "逼单"] };
  const [c, t] = map[k] || map.open;
  return <span className={`kind ${c}`}>{t}</span>;
}

function Avatar({ color, letter, size = 40 }) {
  return <div className={`avatar ${color}`} style={{ width: size, height: size, fontSize: size * 0.4 }}>{letter}</div>;
}

/* 角色项 */
function CharItem({ color, letter, name, cat, selected, hover, disabled, soon }) {
  const cls = "char-item" + (selected ? " selected" : "") + (disabled ? " disabled" : "");
  return (
    <div className={cls} style={hover ? { background: "#F8FAFC" } : null}>
      <Avatar color={color} letter={letter} />
      <div className="char-meta">
        <span className="char-name">{name}</span>
        {soon ? <span className="badge other">即将支持</span> : <Badge cat={cat} />}
      </div>
    </div>
  );
}

/* 左栏（角色列表）—— sel 指定选中角色 id；变体 empty 显示空列表 */
function LeftRail({ sel = "jewel", empty }) {
  return (
    <aside style={{ width: 240, flex: "0 0 240px", background: "#fff", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: 16 }}>
        <Btn variant="primary" icon={I.plus} style={{ width: "100%" }}>新建角色</Btn>
      </div>
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", gap: 2, paddingTop: 4 }}>
        {empty ? (
          <div style={{ padding: "24px 20px", textAlign: "center" }}>
            <p className="t-cap" style={{ lineHeight: 1.6 }}>还没有角色<br />点上方按钮创建第一个</p>
          </div>
        ) : (
          <React.Fragment>
            <CharItem color="violet" letter="雅" name="珠宝主播·小雅" cat="jewel" selected={sel === "jewel"} />
            <CharItem color="green" letter="张" name="生鲜主播·老张" cat="fresh" selected={sel === "fresh"} />
            <CharItem color="rose" letter="珍" name="团购主播·阿珍" cat="group" selected={sel === "group"} />
            <CharItem color="gray" letter="客" name="客服助手" disabled soon />
          </React.Fragment>
        )}
      </div>
      <div style={{ borderTop: "1px solid var(--border)", padding: 8 }}>
        <Btn variant="ghost" icon={I.gear} style={{ width: "100%", justifyContent: "flex-start" }}>设置</Btn>
      </div>
    </aside>
  );
}

Object.assign(window, { I, Btn, Badge, Kind, Avatar, CharItem, LeftRail });

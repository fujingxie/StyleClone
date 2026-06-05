/* sec-styleguide.jsx — Section 1 样式规范页 → window.StyleGuide() */

function Sw({ v, name, role, dark }) {
  return (
    <div className="swatch">
      <div className="chip" style={{ background: v, boxShadow: dark ? "inset 0 0 0 1px rgba(255,255,255,.08)" : "inset 0 0 0 1px rgba(0,0,0,.04)" }} />
      <div className="meta">
        <div style={{ fontSize: 12, fontWeight: 600 }}>{name}</div>
        <div className="code faint" style={{ marginTop: 2 }}>{v}</div>
        <div className="t-cap" style={{ marginTop: 2, fontSize: 11 }}>{role}</div>
      </div>
    </div>
  );
}

function SGGroup({ title, children }) {
  return (
    <section style={{ marginBottom: 30 }}>
      <h3 className="t-block" style={{ marginBottom: 14 }}>{title}</h3>
      {children}
    </section>
  );
}

function StyleGuide() {
  const grid = (cols) => ({ display: "grid", gridTemplateColumns: `repeat(${cols},1fr)`, gap: 12 });
  return (
    <div className="sc" style={{ padding: 40, background: "#fff", width: "100%" }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="avatar violet" style={{ width: 34, height: 34, fontSize: 15, borderRadius: 9 }}>S</div>
          <h1 className="t-page" style={{ fontSize: 22 }}>StyleClone · 样式规范</h1>
        </div>
        <p className="muted" style={{ marginTop: 6 }}>主播分身 — clean modern · tool-like · 浅色主题</p>
      </div>

      <SGGroup title="主色 / 强调色">
        <div style={grid(5)}>
          <Sw v="#4F46E5" name="Primary" role="主按钮·选中·链接" />
          <Sw v="#4338CA" name="Primary Hover" role="主按钮悬停" />
          <Sw v="#EEF2FF" name="Primary Light" role="选中底·用户气泡" />
          <Sw v="#F97316" name="Accent" role="开始自动化·热度" />
          <Sw v="#EA580C" name="Accent Hover" role="accent 悬停" />
        </div>
      </SGGroup>

      <SGGroup title="中性色 / 文字">
        <div style={grid(5)}>
          <Sw v="#FFFFFF" name="BG / 页面" role="主背景" />
          <Sw v="#F8FAFC" name="BG / 画布" role="消息流区底" />
          <Sw v="#E2E8F0" name="Border" role="边框·分隔线" />
          <Sw v="#0F172A" name="Text / 主" role="标题·正文" dark />
          <Sw v="#475569" name="Text / 次" role="辅助说明" dark />
        </div>
        <div style={{ ...grid(5), marginTop: 12 }}>
          <Sw v="#94A3B8" name="Text / 占位" role="placeholder·禁用" />
          <Sw v="#16A34A" name="Success" role="训练完成" dark />
          <Sw v="#D97706" name="Warning" role="警告" dark />
          <Sw v="#DC2626" name="Error" role="错误·危险" dark />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", border: "1px dashed var(--border)", borderRadius: 10, color: "var(--text-3)", fontSize: 12 }}>语义色板</div>
        </div>
      </SGGroup>

      <SGGroup title="类目色 / kind 标签色（低饱和）">
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
          <Badge cat="jewel" /><Badge cat="fresh" /><Badge cat="group" /><Badge cat="other" />
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Kind k="open" /><Kind k="sell" /><Kind k="inter" /><Kind k="obj" /><Kind k="close" />
        </div>
      </SGGroup>

      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 36 }}>
        <SGGroup title="字阶 Type Scale">
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              ["页面标题", "20 / 600 · 行高1.3", <span className="t-page">这条项链怎么介绍</span>],
              ["区块标题", "16 / 600", <span className="t-block">角色信息</span>],
              ["对话气泡", "15 / 400 · 行高1.6", <span className="t-bubble">家人们看过来</span>],
              ["正文", "14 / 400 · 行高1.6", <span className="t-body">上传直播稿开始训练</span>],
              ["按钮文字", "14 / 500", <span className="t-btn">开始自动化</span>],
              ["辅助 caption", "12 / 400", <span className="t-cap">切片 → 向量化 → 抽风格</span>],
            ].map(([n, m, el], i) => (
              <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 16, paddingBottom: 12, borderBottom: "1px solid #F1F5F9" }}>
                <div style={{ width: 96, flex: "0 0 96px" }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{n}</div>
                  <div className="t-cap" style={{ fontSize: 11 }}>{m}</div>
                </div>
                <div>{el}</div>
              </div>
            ))}
          </div>
        </SGGroup>

        <div>
          <SGGroup title="圆角 Radius">
            <div style={{ display: "flex", gap: 16, alignItems: "flex-end" }}>
              {[["sm", 6], ["md", 10], ["lg", 14], ["full", 999]].map(([n, r]) => (
                <div key={n} style={{ textAlign: "center" }}>
                  <div style={{ width: 52, height: 52, background: "var(--primary-light)", border: "1px solid #C7D2FE", borderRadius: r }} />
                  <div className="t-cap" style={{ marginTop: 6 }}>{n}<br />{r === 999 ? "full" : r}</div>
                </div>
              ))}
            </div>
          </SGGroup>

          <SGGroup title="间距 Spacing · 基数 4px">
            <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
              {[4, 8, 12, 16, 24, 32].map((s) => (
                <div key={s} style={{ textAlign: "center" }}>
                  <div style={{ width: s, height: s, background: "var(--accent)", borderRadius: 2, margin: "0 auto" }} />
                  <div className="t-cap" style={{ marginTop: 8, fontSize: 11 }}>{s}</div>
                </div>
              ))}
            </div>
          </SGGroup>

          <SGGroup title="阴影 Shadow">
            <div style={{ display: "flex", gap: 18 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ width: 72, height: 48, background: "#fff", borderRadius: 10, boxShadow: "var(--sh-sm)", border: "1px solid #F1F5F9" }} />
                <div className="t-cap" style={{ marginTop: 8 }}>sm</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ width: 72, height: 48, background: "#fff", borderRadius: 10, boxShadow: "var(--sh-md)" }} />
                <div className="t-cap" style={{ marginTop: 8 }}>md</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ width: 72, height: 48, background: "#fff", borderRadius: 10, boxShadow: "var(--focus-ring)" }} />
                <div className="t-cap" style={{ marginTop: 8 }}>focus</div>
              </div>
            </div>
          </SGGroup>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { StyleGuide });

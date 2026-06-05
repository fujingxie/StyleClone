/* sec-components.jsx — Section 2 组件库（全组件 × 全状态）→ window.ComponentLib() */

function Cell({ label, children, w }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: w }}>
      <span className="t-cap" style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 500 }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", minHeight: 36 }}>{children}</div>
    </div>
  );
}

function Block({ title, note, children, span = 12 }) {
  return (
    <section style={{ gridColumn: `span ${span}`, border: "1px solid var(--border)", borderRadius: 14, background: "#fff", overflow: "hidden" }}>
      <header style={{ padding: "12px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "baseline", gap: 10, background: "#FCFDFE" }}>
        <h3 style={{ fontSize: 14, fontWeight: 600 }}>{title}</h3>
        {note && <span className="t-cap" style={{ fontSize: 11 }}>{note}</span>}
      </header>
      <div style={{ padding: 18 }}>{children}</div>
    </section>
  );
}

function ComponentLib() {
  const row = { display: "flex", gap: 18, alignItems: "flex-end", flexWrap: "wrap" };
  return (
    <div className="sc" style={{ padding: 40, background: "var(--bg-canvas)", width: "100%" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 className="t-page" style={{ fontSize: 22 }}>组件库</h1>
        <p className="muted" style={{ marginTop: 6 }}>每个组件 × 全部状态 · 静态枚举</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(12,1fr)", gap: 20 }}>

        {/* Button */}
        <Block title="Button" note="主要 / 次要 / 文字 / 危险 × 默认·悬停·按下·禁用·加载">
          {[["primary", "主要"], ["secondary", "次要"], ["ghost", "文字"], ["danger", "危险"]].map(([v, n]) => (
            <div key={v} style={{ ...row, marginBottom: 18, paddingBottom: 14, borderBottom: "1px solid #F1F5F9" }}>
              <span className="t-cap" style={{ width: 40, fontWeight: 600, color: "var(--text-2)" }}>{n}</span>
              <Cell label="默认"><Btn variant={v} icon={I.sparkle}>按钮</Btn></Cell>
              <Cell label="悬停"><Btn variant={v} state="hover" icon={I.sparkle}>按钮</Btn></Cell>
              <Cell label="按下"><Btn variant={v} state="active" icon={I.sparkle}>按钮</Btn></Cell>
              <Cell label="禁用"><Btn variant={v} state="disabled" icon={I.sparkle}>按钮</Btn></Cell>
              <Cell label="加载"><Btn variant={v} loading>处理中</Btn></Cell>
            </div>
          ))}
          <div style={{ ...row, marginTop: 2 }}>
            <span className="t-cap" style={{ width: 40, fontWeight: 600, color: "var(--text-2)" }}>聚焦</span>
            <Cell label="primary · focus ring"><Btn variant="primary" state="focus">主按钮</Btn></Cell>
          </div>
        </Block>

        {/* AutoToggle */}
        <Block title="AutoToggle" note="开始 / 停止自动化" span={5}>
          <div style={row}>
            <Cell label="idle"><button className="auto-toggle idle">{I.sparkle}<span>开始自动化</span></button></Cell>
            <Cell label="running（橙脉冲）"><button className="auto-toggle running"><span className="pulse-dot" /><span>停止自动化</span></button></Cell>
          </div>
        </Block>

        {/* Slider */}
        <Block title="Slider · 风格强度 1~5" span={7}>
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            <div>
              <div className="t-cap" style={{ marginBottom: 8 }}>默认（值 3）</div>
              <div className="slider"><div className="track"><div className="fill" style={{ width: "50%" }} /></div><div className="thumb" style={{ left: "50%" }} /></div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}><span className="t-cap">更自由发挥</span><span className="t-cap">更贴近原话</span></div>
            </div>
            <div>
              <div className="t-cap" style={{ marginBottom: 8 }}>拖动中（值 4·focus ring）</div>
              <div className="slider"><div className="track"><div className="fill" style={{ width: "75%" }} /></div><div className="thumb dragging" style={{ left: "75%" }} /></div>
            </div>
          </div>
        </Block>

        {/* CharacterItem */}
        <Block title="角色项 CharacterItem" note="默认 / 悬停 / 选中 / 客服置灰" span={6}>
          <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 10, padding: "8px 0", display: "flex", flexDirection: "column", gap: 2, width: 240 }}>
            <CharItem color="violet" letter="雅" name="珠宝主播·小雅" cat="jewel" />
            <CharItem color="green" letter="张" name="生鲜主播·老张" cat="fresh" hover />
            <CharItem color="rose" letter="珍" name="团购主播·阿珍" cat="group" selected />
            <CharItem color="gray" letter="客" name="客服助手" disabled soon />
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
            <span className="t-cap">① 默认</span><span className="t-cap">② 悬停</span><span className="t-cap">③ 选中（左主色条）</span><span className="t-cap">④ 置灰</span>
          </div>
        </Block>

        {/* Badge + Kind */}
        <Block title="类目标签 / kind 标签条" span={6}>
          <div className="t-cap" style={{ marginBottom: 8 }}>CategoryBadge</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 18 }}><Badge cat="jewel" /><Badge cat="fresh" /><Badge cat="group" /><Badge cat="other" /></div>
          <div className="t-cap" style={{ marginBottom: 8 }}>kind 标签条</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><Kind k="open" /><Kind k="sell" /><Kind k="inter" /><Kind k="obj" /><Kind k="close" /></div>
        </Block>

        {/* InputBar */}
        <Block title="底部输入框 InputBar" note="默认 / 聚焦 / 禁用 / 含内容 · 多行自适应" span={7}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div><div className="t-cap" style={{ marginBottom: 6 }}>默认</div><div className="input-bar"><div className="fake-input placeholder">输入问题，例如：这条项链怎么介绍？</div></div></div>
            <div><div className="t-cap" style={{ marginBottom: 6 }}>聚焦（主色环）</div><div className="input-bar focus"><div className="fake-input placeholder">输入问题，例如：这条项链怎么介绍？<span className="caret" /></div></div></div>
            <div><div className="t-cap" style={{ marginBottom: 6 }}>含内容（多行）</div><div className="input-bar"><div className="fake-input">这条18K金珍珠项链怎么介绍给新进直播间的家人？讲讲材质和适合的人群。</div></div></div>
            <div><div className="t-cap" style={{ marginBottom: 6 }}>禁用（训练中）</div><div className="input-bar disabled"><div className="fake-input placeholder">训练中，暂不可输入…</div></div></div>
          </div>
        </Block>

        {/* MessageBubble */}
        <Block title="消息气泡 MessageBubble" note="用户 / 角色 / 自动台词 · 流式·完成·悬停复制" span={5}>
          <div style={{ background: "var(--bg-canvas)", borderRadius: 10, padding: 16 }}>
            <div className="msg-row user"><div className="bubble user">这条项链怎么介绍？</div></div>
            <div className="msg-row role"><div className="bubble role" style={{ position: "relative" }}>家人们看过来！这条是18K金镶天然淡水珍珠，光泽特别温润<span className="caret" /><button className="copy-fab">{I.copy}</button></div></div>
            <div className="msg-row role"><div className="bubble auto"><div className="auto-head"><Kind k="sell" /><span className="t-cap">自动台词</span></div><div className="auto-body">珠子颗颗圆润，戴上显气质，日常通勤、约会都能压得住场。</div></div></div>
          </div>
          <div className="t-cap" style={{ marginTop: 10 }}>角色气泡悬停露出复制按钮；流式时带 typing 光标。</div>
        </Block>

        {/* CharacterHeader */}
        <Block title="角色信息条 CharacterHeader" note="训练中 / 就绪 / 错误" span={12}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="char-header" style={{ border: "1px solid var(--border)", borderRadius: 10 }}>
              <Avatar color="violet" letter="雅" size={32} /><span className="t-block">珠宝主播·小雅</span><Badge cat="jewel" />
              <div style={{ flex: 1 }} /><span className="status-pill" style={{ color: "var(--text-2)" }}><span className="dot amber" />训练中 · 抽风格 3/4</span>
            </div>
            <div className="char-header" style={{ border: "1px solid var(--border)", borderRadius: 10 }}>
              <Avatar color="violet" letter="雅" size={32} /><span className="t-block">珠宝主播·小雅</span><Badge cat="jewel" />
              <div style={{ flex: 1 }} /><span className="status-pill" style={{ color: "var(--success)" }}><span className="dot green" />已就绪</span>
              <Btn variant="ghost" state="" style={{ height: 32 }}>校准</Btn><Btn variant="secondary" icon={I.upload} style={{ height: 32 }}>上传素材</Btn>
            </div>
            <div className="char-header" style={{ border: "1px solid var(--border)", borderRadius: 10 }}>
              <Avatar color="violet" letter="雅" size={32} /><span className="t-block">珠宝主播·小雅</span><Badge cat="jewel" />
              <div style={{ flex: 1 }} /><span className="status-pill" style={{ color: "var(--error)" }}><span className="dot red" />训练失败</span>
              <Btn variant="secondary" icon={I.refresh} style={{ height: 32 }}>重试</Btn>
            </div>
          </div>
        </Block>

        {/* Uploader */}
        <Block title="上传区 Uploader" note="拖拽·选文件·粘贴 · 默认 / 拖拽悬停 / 解析中 / 完成 / 失败" span={7}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div><div className="t-cap" style={{ marginBottom: 6 }}>默认</div>
              <div className="dropzone"><div className="ico">{I.upload}</div><div style={{ fontSize: 13, fontWeight: 500 }}>拖入文件，或<span style={{ color: "var(--primary)" }}>选择文件</span></div><div className="t-cap" style={{ marginTop: 4 }}>支持 .txt / .md · 也可粘贴文本</div></div>
            </div>
            <div><div className="t-cap" style={{ marginBottom: 6 }}>拖拽悬停</div>
              <div className="dropzone hover"><div className="ico" style={{ background: "#fff" }}>{I.file}</div><div style={{ fontSize: 13, fontWeight: 500, color: "var(--primary)" }}>松手即可上传</div><div className="t-cap" style={{ marginTop: 4 }}>珠宝主播直播稿.txt</div></div>
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            <div className="t-cap" style={{ marginBottom: 6 }}>解析中（分阶段进度）</div>
            <div className="stage-list" style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "4px 14px" }}>
              <div className="stage done"><span className="tick">{I.check}</span><span className="stage-label">切片</span></div>
              <div className="stage done"><span className="tick">{I.check}</span><span className="stage-label">向量化</span></div>
              <div className="stage active"><span className="tick"><span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} /></span><span className="stage-label">抽风格</span></div>
              <div className="stage todo"><span className="tick">4</span><span className="stage-label">抽范本</span></div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 14, marginTop: 14 }}>
            <div style={{ flex: 1 }}><div className="t-cap" style={{ marginBottom: 6 }}>完成</div><div className="toast success" style={{ width: "100%" }}><span className="ti">{I.check}</span>素材解析完成</div></div>
            <div style={{ flex: 1 }}><div className="t-cap" style={{ marginBottom: 6 }}>失败</div><div className="toast error" style={{ width: "100%" }}><span className="ti">{I.x}</span>解析失败，请重试</div></div>
          </div>
        </Block>

        {/* EmptyState + Toast + Copy/Export */}
        <Block title="EmptyState · Toast · 复制/导出" span={5}>
          <div className="empty" style={{ padding: 20, border: "1px dashed var(--border)", borderRadius: 12 }}>
            <div className="art">{I.sparkle}</div>
            <div><div className="t-block">先创建一个角色</div><p className="t-cap" style={{ marginTop: 6, maxWidth: 240 }}>上传 TA 的直播稿开始训练</p></div>
            <Btn variant="primary" icon={I.plus}>新建角色</Btn>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
            <div className="toast success"><span className="ti">{I.check}</span>训练完成</div>
            <div className="toast info"><span className="ti">{I.copy}</span>已复制到剪贴板</div>
            <div className="toast error"><span className="ti">{I.x}</span>操作失败</div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 16, alignItems: "center" }}>
            <button className="copy-fab" style={{ position: "static" }}>{I.copy}</button>
            <span className="t-cap">段内复制</span>
            <Btn variant="ghost" icon={I.download}>导出</Btn>
          </div>
        </Block>

        {/* Loading */}
        <Block title="Loading · 进度条 / 骨架屏" span={12}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 24, alignItems: "center" }}>
            <div>
              <div className="t-cap" style={{ marginBottom: 8 }}>训练进度条 · 62%</div>
              <div className="progress"><i style={{ width: "62%" }} /></div>
            </div>
            <div>
              <div className="t-cap" style={{ marginBottom: 8 }}>消息骨架屏</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div className="skel" style={{ height: 14, width: "70%" }} />
                <div className="skel" style={{ height: 14, width: "92%" }} />
                <div className="skel" style={{ height: 14, width: "48%" }} />
              </div>
            </div>
          </div>
        </Block>

      </div>
    </div>
  );
}

Object.assign(window, { ComponentLib });

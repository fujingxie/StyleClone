/* sec-modals.jsx — Section 4 弹窗/抽屉稿 → window.Modals
   每个弹窗叠在一层变暗的就绪态外壳上，读起来像真实状态 */

/* 背后变暗的外壳（复用就绪态，禁用交互） */
function BackShell({ rail = "jewel" }) {
  return (
    <div style={{ position: "absolute", inset: 0, filter: "saturate(.96)" }}>
      <Frame>
        <LeftRail sel={rail} />
        <MainCol header={<Header status="ready" />} footer={<Footer state="default" />}>
          <div className="empty" style={{ position: "absolute", inset: 0 }}>
            <div className="art">{I.sparkle}</div>
            <div>
              <div className="t-page" style={{ fontSize: 20 }}>小雅已就绪，问点什么试试</div>
              <p className="muted" style={{ marginTop: 8 }}>用 TA 的口吻生成开场、卖点、互动到逼单的整套话术。</p>
            </div>
          </div>
        </MainCol>
      </Frame>
    </div>
  );
}

/* 居中弹窗外层（暗背 + 居中盒） */
function ModalScrim({ width = 480, children, rail }) {
  return (
    <div className="sc" style={{ width: SCREEN_W, height: SCREEN_H, position: "relative", overflow: "hidden" }}>
      <BackShell rail={rail} />
      <div style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,.45)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="modal" style={{ width, boxShadow: "0 24px 64px rgba(15,23,42,.28)" }}>{children}</div>
      </div>
    </div>
  );
}

/* 右侧抽屉外层 */
function DrawerScrim({ width = 420, children, rail }) {
  return (
    <div className="sc" style={{ width: SCREEN_W, height: SCREEN_H, position: "relative", overflow: "hidden" }}>
      <BackShell rail={rail} />
      <div style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,.45)" }} />
      <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width }}>
        <div className="drawer">{children}</div>
      </div>
    </div>
  );
}

function ModalHead({ title, sub }) {
  return (
    <div className="modal-head">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h2 className="t-page" style={{ fontSize: 18 }}>{title}</h2>
          {sub && <p className="t-cap" style={{ marginTop: 4 }}>{sub}</p>}
        </div>
        <button className="copy-fab" style={{ position: "static", width: 28, height: 28 }}>{I.x}</button>
      </div>
    </div>
  );
}

/* ============================================================
   M1 · 新建角色
   ============================================================ */
function Modal1() {
  return (
    <ModalScrim width={500} rail="jewel">
      <ModalHead title="新建角色" sub="给分身起个名字，选好类目，上传 TA 的直播稿" />
      <div className="modal-body">
        <div className="field">
          <label>角色名称</label>
          <div className="input"><span>珠宝主播·小雅</span></div>
        </div>
        <div className="field">
          <label>类目</label>
          <div className="seg">
            <span className="opt sel">珠宝</span>
            <span className="opt">生鲜</span>
            <span className="opt">团购</span>
            <span className="opt">其他</span>
          </div>
        </div>
        <div className="field">
          <label>直播稿素材</label>
          <div className="dropzone" style={{ padding: 22 }}>
            <div className="ico">{I.upload}</div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>拖入文件，或 <span style={{ color: "var(--primary)" }}>选择文件</span></div>
            <div className="t-cap" style={{ marginTop: 4 }}>支持 .txt / .md · 也可直接粘贴文本</div>
          </div>
        </div>
      </div>
      <div className="modal-foot">
        <Btn variant="ghost">取消</Btn>
        <Btn variant="primary" icon={I.sparkle}>创建并训练</Btn>
      </div>
    </ModalScrim>
  );
}

/* ============================================================
   M2 · 风格设置（右侧抽屉）
   ============================================================ */
function Modal2() {
  return (
    <DrawerScrim width={440} rail="jewel">
      <div className="drawer-head">
        <div>
          <h2 className="t-page" style={{ fontSize: 18 }}>风格设置</h2>
          <p className="t-cap" style={{ marginTop: 4 }}>珠宝主播·小雅</p>
        </div>
        <button className="copy-fab" style={{ position: "static", width: 28, height: 28 }}>{I.x}</button>
      </div>
      <div className="drawer-body" style={{ overflow: "visible" }}>
        <div className="field">
          <label>风格强度</label>
          <div style={{ padding: "4px 4px 0" }}>
            <div className="slider"><div className="track"><div className="fill" style={{ width: "75%" }} /></div><div className="thumb dragging" style={{ left: "75%" }} /></div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}><span className="t-cap">更自由发挥</span><span className="t-cap">更贴近原话</span></div>
          </div>
          <p className="t-cap" style={{ color: "var(--text-3)" }}>当前 4/5 · 尽量复用 TA 的高频话术与口头禅</p>
        </div>
        <div className="divider" />
        <div className="field">
          <label>单条长度偏好</label>
          <div className="seg">
            <span className="opt">精简</span>
            <span className="opt sel">适中</span>
            <span className="opt">详尽</span>
          </div>
        </div>
        <div className="field">
          <label>口头禅 / 必带词</label>
          <div className="textarea" style={{ color: "var(--text-1)" }}>家人们、扣个 1、压得住场、骨折价</div>
          <p className="t-cap" style={{ color: "var(--text-3)" }}>逗号分隔，生成时会自然融入</p>
        </div>
        <div className="field">
          <label>规避词</label>
          <div className="textarea ph" style={{ minHeight: 48, color: "var(--text-3)" }}>例如：最便宜、全网最低…（违规词不会出现）</div>
        </div>
        <div style={{ flex: 1 }} />
      </div>
      <div className="modal-foot" style={{ borderTop: "1px solid var(--border)" }}>
        <Btn variant="ghost">恢复默认</Btn>
        <Btn variant="primary">保存设置</Btn>
      </div>
    </DrawerScrim>
  );
}

/* ============================================================
   M3 · 上传素材（已选文件 + 解析中）
   ============================================================ */
function Modal3() {
  return (
    <ModalScrim width={520} rail="jewel">
      <ModalHead title="上传素材" sub="为小雅补充更多直播稿，提升话术覆盖面" />
      <div className="modal-body">
        <div className="dropzone hover" style={{ padding: 20 }}>
          <div className="ico" style={{ background: "#fff" }}>{I.file}</div>
          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--primary)" }}>松手即可上传</div>
          <div className="t-cap" style={{ marginTop: 4 }}>珠宝主播直播稿_0605.txt</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, border: "1px solid var(--border)", borderRadius: 10, padding: "10px 14px" }}>
            <span style={{ color: "var(--primary)" }}>{I.file}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>珠宝主播直播稿_0605.txt</div>
              <div className="t-cap">3.8 万字 · 解析中</div>
            </div>
            <span className="spinner" style={{ color: "var(--primary)" }} />
          </div>
        </div>

        <div className="stage-list" style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "4px 14px" }}>
          <div className="stage done"><span className="tick">{I.check}</span><span className="stage-label">切片</span></div>
          <div className="stage active"><span className="tick"><span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} /></span><span className="stage-label">向量化</span></div>
          <div className="stage todo"><span className="tick">3</span><span className="stage-label">抽风格</span></div>
          <div className="stage todo"><span className="tick">4</span><span className="stage-label">抽范本</span></div>
        </div>
      </div>
      <div className="modal-foot">
        <Btn variant="ghost">取消</Btn>
        <Btn variant="primary" state="disabled">解析中…</Btn>
      </div>
    </ModalScrim>
  );
}

/* ============================================================
   M4 · 删除角色确认
   ============================================================ */
function Modal4() {
  return (
    <ModalScrim width={420} rail="jewel">
      <div className="modal-body" style={{ paddingTop: 24, gap: 14, alignItems: "flex-start" }}>
        <div style={{ display: "flex", gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, flex: "0 0 auto", background: "#FEE2E2", color: "var(--error)", display: "flex", alignItems: "center", justifyContent: "center" }}>{I.alert}</div>
          <div>
            <h2 className="t-page" style={{ fontSize: 17 }}>删除角色「珠宝主播·小雅」？</h2>
            <p className="muted" style={{ marginTop: 8, lineHeight: 1.7 }}>删除后该角色的训练结果与全部对话记录将一并清除，且无法恢复。</p>
          </div>
        </div>
      </div>
      <div className="modal-foot">
        <Btn variant="ghost">取消</Btn>
        <Btn variant="danger">删除角色</Btn>
      </div>
    </ModalScrim>
  );
}

Object.assign(window, { Modal1, Modal2, Modal3, Modal4 });

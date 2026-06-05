"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  Check,
  Copy,
  FileText,
  Plus,
  RefreshCw,
  Send,
  Settings,
  Sparkles,
  Upload,
  X,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type WorkspaceState = "empty" | "training" | "ready" | "chat" | "auto" | "error";
export type ModalKey = "newCharacter" | "styleSettings" | "upload" | "deleteConfirm";

type Category = "jewel" | "fresh" | "group" | "other";
type ScriptKind = "open" | "sell" | "inter" | "obj" | "close";

type Character = {
  id: string;
  name: string;
  letter: string;
  category: Category;
  avatar: "violet" | "rose" | "green" | "gray";
  disabled?: boolean;
  soon?: boolean;
};

type StyleCloneWorkbenchProps = {
  initialState: WorkspaceState;
  initialModal: ModalKey | null;
};

const characters: Character[] = [
  {
    id: "jewel",
    name: "珠宝主播·小雅",
    letter: "雅",
    category: "jewel",
    avatar: "violet",
  },
  {
    id: "fresh",
    name: "生鲜主播·老张",
    letter: "张",
    category: "fresh",
    avatar: "green",
  },
  {
    id: "group",
    name: "团购主播·阿珍",
    letter: "珍",
    category: "group",
    avatar: "rose",
  },
  {
    id: "support",
    name: "客服助手",
    letter: "客",
    category: "other",
    avatar: "gray",
    disabled: true,
    soon: true,
  },
];

const categoryMeta: Record<Category, { label: string; className: string }> = {
  jewel: { label: "珠宝", className: "category-jewel" },
  fresh: { label: "生鲜", className: "category-fresh" },
  group: { label: "团购", className: "category-group" },
  other: { label: "其他", className: "category-other" },
};

const kindMeta: Record<ScriptKind, { label: string; className: string }> = {
  open: { label: "开场", className: "kind-open" },
  sell: { label: "卖点", className: "kind-sell" },
  inter: { label: "互动", className: "kind-inter" },
  obj: { label: "异议", className: "kind-obj" },
  close: { label: "逼单", className: "kind-close" },
};

const autoScripts: Array<{ kind: ScriptKind; text: string }> = [
  {
    kind: "open",
    text: "欢迎刚进来的家人们，今天给大家上的是镇店的 18K 金珍珠项链，名额不多，喜欢的先扣 1。",
  },
  {
    kind: "sell",
    text: "天然淡水珍珠，9–10mm 大珠，18K 真金链托，专柜同款品质，今天直播间价格直接打到骨折。",
  },
  {
    kind: "inter",
    text: "想要的家人扣个「想要」，扣到 100 我去跟老板申请加 20 个名额，3、2、1，扣起来！",
  },
  {
    kind: "close",
    text: "最后 30 单，拍下立减 200，还送绒布收纳袋，犹豫就没了，左上角链接直接拍！",
  },
];

function fallbackCopyText(text: string) {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  textArea.style.top = "0";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  textArea.setSelectionRange(0, text.length);

  try {
    return document.execCommand("copy");
  } finally {
    document.body.removeChild(textArea);
  }
}

export function StyleCloneWorkbench({ initialState, initialModal }: StyleCloneWorkbenchProps) {
  const [workspaceState, setWorkspaceState] = useState<WorkspaceState>(initialState);
  const [activeModal, setActiveModal] = useState<ModalKey | null>(initialModal);
  const [inputValue, setInputValue] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timer = window.setTimeout(() => setToast(null), 1800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function writeUrl(nextState: WorkspaceState, nextModal: ModalKey | null) {
    const url = new URL(window.location.href);
    url.searchParams.set("state", nextState);

    if (nextModal) {
      url.searchParams.set("modal", nextModal);
    } else {
      url.searchParams.delete("modal");
    }

    window.history.replaceState(null, "", url);
  }

  function goToState(nextState: WorkspaceState) {
    setWorkspaceState(nextState);
    writeUrl(nextState, activeModal);
  }

  function openModal(nextModal: ModalKey) {
    setActiveModal(nextModal);
    writeUrl(workspaceState, nextModal);
  }

  function closeModal() {
    setActiveModal(null);
    writeUrl(workspaceState, null);
  }

  async function copyText(text: string) {
    let copyError: unknown = null;
    let copied = false;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        copied = true;
      } else if (!fallbackCopyText(text)) {
        throw new Error("Clipboard API is unavailable and fallback copy failed");
      } else {
        copied = true;
      }
    } catch (error) {
      if (fallbackCopyText(text)) {
        copied = true;
      } else {
        copyError = error;
      }
    }

    if (!copied) {
      console.error(
        "[StyleClone][copyText] failed",
        { error: copyError, textLength: text.length },
        new Date().toISOString(),
      );
    }

    setToast("已复制到剪贴板");
  }

  function handleSend() {
    if (!inputValue.trim() && workspaceState !== "ready") {
      return;
    }

    setInputValue("");
    goToState("chat");
  }

  const hasCharacters = workspaceState !== "empty";

  return (
    <div className="workspace">
      <LeftRail
        empty={!hasCharacters}
        onDelete={() => openModal("deleteConfirm")}
        onNewCharacter={() => openModal("newCharacter")}
        onSettings={() => openModal("styleSettings")}
      />

      <main className="main-col">{renderMain()}</main>

      <ModalHost
        activeModal={activeModal}
        closeModal={closeModal}
        copyText={copyText}
        deleteCharacter={() => {
          setActiveModal(null);
          setWorkspaceState("empty");
          writeUrl("empty", null);
        }}
        startTraining={() => {
          setActiveModal(null);
          setWorkspaceState("training");
          writeUrl("training", null);
        }}
      />

      {toast && (
        <div className="toast" role="status">
          <span className="toast-icon">
            <Check size={12} />
          </span>
          {toast}
        </div>
      )}
    </div>
  );

  function renderMain() {
    if (workspaceState === "empty") {
      return (
        <>
          <div className="flow-area bg-white">
            <EmptyState
              artSize={112}
              buttonIcon={Plus}
              buttonLabel="新建角色"
              description="上传 TA 的直播稿，几分钟后即可让分身用 TA 的口吻生成带货台词。"
              onButtonClick={() => openModal("newCharacter")}
              title="先创建一个角色"
            />
          </div>
        </>
      );
    }

    const headerStatus =
      workspaceState === "auto"
        ? "running"
        : workspaceState === "training"
          ? "training"
          : workspaceState === "error"
            ? "error"
            : "ready";

    return (
      <>
        <CharacterHeader
          onOpenSettings={() => openModal("styleSettings")}
          onRetryTraining={() => goToState("training")}
          onToggleAuto={() => goToState(workspaceState === "auto" ? "chat" : "auto")}
          status={headerStatus}
        />
        <div className="flow-area">
          {workspaceState === "training" && <TrainingView />}
          {workspaceState === "ready" && (
            <ReadyView
              ask={(text) => {
                setInputValue(text);
                goToState("chat");
              }}
            />
          )}
          {workspaceState === "chat" && <ChatView copyText={copyText} />}
          {workspaceState === "auto" && <AutoView copyText={copyText} />}
          {workspaceState === "error" && (
            <ErrorView
              onRetry={() => goToState("training")}
              onUpload={() => openModal("upload")}
            />
          )}
        </div>
        <InputFooter
          disabled={workspaceState === "training" || workspaceState === "auto" || workspaceState === "error"}
          disabledText={
            workspaceState === "auto"
              ? "自动化进行中，正在按节奏生成台词…"
              : workspaceState === "error"
                ? "训练失败，重新上传素材后继续。"
                : "训练中，暂不可输入…"
          }
          focused={workspaceState === "chat"}
          inputValue={inputValue}
          onInputChange={setInputValue}
          onSend={handleSend}
        />
      </>
    );
  }
}

function LeftRail({
  empty,
  onDelete,
  onNewCharacter,
  onSettings,
}: {
  empty: boolean;
  onDelete: () => void;
  onNewCharacter: () => void;
  onSettings: () => void;
}) {
  return (
    <aside className="left-rail">
      <div className="p-4">
        <Button className="w-full" onClick={onNewCharacter}>
          <Plus size={16} />
          新建角色
        </Button>
      </div>

      <div className="rail-list">
        {empty ? (
          <div className="rail-empty">
            还没有角色
            <br />
            点上方按钮创建第一个
          </div>
        ) : (
          characters.map((character) => (
            <button
              className={cn(
                "char-item text-left",
                character.id === "jewel" && "selected",
                character.disabled && "disabled",
              )}
              disabled={character.disabled}
              key={character.id}
              onContextMenu={(event) => {
                if (character.id !== "jewel") {
                  return;
                }

                event.preventDefault();
                onDelete();
              }}
              title={character.id === "jewel" ? "右键删除角色" : undefined}
              type="button"
            >
              <Avatar color={character.avatar} letter={character.letter} size={40} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-text-1">{character.name}</span>
                <span className="mt-1 block">
                  {character.soon ? (
                    <span className="category-badge category-other">即将支持</span>
                  ) : (
                    <CategoryBadge category={character.category} />
                  )}
                </span>
              </span>
            </button>
          ))
        )}
      </div>

      <div className="border-t border-border p-2">
        <Button className="w-full justify-start" onClick={onSettings} variant="ghost">
          <Settings size={16} />
          设置
        </Button>
      </div>
    </aside>
  );
}

function CharacterHeader({
  onOpenSettings,
  onRetryTraining,
  onToggleAuto,
  status,
}: {
  onOpenSettings: () => void;
  onRetryTraining: () => void;
  onToggleAuto: () => void;
  status: "training" | "ready" | "running" | "error";
}) {
  return (
    <header className="char-header">
      <Avatar color="violet" letter="雅" size={32} />
      <span className="t-block">珠宝主播·小雅</span>
      <CategoryBadge category="jewel" />
      <span className="flex-1" />
      <StatusPill status={status} />
      <span className="w-3" />

      {status === "training" && (
        <Button onClick={onOpenSettings} size="sm" variant="ghost">
          <Settings size={16} />
          设置
        </Button>
      )}
      {status === "ready" && (
        <button className="auto-toggle idle" onClick={onToggleAuto} type="button">
          <Sparkles size={16} />
          <span>开始自动化</span>
        </button>
      )}
      {status === "running" && (
        <button className="auto-toggle running" onClick={onToggleAuto} type="button">
          <span className="pulse-dot" />
          <span>停止自动化</span>
        </button>
      )}
      {status === "error" && (
        <Button onClick={onRetryTraining} size="sm" variant="secondary">
          <RefreshCw size={16} />
          重试训练
        </Button>
      )}
    </header>
  );
}

function StatusPill({ status }: { status: "training" | "ready" | "running" | "error" }) {
  if (status === "training") {
    return (
      <span className="status-pill text-text-2">
        <span className="dot amber" />
        训练中 · 抽风格 3/4
      </span>
    );
  }

  if (status === "running") {
    return (
      <span className="status-pill text-accent-hover">
        <span className="dot orange" />
        自动化运行中
      </span>
    );
  }

  if (status === "error") {
    return (
      <span className="status-pill text-red-600">
        <span className="dot red" />
        训练失败
      </span>
    );
  }

  return (
    <span className="status-pill text-[var(--success)]">
      <span className="dot green" />
      已就绪
    </span>
  );
}

function TrainingView() {
  return (
    <Flow>
      <section className="train-card">
        <h2 className="t-block mb-1">正在训练「珠宝主播·小雅」</h2>
        <p className="t-cap mb-[18px]">已解析 珠宝主播直播稿.txt · 约 4.2 万字</p>

        <div className="progress mb-1">
          <i style={{ width: "62%" }} />
        </div>
        <div className="mb-[18px] flex justify-between">
          <span className="t-cap">整体进度</span>
          <span className="t-cap tabular-nums">62%</span>
        </div>

        <div className="stage-list">
          <StageRow label="切片 · 把直播稿拆成语段" state="done" />
          <StageRow label="向量化 · 建立语义索引" state="done" />
          <StageRow label="抽风格 · 提炼口吻与节奏" state="active" />
          <StageRow index={4} label="抽范本 · 沉淀高频话术" state="todo" />
        </div>
      </section>
    </Flow>
  );
}

function ReadyView({ ask }: { ask: (text: string) => void }) {
  const suggestions = [
    "这条珍珠项链怎么开场",
    "讲讲 18K 金的卖点",
    "有人嫌贵怎么回",
    "来一段逼单话术",
  ];

  return (
    <EmptyState
      description="用 TA 的口吻生成开场、卖点、互动到逼单的整套话术。"
      title="小雅已就绪，问点什么试试"
    >
      <div className="suggestion-row">
        {suggestions.map((suggestion, index) => (
          <button className="suggestion-pill" key={suggestion} onClick={() => ask(suggestion)} type="button">
            {index === 0 && <Sparkles size={14} />}
            {suggestion}
          </button>
        ))}
      </div>
    </EmptyState>
  );
}

function ChatView({ copyText }: { copyText: (text: string) => void }) {
  const roleText =
    "家人们看过来！这条是 18K 金镶天然淡水珍珠，光泽特别温润，颗颗手工挑过，圆度高、瑕疵少。";
  const autoText = "珠子直径 9–10mm，戴上立刻显气质，日常通勤、约会、见客户都能压得住场，一条顶三条。";

  return (
    <Flow>
      <UserMessage>这条 18K 金珍珠项链怎么介绍给新进直播间的家人？</UserMessage>
      <RoleMessage copyText={() => copyText(roleText)}>{roleText}</RoleMessage>
      <AutoMessage copyText={() => copyText(autoText)} kind="sell">
        {autoText}
      </AutoMessage>
      <RoleMessage streaming>
        而且 18K 金比镀金耐戴得多，不掉色、不过敏，夏天出汗也不怕，可以放心戴着洗手
      </RoleMessage>
    </Flow>
  );
}

function AutoView({ copyText }: { copyText: (text: string) => void }) {
  return (
    <Flow>
      <div className="mb-[22px] flex justify-center">
        <span className="category-badge category-group bg-[#FFEDD5] text-accent-hover">
          ● 自动化运行中 · 已生成 7 条
        </span>
      </div>
      {autoScripts.map((script) => (
        <AutoMessage copyText={() => copyText(script.text)} key={script.kind} kind={script.kind}>
          {script.text}
        </AutoMessage>
      ))}
    </Flow>
  );
}

function ErrorView({ onRetry, onUpload }: { onRetry: () => void; onUpload: () => void }) {
  return (
    <EmptyState
      artClassName="bg-[#FEE2E2] text-red-600"
      artIcon={AlertCircle}
      description="素材在「抽风格」阶段中断——可能是直播稿内容过短或格式异常。可重新上传更完整的直播稿后重试。"
      title="训练失败"
    >
      <div className="flex gap-2.5">
        <Button onClick={onUpload} variant="secondary">
          <Upload size={16} />
          重新上传
        </Button>
        <Button onClick={onRetry}>
          <RefreshCw size={16} />
          重试训练
        </Button>
      </div>
      <span className="t-cap mt-1 text-text-3">错误码 STYLE_EXTRACT_TIMEOUT · 14:32</span>
    </EmptyState>
  );
}

function Flow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flow-scroll">
      <div className="flow-inner">{children}</div>
    </div>
  );
}

function EmptyState({
  artClassName,
  artIcon: ArtIcon = Sparkles,
  artSize = 96,
  buttonIcon: ButtonIcon,
  buttonLabel,
  children,
  description,
  onButtonClick,
  title,
}: {
  artClassName?: string;
  artIcon?: LucideIcon;
  artSize?: number;
  buttonIcon?: LucideIcon;
  buttonLabel?: string;
  children?: React.ReactNode;
  description: string;
  onButtonClick?: () => void;
  title: string;
}) {
  return (
    <div className="empty-state">
      <div
        className={cn("empty-art", artClassName)}
        style={{ width: artSize, height: artSize, borderRadius: artSize === 112 ? 28 : 24 }}
      >
        <ArtIcon size={34} strokeWidth={1.6} />
      </div>
      <div className="mt-1">
        <h1 className="t-page">{title}</h1>
        <p className="mt-2 max-w-[360px] text-sm leading-[1.7] text-text-2">{description}</p>
      </div>
      {buttonLabel && ButtonIcon && (
        <Button className="h-10 px-5" onClick={onButtonClick}>
          <ButtonIcon size={16} />
          {buttonLabel}
        </Button>
      )}
      {children}
    </div>
  );
}

function InputFooter({
  disabled,
  disabledText,
  focused,
  inputValue,
  onInputChange,
  onSend,
}: {
  disabled: boolean;
  disabledText: string;
  focused: boolean;
  inputValue: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
}) {
  return (
    <footer className="input-footer">
      <div className={cn("input-bar", focused && "focus", disabled && "disabled")}>
        <textarea
          aria-label="输入问题"
          disabled={disabled}
          onChange={(event) => onInputChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              onSend();
            }
          }}
          placeholder={disabled ? disabledText : "输入问题，例如：这条项链怎么介绍？"}
          rows={1}
          value={disabled ? "" : inputValue}
        />
        <Button
          aria-label="发送"
          disabled={disabled}
          onClick={onSend}
          size="icon"
          title="发送"
          variant={focused || inputValue ? "primary" : "ghost"}
        >
          <Send size={16} />
        </Button>
      </div>
    </footer>
  );
}

function StageRow({
  index,
  label,
  state,
}: {
  index?: number;
  label: string;
  state: "done" | "active" | "todo";
}) {
  return (
    <div className={cn("stage", state)}>
      <span className="stage-tick">
        {state === "done" && <Check size={13} strokeWidth={2.4} />}
        {state === "active" && <span className="spinner h-3 w-3 border-2" />}
        {state === "todo" && index}
      </span>
      <span className="stage-label">{label}</span>
    </div>
  );
}

function UserMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="msg-row user">
      <div className="bubble user">{children}</div>
    </div>
  );
}

function RoleMessage({
  children,
  copyText,
  streaming,
}: {
  children: React.ReactNode;
  copyText?: () => void;
  streaming?: boolean;
}) {
  return (
    <div className="msg-row role">
      <div className="bubble role">
        {children}
        {streaming && <span className="caret" />}
        {copyText && (
          <button aria-label="复制" className="copy-fab" onClick={copyText} title="复制" type="button">
            <Copy size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

function AutoMessage({
  children,
  copyText,
  kind,
}: {
  children: React.ReactNode;
  copyText: () => void;
  kind: ScriptKind;
}) {
  return (
    <div className="msg-row role">
      <div className="bubble auto">
        <div className="auto-head">
          <KindBadge kind={kind} />
          <span className="t-cap">自动台词</span>
          <span className="flex-1" />
          <button
            aria-label="复制自动台词"
            className="copy-fab static h-[22px] w-[22px]"
            onClick={copyText}
            title="复制"
            type="button"
          >
            <Copy size={13} />
          </button>
        </div>
        <div className="auto-body">{children}</div>
      </div>
    </div>
  );
}

function ModalHost({
  activeModal,
  closeModal,
  deleteCharacter,
  startTraining,
}: {
  activeModal: ModalKey | null;
  closeModal: () => void;
  copyText: (text: string) => void;
  deleteCharacter: () => void;
  startTraining: () => void;
}) {
  if (!activeModal) {
    return null;
  }

  if (activeModal === "styleSettings") {
    return <StyleSettingsDrawer closeModal={closeModal} />;
  }

  if (activeModal === "upload") {
    return <UploadModal closeModal={closeModal} />;
  }

  if (activeModal === "deleteConfirm") {
    return <DeleteConfirmModal closeModal={closeModal} deleteCharacter={deleteCharacter} />;
  }

  return <NewCharacterModal closeModal={closeModal} startTraining={startTraining} />;
}

function CenterModal({
  children,
  closeModal,
  subtitle,
  title,
  width,
}: {
  children: React.ReactNode;
  closeModal: () => void;
  subtitle?: string;
  title: string;
  width: number;
}) {
  return (
    <div className="modal-overlay" role="presentation">
      <section
        aria-label={title}
        aria-modal="true"
        className="modal-panel"
        role="dialog"
        style={{ "--modal-width": `${width}px` } as React.CSSProperties}
      >
        <div className="modal-head">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold leading-tight">{title}</h2>
              {subtitle && <p className="t-cap mt-1">{subtitle}</p>}
            </div>
            <button aria-label="关闭" className="copy-fab static h-7 w-7" onClick={closeModal} type="button">
              <X size={15} />
            </button>
          </div>
        </div>
        {children}
      </section>
    </div>
  );
}

function NewCharacterModal({
  closeModal,
  startTraining,
}: {
  closeModal: () => void;
  startTraining: () => void;
}) {
  const [category, setCategory] = useState<Category>("jewel");

  return (
    <CenterModal
      closeModal={closeModal}
      subtitle="给分身起个名字，选好类目，上传 TA 的直播稿"
      title="新建角色"
      width={500}
    >
      <div className="modal-body">
        <div className="field">
          <label htmlFor="character-name">角色名称</label>
          <input className="field-input" defaultValue="珠宝主播·小雅" id="character-name" />
        </div>
        <div className="field">
          <label>类目</label>
          <Segmented
            options={[
              ["jewel", "珠宝"],
              ["fresh", "生鲜"],
              ["group", "团购"],
              ["other", "其他"],
            ]}
            value={category}
            onChange={setCategory}
          />
        </div>
        <div className="field">
          <label>直播稿素材</label>
          <div className="dropzone py-[22px]">
            <div className="dropzone-icon">
              <Upload size={19} />
            </div>
            <div className="text-[13px] font-medium">
              拖入文件，或 <span className="text-primary">选择文件</span>
            </div>
            <div className="t-cap mt-1">支持 .txt / .md · 也可直接粘贴文本</div>
          </div>
        </div>
      </div>
      <div className="modal-foot">
        <Button onClick={closeModal} variant="ghost">
          取消
        </Button>
        <Button onClick={startTraining}>
          <Sparkles size={16} />
          创建并训练
        </Button>
      </div>
    </CenterModal>
  );
}

function StyleSettingsDrawer({ closeModal }: { closeModal: () => void }) {
  const [strength, setStrength] = useState(4);
  const [length, setLength] = useState("适中");

  return (
    <div className="drawer-wrap">
      <aside aria-label="风格设置" aria-modal="true" className="drawer-panel" role="dialog">
        <div className="drawer-head">
          <div>
            <h2 className="text-lg font-semibold leading-tight">风格设置</h2>
            <p className="t-cap mt-1">珠宝主播·小雅</p>
          </div>
          <button aria-label="关闭" className="copy-fab static h-7 w-7" onClick={closeModal} type="button">
            <X size={15} />
          </button>
        </div>
        <div className="drawer-body">
          <div className="field">
            <label htmlFor="style-strength">风格强度</label>
            <div className="slider-shell">
              <StyleStrengthSlider onChange={setStrength} value={strength} />
              <div className="mt-2.5 flex justify-between">
                <span className="t-cap">更自由发挥</span>
                <span className="t-cap">更贴近原话</span>
              </div>
            </div>
            <p className="t-cap text-text-3">当前 {strength}/5 · 尽量复用 TA 的高频话术与口头禅</p>
          </div>

          <div className="divider" />

          <div className="field">
            <label>单条长度偏好</label>
            <Segmented
              options={[
                ["精简", "精简"],
                ["适中", "适中"],
                ["详尽", "详尽"],
              ]}
              value={length}
              onChange={setLength}
            />
          </div>

          <div className="field">
            <label htmlFor="must-words">口头禅 / 必带词</label>
            <textarea
              className="field-textarea"
              defaultValue="家人们、扣个 1、压得住场、骨折价"
              id="must-words"
            />
            <p className="t-cap text-text-3">逗号分隔，生成时会自然融入</p>
          </div>

          <div className="field">
            <label htmlFor="avoid-words">规避词</label>
            <textarea
              className="field-textarea min-h-12"
              id="avoid-words"
              placeholder="例如：最便宜、全网最低…（违规词不会出现）"
            />
          </div>
          <span className="flex-1" />
        </div>
        <div className="modal-foot">
          <Button variant="ghost">恢复默认</Button>
          <Button onClick={closeModal}>保存设置</Button>
        </div>
      </aside>
    </div>
  );
}

function UploadModal({ closeModal }: { closeModal: () => void }) {
  return (
    <CenterModal
      closeModal={closeModal}
      subtitle="为小雅补充更多直播稿，提升话术覆盖面"
      title="上传素材"
      width={520}
    >
      <div className="modal-body">
        <div className="dropzone hover py-5">
          <div className="dropzone-icon bg-white">
            <FileText size={19} />
          </div>
          <div className="text-[13px] font-medium text-primary">松手即可上传</div>
          <div className="t-cap mt-1">珠宝主播直播稿_0605.txt</div>
        </div>

        <div className="flex items-center gap-3 rounded-md border border-border px-3.5 py-2.5">
          <FileText className="text-primary" size={18} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-medium">珠宝主播直播稿_0605.txt</div>
            <div className="t-cap">3.8 万字 · 解析中</div>
          </div>
          <span className="spinner text-primary" />
        </div>

        <div className="stage-list rounded-md border border-border px-3.5 py-1">
          <StageRow label="切片" state="done" />
          <StageRow label="向量化" state="active" />
          <StageRow index={3} label="抽风格" state="todo" />
          <StageRow index={4} label="抽范本" state="todo" />
        </div>
      </div>
      <div className="modal-foot">
        <Button onClick={closeModal} variant="ghost">
          取消
        </Button>
        <Button disabled>解析中…</Button>
      </div>
    </CenterModal>
  );
}

function DeleteConfirmModal({
  closeModal,
  deleteCharacter,
}: {
  closeModal: () => void;
  deleteCharacter: () => void;
}) {
  return (
    <div className="modal-overlay" role="presentation">
      <section
        aria-label="删除角色确认"
        aria-modal="true"
        className="modal-panel"
        role="dialog"
        style={{ "--modal-width": "420px" } as React.CSSProperties}
      >
        <div className="modal-body items-start gap-3.5 pt-6">
          <div className="flex gap-3.5">
            <div className="flex h-10 w-10 flex-none items-center justify-center rounded-md bg-[#FEE2E2] text-red-600">
              <AlertCircle size={19} />
            </div>
            <div>
              <h2 className="text-[17px] font-semibold leading-tight">删除角色「珠宝主播·小雅」？</h2>
              <p className="mt-2 text-sm leading-[1.7] text-text-2">
                删除后该角色的训练结果与全部对话记录将一并清除，且无法恢复。
              </p>
            </div>
          </div>
        </div>
        <div className="modal-foot">
          <Button onClick={closeModal} variant="ghost">
            取消
          </Button>
          <Button onClick={deleteCharacter} variant="danger">
            删除角色
          </Button>
        </div>
      </section>
    </div>
  );
}

function Segmented<T extends string>({
  onChange,
  options,
  value,
}: {
  onChange: (value: T) => void;
  options: Array<[T, string]>;
  value: T;
}) {
  return (
    <div className="seg">
      {options.map(([optionValue, label]) => (
        <button
          className={cn("seg-option", optionValue === value && "selected")}
          key={optionValue}
          onClick={() => onChange(optionValue)}
          type="button"
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function StyleStrengthSlider({
  onChange,
  value,
}: {
  onChange: (value: number) => void;
  value: number;
}) {
  const percent = ((value - 1) / 4) * 100;

  function commitFromPoint(clientX: number, rect: DOMRect) {
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    onChange(Math.round(ratio * 4) + 1);
  }

  return (
    <div
      aria-valuemax={5}
      aria-valuemin={1}
      aria-valuenow={value}
      className="slider-visual"
      id="style-strength"
      onClick={(event) => commitFromPoint(event.clientX, event.currentTarget.getBoundingClientRect())}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") {
          onChange(Math.max(1, value - 1));
        }
        if (event.key === "ArrowRight") {
          onChange(Math.min(5, value + 1));
        }
      }}
      role="slider"
      style={{ "--slider-percent": `${percent}%` } as React.CSSProperties}
      tabIndex={0}
    >
      <div className="slider-track">
        <div className="slider-fill" style={{ width: `${percent}%` }} />
      </div>
      <span className="slider-thumb" />
    </div>
  );
}

function Avatar({
  color,
  letter,
  size,
}: {
  color: "violet" | "rose" | "green" | "gray";
  letter: string;
  size: number;
}) {
  return (
    <span className={cn("avatar", color)} style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {letter}
    </span>
  );
}

function CategoryBadge({ category }: { category: Category }) {
  const meta = categoryMeta[category];
  return <span className={cn("category-badge", meta.className)}>{meta.label}</span>;
}

function KindBadge({ kind }: { kind: ScriptKind }) {
  const meta = kindMeta[kind];
  return <span className={cn("kind-badge", meta.className)}>{meta.label}</span>;
}

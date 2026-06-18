"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  Copy,
  Download,
  FileText,
  Menu,
  Pencil,
  Plus,
  RefreshCw,
  Send,
  Settings,
  Sparkles,
  Trash2,
  Upload,
  X,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type WorkspaceState = "empty" | "training" | "ready" | "chat" | "auto" | "error";
export type ModalKey = "newCharacter" | "styleSettings" | "upload" | "deleteConfirm" | "calibration" | "history";

type Category = "jewel" | "fresh" | "group" | "other";
type ScriptKind = "open" | "sell" | "inter" | "obj" | "close";
type AvatarColor = "violet" | "rose" | "green" | "gray";
type CharacterStatus = "training" | "ready" | "error";
type ChatRole = "user" | "assistant";

type Character = {
  id: string;
  name: string;
  avatarLetter: string;
  avatarColor: AvatarColor;
  category: Category;
  status: CharacterStatus;
  type: string;
  disabled?: boolean;
  soon?: boolean;
};

type ChatMessage = {
  id: string;
  role: ChatRole;
  streaming?: boolean;
  text: string;
};

type ToastKind = "success" | "error" | "info";

type ToastState = {
  id: string;
  kind: ToastKind;
  message: string;
};

type AutoScriptMessage = {
  id: string;
  kind: ScriptKind;
  streaming?: boolean;
  text: string;
};

type TrainingStatusSnapshot = {
  characterId: string;
  chunkCount: number;
  errorMessage: string | null;
  exemplarCount: number;
  filename: string | null;
  materialId: string | null;
  progress: number;
  stage: string;
  status: CharacterStatus;
  styleSummary: string | null;
  wordCount: number;
};

type CalibrationApiResponse = {
  error?: string;
  exemplarCount?: number;
  sample?: string | null;
  savedExtraCount?: number;
  styleStrength?: number;
};

type CalibrationRequestPayload = {
  extraExemplars: string;
  saveExtraExemplars?: boolean;
  saveOnly?: boolean;
  styleStrength: number;
};

type ConversationMode = "chat" | "auto";

type MessageHistoryItem = {
  content: string;
  createdAt: string;
  id: string;
  kind: string | null;
  role: "user" | "assistant" | "auto";
  sequence: number;
};

type MessageHistoryResponse = {
  conversation: {
    createdAt: string;
    id: string;
    mode: ConversationMode;
    title: string | null;
    updatedAt: string;
  } | null;
  error?: string;
  messages: MessageHistoryItem[];
};

type ConversationSummary = {
  createdAt: string;
  id: string;
  latestMessagePreview: string | null;
  messageCount: number;
  mode: ConversationMode;
  title: string | null;
  updatedAt: string;
};

type ConversationListResponse = {
  conversations: ConversationSummary[];
  error?: string;
};

type ConversationMutationResponse = {
  conversation: ConversationSummary;
  error?: string;
};

async function requestCharacterCalibration(characterId: string, payload: CalibrationRequestPayload) {
  const response = await fetch(`/api/characters/${encodeURIComponent(characterId)}/calibrate`, {
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  const data = (await response.json().catch(() => null)) as CalibrationApiResponse | null;

  if (!response.ok) {
    throw new Error(data?.error ?? `POST /api/characters/${characterId}/calibrate ${response.status}`);
  }

  return data ?? {};
}

async function requestMessageHistory(characterId: string, mode: ConversationMode, conversationId?: string | null) {
  const params = new URLSearchParams({
    limit: "120",
    mode,
  });

  if (conversationId) {
    params.set("conversationId", conversationId);
  }

  const response = await fetch(
    `/api/characters/${encodeURIComponent(characterId)}/messages?${params.toString()}`,
  );
  const data = (await response.json().catch(() => null)) as MessageHistoryResponse | null;

  if (!response.ok) {
    throw new Error(data?.error ?? `GET /api/characters/${characterId}/messages ${response.status}`);
  }

  return data ?? { conversation: null, messages: [] };
}

async function requestConversations(characterId: string, mode: ConversationMode) {
  const response = await fetch(
    `/api/characters/${encodeURIComponent(characterId)}/conversations?mode=${mode}&limit=40`,
  );
  const data = (await response.json().catch(() => null)) as ConversationListResponse | null;

  if (!response.ok) {
    throw new Error(data?.error ?? `GET /api/characters/${characterId}/conversations ${response.status}`);
  }

  return data?.conversations ?? [];
}

async function requestCreateConversation(characterId: string, mode: ConversationMode) {
  const response = await fetch(`/api/characters/${encodeURIComponent(characterId)}/conversations`, {
    body: JSON.stringify({ mode }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  const data = (await response.json().catch(() => null)) as ConversationMutationResponse | null;

  if (!response.ok || !data?.conversation) {
    throw new Error(data?.error ?? `POST /api/characters/${characterId}/conversations ${response.status}`);
  }

  return data.conversation;
}

async function requestRenameConversation(characterId: string, conversationId: string, title: string) {
  const response = await fetch(
    `/api/characters/${encodeURIComponent(characterId)}/conversations/${encodeURIComponent(conversationId)}`,
    {
      body: JSON.stringify({ title }),
      headers: { "Content-Type": "application/json" },
      method: "PATCH",
    },
  );
  const data = (await response.json().catch(() => null)) as ConversationMutationResponse | null;

  if (!response.ok || !data?.conversation) {
    throw new Error(data?.error ?? `PATCH conversation ${response.status}`);
  }

  return data.conversation;
}

async function requestDeleteConversation(characterId: string, conversationId: string) {
  const response = await fetch(
    `/api/characters/${encodeURIComponent(characterId)}/conversations/${encodeURIComponent(conversationId)}`,
    { method: "DELETE" },
  );
  const data = (await response.json().catch(() => null)) as { error?: string } | null;

  if (!response.ok) {
    throw new Error(data?.error ?? `DELETE conversation ${response.status}`);
  }
}

type StyleCloneWorkbenchProps = {
  initialState: WorkspaceState;
  initialModal: ModalKey | null;
};

const fallbackCharacter: Character = {
  id: "demo-jewel",
  name: "珠宝主播·小雅",
  avatarLetter: "雅",
  avatarColor: "violet",
  category: "jewel",
  status: "ready",
  type: "主播",
};

const supportCharacter: Character = {
  id: "support",
  name: "客服助手",
  avatarLetter: "客",
  avatarColor: "gray",
  category: "other",
  status: "ready",
  type: "客服",
  disabled: true,
  soon: true,
};

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

function isScriptKind(value: string | null): value is ScriptKind {
  return Boolean(value && value in kindMeta);
}

function isChatHistoryMessage(message: MessageHistoryItem): message is MessageHistoryItem & { role: ChatRole } {
  return message.role === "user" || message.role === "assistant";
}

function mapHistoryToChatMessages(messages: MessageHistoryItem[]): ChatMessage[] {
  return messages
    .filter(isChatHistoryMessage)
    .map((message) => ({
      id: message.id,
      role: message.role,
      text: message.content,
    }));
}

function mapHistoryToAutoMessages(messages: MessageHistoryItem[]): AutoScriptMessage[] {
  return messages
    .filter((message) => message.role === "auto")
    .map((message) => ({
      id: message.id,
      kind: isScriptKind(message.kind) ? message.kind : "sell",
      text: message.content,
    }));
}

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

function getCharacterNickname(character: Character) {
  return character.name.split("·").at(-1)?.trim() || character.name;
}

function createClientId() {
  return window.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createExportTimestamp(date = new Date()) {
  const pad = (value: number) => String(value).padStart(2, "0");

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    "-",
    pad(date.getHours()),
    pad(date.getMinutes()),
  ].join("");
}

function createExportFilename(character: Character, mode: "auto" | "chat") {
  const safeName = character.name.replace(/[\\/:*?"<>|]/g, "_");
  return `${safeName}-${mode === "auto" ? "自动台词" : "问答"}-${createExportTimestamp()}.txt`;
}

export function StyleCloneWorkbench({ initialState, initialModal }: StyleCloneWorkbenchProps) {
  const [workspaceState, setWorkspaceState] = useState<WorkspaceState>(initialState);
  const [activeModal, setActiveModal] = useState<ModalKey | null>(initialModal);
  const [autoConversations, setAutoConversations] = useState<ConversationSummary[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const autoAbortController = useRef<AbortController | null>(null);
  const [autoMessages, setAutoMessages] = useState<AutoScriptMessage[]>([]);
  const [characterLoadError, setCharacterLoadError] = useState<string | null>(null);
  const [chatConversations, setChatConversations] = useState<ConversationSummary[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [historyMode, setHistoryMode] = useState<ConversationMode>("chat");
  const [isAnswering, setIsAnswering] = useState(false);
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);
  const [isCharactersLoading, setIsCharactersLoading] = useState(true);
  const [isRailOpen, setIsRailOpen] = useState(false);
  const [selectedAutoConversationId, setSelectedAutoConversationId] = useState<string | null>(null);
  const [selectedChatConversationId, setSelectedChatConversationId] = useState<string | null>(null);
  const [selectedCharacterId, setSelectedCharacterId] = useState(fallbackCharacter.id);
  const [trainingStatus, setTrainingStatus] = useState<TrainingStatusSnapshot | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [toast, setToast] = useState<ToastState | null>(null);
  const selectedCharacter =
    characters.find((character) => character.id === selectedCharacterId) ?? characters[0] ?? fallbackCharacter;

  useEffect(() => {
    void refreshCharacters({ showLoading: true });
    // Initial character loading should run once when the workbench mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      autoAbortController.current?.abort();
    };
  }, []);

  useEffect(() => {
    setTrainingStatus(null);
  }, [selectedCharacterId]);

  useEffect(() => {
    if (isCharactersLoading || characters.length === 0) {
      return undefined;
    }

    let cancelled = false;

    async function loadHistory() {
      try {
        await loadConversationState(selectedCharacter.id);
        if (cancelled) {
          return;
        }
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error(
          "[StyleClone][loadMessageHistory] failed",
          { characterId: selectedCharacter.id, error },
          new Date().toISOString(),
        );
        showToast("读取历史消息失败", "error");
      }
    }

    void loadHistory();

    return () => {
      cancelled = true;
    };
    // History should reload when the selected character changes, not on every helper identity change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [characters.length, isCharactersLoading, selectedCharacter.id]);

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timer = window.setTimeout(() => setToast(null), toast.kind === "error" ? 3200 : 2000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (isCharactersLoading) {
      return undefined;
    }

    if (workspaceState !== "training" && selectedCharacter.status !== "training") {
      return undefined;
    }

    let cancelled = false;

    async function pollTrainingStatus() {
      try {
        const status = await fetchTrainingStatus(selectedCharacter.id);

        if (cancelled) {
          return;
        }

        setTrainingStatus(status);

        if (status.status === "ready") {
          await refreshCharacters();

          if (!cancelled && workspaceState === "training" && activeModal !== "upload") {
            setWorkspaceState("ready");
            writeUrl("ready", activeModal);
            showToast("训练完成", "success");
          }
        }

        if (status.status === "error" && workspaceState === "training") {
          setWorkspaceState("error");
          writeUrl("error", activeModal);
        }
      } catch (error) {
        if (!cancelled) {
          console.error(
            "[StyleClone][pollTrainingStatus] failed",
            { characterId: selectedCharacter.id, error },
            new Date().toISOString(),
          );
        }
      }
    }

    void pollTrainingStatus();
    const timer = window.setInterval(() => {
      void pollTrainingStatus();
    }, 1400);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
    // The polling window is controlled by selected character/status and workspace state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeModal, isCharactersLoading, selectedCharacter.id, selectedCharacter.status, workspaceState]);

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

  function showToast(message: string, kind: ToastKind = "success") {
    setToast({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      kind,
      message,
    });
  }

  async function fetchTrainingStatus(characterId: string) {
    const response = await fetch(`/api/characters/${encodeURIComponent(characterId)}/training-status`);
    const data = (await response.json().catch(() => null)) as {
      error?: string;
      status?: TrainingStatusSnapshot;
    } | null;

    if (!response.ok) {
      throw new Error(data?.error ?? `GET /api/characters/${characterId}/training-status ${response.status}`);
    }

    if (!data?.status) {
      throw new Error("训练状态为空");
    }

    return data.status;
  }

  async function refreshCharacters(options: { showLoading?: boolean } = {}) {
    if (options.showLoading) {
      setIsCharactersLoading(true);
    }

    try {
      const response = await fetch("/api/characters");

      if (!response.ok) {
        throw new Error(`GET /api/characters ${response.status}`);
      }

      const data = (await response.json()) as { characters?: Character[] };
      const nextCharacters = data.characters ?? [];
      setCharacters(nextCharacters);
      setCharacterLoadError(null);
      setSelectedCharacterId((currentId) => {
        if (nextCharacters.some((character) => character.id === currentId)) {
          return currentId;
        }

        return nextCharacters[0]?.id ?? fallbackCharacter.id;
      });
    } catch (error) {
      console.error("[StyleClone][refreshCharacters] failed", { error }, new Date().toISOString());
      const message = error instanceof Error ? error.message : "读取角色列表失败";
      setCharacterLoadError(message);
      showToast("读取角色列表失败", "error");
    } finally {
      if (options.showLoading) {
        setIsCharactersLoading(false);
      }
    }
  }

  async function refreshConversationLists(characterId = selectedCharacter.id) {
    const [chatList, autoList] = await Promise.all([
      requestConversations(characterId, "chat"),
      requestConversations(characterId, "auto"),
    ]);

    setChatConversations(chatList);
    setAutoConversations(autoList);
    setSelectedChatConversationId((current) =>
      current && chatList.some((conversation) => conversation.id === current) ? current : chatList[0]?.id ?? null,
    );
    setSelectedAutoConversationId((current) =>
      current && autoList.some((conversation) => conversation.id === current) ? current : autoList[0]?.id ?? null,
    );

    return { autoList, chatList };
  }

  async function loadConversationMessages(mode: ConversationMode, conversationId: string | null) {
    if (!conversationId) {
      if (mode === "chat") {
        setChatMessages([]);
      } else {
        setAutoMessages([]);
      }
      return [];
    }

    const history = await requestMessageHistory(selectedCharacter.id, mode, conversationId);

    if (mode === "chat") {
      setChatMessages(mapHistoryToChatMessages(history.messages));
    } else {
      setAutoMessages(mapHistoryToAutoMessages(history.messages));
    }

    return history.messages;
  }

  async function loadConversationState(characterId = selectedCharacter.id) {
    const { autoList, chatList } = await refreshConversationLists(characterId);
    const chatId = chatList[0]?.id ?? null;
    const autoId = autoList[0]?.id ?? null;
    const [chatHistory, autoHistory] = await Promise.all([
      chatId ? requestMessageHistory(characterId, "chat", chatId) : Promise.resolve({ conversation: null, messages: [] }),
      autoId ? requestMessageHistory(characterId, "auto", autoId) : Promise.resolve({ conversation: null, messages: [] }),
    ]);

    setSelectedChatConversationId(chatId);
    setSelectedAutoConversationId(autoId);

    if (!isAnswering) {
      setChatMessages(mapHistoryToChatMessages(chatHistory.messages));
    }

    if (!isAutoGenerating) {
      setAutoMessages(mapHistoryToAutoMessages(autoHistory.messages));
    }
  }

  async function selectConversation(mode: ConversationMode, conversationId: string) {
    try {
      const messages = await requestMessageHistory(selectedCharacter.id, mode, conversationId);

      if (mode === "chat") {
        setSelectedChatConversationId(conversationId);
        setChatMessages(mapHistoryToChatMessages(messages.messages));
        setWorkspaceState(messages.messages.length > 0 ? "chat" : "ready");
        writeUrl(messages.messages.length > 0 ? "chat" : "ready", null);
      } else {
        setSelectedAutoConversationId(conversationId);
        setAutoMessages(mapHistoryToAutoMessages(messages.messages));
        setWorkspaceState(messages.messages.length > 0 ? "auto" : "ready");
        writeUrl(messages.messages.length > 0 ? "auto" : "ready", null);
      }

      setActiveModal(null);
    } catch (error) {
      console.error(
        "[StyleClone][selectConversation] failed",
        { characterId: selectedCharacter.id, conversationId, error, mode },
        new Date().toISOString(),
      );
      showToast("切换会话失败", "error");
    }
  }

  async function createNewConversation(mode: ConversationMode) {
    try {
      const conversation = await requestCreateConversation(selectedCharacter.id, mode);

      if (mode === "chat") {
        setChatConversations((current) => [conversation, ...current]);
        setSelectedChatConversationId(conversation.id);
        setChatMessages([]);
      } else {
        setAutoConversations((current) => [conversation, ...current]);
        setSelectedAutoConversationId(conversation.id);
        setAutoMessages([]);
      }

      setWorkspaceState("ready");
      writeUrl("ready", "history");
      showToast(mode === "chat" ? "已新建问答会话" : "已新建自动台词会话", "success");
    } catch (error) {
      console.error(
        "[StyleClone][createNewConversation] failed",
        { characterId: selectedCharacter.id, error, mode },
        new Date().toISOString(),
      );
      showToast("新建会话失败", "error");
    }
  }

  async function renameExistingConversation(mode: ConversationMode, conversationId: string, title: string) {
    try {
      const conversation = await requestRenameConversation(selectedCharacter.id, conversationId, title);
      const update = (current: ConversationSummary[]) =>
        current
          .map((item) => (item.id === conversation.id ? { ...item, ...conversation } : item))
          .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt));

      if (mode === "chat") {
        setChatConversations(update);
      } else {
        setAutoConversations(update);
      }

      showToast("会话已重命名", "success");
    } catch (error) {
      console.error(
        "[StyleClone][renameExistingConversation] failed",
        { characterId: selectedCharacter.id, conversationId, error, mode },
        new Date().toISOString(),
      );
      showToast("重命名会话失败", "error");
    }
  }

  async function deleteExistingConversation(mode: ConversationMode, conversationId: string) {
    try {
      await requestDeleteConversation(selectedCharacter.id, conversationId);

      const currentList = mode === "chat" ? chatConversations : autoConversations;
      const nextList = currentList.filter((conversation) => conversation.id !== conversationId);
      const currentSelectedId = mode === "chat" ? selectedChatConversationId : selectedAutoConversationId;
      const selectedStillExists = Boolean(
        currentSelectedId &&
          currentSelectedId !== conversationId &&
          nextList.some((conversation) => conversation.id === currentSelectedId),
      );
      const nextConversationId = selectedStillExists ? currentSelectedId : nextList[0]?.id ?? null;
      const shouldSwitchConversation = currentSelectedId === conversationId || !selectedStillExists;
      let nextMessageCount = 0;

      if (mode === "chat") {
        setChatConversations(nextList);
        setSelectedChatConversationId(nextConversationId);
        if (shouldSwitchConversation) {
          nextMessageCount = (await loadConversationMessages("chat", nextConversationId)).length;
        }
      } else {
        setAutoConversations(nextList);
        setSelectedAutoConversationId(nextConversationId);
        if (shouldSwitchConversation) {
          nextMessageCount = (await loadConversationMessages("auto", nextConversationId)).length;
        }
      }

      if (shouldSwitchConversation) {
        const nextState = nextConversationId && nextMessageCount > 0 ? mode : "ready";
        setWorkspaceState(nextState);
        writeUrl(nextState, "history");
      }

      showToast("会话已删除", "success");
    } catch (error) {
      console.error(
        "[StyleClone][deleteExistingConversation] failed",
        { characterId: selectedCharacter.id, conversationId, error, mode },
        new Date().toISOString(),
      );
      showToast("删除会话失败", "error");
    }
  }

  async function createCharacter(input: { category: Category; name: string }) {
    try {
      const response = await fetch("/api/characters", {
        body: JSON.stringify({ ...input, status: "training", type: "主播" }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(`POST /api/characters ${response.status}`);
      }

      const data = (await response.json()) as { character: Character };
      setCharacters((current) => [...current, data.character]);
      setSelectedCharacterId(data.character.id);
      setActiveModal("upload");
      setWorkspaceState("training");
      writeUrl("training", "upload");
    } catch (error) {
      console.error("[StyleClone][createCharacter] failed", { error, input }, new Date().toISOString());
      showToast("创建角色失败", "error");
    }
  }

  async function uploadMaterial(input: { characterId: string; filename: string; text: string }) {
    try {
      const wordCount = input.text.replace(/\s+/g, "").length;

      setWorkspaceState("training");
      writeUrl("training", activeModal ?? "upload");
      setCharacters((current) =>
        current.map((character) =>
          character.id === input.characterId ? { ...character, status: "training" } : character,
        ),
      );
      setTrainingStatus({
        characterId: input.characterId,
        chunkCount: 0,
        errorMessage: null,
        exemplarCount: 0,
        filename: input.filename,
        materialId: null,
        progress: 10,
        stage: "切片",
        status: "training",
        styleSummary: null,
        wordCount,
      });

      const response = await fetch(`/api/characters/${input.characterId}/materials`, {
        body: JSON.stringify({ filename: input.filename, text: input.text }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? `POST /api/characters/${input.characterId}/materials ${response.status}`);
      }

      await refreshCharacters();
      setSelectedCharacterId(input.characterId);
      setActiveModal("calibration");
      setWorkspaceState("ready");
      writeUrl("ready", "calibration");
      showToast("素材训练完成，建议校准风格", "success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "素材训练失败";

      console.error(
        "[StyleClone][uploadMaterial] failed",
        { characterId: input.characterId, error },
        new Date().toISOString(),
      );
      setCharacters((current) =>
        current.map((character) =>
          character.id === input.characterId ? { ...character, status: "error" } : character,
        ),
      );
      setTrainingStatus((current) =>
        current?.characterId === input.characterId
          ? { ...current, errorMessage: message, progress: 0, stage: "失败", status: "error" }
          : current,
      );
      setWorkspaceState("error");
      writeUrl("error", activeModal);
      showToast("素材训练失败", "error");
      throw error;
    }
  }

  async function deleteSelectedCharacter() {
    const selected = characters.find((character) => character.id === selectedCharacterId);

    if (!selected) {
      setActiveModal(null);
      return;
    }

    try {
      const response = await fetch(`/api/characters/${selected.id}`, { method: "DELETE" });

      if (!response.ok) {
        throw new Error(`DELETE /api/characters/${selected.id} ${response.status}`);
      }

      const nextCharacters = characters.filter((character) => character.id !== selected.id);
      setCharacters(nextCharacters);
      setSelectedCharacterId(nextCharacters[0]?.id ?? fallbackCharacter.id);
      setActiveModal(null);

      if (nextCharacters.length === 0) {
        setWorkspaceState("empty");
        writeUrl("empty", null);
      } else {
        writeUrl(workspaceState, null);
      }
    } catch (error) {
      console.error(
        "[StyleClone][deleteSelectedCharacter] failed",
        { characterId: selected.id, error },
        new Date().toISOString(),
      );
      showToast("删除角色失败", "error");
    }
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

    showToast(copied ? "已复制到剪贴板" : "复制失败，请手动选择文本复制", copied ? "success" : "error");
  }

  async function sendMessage(text: string) {
    const message = text.trim();

    if (!message || isAnswering) {
      return;
    }

    const assistantId = createClientId();
    const userId = createClientId();

    setChatMessages((current) => [
      ...current,
      { id: userId, role: "user", text: message },
      { id: assistantId, role: "assistant", streaming: true, text: "" },
    ]);
    setInputValue("");
    goToState("chat");

    try {
      setIsAnswering(true);

      const response = await fetch(`/api/characters/${selectedCharacter.id}/chat`, {
        body: JSON.stringify({
          conversationId: selectedChatConversationId,
          message,
          topK: 5,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? `POST /api/characters/${selectedCharacter.id}/chat ${response.status}`);
      }

      if (!response.body) {
        throw new Error("Chat response body is empty");
      }

      await readChatStream(response.body, assistantId);
    } catch (error) {
      console.error(
        "[StyleClone][sendMessage] failed",
        { characterId: selectedCharacter.id, error },
        new Date().toISOString(),
      );
      setChatMessages((current) =>
        current.map((item) =>
          item.id === assistantId
            ? { ...item, streaming: false, text: "生成回复失败，请稍后重试。" }
            : item,
        ),
      );
      showToast("生成回复失败", "error");
    } finally {
      setIsAnswering(false);
      void refreshConversationLists();
    }
  }

  async function readChatStream(body: ReadableStream<Uint8Array>, assistantId: string) {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split("\n\n");
      buffer = events.pop() ?? "";

      for (const eventText of events) {
        handleChatStreamEvent(eventText, assistantId);
      }
    }

    setChatMessages((current) =>
      current.map((item) => (item.id === assistantId ? { ...item, streaming: false } : item)),
    );
  }

  function handleChatStreamEvent(eventText: string, assistantId: string) {
    const event = eventText
      .split("\n")
      .find((line) => line.startsWith("event:"))
      ?.slice(6)
      .trim();
    const dataText = eventText
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim())
      .join("\n");

    if (!event || !dataText) {
      return;
    }

    const data = JSON.parse(dataText) as { conversationId?: string; message?: string; text?: string };

    if (data.conversationId) {
      setSelectedChatConversationId(data.conversationId);
    }

    if (event === "delta" && data.text) {
      setChatMessages((current) =>
        current.map((item) =>
          item.id === assistantId ? { ...item, text: `${item.text}${data.text}` } : item,
        ),
      );
    }

    if (event === "done") {
      setChatMessages((current) =>
        current.map((item) =>
          item.id === assistantId ? { ...item, streaming: false, text: data.text ?? item.text } : item,
        ),
      );
    }

    if (event === "error") {
      throw new Error(data.message ?? "Chat stream error");
    }
  }

  function handleSend() {
    void sendMessage(inputValue);
  }

  async function startAutoGeneration() {
    if (isAutoGenerating) {
      return;
    }

    const controller = new AbortController();
    autoAbortController.current = controller;
    setAutoMessages([]);
    setIsAutoGenerating(true);
    goToState("auto");

    try {
      const selectedAutoConversation = autoConversations.find(
        (conversation) => conversation.id === selectedAutoConversationId,
      );
      const conversationId =
        selectedAutoConversation && selectedAutoConversation.messageCount === 0 ? selectedAutoConversation.id : null;
      const response = await fetch(`/api/characters/${selectedCharacter.id}/auto/start`, {
        body: JSON.stringify({ conversationId, maxSegments: 12 }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
        signal: controller.signal,
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? `POST /api/characters/${selectedCharacter.id}/auto/start ${response.status}`);
      }

      if (!response.body) {
        throw new Error("Auto response body is empty");
      }

      await readAutoStream(response.body);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        console.error(
          "[StyleClone][startAutoGeneration] failed",
          { characterId: selectedCharacter.id, error },
          new Date().toISOString(),
        );
        showToast("自动生成失败", "error");
      }
    } finally {
      setIsAutoGenerating(false);
      autoAbortController.current = null;
      void refreshConversationLists();
    }
  }

  async function stopAutoGeneration() {
    autoAbortController.current?.abort();
    autoAbortController.current = null;
    setIsAutoGenerating(false);
    goToState(autoMessages.length > 0 ? "auto" : "ready");

    try {
      await fetch(`/api/characters/${selectedCharacter.id}/auto/stop`, { method: "POST" });
    } catch (error) {
      console.error(
        "[StyleClone][stopAutoGeneration] failed",
        { characterId: selectedCharacter.id, error },
        new Date().toISOString(),
      );
    }
  }

  function getExportPayload() {
    const exportedAt = new Date().toLocaleString("zh-CN", { hour12: false });

    if (workspaceState === "auto" && autoMessages.some((message) => message.text.trim())) {
      const body = autoMessages
        .filter((message) => message.text.trim())
        .map((message, index) => {
          const kindLabel = kindMeta[message.kind].label;
          return `【${index + 1}. ${kindLabel}】\n${message.text.trim()}`;
        })
        .join("\n\n");

      return {
        filename: createExportFilename(selectedCharacter, "auto"),
        text: [`角色：${selectedCharacter.name}`, `模式：自动台词`, `导出时间：${exportedAt}`, "", body].join("\n"),
      };
    }

    if (workspaceState === "chat" && chatMessages.some((message) => message.text.trim())) {
      const body = chatMessages
        .filter((message) => message.text.trim())
        .map((message) => {
          const role = message.role === "user" ? "用户" : selectedCharacter.name;
          return `【${role}】\n${message.text.trim()}`;
        })
        .join("\n\n");

      return {
        filename: createExportFilename(selectedCharacter, "chat"),
        text: [`角色：${selectedCharacter.name}`, `模式：问答`, `导出时间：${exportedAt}`, "", body].join("\n"),
      };
    }

    return null;
  }

  async function copyCurrentExport() {
    const payload = getExportPayload();

    if (!payload) {
      showToast("暂无可复制内容", "info");
      return;
    }

    await copyText(payload.text);
    showToast("已复制全部内容", "success");
  }

  function downloadCurrentExport() {
    const payload = getExportPayload();

    if (!payload) {
      showToast("暂无可下载内容", "info");
      return;
    }

    const url = window.URL.createObjectURL(new Blob([payload.text], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = payload.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    showToast("已下载台词文件", "success");
  }

  async function readAutoStream(body: ReadableStream<Uint8Array>) {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split("\n\n");
      buffer = events.pop() ?? "";

      for (const eventText of events) {
        handleAutoStreamEvent(eventText);
      }
    }
  }

  function handleAutoStreamEvent(eventText: string) {
    const event = eventText
      .split("\n")
      .find((line) => line.startsWith("event:"))
      ?.slice(6)
      .trim();
    const dataText = eventText
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim())
      .join("\n");

    if (!event || !dataText) {
      return;
    }

    const data = JSON.parse(dataText) as {
      conversationId?: string;
      id?: string;
      kind?: ScriptKind;
      message?: string;
      text?: string;
    };

    if (data.conversationId) {
      setSelectedAutoConversationId(data.conversationId);
    }

    if (event === "segment-start" && data.id && data.kind) {
      const segmentId = data.id;
      const kind = data.kind;

      setAutoMessages((current) => [
        ...current,
        { id: segmentId, kind, streaming: true, text: "" },
      ]);
    }

    if (event === "delta" && data.id && data.text) {
      setAutoMessages((current) =>
        current.map((item) => (item.id === data.id ? { ...item, text: `${item.text}${data.text}` } : item)),
      );
    }

    if (event === "segment-done" && data.id) {
      setAutoMessages((current) =>
        current.map((item) =>
          item.id === data.id ? { ...item, streaming: false, text: data.text ?? item.text } : item,
        ),
      );
    }

    if (event === "error") {
      throw new Error(data.message ?? "Auto stream error");
    }
  }

  const hasCharacters = !isCharactersLoading && workspaceState !== "empty" && characters.length > 0;
  const canExport =
    (workspaceState === "chat" && chatMessages.some((message) => message.text.trim())) ||
    (workspaceState === "auto" && autoMessages.some((message) => message.text.trim()));

  return (
    <div className={cn("workspace", isRailOpen && "rail-open")}>
      <button
        aria-label="打开角色列表"
        className="rail-toggle"
        onClick={() => setIsRailOpen(true)}
        title="角色列表"
        type="button"
      >
        <Menu size={18} />
      </button>
      <button aria-label="关闭角色列表" className="rail-scrim" onClick={() => setIsRailOpen(false)} type="button" />
      <LeftRail
        characters={hasCharacters ? [...characters, supportCharacter] : []}
        empty={!hasCharacters}
        loading={isCharactersLoading}
        onClose={() => setIsRailOpen(false)}
        onDelete={() => {
          setIsRailOpen(false);
          openModal("deleteConfirm");
        }}
        onNewCharacter={() => {
          setIsRailOpen(false);
          openModal("newCharacter");
        }}
        onSelect={(id) => {
          setSelectedCharacterId(id);
          setIsRailOpen(false);
        }}
        onSettings={() => {
          setIsRailOpen(false);
          openModal("styleSettings");
        }}
        selectedCharacterId={selectedCharacterId}
      />

      <main className="main-col">{renderMain()}</main>

      <ModalHost
        activeModal={activeModal}
        autoConversations={autoConversations}
        character={selectedCharacter}
        chatConversations={chatConversations}
        closeModal={closeModal}
        createCharacter={createCharacter}
        deleteCharacter={deleteSelectedCharacter}
        historyMode={historyMode}
        onCalibrationSaved={(savedExtraCount) => {
          showToast(savedExtraCount > 0 ? `已保存 ${savedExtraCount} 条校准范本` : "风格校准完成", "success");
        }}
        onCreateConversation={(mode) => void createNewConversation(mode)}
        onDeleteConversation={(mode, conversationId) => void deleteExistingConversation(mode, conversationId)}
        onHistoryModeChange={setHistoryMode}
        onRenameConversation={(mode, conversationId, title) =>
          void renameExistingConversation(mode, conversationId, title)
        }
        onSelectConversation={(mode, conversationId) => void selectConversation(mode, conversationId)}
        selectedAutoConversationId={selectedAutoConversationId}
        selectedChatConversationId={selectedChatConversationId}
        uploadMaterial={uploadMaterial}
      />

      {toast && (
        <div className={cn("toast", toast.kind)} key={toast.id} role={toast.kind === "error" ? "alert" : "status"}>
          <span className="toast-icon">
            {toast.kind === "error" ? <AlertCircle size={12} /> : <Check size={12} />}
          </span>
          {toast.message}
        </div>
      )}
    </div>
  );

  function renderMain() {
    if (isCharactersLoading) {
      return (
        <div className="flow-area bg-white">
          <LoadingState description="正在读取本地角色、素材和训练状态。" title="加载角色库" />
        </div>
      );
    }

    if (characterLoadError && characters.length === 0) {
      return (
        <div className="flow-area bg-white">
          <LoadErrorView
            description={characterLoadError}
            onRetry={() => void refreshCharacters({ showLoading: true })}
          />
        </div>
      );
    }

    if (workspaceState === "empty" || characters.length === 0) {
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
      workspaceState === "auto" && isAutoGenerating
        ? "running"
        : workspaceState === "training"
          ? "training"
          : workspaceState === "error"
            ? "error"
            : "ready";

    return (
      <>
        <CharacterHeader
          canExport={canExport}
          character={selectedCharacter}
          onCopyAll={() => void copyCurrentExport()}
          onDownloadExport={downloadCurrentExport}
          onOpenCalibration={() => openModal("calibration")}
          onOpenHistory={() => {
            setHistoryMode(workspaceState === "auto" ? "auto" : "chat");
            openModal("history");
          }}
          onOpenSettings={() => openModal("styleSettings")}
          onRetryTraining={() => openModal("upload")}
          onToggleAuto={() => {
            if (workspaceState === "auto") {
              void stopAutoGeneration();
            } else {
              void startAutoGeneration();
            }
          }}
          onUploadMaterial={() => openModal("upload")}
          status={headerStatus}
          trainingStatus={trainingStatus}
        />
        <div className="flow-area">
          {workspaceState === "training" && <TrainingView character={selectedCharacter} status={trainingStatus} />}
          {workspaceState === "ready" && (
            <ReadyView
              character={selectedCharacter}
              ask={(text) => {
                void sendMessage(text);
              }}
            />
          )}
          {workspaceState === "chat" && <ChatView copyText={copyText} messages={chatMessages} />}
          {workspaceState === "auto" && (
            <AutoView
              copyText={copyText}
              generatedCount={isAutoGenerating || autoMessages.length > 0 ? autoMessages.length : 7}
              running={isAutoGenerating || autoMessages.length === 0}
              messages={autoMessages}
            />
          )}
          {workspaceState === "error" && (
            <ErrorView
              status={trainingStatus}
              onRefresh={() => {
                void fetchTrainingStatus(selectedCharacter.id)
                  .then((status) => {
                    setTrainingStatus(status);
                    showToast("训练状态已刷新", "info");
                  })
                  .catch((error) => {
                    console.error(
                      "[StyleClone][ErrorView][refresh] failed",
                      { characterId: selectedCharacter.id, error },
                      new Date().toISOString(),
                    );
                    showToast("刷新训练状态失败", "error");
                  });
              }}
              onUpload={() => openModal("upload")}
            />
          )}
        </div>
        <InputFooter
          disabled={
            workspaceState === "training" || (workspaceState === "auto" && isAutoGenerating) || workspaceState === "error"
          }
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
          sending={isAnswering}
        />
      </>
    );
  }
}

function LeftRail({
  characters,
  empty,
  loading,
  onClose,
  onDelete,
  onNewCharacter,
  onSelect,
  onSettings,
  selectedCharacterId,
}: {
  characters: Character[];
  empty: boolean;
  loading: boolean;
  onClose: () => void;
  onDelete: () => void;
  onNewCharacter: () => void;
  onSelect: (id: string) => void;
  onSettings: () => void;
  selectedCharacterId: string;
}) {
  return (
    <aside className="left-rail">
      <div className="rail-head p-4">
        <Button className="w-full" onClick={onNewCharacter}>
          <Plus size={16} />
          新建角色
        </Button>
        <button aria-label="关闭角色列表" className="rail-close" onClick={onClose} type="button">
          <X size={16} />
        </button>
      </div>

      <div className="rail-list">
        {loading ? (
          <div className="rail-skeleton">
            {Array.from({ length: 4 }).map((_, index) => (
              <div className="rail-skeleton-row" key={index}>
                <span className="skeleton-circle" />
                <span className="min-w-0 flex-1">
                  <span className="skeleton-line w-[72%]" />
                  <span className="skeleton-line mt-2 w-[42%]" />
                </span>
              </div>
            ))}
          </div>
        ) : empty ? (
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
                character.id === selectedCharacterId && "selected",
                character.disabled && "disabled",
              )}
              disabled={character.disabled}
              key={character.id}
              onClick={() => onSelect(character.id)}
              onContextMenu={(event) => {
                if (character.disabled) {
                  return;
                }

                event.preventDefault();
                onSelect(character.id);
                onDelete();
              }}
              title={character.disabled ? undefined : "右键删除角色"}
              type="button"
            >
              <Avatar color={character.avatarColor} letter={character.avatarLetter} size={40} />
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
  canExport,
  character,
  onCopyAll,
  onDownloadExport,
  onOpenCalibration,
  onOpenHistory,
  onOpenSettings,
  onRetryTraining,
  onToggleAuto,
  onUploadMaterial,
  status,
  trainingStatus,
}: {
  canExport: boolean;
  character: Character;
  onCopyAll: () => void;
  onDownloadExport: () => void;
  onOpenCalibration: () => void;
  onOpenHistory: () => void;
  onOpenSettings: () => void;
  onRetryTraining: () => void;
  onToggleAuto: () => void;
  onUploadMaterial: () => void;
  status: "training" | "ready" | "running" | "error";
  trainingStatus: TrainingStatusSnapshot | null;
}) {
  return (
    <header className="char-header">
      <Avatar color={character.avatarColor} letter={character.avatarLetter} size={32} />
      <span className="t-block">{character.name}</span>
      <CategoryBadge category={character.category} />
      <span className="flex-1" />
      <StatusPill status={status} trainingStatus={trainingStatus} />
      <span className="w-3" />

      {canExport && (
        <>
          <Button onClick={onCopyAll} size="sm" title="复制全部内容" variant="secondary">
            <Copy size={16} />
            复制全部
          </Button>
          <Button onClick={onDownloadExport} size="sm" title="下载台词文本" variant="secondary">
            <Download size={16} />
            下载
          </Button>
        </>
      )}

      {status === "training" && (
        <>
          <Button onClick={onUploadMaterial} size="sm" variant="secondary">
            <Upload size={16} />
            上传素材
          </Button>
          <Button onClick={onOpenSettings} size="sm" variant="ghost">
            <Settings size={16} />
            设置
          </Button>
        </>
      )}
      {status === "ready" && (
        <>
          <Button onClick={onOpenHistory} size="sm" variant="secondary">
            <FileText size={16} />
            历史
          </Button>
          <Button onClick={onOpenCalibration} size="sm" variant="secondary">
            <Sparkles size={16} />
            校准
          </Button>
          <Button onClick={onUploadMaterial} size="sm" variant="secondary">
            <Upload size={16} />
            上传素材
          </Button>
          <button className="auto-toggle idle" onClick={onToggleAuto} type="button">
            <Sparkles size={16} />
            <span>开始自动化</span>
          </button>
        </>
      )}
      {status === "running" && (
        <button className="auto-toggle running" onClick={onToggleAuto} type="button">
          <span className="pulse-dot" />
          <span>停止自动化</span>
        </button>
      )}
      {status === "error" && (
        <Button onClick={onRetryTraining} size="sm" variant="secondary">
          <Upload size={16} />
          重新上传
        </Button>
      )}
    </header>
  );
}

function StatusPill({
  status,
  trainingStatus,
}: {
  status: "training" | "ready" | "running" | "error";
  trainingStatus: TrainingStatusSnapshot | null;
}) {
  if (status === "training") {
    const label = trainingStatus
      ? `训练中 · ${trainingStatus.stage} ${trainingStatus.progress}%`
      : "训练中 · 等待素材";

    return (
      <span className="status-pill text-text-2">
        <span className="dot amber" />
        {label}
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

function formatWordCount(wordCount: number) {
  if (wordCount >= 10_000) {
    return `${(wordCount / 10_000).toFixed(1)} 万字`;
  }

  return `${wordCount.toLocaleString()} 字`;
}

function getTrainingStageIndex(stage: string) {
  if (stage.includes("向量")) {
    return 1;
  }
  if (stage.includes("抽风格")) {
    return 2;
  }
  if (stage.includes("抽范本") || stage.includes("完成")) {
    return 3;
  }

  return 0;
}

function getStageState(input: {
  index: number;
  stageIndex: number;
  status: CharacterStatus;
}): "done" | "active" | "todo" | "error" {
  if (input.status === "ready") {
    return "done";
  }
  if (input.status === "error" && input.index === input.stageIndex) {
    return "error";
  }
  if (input.index < input.stageIndex) {
    return "done";
  }
  if (input.index === input.stageIndex) {
    return "active";
  }

  return "todo";
}

function TrainingView({ character, status }: { character: Character; status: TrainingStatusSnapshot | null }) {
  const progress = Math.min(100, Math.max(0, status?.progress ?? 10));
  const stage = status?.stage ?? "等待素材";
  const stageIndex = getTrainingStageIndex(stage);
  const statusLabel = status?.filename
    ? `${status.filename} · ${formatWordCount(status.wordCount)}`
    : "等待上传素材后开始训练";
  const rows = [
    {
      label: status?.chunkCount ? `切片 · 已拆 ${status.chunkCount} 段` : "切片 · 把直播稿拆成语段",
    },
    { label: "向量化 · 建立语义索引" },
    { label: "抽风格 · 提炼口吻与节奏" },
    {
      label: status?.exemplarCount ? `抽范本 · 已沉淀 ${status.exemplarCount} 条` : "抽范本 · 沉淀高频话术",
    },
  ];

  return (
    <Flow>
      <section className="train-card">
        <h2 className="t-block mb-1">正在训练「{character.name}」</h2>
        <p className="t-cap mb-[18px]">{statusLabel}</p>

        <div className="progress mb-1">
          <i style={{ width: `${progress}%` }} />
        </div>
        <div className="mb-[18px] flex justify-between">
          <span className="t-cap">当前阶段：{stage}</span>
          <span className="t-cap tabular-nums">{progress}%</span>
        </div>

        <div className="stage-list">
          {rows.map((row, index) => (
            <StageRow
              index={index + 1}
              key={row.label}
              label={row.label}
              state={getStageState({
                index,
                stageIndex,
                status: status?.status ?? "training",
              })}
            />
          ))}
        </div>
      </section>
    </Flow>
  );
}

function ReadyView({ ask, character }: { ask: (text: string) => void; character: Character }) {
  const suggestions = [
    "这条珍珠项链怎么开场",
    "讲讲 18K 金的卖点",
    "有人嫌贵怎么回",
    "来一段逼单话术",
  ];

  return (
    <EmptyState
      description="用 TA 的口吻生成开场、卖点、互动到逼单的整套话术。"
      title={`${getCharacterNickname(character)}已就绪，问点什么试试`}
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

function ChatView({ copyText, messages }: { copyText: (text: string) => void; messages: ChatMessage[] }) {
  const roleText =
    "家人们看过来！这条是 18K 金镶天然淡水珍珠，光泽特别温润，颗颗手工挑过，圆度高、瑕疵少。";
  const autoText = "珠子直径 9–10mm，戴上立刻显气质，日常通勤、约会、见客户都能压得住场，一条顶三条。";

  if (messages.length > 0) {
    return (
      <Flow>
        {messages.map((message) =>
          message.role === "user" ? (
            <UserMessage key={message.id}>{message.text}</UserMessage>
          ) : (
            <RoleMessage
              copyText={message.text && !message.streaming ? () => copyText(message.text) : undefined}
              key={message.id}
              streaming={message.streaming}
            >
              {message.text || " "}
            </RoleMessage>
          ),
        )}
      </Flow>
    );
  }

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

function AutoView({
  copyText,
  generatedCount,
  messages,
  running,
}: {
  copyText: (text: string) => void;
  generatedCount: number;
  messages: AutoScriptMessage[];
  running: boolean;
}) {
  return (
    <Flow>
      <div className="mb-[22px] flex justify-center">
        <span className="category-badge category-group bg-[#FFEDD5] text-accent-hover">
          ● {running ? "自动化运行中" : "自动化已停止"} · 已生成 {generatedCount} 条
        </span>
      </div>
      {messages.length > 0
        ? messages.map((message) => (
            <AutoMessage
              copyText={() => {
                if (message.text && !message.streaming) {
                  void copyText(message.text);
                }
              }}
              key={message.id}
              kind={message.kind}
              streaming={message.streaming}
            >
              {message.text || " "}
            </AutoMessage>
          ))
        : autoScripts.map((script) => (
            <AutoMessage copyText={() => copyText(script.text)} key={script.kind} kind={script.kind}>
              {script.text}
            </AutoMessage>
          ))}
    </Flow>
  );
}

function ErrorView({
  onRefresh,
  onUpload,
  status,
}: {
  onRefresh: () => void;
  onUpload: () => void;
  status: TrainingStatusSnapshot | null;
}) {
  const detail = status?.errorMessage || "素材训练中断，可重新上传更完整的直播稿后继续。";
  const meta = status?.stage ? `失败阶段：${status.stage}` : "失败阶段：未知";

  return (
    <EmptyState
      artClassName="bg-[#FEE2E2] text-red-600"
      artIcon={AlertCircle}
      description={detail}
      title="训练失败"
    >
      <div className="flex gap-2.5">
        <Button onClick={onUpload} variant="secondary">
          <Upload size={16} />
          重新上传
        </Button>
        <Button onClick={onRefresh}>
          <RefreshCw size={16} />
          刷新状态
        </Button>
      </div>
      <span className="t-cap mt-1 text-text-3">{meta}</span>
    </EmptyState>
  );
}

function LoadingState({ description, title }: { description: string; title: string }) {
  return (
    <EmptyState
      artClassName="loading-art"
      artIcon={RefreshCw}
      description={description}
      title={title}
    >
      <div className="loading-lines" aria-hidden="true">
        <span className="skeleton-line w-[180px]" />
        <span className="skeleton-line w-[240px]" />
      </div>
    </EmptyState>
  );
}

function LoadErrorView({ description, onRetry }: { description: string; onRetry: () => void }) {
  return (
    <EmptyState
      artClassName="bg-[#FEE2E2] text-red-600"
      artIcon={AlertCircle}
      buttonIcon={RefreshCw}
      buttonLabel="重新读取"
      description={description}
      onButtonClick={onRetry}
      title="角色读取失败"
    />
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
  sending,
}: {
  disabled: boolean;
  disabledText: string;
  focused: boolean;
  inputValue: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  sending: boolean;
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
              if (!sending) {
                onSend();
              }
            }
          }}
          placeholder={disabled ? disabledText : "输入问题，例如：这条项链怎么介绍？"}
          rows={1}
          value={disabled ? "" : inputValue}
        />
        <Button
          aria-label="发送"
          disabled={disabled || sending}
          onClick={onSend}
          size="icon"
          title="发送"
          variant={focused || inputValue ? "primary" : "ghost"}
        >
          {sending ? <span className="spinner h-[15px] w-[15px]" /> : <Send size={16} />}
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
  state: "done" | "active" | "todo" | "error";
}) {
  return (
    <div className={cn("stage", state)}>
      <span className="stage-tick">
        {state === "done" && <Check size={13} strokeWidth={2.4} />}
        {state === "active" && <span className="spinner h-3 w-3 border-2" />}
        {state === "error" && <AlertCircle size={13} strokeWidth={2.4} />}
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
  streaming,
}: {
  children: React.ReactNode;
  copyText: () => void;
  kind: ScriptKind;
  streaming?: boolean;
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
        <div className="auto-body">
          {children}
          {streaming && <span className="caret" />}
        </div>
      </div>
    </div>
  );
}

function ModalHost({
  activeModal,
  autoConversations,
  character,
  chatConversations,
  closeModal,
  createCharacter,
  deleteCharacter,
  historyMode,
  onCalibrationSaved,
  onCreateConversation,
  onDeleteConversation,
  onHistoryModeChange,
  onRenameConversation,
  onSelectConversation,
  selectedAutoConversationId,
  selectedChatConversationId,
  uploadMaterial,
}: {
  activeModal: ModalKey | null;
  autoConversations: ConversationSummary[];
  character: Character;
  chatConversations: ConversationSummary[];
  closeModal: () => void;
  createCharacter: (input: { category: Category; name: string }) => Promise<void>;
  deleteCharacter: () => void;
  historyMode: ConversationMode;
  onCalibrationSaved: (savedExtraCount: number) => void;
  onCreateConversation: (mode: ConversationMode) => void;
  onDeleteConversation: (mode: ConversationMode, conversationId: string) => void;
  onHistoryModeChange: (mode: ConversationMode) => void;
  onRenameConversation: (mode: ConversationMode, conversationId: string, title: string) => void;
  onSelectConversation: (mode: ConversationMode, conversationId: string) => void;
  selectedAutoConversationId: string | null;
  selectedChatConversationId: string | null;
  uploadMaterial: (input: { characterId: string; filename: string; text: string }) => Promise<void>;
}) {
  if (!activeModal) {
    return null;
  }

  if (activeModal === "styleSettings") {
    return <StyleSettingsDrawer character={character} closeModal={closeModal} />;
  }

  if (activeModal === "history") {
    return (
      <ConversationHistoryDrawer
        autoConversations={autoConversations}
        character={character}
        chatConversations={chatConversations}
        closeModal={closeModal}
        mode={historyMode}
        onCreateConversation={onCreateConversation}
        onDeleteConversation={onDeleteConversation}
        onModeChange={onHistoryModeChange}
        onRenameConversation={onRenameConversation}
        onSelectConversation={onSelectConversation}
        selectedAutoConversationId={selectedAutoConversationId}
        selectedChatConversationId={selectedChatConversationId}
      />
    );
  }

  if (activeModal === "upload") {
    return <UploadModal character={character} closeModal={closeModal} uploadMaterial={uploadMaterial} />;
  }

  if (activeModal === "calibration") {
    return (
      <CalibrationModal
        character={character}
        closeModal={closeModal}
        onSaved={onCalibrationSaved}
      />
    );
  }

  if (activeModal === "deleteConfirm") {
    return (
      <DeleteConfirmModal character={character} closeModal={closeModal} deleteCharacter={deleteCharacter} />
    );
  }

  return <NewCharacterModal closeModal={closeModal} createCharacter={createCharacter} />;
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
  createCharacter,
}: {
  closeModal: () => void;
  createCharacter: (input: { category: Category; name: string }) => Promise<void>;
}) {
  const [category, setCategory] = useState<Category>("jewel");
  const [name, setName] = useState("珠宝主播·小雅");
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate() {
    if (!name.trim() || submitting) {
      return;
    }

    setSubmitting(true);
    try {
      await createCharacter({ category, name: name.trim() });
    } finally {
      setSubmitting(false);
    }
  }

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
          <input
            className="field-input"
            id="character-name"
            onChange={(event) => setName(event.target.value)}
            value={name}
          />
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
        <Button disabled={submitting || !name.trim()} onClick={handleCreate}>
          {submitting ? <span className="spinner h-[15px] w-[15px]" /> : <Sparkles size={16} />}
          创建并训练
        </Button>
      </div>
    </CenterModal>
  );
}

function formatConversationTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "时间未知";
  }

  return date.toLocaleString("zh-CN", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "2-digit",
  });
}

function getConversationTitle(conversation: ConversationSummary, mode: ConversationMode, index: number) {
  const title = conversation.title?.trim();

  if (title) {
    return title;
  }

  return `${mode === "chat" ? "问答" : "自动台词"} ${index + 1}`;
}

function ConversationHistoryDrawer({
  autoConversations,
  character,
  chatConversations,
  closeModal,
  mode,
  onCreateConversation,
  onDeleteConversation,
  onModeChange,
  onRenameConversation,
  onSelectConversation,
  selectedAutoConversationId,
  selectedChatConversationId,
}: {
  autoConversations: ConversationSummary[];
  character: Character;
  chatConversations: ConversationSummary[];
  closeModal: () => void;
  mode: ConversationMode;
  onCreateConversation: (mode: ConversationMode) => void;
  onDeleteConversation: (mode: ConversationMode, conversationId: string) => void;
  onModeChange: (mode: ConversationMode) => void;
  onRenameConversation: (mode: ConversationMode, conversationId: string, title: string) => void;
  onSelectConversation: (mode: ConversationMode, conversationId: string) => void;
  selectedAutoConversationId: string | null;
  selectedChatConversationId: string | null;
}) {
  const [draftTitle, setDraftTitle] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const conversations = mode === "chat" ? chatConversations : autoConversations;
  const selectedConversationId = mode === "chat" ? selectedChatConversationId : selectedAutoConversationId;
  const modeLabel = mode === "chat" ? "问答" : "自动台词";

  function beginRename(conversation: ConversationSummary, index: number) {
    setEditingId(conversation.id);
    setDraftTitle(getConversationTitle(conversation, mode, index));
  }

  function cancelRename() {
    setEditingId(null);
    setDraftTitle("");
  }

  function commitRename(conversationId: string) {
    const title = draftTitle.trim();

    if (!title) {
      cancelRename();
      return;
    }

    onRenameConversation(mode, conversationId, title);
    cancelRename();
  }

  function confirmDelete(conversation: ConversationSummary) {
    if (!window.confirm("删除这个会话？历史消息会一起删除。")) {
      return;
    }

    onDeleteConversation(mode, conversation.id);
  }

  return (
    <div className="drawer-wrap">
      <aside aria-label="历史会话" aria-modal="true" className="drawer-panel" role="dialog">
        <div className="drawer-head">
          <div>
            <h2 className="text-lg font-semibold leading-tight">历史会话</h2>
            <p className="t-cap mt-1">{character.name}</p>
          </div>
          <button aria-label="关闭" className="copy-fab static h-7 w-7" onClick={closeModal} type="button">
            <X size={15} />
          </button>
        </div>

        <div className="drawer-body">
          <div className="field">
            <label>类型</label>
            <Segmented
              options={[
                ["chat", "问答"],
                ["auto", "自动台词"],
              ]}
              value={mode}
              onChange={(nextMode) => {
                cancelRename();
                onModeChange(nextMode);
              }}
            />
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-2.5">
            {conversations.length === 0 ? (
              <div className="flex min-h-[240px] flex-col items-center justify-center rounded-md border border-dashed border-border bg-[#FCFDFE] px-6 text-center">
                <div className="dropzone-icon mb-3">
                  <FileText size={19} />
                </div>
                <h3 className="text-sm font-semibold text-text-1">暂无{modeLabel}会话</h3>
                <p className="mt-1 text-[13px] leading-[1.7] text-text-2">新建后可从这里切换和管理记录。</p>
                <Button className="mt-4" onClick={() => onCreateConversation(mode)} size="sm">
                  <Plus size={16} />
                  新建{modeLabel}
                </Button>
              </div>
            ) : (
              conversations.map((conversation, index) => {
                const title = getConversationTitle(conversation, mode, index);
                const selected = conversation.id === selectedConversationId;
                const editing = conversation.id === editingId;

                return (
                  <div
                    className={cn(
                      "rounded-md border px-3.5 py-3 transition-colors",
                      selected ? "border-primary bg-primary-light" : "border-border bg-white hover:bg-[#FCFDFE]",
                    )}
                    key={conversation.id}
                  >
                    <div className="flex items-start gap-2">
                      {editing ? (
                        <input
                          autoFocus
                          className="field-input h-8 min-w-0 flex-1"
                          onChange={(event) => setDraftTitle(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              commitRename(conversation.id);
                            }
                            if (event.key === "Escape") {
                              cancelRename();
                            }
                          }}
                          value={draftTitle}
                        />
                      ) : (
                        <button
                          className="min-w-0 flex-1 text-left"
                          onClick={() => onSelectConversation(mode, conversation.id)}
                          type="button"
                        >
                          <span className="block truncate text-sm font-semibold text-text-1">{title}</span>
                          <span className="mt-1 line-clamp-2 block text-[13px] leading-[1.6] text-text-2">
                            {conversation.latestMessagePreview || "空会话"}
                          </span>
                        </button>
                      )}

                      {editing ? (
                        <>
                          <button
                            aria-label="保存会话名称"
                            className="copy-fab static h-8 w-8"
                            onClick={() => commitRename(conversation.id)}
                            title="保存"
                            type="button"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            aria-label="取消重命名"
                            className="copy-fab static h-8 w-8"
                            onClick={cancelRename}
                            title="取消"
                            type="button"
                          >
                            <X size={14} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            aria-label="重命名会话"
                            className="copy-fab static h-8 w-8"
                            onClick={() => beginRename(conversation, index)}
                            title="重命名"
                            type="button"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            aria-label="删除会话"
                            className="copy-fab static h-8 w-8"
                            onClick={() => confirmDelete(conversation)}
                            title="删除"
                            type="button"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3 text-[12px] text-text-3">
                      <span>{conversation.messageCount} 条消息</span>
                      <span>{formatConversationTime(conversation.updatedAt)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="modal-foot">
          <Button onClick={() => onCreateConversation(mode)} variant="secondary">
            <Plus size={16} />
            新建{modeLabel}
          </Button>
          <Button onClick={closeModal}>完成</Button>
        </div>
      </aside>
    </div>
  );
}

function StyleSettingsDrawer({ character, closeModal }: { character: Character; closeModal: () => void }) {
  const [strength, setStrength] = useState(4);
  const [length, setLength] = useState("适中");

  return (
    <div className="drawer-wrap">
      <aside aria-label="风格设置" aria-modal="true" className="drawer-panel" role="dialog">
        <div className="drawer-head">
          <div>
            <h2 className="text-lg font-semibold leading-tight">风格设置</h2>
            <p className="t-cap mt-1">{character.name}</p>
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

function CalibrationModal({
  character,
  closeModal,
  onSaved,
}: {
  character: Character;
  closeModal: () => void;
  onSaved: (savedExtraCount: number) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [extraExemplars, setExtraExemplars] = useState("");
  const [loading, setLoading] = useState(false);
  const [sample, setSample] = useState("");
  const [saving, setSaving] = useState(false);
  const [strength, setStrength] = useState(4);

  useEffect(() => {
    let cancelled = false;

    async function loadSample() {
      setError(null);
      setLoading(true);
      setSample("");

      try {
        const data = await requestCharacterCalibration(character.id, {
          extraExemplars: "",
          styleStrength: strength,
        });

        if (cancelled) {
          return;
        }

        if (typeof data.sample !== "string" || !data.sample.trim()) {
          throw new Error("校准样例为空");
        }

        setSample(data.sample);
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        console.error(
          "[StyleClone][CalibrationModal][loadSample] failed",
          { characterId: character.id, error: loadError },
          new Date().toISOString(),
        );
        setError(loadError instanceof Error ? loadError.message : "生成校准样例失败");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadSample();

    return () => {
      cancelled = true;
    };
    // Initial sample loads per character; strength changes require explicit regeneration.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character.id]);

  async function regenerateSample() {
    if (loading || saving) {
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const data = await requestCharacterCalibration(character.id, {
        extraExemplars,
        styleStrength: strength,
      });

      if (typeof data.sample !== "string" || !data.sample.trim()) {
        throw new Error("校准样例为空");
      }

      setSample(data.sample);
    } catch (regenerateError) {
      console.error(
        "[StyleClone][CalibrationModal][regenerateSample] failed",
        { characterId: character.id, error: regenerateError },
        new Date().toISOString(),
      );
      setError(regenerateError instanceof Error ? regenerateError.message : "重新生成失败");
    } finally {
      setLoading(false);
    }
  }

  async function saveCalibration() {
    if (loading || saving) {
      return;
    }

    setError(null);
    setSaving(true);

    try {
      const data = await requestCharacterCalibration(character.id, {
        extraExemplars,
        saveExtraExemplars: true,
        saveOnly: true,
        styleStrength: strength,
      });

      onSaved(data.savedExtraCount ?? 0);
      closeModal();
    } catch (saveError) {
      console.error(
        "[StyleClone][CalibrationModal][saveCalibration] failed",
        { characterId: character.id, error: saveError },
        new Date().toISOString(),
      );
      setError(saveError instanceof Error ? saveError.message : "保存校准失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <CenterModal
      closeModal={closeModal}
      subtitle={`${character.name} · 先看一段样例，再决定要不要补范本`}
      title="风格校准"
      width={620}
    >
      <div className="modal-body">
        <div className="rounded-md border border-border bg-[#FCFDFE] px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <span className="t-cap">校准样例</span>
            {loading && <span className="spinner h-[15px] w-[15px] text-primary" />}
          </div>
          <p className="mt-2 min-h-[112px] whitespace-pre-wrap text-sm leading-[1.8] text-text-1">
            {sample || (loading ? "正在生成样例…" : "暂无样例")}
          </p>
        </div>

        <div className="field">
          <label htmlFor="calibration-strength">风格强度</label>
          <div className="slider-shell">
            <StyleStrengthSlider id="calibration-strength" onChange={setStrength} value={strength} />
            <div className="mt-2.5 flex justify-between">
              <span className="t-cap">更自由</span>
              <span className="t-cap">更像原话</span>
            </div>
          </div>
          <p className="t-cap text-text-3">当前 {strength}/5 · 调整后点重新生成查看效果</p>
        </div>

        <div className="field">
          <label htmlFor="calibration-extra">补几条范本</label>
          <textarea
            className="field-textarea min-h-[92px]"
            disabled={loading || saving}
            id="calibration-extra"
            onChange={(event) => setExtraExemplars(event.target.value)}
            placeholder={"每行一条，例如：\n家人们先别划走，这个手感你上手就知道。"}
            value={extraExemplars}
          />
          <p className="t-cap text-text-3">保存时会去重写入当前角色的通用范本</p>
        </div>

        {error && <p className="rounded-md bg-[#FEE2E2] px-3 py-2 text-[13px] text-red-600">{error}</p>}
      </div>

      <div className="modal-foot">
        <Button disabled={loading || saving} onClick={closeModal} variant="ghost">
          稍后再说
        </Button>
        <Button disabled={loading || saving} onClick={() => void regenerateSample()} variant="secondary">
          {loading ? <span className="spinner h-[15px] w-[15px]" /> : <RefreshCw size={16} />}
          重新生成
        </Button>
        <Button disabled={loading || saving} onClick={() => void saveCalibration()}>
          {saving ? <span className="spinner h-[15px] w-[15px]" /> : <Check size={16} />}
          满意保存
        </Button>
      </div>
    </CenterModal>
  );
}

function UploadModal({
  character,
  closeModal,
  uploadMaterial,
}: {
  character: Character;
  closeModal: () => void;
  uploadMaterial: (input: { characterId: string; filename: string; text: string }) => Promise<void>;
}) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filename, setFilename] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [text, setText] = useState("");
  const hasText = text.trim().length > 0;

  async function readFile(file: File) {
    setError(null);

    if (!/\.(txt|md)$/i.test(file.name)) {
      setError("仅支持 .txt / .md 文本素材");
      return;
    }

    setFilename(file.name);
    setText(await file.text());
  }

  async function handleUpload() {
    if (!hasText || submitting) {
      setError("请先选择文件，或粘贴一段直播稿文本");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await uploadMaterial({
        characterId: character.id,
        filename: filename || `${character.name}_直播稿.txt`,
        text,
      });
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "素材训练失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <CenterModal
      closeModal={closeModal}
      subtitle={`为${getCharacterNickname(character)}补充更多直播稿，提升话术覆盖面`}
      title="上传素材"
      width={520}
    >
      <div className="modal-body">
        <label
          className={cn("dropzone block cursor-pointer py-5", (dragging || filename) && "hover")}
          onDragLeave={() => setDragging(false)}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);

            const file = event.dataTransfer.files[0];

            if (file) {
              void readFile(file);
            }
          }}
        >
          <div className="dropzone-icon bg-white">
            <FileText size={19} />
          </div>
          <div className="text-[13px] font-medium text-primary">
            {dragging ? "松手即可上传" : filename ? "已选择素材" : "拖入文件，或 选择文件"}
          </div>
          <div className="t-cap mt-1">{filename || "支持 .txt / .md · 也可直接粘贴文本"}</div>
          <input
            accept=".txt,.md,text/plain,text/markdown"
            className="sr-only"
            disabled={submitting}
            onChange={(event) => {
              const file = event.target.files?.[0];

              if (file) {
                void readFile(file);
              }
            }}
            type="file"
          />
        </label>

        <div className="field">
          <label htmlFor="material-text">粘贴文本</label>
          <textarea
            className="field-textarea min-h-[120px]"
            disabled={submitting}
            id="material-text"
            onChange={(event) => {
              setText(event.target.value);

              if (!filename && event.target.value.trim()) {
                setFilename(`${character.name}_粘贴素材.txt`);
              }
            }}
            placeholder="把直播稿文本粘贴到这里..."
            value={text}
          />
        </div>

        {hasText && (
          <div className="flex items-center gap-3 rounded-md border border-border px-3.5 py-2.5">
            <FileText className="text-primary" size={18} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-medium">{filename || "粘贴素材.txt"}</div>
              <div className="t-cap">{text.replace(/\s+/g, "").length.toLocaleString()} 字 · 待训练</div>
            </div>
            {submitting && <span className="spinner text-primary" />}
          </div>
        )}

        <div className="stage-list rounded-md border border-border px-3.5 py-1">
          <StageRow index={1} label="切片" state={hasText ? "done" : "todo"} />
          <StageRow index={2} label="向量化" state={submitting ? "active" : "todo"} />
          <StageRow index={3} label="抽风格" state="todo" />
          <StageRow index={4} label="抽范本" state="todo" />
        </div>

        {error && <p className="rounded-md bg-[#FEE2E2] px-3 py-2 text-[13px] text-red-600">{error}</p>}
      </div>
      <div className="modal-foot">
        <Button disabled={submitting} onClick={closeModal} variant="ghost">
          取消
        </Button>
        <Button disabled={!hasText || submitting} onClick={handleUpload}>
          {submitting ? <span className="spinner h-[15px] w-[15px]" /> : <Upload size={16} />}
          {submitting ? "训练中…" : "开始训练"}
        </Button>
      </div>
    </CenterModal>
  );
}

function DeleteConfirmModal({
  character,
  closeModal,
  deleteCharacter,
}: {
  character: Character;
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
              <h2 className="text-[17px] font-semibold leading-tight">删除角色「{character.name}」？</h2>
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
  id = "style-strength",
  onChange,
  value,
}: {
  id?: string;
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
      id={id}
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

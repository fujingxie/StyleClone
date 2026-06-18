import { prisma } from "@/lib/db";

export type ConversationMode = "chat" | "auto";
export type PersistedMessageRole = "user" | "assistant" | "auto";

export type PersistedMessage = {
  content: string;
  createdAt: string;
  id: string;
  kind: string | null;
  role: PersistedMessageRole;
  sequence: number;
};

export type ConversationSummary = {
  createdAt: string;
  id: string;
  latestMessagePreview: string | null;
  messageCount: number;
  mode: ConversationMode;
  title: string | null;
  updatedAt: string;
};

const defaultHistoryLimit = 80;

function normalizeLimit(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return defaultHistoryLimit;
  }

  return Math.min(200, Math.max(1, Math.floor(value)));
}

function serializeMessage(message: {
  content: string;
  createdAt: Date;
  id: string;
  kind: string | null;
  role: string;
  sequence: number;
}): PersistedMessage {
  return {
    content: message.content,
    createdAt: message.createdAt.toISOString(),
    id: message.id,
    kind: message.kind,
    role: message.role as PersistedMessageRole,
    sequence: message.sequence,
  };
}

function serializeConversationSummary(conversation: {
  _count: { messages: number };
  createdAt: Date;
  id: string;
  messages: Array<{ content: string }>;
  mode: string;
  title: string | null;
  updatedAt: Date;
}): ConversationSummary {
  const preview = conversation.messages[0]?.content.trim() || null;

  return {
    createdAt: conversation.createdAt.toISOString(),
    id: conversation.id,
    latestMessagePreview: preview ? preview.slice(0, 72) : null,
    messageCount: conversation._count.messages,
    mode: conversation.mode as ConversationMode,
    title: conversation.title,
    updatedAt: conversation.updatedAt.toISOString(),
  };
}

export async function getLatestConversation(input: {
  characterId: string;
  mode: ConversationMode;
}) {
  return prisma.conversation.findFirst({
    orderBy: { updatedAt: "desc" },
    where: {
      characterId: input.characterId,
      mode: input.mode,
    },
  });
}

export async function getConversationById(input: {
  characterId: string;
  conversationId: string;
  mode?: ConversationMode;
}) {
  return prisma.conversation.findFirst({
    where: {
      characterId: input.characterId,
      id: input.conversationId,
      ...(input.mode ? { mode: input.mode } : {}),
    },
  });
}

export async function getOrCreateLatestConversation(input: {
  characterId: string;
  mode: ConversationMode;
  title?: string;
}) {
  const conversation = await getLatestConversation(input);

  if (conversation) {
    return conversation;
  }

  return prisma.conversation.create({
    data: {
      characterId: input.characterId,
      mode: input.mode,
      title: input.title,
    },
  });
}

export async function createConversation(input: {
  characterId: string;
  mode: ConversationMode;
  title?: string;
}) {
  return prisma.conversation.create({
    data: {
      characterId: input.characterId,
      mode: input.mode,
      title: input.title,
    },
  });
}

export async function listConversations(input: {
  characterId: string;
  limit?: unknown;
  mode: ConversationMode;
}) {
  const conversations = await prisma.conversation.findMany({
    include: {
      _count: { select: { messages: true } },
      messages: {
        orderBy: { sequence: "desc" },
        select: { content: true },
        take: 1,
      },
    },
    orderBy: { updatedAt: "desc" },
    take: normalizeLimit(input.limit),
    where: {
      characterId: input.characterId,
      mode: input.mode,
    },
  });

  return conversations.map(serializeConversationSummary);
}

export async function renameConversation(input: {
  characterId: string;
  conversationId: string;
  title: string;
}) {
  const title = input.title.trim().slice(0, 60);

  if (!title) {
    throw new Error("会话名称不能为空");
  }

  const conversation = await getConversationById(input);

  if (!conversation) {
    return null;
  }

  const updatedConversation = await prisma.conversation.update({
    data: {
      title,
      updatedAt: new Date(),
    },
    include: {
      _count: { select: { messages: true } },
      messages: {
        orderBy: { sequence: "desc" },
        select: { content: true },
        take: 1,
      },
    },
    where: { id: input.conversationId },
  });

  return serializeConversationSummary(updatedConversation);
}

export async function deleteConversation(input: {
  characterId: string;
  conversationId: string;
}) {
  const conversation = await getConversationById(input);

  if (!conversation) {
    return null;
  }

  await prisma.conversation.delete({
    where: { id: input.conversationId },
  });

  return conversation;
}

export async function appendConversationMessage(input: {
  characterId: string;
  content: string;
  conversationId: string;
  kind?: string | null;
  role: PersistedMessageRole;
}) {
  const content = input.content.trim();

  if (!content) {
    throw new Error("消息内容不能为空");
  }

  return prisma.$transaction(async (tx) => {
    const lastMessage = await tx.message.findFirst({
      orderBy: { sequence: "desc" },
      select: { sequence: true },
      where: { conversationId: input.conversationId },
    });
    const message = await tx.message.create({
      data: {
        characterId: input.characterId,
        content,
        conversationId: input.conversationId,
        kind: input.kind ?? null,
        role: input.role,
        sequence: (lastMessage?.sequence ?? -1) + 1,
      },
    });

    await tx.conversation.update({
      data: { updatedAt: new Date() },
      where: { id: input.conversationId },
    });

    return message;
  });
}

export async function getLatestConversationMessages(input: {
  characterId: string;
  limit?: unknown;
  mode: ConversationMode;
}) {
  const conversation = await prisma.conversation.findFirst({
    orderBy: { updatedAt: "desc" },
    where: {
      characterId: input.characterId,
      messages: { some: {} },
      mode: input.mode,
    },
  });

  if (!conversation) {
    return {
      conversation: null,
      messages: [],
    };
  }

  const messages = await prisma.message.findMany({
    orderBy: { sequence: "asc" },
    take: normalizeLimit(input.limit),
    where: { conversationId: conversation.id },
  });

  return {
    conversation: {
      createdAt: conversation.createdAt.toISOString(),
      id: conversation.id,
      mode: conversation.mode as ConversationMode,
      title: conversation.title,
      updatedAt: conversation.updatedAt.toISOString(),
    },
    messages: messages.map(serializeMessage),
  };
}

export async function getConversationMessages(input: {
  characterId: string;
  conversationId: string;
  limit?: unknown;
  mode?: ConversationMode;
}) {
  const conversation = await getConversationById(input);

  if (!conversation) {
    return null;
  }

  const messages = await prisma.message.findMany({
    orderBy: { sequence: "asc" },
    take: normalizeLimit(input.limit),
    where: { conversationId: conversation.id },
  });

  return {
    conversation: {
      createdAt: conversation.createdAt.toISOString(),
      id: conversation.id,
      mode: conversation.mode as ConversationMode,
      title: conversation.title,
      updatedAt: conversation.updatedAt.toISOString(),
    },
    messages: messages.map(serializeMessage),
  };
}

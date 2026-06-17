type AutoSession = {
  id: string;
  stopped: boolean;
};

const globalForAutoSessions = globalThis as unknown as {
  autoSessions?: Map<string, AutoSession>;
};

const autoSessions = globalForAutoSessions.autoSessions ?? new Map<string, AutoSession>();

if (process.env.NODE_ENV !== "production") {
  globalForAutoSessions.autoSessions = autoSessions;
}

function createSessionId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function beginAutoSession(characterId: string) {
  const session = {
    id: createSessionId(),
    stopped: false,
  };

  autoSessions.set(characterId, session);

  return session.id;
}

export function isAutoSessionStopped(characterId: string, sessionId: string) {
  const session = autoSessions.get(characterId);
  return !session || session.id !== sessionId || session.stopped;
}

export function stopAutoSession(characterId: string) {
  const session = autoSessions.get(characterId);

  if (!session) {
    return false;
  }

  session.stopped = true;
  return true;
}

import type { Character } from "@prisma/client";

const categories = new Set(["jewel", "fresh", "group", "other"]);
const avatarColors = new Set(["violet", "rose", "green", "gray"]);
const statuses = new Set(["training", "ready", "error"]);

export function serializeCharacter(character: Character) {
  return {
    id: character.id,
    name: character.name,
    category: normalizeCategory(character.category),
    type: character.type,
    status: normalizeStatus(character.status),
    avatarLetter: character.avatarLetter,
    avatarColor: normalizeAvatarColor(character.avatarColor),
    createdAt: character.createdAt.toISOString(),
    updatedAt: character.updatedAt.toISOString(),
  };
}

export function normalizeCategory(value: unknown) {
  return typeof value === "string" && categories.has(value) ? value : "other";
}

export function normalizeAvatarColor(value: unknown) {
  return typeof value === "string" && avatarColors.has(value) ? value : "gray";
}

export function normalizeStatus(value: unknown) {
  return typeof value === "string" && statuses.has(value) ? value : "ready";
}

export function getAvatarLetter(name: string) {
  const tail = name.split("·").at(-1)?.trim();
  return (tail || name).slice(-1) || "角";
}

export function getAvatarColor(category: string) {
  if (category === "fresh") {
    return "green";
  }

  if (category === "group") {
    return "rose";
  }

  if (category === "jewel") {
    return "violet";
  }

  return "gray";
}

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const demoCharacters = [
  {
    id: "demo-jewel",
    name: "珠宝主播·小雅",
    category: "jewel",
    type: "主播",
    status: "ready",
    avatarLetter: "雅",
    avatarColor: "violet",
  },
  {
    id: "demo-fresh",
    name: "生鲜主播·老张",
    category: "fresh",
    type: "主播",
    status: "ready",
    avatarLetter: "张",
    avatarColor: "green",
  },
  {
    id: "demo-group",
    name: "团购主播·阿珍",
    category: "group",
    type: "主播",
    status: "ready",
    avatarLetter: "珍",
    avatarColor: "rose",
  },
];

for (const character of demoCharacters) {
  await prisma.character.upsert({
    create: character,
    update: character,
    where: {
      id: character.id,
    },
  });
}

await prisma.$disconnect();

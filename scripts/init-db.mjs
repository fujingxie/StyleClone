import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const dataDir = path.join(root, "data");
const dbPath = path.join(dataDir, "styleclone.db");

mkdirSync(dataDir, { recursive: true });

function runSql(sql) {
  execFileSync("sqlite3", [dbPath], {
    input: sql,
    stdio: ["pipe", "inherit", "inherit"],
  });
}

function listColumns(tableName) {
  const output = execFileSync("sqlite3", [dbPath, `PRAGMA table_info("${tableName}");`], {
    encoding: "utf8",
  });

  return new Set(
    output
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => line.split("|")[1]),
  );
}

const schema = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS "Character" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT '主播',
  "status" TEXT NOT NULL DEFAULT 'ready',
  "styleSummary" TEXT,
  "avatarLetter" TEXT NOT NULL,
  "avatarColor" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "Character_createdAt_idx" ON "Character"("createdAt");

CREATE TABLE IF NOT EXISTS "Material" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "characterId" TEXT NOT NULL,
  "filename" TEXT NOT NULL,
  "rawText" TEXT NOT NULL,
  "wordCount" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'training',
  "stage" TEXT NOT NULL DEFAULT '切片',
  "progress" INTEGER NOT NULL DEFAULT 0,
  "errorMessage" TEXT,
  "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Material_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Material_characterId_uploadedAt_idx" ON "Material"("characterId", "uploadedAt");

CREATE TABLE IF NOT EXISTS "Chunk" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "characterId" TEXT NOT NULL,
  "materialId" TEXT NOT NULL,
  "chunkIndex" INTEGER NOT NULL,
  "content" TEXT NOT NULL,
  "embeddingJson" TEXT NOT NULL,
  "tokenCount" INTEGER NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Chunk_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Chunk_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Chunk_characterId_idx" ON "Chunk"("characterId");
CREATE INDEX IF NOT EXISTS "Chunk_materialId_idx" ON "Chunk"("materialId");

CREATE TABLE IF NOT EXISTS "Exemplar" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "characterId" TEXT NOT NULL,
  "sourceMaterialId" TEXT,
  "kind" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "note" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Exemplar_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Exemplar_sourceMaterialId_fkey" FOREIGN KEY ("sourceMaterialId") REFERENCES "Material" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Exemplar_characterId_kind_idx" ON "Exemplar"("characterId", "kind");
CREATE INDEX IF NOT EXISTS "Exemplar_sourceMaterialId_idx" ON "Exemplar"("sourceMaterialId");
`;

runSql(schema);

if (!listColumns("Character").has("styleSummary")) {
  runSql('ALTER TABLE "Character" ADD COLUMN "styleSummary" TEXT;');
}

console.log(`SQLite initialized at ${dbPath}`);

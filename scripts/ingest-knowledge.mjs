// 지식 문서(knowledge/*.md)를 임베딩해 knowledge_chunks 에 적재한다.
// 실행: DATABASE_URL, AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_EMBEDDING_DEPLOYMENT 환경변수 필요.
//   node scripts/ingest-knowledge.mjs
import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { DefaultAzureCredential } from "@azure/identity";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(root, "knowledge");
const prisma = new PrismaClient();
const dims = Number(process.env.AZURE_OPENAI_EMBEDDING_DIMENSIONS) || 1536;

const phaseByPrefix = { "01": "기획", "02": "설계", "03": "환경 구축", "04": "배포", "05": "AI" };

async function embed(text) {
  const ep = process.env.AZURE_OPENAI_ENDPOINT.replace(/\/+$/, "");
  const dep = process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT;
  const ver = process.env.AZURE_OPENAI_API_VERSION || "2024-10-21";
  const token = await new DefaultAzureCredential().getToken("https://cognitiveservices.azure.com/.default");
  const res = await fetch(`${ep}/openai/deployments/${dep}/embeddings?api-version=${ver}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token.token}` },
    body: JSON.stringify({ input: text, dimensions: dims }),
  });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  return (await res.json()).data[0].embedding;
}

async function main() {
  await prisma.$executeRawUnsafe("CREATE EXTENSION IF NOT EXISTS vector;");
  await prisma.$executeRawUnsafe("DELETE FROM knowledge_chunks;");
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".md"))) {
    const raw = readFileSync(join(dir, file), "utf8");
    const title = (raw.match(/^#\s+(.+)$/m)?.[1] ?? file).trim();
    const phase = phaseByPrefix[file.slice(0, 2)] ?? null;
    const vec = `[${(await embed(raw)).join(",")}]`;
    await prisma.$executeRawUnsafe(
      `INSERT INTO knowledge_chunks (id, source, title, phase, content, embedding)
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5::vector)`,
      `knowledge/${file}`, title, phase, raw, vec,
    );
    console.log(`ingested: ${file} (${title})`);
  }
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });

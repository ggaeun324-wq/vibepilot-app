import { DefaultAzureCredential, ManagedIdentityCredential } from "@azure/identity";

const SCOPE = "https://cognitiveservices.azure.com/.default";

function getEmbeddingDimensions(): number {
  const raw = Number(process.env.AZURE_OPENAI_EMBEDDING_DIMENSIONS);
  return Number.isFinite(raw) && raw > 0 ? raw : 1536;
}

function getCredential() {
  if (process.env.NODE_ENV === "development") return new DefaultAzureCredential();
  return process.env.AZURE_CLIENT_ID
    ? new ManagedIdentityCredential(process.env.AZURE_CLIENT_ID)
    : new ManagedIdentityCredential();
}

export function isEmbeddingEnabled(): boolean {
  return Boolean(process.env.AZURE_OPENAI_ENDPOINT && process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT);
}

// pgvector 리터럴 포맷: [0.1,0.2,...]. $queryRaw 에 문자열로 넘긴 뒤 ::vector 캐스팅.
export function toVectorLiteral(values: number[]): string {
  return `[${values.join(",")}]`;
}

// 단일 텍스트를 1536차원 임베딩으로 변환. 관리 ID(운영)/로컬 자격증명(개발)로 호출.
export async function embedText(text: string): Promise<number[]> {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const deployment = process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT;
  if (!endpoint || !deployment) {
    throw new Error("AZURE_OPENAI_ENDPOINT 와 AZURE_OPENAI_EMBEDDING_DEPLOYMENT 가 필요합니다.");
  }

  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || "2024-10-21";
  const url = `${endpoint.replace(/\/+$/, "")}/openai/deployments/${deployment}/embeddings?api-version=${apiVersion}`;

  const token = await getCredential().getToken(SCOPE);
  if (!token?.token) throw new Error("Azure 자격증명에서 토큰을 받지 못했습니다.");

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token.token}` },
    body: JSON.stringify({ input: text, dimensions: getEmbeddingDimensions() }),
  });

  if (!response.ok) {
    throw new Error(`임베딩 요청 실패 (${response.status}): ${await response.text()}`);
  }

  const data = (await response.json()) as { data: { embedding: number[] }[] };
  return data.data[0].embedding;
}

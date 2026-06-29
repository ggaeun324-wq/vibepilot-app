import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@azure/identity", () => ({
  DefaultAzureCredential: class { getToken() { return Promise.resolve({ token: "t" }); } },
  ManagedIdentityCredential: class { getToken() { return Promise.resolve({ token: "t" }); } },
}));

import { embedText, isEmbeddingEnabled, toVectorLiteral } from "./embeddings";

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.AZURE_OPENAI_ENDPOINT;
  delete process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT;
});

describe("toVectorLiteral", () => {
  it("formats array", () => expect(toVectorLiteral([1, 2])).toBe("[1,2]"));
});

describe("isEmbeddingEnabled", () => {
  it("false without env", () => expect(isEmbeddingEnabled()).toBe(false));
  it("true with env", () => {
    process.env.AZURE_OPENAI_ENDPOINT = "https://e";
    process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT = "d";
    expect(isEmbeddingEnabled()).toBe(true);
  });
});

describe("embedText", () => {
  it("throws when not configured", async () => {
    await expect(embedText("hi")).rejects.toThrow();
  });

  it("returns embedding on success", async () => {
    process.env.AZURE_OPENAI_ENDPOINT = "https://e";
    process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT = "d";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [{ embedding: [0.1, 0.2] }] }),
    }));
    expect(await embedText("hi")).toEqual([0.1, 0.2]);
  });

  it("throws on non-ok response", async () => {
    process.env.AZURE_OPENAI_ENDPOINT = "https://e";
    process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT = "d";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500, text: () => Promise.resolve("err") }));
    await expect(embedText("hi")).rejects.toThrow("500");
  });
});

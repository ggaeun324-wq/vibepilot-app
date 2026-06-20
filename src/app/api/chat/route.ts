import { createCopilotClient, createVibePilotSessionConfig } from "@/lib/copilot/session";
import {
  buildCopilotPrompt,
  buildFallbackResponse,
  parseChatContext,
  type VibePilotChatContext,
} from "@/lib/copilot/project-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CopilotClientInstance = ReturnType<typeof createCopilotClient>;
type CopilotSessionInstance = Awaited<ReturnType<CopilotClientInstance["createSession"]>>;

function createTextStream(context: VibePilotChatContext): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      let client: CopilotClientInstance | undefined;
      let session: CopilotSessionInstance | undefined;
      let sawDelta = false;
      let finalContent = "";

      const enqueue = (text: string) => {
        if (text) controller.enqueue(encoder.encode(text));
      };

      try {
        client = createCopilotClient(context.githubToken);
        const sessionConfig = await createVibePilotSessionConfig(context);
        session = await client.createSession(sessionConfig);

        session.on("assistant.message_delta", (event) => {
          sawDelta = true;
          enqueue(event.data.deltaContent);
        });

        session.on("assistant.message", (event) => {
          finalContent = event.data.content;
          if (!sawDelta) enqueue(finalContent);
        });

        await session.sendAndWait({ prompt: buildCopilotPrompt(context) }, 120000);

        if (!sawDelta && !finalContent) {
          enqueue(buildFallbackResponse(context));
        }
      } catch (error) {
        console.error("Copilot SDK chat failed", error);
        enqueue(buildFallbackResponse(context));
      } finally {
        await session?.disconnect().catch((error) => {
          console.error("Failed to disconnect Copilot session", error);
        });
        await client?.stop().catch((error) => {
          console.error("Failed to stop Copilot client", error);
        });
        controller.close();
      }
    },
  });
}

export async function POST(req: Request) {
  const parsed = parseChatContext(await req.json());

  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  return new Response(createTextStream(parsed.value), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
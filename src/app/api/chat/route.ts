import { streamText, convertToModelMessages, stepCountIs, type UIMessage } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { allTools } from "@/lib/ai/tools";
import { buildSystemPrompt } from "@/lib/ai/system-prompt";
import type { ContextChip } from "@/types";

export const maxDuration = 60;

export async function POST(req: Request) {
  const { messages, contextChips = [] } = (await req.json()) as {
    messages: UIMessage[];
    contextChips?: ContextChip[];
  };

  const systemPrompt = buildSystemPrompt(contextChips);

  const modelMessages = await convertToModelMessages(messages, {
    tools: allTools,
  });

  const result = streamText({
    model: anthropic("claude-sonnet-4-20250514"),
    system: systemPrompt,
    messages: modelMessages,
    tools: allTools,
    stopWhen: stepCountIs(10),
  });

  return result.toUIMessageStreamResponse();
}

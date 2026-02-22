"use client";

import type { UIMessage } from "ai";

interface MessageBubbleProps {
  message: UIMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";

  // Extract text parts
  const textParts = message.parts.filter(
    (part): part is Extract<(typeof message.parts)[number], { type: "text" }> =>
      part.type === "text"
  );

  // Extract tool parts (any part that starts with "tool-" or is "dynamic-tool")
  const toolParts = message.parts.filter(
    (part) => part.type.startsWith("tool-") || part.type === "dynamic-tool"
  );

  const textContent = textParts.map((p) => p.text).join("");

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
          isUser
            ? "bg-cyan-600/20 text-cyan-100 border border-cyan-500/20"
            : "bg-zinc-800/50 text-zinc-200 border border-zinc-700/50"
        }`}
      >
        {isAssistant && (
          <div className="text-[10px] uppercase tracking-wider text-red-400 font-bold mb-1">
            Pack Leader
          </div>
        )}

        {/* Tool invocations */}
        {toolParts.length > 0 && (
          <div className="space-y-1.5 mb-2">
            {toolParts.map((part, idx) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const p = part as any;
              const toolName = p.toolName || part.type.replace("tool-", "");
              const state = p.state as string;
              const output = p.output;

              const isComplete = state === "output-available";
              const isRunning =
                state === "input-streaming" || state === "input-available";

              return (
                <div
                  key={idx}
                  className="text-[11px] bg-zinc-900/50 border border-zinc-700/50 rounded px-2 py-1.5"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-yellow-400">⚡</span>
                    <span className="text-zinc-400 font-mono">{toolName}</span>
                    {isComplete && (
                      <span className="text-green-400 text-[10px]">✓</span>
                    )}
                    {isRunning && (
                      <span className="text-yellow-400 animate-pulse text-[10px]">
                        running...
                      </span>
                    )}
                  </div>
                  {isComplete && toolName === "search_nodes" && output?.results && (
                    <div className="mt-1 text-zinc-400">
                      Found {output.count} result(s)
                    </div>
                  )}
                  {isComplete && toolName === "find_attack_paths" && output && (
                    <div className="mt-1 text-zinc-400">
                      {output.found
                        ? `Path found: ${output.pathLength} step(s)`
                        : "No path found"}
                    </div>
                  )}
                  {isComplete && toolName === "run_cypher_query" && output && (
                    <div className="mt-1 text-zinc-400">
                      {output.hasGraph
                        ? `${output.nodes?.length || 0} nodes, ${output.edges?.length || 0} edges`
                        : output.literals
                          ? `${output.literals.length} result(s)`
                          : "Query executed"}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Text content */}
        {textContent && (
          <div className="whitespace-pre-wrap leading-relaxed">
            {renderMarkdown(textContent)}
          </div>
        )}
      </div>
    </div>
  );
}

function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(
        <div key={i} className="flex gap-1.5 ml-2">
          <span className="text-zinc-500">•</span>
          <span>{formatInline(line.slice(2))}</span>
        </div>
      );
    } else if (line.trim() === "") {
      elements.push(<div key={i} className="h-2" />);
    } else {
      elements.push(<div key={i}>{formatInline(line)}</div>);
    }
  }

  return <>{elements}</>;
}

function formatInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*([^*]+)\*\*|`([^`]+)`)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[2]) {
      parts.push(
        <strong key={match.index} className="text-zinc-100 font-semibold">
          {match[2]}
        </strong>
      );
    } else if (match[3]) {
      parts.push(
        <code
          key={match.index}
          className="bg-zinc-700/50 px-1 py-0.5 rounded text-cyan-300 text-[11px] font-mono"
        >
          {match[3]}
        </code>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return <>{parts}</>;
}

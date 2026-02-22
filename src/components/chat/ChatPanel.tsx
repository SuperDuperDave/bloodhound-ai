"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { MessageBubble } from "./MessageBubble";
import { ContextChips } from "./ContextChips";
import { ChatInput } from "./ChatInput";
import { useGraphStore } from "@/lib/store/graph-store";
import { useChatStore } from "@/lib/store/chat-store";
import type { Node, Edge } from "@xyflow/react";
import type { ADNodeData, ADEdgeData, RemediationItem } from "@/types";

interface ChatPanelProps {
  initialGreeting?: string;
}

const transport = new DefaultChatTransport({
  api: "/api/chat",
});

export function ChatPanel({ initialGreeting }: ChatPanelProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { contextChips, addRemediationItem } = useChatStore();
  const { highlightNodes, highlightEdges, clearHighlights, addGraph } = useGraphStore();

  const { messages, sendMessage, status, setMessages, addToolOutput } = useChat({
    transport,
    onToolCall: ({ toolCall }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tc = toolCall as any;
      const toolName = tc.toolName || tc.name;
      const args = tc.input || tc.args || {};

      if (toolName === "highlight_graph_elements") {
        if (args.clear) clearHighlights();
        if (args.nodeIds) highlightNodes(args.nodeIds);
        if (args.edgeIds) highlightEdges(args.edgeIds);
        addToolOutput({
          toolCallId: tc.toolCallId,
          output: "Highlighted on canvas.",
        } as Parameters<typeof addToolOutput>[0]);
        return;
      }

      if (toolName === "add_remediation_item") {
        addRemediationItem({
          id: crypto.randomUUID(),
          ...args,
        } as RemediationItem);
        addToolOutput({
          toolCallId: tc.toolCallId,
          output: "Added to remediation plan.",
        } as Parameters<typeof addToolOutput>[0]);
        return;
      }
    },
    onFinish: ({ message }) => {
      // Check tool results for graph data to add to canvas
      if (message.parts) {
        for (const part of message.parts) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const p = part as any;
          if (
            (p.type?.startsWith?.("tool-") || p.type === "dynamic-tool") &&
            (p.state === "output-available" || p.output)
          ) {
            const output = p.output;
            if (output?.graphData?.nodes && output?.graphData?.edges) {
              addGraph(
                output.graphData.nodes as Node<ADNodeData>[],
                output.graphData.edges as Edge<ADEdgeData>[]
              );
              if (output.nodeIds) {
                highlightNodes(output.nodeIds);
              }
              if (output.edgeIds) {
                highlightEdges(output.edgeIds);
              }
            }
          }
        }
      }
    },
  });

  const isLoading = status === "streaming" || status === "submitted";

  // Set initial greeting
  useEffect(() => {
    if (initialGreeting && messages.length === 0) {
      setMessages([
        {
          id: "greeting",
          role: "assistant" as const,
          parts: [{ type: "text" as const, text: initialGreeting }],
        },
      ]);
    }
  }, [initialGreeting, messages.length, setMessages]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const body = {
      contextChips,
    };
    sendMessage({ text: input.trim() }, { body });
    setInput("");
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900/50 border-l border-zinc-800">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-800 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <h2 className="text-sm font-bold text-zinc-100">Pack Leader</h2>
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
            AD Attack Path Intelligence
          </span>
        </div>
      </div>

      {/* Context Chips */}
      <ContextChips />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        {isLoading && messages[messages.length - 1]?.role === "user" && (
          <div className="flex justify-start">
            <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                Analyzing...
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <ChatInput
        input={input}
        onInputChange={setInput}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </div>
  );
}

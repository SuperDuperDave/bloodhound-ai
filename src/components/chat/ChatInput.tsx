"use client";

import { useRef, type FormEvent, type KeyboardEvent } from "react";

interface ChatInputProps {
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
  isLoading: boolean;
}

export function ChatInput({ input, onInputChange, onSubmit, isLoading }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !isLoading) {
        onSubmit(e as unknown as FormEvent);
      }
    }
  };

  return (
    <form onSubmit={onSubmit} className="border-t border-zinc-800 p-3">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about attack paths, users, groups..."
          rows={1}
          className="flex-1 bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 resize-none focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50 min-h-[38px] max-h-[120px]"
          style={{ height: "38px" }}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = "38px";
            target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
          }}
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm font-medium rounded-lg transition-colors flex-shrink-0"
        >
          {isLoading ? (
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" />
            </span>
          ) : (
            "Send"
          )}
        </button>
      </div>
    </form>
  );
}

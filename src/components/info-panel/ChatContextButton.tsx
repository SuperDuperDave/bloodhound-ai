"use client";

import { memo } from "react";
import { MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatContextButtonProps {
  onClick: () => void;
  tooltip?: string;
  className?: string;
}

function ChatContextButtonComponent({
  onClick,
  tooltip = "Send to chat",
  className,
}: ChatContextButtonProps) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title={tooltip}
      className={cn(
        "p-0.5 rounded text-zinc-600 hover:text-cyan-400 transition-colors flex-shrink-0",
        className
      )}
    >
      <MessageSquare size={14} />
    </button>
  );
}

export const ChatContextButton = memo(ChatContextButtonComponent);

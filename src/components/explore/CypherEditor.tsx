"use client";

import { useRef, useEffect } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap, placeholder } from "@codemirror/view";
import { oneDark } from "@codemirror/theme-one-dark";
import { cypherLanguage } from "@/lib/explore/cypher-language";

interface CypherEditorProps {
  value: string;
  onChange: (value: string) => void;
  onRun: () => void;
  readOnly?: boolean;
}

const editorTheme = EditorView.theme({
  "&": {
    backgroundColor: "#1a1a1e",
    fontSize: "13px",
    minHeight: "96px",
    maxHeight: "200px",
  },
  ".cm-content": {
    fontFamily: "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, monospace",
    padding: "8px 0",
    caretColor: "#22d3ee",
    minHeight: "80px",
  },
  ".cm-scroller": {
    overflow: "auto",
    maxHeight: "200px",
  },
  "&.cm-focused .cm-cursor": {
    borderLeftColor: "#22d3ee",
  },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
    backgroundColor: "#22d3ee20",
  },
  ".cm-gutters": {
    display: "none",
  },
  ".cm-placeholder": {
    color: "#52525b",
    fontStyle: "italic",
  },
  "&.cm-focused": {
    outline: "none",
  },
});

export function CypherEditor({ value, onChange, onRun, readOnly = false }: CypherEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const onRunRef = useRef(onRun);

  // Keep refs current without recreating the editor
  onChangeRef.current = onChange;
  onRunRef.current = onRun;

  useEffect(() => {
    if (!containerRef.current) return;

    const runKeymap = keymap.of([
      {
        key: "Ctrl-Enter",
        run: () => {
          onRunRef.current();
          return true;
        },
      },
      {
        key: "Mod-Enter",
        run: () => {
          onRunRef.current();
          return true;
        },
      },
    ]);

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        onChangeRef.current(update.state.doc.toString());
      }
    });

    const state = EditorState.create({
      doc: value,
      extensions: [
        runKeymap,
        cypherLanguage,
        oneDark,
        editorTheme,
        placeholder("Enter Cypher query..."),
        updateListener,
        EditorState.readOnly.of(readOnly),
      ],
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // Only recreate on readOnly change — value sync handled below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readOnly]);

  // Sync external value changes into the editor (e.g., from prebuilt query selection)
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const currentDoc = view.state.doc.toString();
    if (currentDoc !== value) {
      view.dispatch({
        changes: {
          from: 0,
          to: currentDoc.length,
          insert: value,
        },
      });
    }
  }, [value]);

  return (
    <div
      ref={containerRef}
      className="rounded-md border border-zinc-700/50 overflow-hidden bg-[#1a1a1e]"
    />
  );
}

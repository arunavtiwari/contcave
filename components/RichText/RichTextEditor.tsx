"use client";

import { useEffect, useRef } from "react";
import {
  $getRoot,
  $createParagraphNode,
  EditorState,
  type LexicalEditor,
} from "lexical";
import { $generateHtmlFromNodes, $generateNodesFromDOM } from "@lexical/html";

import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";

const theme = {
  paragraph: "mb-2",
};

const editorConfig = {
  namespace: "contcave-editor",
  theme,
  onError(error: Error) {
    throw error;
  },
};

interface Props {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

/* ---------------- LOAD INITIAL HTML ---------------- */

function LoadInitialValue({ value }: { value?: string }) {
  const [editor] = useLexicalComposerContext();
  const isInitialized = useRef(false);

  useEffect(() => {
    if (!value || isInitialized.current) return;

    isInitialized.current = true;

    editor.update(() => {
      const root = $getRoot();
      root.clear();

      const parser = new DOMParser();
      const dom = parser.parseFromString(value, "text/html");
      const nodes = $generateNodesFromDOM(editor, dom);

      if (nodes.length === 0) {
        root.append($createParagraphNode());
      } else {
        root.append(...nodes);
      }
    });
  }, [value, editor]);

  return null;
}

/* ---------------- MAIN EDITOR ---------------- */

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Write something amazing about your space…",
  disabled = false,
}: Props) {
  return (
    <LexicalComposer initialConfig={editorConfig}>
      <div className="relative border rounded-xl bg-white">
        <RichTextPlugin
          contentEditable={
            <ContentEditable className={`min-h-[160px] p-4 outline-none text-base ${
              disabled ? "pointer-events-none opacity-60" : ""
            }`} />
          }
          placeholder={
            <div className="pointer-events-none absolute top-4 left-4 text-neutral-400 text-sm">
              {placeholder}
            </div>
          }
          ErrorBoundary={LexicalErrorBoundary}
        />

        <HistoryPlugin />

        <OnChangePlugin
          onChange={(editorState: EditorState, editor: LexicalEditor) => {
            editorState.read(() => {
              const html = $generateHtmlFromNodes(editor);
              onChange(html);
            });
          }}
        />

        <LoadInitialValue value={value} />
      </div>
    </LexicalComposer>
  );
}
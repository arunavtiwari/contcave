"use client";

import { $generateHtmlFromNodes, $generateNodesFromDOM } from "@lexical/html";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import {
  $getSelection,
  $isRangeSelection,
  $createParagraphNode,
  $getRoot,
  EditorState,
  type LexicalEditor,
  FORMAT_TEXT_COMMAND,
  SELECTION_CHANGE_COMMAND,
  UNDO_COMMAND,
  REDO_COMMAND,
} from "lexical";
import { $isListNode, ListNode, ListItemNode, INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND, REMOVE_LIST_COMMAND } from "@lexical/list";
import { useEffect, useRef, useState, useCallback } from "react";
import {
  FaBold,
  FaItalic,
  FaUnderline,
  FaListUl,
  FaListOl,
  FaArrowRotateLeft,
  FaArrowRotateRight
} from "react-icons/fa6";
import { mergeRegister } from "@lexical/utils";

import { cn } from "@/lib/utils";

const theme = {
  paragraph: "mb-2",
  list: {
    ul: "list-disc ml-5 mb-2",
    ol: "list-decimal ml-5 mb-2",
  },
  text: {
    bold: "font-bold",
    italic: "italic",
    underline: "underline",
  }
};

const editorConfig = {
  namespace: "contcave-editor",
  theme,
  nodes: [ListNode, ListItemNode],
  onError(error: Error) {
    throw error;
  },
};

/* ---------------- COMPONENTS ---------------- */

interface ToolbarButtonProps {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
  size?: "md" | "sm";
}

const ToolbarButton = ({
  onClick,
  active,
  title,
  children,
  disabled,
  className,
  size = "md"
}: ToolbarButtonProps) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={cn(
      "rounded-lg transition-all duration-200 flex items-center justify-center shrink-0",
      size === "md" ? "p-2" : "p-1 w-8 h-8 text-center",
      active
        ? "bg-foreground text-background shadow-sm scale-105"
        : "hover:bg-foreground/5 text-foreground/70 hover:text-foreground active:scale-95",
      disabled && "opacity-20 pointer-events-none",
      className
    )}
    title={title}
  >
    {children}
  </button>
);

/* ---------------- TOOLBAR PLUGIN ---------------- */

function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext();
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isBulletList, setIsBulletList] = useState(false);
  const [isNumberedList, setIsNumberedList] = useState(false);

  const updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      setIsBold(selection.hasFormat("bold"));
      setIsItalic(selection.hasFormat("italic"));
      setIsUnderline(selection.hasFormat("underline"));

      const anchorNode = selection.anchor.getNode();
      const element = anchorNode.getKey() === "root" ? anchorNode : anchorNode.getTopLevelElementOrThrow();

      if ($isListNode(element)) {
        const listType = element.getListType();
        setIsBulletList(listType === "bullet");
        setIsNumberedList(listType === "number");
      } else {
        setIsBulletList(false);
        setIsNumberedList(false);
      }
    }
  }, []);

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          updateToolbar();
        });
      }),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          updateToolbar();
          return false;
        },
        1
      )
    );
  }, [editor, updateToolbar]);

  const onFormat = (command: any, payload?: any) => {
    editor.dispatchCommand(command, payload);
  };

  const toggleBulletList = () => {
    if (isBulletList) {
      editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
    } else {
      editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
    }
  };

  const toggleOrderedList = () => {
    if (isNumberedList) {
      editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
    } else {
      editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
    }
  };

  return (
    <div className="flex items-center gap-1.5 p-2 border-b bg-background/80 backdrop-blur-md sticky top-0 z-20">
      <ToolbarButton
        onClick={() => onFormat(FORMAT_TEXT_COMMAND, "bold")}
        active={isBold}
        title="Bold"
      >
        <FaBold size={12} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => onFormat(FORMAT_TEXT_COMMAND, "italic")}
        active={isItalic}
        title="Italic"
      >
        <FaItalic size={12} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => onFormat(FORMAT_TEXT_COMMAND, "underline")}
        active={isUnderline}
        title="Underline"
      >
        <FaUnderline size={12} />
      </ToolbarButton>

      <div className="w-px h-5 bg-border mx-1 opacity-50" />

      <ToolbarButton
        onClick={toggleBulletList}
        active={isBulletList}
        title="Bullet List"
      >
        <FaListUl size={12} />
      </ToolbarButton>
      <ToolbarButton
        onClick={toggleOrderedList}
        active={isNumberedList}
        title="Numbered List"
      >
        <FaListOl size={12} />
      </ToolbarButton>

      <div className="flex-1" />

      <div className="flex items-center gap-1">
        <ToolbarButton
          onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
          title="Undo"
          size="sm"
          className="text-foreground/50"
        >
          <FaArrowRotateLeft size={12} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}
          title="Redo"
          size="sm"
          className="text-foreground/50"
        >
          <FaArrowRotateRight size={12} />
        </ToolbarButton>
      </div>
    </div>
  );
}

/* ---------------- LOAD INITIAL HTML ---------------- */

function LoadInitialValue({ value, onInitialized }: { value?: string; onInitialized: () => void }) {
  const [editor] = useLexicalComposerContext();
  const isInitialized = useRef(false);

  useEffect(() => {
    if (!value || isInitialized.current) {
      if (!value) onInitialized();
      return;
    }

    isInitialized.current = true;

    editor.update(() => {
      const root = $getRoot();
      root.clear();

      const parser = new DOMParser();
      const dom = parser.parseFromString(value, "text/html");

      const nodes = $generateNodesFromDOM(editor, dom);

      nodes.forEach((node) => {
        if (node.getType() === "paragraph" || node.getType() === "list") {
          root.append(node);
        } else {
          const paragraph = $createParagraphNode();
          paragraph.append(node);
          root.append(paragraph);
        }
      });
      onInitialized();
    });
  }, [value, editor, onInitialized]);

  return null;
}

/* ---------------- MAIN EDITOR ---------------- */

interface Props {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Write something amazing about your space",
  disabled = false,
}: Props) {
  const [hasInitialized, setHasInitialized] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <LexicalComposer initialConfig={editorConfig}>
      <div className={cn(
        "relative border rounded-2xl bg-background transition-all duration-300 overflow-hidden",
        "border-border"
      )}>
        <ToolbarPlugin />

        <div className="relative min-h-40">
          {/* SSR & Initial Loading Preview */}
          {(!hasInitialized) && value && (
            <div
              className="absolute inset-0 p-4 prose prose-sm dark:prose-invert max-w-none z-0 pointer-events-none opacity-40"
              dangerouslySetInnerHTML={{ __html: value }}
            />
          )}

          <RichTextPlugin
            contentEditable={
              <ContentEditable className={cn(
                "min-h-40 p-4 outline-none text-sm relative z-10",
                disabled && "pointer-events-none opacity-60",
                !hasInitialized && "opacity-0"
              )} />
            }
            placeholder={
              (!hasInitialized && value) ? null : (
                <div className="pointer-events-none absolute top-4 left-4 text-muted-foreground/30 text-sm italic z-10">
                  {(!hasInitialized && !value) ? "Loading editor..." : placeholder}
                </div>
              )
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
        </div>

        <ListPlugin />
        <HistoryPlugin />

        <OnChangePlugin
          onChange={(editorState: EditorState, editor: LexicalEditor) => {
            editorState.read(() => {
              const html = $generateHtmlFromNodes(editor);
              onChange(html);
            });
          }}
        />

        <LoadInitialValue
          value={value}
          onInitialized={() => setHasInitialized(true)}
        />
      </div>
    </LexicalComposer>
  );
}

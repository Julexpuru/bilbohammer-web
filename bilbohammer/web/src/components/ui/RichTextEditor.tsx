'use client';

import type { ClipboardEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";

type ToolbarAction = {
  key: string;
  icon: string;
  title: string;
  command: string;
};

const TOOLBAR_ACTIONS: ToolbarAction[] = [
  { key: "bold", icon: "B", title: "Negrita", command: "bold" },
  { key: "italic", icon: "I", title: "Cursiva", command: "italic" },
  { key: "underline", icon: "U", title: "Subrayado", command: "underline" },
  { key: "list-ul", icon: "*", title: "Lista sin orden", command: "insertUnorderedList" },
  { key: "list-ol", icon: "1.", title: "Lista ordenada", command: "insertOrderedList" },
];

type RichTextEditorProps = {
  value: string | null;
  onChange: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

/**
 * Ligero editor rich-text basado en contentEditable que expone el contenido HTML como string.
 * Implementa un conjunto reducido de acciones (negrita, cursiva, listas) y fuerza el pegado como texto plano
 * para evitar introducir estilos inesperados.
 */
export function RichTextEditor({
  value,
  onChange,
  placeholder,
  disabled = false,
  className,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Evitamos recrear funciones en cada render cuando no es necesario.
  const normalizedValue = useMemo(() => {
    const normalized = value ?? "";
    return normalized.trim().length ? normalized : "";
  }, [value]);

  useEffect(() => {
    if (!editorRef.current) return;
    const currentHtml = editorRef.current.innerHTML;
    if (normalizedValue !== currentHtml) {
      editorRef.current.innerHTML = normalizedValue;
    }
  }, [normalizedValue]);

  const emitChange = useCallback(() => {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    onChange(html.trim());
  }, [onChange]);

  const handleInput = useCallback(() => {
    emitChange();
  }, [emitChange]);

  const handlePaste = useCallback((event: ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    const text = event.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
  }, []);

  const handleToolbarAction = useCallback(
    (command: string) => {
      if (!editorRef.current) return;
      editorRef.current.focus();
      document.execCommand(command, false);
      emitChange();
    },
    [emitChange],
  );

  return (
    <div
      className={clsx(
        "rounded-2xl border border-white/15 bg-black/20 text-sm text-white shadow-sm transition focus-within:border-white/40",
        disabled && "opacity-60",
        className,
      )}
    >
      <div className="flex items-center gap-1 border-b border-white/10 px-3 py-2 text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
        {TOOLBAR_ACTIONS.map((action) => (
          <button
            key={action.key}
            type="button"
            className="rounded-full border border-transparent px-2 py-1 font-semibold text-white/70 transition hover:border-white/40 hover:text-white"
            title={action.title}
            onClick={() => handleToolbarAction(action.command)}
            disabled={disabled}
          >
            {action.icon}
          </button>
        ))}
      </div>
      <div className="relative">
        {!normalizedValue && !isFocused && placeholder ? (
          <span className="pointer-events-none absolute left-3 top-3 select-none text-xs text-[var(--muted)]">
            {placeholder}
          </span>
        ) : null}
        <div
          ref={editorRef}
          className="max-h-[360px] min-h-[180px] overflow-y-auto px-3 py-3 outline-none"
          contentEditable={!disabled}
          role="textbox"
          aria-multiline="true"
          aria-disabled={disabled}
          data-placeholder={placeholder}
          suppressContentEditableWarning
          onInput={handleInput}
          onPaste={handlePaste}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setIsFocused(false);
            emitChange();
          }}
        />
      </div>
    </div>
  );
}
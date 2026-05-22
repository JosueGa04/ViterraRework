import { useEffect, type ReactNode } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import {
  Bold,
  Italic,
  Link2,
  List,
  ListOrdered,
  Pilcrow,
  Redo2,
  Strikethrough,
  Undo2,
} from "lucide-react";
import { cn } from "../../ui/utils";

type Props = {
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
};

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition",
        active ? "bg-primary/10 text-primary" : "hover:bg-stone-100 hover:text-brand-navy",
        disabled && "cursor-not-allowed opacity-40",
      )}
    >
      {children}
    </button>
  );
}

/** Editor visual (sin código): negritas, listas, enlaces, etc. Guarda HTML para la ficha pública. */
export function RichDescriptionEditor({
  value,
  onChange,
  disabled = false,
  placeholder = "Escribe la descripción con el formato que quieras mostrar en la ficha…",
  className,
}: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Placeholder.configure({ placeholder }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-primary underline" },
      }),
    ],
    content: value || "",
    editable: !disabled,
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML();
      onChange(html === "<p></p>" ? "" : html);
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none min-h-[10rem] px-4 py-3 text-sm text-brand-navy focus:outline-none prose-p:my-2 prose-headings:font-heading prose-headings:text-brand-navy prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5",
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [editor, disabled]);

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    const next = value || "";
    const normalizedCurrent = current === "<p></p>" ? "" : current;
    if (normalizedCurrent !== next) {
      editor.commands.setContent(next || "", { emitUpdate: false });
    }
  }, [editor, value]);

  const setLink = () => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Pega el enlace (https://…)", prev ?? "https://");
    if (url === null) return;
    if (url.trim() === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  };

  if (!editor) {
    return (
      <div className={cn("min-h-[12rem] animate-pulse rounded-xl bg-stone-100", className)} aria-hidden />
    );
  }

  const empty = !value || value === "<p></p>";

  return (
    <div
      className={cn(
        "viterra-rich-editor overflow-hidden rounded-xl border border-stone-200/90 bg-white shadow-sm ring-1 ring-stone-200/50 transition focus-within:border-primary/40 focus-within:ring-primary/15",
        disabled && "opacity-70",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-0.5 border-b border-stone-100 bg-stone-50/80 px-2 py-1.5">
        <ToolbarButton
          title="Negrita"
          disabled={disabled}
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" strokeWidth={2} />
        </ToolbarButton>
        <ToolbarButton
          title="Cursiva"
          disabled={disabled}
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" strokeWidth={2} />
        </ToolbarButton>
        <ToolbarButton
          title="Tachado"
          disabled={disabled}
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough className="h-4 w-4" strokeWidth={2} />
        </ToolbarButton>
        <span className="mx-1 h-5 w-px bg-stone-200" aria-hidden />
        <ToolbarButton
          title="Subtítulo"
          disabled={disabled}
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <span className="text-xs font-bold">H2</span>
        </ToolbarButton>
        <ToolbarButton
          title="Párrafo normal"
          disabled={disabled}
          active={editor.isActive("paragraph")}
          onClick={() => editor.chain().focus().setParagraph().run()}
        >
          <Pilcrow className="h-4 w-4" strokeWidth={2} />
        </ToolbarButton>
        <span className="mx-1 h-5 w-px bg-stone-200" aria-hidden />
        <ToolbarButton
          title="Lista con viñetas"
          disabled={disabled}
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-4 w-4" strokeWidth={2} />
        </ToolbarButton>
        <ToolbarButton
          title="Lista numerada"
          disabled={disabled}
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-4 w-4" strokeWidth={2} />
        </ToolbarButton>
        <ToolbarButton title="Enlace" disabled={disabled} active={editor.isActive("link")} onClick={setLink}>
          <Link2 className="h-4 w-4" strokeWidth={2} />
        </ToolbarButton>
        <span className="mx-1 h-5 w-px bg-stone-200" aria-hidden />
        <ToolbarButton
          title="Deshacer"
          disabled={disabled || !editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo2 className="h-4 w-4" strokeWidth={2} />
        </ToolbarButton>
        <ToolbarButton
          title="Rehacer"
          disabled={disabled || !editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo2 className="h-4 w-4" strokeWidth={2} />
        </ToolbarButton>
      </div>

      <EditorContent editor={editor} />

      <div className="flex items-center justify-between gap-2 border-t border-stone-100 bg-stone-50/50 px-3 py-2 text-[11px] text-slate-500">
        <span>Lo que ves aquí es lo que verán en la ficha (sin escribir código).</span>
        {!empty ? (
          <button
            type="button"
            className="shrink-0 font-medium text-slate-600 hover:text-red-600"
            disabled={disabled}
            onClick={() => {
              if (window.confirm("¿Borrar todo el contenido formateado?")) {
                editor.commands.clearContent();
                onChange("");
              }
            }}
          >
            Vaciar
          </button>
        ) : null}
      </div>
    </div>
  );
}

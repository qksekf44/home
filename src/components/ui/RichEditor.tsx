"use client";
// 리치 텍스트 에디터 (TipTap) — 프로필 탭 등 HTML 콘텐츠 작성용
// 자체 스타일 툴바 (7장 — 기본 UI 금지) · 출력은 HTML, 저장 시 새니타이즈는 렌더 쪽에서 (6.3)
//
// v2.3 변경점
// - 서식: 밑줄(Underline) 추가
// - 목록: 체크박스(TaskList/TaskItem) 추가
// - 정렬: 왼쪽/가운데/오른쪽/양쪽 정렬 추가
// - 제목: H2/H3 버튼 → 본문~H4까지 고르는 드롭다운으로 교체 (여전히 자체 스타일, 기본 select 미사용)
// - 링크: 추가/수정/해제용 자체 팝오버 UI 추가 (window.prompt 사용 안 함)
// - 실행 취소/다시 실행: 이제 모바일에서도 노출 (요구사항에 명시) — 대신 툴바를 줄바꿈(flex-wrap)시켜
//   좁은 화면에서 버튼을 숨기지 않고 여러 줄로 자연스럽게 흘러가게 함 (re-hide-m 규칙 제거)
// - 다크/라이트: prefers-color-scheme 자동 대응 + data-theme="light|dark" 수동 오버라이드 지원 (re-editor.css)
// - 글자 색상: 스와치 팔레트 + 커스텀 피커로 고를 수 있는 자체 팝오버 추가 (TextStyle + Color)
// - 글자 크기: px 단위 커스텀 지정 추가. 공식 확장이 없어 TextStyle 위에 얹는 FontSize를 직접 구현
//   (Color 확장과 동일한 패턴 — textStyle 마크에 fontSize 속성을 추가)
import React, { useEffect, useRef, useState, useCallback } from "react";
import { useEditor, EditorContent, Extension } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Link from "@tiptap/extension-link";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import { putBlob } from "@/lib/blobStore";
import { useToast } from "@/components/ui/Toast";
import "./re-editor.css";

/** px 단위 글자 크기 — 공식 TipTap 확장이 없어 TextStyle 마크에 속성으로 얹어서 구현.
 *  Color 확장(@tiptap/extension-color)이 하는 방식과 동일하다. */
const FontSize = Extension.create({
  name: "fontSize",
  addOptions() {
    return { types: ["textStyle"] };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element: HTMLElement) => element.style.fontSize || null,
            renderHTML: (attributes: { fontSize?: string | null }) => {
              if (!attributes.fontSize) return {};
              return { style: `font-size: ${attributes.fontSize}` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize:
        (fontSize: string) =>
        ({ chain }: any) =>
          chain().setMark("textStyle", { fontSize }).run(),
      unsetFontSize:
        () =>
        ({ chain }: any) =>
          chain()
            .setMark("textStyle", { fontSize: null })
            .removeEmptyTextStyle()
            .run(),
    } as any;
  },
});

/** 로컬 모드용 — 파일을 그대로 본문에 심는다 (서버가 없어 올릴 곳이 없을 때) */
function toDataUrl(f: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(r.error);
    r.readAsDataURL(f);
  });
}

function TBtn({
  on,
  label,
  title,
  onClick,
  disabled,
}: {
  on?: boolean;
  label: React.ReactNode;
  title: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      data-tip={title}
      className={`re-btn ${on ? "on" : ""}`}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

type HeadingChoice = { level: 0 | 1 | 2 | 3 | 4; label: string };
const HEADING_CHOICES: HeadingChoice[] = [
  { level: 0, label: "본문" },
  { level: 1, label: "제목 1" },
  { level: 2, label: "제목 2" },
  { level: 3, label: "제목 3" },
  { level: 4, label: "제목 4" },
];

/** 자체 스타일 드롭다운 — 네이티브 <select> 대신 버튼 + 팝오버 목록 (7장 규칙 준수) */
function HeadingDropdown({ editor }: { editor: any }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const current =
    HEADING_CHOICES.find((c) =>
      c.level === 0
        ? !editor.isActive("heading")
        : editor.isActive("heading", { level: c.level }),
    ) ?? HEADING_CHOICES[0];

  const pick = (c: HeadingChoice) => {
    if (c.level === 0) editor.chain().focus().setParagraph().run();
    else editor.chain().focus().toggleHeading({ level: c.level }).run();
    setOpen(false);
  };

  return (
    <div className="re-dd" ref={wrapRef}>
      <button
        type="button"
        className="re-btn re-dd-trigger"
        data-tip="제목 스타일"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((v) => !v)}
      >
        {current.label} <span className="re-dd-chevron">▾</span>
      </button>
      {open && (
        <div className="re-dd-menu" role="menu">
          {HEADING_CHOICES.map((c) => (
            <button
              key={c.level}
              type="button"
              role="menuitem"
              className={`re-dd-item ${current.level === c.level ? "on" : ""}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(c)}
            >
              {c.level === 0 ? (
                <span>{c.label}</span>
              ) : (
                React.createElement(
                  `h${c.level}` as any,
                  { className: "re-dd-preview" },
                  c.label,
                )
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** 링크 추가/수정/해제 팝오버 — window.prompt 미사용 */
function LinkPopover({ editor }: { editor: any }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const openPopover = () => {
    const existing = editor.getAttributes("link").href as string | undefined;
    setUrl(existing ?? "");
    setOpen(true);
  };

  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const apply = () => {
    const href = url.trim();
    if (!href) {
      editor.chain().focus().unsetLink().run();
    } else {
      const withScheme = /^([a-z][a-z0-9+.-]*:|#|\/)/i.test(href)
        ? href
        : `https://${href}`;
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: withScheme })
        .run();
    }
    setOpen(false);
  };

  const remove = () => {
    editor.chain().focus().unsetLink().run();
    setOpen(false);
  };

  return (
    <div className="re-dd" ref={wrapRef}>
      <TBtn
        title="링크"
        label="🔗"
        on={editor.isActive("link") || open}
        onClick={openPopover}
      />
      {open && (
        <div
          className="re-dd-menu re-link-menu"
          role="dialog"
          aria-label="링크 편집"
        >
          <input
            ref={inputRef}
            className="re-link-input"
            type="text"
            inputMode="url"
            placeholder="https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                apply();
              }
              if (e.key === "Escape") {
                e.preventDefault();
                setOpen(false);
              }
            }}
          />
          <div className="re-link-actions">
            {editor.isActive("link") && (
              <button
                type="button"
                className="re-btn re-link-remove"
                onMouseDown={(e) => e.preventDefault()}
                onClick={remove}
              >
                링크 제거
              </button>
            )}
            <button
              type="button"
              className="re-btn re-link-apply"
              onMouseDown={(e) => e.preventDefault()}
              onClick={apply}
            >
              적용
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** 글자 크기 팝오버 — px 직접 입력만 제공 */
function FontSizePopover({ editor }: { editor: any }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentRaw =
    (editor.getAttributes("textStyle").fontSize as string | undefined) ?? "";
  const currentPx = currentRaw ? parseInt(currentRaw, 10) : null;

  const openPopover = () => {
    setInput(currentPx ? String(currentPx) : "");
    setOpen(true);
  };

  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const apply = () => {
    const px = parseInt(input, 10);
    if (!Number.isFinite(px) || px < 1) return;
    (editor.chain().focus() as any).setFontSize(`${px}px`).run();
    setOpen(false);
  };

  const remove = () => {
    (editor.chain().focus() as any).unsetFontSize().run();
    setOpen(false);
  };

  return (
    <div className="re-dd" ref={wrapRef}>
      <button
        type="button"
        className="re-btn re-dd-trigger"
        data-tip="글자 크기"
        onMouseDown={(e) => e.preventDefault()}
        onClick={openPopover}
      >
        {currentPx ? `${currentPx}px` : "크기"}{" "}
        <span className="re-dd-chevron">▾</span>
      </button>
      {open && (
        <div
          className="re-dd-menu re-size-menu"
          role="dialog"
          aria-label="글자 크기 입력"
        >
          <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
            <input
              ref={inputRef}
              className="re-link-input"
              type="number"
              inputMode="numeric"
              min={1}
              max={400}
              placeholder="크기 (px)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  apply();
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  setOpen(false);
                }
              }}
              style={{ flex: 1 }}
            />
            <button
              type="button"
              className="re-btn re-link-apply"
              onMouseDown={(e) => e.preventDefault()}
              onClick={apply}
            >
              적용
            </button>
          </div>
          <button
            type="button"
            className="re-btn re-color-remove"
            onMouseDown={(e) => e.preventDefault()}
            onClick={remove}
            style={{ width: "100%" }}
          >
            기본 크기로
          </button>
        </div>
      )}
    </div>
  );
}

/** 글자 색상 스와치 — 미리 정한 팔레트 + 커스텀 피커 + 색 지우기 */
const COLOR_SWATCHES = [
  "#1a1a1a",
  "#6b7280",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#2563eb",
  "#6366f1",
  "#a855f7",
  "#ec4899",
  "#ffffff",
];

function ColorPopover({ editor }: { editor: any }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState("#000000"); // 아직 적용 전인 선택값
  const wrapRef = useRef<HTMLDivElement>(null);

  const current =
    (editor.getAttributes("textStyle").color as string | undefined) ?? "";

  const openPopover = () => {
    setPending(/^#([0-9a-f]{6})$/i.test(current) ? current : "#000000");
    setOpen(true);
  };

  // 바깥을 누르거나 Esc를 누르면 적용 없이 닫힘
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node))
        setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const apply = () => {
    editor.chain().focus().setColor(pending).run();
    setOpen(false);
  };

  const remove = () => {
    editor.chain().focus().unsetColor().run();
    setOpen(false);
  };

  return (
    <div className="re-dd" ref={wrapRef}>
      <button
        type="button"
        className="re-btn re-color-trigger"
        data-tip="글자 색상"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => (open ? setOpen(false) : openPopover())}
      >
        <span>A</span>
        <span
          className="re-color-chip"
          style={{ background: current || "currentColor" }}
        />
      </button>
      {open && (
        <div
          className="re-dd-menu re-color-menu"
          role="dialog"
          aria-label="글자 색상 선택"
          // 색 입력칸(input) 외에는 에디터 포커스/선택 영역을 뺏기지 않게 한다
          onMouseDown={(e) => {
            if ((e.target as HTMLElement).tagName !== "INPUT")
              e.preventDefault();
          }}
        >
          {/* 스와치: 눌러도 닫히지 않고 선택만 바뀐다 */}
          <div className="re-color-grid">
            {COLOR_SWATCHES.map((hex) => (
              <button
                key={hex}
                type="button"
                className={`re-color-swatch ${pending.toLowerCase() === hex ? "on" : ""}`}
                style={{ background: hex }}
                data-tip={hex}
                onClick={() => setPending(hex)}
              />
            ))}
          </div>

          {/* 직접 선택: 원판에서 드래그해도 pending만 바뀌고 팝오버는 유지 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 10,
            }}
          >
            <input
              type="color"
              value={pending}
              onChange={(e) => setPending(e.target.value)}
              onClick={(e) =>
                e.stopPropagation()
              } /* 모바일 색상창 클릭시 팝오버 닫힘 방지 */
              aria-label="직접 색 선택"
              style={{
                width: 36,
                height: 28,
                padding: 0,
                border: "none",
                background: "none",
                cursor: "pointer",
              }}
            />
            <code style={{ fontSize: 12 }}>{pending.toUpperCase()}</code>
            <span
              title="미리보기"
              style={{
                marginLeft: "auto",
                width: 22,
                height: 22,
                borderRadius: 4,
                background: pending,
                border: "1px solid rgba(128,128,128,.4)",
              }}
            />
          </div>

          <div
            style={{
              display: "flex",
              gap: 6,
              marginTop: 10,
              alignItems: "center",
            }}
          >
            <button
              type="button"
              className="re-btn re-color-remove"
              onClick={remove}
            >
              색상 지우기
            </button>
            <span style={{ marginLeft: "auto" }} />
            <button
              type="button"
              className="re-btn"
              data-tip="취소"
              onClick={() => setOpen(false)}
            >
              ✕
            </button>
            <button
              type="button"
              className="re-btn re-link-apply"
              data-tip="적용"
              onClick={apply}
            >
              ✓
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function RichEditor({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}) {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      Underline,
      TextStyle,
      Color,
      FontSize,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: {
          rel: "noopener noreferrer nofollow",
          target: "_blank",
        },
      }),
    ],
    content: value || "<p></p>",
    immediatelyRender: false,
    editorProps: {
      attributes: { class: "re-content prose" },
    },
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
  });

  // 외부 값이 완전히 바뀐 경우(탭 전환) 동기화
  useEffect(() => {
    if (editor && value !== editor.getHTML() && !editor.isFocused) {
      editor.commands.setContent(value || "<p></p>", { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  const insertImage = useCallback(
    async (f?: File) => {
      if (!editor || !f) return;
      setBusy(true);
      try {
        const ref = await putBlob(f);
        const src = /^https?:/.test(ref) ? ref : await toDataUrl(f);
        editor.chain().focus().setImage({ src }).run();
      } catch (e) {
        // 조용히 실패하면 「올렸는데 왜 안 들어가지」가 된다 — 사유를 그대로 보여 준다
        toast(
          `이미지를 올리지 못했습니다 — ${e instanceof Error ? e.message : String(e)}`,
        );
      }
      setBusy(false);
    },
    [editor, toast],
  );

  if (!editor) return <div className="re-wrap" style={{ minHeight: 200 }} />;

  return (
    <div className="re-wrap">
      <div className="re-toolbar">
        <HeadingDropdown editor={editor} />
        <span className="re-sep" />
        <TBtn
          title="굵게"
          label={<b>B</b>}
          on={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        />
        <TBtn
          title="기울임"
          label={<i>I</i>}
          on={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        />
        <TBtn
          title="밑줄"
          label={<u>U</u>}
          on={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        />
        <TBtn
          title="취소선"
          label={<s>S</s>}
          on={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        />
        <ColorPopover editor={editor} />
        <span className="re-sep" />
        <TBtn
          title="왼쪽 정렬"
          label="⇤"
          on={editor.isActive({ textAlign: "left" })}
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
        />
        <TBtn
          title="가운데 정렬"
          label="⇔"
          on={editor.isActive({ textAlign: "center" })}
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
        />
        <TBtn
          title="오른쪽 정렬"
          label="⇥"
          on={editor.isActive({ textAlign: "right" })}
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
        />
        <TBtn
          title="양쪽 정렬"
          label="☰"
          on={editor.isActive({ textAlign: "justify" })}
          onClick={() => editor.chain().focus().setTextAlign("justify").run()}
        />
        <span className="re-sep" />
        <TBtn
          title="글머리 목록"
          label="•≡"
          on={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        />
        <TBtn
          title="번호 목록"
          label="1≡"
          on={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        />
        <TBtn
          title="체크리스트"
          label="☑"
          on={editor.isActive("taskList")}
          onClick={() => editor.chain().focus().toggleTaskList().run()}
        />
        <TBtn
          title="인용"
          label="❝"
          on={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        />
        <TBtn
          title="구분선"
          label="—"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        />
        <span className="re-sep" />
        <LinkPopover editor={editor} />
        <FontSizePopover editor={editor} />
        <TBtn
          title={busy ? "올리는 중…" : "이미지 올리기"}
          label={busy ? "⏳" : "🖼"}
          onClick={() => {
            if (!busy) fileRef.current?.click();
          }}
        />
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            void insertImage(f);
          }}
        />
        <span className="re-sep" />
        <TBtn
          title="실행 취소"
          label="↶"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
        />
        <TBtn
          title="다시 실행"
          label="↷"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
        />
      </div>
      {/* 플레이스홀더는 본문 영역 기준으로 — 툴바가 여러 줄이 돼도 안 밀림 (v1.9 사용자 발견) */}
      <div className="re-body">
        <EditorContent editor={editor} />
        {placeholder && editor.isEmpty && (
          <div className="re-ph">{placeholder}</div>
        )}
      </div>
    </div>
  );
}

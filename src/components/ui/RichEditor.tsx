"use client";
// 리치 텍스트 에디터 (TipTap) — 프로필 탭 등 HTML 콘텐츠 작성용
// 자체 스타일 툴바 (7장 — 기본 UI 금지) · 출력은 HTML, 저장 시 새니타이즈는 렌더 쪽에서 (6.3)
//
// v2.8 변경점 — 이미지 정렬을 updateAttributes 대신 트랜잭션으로 직접 적용
// - 선택된 이미지(NodeSelection)의 노드 속성을 setNodeMarkup 으로 바꾼다 (getSelectedImage / setImageAlign)
// - 스키마에 align 속성이 없으면(AlignableImage 미등록 등) 조용히 실패하지 않고 콘솔에 원인을 출력한다
// - 툴바/메뉴가 "이미지가 선택됐는지"를 isActive 가 아니라 같은 함수(getSelectedImage)로 판단
//
// v2.7 변경점 — 이미지 선택/정렬 보강
// - 이미지를 클릭하면 이미지 바로 옆에 정렬 메뉴(왼쪽/가운데/오른쪽)가 뜬다 (ImageAlignMenu, FloatingMenu 재사용)
// - 선택된 이미지에 파란 테두리 표시 (re-editor.additions.css) — 선택됐는지 눈으로 확인 가능
// - 툴바 정렬 버튼이 "렌더 시점의 값"이 아니라 클릭 순간의 실제 선택 상태를 보고 이미지/문단을 결정
//   (useEditorState 구독 추가 → 선택이 바뀌면 툴바도 즉시 갱신)
//
// v2.6 변경점 — SimpleEditor(tiptap 템플릿)의 기능을 전부 이식 (UI는 전부 자체 스타일로 새로 구현)
// - 서식: 인라인 코드(code), 형광펜(Highlight, multicolor), 위 첨자(Superscript), 아래 첨자(Subscript)
// - 블록: 코드 블록(CodeBlock) 버튼 추가
// - 형광펜: 스와치 팔레트 + 커스텀 피커 + 지우기 자체 팝오버 (HighlightPopover)
// - 찾기/바꾸기: FindAndReplace 확장 + 자체 패널 (FindReplacePanel)
//   · 이전/다음 결과, 대소문자 구분, 단어 단위, 정규식, 바꾸기, 모두 바꾸기, 결과 개수 표시
//   · 툴바의 🔍 버튼으로 열고 닫는다. 닫으면 검색어와 하이라이트가 지워진다
// - Typography: "..." → …, "->" → →, 따옴표 등 자동 치환
// - Selection: 에디터가 포커스를 잃어도(팝오버/찾기 패널 사용 중) 선택 영역이 계속 보인다 (.selection 클래스)
// - Link: enableClickSelection — 링크를 클릭하면 링크 전체가 선택된다
// ※ 새니타이저(렌더 쪽, 6.3) 허용 목록에 mark(style, data-color), sub, sup, pre, code(class) 를 추가해야 한다
//
// v2.5 변경점
// - 이미지 정렬: 이미지를 클릭(선택)한 뒤 정렬 버튼을 누르면 이미지 자체의 align 속성이 바뀐다.
//   · AlignableImage: Image 확장에 align 속성 추가 (data-align + display:block + margin auto)
//   · 문단 text-align과 무관하므로 CSS의 img { display:block } 과도 충돌하지 않는다
//   · 이미지가 선택돼 있으면 정렬 버튼이 이미지에, 아니면 기존처럼 문단에 적용 (양쪽 정렬은 이미지에서 비활성)
//
// v2.4 변경점
// - 모바일에서 팝오버(컬러피커/링크/글자 크기/제목)가 가려지던 문제 수정
//   · 모든 팝오버를 FloatingMenu로 교체: document.body(또는 <dialog>)로 포털 + position: fixed
//   · visualViewport 기준으로 좌표 계산 → 아래 공간이 모자라면 위로 뒤집고, 좌우는 화면 안으로 clamp
//   · 포털로 옮겼으므로 바깥 클릭 판정은 wrapRef + menuRef 둘 다 확인 (pointerdown, Esc 지원)
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
import React, {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { createPortal } from "react-dom";
import {
  useEditor,
  useEditorState,
  EditorContent,
  Extension,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Link from "@tiptap/extension-link";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import { Typography } from "@tiptap/extension-typography";
import { Highlight } from "@tiptap/extension-highlight";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import { FindAndReplace } from "@tiptap/extension-find-and-replace";
import { Selection } from "@tiptap/extensions";
import { NodeSelection } from "@tiptap/pm/state";
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

/** 정렬 속성(align)을 가진 이미지 — 이미지를 클릭(선택)한 뒤 정렬 버튼을 누르면 이 속성이 바뀐다.
 *  블록 이미지 + margin auto 방식이라 문단 text-align과 무관하게 동작한다.
 *  저장되는 HTML: <img data-align="center" style="display:block;margin-left:auto;margin-right:auto"> */
const ALIGN_STYLE: Record<string, string> = {
  left: "margin-left:0;margin-right:auto",
  center: "margin-left:auto;margin-right:auto",
  right: "margin-left:auto;margin-right:0",
};

const AlignableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      align: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute("data-align"),
        renderHTML: (attrs: { align?: string | null }) => {
          if (!attrs.align || !ALIGN_STYLE[attrs.align]) return {};
          return {
            "data-align": attrs.align,
            style: `display:block;${ALIGN_STYLE[attrs.align]}`,
          };
        },
      },
    };
  },
});

/** 지금 선택돼 있는 이미지 노드 선택(NodeSelection)을 돌려준다. 이미지가 선택돼 있지 않으면 null. */
function getSelectedImage(editor: any): NodeSelection | null {
  const sel = editor?.state?.selection;
  return sel instanceof NodeSelection && sel.node.type.name === "image"
    ? sel
    : null;
}

/** 로컬 모드용 — 파일을 그대로 본문에 심는다 (서버가 없어 올릴 곳이 없을 때) */
function toDataUrl(f: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(r.error);
    r.readAsDataURL(f);
  });
}

/* ------------------------------------------------------------------ */
/* 팝오버 공용 부품                                                    */
/* ------------------------------------------------------------------ */

/** 포털 + fixed 팝오버 — 조상의 overflow/z-index/스택 컨텍스트와 무관하게 뷰포트 안에 항상 보이도록 배치.
 *  - 아래 공간이 모자라면 위로 뒤집고, 좌우는 화면 안으로 clamp
 *  - visualViewport 기준이라 모바일 키보드/주소창 변화에도 대응
 *  - <dialog>(top layer) 안에서 쓰면 body 포털은 그 뒤로 깔리므로 dialog 안으로 포털 */
function FloatingMenu({
  anchorRef,
  menuRef,
  className = "",
  children,
  ...rest
}: {
  anchorRef: React.RefObject<HTMLElement | null>;
  menuRef: React.RefObject<HTMLDivElement | null>;
  className?: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>) {
  const [style, setStyle] = useState<React.CSSProperties>({
    position: "fixed",
    top: 0,
    left: 0,
    visibility: "hidden", // 크기를 잰 뒤에 보이게 (깜빡임 방지)
  });

  useLayoutEffect(() => {
    const place = () => {
      const a = anchorRef.current;
      const m = menuRef.current;
      if (!a || !m) return;

      const vv = window.visualViewport;
      const vTop = vv?.offsetTop ?? 0;
      const vLeft = vv?.offsetLeft ?? 0;
      const vW = vv?.width ?? window.innerWidth;
      const vH = vv?.height ?? window.innerHeight;
      const PAD = 8;
      const GAP = 4;

      const r = a.getBoundingClientRect();
      const mw = m.offsetWidth;
      const mh = m.offsetHeight;

      const spaceBelow = vTop + vH - r.bottom - PAD;
      const spaceAbove = r.top - vTop - PAD;
      const below = spaceBelow >= mh || spaceBelow >= spaceAbove;

      let top = below ? r.bottom + GAP : r.top - GAP - mh;
      top = Math.max(vTop + PAD, Math.min(top, vTop + vH - mh - PAD));
      const left = Math.max(
        vLeft + PAD,
        Math.min(r.left, vLeft + vW - mw - PAD),
      );
      const maxHeight = vH - PAD * 2;

      // 값이 같으면 state를 바꾸지 않아 스크롤 중 불필요한 리렌더를 막는다
      setStyle((prev) =>
        prev.top === top &&
        prev.left === left &&
        prev.maxHeight === maxHeight &&
        prev.visibility === "visible"
          ? prev
          : {
              position: "fixed",
              top,
              left,
              maxHeight,
              visibility: "visible",
            },
      );
    };

    place();
    const vv = window.visualViewport;
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true); // 스크롤되는 조상까지 포착
    vv?.addEventListener("resize", place);
    vv?.addEventListener("scroll", place);
    const ro = new ResizeObserver(place);
    if (menuRef.current) ro.observe(menuRef.current);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      vv?.removeEventListener("resize", place);
      vv?.removeEventListener("scroll", place);
      ro.disconnect();
    };
  }, [anchorRef, menuRef]);

  const host =
    (anchorRef.current?.closest("dialog") as HTMLElement | null) ??
    document.body;
  // 테마 변수는 .re-wrap / .re-float 에 정의돼 있어서, 수동 오버라이드(data-theme)도 같이 넘긴다
  const theme =
    anchorRef.current?.closest(".re-wrap")?.getAttribute("data-theme") ??
    undefined;

  return createPortal(
    <div
      ref={menuRef as React.RefObject<HTMLDivElement>}
      className={`re-float ${className}`}
      data-theme={theme}
      style={style}
      {...rest}
    >
      {children}
    </div>,
    host,
  );
}

/** 바깥을 누르거나 Esc를 누르면 닫힘. 포털로 나간 메뉴 안쪽도 "안쪽"으로 판정한다. */
function useOutsideClose(
  open: boolean,
  setOpen: (v: boolean) => void,
  wrapRef: React.RefObject<HTMLElement | null>,
  menuRef: React.RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: PointerEvent) => {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, setOpen, wrapRef, menuRef]);
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

/* ------------------------------------------------------------------ */
/* 제목 드롭다운                                                       */
/* ------------------------------------------------------------------ */

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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useOutsideClose(open, setOpen, wrapRef, menuRef);

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
        ref={triggerRef}
        type="button"
        className="re-btn re-dd-trigger"
        data-tip="제목 스타일"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((v) => !v)}
      >
        {current.label} <span className="re-dd-chevron">▾</span>
      </button>
      {open && (
        <FloatingMenu
          anchorRef={triggerRef}
          menuRef={menuRef}
          className="re-dd-menu"
          role="menu"
        >
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
        </FloatingMenu>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 링크 팝오버                                                         */
/* ------------------------------------------------------------------ */

/** 링크 추가/수정/해제 팝오버 — window.prompt 미사용 */
function LinkPopover({ editor }: { editor: any }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useOutsideClose(open, setOpen, wrapRef, menuRef);

  const openPopover = () => {
    const existing = editor.getAttributes("link").href as string | undefined;
    setUrl(existing ?? "");
    setOpen(true);
  };

  useEffect(() => {
    if (open)
      requestAnimationFrame(() =>
        inputRef.current?.focus({ preventScroll: true }),
      );
  }, [open]);

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
      {/* TBtn은 ref를 받지 않으므로 앵커는 감싸는 div로 잡는다 */}
      <div ref={triggerRef} style={{ display: "inline-flex" }}>
        <TBtn
          title="링크"
          label="🔗"
          on={editor.isActive("link") || open}
          onClick={() => (open ? setOpen(false) : openPopover())}
        />
      </div>
      {open && (
        <FloatingMenu
          anchorRef={triggerRef}
          menuRef={menuRef}
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
        </FloatingMenu>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 글자 크기 팝오버                                                    */
/* ------------------------------------------------------------------ */

/** 글자 크기 팝오버 — px 직접 입력만 제공 */
function FontSizePopover({ editor }: { editor: any }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useOutsideClose(open, setOpen, wrapRef, menuRef);

  const currentRaw =
    (editor.getAttributes("textStyle").fontSize as string | undefined) ?? "";
  const currentPx = currentRaw ? parseInt(currentRaw, 10) : null;

  const openPopover = () => {
    setInput(currentPx ? String(currentPx) : "");
    setOpen(true);
  };

  useEffect(() => {
    if (open)
      requestAnimationFrame(() =>
        inputRef.current?.focus({ preventScroll: true }),
      );
  }, [open]);

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
        ref={triggerRef}
        type="button"
        className="re-btn re-dd-trigger"
        data-tip="글자 크기"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => (open ? setOpen(false) : openPopover())}
      >
        {currentPx ? `${currentPx}px` : "크기"}{" "}
        <span className="re-dd-chevron">▾</span>
      </button>
      {open && (
        <FloatingMenu
          anchorRef={triggerRef}
          menuRef={menuRef}
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
        </FloatingMenu>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 글자 색상 팝오버                                                    */
/* ------------------------------------------------------------------ */

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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // 바깥을 누르거나 Esc를 누르면 적용 없이 닫힘
  useOutsideClose(open, setOpen, wrapRef, menuRef);

  const current =
    (editor.getAttributes("textStyle").color as string | undefined) ?? "";

  const openPopover = () => {
    setPending(/^#([0-9a-f]{6})$/i.test(current) ? current : "#000000");
    setOpen(true);
  };

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
        ref={triggerRef}
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
        <FloatingMenu
          anchorRef={triggerRef}
          menuRef={menuRef}
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
        </FloatingMenu>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 형광펜 팝오버                                                       */
/* ------------------------------------------------------------------ */

/** 형광펜 스와치 — 파스텔 톤 (글자색이 어두운 배경/밝은 배경 모두에서 읽히도록 채도를 낮춤) */
const HIGHLIGHT_SWATCHES = [
  "#fef08a", // 노랑
  "#fed7aa", // 주황
  "#fecaca", // 빨강
  "#fbcfe8", // 분홍
  "#ddd6fe", // 보라
  "#bfdbfe", // 파랑
  "#a5f3fc", // 청록
  "#bbf7d0", // 초록
];

/** 형광펜 팝오버 — 스와치는 누르면 바로 적용(SimpleEditor와 동일), 커스텀 색은 ✓ 로 적용 */
function HighlightPopover({ editor }: { editor: any }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState("#fef08a");
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useOutsideClose(open, setOpen, wrapRef, menuRef);

  const current =
    (editor.getAttributes("highlight").color as string | undefined) ?? "";

  const openPopover = () => {
    setPending(/^#([0-9a-f]{6})$/i.test(current) ? current : "#fef08a");
    setOpen(true);
  };

  const applyColor = (color: string) => {
    editor.chain().focus().setHighlight({ color }).run();
    setOpen(false);
  };

  const remove = () => {
    editor.chain().focus().unsetHighlight().run();
    setOpen(false);
  };

  return (
    <div className="re-dd" ref={wrapRef}>
      <button
        ref={triggerRef}
        type="button"
        className={`re-btn ${editor.isActive("highlight") || open ? "on" : ""}`}
        data-tip="형광펜"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => (open ? setOpen(false) : openPopover())}
      >
        <span
          style={{
            background: current || "#fef08a",
            color: "#1a1a1a",
            padding: "0 4px",
            borderRadius: 3,
            fontWeight: 700,
          }}
        >
          A
        </span>
      </button>
      {open && (
        <FloatingMenu
          anchorRef={triggerRef}
          menuRef={menuRef}
          className="re-dd-menu re-color-menu"
          role="dialog"
          aria-label="형광펜 색상 선택"
          onMouseDown={(e) => {
            if ((e.target as HTMLElement).tagName !== "INPUT")
              e.preventDefault();
          }}
        >
          <div className="re-color-grid">
            {HIGHLIGHT_SWATCHES.map((hex) => (
              <button
                key={hex}
                type="button"
                className={`re-color-swatch ${current.toLowerCase() === hex ? "on" : ""}`}
                style={{ background: hex }}
                data-tip={hex}
                onClick={() => applyColor(hex)}
              />
            ))}
          </div>

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
              onClick={(e) => e.stopPropagation()}
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
            <button
              type="button"
              className="re-btn re-link-apply"
              data-tip="적용"
              style={{ marginLeft: "auto" }}
              onClick={() => applyColor(pending)}
            >
              ✓
            </button>
          </div>

          <div style={{ marginTop: 10 }}>
            <button
              type="button"
              className="re-btn re-color-remove"
              onClick={remove}
              style={{ width: "100%" }}
            >
              형광펜 지우기
            </button>
          </div>
        </FloatingMenu>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 찾기/바꾸기 패널                                                    */
/* ------------------------------------------------------------------ */

/** 찾기/바꾸기 — FindAndReplace 확장(headless)의 명령/스토리지에 자체 UI를 연결한다.
 *  - 검색어 입력: Enter = 다음 결과, Shift+Enter = 이전 결과, Esc = 닫기
 *  - 바꿀 말 입력: Enter = 바꾸기
 *  - 패널이 닫히면(언마운트) 검색어와 하이라이트를 지운다 */
function FindReplacePanel({
  editor,
  onClose,
}: {
  editor: any;
  onClose: () => void;
}) {
  const [find, setFind] = useState("");
  const [repl, setRepl] = useState("");
  const findRef = useRef<HTMLInputElement>(null);

  const st = useEditorState({
    editor,
    selector: ({ editor: e }: { editor: any }) => {
      const s = e?.storage?.findAndReplace;
      return {
        count: (s?.results?.length ?? 0) as number,
        index: (s?.currentIndex ?? null) as number | null,
        caseSensitive: !!s?.caseSensitive,
        wholeWord: !!s?.wholeWord,
        useRegex: !!s?.useRegex,
      };
    },
  });

  useEffect(() => {
    requestAnimationFrame(() =>
      findRef.current?.focus({ preventScroll: true }),
    );
    return () => {
      if (!editor.isDestroyed) editor.commands.clearSearch();
    };
  }, [editor]);

  const onFind = (v: string) => {
    setFind(v);
    editor.commands.setSearchTerm(v);
  };
  const onRepl = (v: string) => {
    setRepl(v);
    editor.commands.setReplaceTerm(v);
  };

  const next = () => editor.commands.goToNextResult();
  const prev = () => editor.commands.goToPreviousResult();
  const replaceOne = () => {
    editor.commands.setReplaceTerm(repl);
    editor.commands.replace();
  };
  const replaceAll = () => {
    editor.commands.setReplaceTerm(repl);
    editor.commands.replaceAll();
  };

  const hasResults = st.count > 0;
  const countLabel = !find
    ? ""
    : hasResults
      ? `${(st.index ?? 0) + 1} / ${st.count}`
      : "결과 없음";

  return (
    <div className="re-find" role="search" aria-label="찾기 및 바꾸기">
      <div className="re-find-row">
        <input
          ref={findRef}
          className="re-link-input re-find-input"
          type="text"
          placeholder="찾기"
          value={find}
          onChange={(e) => onFind(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (e.shiftKey) prev();
              else next();
            }
            if (e.key === "Escape") {
              e.preventDefault();
              onClose();
            }
          }}
        />
        <span className="re-find-count" aria-live="polite">
          {countLabel}
        </span>
        <TBtn
          title="이전 결과"
          label="↑"
          disabled={!hasResults}
          onClick={prev}
        />
        <TBtn
          title="다음 결과"
          label="↓"
          disabled={!hasResults}
          onClick={next}
        />
        <TBtn
          title="대소문자 구분"
          label="Aa"
          on={st.caseSensitive}
          onClick={() => editor.commands.setCaseSensitive(!st.caseSensitive)}
        />
        <TBtn
          title="단어 단위 (정규식에서는 무시됨)"
          label="단어"
          on={st.wholeWord}
          disabled={st.useRegex}
          onClick={() => editor.commands.setWholeWord(!st.wholeWord)}
        />
        <TBtn
          title="정규식"
          label=".*"
          on={st.useRegex}
          onClick={() => editor.commands.setUseRegex(!st.useRegex)}
        />
        <TBtn title="닫기" label="✕" onClick={onClose} />
      </div>
      <div className="re-find-row">
        <input
          className="re-link-input re-find-input"
          type="text"
          placeholder="바꿀 말"
          value={repl}
          onChange={(e) => onRepl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              replaceOne();
            }
            if (e.key === "Escape") {
              e.preventDefault();
              onClose();
            }
          }}
        />
        <button
          type="button"
          className="re-btn"
          disabled={!hasResults}
          onMouseDown={(e) => e.preventDefault()}
          onClick={replaceOne}
        >
          바꾸기
        </button>
        <button
          type="button"
          className="re-btn"
          disabled={!hasResults}
          onMouseDown={(e) => e.preventDefault()}
          onClick={replaceAll}
        >
          모두 바꾸기
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 이미지 정렬 메뉴                                                    */
/* ------------------------------------------------------------------ */

/** 이미지를 선택(클릭)했을 때 그 이미지에 붙어서 뜨는 정렬 메뉴.
 *  - 앵커는 선택된 <img> DOM 요소. 이미지가 바뀌거나 정렬이 바뀌면(이미지가 옆으로 이동) key로 다시 배치한다
 *  - 메뉴를 눌러도 에디터의 이미지 선택(NodeSelection)이 풀리지 않도록 mousedown 기본 동작을 막는다 */
function ImageAlignMenu({
  editor,
  align,
  onAlign,
}: {
  editor: any;
  align: "left" | "center" | "right";
  onAlign: (a: "left" | "center" | "right") => void;
}) {
  const anchorRef = useRef<HTMLElement | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const dom = editor.view.nodeDOM(editor.state.selection.from);
  anchorRef.current = dom instanceof HTMLElement ? dom : null;
  if (!anchorRef.current) return null;

  return (
    <FloatingMenu
      anchorRef={anchorRef}
      menuRef={menuRef}
      className="re-dd-menu re-img-menu"
      role="toolbar"
      aria-label="이미지 정렬"
      onMouseDown={(e) => e.preventDefault()}
    >
      <div style={{ display: "flex", gap: 4 }}>
        <TBtn
          title="이미지 왼쪽 정렬"
          label="⇤"
          on={align === "left"}
          onClick={() => onAlign("left")}
        />
        <TBtn
          title="이미지 가운데 정렬"
          label="⇔"
          on={align === "center"}
          onClick={() => onAlign("center")}
        />
        <TBtn
          title="이미지 오른쪽 정렬"
          label="⇥"
          on={align === "right"}
          onClick={() => onAlign("right")}
        />
      </div>
    </FloatingMenu>
  );
}

/* ------------------------------------------------------------------ */
/* 에디터 본체                                                         */
/* ------------------------------------------------------------------ */

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
  const [findOpen, setFindOpen] = useState(false);
  const editor = useEditor({
    extensions: [
      StarterKit,
      AlignableImage,
      Underline,
      TextStyle,
      Color,
      FontSize,
      Highlight.configure({ multicolor: true }),
      Superscript,
      Subscript,
      Typography,
      Selection,
      FindAndReplace.configure({ searchDebounceMs: 500 }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Link.configure({
        openOnClick: false,
        enableClickSelection: true,
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

  // 이미지 선택 상태 구독 — 렌더 중 editor.isActive()를 직접 읽으면 선택만 바뀌었을 때 갱신이 안 될 수 있다
  const img = useEditorState({
    editor,
    selector: ({ editor: e }: { editor: any }) => {
      const sel = getSelectedImage(e);
      return {
        selected: !!sel,
        pos: sel ? sel.from : 0,
        align: (sel?.node.attrs.align ?? "left") as "left" | "center" | "right",
      };
    },
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

  // 이미지가 선택돼 있으면 정렬 버튼은 이미지에, 아니면 문단에 적용한다
  const imageSelected = img?.selected;

  /** 선택된 이미지의 align 속성을 직접 바꾼다 (updateAttributes 를 거치지 않는다) */
  const setImageAlign = (a: "left" | "center" | "right") => {
    const sel = getSelectedImage(editor);
    if (!sel) return;

    const attrsSpec = sel.node.type.spec.attrs;
    if (!attrsSpec || !("align" in attrsSpec)) {
      // setNodeMarkup 은 스키마에 없는 속성을 조용히 버린다 — 그래서 먼저 확인해서 원인을 알려 준다
      console.error(
        "[RichEditor] image 노드에 align 속성이 없습니다. AlignableImage 가 extensions 에 등록돼 있는지, " +
          "다른 Image 확장이 같은 이름('image')으로 덮어쓰고 있지 않은지 확인하세요.",
        attrsSpec,
      );
      return;
    }

    const tr = editor.state.tr.setNodeMarkup(sel.from, undefined, {
      ...sel.node.attrs,
      align: a,
    });
    tr.setSelection(NodeSelection.create(tr.doc, sel.from)); // 이미지 선택 유지
    editor.view.dispatch(tr);
    editor.view.focus();
  };

  const setAlign = (a: "left" | "center" | "right" | "justify") => {
    // 클릭 순간의 실제 선택 상태로 판단 (렌더 때 캡처한 값은 낡았을 수 있다)
    if (getSelectedImage(editor)) {
      if (a === "justify") return; // 이미지에는 양쪽 정렬이 없음
      setImageAlign(a);
    } else {
      editor.chain().focus().setTextAlign(a).run();
    }
  };

  const isAlign = (a: "left" | "center" | "right" | "justify") =>
    imageSelected ? img.align === a : editor.isActive({ textAlign: a });

  const closeFind = () => {
    setFindOpen(false);
    editor.commands.focus();
  };

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
        <TBtn
          title="인라인 코드"
          label={<span style={{ fontFamily: "monospace" }}>{"</>"}</span>}
          on={editor.isActive("code")}
          onClick={() => editor.chain().focus().toggleCode().run()}
        />
        <ColorPopover editor={editor} />
        <HighlightPopover editor={editor} />
        <span className="re-sep" />
        <TBtn
          title="위 첨자"
          label={
            <span>
              x<sup>2</sup>
            </span>
          }
          on={editor.isActive("superscript")}
          onClick={() => editor.chain().focus().toggleSuperscript().run()}
        />
        <TBtn
          title="아래 첨자"
          label={
            <span>
              x<sub>2</sub>
            </span>
          }
          on={editor.isActive("subscript")}
          onClick={() => editor.chain().focus().toggleSubscript().run()}
        />
        <span className="re-sep" />
        <TBtn
          title="왼쪽 정렬"
          label="⇤"
          on={isAlign("left")}
          onClick={() => setAlign("left")}
        />
        <TBtn
          title="가운데 정렬"
          label="⇔"
          on={isAlign("center")}
          onClick={() => setAlign("center")}
        />
        <TBtn
          title="오른쪽 정렬"
          label="⇥"
          on={isAlign("right")}
          onClick={() => setAlign("right")}
        />
        <TBtn
          title="양쪽 정렬"
          label="☰"
          on={isAlign("justify")}
          disabled={imageSelected}
          onClick={() => setAlign("justify")}
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
          title="코드 블록"
          label={<span style={{ fontFamily: "monospace" }}>{"{ }"}</span>}
          on={editor.isActive("codeBlock")}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
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
          title="찾기/바꾸기"
          label="🔍"
          on={findOpen}
          onClick={() => setFindOpen((v) => !v)}
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
      {findOpen && <FindReplacePanel editor={editor} onClose={closeFind} />}
      {imageSelected && (
        <ImageAlignMenu
          key={`${img.pos}-${img.align}`}
          editor={editor}
          align={img.align}
          onAlign={setImageAlign}
        />
      )}
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

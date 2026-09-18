"use client";
// 그림백업 상세 (4.11) — 로그형: 세로 스크롤 뷰어 / 단일형: 큰 이미지 + 썸네일 스트립 + 좌우 넘김
import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useHrefBlock } from "@/components/shell/MenuGuard";
import { sectionHref, MAIN_SEC, useSectionTitle } from "@/lib/sectionStore";
import { useAuth } from "@/lib/auth";
import { useLocalList, fmtDate } from "@/lib/postStore";
import { BackupPost, BACKUP_SEED } from "@/lib/galleryStore";
import { ConfirmModal } from "@/components/ui/Modal";
import { useBlobUrl } from "@/lib/blobStore";
import { sanitizeHtml } from "@/lib/sanitize";
import { PageTitle } from "@/components/ui/PageText";
import { Lightbox } from "@/components/ui/Lightbox";
import { useBoardSettings, boardBadgeStyle } from "@/lib/boardStore";
import LinkIcon from "@/components/ui/LinkIcon";
import { KInput } from "@/components/ui/Kit"; // KInput 추가

export default function BackupDetailPage({ id }: { id: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const parentPath = pathname.substring(0, pathname.lastIndexOf("/"));
  const { user, isAdmin } = useAuth();
  const [posts, setPosts, loaded] = useLocalList<BackupPost>(
    "ohome.backup.v1",
    BACKUP_SEED,
  );
  const [cur, setCur] = useState(0);
  const [delAsk, setDelAsk] = useState(false);
  const [lbOpen, setLbOpen] = useState(false); // 단일형 — 클릭 확대 보기
  const { st: boardSet } = useBoardSettings(); // 유형 뱃지 색 (환경설정 > 게시판 관리)

  // 비밀번호 보호 관련 상태 추가
  const [pwInput, setPwInput] = useState("");
  const [pwError, setPwError] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  const p = posts.find((x) => x.id === id);

  /* 이 글이 속한 곳이 비공개면 주소로 들어와도 열리지 않게 (v2.0 사용자 요청).
     글 주소에는 섹션이 없어 MenuGuard가 못 막는다 — 글을 읽어 소속을 알아낸 여기서 판정한다.
     **다른 early return보다 먼저 불러야 한다**(훅이므로 렌더마다 개수가 같아야 한다) */
  const blocked = useHrefBlock(
    p && sectionHref("gallery", p.secId ?? MAIN_SEC),
  );

  // 비밀번호 보호 글 — 탭/브라우저를 닫기 전까지는 다시 묻지 않는다 (세션 저장)
  useEffect(() => {
    if (!p?.password) return;
    try {
      if (sessionStorage.getItem(`gallery.pw.${p.id}`) === "1") {
        setUnlocked(true);
      }
    } catch {}
  }, [p?.id, p?.password]);

  // 큰 글씨 — 추가 섹션이면 그 이름, 눌렀을 때도 그 목록으로 (v2.0 사용자 제보)
  const tt = useSectionTitle("gallery", p?.secId, "GALLERY");

  if (blocked) return blocked;
  if (!loaded) return <section className="page" />;
  if (
    !p ||
    (p.visibility === "private" && !isAdmin) ||
    (p.visibility === "member" && !user)
  ) {
    return (
      <section className="page">
        <div className="page-head">
          <PageTitle href={tt.href}>{tt.title}</PageTitle>
          <p>게시물을 찾을 수 없거나 열람 권한이 없습니다</p>
        </div>
      </section>
    );
  }

  const isAuthor = !!p.authorId && p.authorId === user?.id;
  const canManage = isAdmin || isAuthor;

  // 비밀번호 보호 — 작성자/관리자는 통과, 그 외엔 비밀번호를 맞춰야 함
  const tryUnlock = () => {
    if (pwInput === (p.password ?? "")) {
      try {
        sessionStorage.setItem(`gallery.pw.${p.id}`, "1");
      } catch {}
      setUnlocked(true);
      setPwError(false);
    } else {
      setPwError(true);
    }
  };

  const needsPassword = p.password && !isAdmin && !isAuthor && !unlocked;
  if (needsPassword) {
    return (
      <section className="page">
        <div className="page-head">
          <PageTitle href={tt.href}>{tt.title}</PageTitle>
          <p>🔑 비밀번호로 보호된 글입니다</p>
        </div>
        <div
          className="panel"
          style={{ padding: 24, maxWidth: 360, margin: "0 auto" }}
        >
          <div className="form-row">
            <KInput
              type="password"
              placeholder="비밀번호 입력"
              value={pwInput}
              onChange={(e) => {
                setPwInput(e.target.value);
                setPwError(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") tryUnlock();
              }}
              style={{ width: "100%" }}
            />
          </div>
          {pwError && (
            <p style={{ color: "var(--accent)", fontSize: 12, marginTop: 6 }}>
              비밀번호가 일치하지 않습니다
            </p>
          )}
          <button
            className="btn btn-accent"
            style={{ marginTop: 12 }}
            onClick={tryUnlock}
          >
            확인
          </button>
        </div>
      </section>
    );
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  };

  const imgs: { url?: string; ph?: string }[] = p.images.length
    ? p.images.map((u) => ({ url: u }))
    : p.phList.map((c) => ({ ph: c }));

  // 파일 id/URL 모두 지원 — blobStore에서 로드 (새로고침에도 유지)
  const Img = ({
    im,
    ratio,
    natural,
  }: {
    im: { url?: string; ph?: string };
    ratio?: string;
    natural?: boolean;
  }) => {
    const u = useBlobUrl(im.url);
    if (u) {
      return (
        <img
          src={u}
          alt=""
          style={
            natural
              ? { maxWidth: "100%", maxHeight: "100%", display: "block" }
              : {
                  maxWidth: "100%",
                  height: "auto",
                  display: "block",
                  margin: "0 auto",
                }
          }
        />
      );
    }
    return (
      <div
        className={`ph ${im.ph ?? ""}`}
        style={
          natural
            ? { width: "100%", height: "100%" }
            : { aspectRatio: ratio ?? "16/10" }
        }
      >
        <span>IMAGE</span>
      </div>
    );
  };

  return (
    <section className="page">
      <div className="page-head">
        <PageTitle href={tt.href}>{tt.title}</PageTitle>
        <p>
          {p.author} · {fmtDate(p.date)}
          {p.madeDate ? `` : ""}
          {(p.tags ?? []).map((t) => (
            <i key={t} className="tag-in">
              #{t}
            </i>
          ))}
        </p>

        <div className="head-actions">
          <button
            className="btn btn-dark"
            onClick={() => router.push(tt?.href)}
          >
            LIST
          </button>
          {canManage && (
            <button
              className="btn btn-dark"
              onClick={() => router.push(`/gallery/${p.id}/edit`)}
            >
              EDIT
            </button>
          )}
          {canManage && (
            <button className="btn btn-dark" onClick={() => setDelAsk(true)}>
              DELETE
            </button>
          )}
        </div>
      </div>

      <div
        className="panel"
        style={{ padding: 20, maxWidth: 960, margin: "0 auto" }}
      >
        <h2
          style={{
            fontSize: 18,
            marginBottom: p.desc ? 8 : 16,
            display: "flex",
            alignItems: "center",
            gap: 8,
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
            }}
          >
            {p?.password !== undefined && "🔑 "}
            {p.title}
            <span
              style={boardBadgeStyle(
                boardSet.gallery.find((b) => b.id === p.type),
              )}
            >
              {p.category}
            </span>
          </div>
          <LinkIcon onClick={handleCopy} />
        </h2>
        {p.desc && (
          <div
            className="post-body gallery-text-style"
            style={{
              margin: "0 0 16px",
              fontSize: "14px",
              lineHeight: 1.8,
            }}
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(p.desc) }}
          />
        )}

        {p.type === "log" ? (
          <div style={{ borderRadius: 10, overflow: "hidden" }}>
            {imgs.map((im, i) => (
              <Img key={i} im={im} />
            ))}
          </div>
        ) : p.type === "vlist" ? (
          <div style={{ display: "grid", gap: 14 }}>
            {imgs.map((im, i) => (
              <div
                key={i}
                style={{
                  borderRadius: 10,
                  overflow: "hidden",
                  cursor: im.url ? "zoom-in" : undefined,
                }}
                onClick={() => {
                  if (im.url) {
                    setCur(i);
                    setLbOpen(true);
                  }
                }}
              >
                <Img im={im} />
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="single-viewer">
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: imgs[cur].url ? "zoom-in" : undefined,
                }}
                onClick={() => {
                  if (imgs[cur].url) setLbOpen(true);
                }}
              >
                <Img im={imgs[cur]} natural />
              </div>
              {imgs.length > 1 && (
                <>
                  <button
                    className="nav"
                    style={{ left: 10 }}
                    onClick={() =>
                      setCur((c) => (c - 1 + imgs.length) % imgs.length)
                    }
                  >
                    ◁
                  </button>
                  <button
                    className="nav"
                    style={{ right: 10 }}
                    onClick={() => setCur((c) => (c + 1) % imgs.length)}
                  >
                    ▷
                  </button>
                </>
              )}
            </div>
            {imgs.length > 1 && (
              <div className="thumb-strip">
                {imgs.map((im, i) => (
                  <div
                    key={i}
                    className={`t ${i === cur ? "on" : ""}`}
                    onClick={() => setCur(i)}
                  >
                    <Img im={im} ratio="4/3" />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {lbOpen &&
        (p.type === "single" || p.type === "vlist") &&
        p.images.length > 0 && (
          <Lightbox
            srcs={p.images}
            index={cur}
            onClose={() => setLbOpen(false)}
          />
        )}

      <ConfirmModal
        open={delAsk}
        title="게시물을 삭제하시겠습니까?"
        body="삭제한 게시물은 복구할 수 없습니다."
        onClose={() => setDelAsk(false)}
        buttons={[
          {
            label: "DELETE",
            kind: "accent",
            onClick: () => {
              setPosts(posts.filter((x) => x.id !== p.id));
              router.push(tt.href);
            },
          },
          { label: "CANCEL", kind: "ghost", onClick: () => setDelAsk(false) },
        ]}
      />
    </section>
  );
}

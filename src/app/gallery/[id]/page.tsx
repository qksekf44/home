"use client";
// 그림백업 상세 (4.11) — 로그형: 세로 스크롤 뷰어 / 단일형: 큰 이미지 + 썸네일 스트립 + 좌우 넘김
import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArticleJsonLd } from "next-seo";
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

export default function BackupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const [posts, setPosts, loaded] = useLocalList<BackupPost>(
    "ohome.backup.v1",
    BACKUP_SEED,
  );
  const [cur, setCur] = useState(0);
  const [delAsk, setDelAsk] = useState(false);
  const [lbOpen, setLbOpen] = useState(false);
  const { st: boardSet } = useBoardSettings();

  const p = posts.find((x) => x.id === id);
  const blocked = useHrefBlock(
    p && sectionHref("gallery", p.secId ?? MAIN_SEC),
  );
  const tt = useSectionTitle("gallery", p?.secId, "GALLERY");

  // Meta 태그 주입
  useEffect(() => {
    if (!p) return;

    document.title = p.title;

    const setMeta = (property: string, content: string) => {
      let element = document.querySelector(`meta[property="${property}"]`);
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute("property", property);
        document.head.appendChild(element);
      }
      element.setAttribute("content", content);
    };

    const setMetaName = (name: string, content: string) => {
      let element = document.querySelector(`meta[name="${name}"]`);
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute("name", name);
        document.head.appendChild(element);
      }
      element.setAttribute("content", content);
    };

    const desc = p.desc?.replace(/<[^>]*>/g, "").slice(0, 160) || p.title;

    setMetaName("description", desc);
    setMeta("og:title", p.title);
    setMeta("og:description", desc);
    if (p.images[0]) setMeta("og:image", p.images[0]);
    setMeta("og:type", "article");
    setMeta(
      "og:url",
      typeof window !== "undefined" ? window.location.href : "",
    );
    setMetaName("twitter:card", "summary_large_image");
    if (p.images[0]) setMetaName("twitter:image", p.images[0]);
  }, [p]);

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

  const imgs: { url?: string; ph?: string }[] = p.images.length
    ? p.images.map((u) => ({ url: u }))
    : p.phList.map((c) => ({ ph: c }));

  const canManage = isAdmin || (!!p.authorId && p.authorId === user?.id);

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
  console.log(p);
  console.log(p.title, p.desc, p.images[0]);

  return (
    <>
      <ArticleJsonLd
        headline="Getting Started with Next SEO"
        datePublished="2024-01-01T08:00:00+00:00"
        author="John Doe"
        image="https://example.com/article-image.jpg"
        description="Learn how to improve your Next.js SEO"
        // headline={p.title}
        // description={p.desc?.replace(/<[^>]*>/g, "").slice(0, 160) || p.title}
        // image={
        //   p.images.length > 0
        //     ? p.images[0]
        //     : ["https://example.com/placeholder.jpg"]
        // }
      />

      <section className="page">
        <div className="page-head">
          <PageTitle href={tt.href}>{tt.title}</PageTitle>
          <p>
            {p.author} · {fmtDate(p.date)}
            {p.madeDate ? ` · 제작 ${p.madeDate}` : ""}
            {(p.tags ?? []).map((t) => (
              <i key={t} className="tag-in">
                #{t}
              </i>
            ))}
          </p>

          <div className="head-actions">
            <button
              className="btn btn-dark"
              onClick={() => router.push(`/gallery`)}
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

        <div className="panel" style={{ padding: 20, margin: "0 auto" }}>
          <h2
            style={{
              fontSize: 18,
              marginBottom: p.desc ? 8 : 16,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {p.title}
            <span
              style={boardBadgeStyle(
                boardSet.gallery.find((b) => b.id === p.type),
              )}
            >
              {p.category}
            </span>
          </h2>
          {p.desc && (
            <div
              className="post-body"
              style={{ fontSize: 12.5, margin: "0 0 16px" }}
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
    </>
  );
}

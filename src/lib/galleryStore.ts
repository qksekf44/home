// lib/galleryStore.ts
import type { CSSProperties } from "react";
import type { Comment, FoldType } from "./postStore";
import type { CropValue } from "@/components/ui/CropEditor";
import type { Visibility } from "./charStore";

/* ---------- 로드뷰 (4.10) ---------- */
export interface RoadItem {
  secId?: string;
  id: string;
  title: string;
  author: string;
  authorId: string;
  date: string;
  imgUrl?: string;
  imgId?: string;
  ph: string;
  narrow?: boolean;
  ratio: string;
  fold: { type: FoldType; label?: string } | null;
  comments: Comment[];
  no?: number;
}

export const ROAD_SEED: RoadItem[] = [];

/* ---------- 그림백업 (4.11) ---------- */
export interface BackupPost {
  secId?: string;
  id: string;
  title: string;
  type: "log" | "single" | "vlist";
  images: string[];
  thumbCrop?: CropValue;
  phList: string[];
  desc: string;
  category: string;
  madeDate?: string;
  date: string;
  author: string;
  authorId: string;
  visibility: Visibility;
  fold: { type: FoldType; label?: string } | null;
  tags?: string[];
  password?: string;
}

export const BACKUP_SEED: BackupPost[] = [];
export const BACKUP_CATEGORIES = ["합작", "낙서", "커미션", "설정화"];

/* ---------- TRPG 백업 (4.3) ---------- */
export interface TrpgLog {
  secId?: string;
  id: string;
  no: number;
  noText?: string;
  title: string;
  catchphrase?: string;
  writer: string;
  withText: string;
  relId?: string;
  date?: string;
  ph: string;
  thumbUrl?: string;
  thumbId?: string;
  thumbCrop?: CropValue;
  thumbColor?: { c1: string; c2?: string };
  serifTitle?: boolean;
  visibility: Visibility;
  password?: string;
  listHidden?: boolean;
  body?: string;
  bodyId?: string;
  bodyHtml?: boolean;
  originalFileId?: string;
  originalName?: string;
}

export interface TrpgLogBody {
  id: string;
  body: string;
  bodyId?: string;
  bodyHtml?: boolean;
  originalFileId?: string;
  originalName?: string;
  visibility: Visibility;
  secId?: string;
}

export const bodyVisibility = (l: {
  visibility: Visibility;
  password?: string;
}): Visibility => (l.password ? "public" : l.visibility);

export const TRPG_BODY_SEED: TrpgLogBody[] = [];
export const logNo = (l: TrpgLog) =>
  l.noText || `№ ${String(l.no).padStart(3, "0")}`;
export const isHtmlBody = (s: string) =>
  /<\s*(html|body|div|p|span|table|br|style|font)[^>]*>/i.test(s);
export const showAsHtml = (l: { bodyHtml?: boolean }, body: string) =>
  l.bodyHtml ?? isHtmlBody(body);

export async function decodeLogText(f: File): Promise<string> {
  const buf = await f.arrayBuffer();
  const utf8 = new TextDecoder("utf-8").decode(buf);
  const bad = (utf8.match(/�/g) || []).length;
  if (bad > 2) {
    try {
      return new TextDecoder("euc-kr").decode(buf);
    } catch {
      return utf8;
    }
  }
  return utf8;
}

export async function saveLogBody(
  text: string,
): Promise<{ body: string; bodyId?: string }> {
  if (!text) return { body: "" };
  const { isServerMode } = await import("./backend");
  const { putBlob } = await import("./blobStore");
  const bytes = new TextEncoder().encode(text).length;
  if (isServerMode() && bytes < 700_000) return { body: text };
  return {
    body: "",
    bodyId: await putBlob(new Blob([text], { type: "text/plain" })),
  };
}

/* ---------- TRPG 도토리 (4.15) ---------- */
export type DotoriStatus = "pledge" | "undecided" | "confirmed" | "done";
export const DOTORI_STATUS_LABEL: Record<DotoriStatus, string> = {
  pledge: "공수표",
  undecided: "일정 미정",
  confirmed: "일정 확정",
  done: "완",
};

export interface DotoriStatusStyle {
  label: string;
  bg: string;
  border: string;
  fg: string;
}
export interface TrpgSettings {
  statuses: Record<DotoriStatus, DotoriStatusStyle>;
}
export const DEFAULT_TRPG_SETTINGS: TrpgSettings = {
  statuses: {
    pledge: {
      label: "공수표",
      bg: "#23262b",
      border: "#b9bdc4",
      fg: "#ffffff",
    },
    undecided: {
      label: "일정 미정",
      bg: "#7a8089",
      border: "#7a8089",
      fg: "#ffffff",
    },
    confirmed: {
      label: "일정 확정",
      bg: "#a63a45",
      border: "#a63a45",
      fg: "#ffffff",
    },
    done: { label: "완", bg: "#3c434d", border: "#3c434d", fg: "#ffffff" },
  },
};

export const DOTORI_STATUS_KEYS: DotoriStatus[] = [
  "undecided",
  "pledge",
  "confirmed",
  "done",
];

export function dotoriBadgeStyle(st: DotoriStatusStyle): CSSProperties {
  return { background: st.bg, border: `1px solid ${st.border}`, color: st.fg };
}

export interface DotoriItem {
  secId?: string;
  id: string;
  name: string;
  writer: string;
  rule: string;
  people: string;
  tags: string[];
  link?: string;
  status: DotoriStatus;
  imgId?: string;
  thumbCrop?: CropValue;
  ph: string;
  date: string;
}

export const DOTORI_SEED: DotoriItem[] = [];

/* ---------- TRPG 플레이기록 (4.16) ---------- */
export interface PlayRecord {
  secId?: string;
  id: string;
  date?: string;
  scenario: string;
  scenarioLink?: string;
  writer: string;
  withText: string;
  role: string;
  playtime: string;
  url?: string;
  logId?: string;
}

export const PLAYLOG_SEED: PlayRecord[] = [];
export const TRPG_SEED: TrpgLog[] = [];

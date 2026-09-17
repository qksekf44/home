// app/chars/[id]/page.tsx

import type { Metadata } from "next";
import CharDetailPage from "./CharDetailPage";
import { adminDb } from "@/lib/firebaseAdmin";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;

  try {
    const db = adminDb();
    console.log("📌 [1] Character ID:", id);

    const snap = await db.collection("characters").doc(id).get();
    console.log("📌 [2] Snap exists:", snap.exists);

    if (!snap.exists) {
      return { title: "CHARACTER" };
    }

    const raw = snap.data();
    console.log("📌 [3] Raw data:", raw);

    // ✅ raw.data 안에 실제 데이터가 있음
    const char = raw?.data as
      | {
          name?: string;
          sub?: string;
          basicHtml?: string;
          arts?: string[];
          artId?: string;
          thumbId?: string;
        }
      | undefined;

    console.log("📌 [3-1] Character data:", char);

    const title = char?.name || "CHARACTER";
    const description =
      char?.sub ||
      char?.basicHtml?.replace(/<[^>]*>/g, "").trim() ||
      "CHARACTER";

    // ✅ arts[0]이 이미 Firebase URL이니까 그냥 쓰면 됨
    const image = char?.arts?.[0] || char?.artId || char?.thumbId;

    console.log("📌 [4] Image URL:", image);
    console.log("📌 [4-1] Is valid URL:", image?.startsWith("http"));

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: "article",
        images: image ? [image] : [],
      },
      twitter: {
        card: image ? "summary_large_image" : "summary",
        title,
        description,
        images: image ? [image] : [],
      },
    };
  } catch (error) {
    console.error("❌ [ERROR]", error);
    return { title: "CHARACTER" };
  }
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  return <CharDetailPage id={id} />;
}

import type { Metadata } from "next";
import BackupDetailPage from "./BackupDetailPage";
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

    // 🔍 디버깅 로그
    console.log("📌 [generateMetadata] ID:", id);
    console.log("📌 [generateMetadata] DB initialized:", !!db);

    const snap = await db.collection("gallery").doc(id).get();

    console.log("📌 [generateMetadata] Snap exists:", snap.exists);

    if (!snap.exists) {
      console.warn("⚠️ Document not found:", id);
      return { title: "GALLERY" };
    }

    const raw = snap.data();
    console.log("📌 [generateMetadata] Raw data:", raw);

    const post = raw as
      | {
          title?: string;
          desc?: string;
          images?: string[];
        }
      | undefined;

    const title = post?.title?.trim() || "GALLERY";
    const description = post?.desc?.replace(/<[^>]+>/g, "").trim() || "GALLERY";
    const image = post?.images?.[0];

    console.log("✅ [generateMetadata] Image URL:", image);

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
    console.error("❌ [generateMetadata] Error:", error);
    return { title: "GALLERY" };
  }
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;

  return <BackupDetailPage id={id} />;
}

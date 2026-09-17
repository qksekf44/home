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
    console.log("📌 [1] ID:", id);

    const snap = await db.collection("gallery").doc(id).get();
    console.log("📌 [2] Snap exists:", snap.exists);

    if (!snap.exists) {
      console.warn("⚠️ [3] Document not found!");
      return { title: "GALLERY" };
    }

    const raw = snap.data();
    console.log("📌 [4] Raw full data:", JSON.stringify(raw, null, 2));
    console.log("📌 [4-1] raw?.data 타입:", typeof raw?.data);
    console.log("📌 [4-2] raw?.data 값:", raw?.data);

    const post = raw?.data as
      | {
          title?: string;
          desc?: string;
          images?: string[];
        }
      | undefined;

    console.log("📌 [5] Post object:", post);
    console.log("📌 [5-1] post?.images 타입:", typeof post?.images);
    console.log("📌 [5-2] post?.images 값:", post?.images);
    console.log(
      "📌 [5-3] post?.images 배열인가?:",
      Array.isArray(post?.images),
    );
    console.log("📌 [5-4] post?.images 길이:", post?.images?.length);

    const title = post?.title?.trim() || "GALLERY";
    const description = post?.desc?.replace(/<[^>]+>/g, "").trim() || "GALLERY";
    const image = post?.images?.[0];

    console.log("📌 [6] Title:", title);
    console.log("📌 [7] Description:", description);
    console.log("📌 [8] Image URL:", image);
    console.log("📌 [8-1] Image is string?:", typeof image === "string");
    console.log("📌 [8-2] Image is valid URL?:", image?.startsWith("http"));

    const metadata = {
      title,
      description,
      openGraph: {
        title,
        description,
        type: "article" as const,
        images: image ? [image] : [],
      },
      twitter: {
        card: image ? "summary_large_image" : "summary",
        title,
        description,
        images: image ? [image] : [],
      },
    };

    console.log("📌 [9] Final metadata:", JSON.stringify(metadata, null, 2));

    return metadata;
  } catch (error) {
    console.error("❌ [ERROR] Full error object:", error);
    console.error("❌ [ERROR] Error message:", (error as Error).message);
    console.error("❌ [ERROR] Error stack:", (error as Error).stack);
    return { title: "GALLERY" };
  }
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;

  return <BackupDetailPage id={id} />;
}

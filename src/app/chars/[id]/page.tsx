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
    const snap = await db.collection("characters").doc(id).get();

    if (!snap.exists) {
      return { title: "CHARACTER" };
    }

    const raw = snap.data();
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

    const title = char?.name || "CHARACTER";
    const description =
      char?.sub ||
      char?.basicHtml?.replace(/<[^>]*>/g, "").trim() ||
      "CHARACTER";
    const image = char?.arts?.[0] || char?.artId || char?.thumbId;

    const result = {
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

    return result;
  } catch (error) {
    console.error("❌ [META] Error:", error);
    return { title: "CHARACTER" };
  }
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  return <CharDetailPage id={id} />;
}

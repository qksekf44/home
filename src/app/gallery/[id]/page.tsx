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
    const snap = await db.collection("gallery").doc(id).get();

    if (!snap.exists) {
      return {
        title: "GALLERY",
      };
    }

    const raw = snap.data();
    const post = raw?.data as
      | {
          title?: string;
          desc?: string;
          images?: string[];
        }
      | undefined;

    const title = post?.title?.trim() || "GALLERY";
    const description = post?.desc?.replace(/<[^>]+>/g, "").trim() || "GALLERY";

    const image = post?.images?.[0];

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: "article",
        ...(image ? { images: [{ url: image }] } : {}),
      },
      twitter: {
        card: image ? "summary_large_image" : "summary",
        title,
        description,
        ...(image ? { images: [image] } : {}),
      },
    };
  } catch {
    return {
      title: "GALLERY",
    };
  }
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;

  return <BackupDetailPage id={id} />;
}

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
      return { title: "GALLERY" };
    }

    const raw = snap.data();

    const post = raw?.data as
      | {
          title?: string;
          desc?: string;
          images?: string[];
        }
      | undefined;

    // spoiler, adult, 또는 비밀번호 조건 확인
    const foldType = raw?.fold?.type;
    const isPasswordProtected = Boolean(raw?.type?.password);
    const isProtected =
      foldType === "spoiler" || foldType === "adult" || isPasswordProtected;

    const title = post?.title?.trim() || "GALLERY";
    const description = post?.desc?.replace(/<[^>]+>/g, "").trim() || "GALLERY";

    // 조건에 해당하는 경우 OG 이미지를 숨김 (빈 배열 처리)
    const image = isProtected ? undefined : post?.images?.[0];
    const imageList = image ? [image] : [];

    const metadata = {
      title,
      description,
      openGraph: {
        title,
        description,
        type: "article" as const,
        images: imageList,
      },
      twitter: {
        card: image ? "summary_large_image" : "summary",
        title,
        description,
        images: imageList,
      },
    };

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

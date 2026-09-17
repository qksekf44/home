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

    const raw = snap.data()?.data;

    // 조건값 개별 추출 및 출력
    const foldType = raw?.fold?.type;
    const typePassword = raw?.password;

    // 조건 판별 결과
    const isSpoiler = foldType === "spoiler";
    const isAdult = foldType === "adult";
    const hasPassword = typePassword !== undefined;

    const isProtected = isSpoiler || isAdult || hasPassword;

    const post = raw?.data as
      | {
          title?: string;
          desc?: string;
          images?: string[];
        }
      | undefined;

    const title = post?.title?.trim() || "GALLERY";
    const description = post?.desc?.replace(/<[^>]+>/g, "").trim() || "GALLERY";

    // 보호 대상인 경우 이미지를 undefined 처리
    const rawImage = post?.images?.[0];
    const image = isProtected ? undefined : rawImage;

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

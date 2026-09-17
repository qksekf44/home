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
      console.log(`🔍 [DEBUG] Document for id '${id}' does not exist.`);
      return { title: "GALLERY" };
    }

    // JSON 구조에 맞춰 raw 데이터를 가져옵니다.
    const raw = (snap.data()?.data || snap.data()) as {
      title?: string;
      desc?: string;
      images?: string[];
      fold?: { type?: string } | null;
      password?: string | null;
      type?: { password?: string } | string;
    };

    const foldType = raw?.fold?.type;
    const isSpoiler = foldType === "spoiler";
    const isAdult = foldType === "adult";

    // 2. 비밀번호 체크: raw.password 또는 raw.type.password 에 유효한 문자열이 있는지 체크
    const passwordValue =
      raw?.password ||
      (typeof raw?.type === "object" ? raw?.type?.password : undefined);
    const hasPassword = Boolean(
      passwordValue && String(passwordValue).trim() !== "",
    );

    // 3. 하나라도 걸리면 보호 대상 (이미지 비공개)
    const isProtected = isSpoiler || isAdult || hasPassword;

    // 제목, 설명, 이미지 추출 (raw에서 바로 가져옴)
    const title = raw?.title?.trim() || "GALLERY";
    const description = raw?.desc?.replace(/<[^>]+>/g, "").trim() || "GALLERY";

    // isProtected가 true면 undefined 처리 (이미지 숨김)
    const rawImage = raw?.images?.[0];
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

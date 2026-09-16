// app/gallery/[id]/layout.tsx (서버 컴포넌트)
import { adminDb } from "@/lib/firebaseAdmin";
import { Metadata } from "next";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  // 데이터 조회
  const docSnap = await adminDb.collection("gallery").doc(id).get();
  const data = docSnap.data();

  const title = data?.title ? `${data.title} | Gallery` : "그림 상세 보기";
  const description =
    data?.desc?.replace(/<[^>]*>?/gm, "").slice(0, 100) || "갤러리 게시물 상세";
  const ogImageUrl = `/api/og?id=${id}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default function DetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

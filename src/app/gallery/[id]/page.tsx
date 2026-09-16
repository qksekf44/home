import { Metadata } from "next";
import { BACKUP_SEED, BackupPost } from "@/lib/galleryStore";
import BackupDetailPage from "./BackupDetailPage";

interface Props {
  params: Promise<{ id: string }>;
}

// 1. 서버 측 동적 메타 태그 생성
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  const post = BACKUP_SEED.find((x) => x.id === id);

  if (!post) {
    return {
      title: "게시물을 찾을 수 없습니다",
    };
  }

  // p.images.length > 0 이면 p.images[0]을 og:image로 사용
  const ogImage =
    post.images && post.images.length > 0 ? post.images[0] : undefined;

  return {
    title: post.title,
    description:
      post.desc?.replace(/<[^>]*>?/gm, "").slice(0, 160) || post.title,
    openGraph: {
      title: post.title,
      description:
        post.desc?.replace(/<[^>]*>?/gm, "").slice(0, 160) || post.title,
      images: ogImage ? [{ url: ogImage }] : [],
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title: post.title,
      images: ogImage ? [ogImage] : [],
    },
  };
}

// 2. 메인 페이지 컴포넌트
export default async function Page() {
  return <BackupDetailPage />;
}

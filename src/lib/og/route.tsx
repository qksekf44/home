// app/api/og/route.tsx
import { ImageResponse } from "@vercel/og";
import { adminDb } from "../firebaseAdmin";

export const runtime = "nodejs"; // 또는 edge (Firebase 연동 방식에 맞춰 선택)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return new Response("Missing ID", { status: 400 });
    }

    // Firestore에서 데이터 가져오기 (컬렉션 이름은 프로젝트에 맞게 변경)
    const docRef = adminDb.collection("gallery").doc(id);
    const docSnap = await docRef.get();

    let title = "그림 백업";
    let author = "익명";
    let imageUrl = "";

    if (docSnap.exists) {
      const data = docSnap.data();
      title = data?.title || title;
      author = data?.author || author;
      if (data?.images && data.images.length > 0) {
        imageUrl = data.images[0];
      }
    }

    return new ImageResponse(
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: "#111827",
          color: "#ffffff",
          padding: "40px 60px",
          fontFamily: "sans-serif",
        }}
      >
        {/* 좌측: 텍스트 정보 */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            width: imageUrl ? "55%" : "100%",
          }}
        >
          <div
            style={{
              fontSize: 24,
              color: "#9CA3AF",
              marginBottom: 12,
              fontWeight: 600,
            }}
          >
            GALLERY BACKUP
          </div>
          <div
            style={{
              fontSize: 48,
              fontWeight: "bold",
              lineHeight: 1.2,
              marginBottom: 20,
              color: "#F9FAFB",
              wordBreak: "keep-all",
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: 24,
              color: "#6B7280",
            }}
          >
            {author}
          </div>
        </div>

        {/* 우측: 썸네일 이미지 (있을 경우만 표시) */}
        {imageUrl && (
          <div
            style={{
              display: "flex",
              width: "40%",
              height: "80%",
              borderRadius: "16px",
              overflow: "hidden",
              border: "2px solid #374151",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={title}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          </div>
        )}
      </div>,
      {
        width: 1200,
        height: 630,
      },
    );
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : "Unknown error";
    return new Response(`OG 이미지 생성 실패: ${errorMessage}`, {
      status: 500,
    });
  }
}

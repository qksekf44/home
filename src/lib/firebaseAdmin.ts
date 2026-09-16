import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

const firebaseAdminConfig = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY,
};

// Next.js 14의 잦은 핫 리로딩(Fast Refresh) 환경에서 중복 초기화를 막기 위한 global 캐싱
const globalForFirebase = globalThis as unknown as {
  adminApp: ReturnType<typeof initializeApp> | undefined;
};

if (!globalForFirebase.adminApp) {
  if (getApps().length === 0) {
    globalForFirebase.adminApp = initializeApp({
      credential: cert(firebaseAdminConfig),
    });
  } else {
    globalForFirebase.adminApp = getApps()[0];
  }
}

export const adminApp = globalForFirebase.adminApp;
export const adminDb = getFirestore(adminApp);
export const adminAuth = getAuth(adminApp);

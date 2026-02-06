// ✅ วาง Firebase config ของโปรเจกต์คุณตรงนี้ (หาได้ที่ Firebase console → Project settings → Your apps)
// หมายเหตุ: firebaseConfig "ไม่ใช่ความลับ" แต่ Firestore Rules ต้องตั้งให้ดีเพื่อความปลอดภัย
export const firebaseConfig = {
  apiKey: "PUT_YOUR_API_KEY_HERE",
  authDomain: "PUT_YOUR_AUTH_DOMAIN_HERE",
  projectId: "PUT_YOUR_PROJECT_ID_HERE",
  storageBucket: "PUT_YOUR_STORAGE_BUCKET_HERE",
  messagingSenderId: "PUT_YOUR_SENDER_ID_HERE",
  appId: "PUT_YOUR_APP_ID_HERE"
};

// ถ้าอยากปรับข้อความ/ชื่อผู้สร้างในระบบ
export const creatorDisplayName = "ผู้สร้าง";

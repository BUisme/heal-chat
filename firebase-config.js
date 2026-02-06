// ✅ วาง Firebase config ของโปรเจกต์คุณตรงนี้ (หาได้ที่ Firebase console → Project settings → Your apps)
// หมายเหตุ: firebaseConfig "ไม่ใช่ความลับ" แต่ Firestore Rules ต้องตั้งให้ดีเพื่อความปลอดภัย
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBCRByb1tXpAfU6xb7FzEtzymbRNWDoVZA",
  authDomain: "heal-chat-14559.firebaseapp.com",
  projectId: "heal-chat-14559",
  storageBucket: "heal-chat-14559.firebasestorage.app",
  messagingSenderId: "172225078927",
  appId: "1:172225078927:web:f04d6d4debc1cc2260b2fa",
  measurementId: "G-G8QCTBCX51"
};

// ถ้าอยากปรับข้อความ/ชื่อผู้สร้างในระบบ
export const creatorDisplayName = "ผู้สร้าง";

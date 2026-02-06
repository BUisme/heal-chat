import { firebaseConfig, creatorDisplayName } from "./firebase-config.js";

// Firebase (CDN, modular)
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  collection,
  addDoc,
  setDoc,
  getDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/** ----------------- UI refs ----------------- */
const $ = (id) => document.getElementById(id);

const chatEl = $("chat");
const nickEl = $("nick");
const msgEl = $("msg");
const sendBtn = $("send");
const connDot = $("connDot");
const connText = $("connText");
const threadHint = $("threadHint");

const btnNew = $("btnNew");
const btnAdmin = $("btnAdmin");

const adminModal = $("adminModal");
const adminEmail = $("adminEmail");
const adminPass = $("adminPass");
const btnLogin = $("btnLogin");
const btnLogout = $("btnLogout");
const adminStatus = $("adminStatus");

const adminAuth = $("adminAuth");
const adminPanel = $("adminPanel");
const threadsList = $("threadsList");
const threadsCount = $("threadsCount");
const threadTitle = $("threadTitle");
const threadMeta = $("threadMeta");
const adminChat = $("adminChat");
const adminMsg = $("adminMsg");
const adminSend = $("adminSend");

const btnCheer = $("btnCheer");
const cheerBox = $("cheerBox");

/** ----------------- State ----------------- */
let currentUser = null;
let isAdmin = false;

let threadId = localStorage.getItem("hc_threadId") || "";
let visitorNick = localStorage.getItem("hc_nick") || "";
let unsubMessages = null;

let adminSelectedThreadId = null;
let unsubAdminThreads = null;
let unsubAdminMessages = null;

nickEl.value = visitorNick;

/** ----------------- Helpers ----------------- */
function randomId(len = 20){
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for(let i=0;i<len;i++) out += chars[Math.floor(Math.random()*chars.length)];
  return out;
}

function fmtTime(ts){
  try{
    if(!ts) return "";
    const d = ts.toDate ? ts.toDate() : (ts instanceof Date ? ts : new Date(ts));
    return new Intl.DateTimeFormat("th-TH", {
      dateStyle: "medium",
      timeStyle: "short",
      hour12: false
    }).format(d);
  }catch{ return ""; }
}

function setConn(ok, text){
  connDot.classList.remove("ok","bad");
  connDot.classList.add(ok ? "ok" : "bad");
  connText.textContent = text;
}

function escapeHtml(s){
  return s.replace(/[&<>"']/g, (c)=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
}

function bubble({text, sender, createdAt, nick}){
  const row = document.createElement("div");
  row.className = "bubble-row " + (sender === "visitor" ? "right" : "left");

  const b = document.createElement("div");
  b.className = "bubble " + (sender === "visitor" ? "me" : "");

  const t = document.createElement("div");
  t.className = "text";
  t.innerHTML = escapeHtml(text);

  const meta = document.createElement("div");
  meta.className = "meta";

  const badge = document.createElement("span");
  badge.className = "badge " + (sender === "visitor" ? "vis" : "creator");
  badge.textContent = sender === "visitor" ? (nick || "คุณ") : creatorDisplayName;

  const time = document.createElement("span");
  time.textContent = fmtTime(createdAt);

  meta.appendChild(badge);
  if(time.textContent) meta.appendChild(time);

  b.appendChild(t);
  b.appendChild(meta);
  row.appendChild(b);
  return row;
}

function scrollToBottom(el){
  el.scrollTop = el.scrollHeight;
}

function autosizeTextarea(el){
  el.style.height = "auto";
  el.style.height = Math.min(el.scrollHeight, 140) + "px";
}

/** ----------------- Visitor chat ----------------- */
async function ensureThread(){
  if(!currentUser) return null;

  if(!threadId){
    threadId = randomId(22);
    localStorage.setItem("hc_threadId", threadId);
  }

  const tRef = doc(db, "threads", threadId);
  const snap = await getDoc(tRef);

  if(!snap.exists()){
    // create thread
    const payload = {
      ownerUid: currentUser.uid,
      visitorNickname: (nickEl.value || "").trim().slice(0,24),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastText: "เริ่มแชทแล้ว ✨",
      lastSender: "visitor",
    };
    await setDoc(tRef, payload, { merge: false });
  }else{
    // update nickname if changed
    const nn = (nickEl.value || "").trim().slice(0,24);
    if(nn && snap.data()?.visitorNickname !== nn){
      await setDoc(tRef, { visitorNickname: nn, updatedAt: serverTimestamp() }, { merge:true });
    }
  }

  threadHint.textContent = `ห้อง: ${threadId.slice(0,6)}…${threadId.slice(-4)}`;
  return tRef;
}

function startListeningVisitor(){
  if(unsubMessages) { unsubMessages(); unsubMessages = null; }
  chatEl.innerHTML = "";

  if(!threadId){
    chatEl.appendChild(bubble({
      text: "พิมพ์ชื่อของคุณ แล้วส่งข้อความแรกได้เลย 💛",
      sender: "creator",
      createdAt: new Date()
    }));
    return;
  }

  const msgs = collection(db, "threads", threadId, "messages");
  const q = query(msgs, orderBy("createdAt","asc"), limit(300));
  unsubMessages = onSnapshot(q, (snap) => {
    chatEl.innerHTML = "";
    let first = true;
    snap.forEach((d) => {
      const m = d.data();
      if(first && m.sender !== "creator"){
        // nothing
      }
      chatEl.appendChild(bubble({
        text: m.text || "",
        sender: m.sender || "visitor",
        createdAt: m.createdAt,
        nick: visitorNick || nickEl.value
      }));
      first = false;
    });

    if(snap.size === 0){
      chatEl.appendChild(bubble({
        text: "ส่งคำถาม/ข้อความฮิลใจมาได้เลยนะ 😊",
        sender: "creator",
        createdAt: new Date()
      }));
    }

    scrollToBottom(chatEl);
  }, (err) => {
    console.error(err);
    setConn(false, "อ่านแชทไม่ได้ (เช็ค Firestore Rules / Authorized domains)");
  });
}

async function sendVisitor(){
  const text = (msgEl.value || "").trim();
  if(!text) return;
  if(!currentUser) return;

  const nn = (nickEl.value || "").trim().slice(0,24);
  visitorNick = nn;
  localStorage.setItem("hc_nick", visitorNick);

  const tRef = await ensureThread();
  const msgs = collection(db, "threads", threadId, "messages");

  msgEl.value = "";
  autosizeTextarea(msgEl);

  await addDoc(msgs, {
    text,
    sender: "visitor",
    uid: currentUser.uid,
    createdAt: serverTimestamp()
  });

  await setDoc(tRef, {
    visitorNickname: visitorNick,
    updatedAt: serverTimestamp(),
    lastText: text.slice(0,140),
    lastSender: "visitor"
  }, { merge:true });
}

/** ----------------- Admin ----------------- */
function openAdminModal(){
  adminModal.hidden = false;
}
function closeAdminModal(){
  adminModal.hidden = true;
}

function setAdminUI(){
  btnLogout.hidden = !isAdmin;
  btnLogin.hidden = isAdmin;
  adminPanel.hidden = !isAdmin;

  if(isAdmin){
    adminStatus.textContent = "ล็อกอินแล้ว ✅";
  }else{
    adminStatus.textContent = "ยังไม่ได้ล็อกอิน";
  }
}

function clearAdminSelection(){
  adminSelectedThreadId = null;
  threadTitle.textContent = "เลือกแชททางซ้าย";
  threadMeta.textContent = "—";
  adminChat.innerHTML = "";
  adminSend.disabled = true;
}

function startListeningThreads(){
  if(unsubAdminThreads) { unsubAdminThreads(); unsubAdminThreads = null; }
  threadsList.innerHTML = "";
  clearAdminSelection();

  const qThreads = query(collection(db, "threads"), orderBy("updatedAt","desc"), limit(80));
  unsubAdminThreads = onSnapshot(qThreads, (snap) => {
    threadsList.innerHTML = "";
    threadsCount.textContent = `${snap.size} ห้อง`;

    snap.forEach((d) => {
      const t = d.data();
      const item = document.createElement("div");
      item.className = "thread-item" + (adminSelectedThreadId === d.id ? " active" : "");
      item.dataset.tid = d.id;

      const name = (t.visitorNickname || "ไม่ระบุชื่อ").trim() || "ไม่ระบุชื่อ";
      const last = t.lastText || "";
      const meta = `${d.id.slice(0,6)}…${d.id.slice(-4)} • ${fmtTime(t.updatedAt)}`;

      item.innerHTML = `
        <div class="tname">${escapeHtml(name)}</div>
        <div class="tlast">${escapeHtml(last)}</div>
        <div class="tmeta">${escapeHtml(meta)}</div>
      `;

      item.addEventListener("click", () => selectThread(d.id, t));
      threadsList.appendChild(item);
    });
  }, (err) => {
    console.error(err);
    adminStatus.textContent = "โหลดรายการแชทไม่สำเร็จ (สิทธิ์ไม่พอ?)";
  });
}

function selectThread(tid, tData){
  adminSelectedThreadId = tid;
  [...threadsList.querySelectorAll(".thread-item")].forEach(el => {
    el.classList.toggle("active", el.dataset.tid === tid);
  });

  const name = (tData.visitorNickname || "ไม่ระบุชื่อ").trim() || "ไม่ระบุชื่อ";
  threadTitle.textContent = `คุยกับ: ${name}`;
  threadMeta.textContent = `ห้อง: ${tid.slice(0,6)}…${tid.slice(-4)} • เจ้าของ UID: ${tData.ownerUid || "-"}`;

  adminSend.disabled = false;
  startListeningAdminMessages(tid, name);
}

function startListeningAdminMessages(tid, name){
  if(unsubAdminMessages) { unsubAdminMessages(); unsubAdminMessages = null; }
  adminChat.innerHTML = "";

  const msgs = collection(db, "threads", tid, "messages");
  const q = query(msgs, orderBy("createdAt","asc"), limit(500));
  unsubAdminMessages = onSnapshot(q, (snap) => {
    adminChat.innerHTML = "";
    snap.forEach((d) => {
      const m = d.data();
      adminChat.appendChild(bubble({
        text: m.text || "",
        sender: m.sender || "visitor",
        createdAt: m.createdAt,
        nick: name
      }));
    });
    scrollToBottom(adminChat);
  });
}

async function sendAdminReply(){
  if(!isAdmin || !adminSelectedThreadId) return;
  const text = (adminMsg.value || "").trim();
  if(!text) return;

  const tid = adminSelectedThreadId;
  adminMsg.value = "";
  autosizeTextarea(adminMsg);

  const tRef = doc(db, "threads", tid);
  const msgs = collection(db, "threads", tid, "messages");

  await addDoc(msgs, {
    text,
    sender: "creator",
    uid: currentUser.uid,
    createdAt: serverTimestamp()
  });

  await setDoc(tRef, {
    updatedAt: serverTimestamp(),
    lastText: text.slice(0,140),
    lastSender: "creator"
  }, { merge:true });
}

async function doAdminLogin(){
  const email = (adminEmail.value || "").trim();
  const pass = (adminPass.value || "").trim();
  if(!email || !pass) {
    adminStatus.textContent = "ใส่อีเมลและรหัสผ่านก่อนนะ";
    return;
  }
  try{
    const res = await signInWithEmailAndPassword(auth, email, pass);
    // onAuthStateChanged will handle UI
    adminStatus.textContent = "กำลังตรวจสอบสิทธิ์…";
  }catch(e){
    console.error(e);
    adminStatus.textContent = "ล็อกอินไม่สำเร็จ (เช็คอีเมล/รหัสผ่าน)";
  }
}

async function doLogout(){
  try{ await signOut(auth); }catch(e){ console.error(e); }
}

/** ----------------- Cheer texts ----------------- */
const cheers = [
  "วันนี้…ขอให้ใจคุณเบาขึ้นอีกนิดนะ 😊",
  "คุณทำดีที่สุดแล้วจริง ๆ 🫶",
  "พักหายใจลึก ๆ 1 ครั้ง…แล้วค่อยไปต่อก็ได้ 🌿",
  "ไม่เป็นไรเลย ถ้าวันนี้จะยังไม่โอเค 💛",
  "ขอให้มีเรื่องเล็ก ๆ ที่ทำให้ยิ้มได้สัก 1 เรื่องวันนี้ ✨",
  "ขอบคุณที่ยังอยู่ตรงนี้นะ 🤍",
  "ค่อย ๆ เป็นค่อย ๆ ไปก็ได้ — คุณไม่ได้ช้าเลย 🙂",
  "ผู้สร้างส่งกำลังใจให้เต็มกระเป๋าเลย 🐢💛"
];

function randomCheer(){
  cheerBox.textContent = cheers[Math.floor(Math.random()*cheers.length)];
}

/** ----------------- Events ----------------- */
btnCheer.addEventListener("click", randomCheer);

btnNew.addEventListener("click", () => {
  // create a new thread ID; keep old data in DB สำหรับผู้สร้าง
  threadId = "";
  localStorage.removeItem("hc_threadId");
  chatEl.innerHTML = "";
  startListeningVisitor();
  threadHint.textContent = "";
});

btnAdmin.addEventListener("click", openAdminModal);

adminModal.addEventListener("click", (e) => {
  const t = e.target;
  if(t && t.dataset && t.dataset.close === "1") closeAdminModal();
});
document.addEventListener("keydown", (e) => {
  if(e.key === "Escape" && !adminModal.hidden) closeAdminModal();
});

btnLogin.addEventListener("click", doAdminLogin);
btnLogout.addEventListener("click", doLogout);

sendBtn.addEventListener("click", sendVisitor);

msgEl.addEventListener("input", () => autosizeTextarea(msgEl));
adminMsg.addEventListener("input", () => autosizeTextarea(adminMsg));

msgEl.addEventListener("keydown", (e) => {
  if(e.key === "Enter" && !e.shiftKey){
    e.preventDefault();
    sendVisitor();
  }
});
adminMsg.addEventListener("keydown", (e) => {
  if(e.key === "Enter" && !e.shiftKey){
    e.preventDefault();
    sendAdminReply();
  }
});

adminSend.addEventListener("click", sendAdminReply);

nickEl.addEventListener("change", async () => {
  visitorNick = (nickEl.value || "").trim().slice(0,24);
  localStorage.setItem("hc_nick", visitorNick);

  if(currentUser){
    // update thread nickname if exists
    if(threadId){
      await setDoc(doc(db, "threads", threadId), {
        visitorNickname: visitorNick,
        updatedAt: serverTimestamp()
      }, { merge:true });
    }
  }
});

/** ----------------- Auth init ----------------- */
setConn(false, "กำลังเชื่อมต่อ…");

onAuthStateChanged(auth, async (user) => {
  currentUser = user;

  if(!user){
    // default to anonymous user
    isAdmin = false;
    setAdminUI();
    setConn(false, "กำลังล็อกอินแบบไม่ระบุตัวตน…");
    try{
      await signInAnonymously(auth);
    }catch(e){
      console.error(e);
      setConn(false, "ล็อกอินไม่สำเร็จ (เพิ่ม authorized domains ใน Firebase)");
    }
    return;
  }

  // decide admin by provider
  isAdmin = user.isAnonymous ? false : true;
  setAdminUI();
  setConn(true, isAdmin ? "เชื่อมต่อแล้ว (โหมดผู้สร้าง)" : "เชื่อมต่อแล้ว");

  // visitor listening
  if(!isAdmin){
    // create thread lazily; listen if already exists
    startListeningVisitor();
  }else{
    // admin threads
    startListeningThreads();
  }
});

// Kick UI
randomCheer();
autosizeTextarea(msgEl);
autosizeTextarea(adminMsg);

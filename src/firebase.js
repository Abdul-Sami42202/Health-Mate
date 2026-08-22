// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, createUserWithEmailAndPassword, setPersistence, browserLocalPersistence, signInWithEmailAndPassword, onAuthStateChanged, signOut, deleteUser } from "firebase/auth";
import { getFirestore, doc, setDoc, getDocs, query, orderBy, collection, addDoc, serverTimestamp, getDoc, deleteDoc, limit, updateDoc } from "firebase/firestore";
// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(app);

//Authentication
const auth = getAuth(app);
await setPersistence(auth, browserLocalPersistence);

async function signUpFunction(userName, email, password) {
  const userCredential =
  await createUserWithEmailAndPassword(auth, email, password);

try {
  await setDoc(doc(db, "Users", userCredential.user.uid), {
    userName,
    email,
    uid: userCredential.user.uid
  });
} catch (error) {
  await deleteUser(userCredential.user);
  throw error;
}
}

async function signInFunction(email, password) {
  try {
    await setPersistence(auth, browserLocalPersistence);
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    console.log("==>>Signin successfully");
    return user;
  } catch (error) {
    console.log(error.code, "Error aaya ha");
    console.log(error.message, "Error aaya ha");
    throw error;
  }
}

export function requireAuth(callback) {
  onAuthStateChanged(auth, user => {
    if (!user) {
      window.location.replace("./signin.html");
      return;
    }

    callback?.(user);
  });
}

async function getCurrentUserName(uid) {
  const docSnap = await getDoc(doc(db, "Users", uid));
  if (!docSnap.exists()) return null;
  return docSnap.data().userName;
}

async function signOutFunction() {
  try {
    console.trace("signOutFunction was called");
    await signOut(auth);
    console.log("==>>Signout successfully");
  } catch (error) {
    console.error("Error in signOutFunction:", error);
    throw error;
  }
}

async function getFamilyMember(memberId) {
  if (!auth.currentUser) throw new Error("User not logged in");

  const ref = doc(db, "Users", auth.currentUser.uid, "familyMembers", memberId);
  const snap = await getDoc(ref);

  if (!snap.exists()) return null;

  return { id: snap.id, ...snap.data() };
}

async function ensureYouCardExists(user) {
  const youRef = doc(db, "Users", user.uid, "familyMembers", "you");
  const docSnap = await getDoc(youRef);

  if (docSnap.exists()) {
    return { isNew: false, data: docSnap.data() };
  }

  const userName = await getCurrentUserName(user.uid);

  const initialData = {
    memberName: userName || "You",
    relation: "Self",
    email: user.email,
    lastActivity: serverTimestamp(),
    createdAt: serverTimestamp()
  };

  await setDoc(youRef, initialData);

  return { isNew: true, data: initialData };
}

// firebase.js — add
async function createReport(reportData) {
  if (!auth.currentUser) throw new Error("User not logged in");

  const colRef = collection(db, "Users", auth.currentUser.uid, "reports");
  const docRef = await addDoc(colRef, {
    ...reportData,
    createdAt: serverTimestamp()
  });
  return docRef.id;
}

async function getReport(reportId) {
  if (!auth.currentUser) throw new Error("User not logged in");
  const ref = doc(db, "Users", auth.currentUser.uid, "reports", reportId);
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

async function updateFamilyMember(memberId, fields) {
  if (!auth.currentUser) throw new Error("User not logged in");

  const ref = doc(db, "Users", auth.currentUser.uid, "familyMembers", memberId);

  await updateDoc(ref, {
    ...fields,
    lastActivity: serverTimestamp()
  });
}

async function familyMembersData({
  name,
  relation,
  image,
  dob,
  phone,
  bloodGroup,
  age,
  gender,
  email,
  emergencyContact,
  emergencyPhone,
  relationWithEmergencyContact
}) {
  if (!auth.currentUser) throw new Error("User not logged in");

  const colRef = collection(db, "Users", auth.currentUser.uid, "familyMembers");

  const docRef = await addDoc(colRef, {
    memberName: name,
    relation,
    image: image || null,       // base64 string or null
    dob: dob || null,
    phone: phone || null,
    bloodGroup: bloodGroup || null,
    age: age || null,
    gender: gender || null,
    email: email || null,
    emergencyContact: emergencyContact || null,
    emergencyPhone: emergencyPhone || null,
    relationWithEmergencyContact: relationWithEmergencyContact || null,
    lastActivity: serverTimestamp(),
    createdAt: serverTimestamp()
  });

  return docRef.id;
}

async function loadFamilyMembers() {
  if (!auth.currentUser) return [];

  const q = query(
    collection(db, "Users", auth.currentUser.uid, "familyMembers"),
    orderBy("lastActivity", "asc")
  );

  const snapshot = await getDocs(q);
  return snapshot.docs; // return docs to app.js
}

async function deleteFamilyMember(memberId) {
  if (!auth.currentUser) throw new Error("User not logged in");

  await deleteDoc(doc(db, "Users", auth.currentUser.uid, "familyMembers", memberId));
}



// ---- VITALS ----
async function createVital({ type, value }) {
  if (!auth.currentUser) throw new Error("User not logged in");
  const colRef = collection(db, "Users", auth.currentUser.uid, "vitals");
  const docRef = await addDoc(colRef, {
    type,   // "Blood Pressure" | "Blood Sugar" | "Weight"
    value,  // "120/80" | "95" | "74.5"
    loggedAt: serverTimestamp()
  });
  return docRef.id;
}

async function loadVitals() {
  if (!auth.currentUser) return [];
  const q = query(
    collection(db, "Users", auth.currentUser.uid, "vitals"),
    orderBy("loggedAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data(), kind: "vital" }));
}


async function loadReports() {
  if (!auth.currentUser) return [];
  const q = query(
    collection(db, "Users", auth.currentUser.uid, "reports"),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data(), kind: "report" }));
}

async function loadRecentReports(count = 2) {
  if (!auth.currentUser) return [];
  const q = query(
    collection(db, "Users", auth.currentUser.uid, "reports"),
    orderBy("createdAt", "desc"),
    limit(count)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ---- Daily AI tip ----
async function getLatestTip() {
  if (!auth.currentUser) return null;
  const q = query(
    collection(db, "Users", auth.currentUser.uid, "tips"),
    orderBy("createdAt", "desc"),
    limit(1)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const d = snapshot.docs[0];
  return { id: d.id, ...d.data() };
}

async function saveTip(summary) {
  if (!auth.currentUser) throw new Error("User not logged in");
  const colRef = collection(db, "Users", auth.currentUser.uid, "tips");
  const docRef = await addDoc(colRef, { summary, createdAt: serverTimestamp() });
  return docRef.id;
}

async function deleteVital(vitalId) {
  if (!auth.currentUser) throw new Error("User not logged in");
  await deleteDoc(doc(db, "Users", auth.currentUser.uid, "vitals", vitalId));
}

async function deleteReport(reportId) {
  if (!auth.currentUser) throw new Error("User not logged in");
  await deleteDoc(doc(db, "Users", auth.currentUser.uid, "reports", reportId));
}

// ---- AI INSIGHT (regenerated every 14 days) ----
async function getLatestInsight() {
  if (!auth.currentUser) return null;
  const q = query(
    collection(db, "Users", auth.currentUser.uid, "insights"),
    orderBy("createdAt", "desc"),
    limit(1)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const d = snapshot.docs[0];
  return { id: d.id, ...d.data() };
}

async function saveInsight({ title, summary }) {
  if (!auth.currentUser) throw new Error("User not logged in");
  const colRef = collection(db, "Users", auth.currentUser.uid, "insights");
  const docRef = await addDoc(colRef, {
    title, summary,
    createdAt: serverTimestamp()
  });
  return docRef.id;
}

async function submitSupportRequest({ email, subject, message }) {
  if (!auth.currentUser) throw new Error("User not logged in");

  const colRef = collection(db, "supportRequests");
  await addDoc(colRef, {
    uid: auth.currentUser.uid,
    email,
    subject,
    message,
    createdAt: serverTimestamp(),
    status: "open"
  });
}

export {
  signUpFunction,
  signInFunction,
  onAuthStateChanged,
  auth,
  db,
  familyMembersData,
  serverTimestamp,
  loadFamilyMembers,
  signOutFunction,
  getCurrentUserName,
  deleteFamilyMember,
  ensureYouCardExists,
  updateFamilyMember,
  getFamilyMember,
  createReport,
  getReport,
    createVital, loadVitals, deleteVital,
    loadReports, deleteReport,
    getLatestInsight, saveInsight,
    loadRecentReports, getLatestTip, saveTip,
    submitSupportRequest
};
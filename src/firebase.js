// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth";
import { getFirestore, doc, setDoc, getDocs, query, orderBy, collection, addDoc, serverTimestamp, getDoc, where } from "firebase/firestore";
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
const auth = getAuth();

async function signUpFunction(userName, email, password) {
  try {
    // Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Save user in Firestore
    await setDoc(doc(db, "Users", userName), {
      userName: userName,
      email: email,
      uid: user.uid
    });

    console.log("Record saved in Firestore");
    return user;
  } catch (error) {
    console.error("Error in signUpFunction:", error);
    throw error; // so caller can catch it
  }
}

async function signInFunction(email, password) {
  try {
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

async function getCurrentUserName(uid) {
  const q = query(collection(db, "Users"), where("uid", "==", uid));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  return snapshot.docs[0].data().userName;
}

async function signOutFunction() {
  try {
    await signOut(auth);
    console.log("==>>Signout successfully");
  } catch (error) {
    console.error("Error in signOutFunction:", error);
    throw error;
  }
}

async function ensureYouCardExists(user, userName) {
  console.log(user)
  const youRef = doc(db, "Users", userName, "familyMembers", userName+"You");

  const docSnap = await getDoc(youRef);

  if (!docSnap.exists()) {
    // First time signup
    await setDoc(youRef, {
      memberName: userName+"(You)",
      relation: "Self",
      color: "pink",
      lastActivity: new Date(), // Signup date
      createdAt: new Date()
    });
  }
}

async function familyMembersData(name, relation, customId, color, lastActivity) {
  if (!auth.currentUser) throw new Error("User not logged in");

  const familyDocRef = doc(db, "Users", auth.currentUser.uid, "familyMembers", name );

  await setDoc(familyDocRef, {
    memberName: name,
    relation: relation,
    customId: customId,
    color: color,
    lastActivity: lastActivity
  });

  return name; // document ID is now the member name
}

async function loadFamilyMembers() {
  if (!auth.currentUser) return [];

  const q = query(
    collection(db, "Users", auth.currentUser.uid, "familyMembers"),
    orderBy("lastActivity", "desc")
  );

  const snapshot = await getDocs(q);
  return snapshot.docs; // return docs to app.js
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
  ensureYouCardExists,
  getCurrentUserName
};
// Firebase configuration and initialization
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  setDoc, 
  getDoc, 
  doc, 
  onSnapshot, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyClrGdd9iMpqc2j7Egho-JZmZnwUgpsYwU",
  authDomain: "dino-math-game.firebaseapp.com",
  projectId: "dino-math-game",
  storageBucket: "dino-math-game.appspot.com",
  messagingSenderId: "474584068149",
  appId: "1:474584068149:web:e523f7e4c3d8fcac55017c"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
const db = getFirestore(app);

// Export db and all Firestore functions
export { 
  db, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  setDoc, 
  getDoc, 
  doc, 
  onSnapshot, 
  serverTimestamp 
};

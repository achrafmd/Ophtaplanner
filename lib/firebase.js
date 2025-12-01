// lib/firebase.ts
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyAtOTLwOD8W7MR9VRSYUML5duK2tId6oUE",
    authDomain: "app-planner-522e5.firebaseapp.com",
    projectId: "app-planner-522e5",
    storageBucket: "app-planner-522e5.firebasestorage.app",
    messagingSenderId: "498983432030",
    appId: "1:498983432030:web:768e8e2f8faf0d74c8e9cf",
    measurementId: "G-9TRL9BNGHK"
  // tu peux ajouter les autres champs (storageBucket, etc.) si tu veux
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../../../lib/firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) router.replace("/week");
    });
    return () => unsub();
  }, [router]);

  const handleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.replace("/week");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    setError("");
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const uid = cred.user.uid;
      await setDoc(doc(db, "profiles", uid), {
        fullName: fullName || "",
        role: "resident",
        createdAt: new Date(),
      });
      router.replace("/week");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-8">
      <h1 className="text-2xl font-semibold mb-4">OphtaPlanner</h1>

      <div className="border rounded p-4 bg-white shadow-sm space-y-3">
        <div className="flex gap-2">
          <button
            className={
              mode === "login"
                ? "bg-blue-600 text-white px-3 py-2 rounded"
                : "px-3 py-2 rounded border"
            }
            onClick={() => setMode("login")}
          >
            Connexion
          </button>
          <button
            className={
              mode === "signup"
                ? "bg-blue-600 text-white px-3 py-2 rounded"
                : "px-3 py-2 rounded border"
            }
            onClick={() => setMode("signup")}
          >
            Créer un compte
          </button>
        </div>

        {mode === "signup" && (
          <div>
            <label className="text-sm">Nom complet</label>
            <input
              className="border rounded px-2 py-1 w-full"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Dr Nom Prénom"
            />
          </div>
        )}

        <div>
          <label className="text-sm">Email</label>
          <input
            className="border rounded px-2 py-1 w-full"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@exemple.com"
          />
        </div>
        <div>
          <label className="text-sm">Mot de passe</label>
          <input
            type="password"
            className="border rounded px-2 py-1 w-full"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        {error && <div className="text-red-600 text-sm">{error}</div>}

        <div>
          {mode === "login" ? (
            <button
              className="bg-blue-600 text-white px-4 py-2 rounded"
              onClick={handleLogin}
              disabled={loading}
            >
              {loading ? "Connexion…" : "Se connecter"}
            </button>
          ) : (
            <button
              className="bg-blue-600 text-white px-4 py-2 rounded"
              onClick={handleSignup}
              disabled={loading}
            >
              {loading ? "Création…" : "Créer le compte"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

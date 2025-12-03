// src/app/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../../../lib/firebase";

export default function LoginPage() {
  const router = useRouter();

  const [modeRegister, setModeRegister] = useState(false);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const toggleMode = () => {
    setErr("");
    setModeRegister((m) => !m);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setLoading(true);

    try {
      if (modeRegister) {
        // Création de compte
        const cred = await createUserWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );

        // Enregistrement du profil dans Firestore
        await setDoc(doc(db, "profiles", cred.user.uid), {
          fullName: fullName.trim(),
          phone: phone.trim(), // ✅ numéro de téléphone
          email: email.trim(),
          role: "resident", // par défaut, resident (admin à définir manuellement)
          createdAt: new Date(),
        });
      } else {
        // Connexion simple
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }

      // Une fois connecté ou inscrit -> on va vers le calendrier
      router.replace("/");
    } catch (e: any) {
      console.error(e);
      setErr(e.message || "Erreur d'authentification");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4 py-6">
      <div className="w-full max-w-md rounded-3xl bg-white shadow-[0_18px_45px_rgba(15,23,42,0.18)] border border-slate-100 p-6 space-y-5">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            OphtaPlanner
          </h1>
          <p className="text-sm text-slate-500">
            {modeRegister
              ? "Créer un compte résident."
              : "Connectez-vous pour accéder à votre planning."}
          </p>
        </header>

        {err && (
          <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
            {err}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {modeRegister && (
            <>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  Nom et prénom
                </label>
                <input
                  type="text"
                  className="w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/60"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  Numéro de téléphone
                </label>
                <input
                  type="tel"
                  className="w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/60"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
            </>
          )}

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">
              Email
            </label>
            <input
              type="email"
              className="w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/60"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">
              Mot de passe
            </label>
            <input
              type="password"
              className="w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/60"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-full bg-blue-600 text-white px-5 py-2 text-sm font-medium shadow-sm hover:bg-blue-700 disabled:opacity-50 mt-2"
            disabled={loading}
          >
            {loading
              ? "Veuillez patienter…"
              : modeRegister
              ? "Créer le compte"
              : "Se connecter"}
          </button>
        </form>

        <div className="text-center">
          <button
            type="button"
            onClick={toggleMode}
            className="text-xs text-sky-700 hover:underline"
          >
            {modeRegister
              ? "Déjà un compte ? Se connecter"
              : "Nouveau résident ? Créer un compte"}
          </button>
        </div>
      </div>
    </div>
  );
}

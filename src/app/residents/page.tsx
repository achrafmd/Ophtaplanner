// src/app/residents/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "../../../lib/firebase";
import { collection, getDocs, DocumentData } from "firebase/firestore";

type Profile = {
  id: string;
  fullName: string;
  phone?: string;
  role?: "admin" | "resident";
};

export default function ResidentsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  // Auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) {
        router.replace("/login");
      } else {
        setUser(u);
      }
    });
    return () => unsub();
  }, [router]);

  // Chargement des profils
  useEffect(() => {
    if (!user) return;

    (async () => {
      setLoading(true);
      try {
        const snap = await getDocs(collection(db, "profiles"));
        const res: Profile[] = snap.docs.map((d) => {
          const data = d.data() as DocumentData;
          return {
            id: d.id,
            fullName: data.fullName || d.id,
            phone: data.phone || "",
            role: data.role === "admin" ? "admin" : "resident",
          };
        });

        res.sort((a, b) => a.fullName.localeCompare(b.fullName));
        setProfiles(res);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6 flex justify-center">
      <div className="w-full max-w-2xl space-y-5">
        {/* Header */}
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            Fiches résidents
          </h1>
          <p className="text-sm text-slate-500">
            Liste de tous les résidents du service.
          </p>

          <div className="flex flex-wrap gap-2 mt-2">
            <button
              className="px-4 py-1.5 rounded-full border text-xs sm:text-sm bg-white hover:bg-slate-50"
              onClick={() => router.push("/")}
            >
              Calendrier
            </button>
            <button
              className="px-4 py-1.5 rounded-full border text-xs sm:text-sm bg-white hover:bg-slate-50"
              onClick={() => router.push("/week")}
            >
              Ma semaine
            </button>
            <button
              className="px-4 py-1.5 rounded-full border text-xs sm:text-sm bg-white hover:bg-slate-50"
              onClick={async () => {
                await signOut(auth);
                router.replace("/login");
              }}
            >
              Se déconnecter
            </button>
          </div>
        </header>

        {/* Liste */}
        <section className="rounded-3xl bg-white shadow-[0_18px_45px_rgba(15,23,42,0.14)] border border-slate-100 p-4 space-y-3">
          {loading ? (
            <div className="text-sm text-slate-500">Chargement…</div>
          ) : profiles.length === 0 ? (
            <div className="text-sm text-slate-500">
              Aucun résident enregistré pour le moment.
            </div>
          ) : (
            <div className="space-y-3">
              {profiles.map((p) => {
                const initial = p.fullName.trim().charAt(0).toUpperCase();
                const roleLabel = p.role === "admin" ? "ADMIN" : "RESIDENT";

                return (
                  <Link
                    key={p.id}
                    href={`/residents/${p.id}`}
                    className="block rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3 shadow-[0_8px_18px_rgba(15,23,42,0.06)] hover:bg-slate-50 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-sky-500 text-white flex items-center justify-center text-sm font-semibold">
                        {initial || "?"}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-slate-900">
                          {p.fullName}
                        </div>
                        {p.phone && (
                          <div className="text-xs text-slate-600 flex items-center gap-1 mt-0.5">
                            <span>📞</span>
                            <span>{p.phone}</span>
                          </div>
                        )}
                        <div className="text-[11px] text-slate-500 mt-0.5 uppercase tracking-wide">
                          {roleLabel}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

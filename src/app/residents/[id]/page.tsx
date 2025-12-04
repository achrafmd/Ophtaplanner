// src/app/residents/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "../../../../lib/firebase";
import { doc, getDoc } from "firebase/firestore";

type Profile = {
  id: string;
  fullName: string;
  phone?: string;
  role?: "admin" | "resident";
};

export default function ResidentDetailPage(props: any) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // récupérer l'id depuis les params sans typage strict
  const params = (props as any).params || {};
  const residentId: string =
    typeof params.id === "string" ? params.id : "";

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

  // Charger la fiche
  useEffect(() => {
    if (!user || !residentId) return;

    (async () => {
      setLoading(true);
      setErr("");
      try {
        const ref = doc(db, "profiles", residentId);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          setProfile(null);
          setErr("Profil introuvable.");
        } else {
          const data = snap.data() as any;
          setProfile({
            id: residentId,
            fullName: data.fullName || residentId,
            phone: data.phone || "",
            role: data.role === "admin" ? "admin" : "resident",
          });
        }
      } catch (e: any) {
        console.error(e);
        setErr(e.message || String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [user, residentId]);

  if (!user) return null;

  const isSelf = user?.uid === residentId;
  const isAdmin = (profile?.role || "") === "admin" || user?.isAdmin;

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6 flex justify-center">
      <div className="w-full max-w-xl space-y-5">
        {/* Header */}
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            Fiche résident
          </h1>

          <div className="flex flex-wrap gap-2 mt-2">
            <button
              className="px-4 py-1.5 rounded-full border text-xs sm:text-sm bg-white hover:bg-slate-50"
              onClick={() => router.push("/residents")}
            >
              Retour liste
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

        {/* Contenu */}
        <section className="rounded-3xl bg-white shadow-[0_18px_45px_rgba(15,23,42,0.14)] border border-slate-100 p-4 space-y-4">
          {loading ? (
            <div className="text-sm text-slate-500">Chargement…</div>
          ) : err ? (
            <div className="text-sm text-red-600">{err}</div>
          ) : !profile ? (
            <div className="text-sm text-slate-500">
              Profil introuvable.
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-sky-500 text-white flex items-center justify-center text-lg font-semibold">
                  {profile.fullName.trim().charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="text-base font-semibold text-slate-900">
                    {profile.fullName}
                  </div>
                  <div className="text-[11px] text-slate-500 uppercase tracking-wide">
                    {profile.role === "admin" ? "ADMIN" : "RESIDENT"}
                  </div>
                </div>
              </div>

              {profile.phone && (
                <div className="text-sm text-slate-700 flex items-center gap-2 mt-2">
                  <span>📞</span>
                  <span>{profile.phone}</span>
                </div>
              )}

              <p className="text-xs text-slate-500 mt-3">
                Tous les résidents peuvent consulter les fiches et les
                activités de leurs collègues. Seuls les{" "}
                <span className="font-semibold">admins</span> peuvent modifier
                les activités des autres. Chaque résident ne peut modifier que
                ses propres activités.
              </p>

              {(isSelf || isAdmin) && (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-3 text-[11px] text-slate-500 mt-2">
                  <p className="font-medium text-slate-700 mb-1">
                    À venir :
                  </p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>
                      Possibilité de modifier certaines informations de
                      contact.
                    </li>
                    <li>
                      Lien direct vers les activités récentes de ce résident.
                    </li>
                  </ul>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

// src/app/residents/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../../../../lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

export default function ResidentDetailPage(props: any) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const params = (props as any).params || {};
  const id = typeof params.id === "string" ? params.id : "";

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

  useEffect(() => {
    if (!user || !id) return;
    (async () => {
      setLoading(true);
      try {
        const ref = doc(db, "profiles", id);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setData(snap.data());
        } else {
          setData(null);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [user, id]);

  if (!user) return null;

  const fullName = data?.fullName || id;
  const phone = data?.phone || "";
  const role = data?.role || "resident";
  const email = data?.email || "";

  return (
    <div className="py-5 space-y-4 max-w-xl mx-auto px-4">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Fiche résident
          </h1>
          <p className="text-sm text-slate-500">{fullName}</p>
        </div>
        <div className="flex gap-2 text-sm">
          <button
            className="px-3 py-1 rounded-full border text-xs sm:text-sm hover:bg-slate-100"
            onClick={() => router.push("/residents")}
          >
            Retour liste
          </button>
          <button
            className="px-3 py-1 rounded-full border text-xs sm:text-sm hover:bg-slate-100"
            onClick={() => router.push("/week")}
          >
            Ma semaine
          </button>
          <button
            className="px-3 py-1 rounded-full border text-xs sm:text-sm hover:bg-slate-100"
            onClick={async () => {
              await signOut(auth);
              router.replace("/login");
            }}
          >
            Se déconnecter
          </button>
        </div>
      </header>

      <section className="bg-white rounded-2xl border shadow-sm p-4 space-y-2">
        {loading ? (
          <div className="text-sm text-slate-500">Chargement…</div>
        ) : data ? (
          <>
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-sky-500 text-white text-lg font-semibold">
                {fullName.charAt(0).toUpperCase()}
              </span>
              <div>
                <div className="text-base font-semibold text-slate-900">
                  {fullName}
                </div>
                <div className="text-xs text-slate-500 uppercase">
                  {role}
                </div>
              </div>
            </div>

            {phone && (
              <p className="text-sm text-slate-700 mt-3">
                <span className="font-medium">Téléphone :</span> {phone}
              </p>
            )}

            {email && (
              <p className="text-sm text-slate-700">
                <span className="font-medium">Email :</span> {email}
              </p>
            )}

            <p className="mt-4 text-xs text-slate-500">
              Cette fiche est visible par tous les résidents. Les modifications
              du planning restent limitées à chaque utilisateur (sauf admin).
            </p>
          </>
        ) : (
          <div className="text-sm text-slate-500">
            Aucun profil trouvé pour ce résident.
          </div>
        )}
      </section>
    </div>
  );
}

// src/app/residents/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../../../lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, getDocs } from "firebase/firestore";

type Profile = {
  id: string;
  fullName: string;
  phone?: string;
  role?: string;
  email?: string;
};

export default function ResidentsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

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
    if (!user) return;
    (async () => {
      setLoading(true);
      try {
        const snap = await getDocs(collection(db, "profiles"));
        const list: Profile[] = [];
        snap.forEach((d) => {
          const data = d.data() as any;
          list.push({
            id: d.id,
            fullName: data.fullName || d.id,
            phone: data.phone || "",
            role: data.role || "resident",
            email: data.email || "",
          });
        });
        list.sort((a, b) => a.fullName.localeCompare(b.fullName));
        setProfiles(list);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  if (!user) return null;

  return (
    <div className="py-5 space-y-4 max-w-3xl mx-auto px-4">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Fiches résidents
          </h1>
          <p className="text-sm text-slate-500">
            Liste de tous les résidents du service.
          </p>
        </div>
        <div className="flex gap-2 text-sm">
          <button
            className="px-3 py-1 rounded-full border text-xs sm:text-sm hover:bg-slate-100"
            onClick={() => router.push("/")}
          >
            Calendrier
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

      <section className="bg-white rounded-2xl border shadow-sm p-4">
        {loading ? (
          <div className="text-sm text-slate-500">Chargement…</div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {profiles.map((p) => (
              <button
                key={p.id}
                onClick={() => router.push(`/residents/${p.id}`)}
                className="text-left rounded-2xl border border-slate-100 bg-slate-50/60 p-3 shadow-[0_8px_16px_rgba(15,23,42,0.06)] hover:bg-slate-50 active:bg-slate-100 transition"
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-sky-500 text-white text-sm font-semibold">
                    {p.fullName.charAt(0).toUpperCase()}
                  </span>
                  <div className="space-y-0.5">
                    <div className="text-sm font-semibold text-slate-900">
                      {p.fullName}
                    </div>
                    {p.phone && (
                      <div className="text-xs text-slate-600">
                        📞 {p.phone}
                      </div>
                    )}
                    {p.role && (
                      <div className="text-[11px] uppercase text-slate-400">
                        {p.role}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// src/app/residents/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../../../lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";

type Resident = {
  id: string;
  fullName: string;
  phone?: string;
  email?: string;
};

export default function ResidentsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        router.replace("/login");
        return;
      }
      setUser(u);

      const meRef = doc(db, "profiles", u.uid);
      const meSnap = await getDoc(meRef);
      const role = meSnap.exists() ? (meSnap.data() as any).role : "resident";
      if (role !== "admin") {
        router.replace("/week");
        return;
      }
      setIsAdmin(true);
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    if (!user || !isAdmin) return;

    (async () => {
      setLoading(true);
      const snap = await getDocs(collection(db, "profiles"));
      const list: Resident[] = [];
      snap.forEach((d) => {
        const data = d.data() as any;
        list.push({
          id: d.id,
          fullName: data.fullName || d.id,
          phone: data.phone,
          email: data.email,
        });
      });
      list.sort((a, b) => a.fullName.localeCompare(b.fullName));
      setResidents(list);
      setLoading(false);
    })();
  }, [user, isAdmin]);

  if (!user || !isAdmin) return null;

  return (
    <div className="py-6 space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Fiches résidents
          </h1>
          <p className="text-sm text-slate-500">
            Liste des résidents avec coordonnées.
          </p>
        </div>
        <div className="flex gap-2 text-sm">
          <button
            className="rounded-full border px-3 py-1 hover:bg-slate-100"
            onClick={() => router.push("/week")}
          >
            Retour au planning
          </button>
          <button
            className="rounded-full border px-3 py-1 hover:bg-slate-100"
            onClick={async () => {
              await signOut(auth);
              router.replace("/login");
            }}
          >
            Se déconnecter
          </button>
        </div>
      </header>

      <div className="bg-sky-50/60 border border-sky-100 rounded-3xl p-4 shadow-sm">
        {loading ? (
          <div className="text-sm text-slate-500">Chargement…</div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {residents.map((r) => (
              <article
                key={r.id}
                className="rounded-2xl bg-white border border-slate-100 px-4 py-3 shadow-[0_1px_3px_rgba(15,23,42,0.06)]"
              >
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-semibold text-slate-900 text-sm">
                    {r.fullName}
                  </h2>
                </div>
                <dl className="mt-2 space-y-1 text-xs text-slate-600">
                  {r.email && (
                    <div className="flex justify-between gap-2">
                      <dt className="font-medium text-slate-500">Email</dt>
                      <dd className="text-right break-all">{r.email}</dd>
                    </div>
                  )}
                  {r.phone && (
                    <div className="flex justify-between gap-2">
                      <dt className="font-medium text-slate-500">
                        Téléphone
                      </dt>
                      <dd className="text-right">{r.phone}</dd>
                    </div>
                  )}
                </dl>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// src/app/day/[date]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../../../../lib/firebase";

// On laisse les clés en string pour éviter les histoires de types.
const CATEGORIES: {
  key: string;
  label: string;
  description: string;
  accent: string;
}[] = [
  {
    key: "consultations",
    label: "Consultations",
    description:
      "Consultations spécialisées, nouveaux malades, CS externes, CRM, annexes…",
    accent: "bg-emerald-500",
  },
  {
    key: "bloc",
    label: "Bloc opératoire",
    description: "Bloc, 2ème/3ème salle, HDJ, petite chirurgie…",
    accent: "bg-sky-500",
  },
  {
    key: "service",
    label: "Service",
    description:
      "Visites, entrants, contre-visite, dossiers, cours, centralisation…",
    accent: "bg-indigo-500",
  },
  {
    key: "garde",
    label: "Garde",
    description: "Garde semaine et garde du weekend.",
    accent: "bg-rose-500",
  },
  {
    key: "exploration",
    label: "Exploration",
    description: "CV, OCT, Topographie, Laser, Interprétation…",
    accent: "bg-amber-500",
  },
];

export default function DayPage({
  params,
}: {
  params: { date: string };
}) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  const date = params?.date ?? "";

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

  if (!user) return null;

  // Joli format FR
  const jsDate = date ? new Date(date + "T00:00:00") : new Date();
  const prettyDate = jsDate.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const handleCategoryClick = (key: string) => {
    if (!date) return;
    router.push(`/day/${encodeURIComponent(date)}/${key}`);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4 py-6">
      <div className="w-full max-w-md space-y-5">
        {/* Header */}
        <header className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">
              OphtaPlanner – Ma journée
            </h1>
            <p className="text-xs text-slate-500 capitalize">{prettyDate}</p>
          </div>
          <div className="flex flex-col items-end gap-1 text-xs">
            <button
              className="px-3 py-1 rounded-full border bg-white hover:bg-slate-50"
              onClick={() => router.push("/")}
            >
              Calendrier
            </button>
            <button
              className="px-3 py-1 rounded-full border bg-white hover:bg-slate-50"
              onClick={async () => {
                await signOut(auth);
                router.replace("/login");
              }}
            >
              Se déconnecter
            </button>
          </div>
        </header>

        {/* Carte principale avec les 5 catégories */}
        <section className="rounded-3xl bg-white shadow-[0_18px_45px_rgba(15,23,42,0.18)] border border-slate-100 p-4 space-y-4">
          <p className="text-xs text-slate-500">
            Choisissez une catégorie pour organiser les activités de cette
            journée.
          </p>

          <div className="grid grid-cols-2 gap-3">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                onClick={() => handleCategoryClick(cat.key)}
                className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3 text-left shadow-[0_8px_16px_rgba(15,23,42,0.06)] hover:bg-slate-50 active:bg-slate-100 transition"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-2xl text-xs font-bold text-white ${cat.accent}`}
                  >
                    {cat.label[0]}
                  </span>
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold text-slate-900">
                      {cat.label}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {cat.description}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <button
            className="mt-1 w-full rounded-full bg-sky-50 text-sky-700 text-xs font-medium py-2 border border-sky-100 hover:bg-sky-100"
            onClick={() => router.push("/week")}
          >
            Voir ma vue hebdomadaire
          </button>
        </section>
      </div>
    </div>
  );
}

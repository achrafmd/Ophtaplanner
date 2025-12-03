// src/app/day/[date]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "../../../../lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";

const CATEGORIES = [
  {
    key: "consultations",
    label: "Consultations",
    description: "CS spécialisées, HDJ, externes…",
    accent: "bg-emerald-500",
  },
  {
    key: "bloc",
    label: "Bloc opératoire",
    description: "Programme opératoire, petite chirurgie…",
    accent: "bg-sky-500",
  },
  {
    key: "service",
    label: "Service",
    description: "Visites, HDJ, dossiers, examens complémentaires…",
    accent: "bg-indigo-500",
  },
  {
    key: "garde",
    label: "Garde",
    description: "Garde, contre-visite, urgences…",
    accent: "bg-rose-500",
  },
] as const;

type CategoryKey = (typeof CATEGORIES)[number]["key"];

interface DayPageProps {
  params: { date: string }; // vient de l’URL /day/2025-12-03
}

export default function DayPage({ params }: DayPageProps) {
  const { date } = params;
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  // Auth : si pas connecté → /login
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

  const jsDate = new Date(date + "T00:00:00");
  const prettyDate = jsDate.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const handleCategoryClick = (key: CategoryKey) => {
    router.push(`/day/${date}/category/${key}`);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4 py-6">
      <div className="w-full max-w-md space-y-5">
        {/* Header */}
        <header className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">
              OphtaPlanner – {jsDate.getDate().toString().padStart(2, "0")}
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

        {/* Cartes catégories */}
        <section className="rounded-3xl bg-white shadow-[0_18px_45px_rgba(15,23,42,0.18)] border border-slate-100 p-4 space-y-4">
          <p className="text-xs text-slate-500">
            Choisissez une catégorie pour ce jour. Vous retrouverez ensuite les
            activités détaillées à cocher.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                onClick={() => handleCategoryClick(cat.key)}
                className="group rounded-2xl border border-slate-100 bg-slate-50/70 hover:bg-white hover:shadow-md transition-all text-left p-3 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-sm font-semibold text-slate-900">
                    {cat.label}
                  </span>
                  <span
                    className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold text-white ${cat.accent}`}
                  >
                    {cat.label[0]}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">{cat.description}</p>
                <span className="mt-3 text-[11px] font-medium text-sky-600 group-hover:text-sky-700">
                  Voir les activités →
                </span>
              </button>
            ))}
          </div>

          <button
            className="mt-2 w-full rounded-full bg-sky-50 text-sky-700 text-xs font-medium py-2 border border-sky-100 hover:bg-sky-100"
            onClick={() => router.push("/week")}
          >
            Aller à ma vue hebdomadaire
          </button>
        </section>
      </div>
    </div>
  );
}

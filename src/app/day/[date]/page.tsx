// src/app/day/[date]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "../../../../lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { CategoryKey } from "../../../../lib/activityCategories";

const CATEGORIES: {
  key: CategoryKey;
  label: string;
  description: string;
  accent: string;
}[] = [
  {
    key: "consultations",
    label: "Consultations",
    description: "CS spécialisées, HDJ…",
    accent: "bg-emerald-500",
  },
  {
    key: "bloc",
    label: "Bloc opératoire",
    description: "Petite chirurgie, salles…",
    accent: "bg-sky-500",
  },
  {
    key: "service",
    label: "Service",
    description: "Équipe visite, annexes…",
    accent: "bg-indigo-500",
  },
  {
    key: "garde",
    label: "Garde",
    description: "Équipe de garde, urgences…",
    accent: "bg-rose-500",
  },
];

export default function DayCategories({
  params,
}: {
  params: { date: string };
}) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

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

  const dateStr = params.date;
  const dateObj = new Date(dateStr + "T00:00:00");
  const dayLabel = dateObj.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "short",
  });

  const handleClick = (key: CategoryKey) => {
    router.push(`/day/${dateStr}/${key}`);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4 py-6">
      <div className="w-full max-w-md space-y-5">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">
              {dayLabel}
            </h1>
            <p className="text-xs text-slate-500">
              Choisissez une catégorie d&apos;activité.
            </p>
          </div>
          <button
            className="text-xs rounded-full border px-3 py-1 hover:bg-slate-100"
            onClick={() => router.push("/")}
          >
            Calendrier
          </button>
        </header>

        <section className="rounded-3xl bg-white border border-slate-100 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.18)] space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                onClick={() => handleClick(c.key)}
                className="flex flex-col items-start rounded-2xl bg-slate-50 border border-slate-100 px-3 py-3 text-left hover:bg-slate-100 active:bg-slate-200 transition"
              >
                <span
                  className={`mb-2 inline-flex h-8 w-8 items-center justify-center rounded-full ${c.accent} text-white text-sm font-semibold`}
                >
                  {c.label[0]}
                </span>
                <span className="text-sm font-semibold text-slate-900">
                  {c.label}
                </span>
                <span className="mt-1 text-[11px] text-slate-500">
                  {c.description}
                </span>
              </button>
            ))}
          </div>

          <button
            onClick={() => router.push("/week")}
            className="mt-2 w-full rounded-full bg-sky-50 text-sky-700 text-xs font-medium py-2 border border-sky-100 hover:bg-sky-100"
          >
            Voir ma semaine complète
          </button>

          <button
            onClick={async () => {
              await signOut(auth);
              router.replace("/login");
            }}
            className="mt-1 w-full rounded-full border text-xs py-2 text-slate-500 hover:bg-slate-100"
          >
            Se déconnecter
          </button>
        </section>
      </div>
    </div>
  );
}

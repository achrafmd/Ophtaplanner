// src/app/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "../../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
} from "date-fns";

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export default function HomeCalendar() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [currentMonth, setCurrentMonth] = useState(() =>
    startOfMonth(new Date())
  );

  // Auth : si non connecté -> login
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

  const days = useMemo(() => {
    const start = startOfWeek(currentMonth, { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  if (!user) return null;

  const monthLabel = currentMonth.toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });

  const todayIso = new Date().toISOString().slice(0, 10);

  const handleDayClick = (d: Date) => {
    const iso = d.toISOString().slice(0, 10);
    router.push(`/day/${iso}`);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4 py-6">
      <div className="w-full max-w-md space-y-5">
        {/* Titre */}
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            OphtaPlanner
          </h1>
          <p className="text-sm text-slate-500">
            Choisissez un jour pour planifier vos activités.
          </p>
        </header>

        {/* Carte calendrier */}
        <section className="rounded-3xl bg-white shadow-[0_18px_45px_rgba(15,23,42,0.18)] border border-slate-100 p-4 space-y-4">
          {/* Mois + navigation */}
          <div className="flex items-center justify-between">
            <button
              className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600"
              onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
            >
              ‹
            </button>
            <div className="text-sm font-semibold text-slate-900">
              {monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}
            </div>
            <button
              className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600"
              onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
            >
              ›
            </button>
          </div>

          {/* Jours de semaine */}
          <div className="grid grid-cols-7 text-[11px] font-medium text-slate-400">
            {WEEKDAYS.map((d) => (
              <div key={d} className="text-center">
                {d}
              </div>
            ))}
          </div>

          {/* Grille de jours */}
          <div className="grid grid-cols-7 gap-y-2 text-sm">
            {days.map((d) => {
              const iso = d.toISOString().slice(0, 10);
              const isToday = iso === todayIso;
              const isCurrentMonth =
                d.getMonth() === currentMonth.getMonth();

              let base =
                "mx-auto flex h-9 w-9 items-center justify-center rounded-full text-xs";
              let classes = "";

              if (!isCurrentMonth) {
                classes = "text-slate-300";
              } else if (isToday) {
                classes =
                  "bg-emerald-500 text-white shadow-md shadow-emerald-500/40";
              } else {
                classes =
                  "text-slate-700 hover:bg-slate-100 active:bg-slate-200";
              }

              return (
                <button
                  key={iso}
                  onClick={() => handleDayClick(d)}
                  className="flex justify-center"
                >
                  <span className={`${base} ${classes}`}>
                    {d.getDate()}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Lien semaine */}
          <button
            className="mt-3 w-full rounded-full bg-sky-50 text-sky-700 text-xs font-medium py-2 border border-sky-100 hover:bg-sky-100"
            onClick={() => router.push("/week")}
          >
            Voir ma vue hebdomadaire
          </button>
        </section>
      </div>
    </div>
  );
}

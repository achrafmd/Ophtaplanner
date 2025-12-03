// src/app/day/[date]/[category]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "../../../../../lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";

// Catégories possibles
const CATEGORY_META: Record<
  string,
  { label: string; description: string; accent: string }
> = {
  consultations: {
    label: "Consultations",
    description: "Consultations spécialisées, HDJ, CS externes…",
    accent: "bg-emerald-500",
  },
  bloc: {
    label: "Bloc opératoire",
    description: "Bloc, petite chirurgie, programme opératoire…",
    accent: "bg-sky-500",
  },
  service: {
    label: "Service",
    description: "Visites, HDJ, dossiers, examens complémentaires…",
    accent: "bg-indigo-500",
  },
  garde: {
    label: "Garde",
    description: "Garde, contre-visite, urgences…",
    accent: "bg-rose-500",
  },
};

export default function CategoryPage(props: any) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  const params = (props as any).params || {};
  const date: string = typeof params.date === "string" ? params.date : "";
  const category: string =
    typeof params.category === "string" ? params.category : "consultations";

  const meta =
    CATEGORY_META[category] ?? CATEGORY_META["consultations"];

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

  const jsDate = date
    ? new Date(date + "T00:00:00")
    : new Date();

  const prettyDate = jsDate.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4 py-6">
      <div className="w-full max-w-md space-y-5">
        {/* Header */}
        <header className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">
              OphtaPlanner – Activités
            </h1>
            <p className="text-xs text-slate-500 capitalize">{prettyDate}</p>
          </div>
          <div className="flex flex-col items-end gap-1 text-xs">
            <button
              className="px-3 py-1 rounded-full border bg-white hover:bg-slate-50"
              onClick={() => router.push(`/day/${date}`)}
            >
              Catégories
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

        {/* Carte principale */}
        <section className="rounded-3xl bg-white shadow-[0_18px_45px_rgba(15,23,42,0.18)] border border-slate-100 p-4 space-y-4">
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-bold text-white ${meta.accent}`}
            >
              {meta.label[0]}
            </span>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                {meta.label}
              </h2>
              <p className="text-[11px] text-slate-500">{meta.description}</p>
            </div>
          </div>

          <p className="text-xs text-slate-500">
            Ici on affichera les listes d&apos;activités à cocher pour cette
            catégorie (Matin / Après-midi / Garde) reliées à ton planning
            hebdomadaire.
          </p>

          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-3 text-[11px] text-slate-500 space-y-1">
            <p className="font-medium text-slate-700">
              Prochaine étape :
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>
                Lier cette page au même système d&apos;enregistrement que
                <span className="font-semibold"> la vue semaine</span>.
              </li>
              <li>
                Filtrer les activités du planning en fonction de la catégorie
                (Consultations / Bloc / Service / Garde).
              </li>
            </ul>
          </div>

          <button
            className="mt-1 w-full rounded-full bg-sky-50 text-sky-700 text-xs font-medium py-2 border border-sky-100 hover:bg-sky-100"
            onClick={() => router.push("/week")}
          >
            Aller à ma vue hebdomadaire
          </button>
        </section>
      </div>
    </div>
  );
}

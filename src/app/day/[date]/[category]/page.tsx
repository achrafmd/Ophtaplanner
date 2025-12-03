// src/app/day/[date]/[category]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../../../../../lib/firebase";

const CATEGORY_META: Record<
  string,
  { label: string; description: string; accent: string }
> = {
  consultations: {
    label: "Consultations",
    description:
      "CS spécialisées, nouveaux malades, CS externes, CRM, annexes…",
    accent: "bg-emerald-500",
  },
  bloc: {
    label: "Bloc opératoire",
    description: "Bloc, 2ème/3ème salle, HDJ, petite chirurgie…",
    accent: "bg-sky-500",
  },
  service: {
    label: "Service",
    description:
      "Visites, entrants, contre-visite, dossiers, cours, centralisation…",
    accent: "bg-indigo-500",
  },
  garde: {
    label: "Garde",
    description: "Garde, contre-visite, urgences, weekend…",
    accent: "bg-rose-500",
  },
  exploration: {
    label: "Exploration",
    description: "Champs visuels, OCT, Topographie, Laser, Interprétation…",
    accent: "bg-amber-500",
  },
};

export default function CategoryPage({
  params,
}: {
  params: { date: string; category: string };
}) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  const date = params?.date ?? "";
  const rawCategory = params?.category ?? "consultations";
  const meta = CATEGORY_META[rawCategory] ?? CATEGORY_META["consultations"];

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

  const jsDate = date ? new Date(date + "T00:00:00") : new Date();
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
              onClick={() => router.push(`/day/${encodeURIComponent(date)}`)}
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
            hebdomadaire. Pour l’instant, la navigation et le design sont prêts.
          </p>

          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-3 text-[11px] text-slate-500 space-y-1">
            <p className="font-medium text-slate-700">Prochaine étape :</p>
            <ul className="list-disc list-inside space-y-1">
              <li>
                Lier cette page au même système d&apos;enregistrement que{" "}
                <span className="font-semibold">la vue semaine</span>.
              </li>
              <li>
                Utiliser le mapping activité → catégorie pour n&apos;afficher
                que les activités correspondantes.
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

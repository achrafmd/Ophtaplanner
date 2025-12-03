// src/app/day/[date]/[category]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  doc,
} from "firebase/firestore";

import { auth, db } from "../../../../../lib/firebase";
import { PLANNING } from "../../../../../lib/planning";
import {
  ACTIVITY_CATEGORY,
  type CategoryKey,
} from "../../../../../lib/activityCategories";

// Pour retrouver le nom du jour dans PLANNING
const JOURS_FR = [
  "Dimanche",
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
];

const PERIODES = ["Matin", "Après-midi", "Matin & Après-midi"] as const;

const CATEGORY_META: Record<
  CategoryKey,
  { label: string; description: string; accent: string }
> = {
  consultations: {
    label: "Consultations",
    description:
      "Consultations spécialisées, nouveaux malades, CS externes, CRM, annexes…",
    accent: "bg-emerald-500",
  },
  bloc: {
    label: "Bloc opératoire",
    description: "Bloc, 2ème/3ème salle, HDJ, petite chirurgie…",
    accent: "bg-sky-500",
  },
  service: {
    label: "Service",
    description: "Visites, entrants, contre-visite, dossiers, cours…",
    accent: "bg-indigo-500",
  },
  garde: {
    label: "Garde",
    description: "Garde semaine et garde du weekend.",
    accent: "bg-rose-500",
  },
  exploration: {
    label: "Exploration",
    description: "CV, OCT, Topographie, Laser, Interprétation…",
    accent: "bg-amber-500",
  },
};

type CheckedMap = Record<string, boolean>; // "Matin|CS infectieuse" => true

export default function CategoryPage(props: any) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  // Récupération sûre des params
  const params = (props as any).params || {};
  const date: string = typeof params.date === "string" ? params.date : "";
  const categoryParam: string =
    typeof params.category === "string" ? params.category : "consultations";

  const categoryKey: CategoryKey = ([
    "consultations",
    "bloc",
    "service",
    "garde",
    "exploration",
  ] as const).includes(categoryParam as CategoryKey)
    ? (categoryParam as CategoryKey)
    : "consultations";

  const meta = CATEGORY_META[categoryKey];

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

  // Date affichée
  const jsDate = date ? new Date(date + "T00:00:00") : new Date();
  const prettyDate = jsDate.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const jourName = JOURS_FR[jsDate.getDay()] ?? "Lundi";

  // Activités de cette catégorie pour ce jour (par période)
  const activitiesByPeriode = useMemo(() => {
    const res: Record<string, string[]> = {};

    PERIODES.forEach((periode) => {
      const acts = PLANNING[jourName]?.[periode] || [];
      res[periode] = acts.filter(
        (a: string) => ACTIVITY_CATEGORY[a] === categoryKey
      );
    });

    return res;
  }, [jourName, categoryKey]);

  const [checked, setChecked] = useState<CheckedMap>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");

  // Charger les cases déjà cochées pour ce jour / catégorie / user
  useEffect(() => {
    if (!user || !date) return;

    (async () => {
      try {
        setLoading(true);
        setErr("");
        setInfo("");

        const entriesRef = collection(db, "entries");
        const qRef = query(
          entriesRef,
          where("userId", "==", user.uid),
          where("date", "==", date)
        );
        const snap = await getDocs(qRef);

        const map: CheckedMap = {};

        snap.forEach((docSnap) => {
          const d = docSnap.data() as any;
          const cat = ACTIVITY_CATEGORY[d.activite];
          if (cat === categoryKey) {
            const key = `${d.periode}|${d.activite}`;
            map[key] = true;
          }
        });

        setChecked(map);
      } catch (e: any) {
        console.error(e);
        setErr(e.message || String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [user, date, categoryKey]);

  const toggle = (periode: string, activite: string) => {
    const key = `${periode}|${activite}`;
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const saveCategory = async () => {
    if (!user || !date) return;

    setSaving(true);
    setErr("");
    setInfo("");

    try {
      const batch = writeBatch(db);

      // 1) supprimer toutes les entrées de cette catégorie pour ce jour
      const entriesRef = collection(db, "entries");
      const qRef = query(
        entriesRef,
        where("userId", "==", user.uid),
        where("date", "==", date)
      );
      const snap = await getDocs(qRef);

      snap.forEach((docSnap) => {
        const d = docSnap.data() as any;
        const cat = ACTIVITY_CATEGORY[d.activite];
        if (cat === categoryKey) {
          batch.delete(docSnap.ref);
        }
      });

      // 2) recréer selon les cases cochées
      PERIODES.forEach((periode) => {
        const acts = activitiesByPeriode[periode] || [];
        acts.forEach((activite) => {
          const key = `${periode}|${activite}`;
          if (checked[key]) {
            const ref = doc(collection(db, "entries"));
            batch.set(ref, {
              userId: user.uid,
              date,
              jour: jourName,
              periode,
              activite,
              medecins: "",
              createdAt: new Date(),
            });
          }
        });
      });

      await batch.commit();
      setInfo("Activités enregistrées pour cette catégorie.");
    } catch (e: any) {
      console.error(e);
      setErr(e.message || String(e));
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

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

        {/* Messages */}
        {err && (
          <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
            {err}
          </div>
        )}
        {info && (
          <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
            {info}
          </div>
        )}

        {/* Carte principale */}
        <section className="rounded-3xl bg-white shadow-[0_18px_45px_rgba(15,23,42,0.18)] border border-slate-100 p-4 space-y-4">
          {/* En-tête catégorie */}
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

          {/* Activités à cocher */}
          {loading ? (
            <p className="text-xs text-slate-500">Chargement…</p>
          ) : (
            <div className="space-y-4">
              {PERIODES.map((periode) => {
                const acts = activitiesByPeriode[periode] || [];
                if (!acts.length) return null;

                return (
                  <div key={periode} className="space-y-2">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      {periode}
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {acts.map((activite) => {
                        const key = `${periode}|${activite}`;
                        return (
                          <label
                            key={key}
                            className="flex items-center gap-2 rounded-xl border px-3 py-2 text-xs bg-slate-50 hover:bg-slate-100"
                          >
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-slate-400"
                              checked={!!checked[key]}
                              onChange={() => toggle(periode, activite)}
                            />
                            <span className="truncate">{activite}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <button
            className="mt-2 w-full rounded-full bg-sky-600 text-white text-xs font-medium py-2 hover:bg-sky-700 disabled:opacity-50"
            onClick={saveCategory}
            disabled={saving || loading}
          >
            {saving ? "Enregistrement..." : "Enregistrer cette catégorie"}
          </button>

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

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
  CategoryKey,
} from "../../../../../lib/activityCategories";

const PERIODES = [
  { key: "Matin" as const, label: "Matin" },
  { key: "Après-midi" as const, label: "Après-midi" },
  { key: "Matin & Après-midi" as const, label: "Matin & Après-midi" },
];

type PeriodeKey = (typeof PERIODES)[number]["key"];

const JOURS_FR = [
  "Dimanche",
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
];

type CheckedMap = Record<string, boolean>; // "Matin|CS infectieuse" => true

export default function CategoryPage(props: any) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  const params = (props as any).params || {};
  const date: string = typeof params.date === "string" ? params.date : "";
  const categoryParam: string =
    typeof params.category === "string" ? params.category : "consultations";

  const VALID_CATS: CategoryKey[] = [
    "consultations",
    "bloc",
    "service",
    "garde",
    "exploration",
  ];

  const catKey: CategoryKey = (VALID_CATS.includes(
    categoryParam as CategoryKey
  )
    ? categoryParam
    : "consultations") as CategoryKey;

  const [checked, setChecked] = useState<CheckedMap>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");

  // ---------- Auth ----------
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

  // ---------- Date / labels ----------
  const jsDate = date ? new Date(date + "T00:00:00") : new Date();
  const prettyDate = jsDate.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const jourName = JOURS_FR[jsDate.getDay()];
  const jourPlanning =
    jourName in PLANNING ? jourName : ("Lundi" as keyof typeof PLANNING);

  // ---------- Métadonnées de catégorie ----------
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
      description:
        "Visites, entrants, contre-visite, dossiers, cours, centralisation…",
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

  const meta = CATEGORY_META[catKey];

  // ---------- Activités possibles pour ce jour + catégorie ----------
  const activitiesByPeriode: Record<PeriodeKey, string[]> = useMemo(() => {
    const res: Record<PeriodeKey, string[]> = {
      "Matin": [],
      "Après-midi": [],
      "Matin & Après-midi": [],
    };

    const planningJour = (PLANNING as any)[jourPlanning] || {};

    PERIODES.forEach((p) => {
      const acts: string[] = planningJour[p.key] || [];
      res[p.key] = acts.filter(
        (a) => ACTIVITY_CATEGORY[a] && ACTIVITY_CATEGORY[a] === catKey
      );
    });

    return res;
  }, [jourPlanning, catKey]);

  // ---------- Charger depuis Firestore ----------
  useEffect(() => {
    if (!user || !date) return;

    (async () => {
      setLoading(true);
      setErr("");
      setInfo("");

      try {
        const qRef = query(
          collection(db, "entries"),
          where("userId", "==", user.uid),
          where("date", "==", date)
        );
        const snap = await getDocs(qRef);

        const map: CheckedMap = {};

        snap.forEach((docSnap) => {
          const d = docSnap.data() as any;
          const cat = ACTIVITY_CATEGORY[d.activite];
          if (cat === catKey) {
            const k = `${d.periode}|${d.activite}`;
            map[k] = true;
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
  }, [user, date, catKey]);

  // ---------- Helpers ----------
  const toggle = (periode: PeriodeKey, act: string) => {
    const key = `${periode}|${act}`;
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    if (!user || !date) return;
    setSaving(true);
    setErr("");
    setInfo("");

    try {
      const batch = writeBatch(db);

      // 1) supprimer toutes les entrées de cette catégorie pour ce jour
      const qRef = query(
        collection(db, "entries"),
        where("userId", "==", user.uid),
        where("date", "==", date)
      );
      const snap = await getDocs(qRef);
      snap.forEach((docSnap) => {
        const d = docSnap.data() as any;
        const cat = ACTIVITY_CATEGORY[d.activite];
        if (cat === catKey) {
          batch.delete(docSnap.ref);
        }
      });

      // 2) recréer ce qui est coché
      PERIODES.forEach((p) => {
        const acts = activitiesByPeriode[p.key] || [];
        acts.forEach((act) => {
          const k = `${p.key}|${act}`;
          if (checked[k]) {
            const ref = doc(collection(db, "entries"));
            batch.set(ref, {
              userId: user.uid,
              date,
              jour: jourPlanning,
              periode: p.key,
              activite: act,
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

  // ---------- Rendu ----------
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

          {loading ? (
            <div className="text-xs text-slate-500">Chargement…</div>
          ) : (
            <div className="space-y-3">
              {PERIODES.map((p) => {
                const acts = activitiesByPeriode[p.key];
                if (!acts || !acts.length) return null;

                return (
                  <div key={p.key} className="space-y-1">
                    <div className="inline-flex items-center gap-2 rounded-full bg-slate-900/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                      {p.label}
                    </div>
                    <div className="grid gap-2">
                      {acts.map((act) => {
                        const k = `${p.key}|${act}`;
                        return (
                          <label
                            key={k}
                            className="flex items-center gap-2 rounded-xl border px-3 py-2 text-xs bg-slate-50 hover:bg-slate-100"
                          >
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-slate-400"
                              checked={!!checked[k]}
                              onChange={() => toggle(p.key, act)}
                            />
                            <span className="truncate">{act}</span>
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
            className="mt-2 w-full rounded-full bg-sky-500 text-white text-xs font-medium py-2 hover:bg-sky-600 disabled:opacity-60"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Enregistrement…" : "Enregistrer les activités"}
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

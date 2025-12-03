// src/app/day/[date]/[category]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../../../../../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  doc,
} from "firebase/firestore";
import { PLANNING } from "../../../../../lib/planning";
import {
  ACTIVITY_CATEGORY,
  CategoryKey,
} from "../../../../../lib/activityCategories";

type PeriodeKey = "Matin" | "Après-midi" | "Matin & Après-midi";

const PERIODES: { key: PeriodeKey; label: string }[] = [
  { key: "Matin", label: "Matin" },
  { key: "Après-midi", label: "Après-midi" },
  { key: "Matin & Après-midi", label: "Matin & Après-midi" },
];

const JOURS_FR = [
  "Dimanche",
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
];

export default function DayCategoryPage({
  params,
}: {
  params: { date: string; category: CategoryKey };
}) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState("");
  const [err, setErr] = useState("");

  const dateStr = params.date;
  const category = params.category;

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

  const jour = useMemo(() => {
    const d = new Date(dateStr + "T00:00:00");
    return JOURS_FR[d.getDay()];
  }, [dateStr]);

  // Activités du PLANNING filtrées par catégorie
  const activitiesByPeriode = useMemo(() => {
    const dayPlanning = PLANNING[jour] || {};
    const result: Record<PeriodeKey, string[]> = {
      Matin: [],
      "Après-midi": [],
      "Matin & Après-midi": [],
    };

    (Object.keys(dayPlanning) as PeriodeKey[]).forEach((p) => {
      const acts = dayPlanning[p] || [];
      result[p] = acts.filter((a) => ACTIVITY_CATEGORY[a] === category);
    });

    return result;
  }, [jour, category]);

  // Charger les entrées existantes pour ce jour + cette catégorie
  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const qRef = query(
          collection(db, "entries"),
          where("userId", "==", user.uid),
          where("date", "==", dateStr)
        );
        const snap = await getDocs(qRef);
        const map: Record<string, boolean> = {};
        snap.forEach((d) => {
          const data = d.data() as any;
          const key = `${data.date}|${data.periode}|${data.activite}`;
          if (ACTIVITY_CATEGORY[data.activite] === category) {
            map[key] = true;
          }
        });
        setChecked(map);
      } catch (e: any) {
        setErr(String(e.message || e));
      } finally {
        setLoading(false);
      }
    })();
  }, [user, dateStr, category]);

  const toggle = (key: string) => {
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const save = async () => {
    if (!user) return;
    setLoading(true);
    setInfo("");
    setErr("");
    try {
      const batch = writeBatch(db);

      // Supprimer les entrées de cette catégorie pour ce jour
      const qRef = query(
        collection(db, "entries"),
        where("userId", "==", user.uid),
        where("date", "==", dateStr)
      );
      const snap = await getDocs(qRef);
      snap.forEach((d) => {
        const data = d.data() as any;
        if (ACTIVITY_CATEGORY[data.activite] === category) {
          batch.delete(d.ref);
        }
      });

      // Recréer à partir des cases cochées
      (Object.keys(activitiesByPeriode) as PeriodeKey[]).forEach((periode) => {
        const acts = activitiesByPeriode[periode] || [];
        acts.forEach((activite) => {
          const key = `${dateStr}|${periode}|${activite}`;
          if (checked[key]) {
            const ref = doc(collection(db, "entries"));
            batch.set(ref, {
              userId: user.uid,
              date: dateStr,
              jour,
              periode,
              activite,
              createdAt: new Date(),
            });
          }
        });
      });

      await batch.commit();
      setInfo("Activités enregistrées");
    } catch (e: any) {
      setErr(String(e.message || e));
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  const dateLabel = new Date(dateStr + "T00:00:00").toLocaleDateString(
    "fr-FR",
    { weekday: "long", day: "2-digit", month: "short" }
  );

  const categoryLabel =
    category === "consultations"
      ? "Consultations"
      : category === "bloc"
      ? "Bloc opératoire"
      : category === "service"
      ? "Service"
      : "Garde";

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4 py-6">
      <div className="w-full max-w-md space-y-4">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">
              {categoryLabel}
            </h1>
            <p className="text-xs text-slate-500">{dateLabel}</p>
          </div>
          <button
            className="text-xs rounded-full border px-3 py-1 hover:bg-slate-100"
            onClick={() => router.push(`/day/${dateStr}`)}
          >
            Catégories
          </button>
        </header>

        <section className="rounded-3xl bg-white border border-slate-100 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.18)] space-y-3">
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
            <div className="text-sm text-slate-500">Chargement…</div>
          ) : (
            <div className="space-y-4">
              {PERIODES.map(({ key, label }) => {
                const acts = activitiesByPeriode[key] || [];
                if (!acts.length) return null;
                return (
                  <div key={key} className="space-y-1">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      {label}
                    </div>
                    <div className="grid gap-2">
                      {acts.map((act) => {
                        const k = `${dateStr}|${key}|${act}`;
                        return (
                          <label
                            key={k}
                            className="flex items-center gap-2 rounded-xl border px-3 py-2 text-xs bg-slate-50 hover:bg-slate-100"
                          >
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-slate-400"
                              checked={!!checked[k]}
                              onChange={() => toggle(k)}
                            />
                            <span className="truncate">{act}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              <button
                onClick={save}
                disabled={loading}
                className="w-full rounded-full bg-emerald-600 text-white text-sm font-medium py-2 shadow-sm hover:bg-emerald-700 disabled:opacity-50"
              >
                {loading ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

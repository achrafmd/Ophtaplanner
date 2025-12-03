"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../../../lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  doc,
  getDoc,
} from "firebase/firestore";
import { PLANNING } from "../../../lib/planning";
import { startOfWeek, addDays, formatISO, parseISO } from "date-fns";

const PERIODES = [
  { key: "Matin", label: "MATIN" },
  { key: "Après-midi", label: "APRÈS-MIDI" },
  { key: "Matin & Après-midi", label: "MATIN & APRÈS-MIDI" },
];

const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

type Profile = { id: string; fullName: string };

// petite fonction utilitaire pour être SÛR d'avoir toujours yyyy-MM-dd
const isoDate = (d: Date) =>
  formatISO(d, {
    representation: "date",
  });

export default function WeekPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [targetUserId, setTargetUserId] = useState<string | null>(null);

  const [refDate, setRefDate] = useState(() => isoDate(new Date())); // n’importe quel jour de la semaine
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState("");
  const [err, setErr] = useState("");

  // lundi de la semaine en cours
  const weekStart = useMemo(
    () => startOfWeek(parseISO(refDate), { weekStartsOn: 1 }),
    [refDate]
  );

  // Lundi → Samedi
  const weekDays = useMemo(
    () => Array.from({ length: 6 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  // connexion
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

  // profil + liste des résidents (si admin)
  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      try {
        const profileRef = doc(db, "profiles", user.uid);
        const profileSnap = await getDoc(profileRef);

        let admin = false;
        let fullName = "Moi";

        if (profileSnap.exists()) {
          const data = profileSnap.data() as any;
          if (data.role === "admin") admin = true;
          if (data.fullName) fullName = data.fullName;
        }

        setIsAdmin(admin);

        let profs: Profile[] = [{ id: user.uid, fullName }];

        if (admin) {
          const allSnap = await getDocs(collection(db, "profiles"));
          profs = allSnap.docs.map((d) => ({
            id: d.id,
            fullName: (d.data() as any).fullName || d.id,
          }));
        }

        profs.sort((a, b) => a.fullName.localeCompare(b.fullName));
        setProfiles(profs);
        setTargetUserId(user.uid);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  // charge les activités cochées pour la semaine / résident
  useEffect(() => {
    if (!user || !targetUserId) return;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const from = isoDate(weekDays[0]); // lundi
        const to = isoDate(weekDays[5]); // samedi
        const qRef = query(
          collection(db, "entries"),
          where("userId", "==", targetUserId),
          where("date", ">=", from),
          where("date", "<=", to)
        );
        const snap = await getDocs(qRef);
        const map: Record<string, boolean> = {};
        snap.forEach((docSnap) => {
          const d = docSnap.data() as any;
          const key = `${d.date}|${d.periode}|${d.activite}`;
          map[key] = true;
        });
        setChecked(map);
      } catch (e: any) {
        setErr(String(e.message || e));
      } finally {
        setLoading(false);
      }
    })();
  }, [user, targetUserId, weekDays]);

  const toggle = (key: string) => {
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const saveAll = async () => {
    if (!user || !targetUserId) return;
    setLoading(true);
    setInfo("");
    setErr("");
    try {
      const batch = writeBatch(db);
      const from = isoDate(weekDays[0]);
      const to = isoDate(weekDays[5]);

      // on efface d’abord tout ce qui existe pour cette semaine / résident
      const qRef = query(
        collection(db, "entries"),
        where("userId", "==", targetUserId),
        where("date", ">=", from),
        where("date", "<=", to)
      );
      const snap = await getDocs(qRef);
      snap.forEach((d) => batch.delete(d.ref));

      // puis on recrée à partir des cases cochées
      for (let i = 0; i < weekDays.length; i++) {
        const dateObj = weekDays[i];
        const dateStr = isoDate(dateObj);
        const jour = JOURS[i];
        for (const periode of PERIODES) {
          const acts = PLANNING[jour]?.[periode.key] || [];
          for (const activite of acts) {
            const k = `${dateStr}|${periode.key}|${activite}`;
            if (checked[k]) {
              const ref = doc(collection(db, "entries"));
              batch.set(ref, {
                userId: targetUserId,
                date: dateStr,
                jour,
                periode: periode.key,
                activite,
                medecins: "",
                createdAt: new Date(),
              });
            }
          }
        }
      }

      await batch.commit();
      setInfo("Semaine enregistrée");
    } catch (e: any) {
      setErr(String(e.message || e));
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  const currentProfileName =
    profiles.find((p) => p.id === targetUserId)?.fullName || "Résident";

  const weekLabelFrom = isoDate(weekDays[0]);
  const weekLabelTo = isoDate(weekDays[5]);

  const goPrevWeek = () => {
    const newRef = addDays(weekStart, -7);
    setRefDate(isoDate(newRef));
  };

  const goNextWeek = () => {
    const newRef = addDays(weekStart, 7);
    setRefDate(isoDate(newRef));
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <main className="max-w-5xl mx-auto px-3 sm:px-4 lg:px-6 py-5 sm:py-8 space-y-5">
        {/* HEADER */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
              <span className="text-slate-900">Ophta</span>
              <span className="text-sky-700">Planner</span>
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Mes activités – semaine (matin / après-midi)
            </p>
            {isAdmin && (
              <div className="mt-2 inline-flex items-center rounded-full bg-sky-50 border border-sky-100 px-3 py-1 text-xs font-medium text-sky-800">
                Mode administrateur
              </div>
            )}
          </div>

          <div className="flex flex-col items-end gap-2 text-sm">
            <div className="flex gap-2">
              <button
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-xs sm:text-sm font-medium shadow-sm hover:bg-slate-50"
                onClick={() => router.push("/overview")}
              >
                Vue générale
              </button>
              <button
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-xs sm:text-sm font-medium shadow-sm hover:bg-slate-50"
                onClick={async () => {
                  await signOut(auth);
                  router.replace("/login");
                }}
              >
                Se déconnecter
              </button>
            </div>
          </div>
        </header>

        {/* FILTRES HAUT : semaine + résident */}
        <section className="grid gap-4 md:grid-cols-2">
          {/* navigation semaine */}
          <div className="bg-white/90 backdrop-blur rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5 space-y-3">
            <p className="text-[11px] sm:text-xs font-medium text-slate-600">
              Semaine en cours
            </p>
            <p className="text-sm font-semibold text-slate-900">
              Du {weekLabelFrom} au {weekLabelTo}
            </p>
            <div className="flex gap-2 pt-1">
              <button
                className="flex-1 inline-flex items-center justify-center rounded-full border border-slate-300 bg-slate-50 px-3 py-2 text-xs sm:text-sm font-medium hover:bg-slate-100"
                onClick={goPrevWeek}
              >
                ◀ Semaine précédente
              </button>
              <button
                className="flex-1 inline-flex items-center justify-center rounded-full border border-slate-300 bg-slate-50 px-3 py-2 text-xs sm:text-sm font-medium hover:bg-slate-100"
                onClick={goNextWeek}
              >
                Semaine suivante ▶
              </button>
            </div>
          </div>

          {/* résident */}
          <div className="bg-white/90 backdrop-blur rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5 space-y-2">
            <label className="text-[11px] sm:text-xs font-medium text-slate-600">
              Résident
            </label>
            {isAdmin ? (
              <select
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/60"
                value={targetUserId || ""}
                onChange={(e) => setTargetUserId(e.target.value)}
              >
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fullName}
                  </option>
                ))}
              </select>
            ) : (
              <div className="mt-1 inline-flex items-center rounded-full bg-slate-50 px-3 py-1 text-sm font-medium text-slate-800">
                {currentProfileName}
              </div>
            )}
          </div>
        </section>

        {/* messages */}
        {err && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
            {err}
          </div>
        )}
        {info && (
          <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
            {info}
          </div>
        )}

        {/* LISTE SEMAINE */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5">
          {loading ? (
            <div className="text-sm text-slate-500">Chargement…</div>
          ) : (
            <div className="space-y-6">
              {weekDays.map((d, i) => {
                const jour = JOURS[i];
                const dateStr = isoDate(d);
                return (
                  <section
                    key={dateStr}
                    className="space-y-2 pb-4 border-b border-slate-100 last:border-0 last:pb-0"
                  >
                    <div className="flex items-baseline justify-between">
                      <h2 className="font-semibold text-base sm:text-lg text-slate-900">
                        {jour} — {dateStr}
                      </h2>
                    </div>

                    {PERIODES.map((periode) => {
                      const acts = PLANNING[jour]?.[periode.key] || [];
                      if (!acts.length) return null;
                      return (
                        <div key={periode.key} className="mt-1 space-y-1">
                          <div className="text-[11px] sm:text-xs font-semibold uppercase tracking-wide text-slate-500">
                            {periode.label}
                          </div>
                          <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {acts.map((act) => {
                              const k = `${dateStr}|${periode.key}|${act}`;
                              return (
                                <label
                                  key={k}
                                  className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs sm:text-sm bg-slate-50 hover:bg-slate-100 transition"
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
                  </section>
                );
              })}

              <div className="pt-2">
                <button
                  className="inline-flex items-center justify-center rounded-full bg-sky-600 text-white px-6 py-2 text-sm font-medium shadow-sm hover:bg-sky-700 disabled:opacity-50"
                  onClick={saveAll}
                  disabled={loading}
                >
                  {loading ? "Enregistrement…" : "Enregistrer la semaine"}
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

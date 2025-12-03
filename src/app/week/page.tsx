// src/app/week/page.tsx
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

type Profile = {
  id: string;
  fullName: string;
  phone?: string;
  email?: string;
};

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

  const [refDate, setRefDate] = useState(() => isoDate(new Date()));
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState("");
  const [err, setErr] = useState("");

  const weekStart = useMemo(
    () => startOfWeek(parseISO(refDate), { weekStartsOn: 1 }),
    [refDate]
  );

  const weekDays = useMemo(
    () => Array.from({ length: 6 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

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

  // Profil + liste résidents
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
          profs = allSnap.docs.map((d) => {
            const data = d.data() as any;
            return {
              id: d.id,
              fullName: data.fullName || d.id,
              phone: data.phone,
              email: data.email,
            };
          });
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

  // Charger les entrées de la semaine
  useEffect(() => {
    if (!user || !targetUserId) return;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const from = isoDate(weekDays[0]);
        const to = isoDate(weekDays[5]);
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

      const qRef = query(
        collection(db, "entries"),
        where("userId", "==", targetUserId),
        where("date", ">=", from),
        where("date", "<=", to)
      );
      const snap = await getDocs(qRef);
      snap.forEach((d) => batch.delete(d.ref));

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
    <div className="py-5 space-y-4">
      {/* Header */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            OphtaPlanner
          </h1>
          <p className="text-sm text-slate-500">Mes activités – semaine</p>
        </div>

        <div className="flex flex-col items-end gap-2 text-sm">
          <div className="flex gap-2">
            <button
              className="px-3 py-1 rounded-full border text-xs sm:text-sm hover:bg-slate-100"
              onClick={() => router.push("/")}
            >
              Calendrier
            </button>
            <button
              className="px-3 py-1 rounded-full border text-xs sm:text-sm hover:bg-slate-100"
              onClick={() => router.push("/overview")}
            >
              Vue générale
            </button>
            {isAdmin && (
              <button
                className="px-3 py-1 rounded-full border text-xs sm:text-sm hover:bg-slate-100"
                onClick={() => router.push("/residents")}
              >
                Fiches résidents
              </button>
            )}
            <button
              className="px-3 py-1 rounded-full border text-xs sm:text-sm hover:bg-slate-100"
              onClick={async () => {
                await signOut(auth);
                router.replace("/login");
              }}
            >
              Se déconnecter
            </button>
          </div>
          {isAdmin && (
            <div className="text-right text-xs text-slate-500">
              Mode admin
            </div>
          )}
        </div>
      </header>

      {/* Filtres haut */}
      <div className="grid gap-3 md:grid-cols-2">
        <div className="bg-white rounded-2xl shadow-sm border p-4 space-y-3">
          <div className="text-xs font-medium text-slate-600">
            Semaine du {weekLabelFrom} au {weekLabelTo}
          </div>
          <div className="flex gap-2">
            <button
              className="flex-1 rounded-full border px-3 py-2 text-sm hover:bg-slate-100"
              onClick={goPrevWeek}
            >
              ◀ Semaine précédente
            </button>
            <button
              className="flex-1 rounded-full border px-3 py-2 text-sm hover:bg-slate-100"
              onClick={goNextWeek}
            >
              Semaine suivante ▶
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border p-4 space-y-2">
          <label className="text-xs font-medium text-slate-600">
            Résident
          </label>
          {isAdmin ? (
            <select
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/60"
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
            <div className="mt-1 text-sm font-medium text-slate-800">
              {currentProfileName}
            </div>
          )}
        </div>
      </div>

      {err && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
          {err}
        </div>
      )}
      {info && (
        <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
          {info}
        </div>
      )}

      {/* Liste semaine */}
      <div className="bg-white rounded-2xl shadow-sm border p-4">
        {loading ? (
          <div className="text-sm text-slate-500">Chargement...</div>
        ) : (
          <div className="space-y-6">
            {weekDays.map((d, i) => {
              const jour = JOURS[i];
              const dateStr = isoDate(d);
              return (
                <section key={dateStr} className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <h2 className="font-semibold text-sm sm:text-base">
                      {jour} — {dateStr}
                    </h2>
                  </div>
                  {PERIODES.map((periode) => {
                    const acts = PLANNING[jour]?.[periode.key] || [];
                    if (!acts.length) return null;
                    return (
                      <div key={periode.key} className="mt-1">
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {periode.label}
                        </div>
                        <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {acts.map((act) => {
                            const k = `${dateStr}|${periode.key}|${act}`;
                            return (
                              <label
                                key={k}
                                className="flex items-center gap-2 rounded-xl border px-3 py-2 text-xs sm:text-sm bg-slate-50 hover:bg-slate-100 transition"
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
                className="w-full sm:w-auto rounded-full bg-blue-600 text-white px-5 py-2 text-sm font-medium shadow-sm hover:bg-blue-700 disabled:opacity-50"
                onClick={saveAll}
                disabled={loading}
              >
                {loading ? "Enregistrement..." : "Enregistrer la semaine"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

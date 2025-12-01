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
    orderBy,
    doc,
    getDoc,
} from "firebase/firestore";
import { startOfWeek, addDays, parseISO, formatISO } from "date-fns";

type Profile = { id: string; fullName: string; role?: string };

type Entry = {
    id: string;
    userId: string;
    date: string;      // yyyy-MM-dd
    jour: string;
    periode: string;
    activite: string;
};

type Mode = "day" | "week";

const isoDate = (d: Date) =>
    formatISO(d, {
        representation: "date",
    });

const PERIODE_ORDER: Record<string, number> = {
    "Matin": 0,
    "Après-midi": 1,
    "Matin & Après-midi": 2,
};

export default function OverviewPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [profiles, setProfiles] = useState<Record<string, Profile>>({});
    const [mode, setMode] = useState<Mode>("week");
    const [selectedDate, setSelectedDate] = useState(() => isoDate(new Date()));
    const [entries, setEntries] = useState<Entry[]>([]);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState("");

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

    // profil + profils des résidents
    useEffect(() => {
        if (!user) return;
        (async () => {
            setLoading(true);
            try {
                const profileRef = doc(db, "profiles", user.uid);
                const profileSnap = await getDoc(profileRef);

                let admin = false;

                if (profileSnap.exists()) {
                    const data = profileSnap.data() as any;
                    if (data.role === "admin") admin = true;
                }

                setIsAdmin(admin);

                const map: Record<string, Profile> = {};

                if (admin) {
                    // tous les résidents
                    const allSnap = await getDocs(collection(db, "profiles"));
                    allSnap.forEach((d) => {
                        const data = d.data() as any;
                        map[d.id] = {
                            id: d.id,
                            fullName: data.fullName || d.id,
                            role: data.role,
                        };
                    });
                } else {
                    // seulement moi
                    if (profileSnap.exists()) {
                        const data = profileSnap.data() as any;
                        map[user.uid] = {
                            id: user.uid,
                            fullName: data.fullName || user.email || "Moi",
                            role: data.role,
                        };
                    } else {
                        map[user.uid] = {
                            id: user.uid,
                            fullName: user.email || "Moi",
                        };
                    }
                }

                setProfiles(map);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        })();
    }, [user]);

    // calcul du range de dates en fonction du mode
    const { fromDate, toDate, weekLabel } = useMemo(() => {
        const base = parseISO(selectedDate);
        if (mode === "day") {
            const d = isoDate(base);
            return { fromDate: d, toDate: d, weekLabel: d };
        } else {
            const start = startOfWeek(base, { weekStartsOn: 1 });
            const end = addDays(start, 5);
            return {
                fromDate: isoDate(start),
                toDate: isoDate(end),
                weekLabel: `${isoDate(start)} au ${isoDate(end)}`,
            };
        }
    }, [mode, selectedDate]);

    // chargement des entrées
    useEffect(() => {
        if (!user) return;
        (async () => {
            setLoading(true);
            setErr("");
            try {
                const qParts = [
                    where("date", ">=", fromDate),
                    where("date", "<=", toDate),
                ];

                if (!isAdmin) {
                    // les résidents voient uniquement leurs propres activités
                    qParts.push(where("userId", "==", user.uid));
                }

                const qRef = query(collection(db, "entries"), ...qParts);
                const snap = await getDocs(qRef);

                const list: Entry[] = snap.docs.map((d) => {
                    const data = d.data() as any;
                    return {
                        id: d.id,
                        userId: data.userId,
                        date: data.date,
                        jour: data.jour,
                        periode: data.periode,
                        activite: data.activite,
                    };
                });

                setEntries(list);
            } catch (e: any) {
                setErr(String(e.message || e));
            } finally {
                setLoading(false);
            }
        })();
    }, [user, isAdmin, fromDate, toDate]);

    if (!user) return null;

    // ---------------------------
    // Agrégation pour l’affichage
    // ---------------------------

    if (isAdmin) {
        // ADMIN : regrouper par activité, avec liste des résidents

        type ActivityGroup = {
            date: string;
            jour: string;
            periode: string;
            activite: string;
            residents: string[];
        };

        const groupsMap: Record<string, ActivityGroup> = {};

        for (const e of entries) {
            const profile = profiles[e.userId];
            const name = profile?.fullName || "Résident inconnu";

            const key = `${e.date}|${e.periode}|${e.activite}`;

            if (!groupsMap[key]) {
                groupsMap[key] = {
                    date: e.date,
                    jour: e.jour,
                    periode: e.periode,
                    activite: e.activite,
                    residents: [],
                };
            }
            if (!groupsMap[key].residents.includes(name)) {
                groupsMap[key].residents.push(name);
            }
        }

        const groups = Object.values(groupsMap).sort((a, b) => {
            if (a.date !== b.date) return a.date.localeCompare(b.date);
            const pa = PERIODE_ORDER[a.periode] ?? 99;
            const pb = PERIODE_ORDER[b.periode] ?? 99;
            if (pa !== pb) return pa - pb;
            return a.activite.localeCompare(b.activite);
        });

        // pour le mode semaine, on regroupe les activités par date
        const groupedByDate: Record<string, ActivityGroup[]> = {};
        for (const g of groups) {
            if (!groupedByDate[g.date]) groupedByDate[g.date] = [];
            groupedByDate[g.date].push(g);
        }

        return (
            <div className="py-5 space-y-4">
                {/* Header */}
                <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">
                            Vue générale
                        </h1>
                        <p className="text-sm text-slate-500">
                            Activités des résidents ({mode === "day" ? "jour" : "semaine"})
                        </p>
                    </div>

                    <div className="flex flex-col items-end gap-2 text-sm">
                        <button
                            className="px-3 py-1 rounded-full border text-xs sm:text-sm hover:bg-slate-100"
                            onClick={() => router.push("/week")}
                        >
                            Retour à ma semaine
                        </button>
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
                </header>

                {/* Filtres */}
                <div className="bg-white rounded-2xl shadow-sm border p-4 space-y-3">
                    <div className="grid gap-3 md:grid-cols-2 items-center">
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-600">
                                Date
                            </label>
                            <input
                                type="date"
                                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/60"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1">
                            <span className="text-xs font-medium text-slate-600">
                                Mode d&apos;affichage
                            </span>
                            <div className="flex rounded-full bg-slate-100 p-1 text-sm">
                                <button
                                    className={`flex-1 rounded-full px-3 py-1 ${mode === "day"
                                            ? "bg-white shadow-sm"
                                            : "text-slate-500 hover:text-slate-700"
                                        }`}
                                    onClick={() => setMode("day")}
                                >
                                    Jour
                                </button>
                                <button
                                    className={`flex-1 rounded-full px-3 py-1 ${mode === "week"
                                            ? "bg-white shadow-sm"
                                            : "text-slate-500 hover:text-slate-700"
                                        }`}
                                    onClick={() => setMode("week")}
                                >
                                    Semaine
                                </button>
                            </div>
                            {mode === "week" && (
                                <div className="text-xs text-slate-500 mt-1">
                                    Semaine du {weekLabel}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {err && (
                    <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                        {err}
                    </div>
                )}

                {/* Résultats */}
                <div className="bg-white rounded-2xl shadow-sm border p-4">
                    {loading ? (
                        <div className="text-sm text-slate-500">Chargement...</div>
                    ) : groups.length === 0 ? (
                        <div className="text-sm text-slate-500">
                            Aucune activité cochée pour cette période.
                        </div>
                    ) : mode === "day" ? (
                        // MODE JOUR : toutes les activités du jour
                        <div className="space-y-2">
                            {groups.map((g) => (
                                <div
                                    key={`${g.date}|${g.periode}|${g.activite}`}
                                    className="rounded-xl bg-slate-50 border px-3 py-2 text-sm"
                                >
                                    <div className="font-medium">
                                        {g.periode} — {g.activite}
                                    </div>
                                    <div className="text-xs text-slate-600 mt-1">
                                        {g.residents.join(", ")}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        // MODE SEMAINE : regroupé par date
                        <div className="space-y-4">
                            {Object.keys(groupedByDate)
                                .sort()
                                .map((date) => (
                                    <section
                                        key={date}
                                        className="rounded-2xl border bg-slate-50 px-3 py-3"
                                    >
                                        <div className="font-semibold text-sm mb-2">
                                            {groupedByDate[date][0]?.jour} — {date}
                                        </div>
                                        <div className="space-y-1">
                                            {groupedByDate[date].map((g) => (
                                                <div
                                                    key={`${g.date}|${g.periode}|${g.activite}`}
                                                    className="text-sm"
                                                >
                                                    <span className="font-medium">
                                                        {g.periode} — {g.activite} :
                                                    </span>{" "}
                                                    <span className="text-slate-700">
                                                        {g.residents.join(", ")}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ------------------------
    // Vue pour un résident seul
    // ------------------------
    // regrouper par date + période + activité
    const myEntriesByDate: Record<string, Entry[]> = {};
    for (const e of entries) {
        if (!myEntriesByDate[e.date]) myEntriesByDate[e.date] = [];
        myEntriesByDate[e.date].push(e);
    }

    return (
        <div className="py-5 space-y-4">
            <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">
                        Vue générale
                    </h1>
                    <p className="text-sm text-slate-500">Mes activités</p>
                </div>

                <div className="flex flex-col items-end gap-2 text-sm">
                    <button
                        className="px-3 py-1 rounded-full border text-xs sm:text-sm hover:bg-slate-100"
                        onClick={() => router.push("/week")}
                    >
                        Retour à ma semaine
                    </button>
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
            </header>

            <div className="bg-white rounded-2xl shadow-sm border p-4 space-y-3">
                <div className="grid gap-3 md:grid-cols-2 items-center">
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-600">Date</label>
                        <input
                            type="date"
                            className="mt-1 w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/60"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                        />
                    </div>
                    <div className="space-y-1">
                        <span className="text-xs font-medium text-slate-600">
                            Mode d&apos;affichage
                        </span>
                        <div className="flex rounded-full bg-slate-100 p-1 text-sm">
                            <button
                                className={`flex-1 rounded-full px-3 py-1 ${mode === "day"
                                        ? "bg-white shadow-sm"
                                        : "text-slate-500 hover:text-slate-700"
                                    }`}
                                onClick={() => setMode("day")}
                            >
                                Jour
                            </button>
                            <button
                                className={`flex-1 rounded-full px-3 py-1 ${mode === "week"
                                        ? "bg-white shadow-sm"
                                        : "text-slate-500 hover:text-slate-700"
                                    }`}
                                onClick={() => setMode("week")}
                            >
                                Semaine
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {err && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                    {err}
                </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border p-4">
                {loading ? (
                    <div className="text-sm text-slate-500">Chargement...</div>
                ) : entries.length === 0 ? (
                    <div className="text-sm text-slate-500">
                        Aucune activité cochée pour cette période.
                    </div>
                ) : mode === "day" ? (
                    <div className="space-y-1">
                        {entries
                            .filter((e) => e.date === selectedDate)
                            .sort((a, b) => {
                                const pa = PERIODE_ORDER[a.periode] ?? 99;
                                const pb = PERIODE_ORDER[b.periode] ?? 99;
                                if (pa !== pb) return pa - pb;
                                return a.activite.localeCompare(b.activite);
                            })
                            .map((e) => (
                                <div key={e.id} className="text-sm">
                                    {e.periode} — {e.activite}
                                </div>
                            ))}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {Object.keys(myEntriesByDate)
                            .sort()
                            .map((date) => (
                                <section key={date} className="space-y-1">
                                    <div className="font-semibold text-sm">
                                        {myEntriesByDate[date][0]?.jour} — {date}
                                    </div>
                                    {myEntriesByDate[date]
                                        .sort((a, b) => {
                                            const pa = PERIODE_ORDER[a.periode] ?? 99;
                                            const pb = PERIODE_ORDER[b.periode] ?? 99;
                                            if (pa !== pb) return pa - pb;
                                            return a.activite.localeCompare(b.activite);
                                        })
                                        .map((e) => (
                                            <div key={e.id} className="text-sm">
                                                {e.periode} — {e.activite}
                                            </div>
                                        ))}
                                </section>
                            ))}
                    </div>
                )}
            </div>
        </div>
    );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../../../lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
    collection,
    query,
    where,
    getDocs,
    doc,
    getDoc,
} from "firebase/firestore";
import { startOfWeek, addDays, formatISO } from "date-fns";

type Entry = {
    userId: string;
    jour: string;
    periode: string;
    activite: string;
    date: string;
};

type UserGroup = {
    userId: string;
    fullName: string;
    entries: Entry[];
};

type Mode = "day" | "week";

export default function OverviewPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [dateStr, setDateStr] = useState(
        () => new Date().toISOString().slice(0, 10)
    );
    const [mode, setMode] = useState<Mode>("day");
    const [groups, setGroups] = useState<UserGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState("");

    // verifie connexion
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

    const loadFor = async (d: string, m: Mode) => {
        if (!user) return;
        setLoading(true);
        setErr("");
        try {
            let qRef;

            if (m === "day") {
                // jour précis
                qRef = query(collection(db, "entries"), where("date", "==", d));
            } else {
                // semaine complète (lundi -> samedi autour de la date)
                const ref = new Date(d);
                const monday = startOfWeek(ref, { weekStartsOn: 1 });
                const saturday = addDays(monday, 5);
                const from = formatISO(monday, { representation: "date" });
                const to = formatISO(saturday, { representation: "date" });

                qRef = query(
                    collection(db, "entries"),
                    where("date", ">=", from),
                    where("date", "<=", to)
                );
            }

            const snap = await getDocs(qRef);

            const byUser: Record<string, Entry[]> = {};
            snap.forEach((docSnap) => {
                const data = docSnap.data() as any;
                const e: Entry = {
                    userId: data.userId,
                    jour: data.jour,
                    periode: data.periode,
                    activite: data.activite,
                    date: data.date,
                };
                if (!byUser[e.userId]) byUser[e.userId] = [];
                byUser[e.userId].push(e);
            });

            const userIds = Object.keys(byUser);
            const groupsTmp: UserGroup[] = [];

            await Promise.all(
                userIds.map(async (uid) => {
                    const pRef = doc(db, "profiles", uid);
                    const pSnap = await getDoc(pRef);
                    const fullName =
                        (pSnap.exists() && (pSnap.data() as any).fullName) || uid;
                    const entries = byUser[uid].sort((a, b) => {
                        if (a.date !== b.date) return a.date.localeCompare(b.date);
                        if (a.jour !== b.jour) return a.jour.localeCompare(b.jour);
                        if (a.periode !== b.periode)
                            return a.periode.localeCompare(b.periode);
                        return a.activite.localeCompare(b.activite);
                    });
                    groupsTmp.push({
                        userId: uid,
                        fullName,
                        entries,
                    });
                })
            );

            groupsTmp.sort((a, b) => a.fullName.localeCompare(b.fullName));
            setGroups(groupsTmp);
        } catch (e: any) {
            setErr(String(e.message || e));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            loadFor(dateStr, mode);
        }
    }, [user, dateStr, mode]);

    if (!user) return null;

    const modeLabel =
        mode === "day" ? "Activités du jour" : "Activités de la semaine";

    return (
        <div className="py-5 space-y-4">
            <header className="flex items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">
                        Vue générale
                    </h1>
                    <p className="text-sm text-slate-500">{modeLabel}</p>
                </div>
                <div className="flex flex-col items-end gap-2 text-sm">
                    <div className="flex gap-2">
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
                </div>
            </header>

            <div className="bg-white rounded-2xl shadow-sm border p-4 space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-600">
                            Date
                        </label>
                        <input
                            type="date"
                            className="mt-1 w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/60"
                            value={dateStr}
                            onChange={(e) => setDateStr(e.target.value)}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-600">
                            Mode d&apos;affichage
                        </label>
                        <div className="mt-1 flex rounded-full border p-1 bg-slate-50">
                            <button
                                className={`flex-1 rounded-full px-3 py-1 text-xs sm:text-sm ${mode === "day"
                                        ? "bg-white shadow-sm"
                                        : "text-slate-500 hover:bg-slate-100"
                                    }`}
                                onClick={() => setMode("day")}
                            >
                                Jour
                            </button>
                            <button
                                className={`flex-1 rounded-full px-3 py-1 text-xs sm:text-sm ${mode === "week"
                                        ? "bg-white shadow-sm"
                                        : "text-slate-500 hover:bg-slate-100"
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

            <div className="bg-white rounded-2xl shadow-sm border p-4 space-y-4">
                {loading ? (
                    <div className="text-sm text-slate-500">Chargement...</div>
                ) : groups.length === 0 ? (
                    <div className="text-sm text-slate-500">
                        Aucune activité cochée pour ce {mode === "day" ? "jour" : "cette semaine"}.
                    </div>
                ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                        {groups.map((g) => (
                            <div
                                key={g.userId}
                                className="border rounded-2xl p-3 bg-slate-50 space-y-1"
                            >
                                <div className="font-semibold text-sm mb-1">{g.fullName}</div>
                                {g.entries.map((e, idx) => (
                                    <div key={idx} className="text-xs sm:text-sm">
                                        <span className="font-medium">
                                            {e.jour} ({e.date})
                                        </span>{" "}
                                        - <span>{e.periode}</span> : <span>{e.activite}</span>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

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
    doc,
    getDoc,
} from "firebase/firestore";
import { addDays, formatISO, startOfWeek } from "date-fns";

type Entry = {
    userId: string;
    date: string; // "YYYY-MM-DD"
    jour: string;
    periode: string; // "Matin" | "Après-midi" | "Matin & Après-midi"
    activite: string;
};

type Grouped = Record<
    string, // date
    Record<
        string, // période
        Record<string, string[]> // activité -> liste de résidents
    >
>;

const PERIODES = [
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

export default function OverviewPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [isAdmin, setIsAdmin] = useState(false);

    const [profiles, setProfiles] = useState<Record<string, string>>({});
    const [mode, setMode] = useState<"jour" | "semaine">("semaine");
    const [selectedDate, setSelectedDate] = useState(
        () => new Date().toISOString().slice(0, 10)
    );

    const [grouped, setGrouped] = useState<Grouped>({});
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState("");

    // --- Auth ---
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

    // --- Profils & rôle admin ---
    useEffect(() => {
        if (!user) return;

        (async () => {
            try {
                const meRef = doc(db, "profiles", user.uid);
                const meSnap = await getDoc(meRef);

                let admin = false;
                let map: Record<string, string> = {};

                if (meSnap.exists()) {
                    const data = meSnap.data() as any;
                    if (data.role === "admin") admin = true;
                    map[user.uid] = data.fullName || user.email || "Moi";
                } else {
                    map[user.uid] = user.email || "Moi";
                }

                if (admin) {
                    const allSnap = await getDocs(collection(db, "profiles"));
                    map = {};
                    allSnap.forEach((d) => {
                        const data = d.data() as any;
                        map[d.id] = data.fullName || d.id;
                    });
                }

                setIsAdmin(admin);
                setProfiles(map);
            } catch (e) {
                console.error(e);
            }
        })();
    }, [user]);

    // --- Semaine autour de la date sélectionnée ---
    const weekDays = useMemo(() => {
        const ref = new Date(selectedDate);
        const monday = startOfWeek(ref, { weekStartsOn: 1 });
        return Array.from({ length: 6 }, (_, i) => addDays(monday, i));
    }, [selectedDate]);

    // --- Charger depuis Firestore & regrouper par date / période / activité ---
    useEffect(() => {
        if (!user || !Object.keys(profiles).length) return;

        (async () => {
            setLoading(true);
            setErr("");
            try {
                const entriesRef = collection(db, "entries");
                const constraints: any[] = [];

                if (!isAdmin) {
                    constraints.push(where("userId", "==", user.uid));
                }

                if (mode === "jour") {
                    constraints.push(where("date", "==", selectedDate));
                } else {
                    const from = formatISO(weekDays[0], { representation: "date" });
                    const to = formatISO(weekDays[5], { representation: "date" });
                    constraints.push(where("date", ">=", from));
                    constraints.push(where("date", "<=", to));
                }

                const qRef = query(entriesRef, ...constraints);
                const snap = await getDocs(qRef);

                const res: Grouped = {};

                snap.forEach((docSnap) => {
                    const d = docSnap.data() as any as Entry;
                    const dateKey = d.date;
                    const periodeKey = d.periode; // "Matin", "Après-midi", "Matin & Après-midi"
                    const activite = d.activite;
                    const fullName = profiles[d.userId] || d.userId;

                    if (!res[dateKey]) {
                        res[dateKey] = {};
                    }
                    if (!res[dateKey][periodeKey]) {
                        res[dateKey][periodeKey] = {};
                    }
                    if (!res[dateKey][periodeKey][activite]) {
                        res[dateKey][periodeKey][activite] = [];
                    }
                    if (!res[dateKey][periodeKey][activite].includes(fullName)) {
                        res[dateKey][periodeKey][activite].push(fullName);
                    }
                });

                setGrouped(res);
            } catch (e: any) {
                console.error(e);
                setErr(e.message || String(e));
            } finally {
                setLoading(false);
            }
        })();
    }, [user, profiles, isAdmin, mode, selectedDate, weekDays]);

    if (!user) return null;

    // --- UI helpers ---
    const handlePrint = () => {
        if (typeof window !== "undefined") {
            window.print();
        }
    };

    const datesToRender =
        mode === "jour"
            ? [selectedDate]
            : weekDays.map((d) => formatISO(d, { representation: "date" }));

    const hasData = datesToRender.some((d) => grouped[d]);

    const subtitle = isAdmin
        ? "Vue globale des activités de tous les résidents"
        : "Récapitulatif de vos activités";

    return (
        <div className="py-6 space-y-5 md:space-y-6">
            {/* BANNIÈRE HAUT - STYLE MÉDICAL */}
            <div className="no-print rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-600 text-white text-xl font-semibold">
                        {/* petite croix médicale stylisée */}
                        +
                    </div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-semibold text-slate-900 tracking-tight">
                            OphtaPlanner – Vue générale
                        </h1>
                        <p className="text-xs md:text-sm text-sky-900/80">{subtitle}</p>
                    </div>
                </div>
                {isAdmin && (
                    <div className="flex items-center gap-2 self-start md:self-auto">
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-700 border border-emerald-100">
                            ● Mode administrateur
                        </span>
                    </div>
                )}
            </div>

            {/* BARRE DE CONTROLES */}
            <section className="no-print bg-white border border-slate-200 rounded-2xl shadow-sm px-4 py-4 md:px-5 md:py-5 space-y-4">
                <div className="grid gap-4 md:grid-cols-2 md:items-end">
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                            Date de référence
                        </label>
                        <input
                            type="date"
                            className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-sky-500/70 focus:border-sky-500 bg-slate-50"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                        />
                        <p className="text-[11px] text-slate-500 leading-snug">
                            En mode <span className="font-medium">Semaine</span>, la période
                            s&apos;étend du <span className="font-medium">lundi au samedi</span>{" "}
                            incluant cette date.
                        </p>
                    </div>

                    <div className="flex flex-col gap-3 items-start md:items-end">
                        <div>
                            <span className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                                Mode d&apos;affichage
                            </span>
                            <div className="inline-flex rounded-full bg-slate-100 p-1 text-xs md:text-sm">
                                <button
                                    className={`px-4 py-1.5 md:py-2 rounded-full transition ${mode === "jour"
                                            ? "bg-white shadow-sm text-slate-900"
                                            : "text-slate-500 hover:text-slate-700"
                                        }`}
                                    onClick={() => setMode("jour")}
                                >
                                    Jour
                                </button>
                                <button
                                    className={`px-4 py-1.5 md:py-2 rounded-full transition ${mode === "semaine"
                                            ? "bg-white shadow-sm text-slate-900"
                                            : "text-slate-500 hover:text-slate-700"
                                        }`}
                                    onClick={() => setMode("semaine")}
                                >
                                    Semaine
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <button
                                className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2.5 text-xs sm:text-sm md:text-base font-medium text-slate-800 shadow-sm hover:bg-slate-50"
                                onClick={() => router.push("/week")}
                            >
                                ← Ma semaine
                            </button>
                            <button
                                onClick={handlePrint}
                                className="inline-flex items-center gap-2 rounded-full bg-sky-700 px-4 py-2.5 text-xs sm:text-sm md:text-base font-medium text-white shadow-sm hover:bg-sky-800 active:scale-[0.99] transition"
                            >
                                🖨️ Export PDF (paysage)
                            </button>
                            <button
                                className="inline-flex items-center gap-2 rounded-full border border-rose-300 bg-rose-50 px-4 py-2.5 text-xs sm:text-sm md:text-base font-medium text-rose-700 hover:bg-rose-100"
                                onClick={async () => {
                                    await signOut(auth);
                                    router.replace("/login");
                                }}
                            >
                                Se déconnecter
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {err && (
                <div className="no-print text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                    {err}
                </div>
            )}

            {/* CONTENU PRINCIPAL */}
            <section className="bg-white border border-slate-200 rounded-2xl shadow-sm px-3 py-4 md:px-5 md:py-6 print:p-2">
                {loading ? (
                    <div className="text-sm text-slate-500">Chargement…</div>
                ) : !hasData ? (
                    <div className="text-sm text-slate-500">
                        Aucune activité enregistrée pour cette période.
                    </div>
                ) : (
                    <div className="space-y-6 md:space-y-7">
                        {datesToRender.map((dateStr) => {
                            const dayData = grouped[dateStr];
                            if (!dayData) return null;

                            const d = new Date(dateStr + "T00:00:00");
                            const labelJour = `${JOURS_FR[d.getDay()]} — ${dateStr}`;

                            return (
                                <article
                                    key={dateStr}
                                    className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3 md:p-4 print:border-none print:bg-white"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-600 text-white text-sm font-semibold">
                                            {d.getDate()}
                                        </div>
                                        <div className="flex flex-col">
                                            <h2 className="font-semibold text-sm sm:text-base text-slate-900">
                                                {labelJour}
                                            </h2>
                                            <span className="text-[11px] text-slate-500">
                                                Résumé des équipes par activité et période
                                            </span>
                                        </div>
                                    </div>

                                    {PERIODES.map((p) => {
                                        const perData = dayData[p.key];
                                        if (!perData || !Object.keys(perData).length) return null;

                                        return (
                                            <div key={p.key} className="space-y-2 mt-1">
                                                <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-sky-800 border border-sky-100">
                                                    <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
                                                    {p.label}
                                                </div>
                                                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                                                    {Object.entries(perData).map(
                                                        ([activite, residents]) => (
                                                            <div
                                                                key={activite}
                                                                className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-xs sm:text-sm shadow-[0_1px_3px_rgba(15,23,42,0.08)]"
                                                            >
                                                                <div className="font-semibold text-slate-900 mb-1.5">
                                                                    {activite}
                                                                </div>
                                                                <div className="flex flex-wrap gap-1.5 text-[11px] sm:text-xs text-slate-700">
                                                                    {(residents as string[]).map((name) => (
                                                                        <span
                                                                            key={name}
                                                                            className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5"
                                                                        >
                                                                            {name}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </article>
                            );
                        })}
                    </div>
                )}
            </section>
        </div>
    );
}

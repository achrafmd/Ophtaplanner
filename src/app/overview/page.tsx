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
import { addDays, formatISO, startOfWeek } from "date-fns";

type Entry = {
    userId: string;
    date: string; // "YYYY-MM-DD"
    jour: string;
    periode: string; // "Matin" | "Apres-midi" | "Matin & Apres-midi"
    activite: string;
};

type PeriodeKey = "Matin" | "Apres-midi" | "Matin & Apres-midi";

type Grouped =
    | {
        [date: string]: {
            [periode in PeriodeKey]?: {
                [activite: string]: string[]; // liste des résidents
            };
        };
    }

const PERIODES: { key: PeriodeKey; label: string }[] = [
    { key: "Matin", label: "Matin" },
    { key: "Apres-midi", label: "Après-midi" },
    { key: "Matin & Apres-midi", label: "Matin & Après-midi" },
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
    const [err, setErr] = useState<string>("");

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

    // --- Récupérer profil + liste des résidents ---
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

    // --- Dates de la semaine sélectionnée ---
    const weekDays = useMemo(() => {
        const ref = new Date(selectedDate);
        const monday = startOfWeek(ref, { weekStartsOn: 1 });
        return Array.from({ length: 6 }, (_, i) => addDays(monday, i));
    }, [selectedDate]);

    // --- Charger les entrées groupées ---
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

                const qRef = query(entriesRef, ...constraints, orderBy("date", "asc"));
                const snap = await getDocs(qRef);

                const res: Grouped = {};
                snap.forEach((docSnap) => {
                    const d = docSnap.data() as any as Entry;
                    const dateKey = d.date;

                    if (!res[dateKey]) {
                        res[dateKey] = {} as any;
                    }
                    const periodeKey = d.periode as PeriodeKey;

                    if (!res[dateKey][periodeKey]) {
                        res[dateKey][periodeKey] = {};
                    }
                    const perGroup = res[dateKey][periodeKey]!;

                    if (!perGroup[d.activite]) perGroup[d.activite] = [];
                    const fullName = profiles[d.userId] || d.userId;
                    if (!perGroup[d.activite].includes(fullName)) {
                        perGroup[d.activite].push(fullName);
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

    return (
        <div className="space-y-4">
            {/* HEADER */}
            <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between no-print">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">
                        Vue générale
                    </h1>
                    <p className="text-sm text-slate-500">
                        {isAdmin
                            ? "Activités de tous les résidents"
                            : "Récapitulatif de vos activités"}
                    </p>
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
                    {isAdmin && (
                        <div className="text-xs text-slate-500">Mode administrateur</div>
                    )}
                </div>
            </header>

            {/* BARRE DE CONTROLES */}
            <section className="bg-white border rounded-2xl shadow-sm p-4 space-y-3 no-print">
                <div className="grid gap-3 md:grid-cols-2 md:items-end">
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-slate-600">
                            Date de référence
                        </label>
                        <input
                            type="date"
                            className="w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/60"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                        />
                        <p className="text-[11px] text-slate-500">
                            En mode &quot;Semaine&quot;, la semaine va du lundi au samedi
                            autour de cette date.
                        </p>
                    </div>

                    <div className="flex flex-col gap-3 items-start md:items-end">
                        <div>
                            <span className="block text-xs font-medium text-slate-600 mb-1">
                                Mode d&apos;affichage
                            </span>
                            <div className="inline-flex rounded-full bg-slate-100 p-1 text-xs">
                                <button
                                    className={`px-3 py-1 rounded-full ${mode === "jour"
                                            ? "bg-white shadow-sm text-slate-900"
                                            : "text-slate-500"
                                        }`}
                                    onClick={() => setMode("jour")}
                                >
                                    Jour
                                </button>
                                <button
                                    className={`px-3 py-1 rounded-full ${mode === "semaine"
                                            ? "bg-white shadow-sm text-slate-900"
                                            : "text-slate-500"
                                        }`}
                                    onClick={() => setMode("semaine")}
                                >
                                    Semaine
                                </button>
                            </div>
                        </div>

                        <button
                            onClick={handlePrint}
                            className="rounded-full border px-4 py-2 text-xs sm:text-sm font-medium bg-slate-900 text-white hover:bg-slate-800"
                        >
                            Exporter en PDF (paysage)
                        </button>
                    </div>
                </div>
            </section>

            {err && (
                <div className="no-print text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                    {err}
                </div>
            )}

            {/* CONTENU PRINCIPAL */}
            <section className="bg-white border rounded-2xl shadow-sm p-4 print:p-2">
                {loading ? (
                    <div className="text-sm text-slate-500">Chargement…</div>
                ) : !hasData ? (
                    <div className="text-sm text-slate-500">
                        Aucune activité enregistrée pour cette période.
                    </div>
                ) : (
                    <div className="space-y-6">
                        {datesToRender.map((dateStr) => {
                            const dayData = grouped[dateStr];
                            if (!dayData) return null;

                            const d = new Date(dateStr + "T00:00:00");
                            const labelJour = `${JOURS_FR[d.getDay()]} — ${dateStr}`;

                            return (
                                <article key={dateStr} className="space-y-3">
                                    <h2 className="font-semibold text-sm sm:text-base border-b pb-1">
                                        {labelJour}
                                    </h2>

                                    {PERIODES.map((p) => {
                                        const perData = (dayData as any)[p.key];
                                        if (!perData || !Object.keys(perData).length) return null;

                                        return (
                                            <div key={p.key} className="space-y-1">
                                                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                    {p.label}
                                                </div>
                                                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                                                    {Object.entries(perData).map(
                                                        ([activite, residents]) => (
                                                            <div
                                                                key={activite}
                                                                className="rounded-xl border bg-slate-50 px-3 py-2 text-xs sm:text-sm"
                                                            >
                                                                <div className="font-medium text-slate-900">
                                                                    {activite}
                                                                </div>
                                                                <div className="mt-1 text-[11px] sm:text-xs text-slate-700 space-y-0.5">
                                                                    {(residents as string[]).map((name) => (
                                                                        <div key={name}>• {name}</div>
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

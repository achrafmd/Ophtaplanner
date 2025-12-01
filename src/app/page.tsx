"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../lib/firebase";

export default function HomePage() {
    const router = useRouter();

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (user) => {
            if (user) router.replace("/week");
            else router.replace("/login");
        });
        return () => unsub();
    }, [router]);

    return (
        <div className="py-10">
            <p>Chargement…</p>
        </div>
    );
}

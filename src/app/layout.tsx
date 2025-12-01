import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "OphtaPlanner",
    description: "Planning des residents",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="fr">
            <head>
                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1, viewport-fit=cover"
                />
            </head>
            <body className="bg-slate-50 text-slate-900">
                <div className="max-w-3xl mx-auto px-4">{children}</div>
            </body>
        </html>
    );
}

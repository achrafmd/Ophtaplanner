// src/lib/categories.ts

// Toutes les clés de catégories possibles
export type CategoryKey =
  | "consultations"
  | "bloc"
  | "service"
  | "garde"
  | "exploration";

// Meta pour l'affichage (label, description, couleur)
export const CATEGORY_META: Record<
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

// Cartes utilisées sur la page /day/[date]
export const CATEGORIES: {
  key: CategoryKey;
  label: string;
  description: string;
  accent: string;
}[] = [
  {
    key: "consultations",
    label: CATEGORY_META.consultations.label,
    description: CATEGORY_META.consultations.description,
    accent: CATEGORY_META.consultations.accent,
  },
  {
    key: "bloc",
    label: CATEGORY_META.bloc.label,
    description: CATEGORY_META.bloc.description,
    accent: CATEGORY_META.bloc.accent,
  },
  {
    key: "service",
    label: CATEGORY_META.service.label,
    description: CATEGORY_META.service.description,
    accent: CATEGORY_META.service.accent,
  },
  {
    key: "garde",
    label: CATEGORY_META.garde.label,
    description: CATEGORY_META.garde.description,
    accent: CATEGORY_META.garde.accent,
  },
  {
    key: "exploration",
    label: CATEGORY_META.exploration.label,
    description: CATEGORY_META.exploration.description,
    accent: CATEGORY_META.exploration.accent,
  },
];

// 🔥 Répartition des activités par catégorie (d'après ta liste)
export const CATEGORY_ACTIVITIES: Record<CategoryKey, string[]> = {
  consultations: [
    "CS infectieuse",
    "CS Pr Hidan",
    "CS Pr Rachid",
    "CS Pr Hammouch",
    "CS Pr Benhmidoune",
    "CS Pr Bentouhami",
    "CS Pr Mchachi",
    "CS Cornée",
    "CS Réfraction",
    "CS rétinopathie diabétique",
    "Strabologie",
    "Glaucome",
    "Uvéite",
    "Nouveaux malades",
    "CRM",
    "Annexes",
  ],
  bloc: [
    "Équipe 2ème salle",
    "Équipe 3ème salle",
    "Petite chirurgie",
    "Équipe HDJ",
  ],
  service: [
    "Équipe visite",
    "Équipe entrant",
    "Équipe contre visite",
    "Cours des externes",
    "Centralisation",
    "Équipe dossier",
  ],
  garde: ["Équipe de garde", "Équipe de garde du weekend"],
  exploration: [
    "Champs visuels (CV)",
    "OCT",
    "Topographie",
    "Laser",
    "Interprétation",
    "Angiographie",
  ],
};

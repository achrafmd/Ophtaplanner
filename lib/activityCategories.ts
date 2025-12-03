// lib/activityCategories.ts

export type CategoryKey = "consultations" | "bloc" | "service" | "garde";

// À compléter / ajuster selon ton organisation.
// Les clés DOIVENT être exactement les mêmes que dans PLANNING.
export const ACTIVITY_CATEGORY: Record<string, CategoryKey> = {
  // ===== SERVICE =====
  "Équipe visite": "service",
  "Équipe HDJ": "service",
  "Annexes": "service",
  "Nouveaux malades": "service",
  "Équipe contre visite": "service",

  // ===== BLOC =====
  "Petite chirurgie": "bloc",
  "Équipe 2ème salle": "bloc",
  "Équipe 3ème salle": "bloc",

  // ===== CONSULTATIONS =====
  "CS infectieuse": "consultations",
  "CS Pr Hidan": "consultations",
  "CS Pr Rachid": "consultations",
  "CS Pr Hammouch": "consultations",
  "CS Pr Benhmidoune": "consultations",
  "CS Pr Bentouhami": "consultations",
  "CS Pr Mchachi": "consultations",
  "CS Réfraction": "consultations",
  "CS Cornée": "consultations",
  "CS rétinopathie diabétique": "consultations",

  // ===== GARDE =====
  "Équipe de garde": "garde",
  "Équipe de garde du weekend": "garde",
};

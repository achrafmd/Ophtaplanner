// src/lib/activityCategories.ts

export type CategoryKey =
  | "consultations"
  | "bloc"
  | "service"
  | "garde"
  | "exploration";

// Les clés DOIVENT être exactement les mêmes que dans PLANNING.ts
// et dans ton lib/planning actuel.
export const ACTIVITY_CATEGORY: Record<string, CategoryKey> = {
  // ==== CONSULTATIONS ====
  "CS infectieuse": "consultations",
  "CS Pr Hidan": "consultations",
  "CS Pr Rachid": "consultations",
  "CS Pr Hammouch": "consultations",
  "CS Pr Benhmidoune": "consultations",
  "CS Pr Bentouhami": "consultations",
  "CS Pr Mchachi": "consultations",
  "CS Cornée": "consultations",
  "CS Réfraction": "consultations",
  "CS rétinopathie diabétique": "consultations",
  Strabologie: "consultations",
  Glaucome: "consultations",
  "Uvéite": "consultations",
  "Nouveaux malades": "consultations",
  CRM: "consultations",
  Annexes: "consultations",

  // ==== BLOC OPÉRATOIRE ====
  "Équipe 2ème salle": "bloc",
  "Équipe 3ème salle": "bloc",
  "Petite chirurgie": "bloc",
  "Équipe HDJ": "bloc",

  // ==== SERVICE ====
  "Équipe visite": "service",
  "Équipe entrant": "service",
  "Équipe contre visite": "service",
  "Cours des externes": "service",
  Centralisation: "service",
  "Équipe dossier": "service",

  // ==== GARDE ====
  "Équipe de garde": "garde",
  "Équipe de garde du weekend": "garde",

  // ==== EXPLORATION ====
  "Champs visuels (CV)": "exploration",
  OCT: "exploration",
  Topographie: "exploration",
  Laser: "exploration",
  Angiographie: "exploration",
  Interprétation: "exploration",
};

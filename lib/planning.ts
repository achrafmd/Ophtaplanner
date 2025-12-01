// lib/planning.ts
export const PLANNING: Record<string, Record<string, string[]>> = {
    "Lundi": {
        "Matin": [
            "Équipe visite", "Équipe HDJ", "Équipe 2ème salle",
            "Équipe 3ème salle", "Petite chirurgie",
            "Équipe entrant", "Nouveaux malades"
        ],
        "Après-midi": ["Équipe contre visite", "CRM", "Annexes"],
        "Matin & Après-midi": ["Équipe de garde"]
    },
    "Mardi": {
        "Matin": [
            "Équipe visite", "CS infectieuse", "CS Pr Hidan",
            "CS Pr Rachid", "CS Pr Hammouch", "Angiographie",
            "Champs visuels (CV)", "OCT", "Topographie", "Laser",
            "Cours des externes", "Strabologie",
            "Centralisation", "Équipe dossier", "Interprétation"
        ],
        "Matin & Après-midi": ["Équipe de garde"]
    },
    "Mercredi": {
        "Matin": [
            "Équipe visite", "Équipe 3ème salle", "Équipe HDJ",
            "Équipe 2ème salle", "Petite chirurgie"
        ],
        "Après-midi": ["Équipe contre visite", "Glaucome", "Uvéite"],
        "Matin & Après-midi": ["Équipe de garde"]
    },
    "Jeudi": {
        "Matin": [
            "Équipe visite", "Cours des externes", "CS Pr Benhmidoune",
            "CS Pr Bentouhami", "CS Pr Mchachi", "Équipe dossier",
            "Laser", "OCT", "Angiographie", "Topographie",
            "Champs visuels (CV)", "Interprétation",
            "Nouveaux malades", "Strabologie", "CS rétinopathie diabétique"
        ],
        "Après-midi": ["Équipe contre visite", "CS Cornée", "CS Réfraction"],
        "Matin & Après-midi": ["Équipe de garde"]
    },
    "Vendredi": {
        "Matin": [
            "Équipe visite", "Équipe 3ème salle", "Équipe 2ème salle",
            "Équipe HDJ", "Petite chirurgie", "Équipe dossier",
            "OCT", "Laser", "Angiographie",
            "Champs visuels (CV)", "Topographie", "Interprétation"
        ],
        "Après-midi": ["Équipe contre visite", "CS Réfraction"],
        "Matin & Après-midi": ["Équipe de garde"]
    },
    "Samedi": {
        "Matin": ["Équipe visite"],
        "Matin & Après-midi": ["Équipe de garde du weekend"]
    }
};

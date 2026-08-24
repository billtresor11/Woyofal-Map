import type {
  ApplianceAttribute,
  ApplianceCategory,
  ApplianceTemplate,
  UsageProfile,
} from './types.js';

/**
 * ---------------------------------------------------------------------------
 * CATALOGUE VISUEL DES APPAREILS
 * ---------------------------------------------------------------------------
 * Source de verite unique, partagée par le front (affichage instantané, hors
 * ligne) et l'API (recalcul et validation cote serveur). Le seed la recopie en
 * base pour qu'elle reste extensible sans redéploiement.
 *
 * Les puissances sont des moyennes de marche pour des appareils courants au
 * Senegal. Elles servent d'ESTIMATION : l'objectif est de donner un ordre de
 * grandeur juste et actionnable, pas une mesure de laboratoire.
 */

export const CATEGORIES: ApplianceCategory[] = [
  { id: 'froid', label: 'Froid', emoji: '🧊', color: '#0EA5E9' },
  { id: 'confort', label: 'Confort & air', emoji: '💨', color: '#22C55E' },
  { id: 'salon', label: 'Salon & loisirs', emoji: '📺', color: '#8B5CF6' },
  { id: 'cuisine', label: 'Cuisine', emoji: '🍲', color: '#F97316' },
  { id: 'buanderie', label: 'Linge & ménage', emoji: '🧺', color: '#14B8A6' },
  { id: 'numerique', label: 'Numérique', emoji: '💻', color: '#3B82F6' },
  { id: 'eclairage', label: 'Éclairage', emoji: '💡', color: '#EAB308' },
  { id: 'eau', label: 'Eau', emoji: '🚿', color: '#06B6D4' },
  { id: 'divers', label: 'Autre', emoji: '➕', color: '#64748B' },
];

// --- Fabriques d'attributs et de profils reutilisables -----------------------

function profile(
  id: string,
  label: string,
  emoji: string,
  hoursPerDay: number,
  daysPerWeek: number,
  hint?: string,
): UsageProfile {
  return { id, label, emoji, hoursPerDay, daysPerWeek, hint };
}

/** État / âge de l’appareil : le facteur le plus sous-estimé par les foyers. */
const AGE_ATTRIBUTE: ApplianceAttribute = {
  key: 'etat',
  label: 'Âge',
  question: "Il a quel âge, à peu près ?",
  emoji: '⏳',
  defaultOptionId: 'moyen',
  options: [
    { id: 'neuf', label: 'Récent', hint: 'Moins de 3 ans', emoji: '✨', factor: 0.8 },
    { id: 'moyen', label: 'Quelques années', hint: 'Entre 3 et 10 ans', emoji: '👍', factor: 1 },
    { id: 'vieux', label: 'Ancien', hint: 'Plus de 10 ans, ou d’occasion', emoji: '🕰️', factor: 1.35 },
  ],
};

const EVENING_PROFILES: UsageProfile[] = [
  profile('rare', 'Rarement', '🕸️', 1, 2, 'Une heure, deux fois par semaine'),
  profile('leger', 'De temps en temps', '🌤️', 2, 5, 'Environ 2h, quelques jours'),
  profile('soir', 'Tous les soirs', '🌙', 5, 7, 'La soirée en famille'),
  profile('apres_midi', 'Après-midi et soirée', '🌇', 8, 7),
  profile('journee', 'Une bonne partie de la journée', '☀️', 12, 7),
  profile('permanent', 'Presque tout le temps', '🔁', 16, 7),
  profile('jamais_eteint', 'Jamais éteint', '♾️', 24, 7),
];

// --- Catalogue ---------------------------------------------------------------

export const APPLIANCE_TEMPLATES: ApplianceTemplate[] = [
  // ------------------------------------------------------------------ FROID
  {
    id: 'refrigerateur',
    name: 'Réfrigérateur',
    category: 'froid',
    emoji: '🧊',
    keywords: ['frigo', 'frigidaire', 'refrigerateur'],
    alwaysOn: true,
    basePowerWatts: 120,
    dutyCycle: 0.3,
    allowQuantity: true,
    attributes: [
      {
        key: 'taille',
        label: 'Taille',
        question: 'Il est de quelle taille ?',
        emoji: '📏',
        defaultOptionId: 'moyen',
        options: [
          { id: 'mini', label: 'Mini-bar', hint: 'Environ 90 litres', emoji: '🥤', watts: 70 },
          { id: 'petit', label: 'Petit', hint: 'Environ 150 litres', emoji: '🧃', watts: 95 },
          { id: 'moyen', label: 'Moyen', hint: 'Environ 200 à 250 litres', emoji: '🧊', watts: 125 },
          { id: 'grand', label: 'Grand', hint: 'Environ 350 litres, 2 portes', emoji: '🚪', watts: 165 },
          { id: 'americain', label: 'Très grand', hint: 'Type américain, 500 litres et plus', emoji: '🏔️', watts: 230 },
        ],
      },
      AGE_ATTRIBUTE,
      {
        key: 'emplacement',
        label: 'Emplacement',
        question: 'Il est posé où ?',
        emoji: '📍',
        defaultOptionId: 'normal',
        options: [
          { id: 'frais', label: 'Pièce fraîche', hint: 'Salon climatisé', emoji: '❄️', factor: 0.88 },
          { id: 'normal', label: 'Pièce normale', emoji: '🏠', factor: 1 },
          { id: 'chaud', label: 'Cuisine très chaude', hint: 'Ou plein soleil', emoji: '🔥', factor: 1.2 },
        ],
      },
    ],
    tips: [
      'Laissez 10 cm entre le mur et l’arrière du frigo : il respire mieux et consomme moins.',
      'Un joint de porte abîmé peut ajouter plusieurs milliers de FCFA par mois.',
    ],
  },
  {
    id: 'congelateur',
    name: 'Congélateur',
    category: 'froid',
    emoji: '❄️',
    keywords: ['congelateur', 'freezer', 'bahut'],
    alwaysOn: true,
    basePowerWatts: 150,
    dutyCycle: 0.35,
    allowQuantity: true,
    attributes: [
      {
        key: 'taille',
        label: 'Taille',
        question: 'Il est de quelle taille ?',
        emoji: '📏',
        defaultOptionId: 'moyen',
        options: [
          { id: 'petit', label: 'Petit coffre', hint: 'Environ 100 litres', emoji: '📦', watts: 110 },
          { id: 'moyen', label: 'Coffre moyen', hint: 'Environ 200 litres', emoji: '🧊', watts: 150 },
          { id: 'grand', label: 'Grand coffre', hint: 'Environ 300 litres et plus', emoji: '🏔️', watts: 200 },
        ],
      },
      AGE_ATTRIBUTE,
    ],
    tips: ['Un congélateur plein consomme moins qu’un congélateur à moitié vide.'],
  },

  // ---------------------------------------------------------------- CONFORT
  {
    id: 'climatiseur',
    name: 'Climatiseur',
    category: 'confort',
    emoji: '🌬️',
    keywords: ['clim', 'climatiseur', 'split', 'ac'],
    alwaysOn: false,
    basePowerWatts: 1300,
    dutyCycle: 0.7,
    allowQuantity: true,
    defaultUsageProfileId: 'nuit',
    attributes: [
      {
        key: 'puissance',
        label: 'Taille',
        question: 'C est quel modèle ?',
        emoji: '📏',
        defaultOptionId: 'cv1_5',
        options: [
          { id: 'cv1', label: '1 CV', hint: 'Pour une petite chambre', emoji: '🛏️', watts: 900 },
          { id: 'cv1_5', label: '1,5 CV', hint: 'Le plus courant', emoji: '🏠', watts: 1300 },
          { id: 'cv2', label: '2 CV', hint: 'Grand salon', emoji: '🛋️', watts: 1800 },
          { id: 'cv3', label: '3 CV et plus', hint: 'Très grande pièce', emoji: '🏢', watts: 2600 },
        ],
      },
      {
        key: 'techno',
        label: 'Technologie',
        question: 'Est-ce un modèle "inverter" ?',
        emoji: '⚙️',
        defaultOptionId: 'classique',
        options: [
          { id: 'inverter', label: 'Oui, inverter', hint: 'Marque sur la façade', emoji: '🔄', factor: 0.65 },
          { id: 'classique', label: 'Non / je ne sais pas', emoji: '🤷', factor: 1 },
        ],
      },
      {
        key: 'reglage',
        label: 'Réglage',
        question: 'Vous le réglez à combien ?',
        emoji: '🌡️',
        defaultOptionId: 'moyen',
        options: [
          { id: 'doux', label: '25-26 degrés', hint: 'Le réglage économique', emoji: '🙂', dutyCycle: 0.5 },
          { id: 'moyen', label: '22-24 degrés', emoji: '😌', dutyCycle: 0.7 },
          { id: 'froid', label: '18-20 degrés', hint: 'Très froid, très cher', emoji: '🥶', dutyCycle: 0.92 },
        ],
      },
    ],
    usageProfiles: [
      profile('rare', 'Très rarement', '🍃', 3, 1, 'Les jours de canicule seulement'),
      profile('ponctuel', 'Quelques heures', '⏱️', 3, 4, 'Les jours de forte chaleur'),
      profile('nuit_courte', 'Une partie de la nuit', '🌜', 5, 7, 'On l’éteint au petit matin'),
      profile('nuit', 'Toute la nuit', '🌙', 8, 7, 'De 22h à 6h'),
      profile('nuit_soir', 'Le soir et la nuit', '🌆', 12, 7),
      profile('jour', 'Toute la journée', '☀️', 14, 7, 'Bureau ou personne à la maison'),
      profile('continu', 'Presque en permanence', '🔁', 18, 7),
      profile('permanent', 'Jour et nuit, sans arrêt', '♾️', 24, 7),
    ],
    tips: [
      'Chaque degré gagné sur le thermostat, c’est environ 7% de facture en moins.',
      'Nettoyer les filtres tous les mois peut faire économiser jusqu’à 10%.',
    ],
  },
  {
    id: 'ventilateur',
    name: 'Ventilateur',
    category: 'confort',
    emoji: '💨',
    keywords: ['ventilo', 'ventilateur', 'brasseur'],
    alwaysOn: false,
    basePowerWatts: 55,
    dutyCycle: 1,
    allowQuantity: true,
    defaultUsageProfileId: 'nuit',
    attributes: [
      {
        key: 'type',
        label: 'Type',
        question: 'Quel type de ventilateur ?',
        emoji: '🌀',
        defaultOptionId: 'pied',
        options: [
          { id: 'table', label: 'De table', emoji: '🪑', watts: 40 },
          { id: 'pied', label: 'Sur pied', emoji: '🧍', watts: 60 },
          { id: 'plafond', label: 'Au plafond', emoji: '🔝', watts: 75 },
          { id: 'brasseur', label: 'Gros brasseur d’air', emoji: '🌪️', watts: 110 },
        ],
      },
    ],
    usageProfiles: [
      profile('rare', 'Rarement', '🍃', 2, 2),
      profile('ponctuel', 'De temps en temps', '⏱️', 3, 5),
      profile('soir', 'En soirée', '🌆', 5, 7),
      profile('nuit', 'Toute la nuit', '🌙', 9, 7),
      profile('jour', 'Toute la journée', '☀️', 12, 7),
      profile('jour_nuit', 'Jour et nuit', '🔁', 18, 7),
      profile('permanent', 'Sans jamais l’éteindre', '♾️', 24, 7),
    ],
    tips: ['Un ventilateur coûte environ 20 fois moins cher qu’un climatiseur.'],
  },

  // ------------------------------------------------------------------ SALON
  {
    id: 'televiseur',
    name: 'Téléviseur',
    category: 'salon',
    emoji: '📺',
    keywords: ['tv', 'télévision', 'écran', 'télé'],
    alwaysOn: false,
    basePowerWatts: 80,
    dutyCycle: 1,
    allowQuantity: true,
    defaultUsageProfileId: 'soir',
    attributes: [
      {
        key: 'taille',
        label: 'Taille',
        question: 'Quelle taille d’écran ?',
        emoji: '📏',
        defaultOptionId: 'p43',
        options: [
          { id: 'tube', label: 'Ancienne télé à tube', emoji: '📻', watts: 150 },
          { id: 'p32', label: 'Petite, 32 pouces', emoji: '🖼️', watts: 55 },
          { id: 'p43', label: 'Moyenne, 43 pouces', emoji: '📺', watts: 85 },
          { id: 'p55', label: 'Grande, 55 pouces', emoji: '🎬', watts: 125 },
          { id: 'p65', label: 'Très grande, 65 pouces et plus', emoji: '🍿', watts: 170 },
        ],
      },
    ],
    usageProfiles: EVENING_PROFILES,
    tips: ['Éteindre la télé au lieu de la laisser en veille évite une petite fuite permanente.'],
  },
  {
    id: 'decodeur',
    name: 'Décodeur TV',
    category: 'salon',
    emoji: '📡',
    keywords: ['canal', 'decodeur', 'tnt', 'parabole'],
    alwaysOn: true,
    basePowerWatts: 15,
    dutyCycle: 1,
    allowQuantity: true,
    attributes: [
      {
        key: 'type',
        label: 'Type',
        question: 'Quel type de décodeur ?',
        emoji: '📡',
        defaultOptionId: 'satellite',
        options: [
          { id: 'tnt', label: 'TNT simple', emoji: '📻', watts: 8 },
          { id: 'satellite', label: 'Satellite / bouquet', emoji: '🛰️', watts: 16 },
          { id: 'enregistreur', label: 'Avec enregistreur', emoji: '⏺️', watts: 28 },
        ],
      },
      {
        key: 'veille',
        label: 'Veille',
        question: 'Le débranchez-vous la nuit ?',
        emoji: '🔌',
        defaultOptionId: 'jamais',
        options: [
          { id: 'jamais', label: 'Non, jamais', hint: 'Il reste allumé 24h/24', emoji: '🔁', factor: 1, alwaysOn: true },
          { id: 'souvent', label: 'Oui, souvent', hint: 'Bonne habitude', emoji: '✅', factor: 0.45 },
        ],
      },
    ],
    tips: ['Un décodeur allumé 24h/24 consomme autant qu’une ampoule qui ne s’éteint jamais.'],
  },
  {
    id: 'console_jeu',
    name: 'Console de jeu',
    category: 'salon',
    emoji: '🎮',
    keywords: ['playstation', 'ps4', 'ps5', 'xbox', 'console', 'jeu'],
    alwaysOn: false,
    basePowerWatts: 160,
    dutyCycle: 1,
    allowQuantity: false,
    defaultUsageProfileId: 'leger',
    attributes: [
      {
        key: 'modele',
        label: 'Modèle',
        question: 'Quelle console ?',
        emoji: '🕹️',
        defaultOptionId: 'ps4',
        options: [
          { id: 'ps3', label: 'PlayStation 3', emoji: '🎮', watts: 130 },
          { id: 'ps4', label: 'PlayStation 4', emoji: '🎮', watts: 150 },
          { id: 'ps5', label: 'PlayStation 5', emoji: '🎮', watts: 210 },
          { id: 'xbox', label: 'Xbox Series', emoji: '🎮', watts: 190 },
          { id: 'switch', label: 'Nintendo Switch', emoji: '🎮', watts: 20 },
        ],
      },
    ],
    usageProfiles: [
      profile('rare', 'De temps en temps', '⏱️', 2, 1),
      profile('leger', 'Le week-end', '📅', 3, 2),
      profile('weekend_long', 'Tout le week-end', '🎉', 8, 2),
      profile('soir', 'Presque tous les soirs', '🌙', 3, 6),
      profile('quotidien', 'Tous les jours', '🎮', 4, 7),
      profile('intense', 'Plusieurs heures par jour', '🔥', 6, 7),
      profile('marathon', 'Une bonne partie de la journée', '🏆', 10, 7),
    ],
    tips: ['Une console laissée en pause toute la nuit consomme presque autant qu’en jeu.'],
  },
  {
    id: 'chaine_hifi',
    name: 'Sono / chaîne hi-fi',
    category: 'salon',
    emoji: '🔊',
    keywords: ['sono', 'baffle', 'enceinte', 'musique', 'hifi'],
    alwaysOn: false,
    basePowerWatts: 90,
    dutyCycle: 1,
    allowQuantity: false,
    defaultUsageProfileId: 'leger',
    attributes: [
      {
        key: 'taille',
        label: 'Puissance',
        question: 'Ça fait quel bruit ?',
        emoji: '🎚️',
        defaultOptionId: 'moyenne',
        options: [
          { id: 'petite', label: 'Petite enceinte', emoji: '🔈', watts: 30 },
          { id: 'moyenne', label: 'Chaîne de salon', emoji: '🔉', watts: 90 },
          { id: 'grosse', label: 'Grosse sono', emoji: '📢', watts: 300 },
        ],
      },
    ],
    usageProfiles: EVENING_PROFILES,
    tips: [],
  },

  // ---------------------------------------------------------------- CUISINE
  {
    id: 'bouilloire',
    name: 'Bouilloire',
    category: 'cuisine',
    emoji: '☕',
    keywords: ['bouilloire', 'the', 'café', 'eau chaude'],
    alwaysOn: false,
    basePowerWatts: 2000,
    dutyCycle: 1,
    allowQuantity: false,
    defaultUsageProfileId: 'matin',
    attributes: [
      {
        key: 'type',
        label: 'Type',
        question: 'Quel modèle ?',
        emoji: '🫖',
        defaultOptionId: 'standard',
        options: [
          { id: 'petite', label: 'Petite, 1 litre', emoji: '🥤', watts: 1500 },
          { id: 'standard', label: 'Standard, 1,7 litre', emoji: '🫖', watts: 2000 },
          { id: 'grande', label: 'Grande / thermos électrique', emoji: '🍵', watts: 2500 },
        ],
      },
    ],
    usageProfiles: [
      profile('rare', 'Quelques fois par semaine', '📅', 0.15, 3, 'Environ 10 minutes'),
      profile('matin', 'Une fois par jour', '🌅', 0.15, 7, 'Environ 10 minutes'),
      profile('deux_fois', 'Matin et soir', '🌗', 0.3, 7, 'Environ 20 minutes'),
      profile('souvent', 'Plusieurs fois par jour', '🔁', 0.5, 7, 'Environ 30 minutes'),
      profile('ataya', 'Toute la journée', '🍵', 1, 7, 'Ataya, thermos...'),
      profile('intense', 'En continu, ou pour du monde', '🍵', 2, 7),
    ],
    tips: ['Ne faites bouillir que la quantité d’eau dont vous avez besoin.'],
  },
  {
    id: 'micro_ondes',
    name: 'Micro-ondes',
    category: 'cuisine',
    emoji: '🍲',
    keywords: ['micro-ondes', 'micro onde', 'réchauffer'],
    alwaysOn: false,
    basePowerWatts: 1200,
    dutyCycle: 1,
    allowQuantity: false,
    defaultUsageProfileId: 'normal',
    attributes: [
      {
        key: 'type',
        label: 'Type',
        question: 'Quel modèle ?',
        emoji: '📏',
        defaultOptionId: 'standard',
        options: [
          { id: 'standard', label: 'Simple', emoji: '🍲', watts: 1100 },
          { id: 'grill', label: 'Avec grill', emoji: '🔥', watts: 1500 },
        ],
      },
    ],
    usageProfiles: [
      profile('tres_rare', 'Presque jamais', '🕸️', 0.1, 1),
      profile('rare', 'De temps en temps', '⏱️', 0.1, 3),
      profile('normal', 'Tous les jours', '🍽️', 0.25, 7, 'Environ 15 minutes'),
      profile('souvent', 'À chaque repas', '🔁', 0.6, 7),
      profile('intense', 'Très souvent', '🔥', 1.2, 7),
    ],
    tips: [],
  },
  {
    id: 'cuiseur_riz',
    name: 'Cuiseur / plaque électrique',
    category: 'cuisine',
    emoji: '🍚',
    keywords: ['cuiseur', 'riz', 'plaque', 'réchaud', 'marmite'],
    alwaysOn: false,
    basePowerWatts: 900,
    dutyCycle: 1,
    allowQuantity: false,
    defaultUsageProfileId: 'quotidien',
    attributes: [
      {
        key: 'type',
        label: 'Type',
        question: 'Quel appareil ?',
        emoji: '🍳',
        defaultOptionId: 'cuiseur',
        options: [
          { id: 'cuiseur', label: 'Cuiseur à riz', emoji: '🍚', watts: 700 },
          { id: 'plaque', label: 'Plaque chauffante', emoji: '🍳', watts: 1500 },
          { id: 'friteuse', label: 'Friteuse / air fryer', emoji: '🍟', watts: 1600 },
          { id: 'four', label: 'Four électrique', emoji: '🥖', watts: 2000 },
        ],
      },
    ],
    usageProfiles: [
      profile('tres_rare', 'Exceptionnellement', '🕸️', 1, 1),
      profile('rare', '1 à 2 fois par semaine', '📅', 1, 2),
      profile('trois', '3 à 4 fois par semaine', '📆', 1, 4),
      profile('quotidien', 'Une fois par jour', '🍽️', 1, 7),
      profile('deux_repas', 'Deux repas par jour', '🍲', 2, 7),
      profile('intense', 'Plusieurs fois par jour', '🔁', 3, 7),
      profile('gargote', 'Toute la journée', '🍳', 6, 7, 'Restauration, tangana...'),
    ],
    tips: ['Cuisiner au gaz reste nettement moins cher que la plaque électrique.'],
  },
  {
    id: 'mixeur',
    name: 'Mixeur / blender',
    category: 'cuisine',
    emoji: '🥤',
    keywords: ['mixeur', 'blender', 'moulinex', 'jus'],
    alwaysOn: false,
    basePowerWatts: 450,
    dutyCycle: 1,
    allowQuantity: false,
    defaultUsageProfileId: 'normal',
    attributes: [
      {
        key: 'type',
        label: 'Type',
        question: 'Quel modèle ?',
        emoji: '🌀',
        defaultOptionId: 'standard',
        options: [
          { id: 'standard', label: 'Blender de cuisine', emoji: '🥤', watts: 400 },
          { id: 'pro', label: 'Gros moulin / broyeur', emoji: '⚙️', watts: 900 },
        ],
      },
    ],
    usageProfiles: [
      profile('tres_rare', 'Presque jamais', '🕸️', 0.05, 1),
      profile('rare', 'Rarement', '⏱️', 0.05, 2),
      profile('normal', 'Quelques fois par semaine', '📅', 0.15, 4),
      profile('souvent', 'Tous les jours', '🔁', 0.25, 7),
      profile('intense', 'Plusieurs fois par jour', '🥤', 0.6, 7),
    ],
    tips: [],
  },

  // -------------------------------------------------------------- BUANDERIE
  {
    id: 'machine_laver',
    name: 'Machine à laver',
    category: 'buanderie',
    emoji: '🧺',
    keywords: ['machine', 'lave-linge', 'laver', 'linge'],
    alwaysOn: false,
    basePowerWatts: 800,
    dutyCycle: 1,
    allowQuantity: false,
    defaultUsageProfileId: 'deux',
    attributes: [
      {
        key: 'programme',
        label: 'Programme',
        question: 'Vous lavez à quelle température ?',
        emoji: '🌡️',
        defaultOptionId: 'froid',
        options: [
          { id: 'froid', label: 'A froid', hint: 'Le plus économique', emoji: '❄️', watts: 400 },
          { id: 'tiede', label: 'Tiede, 40 degrés', emoji: '🌤️', watts: 1100 },
          { id: 'chaud', label: 'Chaud, 60 degrés et plus', emoji: '🔥', watts: 1800 },
        ],
      },
      {
        key: 'sechage',
        label: 'Séchage',
        question: 'Utilisez-vous le sèche-linge ?',
        emoji: '🌀',
        defaultOptionId: 'non',
        options: [
          { id: 'non', label: 'Non, je sèche dehors', emoji: '☀️', factor: 1 },
          { id: 'oui', label: 'Oui, machine à sécher', emoji: '🌀', factor: 2.4 },
        ],
      },
    ],
    usageProfiles: [
      profile('rare', '1 lessive tous les 15 jours', '🗓️', 1.5, 0.5),
      profile('une', '1 lessive par semaine', '📅', 1.5, 1),
      profile('deux', '2 lessives par semaine', '📅', 1.5, 2),
      profile('trois', '3 lessives par semaine', '📆', 1.5, 3),
      profile('quatre', '4 lessives par semaine', '📆', 1.5, 4),
      profile('quotidien', 'Une lessive par jour', '🔁', 1.5, 7),
      profile('intense', 'Deux lessives par jour', '🧺', 3, 7, 'Grande famille'),
    ],
    tips: ['Laver à froid avec une lessive adaptée divise la consommation par trois.'],
  },
  {
    id: 'fer_repasser',
    name: 'Fer à repasser',
    category: 'buanderie',
    emoji: '👔',
    keywords: ['fer', 'repasser', 'repassage'],
    alwaysOn: false,
    basePowerWatts: 1200,
    dutyCycle: 0.75,
    allowQuantity: false,
    defaultUsageProfileId: 'hebdo',
    attributes: [
      {
        key: 'type',
        label: 'Type',
        question: 'Quel type de fer ?',
        emoji: '👔',
        defaultOptionId: 'classique',
        options: [
          { id: 'classique', label: 'Fer classique', emoji: '👔', watts: 1200 },
          { id: 'vapeur', label: 'Centrale vapeur', emoji: '💨', watts: 2000 },
        ],
      },
    ],
    usageProfiles: [
      profile('tres_rare', 'Presque jamais', '🕸️', 0.5, 0.5),
      profile('rare', 'De temps en temps', '⏱️', 0.5, 1),
      profile('hebdo', 'Une séance par semaine', '📅', 1.5, 1),
      profile('deux_seances', 'Deux séances par semaine', '📆', 1.5, 2),
      profile('souvent', 'Plusieurs fois par semaine', '🔁', 1, 4),
      profile('quotidien', 'Tous les matins', '🌅', 0.4, 7),
      profile('intense', 'Beaucoup de linge chaque jour', '👔', 2, 7),
    ],
    tips: ['Repasser tout le linge en une seule séance évite de réchauffer le fer 5 fois.'],
  },
  {
    id: 'aspirateur',
    name: 'Aspirateur',
    category: 'buanderie',
    emoji: '🧹',
    keywords: ['aspirateur', 'ménage'],
    alwaysOn: false,
    basePowerWatts: 900,
    dutyCycle: 1,
    allowQuantity: false,
    defaultUsageProfileId: 'hebdo',
    attributes: [
      {
        key: 'type',
        label: 'Type',
        question: 'Quel type ?',
        emoji: '🧹',
        defaultOptionId: 'standard',
        options: [
          { id: 'balai', label: 'Aspirateur balai', emoji: '🧹', watts: 350 },
          { id: 'standard', label: 'Aspirateur traîneau', emoji: '🛒', watts: 900 },
        ],
      },
    ],
    usageProfiles: [
      profile('rare', 'Une fois par mois', '🗓️', 0.5, 0.25),
      profile('bimensuel', 'Tous les 15 jours', '📆', 0.5, 0.5),
      profile('hebdo', 'Une fois par semaine', '📅', 0.5, 1),
      profile('souvent', 'Plusieurs fois par semaine', '🔁', 0.5, 3),
      profile('quotidien', 'Tous les jours', '🧹', 0.5, 7),
    ],
    tips: [],
  },

  // -------------------------------------------------------------- NUMERIQUE
  {
    id: 'box_internet',
    name: 'Box internet / wifi',
    category: 'numerique',
    emoji: '📶',
    keywords: ['wifi', 'box', 'internet', 'routeur', 'modem'],
    alwaysOn: true,
    basePowerWatts: 12,
    dutyCycle: 1,
    allowQuantity: true,
    attributes: [
      {
        key: 'type',
        label: 'Type',
        question: 'Quel équipement ?',
        emoji: '📶',
        defaultOptionId: 'box',
        options: [
          { id: 'cle', label: 'Cle / petit routeur 4G', emoji: '🔑', watts: 6 },
          { id: 'box', label: 'Box internet', emoji: '📦', watts: 12 },
          { id: 'box_repeteur', label: 'Box + répéteur wifi', emoji: '📡', watts: 20 },
        ],
      },
    ],
    tips: ['Une box branchée toute l’année, c’est environ 100 kWh : de quoi surprendre.'],
  },
  {
    id: 'ordinateur',
    name: 'Ordinateur',
    category: 'numerique',
    emoji: '💻',
    keywords: ['pc', 'ordinateur', 'laptop', 'portable', 'bureau'],
    alwaysOn: false,
    basePowerWatts: 60,
    dutyCycle: 1,
    allowQuantity: true,
    defaultUsageProfileId: 'soir',
    attributes: [
      {
        key: 'type',
        label: 'Type',
        question: 'Quel type d’ordinateur ?',
        emoji: '💻',
        defaultOptionId: 'portable',
        options: [
          { id: 'portable', label: 'Portable', emoji: '💻', watts: 50 },
          { id: 'portable_pro', label: 'Portable puissant / gamer', emoji: '🎮', watts: 110 },
          { id: 'bureau', label: 'Ordinateur de bureau', hint: 'Avec écran', emoji: '🖥️', watts: 180 },
        ],
      },
    ],
    usageProfiles: [
      profile('rare', 'Rarement', '🕸️', 1, 1),
      profile('leger', 'Quelques heures par semaine', '⏱️', 2, 3),
      profile('soir', 'Tous les soirs', '🌙', 4, 7),
      profile('mi_temps', 'Une demi-journée', '🕛', 4, 5),
      profile('travail', 'Journée de travail', '💼', 8, 5),
      profile('travail7', 'Journée de travail, 7 jours sur 7', '🗓️', 8, 7),
      profile('intense', 'Presque en permanence', '🔁', 12, 7),
      profile('permanent', 'Jamais éteint', '♾️', 24, 7, 'Serveur, minage, téléchargement'),
    ],
    tips: [],
  },
  {
    id: 'chargeur_telephone',
    name: 'Téléphones & chargeurs',
    category: 'numerique',
    emoji: '📱',
    keywords: ['téléphone', 'portable', 'chargeur', 'smartphone'],
    alwaysOn: false,
    basePowerWatts: 10,
    dutyCycle: 1,
    allowQuantity: true,
    defaultQuantity: 3,
    defaultUsageProfileId: 'nuit',
    attributes: [],
    usageProfiles: [
      profile('rare', 'Une charge de temps en temps', '🔌', 2, 3),
      profile('court', 'Une charge par jour', '⚡', 2, 7),
      profile('deux_charges', 'Deux charges par jour', '🔋', 4, 7),
      profile('nuit', 'Toute la nuit', '🌙', 8, 7),
      profile('jour_nuit', 'Branché presque tout le temps', '🔁', 14, 7),
    ],
    tips: ['Charger le téléphone coûte quelques centaines de FCFA par an : ce n’est pas la priorité.'],
  },
  {
    id: 'camera_surveillance',
    name: 'Caméra de surveillance',
    category: 'numerique',
    emoji: '📹',
    keywords: ['caméra', 'surveillance', 'sécurité'],
    alwaysOn: true,
    basePowerWatts: 8,
    dutyCycle: 1,
    allowQuantity: true,
    defaultQuantity: 2,
    attributes: [],
    tips: [],
  },

  // -------------------------------------------------------------- ECLAIRAGE
  {
    id: 'ampoules',
    name: 'Ampoules',
    category: 'eclairage',
    emoji: '💡',
    keywords: ['ampoule', 'lampe', 'lumière', 'eclairage', 'néon'],
    alwaysOn: false,
    basePowerWatts: 10,
    dutyCycle: 1,
    allowQuantity: true,
    defaultQuantity: 8,
    defaultUsageProfileId: 'soir',
    attributes: [
      {
        key: 'type',
        label: 'Type',
        question: 'Quel type d’ampoules ?',
        emoji: '💡',
        defaultOptionId: 'led',
        options: [
          { id: 'led', label: 'LED', hint: 'Les modernes, très économiques', emoji: '✨', watts: 9 },
          { id: 'eco', label: 'Basse consommation', hint: 'En spirale', emoji: '🌀', watts: 20 },
          { id: 'neon', label: 'Néon / tube', emoji: '📏', watts: 40 },
          { id: 'filament', label: 'Ancienne à filament', hint: 'Elle chauffe beaucoup', emoji: '🔥', watts: 75 },
        ],
      },
    ],
    usageProfiles: [
      profile('tres_court', 'Juste le temps d’un repas', '🍽️', 1.5, 7),
      profile('court', 'Quelques heures le soir', '🌆', 3, 7),
      profile('soir', 'Du coucher du soleil à minuit', '🌙', 6, 7),
      profile('nuit', 'Toute la nuit', '🌃', 12, 7, 'Éclairage de cour ou de sécurité'),
      profile('jour_nuit', 'Pièce sans fenêtre, allumée en journée', '🕳️', 16, 7),
      profile('permanent', 'Jamais éteinte', '♾️', 24, 7),
    ],
    tips: ['Remplacer 10 ampoules à filament par des LED peut faire économiser 5 000 FCFA par mois.'],
  },

  // --------------------------------------------------------------------- EAU
  {
    id: 'chauffe_eau',
    name: 'Chauffe-eau',
    category: 'eau',
    emoji: '🚿',
    keywords: ['chauffe-eau', 'ballon', 'douche chaude', 'chauffe-eau'],
    alwaysOn: true,
    basePowerWatts: 1500,
    dutyCycle: 0.18,
    allowQuantity: false,
    attributes: [
      {
        key: 'type',
        label: 'Type',
        question: 'Quel type de chauffe-eau ?',
        emoji: '🚿',
        defaultOptionId: 'ballon',
        options: [
          { id: 'ballon', label: 'Ballon (cumulus)', hint: 'Il chauffe et garde l’eau', emoji: '🛢️', watts: 1500, dutyCycle: 0.18 },
          { id: 'instantane', label: 'Chauffe-eau instantané', hint: 'Il chauffe au moment de la douche', emoji: '⚡', watts: 3500, dutyCycle: 0.04 },
        ],
      },
      {
        key: 'foyer',
        label: 'Usage',
        question: 'Vous êtes combien à l’utiliser ?',
        emoji: '🚿',
        defaultOptionId: 'moyen',
        options: [
          { id: 'petit', label: '1 à 2 personnes', factor: 0.7 },
          { id: 'moyen', label: '3 à 4 personnes', factor: 1 },
          { id: 'grand', label: '5 personnes et plus', factor: 1.4 },
        ],
      },
    ],
    tips: ['Un ballon d’eau chaude peut représenter un quart de la facture d’un foyer.'],
  },
  {
    id: 'pompe_eau',
    name: 'Pompe à eau / surpresseur',
    category: 'eau',
    emoji: '⛲',
    keywords: ['pompe', 'surpresseur', 'forage', 'eau'],
    alwaysOn: false,
    basePowerWatts: 750,
    dutyCycle: 1,
    allowQuantity: false,
    defaultUsageProfileId: 'normal',
    attributes: [
      {
        key: 'type',
        label: 'Puissance',
        question: 'Quelle pompe ?',
        emoji: '⚙️',
        defaultOptionId: 'moyenne',
        options: [
          { id: 'petite', label: 'Petit surpresseur', emoji: '💧', watts: 400 },
          { id: 'moyenne', label: 'Pompe standard', emoji: '⛲', watts: 750 },
          { id: 'grande', label: 'Grosse pompe / forage', emoji: '🏗️', watts: 1500 },
        ],
      },
    ],
    usageProfiles: [
      profile('tres_rare', 'Quelques minutes par semaine', '🕸️', 0.3, 1),
      profile('rare', 'Quelques minutes par jour', '⏱️', 0.3, 7),
      profile('normal', 'Environ une heure par jour', '💧', 1, 7),
      profile('deux_heures', 'Deux heures par jour', '🚿', 2, 7),
      profile('souvent', 'Plusieurs heures par jour', '🔁', 4, 7),
      profile('permanent', 'En continu', '♾️', 12, 7, 'Arrosage, château d’eau'),
    ],
    tips: [],
  },

  // ------------------------------------------------------- CUISINE (suite)
  {
    id: 'lave_vaisselle',
    name: 'Lave-vaisselle',
    category: 'cuisine',
    emoji: '🍽️',
    keywords: ['lave-vaisselle', 'vaisselle'],
    alwaysOn: false,
    basePowerWatts: 1200,
    dutyCycle: 1,
    allowQuantity: false,
    defaultUsageProfileId: 'trois',
    attributes: [
      {
        key: 'programme',
        label: 'Programme',
        question: 'Quel programme utilisez-vous ?',
        emoji: '🌡️',
        defaultOptionId: 'eco',
        options: [
          { id: 'eco', label: 'Éco', hint: 'Le plus économique', emoji: '🌿', watts: 800 },
          { id: 'normal', label: 'Normal', emoji: '💧', watts: 1200 },
          { id: 'intensif', label: 'Intensif', hint: 'Vaisselle très sale', emoji: '🔥', watts: 1800 },
        ],
      },
    ],
    usageProfiles: [
      profile('rare', '1 à 2 fois par semaine', '📅', 2, 2),
      profile('trois', '3 fois par semaine', '📆', 2, 3),
      profile('quotidien', 'Une fois par jour', '🔁', 2, 7),
      profile('intense', 'Deux fois par jour', '🍽️', 4, 7),
    ],
    tips: ['Le programme Éco consomme jusqu’à 30% de moins, même s’il dure plus longtemps.'],
  },

  // ---------------------------------------------------- BUANDERIE (suite)
  {
    id: 'seche_cheveux',
    name: 'Sèche-cheveux & soins',
    category: 'buanderie',
    emoji: '✂️',
    keywords: ['sèche-cheveux', 'seche cheveux', 'lisseur', 'tondeuse', 'rasoir', 'coiffure'],
    alwaysOn: false,
    basePowerWatts: 1400,
    dutyCycle: 1,
    allowQuantity: false,
    defaultUsageProfileId: 'hebdo',
    attributes: [
      {
        key: 'type',
        label: 'Type',
        question: 'Quel appareil ?',
        emoji: '✂️',
        defaultOptionId: 'seche',
        options: [
          { id: 'seche', label: 'Sèche-cheveux', emoji: '💨', watts: 1400 },
          { id: 'lisseur', label: 'Lisseur / fer à boucler', emoji: '🌀', watts: 80 },
          { id: 'tondeuse', label: 'Tondeuse / rasoir', emoji: '✂️', watts: 15 },
        ],
      },
    ],
    usageProfiles: [
      profile('rare', 'Une fois par mois', '🗓️', 0.5, 0.25),
      profile('hebdo', 'Une fois par semaine', '📅', 0.5, 1),
      profile('souvent', 'Plusieurs fois par semaine', '🔁', 0.5, 3),
      profile('quotidien', 'Tous les jours', '☀️', 0.4, 7),
    ],
    tips: [],
  },
  {
    id: 'machine_coudre',
    name: 'Machine à coudre',
    category: 'buanderie',
    emoji: '🧵',
    keywords: ['couture', 'coudre', 'tailleur', 'machine'],
    alwaysOn: false,
    basePowerWatts: 100,
    dutyCycle: 0.6,
    allowQuantity: true,
    defaultUsageProfileId: 'loisir',
    attributes: [
      {
        key: 'type',
        label: 'Type',
        question: 'Quelle machine ?',
        emoji: '🧵',
        defaultOptionId: 'familiale',
        options: [
          { id: 'familiale', label: 'Machine familiale', emoji: '🏠', watts: 90 },
          { id: 'pro', label: 'Machine professionnelle', hint: 'Atelier de couture', emoji: '🏭', watts: 350 },
          { id: 'surjeteuse', label: 'Surjeteuse / brodeuse', emoji: '🪡', watts: 200 },
        ],
      },
    ],
    usageProfiles: [
      profile('rare', 'De temps en temps', '⏱️', 1, 1),
      profile('loisir', 'Quelques heures par semaine', '📅', 2, 2),
      profile('regulier', 'Presque tous les jours', '🔁', 3, 5),
      profile('atelier', 'Journée de travail', '🏭', 8, 6, 'Atelier de couture'),
    ],
    tips: [],
  },

  // ----------------------------------------------------- NUMERIQUE (suite)
  {
    id: 'imprimante',
    name: 'Imprimante',
    category: 'numerique',
    emoji: '🖨️',
    keywords: ['imprimante', 'photocopie', 'scanner', 'impression'],
    alwaysOn: false,
    basePowerWatts: 30,
    dutyCycle: 1,
    allowQuantity: true,
    defaultUsageProfileId: 'rare',
    attributes: [
      {
        key: 'type',
        label: 'Type',
        question: 'Quel type d’imprimante ?',
        emoji: '🖨️',
        defaultOptionId: 'jet',
        options: [
          { id: 'jet', label: 'Jet d’encre', emoji: '💧', watts: 25 },
          { id: 'laser', label: 'Laser', hint: 'Elle chauffe pour imprimer', emoji: '🔥', watts: 450 },
          { id: 'photocopieur', label: 'Photocopieur', emoji: '🏢', watts: 900 },
        ],
      },
    ],
    usageProfiles: [
      profile('rare', 'Quelques pages par semaine', '📄', 0.2, 2),
      profile('regulier', 'Un peu chaque jour', '📅', 0.3, 7),
      profile('bureau', 'Toute la journée', '🏢', 4, 6, 'Cybercafé, secrétariat'),
    ],
    tips: ['Une imprimante laisse souvent une veille : la débrancher le soir coûte zéro effort.'],
  },
  {
    id: 'onduleur',
    name: 'Onduleur / batterie de secours',
    category: 'numerique',
    emoji: '🔋',
    keywords: ['onduleur', 'inverter', 'batterie', 'délestage', 'coupure', 'ups'],
    alwaysOn: true,
    basePowerWatts: 300,
    dutyCycle: 0.25,
    allowQuantity: true,
    attributes: [
      {
        key: 'taille',
        label: 'Taille',
        question: 'Il alimente quoi, à peu près ?',
        emoji: '🔋',
        defaultOptionId: 'moyen',
        options: [
          { id: 'petit', label: 'Un ordinateur, la box', emoji: '💻', watts: 150 },
          { id: 'moyen', label: 'La télé et l’éclairage', emoji: '📺', watts: 300 },
          { id: 'grand', label: 'Une bonne partie de la maison', emoji: '🏠', watts: 900 },
        ],
      },
      {
        key: 'coupures',
        label: 'Coupures',
        question: 'Les coupures sont fréquentes chez vous ?',
        emoji: '⚡',
        defaultOptionId: 'parfois',
        options: [
          { id: 'rares', label: 'Rares', hint: 'La batterie reste chargée', emoji: '🙂', dutyCycle: 0.12 },
          { id: 'parfois', label: 'De temps en temps', emoji: '😐', dutyCycle: 0.25 },
          { id: 'souvent', label: 'Très fréquentes', hint: 'Il recharge sans arrêt', emoji: '😣', dutyCycle: 0.45 },
        ],
      },
    ],
    tips: [
      'Un onduleur consomme même quand il ne sert pas : il maintient ses batteries en charge.',
      'Plus les coupures sont fréquentes, plus il recharge — et plus il coûte cher.',
    ],
  },

  // ------------------------------------------------------- CONFORT (suite)
  {
    id: 'anti_moustique',
    name: 'Diffuseur anti-moustique',
    category: 'confort',
    emoji: '🦟',
    keywords: ['moustique', 'diffuseur', 'raquette', 'insecte'],
    alwaysOn: true,
    basePowerWatts: 5,
    dutyCycle: 1,
    allowQuantity: true,
    defaultQuantity: 2,
    attributes: [
      {
        key: 'type',
        label: 'Type',
        question: 'Quel type ?',
        emoji: '🦟',
        defaultOptionId: 'diffuseur',
        options: [
          { id: 'diffuseur', label: 'Diffuseur à recharge', emoji: '💧', watts: 4 },
          { id: 'lampe', label: 'Lampe anti-moustique', emoji: '💡', watts: 12 },
          { id: 'raquette', label: 'Raquette rechargeable', hint: 'Consommation négligeable', emoji: '🏓', watts: 1 },
        ],
      },
    ],
    tips: [],
  },

  // --------------------------------------------------------- SALON (suite)
  {
    id: 'radio',
    name: 'Radio / lecteur',
    category: 'salon',
    emoji: '📻',
    keywords: ['radio', 'poste', 'lecteur', 'cd', 'transistor'],
    alwaysOn: false,
    basePowerWatts: 15,
    dutyCycle: 1,
    allowQuantity: true,
    defaultUsageProfileId: 'journee',
    attributes: [
      {
        key: 'type',
        label: 'Type',
        question: 'Quel appareil ?',
        emoji: '📻',
        defaultOptionId: 'poste',
        options: [
          { id: 'poste', label: 'Poste radio', emoji: '📻', watts: 12 },
          { id: 'lecteur', label: 'Lecteur CD / DVD', emoji: '💿', watts: 25 },
          { id: 'enceinte', label: 'Enceinte Bluetooth', emoji: '🔈', watts: 8 },
        ],
      },
    ],
    usageProfiles: [
      profile('rare', 'De temps en temps', '⏱️', 2, 3),
      profile('soir', 'Le soir', '🌙', 4, 7),
      profile('journee', 'Une bonne partie de la journée', '☀️', 10, 7),
      profile('permanent', 'Du matin au soir', '🔁', 16, 7),
    ],
    tips: [],
  },

  // ------------------------------------------------------------ SUR MESURE
  {
    id: 'autre',
    name: 'Autre appareil',
    category: 'divers',
    emoji: '➕',
    keywords: ['autre', 'divers', 'inconnu', 'personnalisé', 'manquant'],
    alwaysOn: false,
    basePowerWatts: 100,
    dutyCycle: 1,
    allowQuantity: true,
    isCustom: true,
    defaultUsageProfileId: 'soir',
    attributes: [
      {
        key: 'puissance',
        label: 'Puissance',
        question: 'À quel appareil connu ressemble-t-il ?',
        emoji: '⚖️',
        defaultOptionId: 'television',
        options: [
          { id: 'veille', label: 'Un petit boîtier', hint: 'Comme une box internet', emoji: '📦', watts: 12 },
          { id: 'ampoule', label: 'Une ampoule', hint: 'Il ne chauffe pas du tout', emoji: '💡', watts: 25 },
          { id: 'ventilateur', label: 'Un ventilateur', hint: 'Un petit moteur', emoji: '💨', watts: 60 },
          { id: 'television', label: 'Une télévision', hint: 'Un écran, un appareil courant', emoji: '📺', watts: 120 },
          { id: 'ordinateur', label: 'Un ordinateur de bureau', emoji: '🖥️', watts: 250 },
          { id: 'mixeur', label: 'Un mixeur', hint: 'Un moteur qui force', emoji: '🥤', watts: 500 },
          { id: 'aspirateur', label: 'Un aspirateur', emoji: '🧹', watts: 1000 },
          { id: 'fer', label: 'Un fer à repasser', hint: 'Ça chauffe', emoji: '👔', watts: 1500 },
          { id: 'bouilloire', label: 'Une bouilloire', hint: 'Ça chauffe beaucoup', emoji: '☕', watts: 2200 },
          { id: 'climatiseur', label: 'Un climatiseur', hint: 'Le plus gourmand', emoji: '🌬️', watts: 3000 },
        ],
      },
      {
        key: 'permanent',
        label: 'En continu',
        question: 'Reste-t-il branché et allumé en permanence ?',
        emoji: '🔁',
        defaultOptionId: 'non',
        options: [
          { id: 'non', label: 'Non, je l’allume et je l’éteins', emoji: '🎚️', factor: 1 },
          { id: 'oui', label: 'Oui, 24h/24', hint: 'Comme un frigo', emoji: '♾️', alwaysOn: true },
        ],
      },
    ],
    usageProfiles: [
      profile('rare', 'Rarement', '🕸️', 1, 1),
      profile('leger', 'De temps en temps', '⏱️', 2, 3),
      profile('soir', 'Quelques heures chaque jour', '🌙', 3, 7),
      profile('demi_journee', 'Une demi-journée', '🕛', 6, 7),
      profile('journee', 'Toute la journée', '☀️', 12, 7),
      profile('permanent', 'Presque tout le temps', '🔁', 18, 7),
    ],
    tips: [
      'Donnez-lui un nom clair : « Congélateur de la boutique », « Pompe du jardin »...',
      'Si vous connaissez sa puissance exacte en watts, choisissez l’appareil connu le plus proche : l’estimation restera juste.',
    ],
  },
];

// --- Acces ------------------------------------------------------------------

const templateIndex = new Map(APPLIANCE_TEMPLATES.map((t) => [t.id, t]));

export function getTemplate(id: string): ApplianceTemplate {
  const template = templateIndex.get(id);
  if (!template) throw new Error(`Appareil inconnu : ${id}`);
  return template;
}

export function findTemplate(id: string): ApplianceTemplate | undefined {
  return templateIndex.get(id);
}

export function templatesByCategory(categoryId: string): ApplianceTemplate[] {
  return APPLIANCE_TEMPLATES.filter((t) => t.category === categoryId);
}

export function searchTemplates(query: string): ApplianceTemplate[] {
  const q = query
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (!q) return APPLIANCE_TEMPLATES;
  return APPLIANCE_TEMPLATES.filter((t) => {
    const haystack = [t.name, ...t.keywords]
      .join(' ')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    return haystack.includes(q);
  });
}

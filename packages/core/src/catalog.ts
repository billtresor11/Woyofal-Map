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
 * Source de verite unique, partagee par le front (affichage instantane, hors
 * ligne) et l'API (recalcul et validation cote serveur). Le seed la recopie en
 * base pour qu'elle reste extensible sans redeploiement.
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
  { id: 'buanderie', label: 'Linge & menage', emoji: '🧺', color: '#14B8A6' },
  { id: 'numerique', label: 'Numerique', emoji: '💻', color: '#3B82F6' },
  { id: 'eclairage', label: 'Eclairage', emoji: '💡', color: '#EAB308' },
  { id: 'eau', label: 'Eau', emoji: '🚿', color: '#06B6D4' },
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

/** Etat / age de l'appareil : le facteur le plus sous-estime par les foyers. */
const AGE_ATTRIBUTE: ApplianceAttribute = {
  key: 'etat',
  label: 'Age',
  question: "Il a quel age, a peu pres ?",
  emoji: '⏳',
  defaultOptionId: 'moyen',
  options: [
    { id: 'neuf', label: 'Recent', hint: 'Moins de 3 ans', emoji: '✨', factor: 0.8 },
    { id: 'moyen', label: 'Quelques annees', hint: 'Entre 3 et 10 ans', emoji: '👍', factor: 1 },
    { id: 'vieux', label: 'Ancien', hint: 'Plus de 10 ans, ou d occasion', emoji: '🕰️', factor: 1.35 },
  ],
};

const QUANTITY_ATTRIBUTE = (label: string, emoji: string): ApplianceAttribute => ({
  key: 'nombre',
  label: 'Nombre',
  question: `Combien en avez-vous ?`,
  emoji,
  defaultOptionId: 'q1',
  options: [
    { id: 'q1', label: `1 ${label}`, quantity: 1 },
    { id: 'q2', label: `2 ${label}s`, quantity: 2 },
    { id: 'q3', label: `3 ${label}s`, quantity: 3 },
    { id: 'q5', label: `5 ${label}s`, quantity: 5 },
    { id: 'q8', label: `8 ${label}s ou plus`, quantity: 8 },
  ],
});

const EVENING_PROFILES: UsageProfile[] = [
  profile('leger', 'De temps en temps', '🌤️', 2, 5, 'Environ 2h, quelques jours'),
  profile('soir', 'Tous les soirs', '🌙', 5, 7, 'La soiree en famille'),
  profile('journee', 'Une bonne partie de la journee', '☀️', 10, 7),
  profile('permanent', 'Presque tout le temps', '🔁', 16, 7),
];

// --- Catalogue ---------------------------------------------------------------

export const APPLIANCE_TEMPLATES: ApplianceTemplate[] = [
  // ------------------------------------------------------------------ FROID
  {
    id: 'refrigerateur',
    name: 'Refrigerateur',
    category: 'froid',
    emoji: '🧊',
    keywords: ['frigo', 'frigidaire', 'refrigerateur'],
    alwaysOn: true,
    basePowerWatts: 120,
    dutyCycle: 0.4,
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
          { id: 'moyen', label: 'Moyen', hint: 'Environ 200 a 250 litres', emoji: '🧊', watts: 125 },
          { id: 'grand', label: 'Grand', hint: 'Environ 350 litres, 2 portes', emoji: '🚪', watts: 165 },
          { id: 'americain', label: 'Tres grand', hint: 'Type americain, 500 litres et plus', emoji: '🏔️', watts: 230 },
        ],
      },
      AGE_ATTRIBUTE,
      {
        key: 'emplacement',
        label: 'Emplacement',
        question: 'Il est pose ou ?',
        emoji: '📍',
        defaultOptionId: 'normal',
        options: [
          { id: 'frais', label: 'Piece fraiche', hint: 'Salon climatise', emoji: '❄️', factor: 0.88 },
          { id: 'normal', label: 'Piece normale', emoji: '🏠', factor: 1 },
          { id: 'chaud', label: 'Cuisine tres chaude', hint: 'Ou plein soleil', emoji: '🔥', factor: 1.2 },
        ],
      },
    ],
    tips: [
      'Laissez 10 cm entre le mur et l arriere du frigo : il respire mieux et consomme moins.',
      'Un joint de porte abime peut ajouter plusieurs milliers de FCFA par mois.',
    ],
  },
  {
    id: 'congelateur',
    name: 'Congelateur',
    category: 'froid',
    emoji: '❄️',
    keywords: ['congelateur', 'freezer', 'bahut'],
    alwaysOn: true,
    basePowerWatts: 150,
    dutyCycle: 0.45,
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
    tips: ['Un congelateur plein consomme moins qu un congelateur a moitie vide.'],
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
        question: 'C est quel modele ?',
        emoji: '📏',
        defaultOptionId: 'cv1_5',
        options: [
          { id: 'cv1', label: '1 CV', hint: 'Pour une petite chambre', emoji: '🛏️', watts: 900 },
          { id: 'cv1_5', label: '1,5 CV', hint: 'Le plus courant', emoji: '🏠', watts: 1300 },
          { id: 'cv2', label: '2 CV', hint: 'Grand salon', emoji: '🛋️', watts: 1800 },
          { id: 'cv3', label: '3 CV et plus', hint: 'Tres grande piece', emoji: '🏢', watts: 2600 },
        ],
      },
      {
        key: 'techno',
        label: 'Technologie',
        question: 'Est-ce un modele "inverter" ?',
        emoji: '⚙️',
        defaultOptionId: 'classique',
        options: [
          { id: 'inverter', label: 'Oui, inverter', hint: 'Marque sur la façade', emoji: '🔄', factor: 0.65 },
          { id: 'classique', label: 'Non / je ne sais pas', emoji: '🤷', factor: 1 },
        ],
      },
      {
        key: 'reglage',
        label: 'Reglage',
        question: 'Vous le reglez a combien ?',
        emoji: '🌡️',
        defaultOptionId: 'moyen',
        options: [
          { id: 'doux', label: '25-26 degres', hint: 'Le reglage economique', emoji: '🙂', dutyCycle: 0.5 },
          { id: 'moyen', label: '22-24 degres', emoji: '😌', dutyCycle: 0.7 },
          { id: 'froid', label: '18-20 degres', hint: 'Tres froid, tres cher', emoji: '🥶', dutyCycle: 0.92 },
        ],
      },
    ],
    usageProfiles: [
      profile('ponctuel', 'Juste quelques heures', '⏱️', 3, 4, 'Les jours de forte chaleur'),
      profile('nuit', 'Toute la nuit', '🌙', 8, 7, 'De 22h a 6h'),
      profile('nuit_soir', 'Le soir et la nuit', '🌆', 12, 7),
      profile('continu', 'Presque en permanence', '🔁', 18, 7),
    ],
    tips: [
      'Chaque degre gagne sur le thermostat, c est environ 7% de facture en moins.',
      'Nettoyer les filtres tous les mois peut faire economiser jusqu a 10%.',
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
          { id: 'brasseur', label: 'Gros brasseur d air', emoji: '🌪️', watts: 110 },
        ],
      },
      QUANTITY_ATTRIBUTE('ventilateur', '🔢'),
    ],
    usageProfiles: [
      profile('ponctuel', 'De temps en temps', '⏱️', 3, 5),
      profile('nuit', 'Toute la nuit', '🌙', 9, 7),
      profile('jour_nuit', 'Jour et nuit', '🔁', 18, 7),
    ],
    tips: ['Un ventilateur coute environ 20 fois moins cher qu un climatiseur.'],
  },

  // ------------------------------------------------------------------ SALON
  {
    id: 'televiseur',
    name: 'Televiseur',
    category: 'salon',
    emoji: '📺',
    keywords: ['tv', 'television', 'ecran', 'tele'],
    alwaysOn: false,
    basePowerWatts: 80,
    dutyCycle: 1,
    allowQuantity: true,
    defaultUsageProfileId: 'soir',
    attributes: [
      {
        key: 'taille',
        label: 'Taille',
        question: 'Quelle taille d ecran ?',
        emoji: '📏',
        defaultOptionId: 'p43',
        options: [
          { id: 'tube', label: 'Ancienne tele a tube', emoji: '📻', watts: 150 },
          { id: 'p32', label: 'Petite, 32 pouces', emoji: '🖼️', watts: 55 },
          { id: 'p43', label: 'Moyenne, 43 pouces', emoji: '📺', watts: 85 },
          { id: 'p55', label: 'Grande, 55 pouces', emoji: '🎬', watts: 125 },
          { id: 'p65', label: 'Tres grande, 65 pouces et plus', emoji: '🍿', watts: 170 },
        ],
      },
      QUANTITY_ATTRIBUTE('televiseur', '🔢'),
    ],
    usageProfiles: EVENING_PROFILES,
    tips: ['Eteindre la tele au lieu de la laisser en veille evite une petite fuite permanente.'],
  },
  {
    id: 'decodeur',
    name: 'Decodeur TV',
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
        question: 'Quel type de decodeur ?',
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
        question: 'Le debranchez-vous la nuit ?',
        emoji: '🔌',
        defaultOptionId: 'jamais',
        options: [
          { id: 'jamais', label: 'Non, jamais', hint: 'Il reste allume 24h/24', emoji: '🔁', factor: 1, alwaysOn: true },
          { id: 'souvent', label: 'Oui, souvent', hint: 'Bonne habitude', emoji: '✅', factor: 0.45 },
        ],
      },
    ],
    tips: ['Un decodeur allume 24h/24 consomme autant qu une ampoule qui ne s eteint jamais.'],
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
        label: 'Modele',
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
      profile('leger', 'Le week-end', '📅', 3, 2),
      profile('soir', 'Presque tous les soirs', '🌙', 3, 6),
      profile('intense', 'Plusieurs heures par jour', '🔥', 6, 7),
    ],
    tips: ['Une console laissee en pause toute la nuit consomme presque autant qu en jeu.'],
  },
  {
    id: 'chaine_hifi',
    name: 'Sono / chaine hi-fi',
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
        question: 'Ca fait quel bruit ?',
        emoji: '🎚️',
        defaultOptionId: 'moyenne',
        options: [
          { id: 'petite', label: 'Petite enceinte', emoji: '🔈', watts: 30 },
          { id: 'moyenne', label: 'Chaine de salon', emoji: '🔉', watts: 90 },
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
    keywords: ['bouilloire', 'the', 'cafe', 'eau chaude'],
    alwaysOn: false,
    basePowerWatts: 2000,
    dutyCycle: 1,
    allowQuantity: false,
    defaultUsageProfileId: 'matin',
    attributes: [
      {
        key: 'type',
        label: 'Type',
        question: 'Quel modele ?',
        emoji: '🫖',
        defaultOptionId: 'standard',
        options: [
          { id: 'petite', label: 'Petite, 1 litre', emoji: '🥤', watts: 1500 },
          { id: 'standard', label: 'Standard, 1,7 litre', emoji: '🫖', watts: 2000 },
          { id: 'grande', label: 'Grande / thermos electrique', emoji: '🍵', watts: 2500 },
        ],
      },
    ],
    usageProfiles: [
      profile('matin', 'Une fois par jour', '🌅', 0.15, 7, 'Environ 10 minutes'),
      profile('souvent', 'Plusieurs fois par jour', '🔁', 0.4, 7, 'Environ 25 minutes'),
      profile('ataya', 'Toute la journee', '🍵', 1, 7, 'Ataya, thermos...'),
    ],
    tips: ['Ne faites bouillir que la quantite d eau dont vous avez besoin.'],
  },
  {
    id: 'micro_ondes',
    name: 'Micro-ondes',
    category: 'cuisine',
    emoji: '🍲',
    keywords: ['micro-ondes', 'micro onde', 'rechauffer'],
    alwaysOn: false,
    basePowerWatts: 1200,
    dutyCycle: 1,
    allowQuantity: false,
    defaultUsageProfileId: 'normal',
    attributes: [
      {
        key: 'type',
        label: 'Type',
        question: 'Quel modele ?',
        emoji: '📏',
        defaultOptionId: 'standard',
        options: [
          { id: 'standard', label: 'Simple', emoji: '🍲', watts: 1100 },
          { id: 'grill', label: 'Avec grill', emoji: '🔥', watts: 1500 },
        ],
      },
    ],
    usageProfiles: [
      profile('rare', 'De temps en temps', '⏱️', 0.1, 3),
      profile('normal', 'Tous les jours', '🍽️', 0.25, 7, 'Environ 15 minutes'),
      profile('souvent', 'A chaque repas', '🔁', 0.6, 7),
    ],
    tips: [],
  },
  {
    id: 'cuiseur_riz',
    name: 'Cuiseur / plaque electrique',
    category: 'cuisine',
    emoji: '🍚',
    keywords: ['cuiseur', 'riz', 'plaque', 'rechaud', 'marmite'],
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
          { id: 'cuiseur', label: 'Cuiseur a riz', emoji: '🍚', watts: 700 },
          { id: 'plaque', label: 'Plaque chauffante', emoji: '🍳', watts: 1500 },
          { id: 'friteuse', label: 'Friteuse / air fryer', emoji: '🍟', watts: 1600 },
          { id: 'four', label: 'Four electrique', emoji: '🥖', watts: 2000 },
        ],
      },
    ],
    usageProfiles: [
      profile('rare', '1 a 2 fois par semaine', '📅', 1, 2),
      profile('quotidien', 'Une fois par jour', '🍽️', 1, 7),
      profile('intense', 'Plusieurs fois par jour', '🔁', 2.5, 7),
    ],
    tips: ['Cuisiner au gaz reste nettement moins cher que la plaque electrique.'],
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
        question: 'Quel modele ?',
        emoji: '🌀',
        defaultOptionId: 'standard',
        options: [
          { id: 'standard', label: 'Blender de cuisine', emoji: '🥤', watts: 400 },
          { id: 'pro', label: 'Gros moulin / broyeur', emoji: '⚙️', watts: 900 },
        ],
      },
    ],
    usageProfiles: [
      profile('rare', 'Rarement', '⏱️', 0.05, 2),
      profile('normal', 'Quelques fois par semaine', '📅', 0.15, 4),
      profile('souvent', 'Tous les jours', '🔁', 0.25, 7),
    ],
    tips: [],
  },

  // -------------------------------------------------------------- BUANDERIE
  {
    id: 'machine_laver',
    name: 'Machine a laver',
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
        question: 'Vous lavez a quelle temperature ?',
        emoji: '🌡️',
        defaultOptionId: 'froid',
        options: [
          { id: 'froid', label: 'A froid', hint: 'Le plus economique', emoji: '❄️', watts: 400 },
          { id: 'tiede', label: 'Tiede, 40 degres', emoji: '🌤️', watts: 1100 },
          { id: 'chaud', label: 'Chaud, 60 degres et plus', emoji: '🔥', watts: 1800 },
        ],
      },
      {
        key: 'sechage',
        label: 'Sechage',
        question: 'Utilisez-vous le seche-linge ?',
        emoji: '🌀',
        defaultOptionId: 'non',
        options: [
          { id: 'non', label: 'Non, je seche dehors', emoji: '☀️', factor: 1 },
          { id: 'oui', label: 'Oui, machine a secher', emoji: '🌀', factor: 2.4 },
        ],
      },
    ],
    usageProfiles: [
      profile('une', '1 lessive par semaine', '📅', 1.5, 1),
      profile('deux', '2 lessives par semaine', '📅', 1.5, 2),
      profile('quatre', '4 lessives par semaine', '📅', 1.5, 4),
      profile('quotidien', 'Tous les jours', '🔁', 1.5, 7),
    ],
    tips: ['Laver a froid avec une lessive adaptee divise la consommation par trois.'],
  },
  {
    id: 'fer_repasser',
    name: 'Fer a repasser',
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
      profile('rare', 'De temps en temps', '⏱️', 0.5, 1),
      profile('hebdo', 'Une seance par semaine', '📅', 1.5, 1),
      profile('souvent', 'Plusieurs fois par semaine', '🔁', 1, 4),
      profile('quotidien', 'Tous les matins', '🌅', 0.4, 7),
    ],
    tips: ['Repasser tout le linge en une seule seance evite de rechauffer le fer 5 fois.'],
  },
  {
    id: 'aspirateur',
    name: 'Aspirateur',
    category: 'buanderie',
    emoji: '🧹',
    keywords: ['aspirateur', 'menage'],
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
          { id: 'standard', label: 'Aspirateur traineau', emoji: '🛒', watts: 900 },
        ],
      },
    ],
    usageProfiles: [
      profile('hebdo', 'Une fois par semaine', '📅', 0.5, 1),
      profile('souvent', 'Plusieurs fois par semaine', '🔁', 0.5, 3),
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
        question: 'Quel equipement ?',
        emoji: '📶',
        defaultOptionId: 'box',
        options: [
          { id: 'cle', label: 'Cle / petit routeur 4G', emoji: '🔑', watts: 6 },
          { id: 'box', label: 'Box internet', emoji: '📦', watts: 12 },
          { id: 'box_repeteur', label: 'Box + repeteur wifi', emoji: '📡', watts: 20 },
        ],
      },
    ],
    tips: ['Une box branchee toute l annee, c est environ 100 kWh : de quoi surprendre.'],
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
        question: 'Quel type d ordinateur ?',
        emoji: '💻',
        defaultOptionId: 'portable',
        options: [
          { id: 'portable', label: 'Portable', emoji: '💻', watts: 50 },
          { id: 'portable_pro', label: 'Portable puissant / gamer', emoji: '🎮', watts: 110 },
          { id: 'bureau', label: 'Ordinateur de bureau', hint: 'Avec ecran', emoji: '🖥️', watts: 180 },
        ],
      },
      QUANTITY_ATTRIBUTE('ordinateur', '🔢'),
    ],
    usageProfiles: [
      profile('leger', 'Quelques heures par semaine', '⏱️', 2, 3),
      profile('soir', 'Tous les soirs', '🌙', 4, 7),
      profile('travail', 'Journee de travail', '💼', 8, 5),
      profile('intense', 'Presque en permanence', '🔁', 12, 7),
    ],
    tips: [],
  },
  {
    id: 'chargeur_telephone',
    name: 'Telephones & chargeurs',
    category: 'numerique',
    emoji: '📱',
    keywords: ['telephone', 'portable', 'chargeur', 'smartphone'],
    alwaysOn: false,
    basePowerWatts: 10,
    dutyCycle: 1,
    allowQuantity: true,
    defaultUsageProfileId: 'nuit',
    attributes: [QUANTITY_ATTRIBUTE('telephone', '🔢')],
    usageProfiles: [
      profile('court', 'Une charge rapide', '⚡', 2, 7),
      profile('nuit', 'Toute la nuit', '🌙', 8, 7),
    ],
    tips: ['Charger le telephone coute quelques centaines de FCFA par an : ce n est pas la priorite.'],
  },
  {
    id: 'camera_surveillance',
    name: 'Camera de surveillance',
    category: 'numerique',
    emoji: '📹',
    keywords: ['camera', 'surveillance', 'securite'],
    alwaysOn: true,
    basePowerWatts: 8,
    dutyCycle: 1,
    allowQuantity: true,
    attributes: [QUANTITY_ATTRIBUTE('camera', '🔢')],
    tips: [],
  },

  // -------------------------------------------------------------- ECLAIRAGE
  {
    id: 'ampoules',
    name: 'Ampoules',
    category: 'eclairage',
    emoji: '💡',
    keywords: ['ampoule', 'lampe', 'lumiere', 'eclairage', 'neon'],
    alwaysOn: false,
    basePowerWatts: 10,
    dutyCycle: 1,
    allowQuantity: true,
    defaultUsageProfileId: 'soir',
    attributes: [
      {
        key: 'type',
        label: 'Type',
        question: 'Quel type d ampoules ?',
        emoji: '💡',
        defaultOptionId: 'led',
        options: [
          { id: 'led', label: 'LED', hint: 'Les modernes, tres economiques', emoji: '✨', watts: 9 },
          { id: 'eco', label: 'Basse consommation', hint: 'En spirale', emoji: '🌀', watts: 20 },
          { id: 'neon', label: 'Neon / tube', emoji: '📏', watts: 40 },
          { id: 'filament', label: 'Ancienne a filament', hint: 'Elle chauffe beaucoup', emoji: '🔥', watts: 75 },
        ],
      },
      {
        key: 'nombre',
        label: 'Nombre',
        question: 'Combien d ampoules de ce type ?',
        emoji: '🔢',
        defaultOptionId: 'q5',
        options: [
          { id: 'q2', label: '2 ampoules', quantity: 2 },
          { id: 'q5', label: '5 ampoules', quantity: 5 },
          { id: 'q8', label: '8 ampoules', quantity: 8 },
          { id: 'q12', label: '12 ampoules', quantity: 12 },
          { id: 'q20', label: '20 ampoules ou plus', quantity: 20 },
        ],
      },
    ],
    usageProfiles: [
      profile('court', 'Quelques heures le soir', '🌆', 3, 7),
      profile('soir', 'Du coucher du soleil a minuit', '🌙', 6, 7),
      profile('nuit', 'Toute la nuit', '🌃', 12, 7, 'Eclairage de cour ou de securite'),
    ],
    tips: ['Remplacer 10 ampoules a filament par des LED peut faire economiser 5 000 FCFA par mois.'],
  },

  // --------------------------------------------------------------------- EAU
  {
    id: 'chauffe_eau',
    name: 'Chauffe-eau',
    category: 'eau',
    emoji: '🚿',
    keywords: ['chauffe-eau', 'ballon', 'douche chaude', 'chauffe eau'],
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
          { id: 'ballon', label: 'Ballon (cumulus)', hint: 'Il chauffe et garde l eau', emoji: '🛢️', watts: 1500, dutyCycle: 0.18 },
          { id: 'instantane', label: 'Chauffe-eau instantane', hint: 'Il chauffe au moment de la douche', emoji: '⚡', watts: 3500, dutyCycle: 0.04 },
        ],
      },
      {
        key: 'foyer',
        label: 'Usage',
        question: 'Vous etes combien a l utiliser ?',
        emoji: '👥',
        defaultOptionId: 'moyen',
        options: [
          { id: 'petit', label: '1 a 2 personnes', emoji: '👤', factor: 0.7 },
          { id: 'moyen', label: '3 a 4 personnes', emoji: '👨‍👩‍👦', factor: 1 },
          { id: 'grand', label: '5 personnes et plus', emoji: '👨‍👩‍👧‍👦', factor: 1.4 },
        ],
      },
    ],
    tips: ['Un ballon d eau chaude peut representer un quart de la facture d un foyer.'],
  },
  {
    id: 'pompe_eau',
    name: 'Pompe a eau / surpresseur',
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
      profile('rare', 'Rarement', '⏱️', 0.3, 3),
      profile('normal', 'Un peu chaque jour', '💧', 1, 7),
      profile('souvent', 'Plusieurs heures par jour', '🔁', 3, 7),
    ],
    tips: [],
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

import type { ReactNode } from 'react';

/**
 * ---------------------------------------------------------------------------
 * ILLUSTRATIONS DES OPTIONS
 * ---------------------------------------------------------------------------
 * Reconnaître la forme de son ampoule est plus rapide que lire son nom. Chaque
 * choix proposé porte donc un petit dessin au trait.
 *
 * Les formes voisines partagent volontairement le même dessin (un frigo à une
 * porte, qu'il fasse 90 ou 150 litres) : l'illustration situe la famille, le
 * libellé précise la variante. Voir ALIASES en bas de fichier.
 */

const SHAPES: Record<string, ReactNode> = {
  // ------------------------------------------------------------- ÉCLAIRAGE
  led_bulb: (
    <>
      <path d="M22 26a10 10 0 1 1 20 0c0 6-4 8-4 13H26c0-5-4-7-4-13Z" />
      <path d="M26 45h12M28 51h8" />
    </>
  ),
  cfl: (
    <>
      <path d="M24 12c0 6 16 6 16 12s-16 6-16 12 16 6 16 10" />
      <path d="M24 46h16v6H24z" />
    </>
  ),
  tube: (
    <>
      <rect x="8" y="26" width="48" height="12" rx="6" />
      <path d="M14 26v12M50 26v12" />
    </>
  ),
  filament: (
    <>
      <path d="M22 26a10 10 0 1 1 20 0c0 6-4 8-4 13H26c0-5-4-7-4-13Z" />
      <path d="M27 27c2-4 3 4 5 0s3 4 5 0" />
      <path d="M26 45h12M28 51h8" />
    </>
  ),
  spot: (
    <>
      <path d="M16 20h32l-6 16H22z" />
      <path d="M24 44h16" />
      <path d="M32 10v6M18 12l3 4M46 12l-3 4" />
    </>
  ),
  panel: (
    <>
      <rect x="8" y="18" width="48" height="28" rx="4" />
      <path d="M18 28h28M18 36h28" />
    </>
  ),
  floodlight: (
    <>
      <rect x="12" y="16" width="40" height="24" rx="3" />
      <path d="M20 40v8h24v-8" />
      <path d="M22 24h20" />
      <path d="M8 52h48" />
    </>
  ),
  string_light: (
    <>
      <path d="M6 20c10 10 20 10 26 0s16-10 26 0" />
      <path d="M14 25v6M32 25v6M50 25v6" />
      <circle cx="14" cy="35" r="4" />
      <circle cx="32" cy="35" r="4" />
      <circle cx="50" cy="35" r="4" />
    </>
  ),

  // ----------------------------------------------------------------- FROID
  fridge_1door: (
    <>
      <rect x="18" y="7" width="28" height="50" rx="5" />
      <path d="M24 18v10" />
    </>
  ),
  fridge_2door: (
    <>
      <rect x="18" y="7" width="28" height="50" rx="5" />
      <path d="M18 26h28" />
      <path d="M24 16v6M24 32v8" />
    </>
  ),
  fridge_us: (
    <>
      <rect x="12" y="7" width="40" height="50" rx="5" />
      <path d="M32 7v50" />
      <path d="M26 24v10M38 24v10" />
    </>
  ),
  fridge_display: (
    <>
      <rect x="16" y="7" width="32" height="50" rx="4" />
      <rect x="22" y="14" width="20" height="36" rx="2" />
      <path d="M22 26h20M22 38h20" />
    </>
  ),
  freezer_chest: (
    <>
      <path d="M9 24h46v22a5 5 0 0 1-5 5H14a5 5 0 0 1-5-5z" />
      <path d="M7 17h50v7H7z" />
      <path d="M38 20.5h10" />
      <path d="M22 32v12M17 35l5 3 5-3M17 41l5-3 5 3" />
    </>
  ),
  freezer_upright: (
    <>
      <rect x="18" y="7" width="28" height="50" rx="5" />
      <path d="M18 21h28M18 35h28M18 47h28" />
      <path d="M38 14h4" />
    </>
  ),

  // --------------------------------------------------------------- CONFORT
  ac_split: (
    <>
      <rect x="9" y="13" width="46" height="17" rx="5" />
      <path d="M15 24h34" />
      <path d="M20 38c0 5 6 5 6 10M32 38c0 6 7 6 7 12M44 38c0 5 5 5 5 9" />
    </>
  ),
  ac_window: (
    <>
      <rect x="10" y="16" width="44" height="32" rx="4" />
      <path d="M10 30h44" />
      <path d="M18 38h12M36 38h10" />
      <path d="M16 22h32" />
    </>
  ),
  ac_mobile: (
    <>
      <rect x="18" y="8" width="28" height="44" rx="5" />
      <path d="M24 16h16M24 24h16" />
      <circle cx="32" cy="40" r="5" />
      <path d="M22 56h20" />
      <path d="M46 14l10-4" />
    </>
  ),
  ac_cassette: (
    <>
      <rect x="8" y="14" width="48" height="20" rx="3" />
      <path d="M18 24h28" />
      <path d="M14 40c0 6 4 8 4 12M32 40v12M50 40c0 6-4 8-4 12" />
    </>
  ),
  air_cooler: (
    <>
      <rect x="18" y="8" width="28" height="48" rx="6" />
      <circle cx="32" cy="24" r="8" />
      <path d="M24 40h16M24 46h16" />
      <path d="M28 24h.01" />
    </>
  ),
  fan_table: (
    <>
      <circle cx="32" cy="26" r="15" />
      <circle cx="32" cy="26" r="3.5" />
      <path d="M32 22c-2-6 1-9 5-9s4 5 1 7M36 28c6-2 9 1 9 5s-5 4-7 1M28 29c-2 6-5 7-8 4s-1-6 3-6" />
      <path d="M26 50h12l-2-6h-8z" />
    </>
  ),
  fan_stand: (
    <>
      <circle cx="32" cy="20" r="13" />
      <circle cx="32" cy="20" r="3" />
      <path d="M32 17c-2-5 1-8 4-8s3 5 1 6M35 22c5-2 8 1 8 4s-4 4-6 1M29 23c-2 5-4 6-7 3s0-5 3-5" />
      <path d="M32 33v18M24 55h16" />
    </>
  ),
  fan_ceiling: (
    <>
      <path d="M32 8v8" />
      <circle cx="32" cy="20" r="4" />
      <path d="M28 20c-8-3-18-1-18 3s10 5 18 2M36 20c8-3 18-1 18 3s-10 5-18 2" />
      <path d="M32 24c-3 8-1 18 3 18s5-10 2-18" />
    </>
  ),
  fan_tower: (
    <>
      <rect x="22" y="6" width="20" height="46" rx="9" />
      <path d="M28 16v22M36 16v22" />
      <path d="M20 56h24" />
    </>
  ),
  fan_extractor: (
    <>
      <rect x="10" y="10" width="44" height="44" rx="5" />
      <circle cx="32" cy="32" r="12" />
      <path d="M32 24c4 2 4 6 0 8M40 32c-2 4-6 4-8 0M32 40c-4-2-4-6 0-8" />
    </>
  ),

  // ----------------------------------------------------------------- SALON
  tv_crt: (
    <>
      <rect x="8" y="12" width="38" height="34" rx="4" />
      <rect x="46" y="16" width="10" height="26" rx="2" />
      <path d="M16 52h24" />
      <path d="M50 22h.01M50 30h.01" />
    </>
  ),
  tv_flat: (
    <>
      <rect x="6" y="11" width="52" height="33" rx="3" />
      <path d="M26 51h12M32 44v7" />
      <path d="M22 55h20" />
    </>
  ),
  projector: (
    <>
      <rect x="10" y="20" width="34" height="24" rx="4" />
      <circle cx="22" cy="32" r="6" />
      <path d="M44 26l12-6v24l-12-6z" />
      <path d="M16 44v6M38 44v6" />
    </>
  ),
  decoder: (
    <>
      <rect x="9" y="26" width="46" height="16" rx="4" />
      <circle cx="47" cy="34" r="2.5" />
      <path d="M17 34h18" />
    </>
  ),
  dish: (
    <>
      <path d="M12 44a22 22 0 0 1 30-30z" />
      <path d="M30 30l12 12" />
      <path d="M42 42l6 6" />
      <circle cx="26" cy="20" r="3" />
    </>
  ),
  android_box: (
    <>
      <rect x="14" y="22" width="36" height="22" rx="5" />
      <circle cx="24" cy="33" r="2" />
      <path d="M32 33h12" />
      <path d="M22 16l4 6M42 16l-4 6" />
    </>
  ),
  dongle: (
    <>
      <rect x="12" y="26" width="32" height="14" rx="4" />
      <path d="M44 30h8v6h-8z" />
      <circle cx="22" cy="33" r="2" />
    </>
  ),
  gamepad: (
    <>
      <path d="M20 22h24c7 0 12 7 13 15 1 7-1 12-6 12-4 0-6-4-9-7H26c-3 3-5 7-9 7-5 0-6-5-5-12 1-8 6-15 8-15Z" />
      <path d="M20 34h8M24 30v8" />
      <circle cx="42" cy="32" r="2" />
      <circle cx="47" cy="37" r="2" />
    </>
  ),
  console_box: (
    <>
      <rect x="14" y="10" width="36" height="44" rx="6" />
      <path d="M22 20h20" />
      <circle cx="32" cy="38" r="7" />
      <circle cx="32" cy="38" r="2" />
    </>
  ),
  arcade: (
    <>
      <path d="M16 10h32v44H16z" />
      <rect x="21" y="16" width="22" height="16" rx="2" />
      <circle cx="26" cy="42" r="3" />
      <circle cx="38" cy="42" r="3" />
      <path d="M12 54h40" />
    </>
  ),
  pc_tower: (
    <>
      <rect x="20" y="8" width="24" height="48" rx="4" />
      <path d="M26 16h12" />
      <circle cx="32" cy="28" r="3" />
      <path d="M26 40h12M26 46h12" />
    </>
  ),
  speaker: (
    <>
      <rect x="18" y="8" width="28" height="48" rx="5" />
      <circle cx="32" cy="24" r="7" />
      <circle cx="32" cy="43" r="4" />
    </>
  ),
  soundbar: (
    <>
      <rect x="6" y="26" width="52" height="14" rx="7" />
      <circle cx="18" cy="33" r="3" />
      <circle cx="32" cy="33" r="3" />
      <circle cx="46" cy="33" r="3" />
    </>
  ),
  home_cinema: (
    <>
      <rect x="24" y="14" width="16" height="36" rx="3" />
      <rect x="6" y="24" width="12" height="20" rx="3" />
      <rect x="46" y="24" width="12" height="20" rx="3" />
      <circle cx="32" cy="26" r="4" />
    </>
  ),
  hifi: (
    <>
      <rect x="10" y="14" width="44" height="36" rx="4" />
      <circle cx="22" cy="32" r="8" />
      <circle cx="44" cy="26" r="4" />
      <path d="M38 40h12" />
    </>
  ),
  amp: (
    <>
      <rect x="8" y="20" width="48" height="24" rx="4" />
      <circle cx="18" cy="32" r="4" />
      <circle cx="30" cy="32" r="4" />
      <path d="M40 26v12M46 26v12M52 26v12" />
    </>
  ),
  pa_speaker: (
    <>
      <path d="M16 8h32v48H16z" />
      <circle cx="32" cy="24" r="9" />
      <circle cx="32" cy="45" r="5" />
      <path d="M12 56h40" />
    </>
  ),
  radio: (
    <>
      <rect x="8" y="20" width="48" height="26" rx="4" />
      <circle cx="22" cy="33" r="7" />
      <path d="M40 28h10M40 34h10M40 40h6" />
      <path d="M46 20l8-10" />
    </>
  ),
  cd: (
    <>
      <rect x="8" y="22" width="48" height="20" rx="4" />
      <circle cx="24" cy="32" r="7" />
      <circle cx="24" cy="32" r="2" />
      <path d="M38 30h12M38 36h8" />
    </>
  ),

  // --------------------------------------------------------------- CUISINE
  kettle: (
    <>
      <path d="M18 26h24l-3 26H21z" />
      <path d="M42 32l7-5" />
      <path d="M18 30c-5 2-5 10 0 12" />
      <path d="M26 20c0-3 4-3 4-6M34 20c0-3 4-3 4-6" />
    </>
  ),
  thermos: (
    <>
      <rect x="20" y="14" width="24" height="42" rx="6" />
      <path d="M24 8h16v6H24z" />
      <path d="M24 30h16" />
      <circle cx="32" cy="44" r="3" />
    </>
  ),
  coffee: (
    <>
      <path d="M16 24h28v10a14 14 0 0 1-28 0z" />
      <path d="M44 27h6a5 5 0 0 1 0 10h-6" />
      <path d="M14 52h34" />
      <path d="M26 14c0-3 3-3 3-6M36 14c0-3 3-3 3-6" />
    </>
  ),
  microwave: (
    <>
      <rect x="6" y="17" width="52" height="30" rx="4" />
      <rect x="12" y="23" width="28" height="18" rx="2" />
      <circle cx="50" cy="27" r="2.5" />
      <path d="M46 36h8M46 40h8" />
    </>
  ),
  oven: (
    <>
      <rect x="10" y="10" width="44" height="46" rx="5" />
      <path d="M10 24h44" />
      <rect x="18" y="30" width="28" height="18" rx="2" />
      <circle cx="19" cy="17" r="2" />
      <circle cx="27" cy="17" r="2" />
    </>
  ),
  stove: (
    <>
      <rect x="8" y="18" width="48" height="38" rx="4" />
      <path d="M8 30h48" />
      <circle cx="20" cy="24" r="3" />
      <circle cx="32" cy="24" r="3" />
      <circle cx="44" cy="24" r="3" />
      <rect x="18" y="36" width="28" height="14" rx="2" />
    </>
  ),
  hotplate: (
    <>
      <rect x="8" y="22" width="48" height="20" rx="5" />
      <circle cx="24" cy="32" r="7" />
      <circle cx="46" cy="32" r="3" />
      <path d="M14 46v4M50 46v4" />
    </>
  ),
  induction: (
    <>
      <rect x="8" y="20" width="48" height="24" rx="4" />
      <circle cx="24" cy="32" r="8" />
      <path d="M20 32a4 4 0 0 1 8 0" />
      <path d="M42 28h8M42 36h8" />
    </>
  ),
  rice_cooker: (
    <>
      <path d="M13 29h38v18a6 6 0 0 1-6 6H19a6 6 0 0 1-6-6z" />
      <path d="M10 29h44" />
      <path d="M32 24v-3" />
      <path d="M24 16c0-3 3-3 3-6M40 16c0-3-3-3-3-6" />
    </>
  ),
  slow_cooker: (
    <>
      <path d="M14 28h36v16a8 8 0 0 1-8 8H22a8 8 0 0 1-8-8z" />
      <path d="M11 24h42v4H11z" />
      <circle cx="32" cy="18" r="3" />
      <path d="M18 40h.01M46 40h.01" />
    </>
  ),
  fryer: (
    <>
      <path d="M16 24h32v22a6 6 0 0 1-6 6H22a6 6 0 0 1-6-6z" />
      <path d="M20 34h24" />
      <path d="M48 30h8" />
      <path d="M24 16c0-4 4-4 4-8M36 16c0-4 4-4 4-8" />
    </>
  ),
  air_fryer: (
    <>
      <rect x="16" y="10" width="32" height="46" rx="7" />
      <path d="M22 38h20v14H22z" />
      <circle cx="32" cy="22" r="5" />
      <path d="M28 45h8" />
    </>
  ),
  toaster: (
    <>
      <path d="M10 26h44v22a5 5 0 0 1-5 5H15a5 5 0 0 1-5-5z" />
      <path d="M20 26v-4h8v4M36 26v-4h8v4" />
      <circle cx="46" cy="40" r="3" />
    </>
  ),
  waffle: (
    <>
      <path d="M12 30h40v10a8 8 0 0 1-8 8H20a8 8 0 0 1-8-8z" />
      <path d="M12 26h40v4H12z" />
      <path d="M22 22h20" />
      <path d="M20 36h24M32 32v14" />
    </>
  ),
  blender: (
    <>
      <path d="M21 11h22l-3 27H24z" />
      <path d="M22 45h20v6a4 4 0 0 1-4 4H26a4 4 0 0 1-4-4z" />
      <path d="M24 38h16v7H24z" />
      <path d="M28 20h8" />
    </>
  ),
  hand_mixer: (
    <>
      <path d="M16 14h26a8 8 0 0 1 8 8v6H16z" />
      <path d="M24 28v14M34 28v14" />
      <path d="M22 42c0 6 4 8 2 12M36 42c0 6-4 8-2 12" />
      <path d="M50 20h6" />
    </>
  ),
  food_processor: (
    <>
      <path d="M18 8h28v22H18z" />
      <path d="M15 30h34v14a10 10 0 0 1-10 10H25a10 10 0 0 1-10-10z" />
      <path d="M24 14h16" />
      <circle cx="32" cy="42" r="4" />
    </>
  ),
  juicer: (
    <>
      <path d="M18 30h28v12a10 10 0 0 1-10 10H28a10 10 0 0 1-10-10z" />
      <path d="M32 30c0-8 4-12 8-14" />
      <path d="M22 22a10 10 0 0 1 20 0" />
      <path d="M20 56h24" />
    </>
  ),
  grinder: (
    <>
      <path d="M20 10h24l-4 16H24z" />
      <rect x="16" y="26" width="32" height="20" rx="4" />
      <circle cx="32" cy="36" r="5" />
      <path d="M20 46v8M44 46v8" />
    </>
  ),
  dishwasher: (
    <>
      <rect x="12" y="8" width="40" height="48" rx="4" />
      <path d="M12 20h40" />
      <circle cx="20" cy="14" r="2" />
      <path d="M22 30h20M22 38h20M22 46h20" />
    </>
  ),
  water_dispenser: (
    <>
      <path d="M24 6h16v14a8 8 0 0 1-16 0z" />
      <rect x="18" y="20" width="28" height="36" rx="4" />
      <path d="M30 30h6v6h-6z" />
      <path d="M26 44h12" />
    </>
  ),

  // ------------------------------------------------------- LINGE ET MÉNAGE
  washer_front: (
    <>
      <rect x="11" y="8" width="42" height="48" rx="5" />
      <circle cx="32" cy="36" r="12" />
      <circle cx="32" cy="36" r="5" />
      <path d="M18 17h6" />
      <circle cx="45" cy="17" r="2" />
    </>
  ),
  washer_top: (
    <>
      <rect x="11" y="8" width="42" height="48" rx="5" />
      <path d="M11 22h42" />
      <rect x="20" y="12" width="24" height="6" rx="3" />
      <circle cx="32" cy="38" r="9" />
    </>
  ),
  washer_semi: (
    <>
      <rect x="8" y="14" width="48" height="40" rx="5" />
      <path d="M32 14v40" />
      <circle cx="20" cy="32" r="7" />
      <circle cx="44" cy="32" r="5" />
    </>
  ),
  iron: (
    <>
      <path d="M8 44h48l-6-13H19c-6 0-9 6-11 13Z" />
      <path d="M18 31c1-8 6-12 14-12h13" />
      <path d="M45 15h7v8" />
      <path d="M12 51h40" />
    </>
  ),
  steam_station: (
    <>
      <path d="M8 34h30l-4-9H16c-4 0-6 4-8 9Z" />
      <path d="M16 25c1-5 4-8 9-8h9" />
      <rect x="14" y="40" width="38" height="16" rx="4" />
      <path d="M40 30l8 6" />
    </>
  ),
  garment_steamer: (
    <>
      <path d="M20 8h16v14H20z" />
      <path d="M28 22v18" />
      <rect x="18" y="40" width="20" height="16" rx="4" />
      <path d="M44 14c3 3 3 7 0 10M50 10c5 5 5 13 0 18" />
    </>
  ),
  vacuum_canister: (
    <>
      <path d="M14 51h24a10 10 0 0 0 0-20H26" />
      <circle cx="18" cy="45" r="11" />
      <circle cx="18" cy="45" r="4" />
      <path d="M26 31c0-8 6-14 14-14h10" />
      <path d="M48 12h8v10h-8z" />
    </>
  ),
  vacuum_stick: (
    <>
      <path d="M40 8l-6 30" />
      <rect x="26" y="34" width="18" height="12" rx="4" transform="rotate(-10 35 40)" />
      <path d="M22 52h22" />
      <circle cx="41" cy="8" r="3" />
    </>
  ),
  vacuum_robot: (
    <>
      <circle cx="32" cy="32" r="20" />
      <circle cx="32" cy="32" r="5" />
      <path d="M12 32h8M44 32h8" />
      <path d="M26 14c4-2 8-2 12 0" />
    </>
  ),
  hairdryer: (
    <>
      <path d="M12 20h24a10 10 0 0 1 0 20H12z" />
      <path d="M8 22c-4 3-4 15 0 18" />
      <path d="M28 40l-4 16" />
      <path d="M46 26h8M46 34h8" />
    </>
  ),
  straightener: (
    <>
      <path d="M14 46L46 14" />
      <path d="M18 50c-4-4-4-8 0-12l28-28c4-4 8-4 12 0" />
      <path d="M40 10l10 10" />
    </>
  ),
  clipper: (
    <>
      <rect x="20" y="12" width="24" height="34" rx="5" />
      <path d="M18 46h28l-2 8H20z" />
      <path d="M22 54h20" />
      <path d="M26 20h12" />
    </>
  ),
  hood_dryer: (
    <>
      <path d="M14 26a18 18 0 0 1 36 0v6H14z" />
      <path d="M32 32v10" />
      <path d="M24 42h16" />
      <path d="M32 42v12M24 56h16" />
    </>
  ),
  sewing: (
    <>
      <path d="M8 20h34a6 6 0 0 1 6 6v6H8z" />
      <path d="M14 32v14M14 46h34" />
      <path d="M42 32v10" />
      <path d="M42 44v6" />
      <circle cx="24" cy="26" r="2" />
    </>
  ),

  // -------------------------------------------------------------- NUMÉRIQUE
  laptop: (
    <>
      <rect x="12" y="14" width="40" height="27" rx="3" />
      <path d="M6 47h52l-4 6H10z" />
      <path d="M27 47h10" />
    </>
  ),
  desktop: (
    <>
      <rect x="22" y="10" width="20" height="44" rx="3" />
      <path d="M28 18h8" />
      <circle cx="32" cy="30" r="3" />
      <path d="M6 14h12v18H6z" />
    </>
  ),
  all_in_one: (
    <>
      <rect x="8" y="10" width="48" height="32" rx="4" />
      <path d="M26 50h12M32 42v8" />
      <path d="M20 54h24" />
      <circle cx="32" cy="14" r="1.5" />
    </>
  ),
  mini_pc: (
    <>
      <rect x="14" y="22" width="36" height="20" rx="4" />
      <circle cx="22" cy="32" r="2.5" />
      <path d="M32 28h12M32 36h8" />
    </>
  ),
  printer: (
    <>
      <path d="M18 10h28v12H18z" />
      <rect x="8" y="22" width="48" height="20" rx="4" />
      <path d="M18 42h28v12H18z" />
      <circle cx="48" cy="30" r="2" />
    </>
  ),
  copier: (
    <>
      <rect x="10" y="8" width="44" height="14" rx="3" />
      <rect x="8" y="22" width="48" height="24" rx="4" />
      <path d="M18 46h28v10H18z" />
      <path d="M40 30h10" />
    </>
  ),
  router: (
    <>
      <rect x="11" y="34" width="42" height="18" rx="5" />
      <circle cx="20" cy="43" r="2" />
      <path d="M28 43h16" />
      <path d="M22 24a16 16 0 0 1 20 0M27 18a26 26 0 0 1 10 0" />
    </>
  ),
  dongle_4g: (
    <>
      <rect x="14" y="26" width="30" height="14" rx="4" />
      <path d="M44 30h6v6h-6z" />
      <path d="M20 33h10" />
      <path d="M50 22c4 4 4 16 0 20" />
    </>
  ),
  ups: (
    <>
      <rect x="12" y="16" width="40" height="34" rx="5" />
      <path d="M30 24l-6 10h8l-6 10" />
      <path d="M40 26h6M40 32h6M40 38h6" />
    </>
  ),
  solar_inverter: (
    <>
      <path d="M8 12h24l-4 14H12z" />
      <path d="M14 12l-2 14M26 12l-2 14" />
      <rect x="34" y="26" width="22" height="26" rx="4" />
      <path d="M45 32l-4 8h6l-4 8" />
    </>
  ),
  phone: (
    <>
      <rect x="20" y="7" width="24" height="50" rx="5" />
      <path d="M28 13h8" />
      <path d="M34 26l-6 9h8l-6 9" />
    </>
  ),
  tablet: (
    <>
      <rect x="12" y="8" width="40" height="48" rx="5" />
      <path d="M28 50h8" />
      <path d="M18 16h28v28H18z" />
    </>
  ),
  powerbank: (
    <>
      <rect x="18" y="10" width="28" height="44" rx="5" />
      <path d="M24 20h16v18H24z" />
      <path d="M26 46h12" />
    </>
  ),
  usb_hub: (
    <>
      <rect x="8" y="24" width="48" height="18" rx="5" />
      <path d="M16 30v6M26 30v6M36 30v6M46 30v6" />
    </>
  ),
  watch: (
    <>
      <rect x="20" y="18" width="24" height="28" rx="6" />
      <path d="M26 18v-8h12v8M26 46v8h12v-8" />
      <path d="M32 28v6h5" />
    </>
  ),
  cam_bullet: (
    <>
      <path d="M10 24l34-9 4 13-34 9z" />
      <circle cx="42" cy="25" r="5" />
      <path d="M18 33v8M14 41h8" />
      <path d="M50 21l8-3" />
    </>
  ),
  cam_dome: (
    <>
      <path d="M12 34a20 20 0 0 1 40 0z" />
      <path d="M8 34h48" />
      <circle cx="32" cy="26" r="6" />
    </>
  ),
  cam_wifi: (
    <>
      <rect x="18" y="18" width="28" height="22" rx="6" />
      <circle cx="32" cy="29" r="6" />
      <path d="M32 40v10M24 54h16" />
      <path d="M12 16a10 10 0 0 1 8-6" />
    </>
  ),
  cam_ptz: (
    <>
      <circle cx="32" cy="28" r="14" />
      <circle cx="32" cy="28" r="6" />
      <path d="M18 42h28v6H18z" />
      <path d="M32 48v8" />
    </>
  ),
  nvr: (
    <>
      <rect x="8" y="22" width="48" height="20" rx="4" />
      <circle cx="18" cy="32" r="3" />
      <path d="M28 28h20M28 36h14" />
    </>
  ),

  // -------------------------------------------------------------------- EAU
  boiler: (
    <>
      <rect x="18" y="8" width="28" height="34" rx="10" />
      <path d="M32 42v6" />
      <path d="M22 52h20" />
      <path d="M26 58v2M32 58v2M38 58v2" />
    </>
  ),
  instant_heater: (
    <>
      <rect x="18" y="10" width="28" height="30" rx="5" />
      <path d="M34 18l-6 9h8l-6 9" />
      <path d="M32 40v6M24 52h16" />
      <path d="M28 58v2M36 58v2" />
    </>
  ),
  shower_heater: (
    <>
      <path d="M20 16h24l-4 8H24z" />
      <path d="M32 8v8" />
      <path d="M24 32v4M32 34v6M40 32v4" />
      <path d="M26 46v4M32 48v6M38 46v4" />
    </>
  ),
  solar_heater: (
    <>
      <path d="M10 26h32l-4 14H14z" />
      <path d="M18 26l-2 14M30 26l-2 14" />
      <rect x="42" y="14" width="14" height="26" rx="7" />
      <path d="M20 48h24" />
    </>
  ),
  pump_surface: (
    <>
      <rect x="13" y="30" width="26" height="22" rx="5" />
      <circle cx="26" cy="41" r="6" />
      <path d="M39 36h9v16" />
      <path d="M48 24c3 4 5 6 5 9a5 5 0 0 1-10 0c0-3 2-5 5-9Z" />
    </>
  ),
  pump_submersible: (
    <>
      <rect x="24" y="8" width="16" height="34" rx="8" />
      <path d="M32 42v10" />
      <path d="M10 52c6-4 12 4 18 0s12-4 18 0 8-2 8-2" />
      <path d="M28 16h8" />
    </>
  ),
  booster: (
    <>
      <circle cx="24" cy="34" r="12" />
      <circle cx="24" cy="34" r="4" />
      <path d="M36 30h12v14" />
      <path d="M14 50h28" />
    </>
  ),

  // ------------------------------------------------------------------ DIVERS
  diffuser: (
    <>
      <rect x="24" y="26" width="16" height="20" rx="4" />
      <path d="M28 26v-6h8v6" />
      <path d="M44 34h8v8h-8z" />
      <path d="M32 12c2 3 2 6 0 8" />
    </>
  ),
  bug_lamp: (
    <>
      <rect x="18" y="14" width="28" height="34" rx="6" />
      <path d="M24 20v22M32 20v22M40 20v22" />
      <path d="M32 8v6" />
      <path d="M24 52h16" />
    </>
  ),
  bug_racket: (
    <>
      <circle cx="26" cy="26" r="16" />
      <path d="M18 20h16M18 28h16M26 16v20" />
      <path d="M38 38l12 14" />
    </>
  ),
  ultrasound: (
    <>
      <rect x="22" y="20" width="20" height="26" rx="5" />
      <circle cx="32" cy="30" r="3" />
      <path d="M12 26c-3 4-3 10 0 14M52 26c3 4 3 10 0 14" />
    </>
  ),
  leaf: (
    <>
      <path d="M14 50C14 26 34 14 50 14c0 20-12 36-36 36Z" />
      <path d="M20 44c8-10 16-16 24-20" />
    </>
  ),
  drop: (
    <>
      <path d="M32 10c8 12 14 18 14 26a14 14 0 0 1-28 0c0-8 6-14 14-26Z" />
    </>
  ),
  flame: (
    <>
      <path d="M32 8c10 10 14 16 14 24a14 14 0 0 1-28 0c0-6 4-10 6-14 2 6 6 8 8 4s0-10 0-14Z" />
    </>
  ),
  fast: (
    <>
      <path d="M36 6L18 34h12L26 58l20-30H34z" />
    </>
  ),
  cold: (
    <>
      <path d="M32 8v48M12 20l40 24M52 20L12 44" />
      <path d="M26 14l6 6 6-6M26 50l6-6 6 6" />
    </>
  ),
  warm: (
    <>
      <circle cx="32" cy="32" r="10" />
      <path d="M32 8v6M32 50v6M8 32h6M50 32h6M15 15l4 4M45 45l4 4M49 15l-4 4M19 45l-4 4" />
    </>
  ),
  hot: (
    <>
      <path d="M28 8h8v28a8 8 0 1 1-8 0z" />
      <circle cx="32" cy="44" r="6" />
      <path d="M40 16h6M40 24h6" />
    </>
  ),
  heat_dry: (
    <>
      <path d="M20 44c-4-6-2-12 2-16s4-10 0-16" />
      <path d="M32 44c-4-6-2-12 2-16s4-10 0-16" />
      <path d="M44 44c-4-6-2-12 2-16s4-10 0-16" />
      <path d="M10 54h44" />
    </>
  ),
};

/**
 * Variantes qui partagent un même dessin : la forme situe la famille,
 * le libellé précise le détail (« 1 CV » contre « 2 CV »).
 */
const ALIASES: Record<string, string> = {
  // Éclairage
  led_bulb_big: 'led_bulb',
  halogen: 'led_bulb',
  tube_led: 'tube',
  neon: 'tube',
  // Froid
  fridge_mini: 'fridge_1door',
  fridge_small: 'fridge_1door',
  fridge_medium: 'fridge_2door',
  fridge_combi: 'fridge_2door',
  fridge_large: 'fridge_2door',
  freezer_chest_big: 'freezer_chest',
  freezer_pro: 'freezer_chest',
  // Confort
  ac_split_big: 'ac_split',
  fan_usb: 'fan_table',
  fan_wall: 'fan_table',
  fan_industrial: 'fan_stand',
  // Salon
  tv_small: 'tv_flat',
  tv_big: 'tv_flat',
  tv_oled: 'tv_flat',
  decoder_tnt: 'decoder',
  decoder_sat: 'dish',
  decoder_rec: 'decoder',
  decoder_android: 'android_box',
  dongle_hdmi: 'dongle',
  console_ps: 'gamepad',
  console_ps_new: 'console_box',
  console_xbox: 'console_box',
  console_switch: 'gamepad',
  console_retro: 'gamepad',
  console_pc: 'pc_tower',
  console_arcade: 'arcade',
  radio_set: 'radio',
  radio_small: 'radio',
  cd_player: 'cd',
  speaker_bt: 'speaker',
  speaker_small: 'speaker',
  pa_stack: 'pa_speaker',
  // Cuisine
  kettle_small: 'kettle',
  kettle_big: 'kettle',
  coffee_maker: 'coffee',
  espresso: 'coffee',
  micro: 'microwave',
  micro_small: 'microwave',
  micro_grill: 'microwave',
  micro_combi: 'oven',
  micro_built: 'microwave',
  oven_small: 'oven',
  hotplate_double: 'hotplate',
  juice_extractor: 'juicer',
  // Linge et ménage
  iron_dry: 'iron',
  iron_press: 'steam_station',
  vacuum_hand: 'vacuum_stick',
  vacuum_wet: 'vacuum_canister',
  hairdryer_small: 'hairdryer',
  hot_brush: 'straightener',
  sewing_home: 'sewing',
  sewing_pro: 'sewing',
  sewing_pedal: 'sewing',
  overlock: 'sewing',
  embroidery: 'sewing',
  // Numérique
  laptop_small: 'laptop',
  laptop_gaming: 'laptop',
  desktop_pro: 'desktop',
  printer_inkjet: 'printer',
  printer_multi: 'printer',
  printer_laser: 'printer',
  printer_receipt: 'mini_pc',
  box_wifi: 'router',
  box_repeater: 'router',
  box_fiber: 'router',
  router_pro: 'router',
  router_pocket: 'dongle_4g',
  ups_mini: 'ups',
  ups_small: 'ups',
  ups_medium: 'ups',
  ups_large: 'ups',
  phone_fast: 'phone',
  // Eau
  boiler_small: 'boiler',
  boiler_big: 'boiler',
  pump_borehole: 'pump_submersible',
  pump_drain: 'pump_surface',
  // Divers
  bug_lamp_big: 'bug_lamp',
};

/** Illustration d'une option, si elle en a une. */
export function OptionIcon({
  icon,
  className = 'h-7 w-7',
}: {
  icon?: string;
  className?: string;
}) {
  if (!icon) return null;
  const shape = SHAPES[icon] ?? SHAPES[ALIASES[icon] ?? ''];
  if (!shape) return null;
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {shape}
    </svg>
  );
}

export function hasOptionIcon(icon?: string): boolean {
  if (!icon) return false;
  return icon in SHAPES || (ALIASES[icon] ?? '') in SHAPES;
}

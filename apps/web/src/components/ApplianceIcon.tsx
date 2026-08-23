import type { ReactNode } from 'react';

/**
 * Illustrations des appareils.
 * Dessinees en SVG plutot qu’en images : nettes sur tous les écrans, quelques
 * octets chacune (donc rapides en 3G), et elles prennent la couleur de la
 * catégorie sans avoir à exporter dix variantes.
 */

const ICONS: Record<string, ReactNode> = {
  refrigerateur: (
    <>
      <rect x="17" y="7" width="30" height="50" rx="5" />
      <path d="M17 27h30" />
      <path d="M23 17v6M23 33v8" />
    </>
  ),
  congelateur: (
    <>
      <path d="M9 24h46v22a5 5 0 0 1-5 5H14a5 5 0 0 1-5-5z" />
      <path d="M7 17h50v7H7z" />
      <path d="M38 20.5h10" />
      <path d="M22 32v12M17 35l5 3 5-3M17 41l5-3 5 3" />
    </>
  ),
  climatiseur: (
    <>
      <rect x="9" y="13" width="46" height="17" rx="5" />
      <path d="M15 24h34" />
      <path d="M20 38c0 5 6 5 6 10M32 38c0 6 7 6 7 12M44 38c0 5 5 5 5 9" />
    </>
  ),
  ventilateur: (
    <>
      <circle cx="32" cy="25" r="16" />
      <circle cx="32" cy="25" r="3.5" />
      <path d="M32 21c-2-6 1-10 5-10s5 5 1 8M36 27c6-2 10 1 10 5s-5 5-8 1M28 28c-2 6-6 7-9 4s-1-7 3-7" />
      <path d="M32 41v10M24 55h16l-3-4H27z" />
    </>
  ),
  televiseur: (
    <>
      <rect x="7" y="11" width="50" height="33" rx="4" />
      <path d="M26 51h12M32 44v7" />
      <path d="M22 55h20" />
    </>
  ),
  decodeur: (
    <>
      <rect x="9" y="30" width="46" height="15" rx="4" />
      <circle cx="47" cy="37.5" r="2" />
      <path d="M17 37.5h16" />
      <path d="M24 22a12 12 0 0 1 16 0M29 16a20 20 0 0 1 6 0" />
    </>
  ),
  console_jeu: (
    <>
      <path d="M20 22h24c7 0 12 7 13 15 1 7-1 12-6 12-4 0-6-4-9-7H26c-3 3-5 7-9 7-5 0-6-5-5-12 1-8 6-15 8-15Z" />
      <path d="M20 34h8M24 30v8" />
      <circle cx="42" cy="32" r="2" />
      <circle cx="47" cy="37" r="2" />
    </>
  ),
  chaine_hifi: (
    <>
      <rect x="15" y="9" width="34" height="46" rx="5" />
      <circle cx="32" cy="24" r="7" />
      <circle cx="32" cy="42" r="5" />
      <path d="M32 24h.01" />
    </>
  ),
  bouilloire: (
    <>
      <path d="M18 27h24l-3 26H21z" />
      <path d="M42 32l7-5" />
      <path d="M18 30c-5 2-5 10 0 12" />
      <path d="M26 20c0-3 4-3 4-6M34 20c0-3 4-3 4-6" />
    </>
  ),
  micro_ondes: (
    <>
      <rect x="7" y="17" width="50" height="30" rx="4" />
      <rect x="13" y="23" width="27" height="18" rx="2" />
      <circle cx="49" cy="27" r="2.5" />
      <path d="M46 36h6M46 40h6" />
    </>
  ),
  cuiseur_riz: (
    <>
      <path d="M13 29h38v18a6 6 0 0 1-6 6H19a6 6 0 0 1-6-6z" />
      <path d="M10 29h44" />
      <path d="M32 24v-3" />
      <path d="M24 16c0-3 3-3 3-6M40 16c0-3-3-3-3-6" />
    </>
  ),
  mixeur: (
    <>
      <path d="M21 11h22l-3 27H24z" />
      <path d="M22 45h20v6a4 4 0 0 1-4 4H26a4 4 0 0 1-4-4z" />
      <path d="M24 38h16v7H24z" />
      <path d="M28 20h8" />
    </>
  ),
  machine_laver: (
    <>
      <rect x="11" y="8" width="42" height="48" rx="5" />
      <circle cx="32" cy="36" r="12" />
      <circle cx="32" cy="36" r="5" />
      <path d="M18 17h6" />
      <circle cx="45" cy="17" r="2" />
    </>
  ),
  fer_repasser: (
    <>
      <path d="M8 45h48l-6-13H19c-6 0-9 6-11 13Z" />
      <path d="M18 32c1-8 6-12 14-12h13" />
      <path d="M45 16h7v8" />
      <path d="M12 52h40" />
    </>
  ),
  aspirateur: (
    <>
      <path d="M14 51h24a10 10 0 0 0 0-20H26" />
      <circle cx="18" cy="45" r="11" />
      <circle cx="18" cy="45" r="4" />
      <path d="M26 31c0-8 6-14 14-14h10" />
      <path d="M48 12h8v10h-8z" />
    </>
  ),
  box_internet: (
    <>
      <rect x="11" y="34" width="42" height="18" rx="5" />
      <circle cx="20" cy="43" r="2" />
      <path d="M28 43h16" />
      <path d="M22 24a16 16 0 0 1 20 0M27 18a26 26 0 0 1 10 0" />
    </>
  ),
  ordinateur: (
    <>
      <rect x="12" y="14" width="40" height="27" rx="3" />
      <path d="M6 47h52l-4 6H10z" />
      <path d="M27 47h10" />
    </>
  ),
  chargeur_telephone: (
    <>
      <rect x="20" y="7" width="24" height="50" rx="5" />
      <path d="M28 13h8" />
      <path d="M34 26l-6 9h8l-6 9" />
    </>
  ),
  camera_surveillance: (
    <>
      <path d="M10 24l34-9 4 13-34 9z" />
      <circle cx="42" cy="25" r="5" />
      <path d="M18 33v8M14 41h8" />
      <path d="M50 21l8-3" />
    </>
  ),
  ampoules: (
    <>
      <path d="M22 27a10 10 0 1 1 20 0c0 6-4 8-4 13H26c0-5-4-7-4-13Z" />
      <path d="M26 46h12M28 52h8" />
      <path d="M32 6v4M12 27h4M48 27h4M18 13l3 3M46 13l-3 3" />
    </>
  ),
  chauffe_eau: (
    <>
      <rect x="18" y="8" width="28" height="34" rx="10" />
      <path d="M32 42v6" />
      <path d="M22 52h20" />
      <path d="M26 58v2M32 58v2M38 58v2" />
    </>
  ),
  pompe_eau: (
    <>
      <rect x="13" y="30" width="26" height="22" rx="5" />
      <circle cx="26" cy="41" r="6" />
      <path d="M39 36h9v16" />
      <path d="M48 24c3 4 5 6 5 9a5 5 0 0 1-10 0c0-3 2-5 5-9Z" />
    </>
  ),
};

const FALLBACK: ReactNode = (
  <>
    <rect x="13" y="17" width="38" height="30" rx="5" />
    <path d="M23 47v8M41 47v8" />
    <path d="M23 27h18" />
  </>
);

export function ApplianceIcon({
  templateId,
  className = 'h-10 w-10',
  strokeWidth = 2.6,
}: {
  templateId: string;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONS[templateId] ?? FALLBACK}
    </svg>
  );
}

export function hasIllustration(templateId: string): boolean {
  return templateId in ICONS;
}

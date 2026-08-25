import { AnimatePresence, m as motion } from 'framer-motion';
import { useState } from 'react';
import { STANDALONE } from './api/client.js';
import { ErrorBanner, Spinner } from './components/ui.js';
import { BottomBar, Sidebar, TABS, type TabId } from './components/Navigation.js';
import { AppProvider, useApp } from './hooks/useApp.js';
import { AuthProvider, useAuth } from './hooks/useAuth.js';
import { LoginScreen } from './screens/LoginScreen.js';
import { EstimatorScreen } from './screens/EstimatorScreen.js';
import { HouseholdScreen } from './screens/HouseholdScreen.js';
import { InventoryScreen } from './screens/InventoryScreen.js';
import { MeterScreen } from './screens/MeterScreen.js';
import { Onboarding } from './screens/Onboarding.js';
import { RechargeScreen } from './screens/RechargeScreen.js';
import { SchoolScreen } from './screens/SchoolScreen.js';
import { SettingsSheet } from './screens/SettingsSheet.js';

/**
 * La coquille de l'application.
 *
 * Une seule base de code pour deux formes :
 *   - téléphone : plein écran, barre d'onglets en bas, au pouce ;
 *   - ordinateur : colonne de navigation à gauche, contenu centré.
 *
 * Le basculement est purement CSS (`lg:`) — il n'y a pas deux applications à
 * maintenir, et aucun composant d'écran n'a besoin de savoir où il s'affiche.
 */
function Shell() {
  const { householdId, summary, loading, error, refresh } = useApp();
  const { user, signOut } = useAuth();
  const [tab, setTab] = useState<TabId>('inventaire');
  const [settingsOpen, setSettingsOpen] = useState(false);

  if (!householdId) return <Onboarding />;
  if (loading && !summary) return <Spinner label="Chargement de votre foyer..." />;

  if (error && !summary) {
    return (
      <div className="px-4 pt-20">
        <ErrorBanner message={error} onRetry={refresh} />
      </div>
    );
  }
  if (!summary) return null;

  /**
   * Les pastilles d'alerte. Elles ne sont pas décoratives : elles ramènent
   * l'utilisateur là où il perd de l'argent — un compteur jamais relevé, un
   * crédit qui va tomber.
   */
  const badges: Partial<Record<TabId, string>> = {};
  if (summary.credit === null) badges.compteur = 'jamais relevé';
  else if (summary.credit.level !== 'ok') {
    badges.compteur = summary.credit.message;
    badges.recharge = summary.credit.message;
  }

  const titreOnglet = TABS.find((item) => item.id === tab);

  return (
    <div className="min-h-screen bg-sand-50">
      <Sidebar
        active={tab}
        onChange={setTab}
        badges={badges}
        householdName={summary.household.name}
        onOpenSettings={() => setSettingsOpen(true)}
        onLogout={user ? signOut : undefined}
        userName={user?.name ?? null}
      />

      <div className="lg:pl-72">
        {/* En-tête d'écran, sur ordinateur seulement : sur téléphone, chaque
            écran porte déjà son propre bandeau coloré. */}
        <div className="hidden items-center justify-between border-b border-sand-200 bg-white px-8 py-4 lg:flex">
          <div>
            <h1 className="text-xl font-black leading-tight">{titreOnglet?.label}</h1>
            <p className="text-sm font-bold text-ink-muted">{titreOnglet?.hint}</p>
          </div>
          <button
            onClick={() => setSettingsOpen(true)}
            className="tap flex h-11 w-11 items-center justify-center rounded-full bg-sand-100 text-xl"
            aria-label="Réglages"
          >
            ⚙️
          </button>
        </div>

        <main className="mx-auto max-w-2xl lg:px-6 lg:py-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="lg:overflow-hidden lg:rounded-4xl lg:shadow-card"
            >
              {tab === 'inventaire' ? (
                <DashboardTab onOpenSettings={() => setSettingsOpen(true)} />
              ) : null}
              {tab === 'estimateur' ? <EstimatorScreen /> : null}
              {tab === 'compteur' ? <MeterScreen /> : null}
              {tab === 'recharge' ? <RechargeScreen /> : null}
              {tab === 'ecole' ? <SchoolScreen /> : null}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <BottomBar active={tab} onChange={setTab} badges={badges} />
      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

/**
 * Onglet 1 : l'inventaire et la colocation, sous le même toit.
 *
 * Ce sont deux lectures du même foyer — ce qu'on possède, et qui le paye — donc
 * deux vues d'un même onglet plutôt que deux entrées de menu.
 */
function DashboardTab({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { summary } = useApp();
  const [vue, setVue] = useState<'appareils' | 'colocation'>('appareils');
  const plusieurs = (summary?.members.length ?? 0) > 1;

  return (
    <>
      {plusieurs ? (
        <div className="sticky top-0 z-20 flex gap-1 border-b border-sand-200 bg-white/95 px-4 py-2 backdrop-blur">
          {(
            [
              { id: 'appareils', label: '🔌 Mes appareils' },
              { id: 'colocation', label: '⚖️ Qui paie quoi' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              onClick={() => setVue(item.id)}
              className={`tap relative flex-1 rounded-2xl px-3 py-2 text-sm font-extrabold transition ${
                vue === item.id ? 'text-teal-700' : 'text-ink-muted'
              }`}
            >
              {vue === item.id ? (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.18 }}
                  className="absolute inset-0 rounded-2xl bg-sand-100"
                />
              ) : null}
              <span className="relative">{item.label}</span>
            </button>
          ))}
        </div>
      ) : null}

      {vue === 'appareils' || !plusieurs ? (
        <InventoryScreen onOpenSettings={onOpenSettings} />
      ) : (
        <HouseholdScreen />
      )}
    </>
  );
}

/**
 * Aiguillage d'entrée — LE VERROU DE L'APPLICATION.
 *
 *   session en cours de vérification → attente
 *   personne non connectée           → écran de connexion, et rien d'autre
 *   connectée mais sans foyer        → tunnel d'accueil
 *   connectée avec un foyer          → tableau de bord
 *
 * La connexion est exigée AVANT tout : ni les onglets, ni le tunnel d'accueil,
 * ni la moindre donnée de foyer ne sont montés tant qu'aucun compte n'est
 * ouvert. Le test porte sur `user` seul — surtout pas sur `googleEnabled`, qui
 * dépend de la configuration du serveur : un serveur mal configuré rendrait
 * alors l'application publique sans que personne ne s'en aperçoive.
 *
 * L'écran de connexion sait dire, le cas échéant, que le serveur n'est pas
 * configuré ; c'est une impasse honnête, pas une porte ouverte.
 *
 * Seule exception : la version de démonstration autonome, qui n'a pas de
 * serveur du tout et garde ses données dans le navigateur.
 */
function Gate() {
  const { user, anonymousAllowed, loading } = useAuth();

  if (STANDALONE) {
    return (
      <AppProvider>
        <Shell />
      </AppProvider>
    );
  }

  if (loading) return <Spinner label="Un instant..." />;
  // `anonymousAllowed` vient du SERVEUR et ne vaut jamais true en production :
  // c'est la seule porte dérobée, et elle se ferme toute seule au déploiement.
  if (!user && !anonymousAllowed) return <LoginScreen />;

  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}

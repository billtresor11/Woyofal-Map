import { useState } from 'react';
import { ErrorBanner, Spinner } from './components/ui.js';
import { TabBar, type TabId } from './components/TabBar.js';
import { AppProvider, useApp } from './hooks/useApp.js';
import { EstimatorScreen } from './screens/EstimatorScreen.js';
import { HouseholdScreen } from './screens/HouseholdScreen.js';
import { InventoryScreen } from './screens/InventoryScreen.js';
import { Onboarding } from './screens/Onboarding.js';
import { SettingsSheet } from './screens/SettingsSheet.js';

function Shell() {
  const { householdId, summary, loading, error, refresh } = useApp();
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

  return (
    <div className="mx-auto min-h-screen max-w-lg bg-sand-50">
      {tab === 'inventaire' ? <InventoryScreen onOpenSettings={() => setSettingsOpen(true)} /> : null}
      {tab === 'estimateur' ? <EstimatorScreen /> : null}
      {tab === 'foyer' ? <HouseholdScreen /> : null}
      <TabBar active={tab} onChange={setTab} />
      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}

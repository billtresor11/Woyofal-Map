import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { FournisseurFoyer } from '../src/foyer';

/**
 * La racine de l'application native.
 *
 * Elle ne fait que trois choses : fournir l'état partagé, poser les zones sûres
 * (encoche, barre du bas), et laisser la navigation décider de l'écran. Tout
 * l'aiguillage — connexion, accueil, tableau de bord — vit dans `index.tsx`.
 */
export default function Racine() {
  return (
    <SafeAreaProvider>
      <FournisseurFoyer>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />
      </FournisseurFoyer>
    </SafeAreaProvider>
  );
}

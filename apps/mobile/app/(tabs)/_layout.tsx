import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useFoyer } from '../../src/foyer';
import { ONGLETS, couleurs } from '../../src/theme';

/**
 * La barre d'onglets — les mêmes cinq entrées que sur le web, dans le même
 * ordre. Un utilisateur qui passe du téléphone à l'ordinateur retrouve sa
 * navigation à la même place.
 *
 * La pastille rouge n'est pas décorative : elle ramène là où l'utilisateur
 * perd de l'argent (compteur jamais relevé, crédit qui va tomber).
 */
export default function Onglets() {
  const { resume } = useFoyer();
  const alerte = resume ? resume.credit === null || resume.credit.level !== 'ok' : false;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: couleurs.teal600,
        tabBarInactiveTintColor: couleurs.encreGrise,
        tabBarStyle: { backgroundColor: couleurs.blanc, borderTopColor: couleurs.sable200 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '800' },
      }}
    >
      {ONGLETS.map((onglet) => (
        <Tabs.Screen
          key={onglet.nom}
          name={onglet.nom}
          options={{
            title: onglet.titre,
            tabBarIcon: ({ focused }) => (
              <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.45 }}>{onglet.emoji}</Text>
            ),
            tabBarBadge:
              alerte && (onglet.nom === 'compteur' || onglet.nom === 'recharge') ? '' : undefined,
            tabBarBadgeStyle: { backgroundColor: couleurs.tranche3, minWidth: 10, maxHeight: 10 },
          }}
        />
      ))}
    </Tabs>
  );
}

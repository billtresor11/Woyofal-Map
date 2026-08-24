import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { couleurs, espaces, ombreCarte, rayons } from './theme';

/**
 * Les briques visuelles de l'application native.
 *
 * Elles reprennent, une par une, les classes du web (`card`, `btn-primary`,
 * `chip`…). React Native n'ayant pas de feuille de style en cascade, ce fichier
 * EST la feuille de style : tout ce qui se répète doit passer par ici, sinon
 * les écrans divergent au fil des ajouts.
 */

export function Carte({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.carte, style]}>{children}</View>;
}

export function Titre({ children }: { children: ReactNode }) {
  return <Text style={styles.titre}>{children}</Text>;
}

export function SousTitre({ children }: { children: ReactNode }) {
  return <Text style={styles.sousTitre}>{children}</Text>;
}

export function Bouton({
  titre,
  onPress,
  variante = 'principal',
  desactive,
  style,
}: {
  titre: string;
  onPress: () => void;
  variante?: 'principal' | 'discret';
  desactive?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const principal = variante === 'principal';
  return (
    <Pressable
      onPress={onPress}
      disabled={desactive}
      // Zone tactile confortable : l'application vise tous les publics.
      style={({ pressed }) => [
        styles.bouton,
        principal ? styles.boutonPrincipal : styles.boutonDiscret,
        pressed && styles.presse,
        desactive && styles.desactive,
        style,
      ]}
    >
      <Text style={principal ? styles.texteBoutonPrincipal : styles.texteBoutonDiscret}>
        {titre}
      </Text>
    </Pressable>
  );
}

export function Etiquette({
  texte,
  couleur = couleurs.sable100,
  couleurTexte = couleurs.encre,
}: {
  texte: string;
  couleur?: string;
  couleurTexte?: string;
}) {
  return (
    <View style={[styles.etiquette, { backgroundColor: couleur }]}>
      <Text style={[styles.texteEtiquette, { color: couleurTexte }]}>{texte}</Text>
    </View>
  );
}

export function Pastille({ nom, couleur }: { nom: string; couleur: string }) {
  return (
    <View style={[styles.pastille, { backgroundColor: couleur }]}>
      <Text style={styles.textePastille}>{(nom.trim()[0] ?? '?').toUpperCase()}</Text>
    </View>
  );
}

export function Chargement({ texte = 'Un instant…' }: { texte?: string }) {
  return (
    <View style={styles.chargement}>
      <ActivityIndicator color={couleurs.teal500} size="large" />
      <Text style={styles.sousTitre}>{texte}</Text>
    </View>
  );
}

export function Erreur({ message, onReessayer }: { message: string; onReessayer?: () => void }) {
  return (
    <Carte style={styles.erreur}>
      <Text style={styles.texteErreur}>⚠️ {message}</Text>
      {onReessayer ? (
        <Pressable onPress={onReessayer}>
          <Text style={styles.lien}>Réessayer</Text>
        </Pressable>
      ) : null}
    </Carte>
  );
}

/** Statistique compacte : un libellé, une valeur, une précision. */
export function Stat({ label, valeur, aide }: { label: string; valeur: string; aide?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label.toUpperCase()}</Text>
      <Text style={styles.statValeur}>{valeur}</Text>
      {aide ? <Text style={styles.statAide}>{aide}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  carte: {
    backgroundColor: couleurs.blanc,
    borderRadius: rayons.l,
    padding: espaces.l,
    ...ombreCarte,
  },
  titre: { fontSize: 18, fontWeight: '900', color: couleurs.encre },
  sousTitre: { fontSize: 14, fontWeight: '700', color: couleurs.encreDouce },
  bouton: {
    minHeight: 52,
    borderRadius: rayons.m,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: espaces.xl,
  },
  boutonPrincipal: { backgroundColor: couleurs.teal500 },
  boutonDiscret: { backgroundColor: couleurs.sable100 },
  presse: { transform: [{ scale: 0.97 }] },
  desactive: { opacity: 0.4 },
  texteBoutonPrincipal: { color: couleurs.blanc, fontSize: 16, fontWeight: '800' },
  texteBoutonDiscret: { color: couleurs.encre, fontSize: 16, fontWeight: '800' },
  etiquette: {
    borderRadius: 999,
    paddingHorizontal: espaces.m,
    paddingVertical: espaces.xs,
    alignSelf: 'flex-start',
  },
  texteEtiquette: { fontSize: 12, fontWeight: '800' },
  pastille: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textePastille: { color: couleurs.blanc, fontSize: 12, fontWeight: '900' },
  chargement: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: espaces.m },
  erreur: { borderLeftWidth: 4, borderLeftColor: couleurs.tranche3, gap: espaces.s },
  texteErreur: { fontSize: 14, fontWeight: '700', color: couleurs.encre },
  lien: { fontSize: 14, fontWeight: '800', color: couleurs.teal600 },
  stat: {
    flex: 1,
    minWidth: 140,
    backgroundColor: couleurs.sable50,
    borderRadius: rayons.m,
    padding: espaces.m,
  },
  statLabel: { fontSize: 10, fontWeight: '900', color: couleurs.encreGrise, letterSpacing: 0.5 },
  statValeur: { fontSize: 18, fontWeight: '900', color: couleurs.encre, marginTop: 2 },
  statAide: { fontSize: 11, fontWeight: '700', color: couleurs.encreGrise },
});

export const stylesPartages = styles;

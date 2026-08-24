import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ErreurApi, api } from '../../src/api';
import { useFoyer } from '../../src/foyer';
import { fcfa, kwh } from '../../src/format';
import { couleurs, espaces, rayons } from '../../src/theme';
import type { ApplianceTemplate } from '../../src/types';
import { Bouton, Carte, Chargement, Erreur } from '../../src/ui';

/**
 * ONGLET 2 — COMBIEN ÇA COÛTE ?
 *
 * Deux questions, les deux seules que les gens se posent avant d'appuyer sur
 * un bouton :
 *   « 3 h de PlayStation ce soir, ça fait combien ? »
 *   « Avec 5 000 F de recharge, je reçois combien de kWh ? »
 *
 * La réponse tient compte de la tranche DÉJÀ atteinte dans le mois : la même
 * soirée ne coûte pas pareil le 3 et le 28.
 */

const DUREES = [
  { minutes: 30, libelle: '30 min' },
  { minutes: 60, libelle: '1 h' },
  { minutes: 120, libelle: '2 h' },
  { minutes: 180, libelle: '3 h' },
  { minutes: 300, libelle: '5 h' },
  { minutes: 480, libelle: 'La nuit' },
];

const MONTANTS = [1000, 2000, 5000, 10000, 20000];

interface ReponsePonctuelle {
  template: { id: string; name: string; emoji: string };
  previousKwh: number;
  estimate: {
    kwh: number;
    amount: number;
    pricePerKwh: number;
    tierLabel: string;
    durationMinutes: number;
  };
}

interface ReponseRecharge {
  kwh: number;
  amount: number;
}

export default function Estimateur() {
  const { resume, foyerId, catalogue } = useFoyer();
  const [mode, setMode] = useState<'duree' | 'recharge'>('duree');
  const [modeleId, setModeleId] = useState<string | null>(null);
  const [minutes, setMinutes] = useState(180);
  const [montant, setMontant] = useState('5000');
  const [reponse, setReponse] = useState<ReponsePonctuelle | null>(null);
  const [recharge, setRecharge] = useState<ReponseRecharge | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const marges = useSafeAreaInsets();

  /** Les appareils qu'on allume volontairement : les seuls qui ont un sens ici. */
  const modeles = useMemo(() => {
    if (!catalogue) return [];
    return catalogue.templates.filter((t) => !t.alwaysOn && !t.isCustom).slice(0, 18);
  }, [catalogue]);

  if (!resume) return <Chargement />;

  async function estimer(modele: ApplianceTemplate) {
    setModeleId(modele.id);
    setEnCours(true);
    setErreur(null);
    try {
      setReponse(
        await api.post<ReponsePonctuelle>('/api/estimate/punctual', {
          templateId: modele.id,
          durationMinutes: minutes,
          // Le foyer donne la tranche déjà atteinte : sans lui, le prix serait
          // celui d'un compteur remis à zéro, donc trop bas.
          householdId: foyerId ?? undefined,
        }),
      );
    } catch (e) {
      setErreur(e instanceof ErreurApi ? e.message : 'Estimation impossible.');
    } finally {
      setEnCours(false);
    }
  }

  async function convertir() {
    setEnCours(true);
    setErreur(null);
    try {
      setRecharge(
        await api.post<ReponseRecharge>('/api/estimate/recharge', {
          amount: Number(montant.replace(/\D/g, '')) || 0,
          householdId: foyerId ?? undefined,
        }),
      );
    } catch (e) {
      setErreur(e instanceof ErreurApi ? e.message : 'Conversion impossible.');
    } finally {
      setEnCours(false);
    }
  }

  return (
    <ScrollView style={styles.fond} contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={[styles.entete, { paddingTop: marges.top + espaces.l }]}>
        <Text style={styles.titre}>Combien ça coûte ?</Text>
        <Text style={styles.accroche}>
          Une réponse en FCFA avant d’appuyer sur le bouton. Le prix tient compte de la tranche
          où vous êtes déjà : {resume.gauge.currentTier.label.toLowerCase()}, à{' '}
          {fcfa(resume.gauge.currentTier.pricePerKwh)} le kWh.
        </Text>
      </View>

      <View style={styles.bascule}>
        {(
          [
            { id: 'duree', label: '⏱️ Une utilisation' },
            { id: 'recharge', label: '💳 Une recharge' },
          ] as const
        ).map((item) => (
          <Text
            key={item.id}
            onPress={() => setMode(item.id)}
            style={[styles.basculeItem, mode === item.id && styles.basculeItemActif]}
          >
            {item.label}
          </Text>
        ))}
      </View>

      <View style={styles.corps}>
        {mode === 'duree' ? (
          <>
            <Text style={styles.section}>Pendant combien de temps ?</Text>
            <View style={styles.rangee}>
              {DUREES.map((duree) => (
                <Pressable
                  key={duree.minutes}
                  onPress={() => setMinutes(duree.minutes)}
                  style={[styles.puce, minutes === duree.minutes && styles.puceActive]}
                >
                  <Text style={styles.puceTexte}>{duree.libelle}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.section, { marginTop: espaces.l }]}>Quel appareil ?</Text>
            <View style={styles.grille}>
              {modeles.map((modele) => (
                <Pressable
                  key={modele.id}
                  onPress={() => estimer(modele)}
                  style={[styles.tuile, modeleId === modele.id && styles.tuileActive]}
                >
                  <Text style={{ fontSize: 26 }}>{modele.emoji}</Text>
                  <Text style={styles.tuileNom} numberOfLines={2}>
                    {modele.name}
                  </Text>
                </Pressable>
              ))}
            </View>

            {enCours ? <Text style={styles.aide}>Calcul…</Text> : null}

            {reponse ? (
              <Carte style={styles.resultat}>
                <Text style={styles.resultatTitre}>
                  {reponse.template.emoji} {reponse.template.name}
                </Text>
                <Text style={styles.resultatMontant}>{fcfa(reponse.estimate.amount)}</Text>
                <Text style={styles.aide}>
                  {kwh(reponse.estimate.kwh)} · {reponse.estimate.tierLabel} à{' '}
                  {fcfa(reponse.estimate.pricePerKwh)} le kWh
                </Text>
              </Carte>
            ) : null}
          </>
        ) : (
          <>
            <Text style={styles.section}>Vous rechargez combien ?</Text>
            <View style={styles.rangee}>
              {MONTANTS.map((valeur) => (
                <Pressable
                  key={valeur}
                  onPress={() => setMontant(String(valeur))}
                  style={[styles.puce, montant === String(valeur) && styles.puceActive]}
                >
                  <Text style={styles.puceTexte}>{fcfa(valeur)}</Text>
                </Pressable>
              ))}
            </View>

            <TextInput
              value={montant}
              onChangeText={setMontant}
              keyboardType="numeric"
              placeholder="Ex : 7 500"
              placeholderTextColor={couleurs.encreGrise}
              style={styles.champ}
            />
            <Bouton
              titre={enCours ? 'Calcul…' : 'Combien de kWh ?'}
              onPress={convertir}
              desactive={enCours}
              style={{ marginTop: espaces.m }}
            />

            {recharge ? (
              <Carte style={styles.resultat}>
                <Text style={styles.resultatTitre}>Avec {fcfa(recharge.amount)}</Text>
                <Text style={styles.resultatMontant}>{kwh(recharge.kwh)}</Text>
                <Text style={styles.aide}>
                  soit environ {Math.floor(recharge.kwh / Math.max(0.01, resume.totals.kwhPerDay))}{' '}
                  jours de courant au rythme de votre maison.
                </Text>
              </Carte>
            ) : null}
          </>
        )}

        {erreur ? <Erreur message={erreur} /> : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fond: { flex: 1, backgroundColor: couleurs.sable50 },
  entete: {
    backgroundColor: couleurs.teal600,
    paddingHorizontal: espaces.xl,
    paddingBottom: espaces.xl,
  },
  titre: { color: couleurs.blanc, fontSize: 24, fontWeight: '900' },
  accroche: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    fontWeight: '700',
    marginTop: espaces.xs,
    lineHeight: 21,
  },
  bascule: {
    flexDirection: 'row',
    gap: espaces.xs,
    backgroundColor: couleurs.blanc,
    paddingHorizontal: espaces.l,
    paddingVertical: espaces.s,
  },
  basculeItem: {
    flex: 1,
    textAlign: 'center',
    paddingVertical: espaces.s,
    borderRadius: rayons.m,
    fontSize: 13,
    fontWeight: '800',
    color: couleurs.encreGrise,
    overflow: 'hidden',
  },
  basculeItemActif: { backgroundColor: couleurs.sable100, color: couleurs.teal700 },
  corps: { padding: espaces.l },
  section: { fontSize: 16, fontWeight: '900', color: couleurs.encre, marginBottom: espaces.s },
  aide: { fontSize: 13, fontWeight: '700', color: couleurs.encreDouce, lineHeight: 19 },
  rangee: { flexDirection: 'row', flexWrap: 'wrap', gap: espaces.s },
  puce: {
    backgroundColor: couleurs.blanc,
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: 999,
    paddingHorizontal: espaces.l,
    paddingVertical: espaces.s,
  },
  puceActive: { borderColor: couleurs.teal500, backgroundColor: 'rgba(13,148,136,0.08)' },
  puceTexte: { fontSize: 13, fontWeight: '800', color: couleurs.encre },
  grille: { flexDirection: 'row', flexWrap: 'wrap', gap: espaces.s },
  tuile: {
    width: '30%',
    backgroundColor: couleurs.blanc,
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: rayons.m,
    paddingVertical: espaces.m,
    alignItems: 'center',
    gap: espaces.xs,
  },
  tuileActive: { borderColor: couleurs.teal500 },
  tuileNom: { fontSize: 11, fontWeight: '800', color: couleurs.encre, textAlign: 'center' },
  champ: {
    backgroundColor: couleurs.blanc,
    borderRadius: rayons.m,
    paddingHorizontal: espaces.l,
    paddingVertical: espaces.m,
    fontSize: 20,
    fontWeight: '900',
    color: couleurs.encre,
    marginTop: espaces.m,
  },
  resultat: { marginTop: espaces.l, alignItems: 'center' },
  resultatTitre: { fontSize: 15, fontWeight: '800', color: couleurs.encreDouce },
  resultatMontant: {
    fontSize: 38,
    fontWeight: '900',
    color: couleurs.teal700,
    marginVertical: espaces.xs,
  },
});

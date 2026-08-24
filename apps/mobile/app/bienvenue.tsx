import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { api } from '../src/api';
import { useFoyer } from '../src/foyer';
import { initiale } from '../src/format';
import { couleurs, espaces, rayons } from '../src/theme';
import { Bouton, Erreur } from '../src/ui';
import type { ApplianceTemplate } from '../src/types';

/**
 * LE TUNNEL D'ACCUEIL EN NATIF — les mêmes trois étapes que sur le web.
 *
 * Une seule décision par écran, et un fil d'avancement toujours visible. Les
 * questions, l'ordre et les formulations sont identiques au web : quelqu'un qui
 * change de téléphone ne doit pas avoir l'impression de changer de produit.
 */

const COULEURS_MEMBRES = ['#F97316', '#0EA5E9', '#22C55E', '#8B5CF6', '#EC4899', '#EAB308'];

const SUGGESTIONS = [
  'ampoules',
  'refrigerateur',
  'televiseur',
  'ventilateur',
  'box_internet',
  'climatiseur',
  'fer_repasser',
  'bouilloire',
  'machine_laver',
  'ordinateur',
  'decodeur',
  'chargeur_telephone',
];

export default function Bienvenue() {
  const { catalogue, choisirFoyer, rafraichir } = useFoyer();
  const [etape, setEtape] = useState<1 | 2 | 3>(1);

  const [nom, setNom] = useState('');
  const [grille, setGrille] = useState<'WOYOFAL_DPP' | 'WOYOFAL_DMP'>('WOYOFAL_DPP');
  const [personnes, setPersonnes] = useState<string[]>(['Moi']);
  const [budget, setBudget] = useState('');
  const [choisis, setChoisis] = useState<Record<string, number>>({});
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const proposes = useMemo(() => {
    if (!catalogue) return [];
    const parId = new Map(catalogue.templates.map((t) => [t.id, t]));
    return SUGGESTIONS.map((id) => parId.get(id)).filter(
      (t): t is ApplianceTemplate => Boolean(t),
    );
  }, [catalogue]);

  async function terminer() {
    setEnCours(true);
    setErreur(null);
    try {
      const foyer = await api.post<{ id: string }>('/api/households', {
        name: nom.trim() || 'Ma maison',
        meterType: 'PREPAID',
        tariffCode: grille,
        subscribedKva: grille === 'WOYOFAL_DMP' ? 15 : 5,
        monthlyBudget: budget ? Number(budget.replace(/\D/g, '')) : null,
        members: personnes.filter((p) => p.trim()).map((p) => ({ name: p.trim() })),
      });

      for (const [templateId, quantity] of Object.entries(choisis)) {
        if (quantity <= 0) continue;
        await api
          .post(`/api/households/${foyer.id}/appliances`, { templateId, quantity })
          .catch(() => undefined);
      }

      await choisirFoyer(foyer.id);
      await rafraichir();
      router.replace('/(tabs)');
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Création impossible.');
      setEnCours(false);
    }
  }

  return (
    <View style={styles.fond}>
      <View style={styles.entete}>
        <Text style={styles.ampoule}>💡</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.marque}>Woyofal Map</Text>
          <Text style={styles.etapeTexte}>Étape {etape} sur 3</Text>
        </View>
      </View>

      <View style={styles.progression}>
        {[1, 2, 3].map((numero) => (
          <View
            key={numero}
            style={[styles.segment, etape >= numero && styles.segmentActif]}
          />
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.contenu} keyboardShouldPersistTaps="handled">
        {etape === 1 ? (
          <>
            <Text style={styles.question}>Bienvenue ! Parlons de votre maison.</Text>
            <View style={styles.carte}>
              <Text style={styles.label}>🏠 Comment s’appelle votre maison ?</Text>
              <TextInput
                value={nom}
                onChangeText={setNom}
                placeholder="Ex : Maison Ouakam"
                placeholderTextColor={couleurs.encreGrise}
                style={styles.champ}
              />

              <Text style={[styles.label, { marginTop: espaces.l }]}>
                ⚡ Quel compteur Woyofal ?
              </Text>
              <Text style={styles.aide}>
                C’est écrit sur votre facture. Dans le doute, choisissez le premier.
              </Text>
              <View style={styles.ligneChoix}>
                <ChoixCompteur
                  actif={grille === 'WOYOFAL_DPP'}
                  onPress={() => setGrille('WOYOFAL_DPP')}
                  emoji="🏡"
                  titre="Petite puissance"
                  detail="Une maison ou un appartement"
                />
                <ChoixCompteur
                  actif={grille === 'WOYOFAL_DMP'}
                  onPress={() => setGrille('WOYOFAL_DMP')}
                  emoji="🏘️"
                  titre="Moyenne puissance"
                  detail="Une grande villa, 10 kVA et plus"
                />
              </View>

              <Bouton
                titre="Continuer →"
                onPress={() => setEtape(2)}
                style={{ marginTop: espaces.l }}
              />
            </View>
          </>
        ) : null}

        {etape === 2 ? (
          <>
            <Text style={styles.question}>Qui habite ici ?</Text>
            <Text style={styles.accroche}>
              Chaque prénom reçoit sa couleur. C’est ce qui permettra de partager la facture.
            </Text>
            <View style={styles.carte}>
              {personnes.map((personne, index) => (
                <View key={index} style={styles.lignePersonne}>
                  <View
                    style={[
                      styles.avatar,
                      { backgroundColor: COULEURS_MEMBRES[index % COULEURS_MEMBRES.length] },
                    ]}
                  >
                    <Text style={styles.avatarTexte}>
                      {personne.trim() ? initiale(personne) : '?'}
                    </Text>
                  </View>
                  <TextInput
                    value={personne}
                    onChangeText={(valeur) =>
                      setPersonnes((prev) =>
                        prev.map((item, i) => (i === index ? valeur : item)),
                      )
                    }
                    placeholder="Prénom"
                    placeholderTextColor={couleurs.encreGrise}
                    style={[styles.champ, { flex: 1 }]}
                  />
                  {personnes.length > 1 ? (
                    <Pressable
                      onPress={() => setPersonnes((prev) => prev.filter((_, i) => i !== index))}
                      style={styles.retirer}
                    >
                      <Text style={styles.retirerTexte}>−</Text>
                    </Pressable>
                  ) : null}
                </View>
              ))}

              {personnes.length < 8 ? (
                <Pressable onPress={() => setPersonnes((prev) => [...prev, ''])}>
                  <Text style={styles.lien}>➕ Ajouter une personne</Text>
                </Pressable>
              ) : null}

              <Text style={[styles.label, { marginTop: espaces.l }]}>
                🎯 Un budget mensuel ? (facultatif)
              </Text>
              <TextInput
                value={budget}
                onChangeText={setBudget}
                keyboardType="numeric"
                placeholder="Ex : 30 000 FCFA"
                placeholderTextColor={couleurs.encreGrise}
                style={styles.champ}
              />

              <View style={styles.ligneBoutons}>
                <Bouton
                  titre="← Retour"
                  variante="discret"
                  onPress={() => setEtape(1)}
                  style={{ flex: 1 }}
                />
                <Bouton
                  titre="Continuer →"
                  onPress={() => setEtape(3)}
                  desactive={personnes.filter((p) => p.trim()).length === 0}
                  style={{ flex: 2 }}
                />
              </View>
            </View>
          </>
        ) : null}

        {etape === 3 ? (
          <>
            <Text style={styles.question}>Qu’avez-vous chez vous ?</Text>
            <Text style={styles.accroche}>
              Touchez ce que vous possédez. Pas besoin de connaître la puissance : l’application
              s’en occupe.
            </Text>
            <View style={styles.carte}>
              <View style={styles.grille}>
                {proposes.map((modele) => {
                  const quantite = choisis[modele.id] ?? 0;
                  const actif = quantite > 0;
                  return (
                    <Pressable
                      key={modele.id}
                      onPress={() =>
                        setChoisis((prev) => {
                          const copie = { ...prev };
                          if (copie[modele.id]) delete copie[modele.id];
                          else copie[modele.id] = modele.defaultQuantity ?? 1;
                          return copie;
                        })
                      }
                      style={[styles.tuile, actif && styles.tuileActive]}
                    >
                      <Text style={styles.tuileEmoji}>{modele.emoji}</Text>
                      <Text style={styles.tuileNom} numberOfLines={2}>
                        {modele.name}
                      </Text>
                      {actif ? <Text style={styles.coche}>✓</Text> : null}
                    </Pressable>
                  );
                })}
              </View>

              {erreur ? <Erreur message={erreur} /> : null}

              <View style={styles.ligneBoutons}>
                <Bouton
                  titre="← Retour"
                  variante="discret"
                  onPress={() => setEtape(2)}
                  style={{ flex: 1 }}
                />
                <Bouton
                  titre={enCours ? 'Création…' : 'C’est parti 🚀'}
                  onPress={terminer}
                  desactive={enCours}
                  style={{ flex: 2 }}
                />
              </View>
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function ChoixCompteur({
  actif,
  onPress,
  emoji,
  titre,
  detail,
}: {
  actif: boolean;
  onPress: () => void;
  emoji: string;
  titre: string;
  detail: string;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.choix, actif && styles.choixActif]}>
      <Text style={{ fontSize: 24 }}>{emoji}</Text>
      <Text style={styles.choixTitre}>{titre}</Text>
      <Text style={styles.choixDetail}>{detail}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fond: { flex: 1, backgroundColor: couleurs.teal600, paddingTop: 64 },
  entete: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaces.m,
    paddingHorizontal: espaces.xl,
  },
  ampoule: { fontSize: 36 },
  marque: { color: couleurs.blanc, fontSize: 18, fontWeight: '900' },
  etapeTexte: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '700' },
  progression: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: espaces.xl,
    marginTop: espaces.m,
  },
  segment: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  segmentActif: { backgroundColor: couleurs.blanc },
  contenu: { padding: espaces.xl, paddingBottom: 64 },
  question: { color: couleurs.blanc, fontSize: 24, fontWeight: '900', lineHeight: 30 },
  accroche: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    fontWeight: '700',
    marginTop: espaces.xs,
    lineHeight: 20,
  },
  carte: {
    backgroundColor: couleurs.blanc,
    borderRadius: rayons.xl,
    padding: espaces.xl,
    marginTop: espaces.l,
  },
  label: { fontSize: 16, fontWeight: '900', color: couleurs.encre, marginBottom: espaces.s },
  aide: { fontSize: 13, fontWeight: '700', color: couleurs.encreGrise, marginBottom: espaces.s },
  champ: {
    backgroundColor: couleurs.sable50,
    borderRadius: rayons.m,
    paddingHorizontal: espaces.l,
    paddingVertical: espaces.m,
    fontSize: 16,
    fontWeight: '700',
    color: couleurs.encre,
  },
  ligneChoix: { flexDirection: 'row', gap: espaces.s },
  choix: {
    flex: 1,
    borderWidth: 2,
    borderColor: couleurs.sable200,
    borderRadius: rayons.m,
    padding: espaces.m,
  },
  choixActif: { borderColor: couleurs.teal500, backgroundColor: 'rgba(13,148,136,0.08)' },
  choixTitre: { fontSize: 13, fontWeight: '800', color: couleurs.encre, marginTop: espaces.xs },
  choixDetail: { fontSize: 11, fontWeight: '700', color: couleurs.encreGrise },
  lignePersonne: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaces.s,
    marginBottom: espaces.s,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarTexte: { color: couleurs.blanc, fontSize: 18, fontWeight: '900' },
  retirer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: couleurs.sable100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retirerTexte: { fontSize: 20, fontWeight: '900', color: couleurs.encreDouce },
  lien: { fontSize: 14, fontWeight: '800', color: couleurs.teal600, marginTop: espaces.xs },
  ligneBoutons: { flexDirection: 'row', gap: espaces.s, marginTop: espaces.l },
  grille: { flexDirection: 'row', flexWrap: 'wrap', gap: espaces.s },
  tuile: {
    width: '30%',
    borderWidth: 2,
    borderColor: couleurs.sable200,
    borderRadius: rayons.m,
    paddingVertical: espaces.m,
    alignItems: 'center',
    gap: espaces.xs,
  },
  tuileActive: { borderColor: couleurs.teal500, backgroundColor: 'rgba(13,148,136,0.08)' },
  tuileEmoji: { fontSize: 26 },
  tuileNom: { fontSize: 11, fontWeight: '800', color: couleurs.encre, textAlign: 'center' },
  coche: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: couleurs.teal500,
    color: couleurs.blanc,
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '900',
    overflow: 'hidden',
  },
});

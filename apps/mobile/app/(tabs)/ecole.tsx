import { lessons, overflowExample } from '@woyofal/core';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFoyer } from '../../src/foyer';
import { fcfa, kwh } from '../../src/format';
import { couleurTranche, couleurs, espaces, rayons } from '../../src/theme';
import { Carte, Chargement } from '../../src/ui';

/**
 * ONGLET 5 — L'ÉCOLE WOYOFAL.
 *
 * Trois seaux qu'on remplit dans l'ordre, et qu'on vide le 1er du mois. C'est
 * la seule image qui fait comprendre une tarification progressive à quelqu'un
 * qui n'a jamais lu de facture détaillée.
 *
 * Les leçons et l'exemple du débordement viennent de `@woyofal/core` : les
 * chiffres sont ceux de la grille réelle du foyer, jamais des exemples écrits
 * à la main qui finiraient par mentir.
 */
export default function Ecole() {
  const { resume } = useFoyer();
  const [ouvert, setOuvert] = useState<number | null>(null);
  const [leconOuverte, setLeconOuverte] = useState<string | null>(null);
  const marges = useSafeAreaInsets();

  const exemple = useMemo(
    () => (resume ? overflowExample(resume.plan, 145, 15) : null),
    [resume],
  );
  const cours = useMemo(() => (resume ? lessons(resume.plan) : []), [resume]);

  if (!resume || !exemple) return <Chargement />;
  const { buckets, totals, keyFact } = resume;

  return (
    <ScrollView style={styles.fond} contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={[styles.entete, { paddingTop: marges.top + espaces.l }]}>
        <Text style={{ fontSize: 48 }}>🎓</Text>
        <Text style={styles.titre}>L’École Woyofal</Text>
        <Text style={styles.accroche}>
          Deux minutes pour comprendre pourquoi votre courant ne coûte pas toujours le même prix
          — et comment payer moins sans rien débrancher.
        </Text>
      </View>

      <View style={styles.corps}>
        {/* --- Les trois seaux ------------------------------------------- */}
        <Text style={styles.section}>🪣 Imaginez trois seaux</Text>
        <Text style={styles.aide}>
          On les remplit dans l’ordre. Le premier est bon marché, le dernier n’a pas de fond.
          Touchez un seau pour comprendre.
        </Text>

        <View style={styles.rangeeSeaux}>
          {buckets.map((seau) => (
            <Pressable
              key={seau.order}
              onPress={() => setOuvert(ouvert === seau.order ? null : seau.order)}
              style={[styles.carteSeau, ouvert === seau.order && styles.carteSeauActive]}
            >
              <Seau couleur={seau.color} remplissage={seau.fillRatio} />
              <Text style={styles.contenance}>
                {seau.capacityKwh === null ? 'sans fond' : `${seau.capacityKwh} kWh`}
              </Text>
              <Text style={styles.prix}>{fcfa(seau.pricePerKwh)}</Text>
              <Text style={styles.aideCentree}>le kWh</Text>
              <Text style={styles.dedans}>
                {seau.filledKwh > 0 ? `${kwh(seau.filledKwh)} dedans` : 'vide'}
              </Text>
            </Pressable>
          ))}
        </View>

        {ouvert !== null ? (
          <Carte style={{ marginTop: espaces.m }}>
            <Text style={styles.explication}>
              {buckets.find((seau) => seau.order === ouvert)?.sentence}
            </Text>
          </Carte>
        ) : null}

        <Text style={styles.remiseAZero}>
          🔄 Le 1er de chaque mois, on vide les trois seaux. Vous repartez au tarif le plus bas,
          quoi qu’il se soit passé avant.
        </Text>

        {/* --- Le débordement -------------------------------------------- */}
        <Text style={[styles.section, { marginTop: espaces.xxl }]}>💧 Quand un seau déborde</Text>
        <Text style={styles.aide}>
          L’erreur que tout le monde fait : croire que dépasser un seuil fait payer TOUT au prix
          fort.
        </Text>

        <Carte style={{ marginTop: espaces.m }}>
          <Text style={styles.aide}>
            Vous êtes à {exemple.fromKwh} kWh, vous en consommez {exemple.addedKwh} de plus.
          </Text>
          {exemple.steps.map((etape) => (
            <View key={etape.tierOrder} style={styles.etapeDebordement}>
              <View
                style={[styles.trait, { backgroundColor: couleurTranche(etape.tierOrder) }]}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.etapeTitre}>
                  {kwh(etape.kwh)} dans le seau {etape.tierOrder}
                </Text>
                <Text style={styles.aide}>à {fcfa(etape.pricePerKwh)} le kWh</Text>
              </View>
              <Text style={styles.etapeMontant}>{fcfa(etape.amount)}</Text>
            </View>
          ))}
          <View style={styles.totalDebordement}>
            <Text style={styles.totalLabel}>Vous payez</Text>
            <Text style={styles.totalMontant}>{fcfa(exemple.total)}</Text>
          </View>
          <Text style={styles.aideCentree}>
            Et non {fcfa(exemple.naiveTotal)}, comme on le croit souvent
          </Text>
        </Carte>

        {/* --- Votre cas -------------------------------------------------- */}
        <Carte style={styles.votreCas}>
          <Text style={styles.sousSection}>📌 Et vous, dans tout ça</Text>
          <Text style={styles.explication}>{keyFact}</Text>
          <Text style={styles.aide}>
            Sur la base de {kwh(totals.kwhPerMonth)} par mois, calculés depuis vos{' '}
            {totals.applianceCount} appareil{totals.applianceCount > 1 ? 's' : ''}.
          </Text>
        </Carte>

        {/* --- Les leçons -------------------------------------------------- */}
        <Text style={[styles.section, { marginTop: espaces.xxl }]}>
          📚 Les six choses à savoir
        </Text>
        {cours.map((lecon) => (
          <Pressable
            key={lecon.id}
            onPress={() => setLeconOuverte(leconOuverte === lecon.id ? null : lecon.id)}
          >
            <Carte style={{ marginTop: espaces.s }}>
              <View style={styles.ligneLecon}>
                <Text style={{ fontSize: 24 }}>{lecon.emoji}</Text>
                <Text style={styles.titreLecon}>{lecon.title}</Text>
                <Text style={styles.chevron}>{leconOuverte === lecon.id ? '▾' : '›'}</Text>
              </View>
              {leconOuverte === lecon.id ? (
                <>
                  <Text style={styles.corpsLecon}>{lecon.body}</Text>
                  {lecon.action ? <Text style={styles.action}>👉 {lecon.action}</Text> : null}
                </>
              ) : null}
            </Carte>
          </Pressable>
        ))}

        <Text style={styles.mentions}>
          Les prix affichés ici sont ceux de votre grille ({resume.plan.label}).
        </Text>
      </View>
    </ScrollView>
  );
}

/**
 * Un seau, dessiné en vues empilées.
 *
 * React Native n'a pas de SVG sans bibliothèque supplémentaire : on obtient le
 * trapèze avec des bordures transparentes, une technique classique et sans
 * dépendance. Le liquide est une vue de hauteur proportionnelle, posée dessous.
 */
function Seau({ couleur, remplissage }: { couleur: string; remplissage: number }) {
  const hauteur = 66 * Math.min(1, Math.max(0, remplissage));
  return (
    <View style={styles.seau}>
      <View style={styles.rebord} />
      <View style={styles.corpsSeau}>
        <View style={[styles.liquide, { height: hauteur, backgroundColor: couleur }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fond: { flex: 1, backgroundColor: couleurs.sable50 },
  entete: {
    backgroundColor: couleurs.teal600,
    paddingHorizontal: espaces.xl,
    paddingBottom: espaces.xl,
  },
  titre: { color: couleurs.blanc, fontSize: 24, fontWeight: '900', marginTop: espaces.s },
  accroche: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    fontWeight: '700',
    marginTop: espaces.xs,
    lineHeight: 21,
  },
  corps: { padding: espaces.l },
  section: { fontSize: 17, fontWeight: '900', color: couleurs.encre },
  sousSection: { fontSize: 15, fontWeight: '900', color: couleurs.encre },
  aide: { fontSize: 13, fontWeight: '700', color: couleurs.encreDouce, lineHeight: 19 },
  aideCentree: {
    fontSize: 11,
    fontWeight: '700',
    color: couleurs.encreGrise,
    textAlign: 'center',
  },
  rangeeSeaux: { flexDirection: 'row', gap: espaces.s, marginTop: espaces.m },
  carteSeau: {
    flex: 1,
    backgroundColor: couleurs.blanc,
    borderRadius: rayons.l,
    paddingVertical: espaces.m,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  carteSeauActive: { borderColor: couleurs.teal500 },
  seau: { alignItems: 'center' },
  rebord: {
    width: 46,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(28,25,23,0.22)',
  },
  // Trapèze : une bordure basse épaisse et des bordures latérales transparentes.
  corpsSeau: {
    width: 44,
    height: 70,
    borderWidth: 3,
    borderColor: 'rgba(28,25,23,0.22)',
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  liquide: { width: '100%', opacity: 0.85 },
  contenance: {
    fontSize: 10,
    fontWeight: '900',
    color: couleurs.encreGrise,
    marginTop: espaces.xs,
  },
  prix: { fontSize: 13, fontWeight: '900', color: couleurs.encre, marginTop: espaces.xs },
  dedans: {
    fontSize: 10,
    fontWeight: '800',
    color: couleurs.encreDouce,
    marginTop: espaces.xs,
    textAlign: 'center',
  },
  explication: {
    fontSize: 14,
    fontWeight: '700',
    color: couleurs.encreDouce,
    lineHeight: 21,
    marginTop: espaces.xs,
  },
  remiseAZero: {
    marginTop: espaces.m,
    backgroundColor: 'rgba(13,148,136,0.1)',
    borderRadius: rayons.m,
    padding: espaces.m,
    fontSize: 13,
    fontWeight: '800',
    color: couleurs.encre,
    lineHeight: 20,
  },
  etapeDebordement: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaces.m,
    backgroundColor: couleurs.sable50,
    borderRadius: rayons.m,
    padding: espaces.m,
    marginTop: espaces.s,
  },
  trait: { width: 6, height: 34, borderRadius: 3 },
  etapeTitre: { fontSize: 13, fontWeight: '800', color: couleurs.encre },
  etapeMontant: { fontSize: 15, fontWeight: '900', color: couleurs.encre },
  totalDebordement: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(34,197,94,0.15)',
    borderRadius: rayons.m,
    padding: espaces.m,
    marginTop: espaces.m,
  },
  totalLabel: { fontSize: 14, fontWeight: '900', color: couleurs.encre },
  totalMontant: { fontSize: 20, fontWeight: '900', color: couleurs.teal700 },
  votreCas: {
    marginTop: espaces.xxl,
    borderLeftWidth: 4,
    borderLeftColor: couleurs.teal500,
  },
  ligneLecon: { flexDirection: 'row', alignItems: 'center', gap: espaces.m },
  titreLecon: { flex: 1, fontSize: 15, fontWeight: '800', color: couleurs.encre },
  chevron: { fontSize: 18, color: couleurs.encreGrise, fontWeight: '900' },
  corpsLecon: {
    fontSize: 13,
    fontWeight: '700',
    color: couleurs.encreDouce,
    lineHeight: 20,
    marginTop: espaces.s,
  },
  action: {
    marginTop: espaces.s,
    backgroundColor: 'rgba(13,148,136,0.1)',
    borderRadius: rayons.s,
    padding: espaces.m,
    fontSize: 13,
    fontWeight: '800',
    color: couleurs.teal700,
  },
  mentions: {
    marginTop: espaces.l,
    fontSize: 11,
    fontWeight: '700',
    color: couleurs.encreGrise,
    textAlign: 'center',
  },
});

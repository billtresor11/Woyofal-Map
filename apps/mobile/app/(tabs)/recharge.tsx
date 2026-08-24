import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ErreurApi, api } from '../../src/api';
import { useFoyer } from '../../src/foyer';
import { fcfa, kwh } from '../../src/format';
import { couleurs, espaces, rayons } from '../../src/theme';
import type { ConseilRecharge } from '../../src/types';
import { Carte, Chargement, Erreur, Etiquette } from '../../src/ui';

/**
 * ONGLET 4 — QUAND RECHARGER.
 *
 * L'écran qui rapporte de l'argent. En prépayé, la tranche s'applique au moment
 * de l'ACHAT, sur le cumul acheté depuis le 1er : acheter 20 000 F le 28 coûte
 * donc bien plus cher que 5 000 F le 28 puis 15 000 F le 2.
 *
 * Tout le raisonnement est fait par le serveur (`@woyofal/core`) : cet écran
 * n'affiche qu'un montant, une date, et une somme économisée.
 */
export default function Recharge() {
  const { foyerId } = useFoyer();
  const [conseil, setConseil] = useState<ConseilRecharge | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [rechargement, setRechargement] = useState(false);
  const marges = useSafeAreaInsets();

  const charger = useCallback(async () => {
    if (!foyerId) return;
    try {
      setErreur(null);
      setConseil(await api.get<ConseilRecharge>(`/api/households/${foyerId}/recharge-advice`));
    } catch (e) {
      setErreur(e instanceof ErreurApi ? e.message : 'Conseil indisponible.');
    }
  }, [foyerId]);

  useEffect(() => {
    void charger();
  }, [charger]);

  if (erreur) return <Erreur message={erreur} onReessayer={charger} />;
  if (!conseil) return <Chargement texte="Calcul du meilleur moment…" />;

  const fond =
    conseil.strategy === 'minimum_vital' ? couleurs.mangue600 : couleurs.teal600;
  const jours = Math.ceil(conseil.daysLeftInMonth);

  return (
    <ScrollView
      style={styles.fond}
      contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={
        <RefreshControl
          refreshing={rechargement}
          onRefresh={async () => {
            setRechargement(true);
            await charger();
            setRechargement(false);
          }}
          tintColor={couleurs.teal500}
        />
      }
    >
      <View
        style={[styles.entete, { backgroundColor: fond, paddingTop: marges.top + espaces.l }]}
      >
        <Text style={{ fontSize: 48 }}>{conseil.emoji}</Text>
        <Text style={styles.titre}>{conseil.title}</Text>
        <Text style={styles.message}>{conseil.message}</Text>

        {conseil.recommendedAmount > 0 ? (
          <View style={styles.encart}>
            <Text style={styles.encartLabel}>À ACHETER AUJOURD’HUI</Text>
            <Text style={styles.encartMontant}>{fcfa(conseil.recommendedAmount)}</Text>
            <Text style={styles.encartAide}>
              soit environ {kwh(conseil.recommendedKwh)}
            </Text>
          </View>
        ) : null}

        <Text style={styles.pied}>
          Remise à zéro des tranches dans {jours} jour{jours > 1 ? 's' : ''} ·{' '}
          {conseil.currentTier.label} à {fcfa(conseil.currentTier.pricePerKwh)} le kWh
        </Text>
      </View>

      <View style={styles.corps}>
        {/* --- Le plan en deux temps -------------------------------------- */}
        {conseil.waitPlan ? (
          <Carte style={{ marginBottom: espaces.m }}>
            <Text style={styles.sousTitre}>
              💰 Vous pouvez garder {fcfa(conseil.waitPlan.savings)}
            </Text>
            <Text style={styles.aide}>
              Même quantité de courant, en deux achats au lieu d’un.
            </Text>

            <Etape
              numero="1"
              quand="Aujourd’hui"
              montant={conseil.waitPlan.nowAmount}
              kwhs={conseil.waitPlan.nowKwh}
              detail="Juste de quoi tenir jusqu’au 1er, pas plus."
            />
            <Etape
              numero="2"
              quand={`Le ${new Date(conseil.resetOn).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
              })}`}
              montant={conseil.waitPlan.laterAmount}
              kwhs={conseil.waitPlan.laterKwh}
              detail="Les tranches repartent à zéro : c’est le prix le plus bas."
            />

            <View style={styles.comparaison}>
              <Text style={styles.aide}>Tout acheter aujourd’hui</Text>
              <Text style={styles.barre}>{fcfa(conseil.waitPlan.allAtOnceAmount)}</Text>
            </View>
            <View style={[styles.comparaison, styles.comparaisonGagnante]}>
              <Text style={styles.gagnantLabel}>En deux fois</Text>
              <Text style={styles.gagnantMontant}>
                {fcfa(conseil.waitPlan.nowAmount + conseil.waitPlan.laterAmount)}
              </Text>
            </View>
          </Carte>
        ) : null}

        {/* --- Les montants courants -------------------------------------- */}
        <Text style={styles.sousTitre}>🛒 Ce que donnent les montants habituels</Text>
        <Text style={styles.aide}>
          Calculé à partir de {kwh(conseil.purchasedKwhThisMonth)} déjà{' '}
          {conseil.purchaseSource === 'achats' ? 'achetés' : 'consommés'} ce mois-ci.
        </Text>

        {conseil.options.map((option) => (
          <Carte key={option.amount} style={{ marginTop: espaces.s }}>
            <View style={styles.ligneOption}>
              <View style={styles.pastilleMontant}>
                <Text style={styles.texteMontant}>{fcfa(option.amount)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.optionKwh}>{kwh(option.kwh)}</Text>
                <Text style={styles.aide}>
                  environ {Math.floor(option.daysCovered)} jours ·{' '}
                  {fcfa(option.averagePricePerKwh)} le kWh
                </Text>
              </View>
              {option.crossesTier ? (
                <Etiquette texte="⚠️ change de tranche" couleur="rgba(251,191,36,0.25)" />
              ) : null}
            </View>
          </Carte>
        ))}

        {/* --- Pourquoi ce conseil ---------------------------------------- */}
        <Carte style={{ marginTop: espaces.l }}>
          <Text style={styles.sousTitre}>🤔 Pourquoi ce conseil</Text>
          <Text style={styles.puce}>
            • Vos appareils consomment environ {kwh(conseil.estimatedKwhPerDay)} par jour.
          </Text>
          <Text style={styles.puce}>
            • Pour tenir jusqu’au 1er, il vous faut {kwh(conseil.kwhNeededUntilReset)}.
          </Text>
          {conseil.credit ? (
            <Text style={styles.puce}>
              • Il vous reste {kwh(conseil.credit.remainingKwh)} sur le compteur, soit{' '}
              {Math.floor(conseil.credit.daysLeft)} jours.
            </Text>
          ) : (
            <Text style={[styles.puce, { color: couleurs.mangue600 }]}>
              • Votre compteur n’a jamais été relevé : passez par l’onglet Compteur pour un
              conseil au kWh près.
            </Text>
          )}
          <Text style={styles.puce}>
            • Le 1er du mois, tout repart à {fcfa(conseil.plan.tiers[0]?.pricePerKwh ?? 0)} le kWh.
          </Text>
        </Carte>

        <Text style={styles.mentions}>
          L’application ne vend rien et n’achète rien à votre place. Elle vous dit seulement quand
          votre argent achète le plus de courant.
        </Text>
      </View>
    </ScrollView>
  );
}

function Etape({
  numero,
  quand,
  montant,
  kwhs,
  detail,
}: {
  numero: string;
  quand: string;
  montant: number;
  kwhs: number;
  detail: string;
}) {
  return (
    <View style={styles.etape}>
      <View style={styles.numero}>
        <Text style={styles.numeroTexte}>{numero}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.etapeLigne}>
          <Text style={styles.etapeQuand}>{quand}</Text>
          <Text style={styles.etapeMontant}>{fcfa(montant)}</Text>
        </View>
        <Text style={styles.aide}>
          {kwh(kwhs)} · {detail}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fond: { flex: 1, backgroundColor: couleurs.sable50 },
  entete: { paddingHorizontal: espaces.xl, paddingBottom: espaces.xl },
  titre: { color: couleurs.blanc, fontSize: 24, fontWeight: '900', marginTop: espaces.s },
  message: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontWeight: '700',
    marginTop: espaces.s,
    lineHeight: 21,
  },
  encart: {
    marginTop: espaces.l,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: rayons.l,
    padding: espaces.l,
  },
  encartLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  encartMontant: { color: couleurs.blanc, fontSize: 36, fontWeight: '900' },
  encartAide: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '700' },
  pied: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '700', marginTop: espaces.m },
  corps: { padding: espaces.l },
  sousTitre: { fontSize: 17, fontWeight: '900', color: couleurs.encre },
  aide: { fontSize: 12, fontWeight: '700', color: couleurs.encreGrise, lineHeight: 18 },
  etape: { flexDirection: 'row', gap: espaces.m, marginTop: espaces.m },
  numero: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: couleurs.teal500,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numeroTexte: { color: couleurs.blanc, fontWeight: '900' },
  etapeLigne: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  etapeQuand: { fontSize: 15, fontWeight: '900', color: couleurs.encre },
  etapeMontant: { fontSize: 17, fontWeight: '900', color: couleurs.teal700 },
  comparaison: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: couleurs.sable50,
    borderRadius: rayons.m,
    padding: espaces.m,
    marginTop: espaces.m,
  },
  comparaisonGagnante: { backgroundColor: 'rgba(34,197,94,0.15)', marginTop: espaces.s },
  barre: {
    fontSize: 15,
    fontWeight: '900',
    color: couleurs.encreGrise,
    textDecorationLine: 'line-through',
  },
  gagnantLabel: { fontSize: 14, fontWeight: '900', color: couleurs.encre },
  gagnantMontant: { fontSize: 18, fontWeight: '900', color: couleurs.teal700 },
  ligneOption: { flexDirection: 'row', alignItems: 'center', gap: espaces.m },
  pastilleMontant: {
    backgroundColor: couleurs.sable100,
    borderRadius: rayons.m,
    paddingHorizontal: espaces.m,
    paddingVertical: espaces.s,
  },
  texteMontant: { fontSize: 13, fontWeight: '900', color: couleurs.encre },
  optionKwh: { fontSize: 15, fontWeight: '800', color: couleurs.encre },
  puce: {
    fontSize: 13,
    fontWeight: '700',
    color: couleurs.encreDouce,
    marginTop: espaces.s,
    lineHeight: 19,
  },
  mentions: {
    marginTop: espaces.l,
    fontSize: 11,
    fontWeight: '700',
    color: couleurs.encreGrise,
    textAlign: 'center',
    lineHeight: 17,
  },
});

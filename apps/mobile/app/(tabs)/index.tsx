import { splitHousehold } from '@woyofal/core';
import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFoyer } from '../../src/foyer';
import { fcfa, kwh } from '../../src/format';
import { couleurTranche, couleurs, espaces, rayons } from '../../src/theme';
import { Carte, Chargement, Erreur, Pastille, Stat } from '../../src/ui';

/**
 * ONGLET 1 — TABLEAU DE BORD.
 *
 * Deux lectures du même foyer : ce qu'on possède, et qui le paye. La bascule
 * se fait en haut, sans quitter l'écran.
 *
 * La répartition entre colocataires est calculée par `splitHousehold`, le
 * MÊME code que le serveur et que le web. Une facture partagée est une source
 * de dispute : les trois plateformes doivent donner le centime près le même
 * résultat, ce qu'aucune réimplémentation ne garantirait.
 */
export default function TableauDeBord() {
  const { resume, rafraichir, erreur } = useFoyer();
  const [vue, setVue] = useState<'appareils' | 'colocation'>('appareils');
  const [rechargement, setRechargement] = useState(false);
  const marges = useSafeAreaInsets();

  const repartition = useMemo(() => {
    if (!resume || resume.members.length === 0) return null;
    return splitHousehold({
      month: resume.month,
      members: resume.members.map((m) => ({ id: m.id, name: m.name, color: m.color })),
      appliances: resume.appliances.map((a) => ({
        id: a.id,
        label: a.label,
        templateId: a.templateId,
        ownership: a.ownership,
        ownerId: a.ownerId,
        shares:
          a.shares.length > 0
            ? Object.fromEntries(a.shares.map((s) => [s.memberId, s.weight]))
            : undefined,
        consumption: a.consumption,
      })),
      punctualUsages: [],
      plan: resume.plan,
    });
  }, [resume]);

  if (erreur && !resume) return <Erreur message={erreur} onReessayer={rafraichir} />;
  if (!resume) return <Chargement texte="Chargement de votre foyer…" />;

  const { totals, bill, gauge, ranking, appliances, members } = resume;
  const remplissage = Math.min(1, totals.kwhPerMonth / gauge.scaleKwh);

  return (
    <ScrollView
      style={styles.fond}
      contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={
        <RefreshControl
          refreshing={rechargement}
          onRefresh={async () => {
            setRechargement(true);
            await rafraichir();
            setRechargement(false);
          }}
          tintColor={couleurs.teal500}
        />
      }
    >
      {/* --- Le montant, seule chose vraiment regardée ------------------- */}
      <View style={[styles.entete, { paddingTop: marges.top + espaces.l }]}>
        <Text style={styles.surTitre}>Facture estimée ce mois-ci</Text>
        <Text style={styles.montant}>{fcfa(bill.totalTTC)}</Text>
        <Text style={styles.detail}>{kwh(totals.kwhPerMonth)} ce mois-ci</Text>
        <Text style={styles.detail}>
          soit {kwh(totals.kwhPerDay)} et environ {fcfa(resume.dailyAmount)} par jour
        </Text>

        <View style={styles.besoins}>
          <Besoin
            emoji="🔁"
            titre="Ça tourne tout seul"
            parJour={totals.alwaysOnKwhPerDay}
            parMois={totals.alwaysOnKwhPerMonth}
          />
          <Besoin
            emoji="🎚️"
            titre="Vous les allumez"
            parJour={totals.switchableKwhPerDay}
            parMois={totals.switchableKwhPerMonth}
          />
        </View>

        {/* --- La jauge des tranches --------------------------------------- */}
        <View style={styles.jauge}>
          {gauge.segments.map((segment) => {
            const fin = segment.tier.toKwh ?? gauge.scaleKwh;
            const largeur = ((fin - segment.tier.fromKwh) / gauge.scaleKwh) * 100;
            return (
              <View
                key={segment.tier.order}
                style={{
                  width: `${largeur}%`,
                  backgroundColor: couleurTranche(segment.tier.order),
                  opacity: 0.35,
                  height: '100%',
                }}
              />
            );
          })}
          <View style={[styles.curseur, { left: `${remplissage * 100}%` }]} />
        </View>

        <Text style={styles.phrase}>
          {gauge.kwhToNextTier === null
            ? `🔴 Vous êtes dans la tranche la plus chère : ${fcfa(gauge.currentTier.pricePerKwh)} le kWh.`
            : `${gauge.currentTier.order === 1 ? '🟢' : '🟠'} Vous êtes en ${gauge.currentTier.label.toLowerCase()}. Encore ${kwh(gauge.kwhToNextTier)} avant que le prix n’augmente.`}
        </Text>
      </View>

      {/* --- La bascule ----------------------------------------------------- */}
      {members.length > 1 ? (
        <View style={styles.bascule}>
          {(
            [
              { id: 'appareils', label: '🔌 Mes appareils' },
              { id: 'colocation', label: '⚖️ Qui paie quoi' },
            ] as const
          ).map((item) => (
            <Text
              key={item.id}
              onPress={() => setVue(item.id)}
              style={[styles.basculeItem, vue === item.id && styles.basculeItemActif]}
            >
              {item.label}
            </Text>
          ))}
        </View>
      ) : null}

      <View style={styles.corps}>
        {vue === 'appareils' || members.length <= 1 ? (
          <>
            <Text style={styles.section}>🔁 Ça tourne tout seul</Text>
            <Text style={styles.sectionAide}>
              Même quand la maison est vide, 24h/24. {kwh(totals.alwaysOnKwhPerDay)} par jour.
            </Text>
            {ranking
              .filter((item) => item.alwaysOn)
              .map((item) => (
                <LigneAppareil
                  key={item.applianceId}
                  cout={item}
                  appareils={appliances}
                  membres={members}
                />
              ))}

            <Text style={[styles.section, { marginTop: espaces.xl }]}>🎚️ Vous les allumez</Text>
            <Text style={styles.sectionAide}>
              Là où vous pouvez agir. {kwh(totals.switchableKwhPerDay)} par jour.
            </Text>
            {ranking
              .filter((item) => !item.alwaysOn)
              .map((item) => (
                <LigneAppareil
                  key={item.applianceId}
                  cout={item}
                  appareils={appliances}
                  membres={members}
                />
              ))}

            {appliances.length === 0 ? (
              <Carte>
                <Text style={styles.vide}>
                  🔌 Aucun appareil pour l’instant. Ajoutez-les depuis l’application web, ou
                  refaites l’accueil.
                </Text>
              </Carte>
            ) : null}
          </>
        ) : (
          <>
            <Text style={styles.section}>⚖️ La part de chacun</Text>
            <Text style={styles.sectionAide}>
              Les appareils communs sont divisés entre les occupants ; les appareils personnels
              restent à leur propriétaire.
            </Text>
            {repartition?.members.map((part) => (
              <Carte key={part.memberId} style={{ marginBottom: espaces.s }}>
                <View style={styles.lignePart}>
                  <Pastille nom={part.name} couleur={part.color} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.nomPart}>{part.name}</Text>
                    <Text style={styles.detailPart}>
                      {kwh(part.kwhTotal)} · {part.sharePercent}% de la maison
                    </Text>
                  </View>
                  <Text style={styles.montantPart}>{fcfa(part.amountToPay)}</Text>
                </View>
                <View style={styles.barre}>
                  <View
                    style={{
                      width: `${Math.min(100, part.sharePercent)}%`,
                      backgroundColor: part.color,
                      height: '100%',
                      borderRadius: 999,
                    }}
                  />
                </View>
              </Carte>
            ))}

            <View style={styles.stats}>
              <Stat
                label="Total du foyer"
                valeur={fcfa(repartition?.totalAmount ?? 0)}
                aide={`${kwh(repartition?.totalKwh ?? 0)} ce mois-ci`}
              />
              <Stat
                label="Prix moyen"
                valeur={fcfa(repartition?.averagePricePerKwh ?? 0)}
                aide="par kWh, tranches comprises"
              />
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
}

function Besoin({
  emoji,
  titre,
  parJour,
  parMois,
}: {
  emoji: string;
  titre: string;
  parJour: number;
  parMois: number;
}) {
  return (
    <View style={styles.besoin}>
      <Text style={styles.besoinTitre}>
        {emoji} {titre}
      </Text>
      <Text style={styles.besoinValeur}>{kwh(parJour)}</Text>
      <Text style={styles.besoinAide}>par jour</Text>
      <Text style={styles.besoinMois}>{kwh(parMois)}</Text>
      <Text style={styles.besoinAide}>ce mois-ci</Text>
    </View>
  );
}

function LigneAppareil({
  cout,
  appareils,
  membres,
}: {
  cout: { applianceId: string; label: string; amountPerMonth: number; kwhPerMonth: number };
  appareils: Array<{
    id: string;
    emoji: string;
    quantity: number;
    ownership: string;
    ownerId: string | null;
    shares: Array<{ memberId: string }>;
    consumption: { kwhPerDay: number };
  }>;
  membres: Array<{ id: string; name: string; color: string }>;
}) {
  const appareil = appareils.find((a) => a.id === cout.applianceId);
  // Qui porte cet appareil : son propriétaire, les personnes désignées, ou tout
  // le foyer si rien n'a été restreint.
  const porteurs = !appareil
    ? membres
    : appareil.ownership === 'PRIVATE'
      ? membres.filter((m) => m.id === appareil.ownerId)
      : appareil.shares.length > 0
        ? membres.filter((m) => appareil.shares.some((s) => s.memberId === m.id))
        : membres;

  return (
    <Carte style={{ marginBottom: espaces.s }}>
      <View style={styles.ligneAppareil}>
        <Text style={{ fontSize: 26 }}>{appareil?.emoji ?? '🔌'}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.nomAppareil}>
            {cout.label}
            {appareil && appareil.quantity > 1 ? `  ×${appareil.quantity}` : ''}
          </Text>
          <Text style={styles.detailAppareil}>
            {kwh(appareil?.consumption.kwhPerDay ?? 0)}/jour · {kwh(cout.kwhPerMonth)}/mois
          </Text>
          <View style={styles.porteurs}>
            {porteurs.slice(0, 5).map((membre) => (
              <Pastille key={membre.id} nom={membre.name} couleur={membre.color} />
            ))}
            {porteurs.length === membres.length && membres.length > 1 ? (
              <Text style={styles.detailAppareil}>tout le monde</Text>
            ) : porteurs.length === 1 ? (
              <Text style={styles.detailAppareil}>{porteurs[0]?.name}</Text>
            ) : null}
          </View>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.montantAppareil}>{fcfa(cout.amountPerMonth)}</Text>
          <Text style={styles.detailAppareil}>par mois</Text>
        </View>
      </View>
    </Carte>
  );
}

const styles = StyleSheet.create({
  fond: { flex: 1, backgroundColor: couleurs.sable50 },
  entete: {
    backgroundColor: couleurs.teal600,
    paddingHorizontal: espaces.xl,
    paddingBottom: espaces.xl,
  },
  surTitre: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '700' },
  montant: { color: couleurs.blanc, fontSize: 44, fontWeight: '900', marginTop: 2 },
  detail: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '700' },
  besoins: { flexDirection: 'row', gap: espaces.s, marginTop: espaces.l },
  besoin: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: rayons.m,
    padding: espaces.m,
  },
  besoinTitre: { color: couleurs.blanc, fontSize: 12, fontWeight: '900' },
  besoinValeur: { color: couleurs.blanc, fontSize: 18, fontWeight: '900', marginTop: espaces.xs },
  besoinMois: { color: couleurs.blanc, fontSize: 14, fontWeight: '900', marginTop: espaces.xs },
  besoinAide: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '700' },
  jauge: {
    flexDirection: 'row',
    height: 18,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginTop: espaces.xl,
  },
  curseur: {
    position: 'absolute',
    top: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: couleurs.blanc,
    marginLeft: -9,
  },
  phrase: {
    marginTop: espaces.m,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: rayons.m,
    padding: espaces.m,
    color: couleurs.blanc,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
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
  section: { fontSize: 17, fontWeight: '900', color: couleurs.encre },
  sectionAide: {
    fontSize: 13,
    fontWeight: '700',
    color: couleurs.encreDouce,
    marginBottom: espaces.s,
  },
  ligneAppareil: { flexDirection: 'row', alignItems: 'center', gap: espaces.m },
  nomAppareil: { fontSize: 15, fontWeight: '800', color: couleurs.encre },
  detailAppareil: { fontSize: 11, fontWeight: '700', color: couleurs.encreGrise },
  montantAppareil: { fontSize: 17, fontWeight: '900', color: couleurs.encre },
  porteurs: { flexDirection: 'row', alignItems: 'center', gap: espaces.xs, marginTop: espaces.xs },
  lignePart: { flexDirection: 'row', alignItems: 'center', gap: espaces.m },
  nomPart: { fontSize: 16, fontWeight: '900', color: couleurs.encre },
  detailPart: { fontSize: 12, fontWeight: '700', color: couleurs.encreGrise },
  montantPart: { fontSize: 18, fontWeight: '900', color: couleurs.teal700 },
  barre: {
    height: 8,
    borderRadius: 999,
    backgroundColor: couleurs.sable100,
    marginTop: espaces.m,
    overflow: 'hidden',
  },
  stats: { flexDirection: 'row', gap: espaces.s, marginTop: espaces.m },
  vide: { fontSize: 14, fontWeight: '700', color: couleurs.encreDouce, lineHeight: 20 },
});

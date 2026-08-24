import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ErreurApi, api } from '../../src/api';
import { useFoyer } from '../../src/foyer';
import { dateLongue, fcfa, kwh } from '../../src/format';
import { couleurs, espaces, rayons } from '../../src/theme';
import type { Releve } from '../../src/types';
import { Bouton, Carte, Chargement, Erreur, Stat } from '../../src/ui';

/**
 * ONGLET 3 — LE COMPTEUR.
 *
 * Le seul écran qui MESURE au lieu d'estimer. On y recopie le nombre affiché
 * sur le boîtier mural, et ce nombre écrase l'estimation.
 *
 * Sur téléphone, cet écran a un avantage que le web n'a pas : on l'utilise
 * debout, devant le compteur. D'où le grand champ et le clavier décimal ouvert
 * d'emblée.
 */
export default function Compteur() {
  const { resume, foyerId, rafraichir } = useFoyer();
  const [valeur, setValeur] = useState('');
  const [historique, setHistorique] = useState<Releve[] | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState(false);
  const marges = useSafeAreaInsets();

  const charger = useCallback(async () => {
    if (!foyerId) return;
    try {
      const { readings } = await api.get<{ readings: Releve[] }>(
        `/api/households/${foyerId}/readings`,
      );
      setHistorique(readings);
    } catch {
      setHistorique([]);
    }
  }, [foyerId]);

  useEffect(() => {
    void charger();
  }, [charger]);

  async function enregistrer() {
    const nombre = Number(valeur.replace(',', '.'));
    if (!Number.isFinite(nombre) || nombre < 0) {
      setErreur('Entrez le nombre affiché sur votre compteur, par exemple 47,3.');
      return;
    }
    setEnvoi(true);
    setErreur(null);
    try {
      await api.post(`/api/households/${foyerId}/readings`, { remainingKwh: nombre });
      setValeur('');
      setSucces(true);
      setTimeout(() => setSucces(false), 2600);
      await Promise.all([rafraichir(), charger()]);
    } catch (e) {
      setErreur(e instanceof ErreurApi ? e.message : 'Enregistrement impossible.');
    } finally {
      setEnvoi(false);
    }
  }

  if (!resume) return <Chargement />;
  const { consumedSoFar, credit, totals, gauge } = resume;
  const derive = consumedSoFar.driftPercent;

  return (
    <ScrollView style={styles.fond} contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={[styles.entete, { paddingTop: marges.top + espaces.l }]}>
        <Text style={styles.surTitre}>Sur votre boîtier Woyofal</Text>
        {credit ? (
          <>
            <Text style={styles.montant}>{kwh(credit.remainingKwh)}</Text>
            <Text
              style={[
                styles.alerte,
                credit.level === 'urgent'
                  ? { backgroundColor: 'rgba(239,68,68,0.9)' }
                  : credit.level === 'bientot'
                    ? { backgroundColor: 'rgba(245,158,11,0.9)' }
                    : null,
              ]}
            >
              {credit.level === 'urgent' ? '🚨 ' : credit.level === 'bientot' ? '⚠️ ' : '✅ '}
              {credit.message}
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.jamais}>Jamais relevé</Text>
            <Text style={styles.alerte}>
              Recopiez une fois le nombre affiché sur votre compteur : l’application saura
              exactement où vous en êtes, au lieu de le deviner.
            </Text>
          </>
        )}
      </View>

      <View style={styles.corps}>
        <Carte>
          <Text style={styles.titre}>🔢 Que dit votre compteur ?</Text>
          <Text style={styles.aide}>
            Le nombre affiché sur le petit écran blanc, au mur. C’est le courant qu’il vous reste.
          </Text>

          <View style={styles.ligneChamp}>
            <TextInput
              value={valeur}
              onChangeText={setValeur}
              keyboardType="decimal-pad"
              placeholder="47,3"
              placeholderTextColor={couleurs.encreGrise}
              style={styles.champ}
            />
            <Text style={styles.unite}>kWh</Text>
          </View>

          {erreur ? <Text style={styles.texteErreur}>{erreur}</Text> : null}

          <Bouton
            titre={envoi ? 'Enregistrement…' : '✅ C’est ce qui est affiché'}
            onPress={enregistrer}
            desactive={envoi || valeur.trim() === ''}
            style={{ marginTop: espaces.m }}
          />

          {succes ? (
            <Text style={styles.succes}>
              🎯 C’est noté. Vos estimations viennent d’être recalées sur la réalité.
            </Text>
          ) : null}
        </Carte>

        <Carte style={{ marginTop: espaces.m }}>
          <Text style={styles.titre}>📅 Où en est votre mois</Text>
          <View style={styles.stats}>
            <Stat
              label="Consommé depuis le 1er"
              valeur={kwh(consumedSoFar.kwh)}
              aide={
                consumedSoFar.source === 'compteur'
                  ? 'Mesuré sur votre compteur'
                  : consumedSoFar.source === 'mixte'
                    ? `Mesuré à ${Math.round(consumedSoFar.measuredRatio * 100)} %`
                    : 'Estimé d’après vos appareils'
              }
            />
            <Stat
              label="Prévu fin du mois"
              valeur={kwh(consumedSoFar.projectedMonthKwh)}
              aide={`Au rythme de ${kwh(totals.kwhPerDay)} par jour`}
            />
            <Stat
              label="Tranche en cours"
              valeur={gauge.currentTier.label}
              aide={`${fcfa(gauge.currentTier.pricePerKwh)} le kWh`}
            />
          </View>

          {derive !== null ? (
            <Text
              style={[
                styles.derive,
                Math.abs(derive) <= 10
                  ? { backgroundColor: 'rgba(34,197,94,0.15)' }
                  : { backgroundColor: 'rgba(251,191,36,0.2)' },
              ]}
            >
              {Math.abs(derive) <= 10
                ? '👌 L’application tombe juste : moins de 10 % d’écart avec votre compteur.'
                : derive > 0
                  ? `📈 Vous consommez ${derive} % de plus que prévu. Il manque sans doute un appareil dans votre inventaire.`
                  : `📉 Vous consommez ${-derive} % de moins que prévu. Vos appareils tournent moins que déclaré.`}
            </Text>
          ) : null}
        </Carte>

        <Text style={[styles.titre, { marginTop: espaces.xl, marginBottom: espaces.s }]}>
          📖 Vos relevés
        </Text>
        {historique === null ? (
          <Text style={styles.aide}>Chargement…</Text>
        ) : historique.length === 0 ? (
          <Carte>
            <Text style={styles.aide}>
              Aucun relevé pour l’instant. Le premier prend dix secondes et change tout.
            </Text>
          </Carte>
        ) : (
          historique.map((releve) => (
            <Carte key={releve.id} style={{ marginBottom: espaces.s }}>
              <Text style={styles.releve}>{kwh(releve.remainingKwh)} restants</Text>
              <Text style={styles.aide}>
                {dateLongue(releve.readAt)}
                {releve.consumedKwh !== null
                  ? ` · ${kwh(releve.consumedKwh)} consommés depuis le précédent`
                  : ''}
              </Text>
            </Carte>
          ))
        )}
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
  surTitre: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '700' },
  montant: { color: couleurs.blanc, fontSize: 44, fontWeight: '900', marginTop: 2 },
  jamais: { color: couleurs.blanc, fontSize: 28, fontWeight: '900', marginTop: 2 },
  alerte: {
    marginTop: espaces.m,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: rayons.m,
    padding: espaces.m,
    color: couleurs.blanc,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
  corps: { padding: espaces.l },
  titre: { fontSize: 17, fontWeight: '900', color: couleurs.encre },
  aide: { fontSize: 13, fontWeight: '700', color: couleurs.encreDouce, lineHeight: 19 },
  ligneChamp: { flexDirection: 'row', alignItems: 'center', gap: espaces.m, marginTop: espaces.m },
  champ: {
    flex: 1,
    backgroundColor: couleurs.sable50,
    borderWidth: 2,
    borderColor: couleurs.sable200,
    borderRadius: rayons.m,
    paddingHorizontal: espaces.l,
    paddingVertical: espaces.m,
    fontSize: 30,
    fontWeight: '900',
    color: couleurs.encre,
  },
  unite: { fontSize: 17, fontWeight: '900', color: couleurs.encreGrise },
  texteErreur: { marginTop: espaces.s, fontSize: 13, fontWeight: '700', color: couleurs.tranche3 },
  succes: {
    marginTop: espaces.m,
    backgroundColor: 'rgba(34,197,94,0.15)',
    borderRadius: rayons.m,
    padding: espaces.m,
    fontSize: 13,
    fontWeight: '700',
    color: couleurs.encre,
  },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: espaces.s, marginTop: espaces.m },
  derive: {
    marginTop: espaces.m,
    borderRadius: rayons.m,
    padding: espaces.m,
    fontSize: 13,
    fontWeight: '700',
    color: couleurs.encre,
    lineHeight: 19,
  },
  releve: { fontSize: 16, fontWeight: '800', color: couleurs.encre },
});

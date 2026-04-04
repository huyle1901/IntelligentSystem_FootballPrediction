import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from "react-native";

import { api } from "../api";
import { colors } from "../theme";

export default function TeamDetailScreen({ teamName, league, onBack, onOpenMatch }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [overview, setOverview] = useState(null);
  const [players, setPlayers] = useState([]);
  const [playersWarning, setPlayersWarning] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.getTeamOverview(teamName, league, "user");
        setOverview(data);

        const maybeTeamId = data.next_matches?.[0]?.home_team === teamName
          ? data.next_matches?.[0]?.home_team_id
          : data.next_matches?.[0]?.away_team_id;

        const playersRes = await api.getTeamPlayers(teamName, league, maybeTeamId, "user");
        setPlayers(playersRes.items || []);
        setPlayersWarning(playersRes.warning || null);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [teamName, league]);

  async function handlePlayerPress(playerName) {
    try {
      await api.trackPlayerView(playerName, league, teamName, "user");
    } catch (_e) {
      // Track failure should not block UX
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Loi: {error}</Text>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>Quay lai</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Text style={styles.backButtonText}>Quay lai</Text>
      </TouchableOpacity>

      <Text style={styles.teamTitle}>{teamName}</Text>
      <Text style={styles.teamMeta}>League: {league}</Text>

      <Text style={styles.sectionTitle}>5 tran gan nhat</Text>
      {(overview?.recent_matches || []).map((match, idx) => (
        <View key={`${match.date}-${idx}`} style={styles.card}>
          <Text style={styles.cardTitle}>{match.home_team} {match.home_goals} - {match.away_goals} {match.away_team}</Text>
          <Text style={styles.cardMeta}>{match.date} | Ket qua doi: {match.team_outcome || "N/A"}</Text>
        </View>
      ))}

      <Text style={styles.sectionTitle}>Tran sap toi</Text>
      {(overview?.next_matches || []).map((match) => (
        <TouchableOpacity key={match.match_id} style={styles.card} onPress={() => onOpenMatch(match, league)}>
          <Text style={styles.cardTitle}>{match.home_team} vs {match.away_team}</Text>
          <Text style={styles.cardMeta}>{match.date}</Text>
        </TouchableOpacity>
      ))}

      <Text style={styles.sectionTitle}>Cau thu</Text>
      {playersWarning ? <Text style={styles.warnText}>{playersWarning}</Text> : null}
      {players.map((player) => (
        <TouchableOpacity key={player.id || player.name} style={styles.playerRow} onPress={() => handlePlayerPress(player.name)}>
          <Text style={styles.playerName}>{player.name}</Text>
          <Text style={styles.playerMeta}>{player.position || "Unknown"} | {player.nationality || "N/A"}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  backButton: {
    backgroundColor: colors.surface,
    alignSelf: "flex-start",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  backButtonText: {
    color: colors.text,
    fontWeight: "600",
  },
  teamTitle: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "700",
  },
  teamMeta: {
    color: colors.muted,
    marginBottom: 12,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
    marginTop: 12,
    marginBottom: 8,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  cardTitle: {
    color: colors.text,
    fontWeight: "700",
  },
  cardMeta: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 4,
  },
  playerRow: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  playerName: {
    color: colors.text,
    fontWeight: "700",
  },
  playerMeta: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  warnText: {
    color: colors.accent,
    marginBottom: 8,
  },
  errorText: {
    color: colors.danger,
  },
});

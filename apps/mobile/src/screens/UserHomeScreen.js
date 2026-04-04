import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from "react-native";

import { api } from "../api";
import { colors } from "../theme";

export default function UserHomeScreen({ onOpenTeam, onOpenMatch }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [leagues, setLeagues] = useState([]);
  const [selectedLeague, setSelectedLeague] = useState(null);
  const [upcomingMatches, setUpcomingMatches] = useState([]);
  const [teams, setTeams] = useState([]);

  async function loadBaseData(initialLeague) {
    try {
      const [matchesRes, teamsRes] = await Promise.all([
        api.getUpcomingMatches(initialLeague, "user"),
        api.getTeamsByLeague(initialLeague, "user"),
      ]);
      setUpcomingMatches(matchesRes.items || []);
      setTeams(teamsRes.items || []);
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    async function bootstrap() {
      try {
        const leagueRes = await api.getLeagues("user");
        const items = leagueRes.items || [];
        setLeagues(items);

        if (items.length > 0) {
          const firstLeague = items[0].code;
          setSelectedLeague(firstLeague);
          await loadBaseData(firstLeague);
        }
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }

    bootstrap();
  }, []);

  async function onChangeLeague(leagueCode) {
    setSelectedLeague(leagueCode);
    setLoading(true);
    setError(null);
    await loadBaseData(leagueCode);
    setLoading(false);
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
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Giai dau</Text>
      <View style={styles.rowWrap}>
        {leagues.map((league) => (
          <TouchableOpacity
            key={league.code}
            style={[styles.pill, selectedLeague === league.code ? styles.pillActive : null]}
            onPress={() => onChangeLeague(league.code)}
          >
            <Text style={styles.pillText}>{league.code}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Tran sap dien ra</Text>
      {upcomingMatches.map((match) => (
        <TouchableOpacity key={match.match_id} style={styles.card} onPress={() => onOpenMatch(match, selectedLeague)}>
          <Text style={styles.cardTitle}>{match.home_team} vs {match.away_team}</Text>
          <Text style={styles.cardMeta}>{match.date}</Text>
          <Text style={styles.cardMeta}>{match.league_name}</Text>
        </TouchableOpacity>
      ))}

      <Text style={styles.sectionTitle}>Doi bong</Text>
      <View style={styles.rowWrap}>
        {teams.map((team) => (
          <TouchableOpacity key={team} style={styles.pill} onPress={() => onOpenTeam(team, selectedLeague)}>
            <Text style={styles.pillText}>{team}</Text>
          </TouchableOpacity>
        ))}
      </View>
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
  errorText: {
    color: colors.danger,
    fontSize: 14,
    paddingHorizontal: 16,
    textAlign: "center",
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
    marginTop: 12,
    marginBottom: 10,
  },
  rowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  pill: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  pillActive: {
    backgroundColor: colors.accent,
  },
  pillText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "600",
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  cardMeta: {
    color: colors.muted,
    fontSize: 12,
  },
});

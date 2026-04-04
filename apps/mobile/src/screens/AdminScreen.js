import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from "react-native";

import { api } from "../api";
import { colors } from "../theme";

export default function AdminScreen({ onExit }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [topTeams, setTopTeams] = useState([]);
  const [topPlayers, setTopPlayers] = useState([]);

  useEffect(() => {
    async function load() {
      try {
        const [teamsRes, playersRes] = await Promise.all([
          api.getTopTeams("admin"),
          api.getTopPlayers("admin"),
        ]);
        setTopTeams(teamsRes.items || []);
        setTopPlayers(playersRes.items || []);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity style={styles.exitButton} onPress={onExit}>
        <Text style={styles.exitButtonText}>Doi role</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Admin Analytics</Text>
      {error ? <Text style={styles.errorText}>Loi: {error}</Text> : null}

      <Text style={styles.sectionTitle}>Top doi duoc truy cap</Text>
      {topTeams.map((item, idx) => (
        <View key={`${item.team_name}-${idx}`} style={styles.card}>
          <Text style={styles.cardTitle}>{idx + 1}. {item.team_name}</Text>
          <Text style={styles.cardMeta}>League: {item.league} | Views: {item.views}</Text>
        </View>
      ))}

      <Text style={styles.sectionTitle}>Top cau thu duoc truy cap</Text>
      {topPlayers.map((item, idx) => (
        <View key={`${item.player_name}-${idx}`} style={styles.card}>
          <Text style={styles.cardTitle}>{idx + 1}. {item.player_name}</Text>
          <Text style={styles.cardMeta}>Team: {item.team_name || "N/A"} | League: {item.league || "N/A"}</Text>
          <Text style={styles.cardMeta}>Views: {item.views}</Text>
        </View>
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
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "700",
    marginTop: 10,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
    marginTop: 14,
    marginBottom: 8,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 10,
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
    marginTop: 3,
  },
  exitButton: {
    alignSelf: "flex-start",
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  exitButtonText: {
    color: colors.text,
  },
  errorText: {
    color: colors.danger,
    marginTop: 8,
  },
});

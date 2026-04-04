import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from "react-native";

import { api } from "../api";
import { colors } from "../theme";

export default function DataScientistScreen({ onExit }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboard, setDashboard] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const response = await api.getDataScientistDashboard("data_scientist");
        setDashboard(response);
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

      <Text style={styles.title}>Data Scientist Dashboard</Text>
      {error ? <Text style={styles.errorText}>Loi: {error}</Text> : null}

      <View style={styles.kpiCard}>
        <Text style={styles.kpiLabel}>Average Accuracy</Text>
        <Text style={styles.kpiValue}>{dashboard?.average_accuracy ?? "N/A"}</Text>
      </View>

      {(dashboard?.items || []).map((item) => (
        <View key={item.league} style={styles.card}>
          <Text style={styles.cardTitle}>{item.league_name} ({item.league})</Text>
          <Text style={styles.metric}>Samples: {item.samples}</Text>
          <Text style={styles.metric}>Accuracy: {item.accuracy}</Text>
          <Text style={styles.metric}>Precision: {item.precision}</Text>
          <Text style={styles.metric}>Recall: {item.recall}</Text>
          <Text style={styles.metric}>F1: {item.f1}</Text>
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
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "700",
    marginTop: 10,
    marginBottom: 10,
  },
  kpiCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  kpiLabel: {
    color: colors.muted,
  },
  kpiValue: {
    color: colors.accent,
    fontSize: 34,
    fontWeight: "800",
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  cardTitle: {
    color: colors.text,
    fontWeight: "700",
    marginBottom: 4,
  },
  metric: {
    color: colors.muted,
    fontSize: 13,
    marginBottom: 2,
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
    marginBottom: 10,
  },
});

import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";

import { api } from "../api";
import { colors } from "../theme";

export default function MatchDetailScreen({ match, league, onBack }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [payload, setPayload] = useState(null);

  useEffect(() => {
    async function loadPrediction() {
      try {
        const response = await api.getMatchPrediction(match.match_id, league, "user");
        setPayload(response);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }

    loadPrediction();
  }, [match.match_id, league]);

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
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>Quay lai</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const prediction = payload?.prediction || {};
  const isOver = prediction.prediction === "over_2_5";

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Text style={styles.backButtonText}>Quay lai</Text>
      </TouchableOpacity>

      <Text style={styles.title}>{payload?.match?.home_team} vs {payload?.match?.away_team}</Text>
      <Text style={styles.meta}>{payload?.match?.date}</Text>
      <Text style={styles.meta}>{payload?.match?.league_name}</Text>

      <View style={styles.resultCard}>
        <Text style={styles.resultLabel}>Du doan model</Text>
        <Text style={[styles.resultValue, { color: isOver ? colors.accent : colors.text }]}>
          {prediction.prediction === "unknown" ? "Khong du du lieu" : isOver ? "Over 2.5" : "Under 2.5"}
        </Text>
        <Text style={styles.probText}>P(Over): {prediction.over_2_5_probability ?? "N/A"}</Text>
        <Text style={styles.probText}>P(Under): {prediction.under_2_5_probability ?? "N/A"}</Text>
        {prediction.reason ? <Text style={styles.reason}>{prediction.reason}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
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
    marginTop: 8,
  },
  meta: {
    color: colors.muted,
    marginTop: 4,
  },
  resultCard: {
    marginTop: 18,
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
  },
  resultLabel: {
    color: colors.muted,
    marginBottom: 8,
  },
  resultValue: {
    fontSize: 30,
    fontWeight: "800",
    marginBottom: 10,
  },
  probText: {
    color: colors.text,
    fontSize: 14,
    marginBottom: 2,
  },
  reason: {
    color: colors.accent,
    marginTop: 8,
  },
  backButton: {
    backgroundColor: colors.surface,
    alignSelf: "flex-start",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backButtonText: {
    color: colors.text,
    fontWeight: "600",
  },
  errorText: {
    color: colors.danger,
  },
});

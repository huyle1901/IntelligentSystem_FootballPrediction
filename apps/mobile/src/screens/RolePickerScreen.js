import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

import { colors } from "../theme";

const ROLE_OPTIONS = [
  { key: "user", label: "User" },
  { key: "data_scientist", label: "Data Scientist" },
  { key: "admin", label: "Admin" },
];

export default function RolePickerScreen({ onSelectRole }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>AI Football Predictions</Text>
      <Text style={styles.subtitle}>Chon role de vao dashboard</Text>

      {ROLE_OPTIONS.map((item) => (
        <TouchableOpacity key={item.key} style={styles.button} onPress={() => onSelectRole(item.key)}>
          <Text style={styles.buttonText}>{item.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: {
    color: colors.text,
    fontSize: 32,
    fontWeight: "700",
    marginBottom: 10,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 15,
    marginBottom: 32,
  },
  button: {
    width: "100%",
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  buttonText: {
    color: colors.text,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
  },
});

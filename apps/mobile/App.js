import React, { useMemo, useState } from "react";
import { SafeAreaView, StyleSheet, StatusBar } from "react-native";

import RolePickerScreen from "./src/screens/RolePickerScreen";
import UserHomeScreen from "./src/screens/UserHomeScreen";
import TeamDetailScreen from "./src/screens/TeamDetailScreen";
import MatchDetailScreen from "./src/screens/MatchDetailScreen";
import DataScientistScreen from "./src/screens/DataScientistScreen";
import AdminScreen from "./src/screens/AdminScreen";
import { colors } from "./src/theme";

export default function App() {
  const [role, setRole] = useState(null);
  const [userScreen, setUserScreen] = useState("home");
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [selectedMatch, setSelectedMatch] = useState(null);

  const content = useMemo(() => {
    if (!role) {
      return <RolePickerScreen onSelectRole={setRole} />;
    }

    if (role === "data_scientist") {
      return <DataScientistScreen onExit={() => setRole(null)} />;
    }

    if (role === "admin") {
      return <AdminScreen onExit={() => setRole(null)} />;
    }

    if (userScreen === "team" && selectedTeam) {
      return (
        <TeamDetailScreen
          teamName={selectedTeam.teamName}
          league={selectedTeam.league}
          onBack={() => setUserScreen("home")}
          onOpenMatch={(match, league) => {
            setSelectedMatch({ match, league });
            setUserScreen("match");
          }}
        />
      );
    }

    if (userScreen === "match" && selectedMatch) {
      return (
        <MatchDetailScreen
          match={selectedMatch.match}
          league={selectedMatch.league}
          onBack={() => setUserScreen("home")}
        />
      );
    }

    return (
      <UserHomeScreen
        onOpenTeam={(teamName, league) => {
          setSelectedTeam({ teamName, league });
          setUserScreen("team");
        }}
        onOpenMatch={(match, league) => {
          setSelectedMatch({ match, league });
          setUserScreen("match");
        }}
      />
    );
  }, [role, userScreen, selectedTeam, selectedMatch]);

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" />
      {content}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
});

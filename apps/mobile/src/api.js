const DEFAULT_BASE_URL = "http://localhost:8000/api/v1";

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || DEFAULT_BASE_URL;

async function request(path, role, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Role": role,
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(payload || `HTTP ${response.status}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export const api = {
  getLeagues: (role = "user") => request("/user/leagues", role),
  getUpcomingMatches: (league, role = "user") => {
    const query = league ? `?league=${encodeURIComponent(league)}` : "";
    return request(`/user/matches/upcoming${query}`, role);
  },
  getTeamsByLeague: (league, role = "user") =>
    request(`/user/leagues/${encodeURIComponent(league)}/teams`, role),
  getTeamOverview: (teamName, league, role = "user") =>
    request(`/user/teams/${encodeURIComponent(teamName)}/overview?league=${encodeURIComponent(league)}`, role),
  getMatchPrediction: (matchId, league, role = "user") =>
    request(`/user/matches/${encodeURIComponent(matchId)}/prediction?league=${encodeURIComponent(league)}`, role),
  getTeamPlayers: (teamName, league, teamId, role = "user") => {
    const teamIdQuery = teamId ? `&team_id=${teamId}` : "";
    return request(`/user/teams/${encodeURIComponent(teamName)}/players?league=${encodeURIComponent(league)}${teamIdQuery}`, role);
  },
  trackPlayerView: (playerName, league, teamName, role = "user") =>
    request(
      `/user/players/${encodeURIComponent(playerName)}/view?league=${encodeURIComponent(league)}&team_name=${encodeURIComponent(teamName)}`,
      role,
      { method: "POST" },
    ),
  getDataScientistDashboard: (role = "data_scientist") => request("/data-scientist/dashboard", role),
  getTopTeams: (role = "admin") => request("/admin/analytics/top-teams", role),
  getTopPlayers: (role = "admin") => request("/admin/analytics/top-players", role),
};

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from "recharts";
import {
  BarChart3,
  CalendarDays,
  ChevronRight,
  LayoutDashboard,
  ShieldCheck,
  Star,
  Target,
  UserRound,
  Users,
} from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api/v1";

const DEVICE_USER_ID_STORAGE_KEY = "afp_device_user_id";
const AUTH_USER_STORAGE_KEY = "afp_auth_user";

function generateUserId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `user_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function getOrCreateDeviceUserId() {
  if (typeof window === "undefined") {
    return "anonymous";
  }

  const existing = window.localStorage.getItem(DEVICE_USER_ID_STORAGE_KEY);
  if (existing) {
    return existing;
  }

  const nextId = generateUserId();
  window.localStorage.setItem(DEVICE_USER_ID_STORAGE_KEY, nextId);
  return nextId;
}

function readAuthUser() {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(AUTH_USER_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}

function saveAuthUser(user) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user));
}

function clearAuthUser() {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(AUTH_USER_STORAGE_KEY);
}

function getCurrentUserId() {
  const authUser = readAuthUser();
  if (authUser?.user_id) {
    return authUser.user_id;
  }
  return getOrCreateDeviceUserId();
}

const ROLE_TABS = [
  { id: "user", label: "User", icon: UserRound },
  { id: "scientist", label: "Data Scientist", icon: LayoutDashboard },
  { id: "admin", label: "Admin", icon: ShieldCheck },
];

const MODEL_OPTIONS = [
  { value: "ensemble", label: "Ensemble" },
  { value: "random_forest", label: "Random Forest" },
];

function modelLabel(modelType) {
  return MODEL_OPTIONS.find((item) => item.value === modelType)?.label || modelType || "unknown";
}

function formatFeatureLabel(feature) {
  if (!feature) return "-";

  const compact = feature
    .replace("Last5", "L5 ")
    .replace("Home", "H ")
    .replace("Away", "A ")
    .replace("Over2.5", "O2.5")
    .replace("Goals", "G")
    .replace("Conceded", "Con")
    .replace("Scored", "Sco")
    .replace("Perc", "%")
    .replace("Count", "Cnt")
    .replace("Avg", "Avg ");

  return compact.length > 20 ? `${compact.slice(0, 20)}...` : compact;
}
async function fetchJson(path, role, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "X-Role": role, "X-User-Id": getCurrentUserId(), ...(options.headers || {}) },
    method: options.method || "GET",
    body: options.body,
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

function StatCard({ title, value, sub, Icon }) {
  return (
    <div className="card stat-card">
      <div>
        <p className="muted">{title}</p>
        <h3>{value}</h3>
        <p className="small muted">{sub}</p>
      </div>
      <div className="icon-bubble">
        <Icon size={18} />
      </div>
    </div>
  );
}

function SectionTitle({ title, subtitle }) {
  return (
    <div className="section-title">
      <h3>{title}</h3>
      <p className="muted">{subtitle}</p>
    </div>
  );
}


function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [registerRole, setRegisterRole] = useState("user");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const path = mode === "register" ? "/user/auth/register" : "/user/auth/login";
      const body =
        mode === "register"
          ? { username, password, display_name: displayName || username, role: registerRole }
          : { username, password };

      const payload = await fetchJson(path, "user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const user = payload.user;
      saveAuthUser(user);
      onAuthenticated(user);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="card auth-card">
        <h2>{mode === "register" ? "Create account" : "Login"}</h2>
        <p className="muted">Use an account so admin can manage activity per user.</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <label>Username</label>
          <input className="text-input" value={username} onChange={(e) => setUsername(e.target.value)} required />

          {mode === "register" && (
            <>
              <label>Display name</label>
              <input className="text-input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />

              <label>Role</label>
              <select className="text-input" value={registerRole} onChange={(e) => setRegisterRole(e.target.value)}>
                <option value="user">user</option>
                <option value="data_scientist">data_scientist</option>
                <option value="admin">admin</option>
              </select>
            </>
          )}

          <label>Password</label>
          <input
            className="text-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && <div className="error-box">{error}</div>}

          <button className="role-btn active" type="submit" disabled={loading}>
            {loading ? "Please wait..." : mode === "register" ? "Register" : "Login"}
          </button>
        </form>

        <div style={{ marginTop: 10 }}>
          <button
            className="role-btn"
            onClick={() => setMode(mode === "register" ? "login" : "register")}
            type="button"
          >
            {mode === "register" ? "Have account? Login" : "No account? Register"}
          </button>
        </div>
      </div>
    </div>
  );
}
function UserDashboard({ authUser }) {
  const [leagues, setLeagues] = useState([]);
  const [selectedLeague, setSelectedLeague] = useState("");
  const [userView, setUserView] = useState("matches");

  const [matches, setMatches] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [predictionExplanation, setPredictionExplanation] = useState(null);
  const [selectedModelType, setSelectedModelType] = useState("ensemble");

  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState("");
  const [teamOverview, setTeamOverview] = useState(null);
  const [teamPlayers, setTeamPlayers] = useState([]);
  const [teamId, setTeamId] = useState(null);

  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [playerDetail, setPlayerDetail] = useState(null);
  const [playerWarning, setPlayerWarning] = useState("");

  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [showReport, setShowReport] = useState(false);
  const [reportType, setReportType] = useState("Wrong prediction");
  const [reportText, setReportText] = useState("");

  useEffect(() => {
    async function loadLeagues() {
      try {
        await fetchJson(`/user/session?display_name=${encodeURIComponent(authUser?.display_name || authUser?.username || "Web User")}`, "user", { method: "POST" });
        const data = await fetchJson("/user/leagues", "user");
        const items = data.items || [];
        setLeagues(items);
        setLastUpdated(new Date());
        if (items.length > 0) {
          setSelectedLeague(items[0].code);
        }
      } catch (err) {
        setError(String(err));
      }
    }
    loadLeagues();
  }, []);

  useEffect(() => {
    if (!selectedLeague) return;

    // Reset team-dependent state immediately to avoid stale team/league race.
    setSelectedTeam("");
    setTeamOverview(null);
    setTeamPlayers([]);
    setTeamId(null);
    setSelectedPlayer(null);
    setPlayerDetail(null);
    setPlayerWarning("");

    async function loadLeagueData() {
      try {
        setError("");
        const [m, t] = await Promise.all([
          fetchJson(`/user/matches/upcoming?league=${selectedLeague}`, "user"),
          fetchJson(`/user/leagues/${selectedLeague}/teams`, "user"),
        ]);

        const matchItems = m.items || [];
        const teamItems = t.items || [];

        setMatches(matchItems);
        setTeams(teamItems);

        setSelectedMatch(matchItems.length > 0 ? matchItems[0] : null);
        setPrediction(null);
        setPredictionExplanation(null);
        setSelectedTeam(teamItems.length > 0 ? teamItems[0] : "");
      } catch (err) {
        setError(String(err));
      }
    }

    loadLeagueData();
  }, [selectedLeague]);

  useEffect(() => {
    if (!selectedMatch || !selectedLeague) return;

    async function loadPrediction() {
      try {
        const data = await fetchJson(`/user/matches/${selectedMatch.match_id}/prediction?league=${selectedLeague}&model_type=${selectedModelType}`, "user");
        setPrediction(data.prediction);
      } catch (err) {
        setPrediction({ prediction: "unknown", reason: String(err) });
      }
    }

    loadPrediction();
  }, [selectedMatch, selectedLeague, selectedModelType]);

  useEffect(() => {
    if (!selectedMatch || !selectedLeague) {
      setPredictionExplanation(null);
      return;
    }

    let cancelled = false;

    async function loadPredictionExplanation() {
      try {
        const data = await fetchJson(
          `/user/matches/${selectedMatch.match_id}/explain?league=${selectedLeague}&model_type=${selectedModelType}&top_n=8`,
          "user"
        );
        if (!cancelled) {
          setPredictionExplanation(data.explanation || null);
        }
      } catch (err) {
        if (!cancelled) {
          setPredictionExplanation({
            model_type: selectedModelType,
            items: [],
            note: String(err),
          });
        }
      }
    }

    loadPredictionExplanation();
    return () => {
      cancelled = true;
    };
  }, [selectedMatch, selectedLeague, selectedModelType]);

  useEffect(() => {
    if (!selectedMatch || !selectedLeague) {
      setComparison(null);
      return;
    }

    let cancelled = false;

    async function loadComparison() {
      try {
        const data = await fetchJson(
          `/user/matches/${selectedMatch.match_id}/comparison?league=${selectedLeague}`,
          "user"
        );
        if (!cancelled) {
          setComparison(data.comparison || null);
        }
      } catch (err) {
        if (!cancelled) {
          setComparison(null);
        }
      }
    }

    loadComparison();
    return () => {
      cancelled = true;
    };
  }, [selectedMatch, selectedLeague]);

  useEffect(() => {
    if (!selectedLeague || !selectedTeam) return;
    if (teams.length === 0) return;

    // Guard against stale selection when switching leagues quickly.
    if (!teams.includes(selectedTeam)) {
      setSelectedTeam(teams[0] || "");
      return;
    }

    let cancelled = false;

    async function loadTeam() {
      try {
        setError("");
        const overview = await fetchJson(
          `/user/teams/${encodeURIComponent(selectedTeam)}/overview?league=${selectedLeague}`,
          "user"
        );
        if (cancelled) return;
        setTeamOverview(overview);

        const playersPayload = await fetchJson(
          `/user/teams/${encodeURIComponent(selectedTeam)}/players?league=${selectedLeague}`,
          "user"
        );
        if (cancelled) return;

        const items = playersPayload.items || [];
        setTeamPlayers(items);
        setTeamId(playersPayload.team_id || null);

        const firstPlayer = items.length > 0 ? items[0] : null;
        setSelectedPlayer(firstPlayer);
        setPlayerDetail(firstPlayer);
        setPlayerWarning(playersPayload.warning || "");
      } catch (err) {
        if (!cancelled) {
          setError(String(err));
        }
      }
    }

    loadTeam();
    return () => {
      cancelled = true;
    };
  }, [selectedTeam, selectedLeague, teams]);

  useEffect(() => {
    if (!selectedPlayer || !selectedLeague || !selectedTeam) return;

    let cancelled = false;

    async function loadPlayerDetail() {
      try {
        let detailItem = selectedPlayer;
        let warning = "";

        if (selectedPlayer.id) {
          const params = new URLSearchParams();
          params.set("league", selectedLeague);
          params.set("team_name", selectedTeam);
          if (teamId) params.set("team_id", String(teamId));

          const payload = await fetchJson(`/user/players/${selectedPlayer.id}/detail?${params.toString()}`, "user");
          detailItem = { ...selectedPlayer, ...(payload.item || {}) };
          warning = payload.warning || "";
        }

        await fetchJson(
          `/user/players/${encodeURIComponent(selectedPlayer.name)}/view?league=${selectedLeague}&team_name=${encodeURIComponent(selectedTeam)}`,
          "user",
          { method: "POST" }
        );

        if (!cancelled) {
          setPlayerDetail(detailItem);
          setPlayerWarning(warning);
        }
      } catch (err) {
        if (!cancelled) {
          setPlayerWarning(String(err));
        }
      }
    }

    loadPlayerDetail();

    return () => {
      cancelled = true;
    };
  }, [selectedPlayer, selectedLeague, selectedTeam, teamId]);

  const filteredTeams = useMemo(() => {
    if (!search.trim()) return teams;
    return teams.filter((team) => team.toLowerCase().includes(search.toLowerCase()));
  }, [teams, search]);

  function getRankClass(rank) {
    const value = Number(rank);
    if (!Number.isFinite(value)) return "low";
    if (value <= 3) return "top";
    if (value <= 6) return "mid";
    return "low";
  }

  function normalize(value, max) {
    return Math.min((value / max) * 100, 100);
  }

  function formToScore(form) {
    if (!form) return 0;
    return form.split("-").reduce((acc, f) => {
      if (f === "W") return acc + 3;
      if (f === "D") return acc + 1;
      return acc;
    }, 0) * 6; // scale ~100
  }

  const radarData = comparison
    ? [
        {
          subject: "Attack",
          home: normalize(comparison.home.avg_goals, 3),
          away: normalize(comparison.away.avg_goals, 3),
        },
        {
          subject: "Defense",
          home: normalize(1 / (comparison.home.avg_conceded || 1), 1),
          away: normalize(1 / (comparison.away.avg_conceded || 1), 1),
        },
        {
          subject: "Win Rate",
          home: comparison.home.win_rate,
          away: comparison.away.win_rate,
        },
        {
          subject: "Form",
          home: formToScore(comparison.home.form),
          away: formToScore(comparison.away.form),
        },
        {
          subject: "Goal Power",
          home: normalize(comparison.home.last5_goals, 15),
          away: normalize(comparison.away.last5_goals, 15),
        },
        {
          subject: "Stability",
          home: normalize(comparison.home.clean_sheet_rate || 0, 100),
          away: normalize(comparison.away.clean_sheet_rate || 0, 100),
        },
      ]
    : [];

  return (
    <div className="role-content">
      <div className="stats-grid">
        <StatCard title="Upcoming matches" value={matches.length} sub="From selected league" Icon={CalendarDays} />
        <StatCard title="Selected league" value={selectedLeague || "-"} sub="Live API + fallback" Icon={Target} />
        <StatCard title="Teams loaded" value={teams.length} sub="Current processed data" Icon={Users} />
        <StatCard title="Prediction model" value={modelLabel(selectedModelType)} sub={prediction?.prediction || "-"} Icon={BarChart3} />
      </div>

      {error && <div className="error-box">{error}</div>}

      <div className="card">
        <SectionTitle title="Leagues" subtitle="Pick a league first" />
        <div className="chips">
          {leagues.map((league) => (
            <button
              key={league.code}
              className={`chip ${league.code === selectedLeague ? "chip-active" : ""}`}
              onClick={() => setSelectedLeague(league.code)}
            >
              {league.code}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="sub-tabs">
          <button className={`sub-tab-btn ${userView === "matches" ? "active" : ""}`} onClick={() => setUserView("matches")}>Part 1: Matches & Predictions</button>
          <button className={`sub-tab-btn ${userView === "teams" ? "active" : ""}`} onClick={() => setUserView("teams")}>Part 2: Teams & Players</button>
        </div>
      </div>

      {userView === "matches" && (
        <div className="two-cols">
          <div className="card">
            <SectionTitle title="Upcoming matches" subtitle="Click a match to see AI prediction" />
            <div className="list-grid">
              {matches.map((match) => (
                <button
                  key={match.match_id}
                  className={`match-card ${selectedMatch?.match_id === match.match_id ? "active" : ""}`}
                  onClick={() => setSelectedMatch(match)}
                >
                  <div className="muted small">{match.league_name}</div>
                  <div className="match-title">{match.home_team} vs {match.away_team}</div>
                  <div className="muted small">{match.date}</div>
                  <div className="match-link">View prediction <ChevronRight size={14} /></div>
                </button>
              ))}
              {matches.length === 0 && <div className="muted">No upcoming matches for this league right now.</div>}
            </div>
          </div>

          <div className="card highlight">
            <SectionTitle title="Match prediction" subtitle="Model output for Over/Under 2.5" />
            <div className="model-select-row">
              <label className="muted small" htmlFor="model-type-select">Prediction model</label>
              <select
                id="model-type-select"
                className="text-input"
                value={selectedModelType}
                onChange={(e) => setSelectedModelType(e.target.value)}
              >
                {MODEL_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </div>
            {selectedMatch ? (
              <>
                <div className="match-title large">{selectedMatch.home_team} vs {selectedMatch.away_team}</div>
                <div className="muted">{selectedMatch.date}</div>
                <div className="pred-grid">
                  <div className="pred-box">
                    <span className="muted">Over 2.5</span>
                    <h2>{prediction?.over_2_5_probability ?? "N/A"}</h2>
                  </div>
                  <div className="pred-box">
                    <span className="muted">Under 2.5</span>
                    <h2>{prediction?.under_2_5_probability ?? "N/A"}</h2>
                  </div>
                </div>
                <div className="badge">{prediction?.prediction || "unknown"}</div>
                <div className="muted small" style={{ marginTop: 6 }}>Model: {modelLabel(prediction?.model_type || selectedModelType)}</div>
                {prediction?.reason && <div className="warn-box">{prediction.reason}</div>}

                {predictionExplanation && (
                  <div className="explain-box">
                    <h4 className="radar-title">Why this prediction</h4>
                    <div className="muted small explain-note">{predictionExplanation.note || "Top features affecting this match prediction."}</div>
                    {predictionExplanation.items?.length > 0 ? (
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={predictionExplanation.items} layout="vertical" margin={{ left: 4, right: 12 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#2c3f5e" />
                          <XAxis type="number" stroke="#9ab0cc" />
                          <YAxis type="category" dataKey="feature" width={150} stroke="#9ab0cc" tick={{ fontSize: 12 }} tickFormatter={formatFeatureLabel} />
                          <Tooltip contentStyle={{ background: "#0f2038", border: "1px solid #2c3f5e", borderRadius: 12 }} />
                          <Bar dataKey="score" fill="#90be6d" radius={[0, 8, 8, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="muted small" style={{ marginTop: 8 }}>
                        No per-match feature explanation for this model. Use Random Forest to view local feature impact.
                      </div>
                    )}
                  </div>
                )}

                {comparison && (
                  <div className="comparison-box">
                    <div className="comparison-header">
                      <div>
                        <div className="team-header">
                          <h4>{selectedMatch.home_team}</h4>
                          <span className={`rank-badge rank-${getRankClass(comparison.home.rank)}`}>
                            #{Number.isFinite(Number(comparison.home?.rank)) ? comparison.home.rank : "-"}
                          </span>
                        </div>
                        <div className="form-badge">
                          {comparison.home.form.split("-").map((f, i) => (
                            <span key={i} className={`badge-${f.toLowerCase()}`}>{f}</span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="team-header">
                          <h4>{selectedMatch.away_team}</h4>
                          <span className={`rank-badge rank-${getRankClass(comparison.away.rank)}`}>
                            #{Number.isFinite(Number(comparison.away?.rank)) ? comparison.away.rank : "-"}
                          </span>
                        </div>
                        <div className="form-badge">
                          {comparison.away.form.split("-").map((f, i) => (
                            <span key={i} className={`badge-${f.toLowerCase()}`}>{f}</span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {[
                      { label: "Avg Goals", key: "avg_goals" },
                      { label: "Win %", key: "win_rate" },
                      { label: "Last 5 Goals", key: "last5_goals" },
                    ].map((stat) => {
                      const home = comparison.home[stat.key];
                      const away = comparison.away[stat.key];
                      const total = home + away || 1;
                      const homePct = (home / total) * 100;

                      return (
                        <div key={stat.key} className="stat-row">
                          <div className="stat-label">{stat.label}</div>
                          <div className="bar">
                            <div className="bar-home" style={{ width: `${homePct}%` }} />
                          </div>
                          <div className="stat-values">
                            <span>{home}</span>
                            <span>{away}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {comparison && (
                  <div className="radar-container">
                    <h4 className="radar-title">Team Performance Radar</h4>

                    <ResponsiveContainer width="100%" height={300}>
                      <RadarChart data={radarData}>
                        <defs>
                          {/* Gradient Home */}
                          <linearGradient id="homeGradient" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#3ddc97" stopOpacity={0.8} />
                            <stop offset="100%" stopColor="#4cc9f0" stopOpacity={0.3} />
                          </linearGradient>

                          {/* Gradient Away */}
                          <linearGradient id="awayGradient" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#f94144" stopOpacity={0.8} />
                            <stop offset="100%" stopColor="#f3722c" stopOpacity={0.3} />
                          </linearGradient>
                        </defs>

                        <PolarGrid stroke="#2a4a6f" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: "#ccc", fontSize: 12 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} />

                        <Radar
                          name={selectedMatch.home_team}
                          dataKey="home"
                          stroke="#3ddc97"
                          fill="url(#homeGradient)"
                          fillOpacity={0.6}
                          isAnimationActive={true}
                          animationDuration={800}
                        />

                        <Radar
                          name={selectedMatch.away_team}
                          dataKey="away"
                          stroke="#f94144"
                          fill="url(#awayGradient)"
                          fillOpacity={0.6}
                          isAnimationActive={true}
                          animationDuration={800}
                        />

                        <Tooltip />
                        <Legend />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </>
            ) : (
              <div className="muted">Select a match first.</div>
            )}
          </div>
        </div>
      )}

      {userView === "teams" && (
        <>
          <div className="two-cols">
          <div className="card">
            <SectionTitle title="Teams" subtitle="Click team to see team and player info" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-input"
              placeholder="Search team..." />
            <div className="chips team-chips">
              {filteredTeams.map((team) => (
                <button
                  key={team}
                  className={`chip ${team === selectedTeam ? "chip-active" : ""}`}
                  onClick={() => setSelectedTeam(team)}
                >
                  <Star size={13} /> {team}
                </button>
              ))}
            </div>
          </div>

          <div className="card">
            <SectionTitle title={selectedTeam || "Team detail"} subtitle="Team stats + click player for profile" />
            {teamOverview ? (
              <>
                <div className="team-detail-grid">
                  <div>
                    <h4>Last 5</h4>
                    {teamOverview.recent_matches?.slice(0, 5).map((m, idx) => (
                      <div key={`${m.date}-${idx}`} className="mini-row">
                        {m.home_team} {m.home_goals} - {m.away_goals} {m.away_team}
                      </div>
                    ))}
                  </div>
                  <div>
                    <h4>Next 5</h4>
                    {teamOverview.next_matches?.slice(0, 5).map((m) => (
                      <div key={m.match_id} className="mini-row">{m.home_team} vs {m.away_team}</div>
                    ))}
                  </div>
                  <div>
                    <h4>Players</h4>
                    <div className="player-list">
                      {teamPlayers.map((p) => (
                        <button
                          key={p.id || p.name}
                          className={`player-btn ${(selectedPlayer?.id ? selectedPlayer.id === p.id : selectedPlayer?.name === p.name) ? "active" : ""}`}
                          onClick={() => setSelectedPlayer(p)}
                        >
                          {p.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="player-detail card inner-card">
                  <SectionTitle title={playerDetail?.name || "Player detail"} subtitle="Click player to load profile" />
                  {playerWarning && <div className="warn-box">{playerWarning}</div>}
                  {playerDetail ? (
                    <div className="kv-grid">
                      <div><span className="muted">Position</span><strong>{playerDetail.position || "N/A"}</strong></div>
                      <div><span className="muted">Nationality</span><strong>{playerDetail.nationality || "N/A"}</strong></div>
                      <div><span className="muted">Age</span><strong>{playerDetail.age ?? "N/A"}</strong></div>
                      <div><span className="muted">Date of birth</span><strong>{playerDetail.date_of_birth || "N/A"}</strong></div>
                      <div><span className="muted">Shirt number</span><strong>{playerDetail.shirt_number ?? "N/A"}</strong></div>
                      <div><span className="muted">Role</span><strong>{playerDetail.role || "N/A"}</strong></div>
                      <div><span className="muted">Team</span><strong>{playerDetail.team_name || selectedTeam || "N/A"}</strong></div>
                      <div><span className="muted">Contract until</span><strong>{playerDetail.contract_until || "N/A"}</strong></div>
                    </div>
                  ) : (
                    <div className="muted">Select a player.</div>
                  )}
                </div>
              </>
            ) : (
              <div className="muted">Select a team first.</div>
            )}
          </div>
        </div>
        </>
      )}

      <div style={{
        marginTop: "32px",
        paddingTop: "16px",
        borderTop: "1px solid var(--border)",
        fontSize: "12px",
        color: "var(--muted)",
        textAlign: "right",
      }}>
        Last updated: {lastUpdated.toLocaleTimeString()} ({lastUpdated.toLocaleDateString()})
      </div>

      <div className="report-footer">
        <button
          className="report-btn"
          onClick={() => setShowReport(true)}
        >
          Report an issue
        </button>
      </div>

      {/* Report modal */}
      {showReport && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Report an Issue</h3>

            <label>Type</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
            >
              <option>Wrong prediction</option>
              <option>Incorrect stats</option>
              <option>Missing data</option>
              <option>UI bug</option>
              <option>Other</option>
            </select>

            <label>Description</label>
            <textarea
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
            />

            <div className="modal-actions">
              <button onClick={() => setShowReport(false)}>Cancel</button>
              <button className="primary">Submit</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function ScientistDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState("");
  const [importanceLeague, setImportanceLeague] = useState("E0");
  const [featureImportance, setFeatureImportance] = useState([]);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await fetchJson("/data-scientist/dashboard", "data_scientist");
        setDashboard(data);
        const leagues = (data.items || []).map((item) => item.league);
        if (leagues.length > 0 && !leagues.includes(importanceLeague)) {
          setImportanceLeague(leagues[0]);
        }
      } catch (err) {
        setError(String(err));
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    if (!importanceLeague) return;

    async function loadFeatureImportance() {
      try {
        const data = await fetchJson(
          `/data-scientist/feature-importance?league=${importanceLeague}&model_type=random_forest&top_n=12`,
          "data_scientist"
        );
        setFeatureImportance(data.items || []);
      } catch (err) {
        setFeatureImportance([]);
        setError(String(err));
      }
    }

    loadFeatureImportance();
  }, [importanceLeague]);

  const chartData = (dashboard?.items || []).map((item) => ({
    league: item.league,
    ensemble_accuracy: item.models?.ensemble?.accuracy || 0,
    random_forest_accuracy: item.models?.random_forest?.accuracy || 0,
  }));

  const modelSummaries = dashboard?.model_summaries || [];
  const selectedLeagueName =
    (dashboard?.items || []).find((item) => item.league === importanceLeague)?.league_name || importanceLeague;

  return (
    <div className="role-content">
      <div className="stats-grid">
        <StatCard
          title="Ensemble avg acc"
          value={modelSummaries.find((item) => item.model_type === "ensemble")?.average_accuracy ?? "N/A"}
          sub="Across leagues"
          Icon={BarChart3}
        />
        <StatCard
          title="RF avg acc"
          value={modelSummaries.find((item) => item.model_type === "random_forest")?.average_accuracy ?? "N/A"}
          sub="Across leagues"
          Icon={LayoutDashboard}
        />
        <StatCard title="Leagues" value={(dashboard?.items || []).length} sub="Production models" Icon={Target} />
        <StatCard title="Generated at" value={dashboard?.generated_at?.slice(0, 10) || "-"} sub="UTC timestamp" Icon={CalendarDays} />
      </div>

      {error && <div className="error-box">{error}</div>}

      <div className="two-cols">
        <div className="card chart-card">
          <SectionTitle title="Accuracy by league" subtitle="Compare Ensemble vs Random Forest" />
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2c3f5e" />
              <XAxis dataKey="league" stroke="#9ab0cc" />
              <YAxis stroke="#9ab0cc" />
              <Tooltip contentStyle={{ background: "#0f2038", border: "1px solid #2c3f5e", borderRadius: 12 }} />
              <Legend />
              <Bar dataKey="ensemble_accuracy" name="Ensemble" fill="#4cc9f0" radius={[8, 8, 0, 0]} />
              <Bar dataKey="random_forest_accuracy" name="Random Forest" fill="#3ddc97" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <SectionTitle title="Metrics table" subtitle="Performance of both models per league" />
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>League</th>
                  <th>Model</th>
                  <th>Acc</th>
                  <th>Prec</th>
                  <th>Recall</th>
                  <th>F1</th>
                </tr>
              </thead>
              <tbody>
                {(dashboard?.items || []).flatMap((item) => {
                  const ensemble = item.models?.ensemble || {};
                  const randomForest = item.models?.random_forest || {};
                  return [
                    (
                      <tr key={`${item.league}-ensemble`}>
                        <td>{item.league_name}</td>
                        <td>Ensemble</td>
                        <td>{ensemble.accuracy ?? "-"}</td>
                        <td>{ensemble.precision ?? "-"}</td>
                        <td>{ensemble.recall ?? "-"}</td>
                        <td>{ensemble.f1 ?? "-"}</td>
                      </tr>
                    ),
                    (
                      <tr key={`${item.league}-rf`}>
                        <td>{item.league_name}</td>
                        <td>Random Forest</td>
                        <td>{randomForest.accuracy ?? "-"}</td>
                        <td>{randomForest.precision ?? "-"}</td>
                        <td>{randomForest.recall ?? "-"}</td>
                        <td>{randomForest.f1 ?? "-"}</td>
                      </tr>
                    ),
                  ];
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card chart-card">
        <SectionTitle title="Feature Importance (Random Forest)" subtitle="Top features used by RF model" />
        <div className="model-select-row">
          <label className="muted small" htmlFor="importance-league">League</label>
          <select
            id="importance-league"
            className="text-input"
            value={importanceLeague}
            onChange={(e) => setImportanceLeague(e.target.value)}
          >
            {(dashboard?.items || []).map((item) => (
              <option key={item.league} value={item.league}>
                {item.league} - {item.league_name}
              </option>
            ))}
          </select>
          <span className="muted small">Selected: {selectedLeagueName}</span>
        </div>

        <ResponsiveContainer width="100%" height={420}>
          <BarChart data={featureImportance} layout="vertical" margin={{ left: 20, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2c3f5e" />
            <XAxis type="number" stroke="#9ab0cc" />
            <YAxis type="category" dataKey="feature" width={220} stroke="#9ab0cc" />
            <Tooltip contentStyle={{ background: "#0f2038", border: "1px solid #2c3f5e", borderRadius: 12 }} />
            <Bar dataKey="importance" fill="#f9c74f" radius={[0, 8, 8, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
function AdminDashboard() {
  const [topTeams, setTopTeams] = useState([]);
  const [topPlayers, setTopPlayers] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [userActivity, setUserActivity] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const [teams, players, usersPayload] = await Promise.all([
          fetchJson("/admin/analytics/top-teams", "admin"),
          fetchJson("/admin/analytics/top-players", "admin"),
          fetchJson("/admin/analytics/users", "admin"),
        ]);
        const userItems = usersPayload.items || [];

        setTopTeams(teams.items || []);
        setTopPlayers(players.items || []);
        setUsers(userItems);
        if (userItems.length > 0) {
          setSelectedUserId(userItems[0].user_id);
        }
      } catch (err) {
        setError(String(err));
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    if (!selectedUserId) {
      setUserActivity(null);
      return;
    }

    async function loadUserActivity() {
      try {
        const payload = await fetchJson(`/admin/analytics/users/${encodeURIComponent(selectedUserId)}`, "admin");
        setUserActivity(payload);
      } catch (err) {
        setError(String(err));
      }
    }

    loadUserActivity();
  }, [selectedUserId]);

  return (
    <div className="role-content">
      <div className="stats-grid">
        <StatCard title="Top teams tracked" value={topTeams.length} sub="By user views" Icon={Users} />
        <StatCard title="Top players tracked" value={topPlayers.length} sub="By player profile views" Icon={Star} />
        <StatCard title="Users tracked" value={users.length} sub="Distinct local users" Icon={UserRound} />
        <StatCard title="Most viewed team" value={topTeams[0]?.team_name || "-"} sub="Current leaderboard" Icon={ShieldCheck} />
      </div>

      {error && <div className="error-box">{error}</div>}

      <div className="two-cols">
        <div className="card chart-card">
          <SectionTitle title="Team engagement" subtitle="Most visited teams" />
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={topTeams}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2c3f5e" />
              <XAxis dataKey="team_name" stroke="#9ab0cc" interval={0} angle={-18} textAnchor="end" height={80} />
              <YAxis stroke="#9ab0cc" />
              <Tooltip contentStyle={{ background: "#0f2038", border: "1px solid #2c3f5e", borderRadius: 12 }} />
              <Bar dataKey="views" fill="#4cc9f0" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card chart-card">
          <SectionTitle title="Player engagement" subtitle="Most visited player profiles" />
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie data={topPlayers} dataKey="views" nameKey="player_name" cx="50%" cy="50%" outerRadius={110}>
                {topPlayers.map((item, index) => (
                  <Cell key={item.player_name + index} fill={["#3ddc97", "#4cc9f0", "#f9c74f", "#f8961e", "#f94144"][index % 5]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: "#0f2038", border: "1px solid #2c3f5e", borderRadius: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <SectionTitle title="User Management (MVP)" subtitle="Users are local IDs generated per device/browser" />

        <div className="chips">
          {users.map((user) => (
            <button
              key={user.user_id}
              className={`chip ${selectedUserId === user.user_id ? "chip-active" : ""}`}
              onClick={() => setSelectedUserId(user.user_id)}
            >
              {(user.display_name || user.user_id).slice(0, 24)} ({user.total_views})
            </button>
          ))}
          {users.length === 0 && <span className="muted">No users tracked yet.</span>}
        </div>

        {userActivity?.user && (
          <div style={{ marginTop: 14 }}>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>User ID</th>
                    <th>Display</th>
                    <th>Total</th>
                    <th>Team</th>
                    <th>Player</th>
                    <th>Match</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{userActivity.user.user_id}</td>
                    <td>{userActivity.user.display_name || "-"}</td>
                    <td>{userActivity.summary?.total_views ?? 0}</td>
                    <td>{userActivity.summary?.team_views ?? 0}</td>
                    <td>{userActivity.summary?.player_views ?? 0}</td>
                    <td>{userActivity.summary?.match_views ?? 0}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="two-cols" style={{ marginTop: 12 }}>
              <div className="card">
                <SectionTitle title="User Top Teams" subtitle="Most viewed teams by selected user" />
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>League</th>
                        <th>Team</th>
                        <th>Views</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(userActivity.top_teams || []).map((item, idx) => (
                        <tr key={`${item.team_name}-${idx}`}>
                          <td>{item.league}</td>
                          <td>{item.team_name}</td>
                          <td>{item.views}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="card">
                <SectionTitle title="User Top Players" subtitle="Most viewed players by selected user" />
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>League</th>
                        <th>Player</th>
                        <th>Views</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(userActivity.top_players || []).map((item, idx) => (
                        <tr key={`${item.player_name}-${idx}`}>
                          <td>{item.league || "-"}</td>
                          <td>{item.player_name}</td>
                          <td>{item.views}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
export default function App() {
  const [authUser, setAuthUser] = useState(() => readAuthUser());
  const [role, setRole] = useState("user");

  const accountRole = authUser?.role || "user";
  const allowedTabIds =
    accountRole === "admin"
      ? ["user", "scientist", "admin"]
      : accountRole === "data_scientist"
      ? ["user", "scientist"]
      : ["user"];

  const visibleTabs = ROLE_TABS.filter((tab) => allowedTabIds.includes(tab.id));

  useEffect(() => {
    if (!allowedTabIds.includes(role)) {
      setRole(allowedTabIds[0] || "user");
    }
  }, [role, accountRole]);

  function handleLogout() {
    clearAuthUser();
    setAuthUser(null);
    setRole("user");
  }

  if (!authUser) {
    return <AuthScreen onAuthenticated={setAuthUser} />;
  }

  return (
    <div className="app-shell">
      <header className="hero card">
        <div>
          <div className="badge">Football AI Prediction Platform</div>
          <h1>Web dashboard for User, Data Scientist, and Admin</h1>
          <p className="muted">
            Updated to latest data and retrained models. UI rebuilt from your JSX mockup, adapted for live API data.
          </p>
          <p className="small muted">
            Current user: {authUser.display_name || authUser.username || authUser.user_id} ({authUser.user_id}) - role: {accountRole}
          </p>
        </div>

        <div className="role-tabs">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const active = role === tab.id;
            return (
              <button key={tab.id} className={`role-btn ${active ? "active" : ""}`} onClick={() => setRole(tab.id)}>
                <Icon size={15} /> {tab.label}
              </button>
            );
          })}
          <button className="role-btn" onClick={handleLogout}>Switch User</button>
        </div>
      </header>

      {role === "user" && <UserDashboard authUser={authUser} />}
      {role === "scientist" && <ScientistDashboard />}
      {role === "admin" && <AdminDashboard />}
    </div>
  );
}





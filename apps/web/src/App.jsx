import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
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

const ROLE_TABS = [
  { id: "user", label: "User", icon: UserRound },
  { id: "scientist", label: "Data Scientist", icon: LayoutDashboard },
  { id: "admin", label: "Admin", icon: ShieldCheck },
];

async function fetchJson(path, role, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "X-Role": role, ...(options.headers || {}) },
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

function UserDashboard() {
  const [leagues, setLeagues] = useState([]);
  const [selectedLeague, setSelectedLeague] = useState("");
  const [userView, setUserView] = useState("matches");

  const [matches, setMatches] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [comparison, setComparison] = useState(null);

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

  useEffect(() => {
    async function loadLeagues() {
      try {
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

        setSelectedTeam(teamItems.length > 0 ? teamItems[0] : "");
        setTeamOverview(null);
        setTeamPlayers([]);
        setTeamId(null);
        setSelectedPlayer(null);
        setPlayerDetail(null);
        setPlayerWarning("");
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
        const data = await fetchJson(`/user/matches/${selectedMatch.match_id}/prediction?league=${selectedLeague}`, "user");
        setPrediction(data.prediction);
      } catch (err) {
        setPrediction({ prediction: "unknown", reason: String(err) });
      }
    }

    loadPrediction();
  }, [selectedMatch, selectedLeague]);

  useEffect(() => {
    if (!selectedMatch || !selectedLeague) return;

    async function loadComparison() {
      try {
        // const data = await fetchJson(
        //   `/user/matches/${selectedMatch.match_id}/comparison?league=${selectedLeague}`,
        //   "user"
        // );
        // setComparison(data);
        setComparison({
          home: {
            rank: 2,
            form: "W-W-D-L-W",
            avg_goals: 2.4,
            avg_conceded: 1.1,
            win_rate: 67,
            last5_goals: 12,
            clean_sheet_rate: 40,
          },
          away: {
            rank: 8,
            form: "D-W-W-L-D",
            avg_goals: 1.8,
            avg_conceded: 1.5,
            win_rate: 42,
            last5_goals: 9,
            clean_sheet_rate: 25,
          },
        });
      } catch (err) {
        setComparison(null);
      }
    }

    loadComparison();
  }, [selectedMatch, selectedLeague]);

  useEffect(() => {
    if (!selectedTeam || !selectedLeague) return;

    async function loadTeam() {
      try {
        const overview = await fetchJson(
          `/user/teams/${encodeURIComponent(selectedTeam)}/overview?league=${selectedLeague}`,
          "user"
        );
        setTeamOverview(overview);

        const playersPayload = await fetchJson(
          `/user/teams/${encodeURIComponent(selectedTeam)}/players?league=${selectedLeague}`,
          "user"
        );
        const items = playersPayload.items || [];
        setTeamPlayers(items);
        setTeamId(playersPayload.team_id || null);

        const firstPlayer = items.length > 0 ? items[0] : null;
        setSelectedPlayer(firstPlayer);
        setPlayerDetail(firstPlayer);
        setPlayerWarning(playersPayload.warning || "");
      } catch (err) {
        setError(String(err));
      }
    }

    loadTeam();
  }, [selectedTeam, selectedLeague]);

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
    if (rank <= 3) return "top";
    if (rank <= 6) return "mid";
    return "low";
  }

  function normalize(value, max) {
    return Math.min((value / max) * 100, 100);
  }

  function formToScore(form) {
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
        <StatCard title="Prediction status" value={prediction?.prediction || "-"} sub="Over / Under 2.5" Icon={BarChart3} />
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
                {prediction?.reason && <div className="warn-box">{prediction.reason}</div>}
                {comparison && (
                  <div className="comparison-box">
                    <div className="comparison-header">
                      <div>
                        <div className="team-header">
                          <h4>{selectedMatch.home_team}</h4>
                          <span className={`rank-badge rank-${getRankClass(comparison.home.rank)}`}>
                            #{comparison.home.rank}
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
                            #{comparison.away.rank}
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
    </div>
  );
}

function ScientistDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const data = await fetchJson("/data-scientist/dashboard", "data_scientist");
        setDashboard(data);
      } catch (err) {
        setError(String(err));
      }
    }
    loadData();
  }, []);

  const chartData = (dashboard?.items || []).map((item) => ({
    league: item.league,
    accuracy: item.accuracy || 0,
    precision: item.precision || 0,
    recall: item.recall || 0,
  }));

  return (
    <div className="role-content">
      <div className="stats-grid">
        <StatCard title="Average accuracy" value={dashboard?.average_accuracy ?? "N/A"} sub="Across leagues" Icon={BarChart3} />
        <StatCard title="Leagues" value={(dashboard?.items || []).length} sub="Production models" Icon={LayoutDashboard} />
        <StatCard title="Generated at" value={dashboard?.generated_at?.slice(0, 10) || "-"} sub="UTC timestamp" Icon={CalendarDays} />
        <StatCard title="Scope" value="Over/Under 2.5" sub="Binary classification" Icon={Target} />
      </div>

      {error && <div className="error-box">{error}</div>}

      <div className="two-cols">
        <div className="card chart-card">
          <SectionTitle title="Performance by league" subtitle="Accuracy / precision / recall" />
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2c3f5e" />
              <XAxis dataKey="league" stroke="#9ab0cc" />
              <YAxis stroke="#9ab0cc" />
              <Tooltip contentStyle={{ background: "#0f2038", border: "1px solid #2c3f5e", borderRadius: 12 }} />
              <Area type="monotone" dataKey="accuracy" stroke="#3ddc97" fill="#3ddc97" fillOpacity={0.2} />
              <Area type="monotone" dataKey="precision" stroke="#4cc9f0" fillOpacity={0} />
              <Area type="monotone" dataKey="recall" stroke="#f9c74f" fillOpacity={0} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <SectionTitle title="Metrics table" subtitle="Latest computed metrics" />
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>League</th>
                  <th>Acc</th>
                  <th>Prec</th>
                  <th>Recall</th>
                  <th>F1</th>
                </tr>
              </thead>
              <tbody>
                {(dashboard?.items || []).map((item) => (
                  <tr key={item.league}>
                    <td>{item.league_name}</td>
                    <td>{item.accuracy ?? "-"}</td>
                    <td>{item.precision ?? "-"}</td>
                    <td>{item.recall ?? "-"}</td>
                    <td>{item.f1 ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminDashboard() {
  const [topTeams, setTopTeams] = useState([]);
  const [topPlayers, setTopPlayers] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const [teams, players] = await Promise.all([
          fetchJson("/admin/analytics/top-teams", "admin"),
          fetchJson("/admin/analytics/top-players", "admin"),
        ]);
        setTopTeams(teams.items || []);
        setTopPlayers(players.items || []);
      } catch (err) {
        setError(String(err));
      }
    }
    loadData();
  }, []);

  return (
    <div className="role-content">
      <div className="stats-grid">
        <StatCard title="Top teams tracked" value={topTeams.length} sub="By user views" Icon={Users} />
        <StatCard title="Top players tracked" value={topPlayers.length} sub="By player profile views" Icon={Star} />
        <StatCard title="Most viewed team" value={topTeams[0]?.team_name || "-"} sub="Current leaderboard" Icon={ShieldCheck} />
        <StatCard title="Most viewed player" value={topPlayers[0]?.player_name || "-"} sub="Current leaderboard" Icon={UserRound} />
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
    </div>
  );
}

export default function App() {
  const [role, setRole] = useState("user");

  return (
    <div className="app-shell">
      <header className="hero card">
        <div>
          <div className="badge">Football AI Prediction Platform</div>
          <h1>Web dashboard for User, Data Scientist, and Admin</h1>
          <p className="muted">
            Updated to latest data and retrained models. UI rebuilt from your JSX mockup, adapted for live API data.
          </p>
        </div>

        <div className="role-tabs">
          {ROLE_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = role === tab.id;
            return (
              <button key={tab.id} className={`role-btn ${active ? "active" : ""}`} onClick={() => setRole(tab.id)}>
                <Icon size={15} /> {tab.label}
              </button>
            );
          })}
        </div>
      </header>

      {role === "user" && <UserDashboard />}
      {role === "scientist" && <ScientistDashboard />}
      {role === "admin" && <AdminDashboard />}
    </div>
  );
}


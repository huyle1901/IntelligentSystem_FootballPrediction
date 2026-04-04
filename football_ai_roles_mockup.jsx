import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  CalendarDays,
  ChevronRight,
  Heart,
  LayoutDashboard,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Users,
  UserRound,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const upcomingMatches = [
  {
    id: 1,
    league: "Premier League",
    time: "19:30",
    date: "Apr 02",
    home: "Manchester City",
    away: "Arsenal",
    homeForm: "W-W-D-W-W",
    awayForm: "W-D-W-W-L",
    prediction: { over: 68, under: 32, confidence: "High", expectedGoals: 3.1 },
  },
  {
    id: 2,
    league: "La Liga",
    time: "22:00",
    date: "Apr 02",
    home: "Barcelona",
    away: "Real Sociedad",
    homeForm: "W-W-W-D-W",
    awayForm: "L-W-D-W-L",
    prediction: { over: 61, under: 39, confidence: "Medium", expectedGoals: 2.8 },
  },
  {
    id: 3,
    league: "Serie A",
    time: "01:45",
    date: "Apr 03",
    home: "Inter Milan",
    away: "Napoli",
    homeForm: "W-W-W-W-D",
    awayForm: "D-W-L-W-D",
    prediction: { over: 49, under: 51, confidence: "Balanced", expectedGoals: 2.4 },
  },
  {
    id: 4,
    league: "Bundesliga",
    time: "20:30",
    date: "Apr 03",
    home: "Bayern Munich",
    away: "Leverkusen",
    homeForm: "W-L-W-W-W",
    awayForm: "W-W-D-W-W",
    prediction: { over: 72, under: 28, confidence: "Very High", expectedGoals: 3.4 },
  },
];

const teams = [
  {
    id: 1,
    name: "Manchester City",
    league: "Premier League",
    colors: "from-sky-500 to-cyan-400",
    last5: [
      "W 3-1 vs Tottenham",
      "W 2-0 vs Chelsea",
      "D 1-1 vs Liverpool",
      "W 4-2 vs Brighton",
      "W 2-1 vs Aston Villa",
    ],
    next5: [
      "vs Arsenal",
      "vs Newcastle",
      "vs West Ham",
      "vs Man United",
      "vs Wolves",
    ],
    players: ["Haaland", "De Bruyne", "Foden", "Rodri", "Bernardo Silva", "Dias"],
  },
  {
    id: 2,
    name: "Barcelona",
    league: "La Liga",
    colors: "from-blue-600 to-red-500",
    last5: [
      "W 2-1 vs Valencia",
      "W 1-0 vs Sevilla",
      "W 3-0 vs Villarreal",
      "D 2-2 vs Atletico",
      "W 2-0 vs Betis",
    ],
    next5: [
      "vs Real Sociedad",
      "vs Girona",
      "vs Bilbao",
      "vs Real Madrid",
      "vs Getafe",
    ],
    players: ["Lewandowski", "Pedri", "Gavi", "Yamal", "Araujo", "De Jong"],
  },
  {
    id: 3,
    name: "Inter Milan",
    league: "Serie A",
    colors: "from-blue-900 to-cyan-500",
    last5: [
      "W 1-0 vs Roma",
      "W 3-2 vs Lazio",
      "W 2-0 vs Torino",
      "W 4-1 vs Bologna",
      "D 1-1 vs Juventus",
    ],
    next5: [
      "vs Napoli",
      "vs Atalanta",
      "vs Milan",
      "vs Fiorentina",
      "vs Monza",
    ],
    players: ["Lautaro", "Barella", "Calhanoglu", "Dimarco", "Bastoni", "Thuram"],
  },
  {
    id: 4,
    name: "Bayern Munich",
    league: "Bundesliga",
    colors: "from-red-600 to-rose-500",
    last5: [
      "W 3-1 vs Dortmund",
      "L 1-2 vs Leipzig",
      "W 4-0 vs Mainz",
      "W 2-1 vs Freiburg",
      "W 3-0 vs Stuttgart",
    ],
    next5: [
      "vs Leverkusen",
      "vs Frankfurt",
      "vs Dortmund",
      "vs Augsburg",
      "vs Wolfsburg",
    ],
    players: ["Kane", "Musiala", "Sane", "Kimmich", "Davies", "Upamecano"],
  },
];

const modelTrend = [
  { week: "W1", accuracy: 72, f1: 69, auc: 78 },
  { week: "W2", accuracy: 74, f1: 71, auc: 80 },
  { week: "W3", accuracy: 76, f1: 73, auc: 82 },
  { week: "W4", accuracy: 79, f1: 76, auc: 84 },
  { week: "W5", accuracy: 81, f1: 78, auc: 86 },
  { week: "W6", accuracy: 83, f1: 80, auc: 88 },
];

const features = [
  { name: "Recent goals", value: 92 },
  { name: "xG difference", value: 84 },
  { name: "Home advantage", value: 76 },
  { name: "Injuries", value: 65 },
  { name: "Shots on target", value: 61 },
  { name: "Rest days", value: 52 },
];

const predictionRows = [
  { match: "Man City vs Arsenal", over: 68, under: 32, label: "Over 2.5", drift: "Low" },
  { match: "Barcelona vs Sociedad", over: 61, under: 39, label: "Over 2.5", drift: "Low" },
  { match: "Inter vs Napoli", over: 49, under: 51, label: "Under 2.5", drift: "Medium" },
  { match: "Bayern vs Leverkusen", over: 72, under: 28, label: "Over 2.5", drift: "Low" },
  { match: "Milan vs Roma", over: 44, under: 56, label: "Under 2.5", drift: "High" },
];

const engagementTeams = [
  { name: "Manchester City", users: 824 },
  { name: "Barcelona", users: 756 },
  { name: "Bayern Munich", users: 703 },
  { name: "Inter Milan", users: 664 },
  { name: "Arsenal", users: 601 },
];

const engagementPlayers = [
  { name: "Haaland", value: 31 },
  { name: "Yamal", value: 22 },
  { name: "Kane", value: 18 },
  { name: "Lautaro", value: 16 },
  { name: "Pedri", value: 13 },
];

const traffic = [
  { month: "Jan", views: 12000, favorites: 3400 },
  { month: "Feb", views: 14600, favorites: 4200 },
  { month: "Mar", views: 18100, favorites: 5600 },
  { month: "Apr", views: 20900, favorites: 6300 },
  { month: "May", views: 23500, favorites: 7200 },
  { month: "Jun", views: 26700, favorites: 8100 },
];

const tabs = [
  { id: "user", label: "User", icon: UserRound },
  { id: "scientist", label: "Data Scientist", icon: LayoutDashboard },
  { id: "admin", label: "Admin", icon: ShieldCheck },
];

function StatCard({ title, value, sub, icon: Icon }) {
  return (
    <Card className="rounded-2xl border-white/10 bg-white/5 backdrop-blur">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-slate-400">{title}</p>
            <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
            <p className="mt-2 text-xs text-slate-400">{sub}</p>
          </div>
          <div className="rounded-2xl bg-white/10 p-3 text-slate-200">
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SectionTitle({ title, subtitle }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="text-sm text-slate-400">{subtitle}</p>
      </div>
    </div>
  );
}

export default function FootballAIMockup() {
  const [role, setRole] = useState("user");
  const [selectedMatch, setSelectedMatch] = useState(upcomingMatches[0]);
  const [selectedTeam, setSelectedTeam] = useState(teams[0]);
  const [search, setSearch] = useState("");

  const filteredTeams = useMemo(() => {
    if (!search.trim()) return teams;
    return teams.filter((team) => team.name.toLowerCase().includes(search.toLowerCase()));
  }, [search]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl p-6 md:p-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 shadow-2xl"
        >
          <div className="flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between md:p-8">
            <div>
              <Badge className="mb-3 rounded-full bg-emerald-500/15 px-3 py-1 text-emerald-300 hover:bg-emerald-500/15">
                Football AI Prediction Platform
              </Badge>
              <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
                Multi-role product mockup for User, Data Scientist, and Admin
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300 md:text-base">
                Concept layout for a football prediction system focused on upcoming matches, over/under 2.5 AI forecasts, favorite teams, player information, model monitoring, and engagement analytics.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const active = role === tab.id;
                return (
                  <Button
                    key={tab.id}
                    onClick={() => setRole(tab.id)}
                    className={`rounded-2xl px-5 py-6 text-sm ${
                      active
                        ? "bg-white text-slate-900 hover:bg-white"
                        : "bg-white/10 text-slate-100 hover:bg-white/15"
                    }`}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {tab.label}
                  </Button>
                );
              })}
            </div>
          </div>
        </motion.div>

        {role === "user" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              <StatCard title="Upcoming matches" value="24" sub="Across 5 major leagues" icon={CalendarDays} />
              <StatCard title="Prediction accuracy" value="83%" sub="Latest production model" icon={Sparkles} />
              <StatCard title="Favorite teams" value="8" sub="Personalized tracking enabled" icon={Heart} />
              <StatCard title="Live alerts" value="12" sub="Goal / lineup / match reminders" icon={Target} />
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <Card className="rounded-[24px] border-white/10 bg-white/5">
                <CardHeader>
                  <SectionTitle
                    title="Upcoming matches"
                    subtitle="User clicks a match card to see the AI prediction for Over/Under 2.5 goals"
                  />
                </CardHeader>
                <CardContent className="grid gap-4 px-6 pb-6 md:grid-cols-2">
                  {upcomingMatches.map((match) => {
                    const active = selectedMatch.id === match.id;
                    return (
                      <button
                        key={match.id}
                        onClick={() => setSelectedMatch(match)}
                        className={`rounded-2xl border p-5 text-left transition ${
                          active
                            ? "border-emerald-400 bg-emerald-400/10"
                            : "border-white/10 bg-slate-900/80 hover:border-white/20 hover:bg-slate-900"
                        }`}
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <Badge className="rounded-full bg-white/10 text-slate-200 hover:bg-white/10">{match.league}</Badge>
                          <span className="text-xs text-slate-400">{match.date} · {match.time}</span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-3">
                            <span className="font-medium text-white">{match.home}</span>
                            <span className="text-xs text-slate-400">{match.homeForm}</span>
                          </div>
                          <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-3">
                            <span className="font-medium text-white">{match.away}</span>
                            <span className="text-xs text-slate-400">{match.awayForm}</span>
                          </div>
                        </div>
                        <div className="mt-4 flex items-center justify-between text-sm">
                          <span className="text-slate-300">Prediction ready</span>
                          <ChevronRight className="h-4 w-4 text-slate-400" />
                        </div>
                      </button>
                    );
                  })}
                </CardContent>
              </Card>

              <Card className="rounded-[24px] border-white/10 bg-gradient-to-br from-emerald-500/10 via-slate-900 to-slate-900">
                <CardHeader>
                  <SectionTitle
                    title="Selected match prediction"
                    subtitle="Main interaction: after clicking a match, the model shows Over / Under 2.5 confidence"
                  />
                </CardHeader>
                <CardContent className="space-y-5 px-6 pb-6">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm text-slate-400">{selectedMatch.league}</p>
                        <h3 className="mt-2 text-2xl font-bold text-white">
                          {selectedMatch.home} <span className="text-slate-500">vs</span> {selectedMatch.away}
                        </h3>
                      </div>
                      <Badge className="rounded-full bg-emerald-500/15 px-3 py-1 text-emerald-300 hover:bg-emerald-500/15">
                        {selectedMatch.prediction.confidence} confidence
                      </Badge>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-5">
                      <p className="text-sm text-emerald-300">Over 2.5</p>
                      <p className="mt-3 text-4xl font-bold text-white">{selectedMatch.prediction.over}%</p>
                      <p className="mt-2 text-sm text-slate-300">Model suggests a higher scoring match scenario.</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                      <p className="text-sm text-slate-300">Under 2.5</p>
                      <p className="mt-3 text-4xl font-bold text-white">{selectedMatch.prediction.under}%</p>
                      <p className="mt-2 text-sm text-slate-400">Alternative low-scoring probability.</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-slate-300">Expected goals</p>
                      <p className="text-lg font-semibold text-white">{selectedMatch.prediction.expectedGoals}</p>
                    </div>
                    <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400"
                        style={{ width: `${selectedMatch.prediction.over}%` }}
                      />
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                      <span>Lower scoring</span>
                      <span>Higher scoring</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
              <Card className="rounded-[24px] border-white/10 bg-white/5">
                <CardHeader>
                  <SectionTitle
                    title="Favorite teams"
                    subtitle="User selects a team card to open recent form, upcoming fixtures, and squad info"
                  />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search a team..."
                    className="border-white/10 bg-slate-900 text-white placeholder:text-slate-500"
                  />
                </CardHeader>
                <CardContent className="grid gap-4 px-6 pb-6 sm:grid-cols-2">
                  {filteredTeams.map((team) => {
                    const active = selectedTeam.id === team.id;
                    return (
                      <button
                        key={team.id}
                        onClick={() => setSelectedTeam(team)}
                        className={`rounded-2xl border p-4 text-left transition ${
                          active ? "border-cyan-400 bg-cyan-400/10" : "border-white/10 bg-slate-900/80 hover:bg-slate-900"
                        }`}
                      >
                        <div className={`mb-4 h-24 rounded-2xl bg-gradient-to-br ${team.colors}`} />
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <h4 className="font-semibold text-white">{team.name}</h4>
                            <p className="text-sm text-slate-400">{team.league}</p>
                          </div>
                          <Star className={`h-5 w-5 ${active ? "fill-yellow-400 text-yellow-400" : "text-slate-500"}`} />
                        </div>
                      </button>
                    );
                  })}
                </CardContent>
              </Card>

              <Card className="rounded-[24px] border-white/10 bg-white/5">
                <CardHeader>
                  <SectionTitle
                    title={selectedTeam.name}
                    subtitle="Focused team detail panel for the user role"
                  />
                </CardHeader>
                <CardContent className="grid gap-5 px-6 pb-6 md:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-5">
                    <p className="mb-3 text-sm font-medium text-slate-300">Last 5 matches</p>
                    <div className="space-y-3">
                      {selectedTeam.last5.map((item) => (
                        <div key={item} className="rounded-xl bg-white/5 px-3 py-2 text-sm text-white">
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-5">
                    <p className="mb-3 text-sm font-medium text-slate-300">Next 5 matches</p>
                    <div className="space-y-3">
                      {selectedTeam.next5.map((item) => (
                        <div key={item} className="rounded-xl bg-white/5 px-3 py-2 text-sm text-white">
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-5">
                    <p className="mb-3 text-sm font-medium text-slate-300">Players</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedTeam.players.map((player) => (
                        <Badge key={player} className="rounded-full bg-white/10 px-3 py-2 text-slate-200 hover:bg-white/10">
                          {player}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        )}

        {role === "scientist" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              <StatCard title="Model version" value="v2.8" sub="Production model active" icon={Sparkles} />
              <StatCard title="Accuracy" value="83%" sub="Last 30 days" icon={TrendingUp} />
              <StatCard title="F1 score" value="0.80" sub="Over/Under 2.5 task" icon={Target} />
              <StatCard title="Data drift" value="2.1%" sub="Current monitoring level" icon={BarChart3} />
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <Card className="rounded-[24px] border-white/10 bg-white/5">
                <CardHeader>
                  <SectionTitle
                    title="Model performance trend"
                    subtitle="Dashboard for the Data Scientist role to monitor the prediction model"
                  />
                </CardHeader>
                <CardContent className="h-[360px] px-4 pb-6 md:px-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={modelTrend}>
                      <defs>
                        <linearGradient id="acc" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#34d399" stopOpacity={0.45} />
                          <stop offset="95%" stopColor="#34d399" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="week" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 16 }} />
                      <Legend />
                      <Area type="monotone" dataKey="accuracy" stroke="#34d399" fill="url(#acc)" strokeWidth={3} />
                      <Area type="monotone" dataKey="f1" stroke="#38bdf8" fillOpacity={0} strokeWidth={2} />
                      <Area type="monotone" dataKey="auc" stroke="#a78bfa" fillOpacity={0} strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="rounded-[24px] border-white/10 bg-white/5">
                <CardHeader>
                  <SectionTitle
                    title="Feature importance"
                    subtitle="Explain which signals affect the model most"
                  />
                </CardHeader>
                <CardContent className="h-[360px] px-4 pb-6 md:px-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={features} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis type="number" stroke="#94a3b8" />
                      <YAxis type="category" dataKey="name" stroke="#94a3b8" width={110} />
                      <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 16 }} />
                      <Bar dataKey="value" radius={[0, 10, 10, 0]}>
                        {features.map((_, index) => (
                          <Cell key={index} fill={["#34d399", "#38bdf8", "#60a5fa", "#a78bfa", "#f59e0b", "#f472b6"][index]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
              <Card className="rounded-[24px] border-white/10 bg-white/5">
                <CardHeader>
                  <SectionTitle
                    title="Upcoming prediction table"
                    subtitle="Operational table of the model outputs before users consume them"
                  />
                </CardHeader>
                <CardContent className="px-6 pb-6">
                  <div className="overflow-hidden rounded-2xl border border-white/10">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-white/5 text-slate-300">
                        <tr>
                          <th className="px-4 py-3 font-medium">Match</th>
                          <th className="px-4 py-3 font-medium">Over</th>
                          <th className="px-4 py-3 font-medium">Under</th>
                          <th className="px-4 py-3 font-medium">Predicted label</th>
                          <th className="px-4 py-3 font-medium">Drift</th>
                        </tr>
                      </thead>
                      <tbody>
                        {predictionRows.map((row) => (
                          <tr key={row.match} className="border-t border-white/10 bg-slate-950/50">
                            <td className="px-4 py-4 text-white">{row.match}</td>
                            <td className="px-4 py-4">{row.over}%</td>
                            <td className="px-4 py-4">{row.under}%</td>
                            <td className="px-4 py-4">
                              <Badge className="rounded-full bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/15">{row.label}</Badge>
                            </td>
                            <td className="px-4 py-4">
                              <Badge className="rounded-full bg-white/10 text-slate-200 hover:bg-white/10">{row.drift}</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-[24px] border-white/10 bg-white/5">
                <CardHeader>
                  <SectionTitle
                    title="Control panel"
                    subtitle="A place for threshold, retraining, and monitoring actions"
                  />
                </CardHeader>
                <CardContent className="space-y-4 px-6 pb-6">
                  <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-5">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-slate-300">Prediction threshold</p>
                      <p className="font-semibold text-white">0.60</p>
                    </div>
                    <div className="mt-4 h-3 rounded-full bg-slate-800">
                      <div className="h-full w-[60%] rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400" />
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-5">
                    <p className="text-sm text-slate-300">Last retraining</p>
                    <p className="mt-2 text-xl font-semibold text-white">2 days ago</p>
                    <p className="mt-2 text-sm text-slate-400">Dataset version 2026.03.29 · 1.2M rows</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-5">
                    <p className="text-sm text-slate-300">Alerts</p>
                    <div className="mt-3 space-y-3 text-sm">
                      <div className="rounded-xl bg-white/5 px-3 py-3 text-slate-200">Milan vs Roma flagged for elevated drift</div>
                      <div className="rounded-xl bg-white/5 px-3 py-3 text-slate-200">Lineup ingestion delayed for 2 matches</div>
                      <div className="rounded-xl bg-white/5 px-3 py-3 text-slate-200">Feature store sync completed successfully</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        )}

        {role === "admin" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              <StatCard title="Monthly active users" value="18.4K" sub="+12% compared to last month" icon={Users} />
              <StatCard title="Tracked teams" value="96" sub="Across all supported leagues" icon={Heart} />
              <StatCard title="Top watched player" value="Haaland" sub="Highest user clicks this week" icon={Star} />
              <StatCard title="Avg session time" value="8m 24s" sub="Strong user engagement" icon={TrendingUp} />
            </div>

            <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
              <Card className="rounded-[24px] border-white/10 bg-white/5">
                <CardHeader>
                  <SectionTitle
                    title="Most followed teams"
                    subtitle="Admin sees which clubs receive the most user attention"
                  />
                </CardHeader>
                <CardContent className="h-[360px] px-4 pb-6 md:px-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={engagementTeams}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 12 }} interval={0} angle={-15} textAnchor="end" height={70} />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 16 }} />
                      <Bar dataKey="users" radius={[10, 10, 0, 0]} fill="#38bdf8" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="rounded-[24px] border-white/10 bg-white/5">
                <CardHeader>
                  <SectionTitle
                    title="Most viewed players"
                    subtitle="Player popularity from click and profile exploration behavior"
                  />
                </CardHeader>
                <CardContent className="h-[360px] px-4 pb-6 md:px-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 16 }} />
                      <Legend />
                      <Pie data={engagementPlayers} dataKey="value" nameKey="name" outerRadius={110} innerRadius={55}>
                        {engagementPlayers.map((_, index) => (
                          <Cell key={index} fill={["#34d399", "#38bdf8", "#f59e0b", "#a78bfa", "#f472b6"][index]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <Card className="rounded-[24px] border-white/10 bg-white/5">
                <CardHeader>
                  <SectionTitle
                    title="Engagement growth"
                    subtitle="How much content users consume and how often they save favorite teams"
                  />
                </CardHeader>
                <CardContent className="h-[340px] px-4 pb-6 md:px-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={traffic}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="month" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 16 }} />
                      <Legend />
                      <Area type="monotone" dataKey="views" stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.18} strokeWidth={2} />
                      <Area type="monotone" dataKey="favorites" stroke="#34d399" fill="#34d399" fillOpacity={0.12} strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="rounded-[24px] border-white/10 bg-white/5">
                <CardHeader>
                  <SectionTitle
                    title="Admin insight panel"
                    subtitle="Useful blocks for product and content decisions"
                  />
                </CardHeader>
                <CardContent className="space-y-4 px-6 pb-6">
                  <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-5">
                    <p className="text-sm text-slate-300">Top insight</p>
                    <p className="mt-2 text-lg font-semibold text-white">Premier League teams dominate favorites and match detail clicks</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-5">
                    <p className="text-sm text-slate-300">Content opportunity</p>
                    <p className="mt-2 text-lg font-semibold text-white">Player pages have higher engagement when combined with recent form cards</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-5">
                    <p className="text-sm text-slate-300">Recommended action</p>
                    <p className="mt-2 text-lg font-semibold text-white">Promote team follow suggestions after users open 2+ match prediction pages</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

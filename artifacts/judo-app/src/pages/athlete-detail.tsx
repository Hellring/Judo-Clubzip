import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetAthlete, useGetAthleteStats, useGetAthleteFights, useGetAthletePayments,
  useListWeightLogs, useAddWeightLog, useDeleteWeightLog,
} from "@workspace/api-client-react";
import { getGetAthleteQueryKey, getGetAthleteStatsQueryKey, getListWeightLogsQueryKey } from "@workspace/api-client-react";
import Layout from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Trophy, Swords, Plus, Trash2 } from "lucide-react";

function beltColor(belt?: string | null) {
  const colors: Record<string, string> = {
    white: "bg-white text-black border border-gray-300",
    yellow: "bg-yellow-400 text-yellow-900",
    orange: "bg-orange-400 text-white",
    green: "bg-green-600 text-white",
    blue: "bg-blue-600 text-white",
    brown: "bg-amber-800 text-white",
    black: "bg-gray-900 text-white",
  };
  const key = (belt ?? "").toLowerCase().split(" ")[0];
  return colors[key] ?? "bg-muted text-muted-foreground";
}

function WeightSparkline({ logs }: { logs: { weightKg: number; recordedAt: string }[] }) {
  if (logs.length < 2) return null;
  const sorted = [...logs].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
  const weights = sorted.map(l => l.weightKg);
  const minW = Math.min(...weights);
  const maxW = Math.max(...weights);
  const range = maxW - minW || 1;
  const W = 400, H = 120, PAD = 16;
  const innerW = W - PAD * 2, innerH = H - PAD * 2;

  const pts = sorted.map((l, i) => {
    const x = PAD + (i / (sorted.length - 1)) * innerW;
    const y = PAD + (1 - (l.weightKg - minW) / range) * innerH;
    return { x, y, w: l.weightKg, date: l.recordedAt };
  });
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none" style={{ height: 120 }}>
      <defs>
        <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(348 83% 47%)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="hsl(348 83% 47%)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L ${pts[pts.length - 1].x} ${H} L ${pts[0].x} ${H} Z`} fill="url(#wg)" />
      <path d={d} fill="none" stroke="hsl(348 83% 47%)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={4} fill="hsl(348 83% 47%)" />
          <title>{`${p.w} кг — ${new Date(p.date).toLocaleDateString("ru")}`}</title>
        </g>
      ))}
      <text x={PAD} y={PAD - 4} fontSize="10" fill="hsl(215 16% 47%)">{maxW} кг</text>
      <text x={PAD} y={H - 4} fontSize="10" fill="hsl(215 16% 47%)">{minW} кг</text>
    </svg>
  );
}

export default function AthleteDetailPage() {
  const { t } = useTranslation();
  const { athleteId } = useParams<{ athleteId: string }>();
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const id = parseInt(athleteId);

  const { data: athlete, isLoading } = useGetAthlete(id, {
    query: { enabled: !!id, queryKey: getGetAthleteQueryKey(id) }
  });
  const { data: stats } = useGetAthleteStats(id, {
    query: { enabled: !!id, queryKey: getGetAthleteStatsQueryKey(id) }
  });
  const { data: fights = [] } = useGetAthleteFights(id);
  const { data: payments = [] } = useGetAthletePayments(id);
  const { data: weightLogs = [] } = useListWeightLogs(id, {
    query: { enabled: !!id, queryKey: getListWeightLogsQueryKey(id) }
  });

  const addWeightLog = useAddWeightLog();
  const deleteWeightLog = useDeleteWeightLog();

  const [newWeight, setNewWeight] = useState("");
  const [newWeightDate, setNewWeightDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [newWeightNote, setNewWeightNote] = useState("");

  const handleAddWeight = () => {
    const kg = parseFloat(newWeight);
    if (!kg || kg <= 0) return;
    addWeightLog.mutate(
      {
        athleteId: id,
        data: {
          weightKg: kg,
          note: newWeightNote || undefined,
          recordedAt: new Date(newWeightDate).toISOString(),
        }
      },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListWeightLogsQueryKey(id) });
          setNewWeight("");
          setNewWeightNote("");
          setNewWeightDate(new Date().toISOString().slice(0, 10));
        }
      }
    );
  };

  const handleDeleteWeight = (logId: number) => {
    deleteWeightLog.mutate(
      { athleteId: id, logId },
      { onSuccess: () => qc.invalidateQueries({ queryKey: getListWeightLogsQueryKey(id) }) }
    );
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <Skeleton className="h-9 w-64" />
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28" />)}
          </div>
        </div>
      </Layout>
    );
  }

  if (!athlete) {
    return (
      <Layout>
        <div className="flex h-48 items-center justify-center">
          <p className="text-muted-foreground">Athlete not found.</p>
        </div>
      </Layout>
    );
  }

  const age = athlete.birthDate
    ? Math.floor((Date.now() - new Date(athlete.birthDate).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null;

  const sortedLogs = [...weightLogs].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/athletes")} data-testid="button-back-athletes">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">
                {athlete.firstName} {athlete.lastName}
              </h1>
              {athlete.belt && (
                <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${beltColor(athlete.belt)}`}>
                  {athlete.belt}
                </span>
              )}
            </div>
            <p className="text-muted-foreground mt-1">
              {athlete.gender === "male" ? t("Male") : t("Female")}
              {age !== null && ` · ${age} лет`}
              {athlete.weightKg && ` · ${athlete.weightKg} кг`}
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t("TotalFights")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-total-fights">{stats?.totalFights ?? 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t("WinRate")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600" data-testid="stat-win-rate">
                {stats?.winRate !== undefined ? `${(stats.winRate * 100).toFixed(0)}%` : "—"}
              </div>
              <p className="text-xs text-muted-foreground">{stats?.wins ?? 0}W / {stats?.losses ?? 0}L</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t("WinsByIppon")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600" data-testid="stat-ippon-wins">{stats?.ipponWins ?? 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t("ShidoReceived")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600" data-testid="stat-shido">{stats?.shidoReceived ?? 0}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="weight">
          <TabsList>
            <TabsTrigger value="weight">{t("WeightChart")}</TabsTrigger>
            <TabsTrigger value="fights">{t("FightHistory")}</TabsTrigger>
            <TabsTrigger value="payments">{t("PaymentHistory")}</TabsTrigger>
            <TabsTrigger value="info">Информация</TabsTrigger>
          </TabsList>

          <TabsContent value="weight" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("WeightChart")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {sortedLogs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("NoData")}</p>
                ) : (
                  <div className="rounded-lg border bg-muted/30 p-2 overflow-hidden">
                    <WeightSparkline logs={sortedLogs} />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1 px-1">
                      <span>{new Date(sortedLogs[0].recordedAt).toLocaleDateString("ru")}</span>
                      <span>{new Date(sortedLogs[sortedLogs.length - 1].recordedAt).toLocaleDateString("ru")}</span>
                    </div>
                  </div>
                )}

                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold mb-3">{t("AddWeightLog")}</h4>
                  <div className="flex flex-wrap gap-2">
                    <Input
                      type="number"
                      placeholder={t("WeightKg")}
                      value={newWeight}
                      onChange={e => setNewWeight(e.target.value)}
                      className="w-32"
                      data-testid="input-weight-kg"
                    />
                    <Input
                      type="date"
                      value={newWeightDate}
                      onChange={e => setNewWeightDate(e.target.value)}
                      className="w-40"
                    />
                    <Input
                      placeholder={t("Notes")}
                      value={newWeightNote}
                      onChange={e => setNewWeightNote(e.target.value)}
                      className="w-40"
                    />
                    <Button
                      size="sm"
                      onClick={handleAddWeight}
                      disabled={!newWeight || addWeightLog.isPending}
                      data-testid="btn-add-weight"
                      className="gap-1"
                    >
                      <Plus className="h-4 w-4" />
                      {t("AddWeightLog")}
                    </Button>
                  </div>
                </div>

                {weightLogs.length > 0 && (
                  <div className="divide-y max-h-48 overflow-y-auto border rounded-lg">
                    {[...weightLogs].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt)).map(log => (
                      <div key={log.id} className="flex items-center justify-between px-3 py-2 text-sm" data-testid={`row-weight-${log.id}`}>
                        <div>
                          <span className="font-semibold">{log.weightKg} кг</span>
                          {log.note && <span className="text-muted-foreground ml-2">{log.note}</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">{new Date(log.recordedAt).toLocaleDateString("ru")}</span>
                          <Button
                            variant="ghost" size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteWeight(log.id)}
                            data-testid={`btn-delete-weight-${log.id}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fights" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                {fights.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("NoData")}</p>
                ) : (
                  <div className="divide-y">
                    {fights.map((f) => (
                      <div key={f.id} className="flex items-center justify-between py-3" data-testid={`row-fight-${f.id}`}>
                        <div className="flex items-center gap-3">
                          {f.isWinner
                            ? <Trophy className="h-5 w-5 text-amber-500" />
                            : <Swords className="h-5 w-5 text-muted-foreground" />}
                          <div>
                            <p className="font-medium">
                              {t("vs")} {(f as any).opponent
                                ? `${(f as any).opponent.firstName} ${(f as any).opponent.lastName}`
                                : "—"}
                            </p>
                            <p className="text-xs text-muted-foreground">{f.status}</p>
                          </div>
                        </div>
                        <Badge variant={f.isWinner ? "default" : "secondary"}>
                          {f.isWinner ? t("Winner") : "—"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                {payments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("NoData")}</p>
                ) : (
                  <div className="divide-y">
                    {payments.map((p) => (
                      <div key={p.id} className="flex items-center justify-between py-3" data-testid={`row-payment-${p.id}`}>
                        <div>
                          <p className="font-medium">{p.description}</p>
                          <p className="text-sm text-muted-foreground">
                            {p.dueDate ? new Date(p.dueDate).toLocaleDateString() : "—"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{p.amount} {p.currency}</p>
                          <Badge variant={p.status === "paid" ? "default" : p.status === "overdue" ? "destructive" : "secondary"}>
                            {t(p.status.charAt(0).toUpperCase() + p.status.slice(1) as any)}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="info" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                <dl className="grid grid-cols-2 gap-4 text-sm">
                  {athlete.phone && (
                    <>
                      <dt className="text-muted-foreground">{t("Phone")}</dt>
                      <dd className="font-medium">{athlete.phone}</dd>
                    </>
                  )}
                  {athlete.parentName && (
                    <>
                      <dt className="text-muted-foreground">{t("ParentName")}</dt>
                      <dd className="font-medium">{athlete.parentName}</dd>
                    </>
                  )}
                  {athlete.parentPhone && (
                    <>
                      <dt className="text-muted-foreground">{t("ParentPhone")}</dt>
                      <dd className="font-medium">{athlete.parentPhone}</dd>
                    </>
                  )}
                  {athlete.notes && (
                    <>
                      <dt className="text-muted-foreground">{t("Notes")}</dt>
                      <dd className="font-medium">{athlete.notes}</dd>
                    </>
                  )}
                </dl>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

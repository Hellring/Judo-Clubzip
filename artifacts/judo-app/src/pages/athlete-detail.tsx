import { useParams, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import {
  useGetAthlete, useGetAthleteStats, useGetAthleteFights, useGetAthletePayments,
} from "@workspace/api-client-react";
import { getGetAthleteQueryKey, getGetAthleteStatsQueryKey } from "@workspace/api-client-react";
import Layout from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Trophy, Swords, AlertTriangle } from "lucide-react";

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

export default function AthleteDetailPage() {
  const { t } = useTranslation();
  const { athleteId } = useParams<{ athleteId: string }>();
  const [, setLocation] = useLocation();
  const id = parseInt(athleteId);

  const { data: athlete, isLoading } = useGetAthlete(id, {
    query: { enabled: !!id, queryKey: getGetAthleteQueryKey(id) }
  });
  const { data: stats } = useGetAthleteStats(id, {
    query: { enabled: !!id, queryKey: getGetAthleteStatsQueryKey(id) }
  });
  const { data: fights = [] } = useGetAthleteFights(id);
  const { data: payments = [] } = useGetAthletePayments(id);

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

        <Tabs defaultValue="fights">
          <TabsList>
            <TabsTrigger value="fights">{t("FightHistory")}</TabsTrigger>
            <TabsTrigger value="payments">{t("PaymentHistory")}</TabsTrigger>
            <TabsTrigger value="info">Информация</TabsTrigger>
          </TabsList>

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

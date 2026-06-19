import { useParams, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import {
  useGetClub, useGetClubStats, useListClubMembers,
  useListClubAthletes, useListClubCoaches,
} from "@workspace/api-client-react";
import { getGetClubQueryKey, getGetClubStatsQueryKey } from "@workspace/api-client-react";
import Layout from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Trophy, CreditCard, ArrowLeft, UserCog, MapPin, GraduationCap, User } from "lucide-react";

export default function ClubDetailPage() {
  const { t } = useTranslation();
  const { clubId } = useParams<{ clubId: string }>();
  const [, setLocation] = useLocation();
  const id = parseInt(clubId);

  const { data: club, isLoading: clubLoading } = useGetClub(id, {
    query: { enabled: !!id, queryKey: getGetClubQueryKey(id) }
  });
  const { data: stats, isLoading: statsLoading } = useGetClubStats(id, {
    query: { enabled: !!id, queryKey: getGetClubStatsQueryKey(id) }
  });
  const { data: members = [] } = useListClubMembers(id);
  const { data: athletes = [] } = useListClubAthletes(id);
  const { data: coaches = [] } = useListClubCoaches(id);

  if (clubLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <Skeleton className="h-9 w-64" />
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-28" />)}
          </div>
        </div>
      </Layout>
    );
  }

  if (!club) {
    return (
      <Layout>
        <div className="flex h-48 items-center justify-center">
          <p className="text-muted-foreground">Club not found.</p>
        </div>
      </Layout>
    );
  }

  const age = (birthDate?: string | null) => {
    if (!birthDate) return null;
    return Math.floor((Date.now() - new Date(birthDate).getTime()) / (365.25 * 24 * 3600 * 1000));
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/clubs")} data-testid="button-back-clubs">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{club.name}</h1>
            {(club.city || club.country) && (
              <p className="text-muted-foreground flex items-center gap-1 mt-1">
                <MapPin className="h-4 w-4" />
                {[club.city, club.country].filter(Boolean).join(", ")}
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("TotalAthletes")}</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-athletes">{stats?.totalAthletes ?? 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("TotalCoaches")}</CardTitle>
              <UserCog className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-coaches">{stats?.totalCoaches ?? 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("TotalCompetitions")}</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-competitions">{stats?.totalCompetitions ?? 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("PendingPayments")}</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-pending">{stats?.pendingPayments ?? 0}</div>
            </CardContent>
          </Card>
        </div>

        {club.description && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground">{club.description}</p>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="athletes">
          <TabsList>
            <TabsTrigger value="athletes">
              <Users className="h-4 w-4 mr-2" />
              {t("Athletes")} ({athletes.length})
            </TabsTrigger>
            <TabsTrigger value="coaches">
              <GraduationCap className="h-4 w-4 mr-2" />
              Тренеры ({coaches.length})
            </TabsTrigger>
            <TabsTrigger value="members">
              <UserCog className="h-4 w-4 mr-2" />
              {t("Members")} ({members.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="athletes" className="mt-4">
            <Card>
              <CardContent className="pt-4">
                {athletes.length === 0 ? (
                  <div className="flex h-32 flex-col items-center justify-center gap-2 text-muted-foreground">
                    <Users className="h-8 w-8 opacity-40" />
                    <p className="text-sm">{t("NoData")}</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {athletes.map((a) => (
                      <div
                        key={a.id}
                        className="flex items-center justify-between py-3 cursor-pointer hover:bg-muted/30 -mx-2 px-2 rounded"
                        onClick={() => setLocation(`/athletes/${a.id}`)}
                        data-testid={`row-athlete-${a.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{a.firstName} {a.lastName}</p>
                            <p className="text-xs text-muted-foreground">
                              {a.gender === "male" ? t("Male") : t("Female")}
                              {age(a.birthDate) ? ` · ${age(a.birthDate)} лет` : ""}
                              {(a as any).weightKg ? ` · ${(a as any).weightKg} кг` : ""}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {(a as any).belt && (
                            <Badge variant="outline" className="text-xs">{(a as any).belt}</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="coaches" className="mt-4">
            <Card>
              <CardContent className="pt-4">
                {coaches.length === 0 ? (
                  <div className="flex h-32 flex-col items-center justify-center gap-2 text-muted-foreground">
                    <GraduationCap className="h-8 w-8 opacity-40" />
                    <p className="text-sm">Нет тренеров / администраторов в этом клубе</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {coaches.map((c) => (
                      <div key={c.id} className="flex items-center justify-between py-3" data-testid={`row-coach-${c.id}`}>
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-secondary/50 flex items-center justify-center">
                            <UserCog className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium">
                              {c.firstName || c.lastName
                                ? `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim()
                                : c.email}
                            </p>
                            <p className="text-sm text-muted-foreground">{c.email}</p>
                          </div>
                        </div>
                        <Badge variant={c.role === "club_admin" ? "default" : "secondary"} className="text-xs">
                          {c.role === "club_admin" ? "Администратор" : "Тренер"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="members" className="mt-4">
            <Card>
              <CardContent className="pt-4">
                {members.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("NoData")}</p>
                ) : (
                  <div className="divide-y">
                    {members.map((m) => (
                      <div key={m.id} className="flex items-center justify-between py-3" data-testid={`row-member-${m.id}`}>
                        <div>
                          <p className="font-medium">
                            {(m as any).user?.firstName} {(m as any).user?.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground">{(m as any).user?.email}</p>
                        </div>
                        <Badge variant="secondary">{m.role}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {stats?.recentCompetitions && stats.recentCompetitions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t("RecentCompetitions")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y">
                {stats.recentCompetitions.map((comp) => (
                  <div
                    key={comp.id}
                    className="flex items-center justify-between py-3 cursor-pointer hover:bg-muted/30 -mx-2 px-2 rounded"
                    onClick={() => setLocation(`/competitions/${comp.id}`)}
                    data-testid={`row-competition-${comp.id}`}
                  >
                    <div>
                      <p className="font-medium">{comp.name}</p>
                      <p className="text-sm text-muted-foreground">{new Date(comp.date).toLocaleDateString()}</p>
                    </div>
                    <Badge variant={comp.status === "active" ? "default" : "secondary"}>
                      {t(comp.status.charAt(0).toUpperCase() + comp.status.slice(1) as any)}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}

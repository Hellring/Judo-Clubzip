import { useParams, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useGetClub, useGetClubStats, useListClubMembers } from "@workspace/api-client-react";
import { getGetClubQueryKey, getGetClubStatsQueryKey } from "@workspace/api-client-react";
import Layout from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Trophy, CreditCard, ArrowLeft, UserCog, MapPin } from "lucide-react";

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

        <Card>
          <CardHeader>
            <CardTitle>{t("Members")}</CardTitle>
          </CardHeader>
          <CardContent>
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

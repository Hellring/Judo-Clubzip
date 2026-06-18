import { useTranslation } from "react-i18next";
import { useGetMe, useGetClubStats, getGetClubStatsQueryKey } from "@workspace/api-client-react";
import Layout from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCog, Trophy, CreditCard } from "lucide-react";

export default function DashboardPage() {
  const { t } = useTranslation();
  const { data: user } = useGetMe();
  const clubId = user?.clubId || 0;
  const { data: stats, isLoading } = useGetClubStats(clubId, {
    query: { enabled: !!user?.clubId, queryKey: getGetClubStatsQueryKey(clubId) }
  });

  if (!user?.clubId) {
    return (
      <Layout>
        <div className="flex h-[50vh] items-center justify-center">
          <p className="text-muted-foreground">You are not assigned to a club yet.</p>
        </div>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="flex h-full items-center justify-center">
          <p className="text-muted-foreground">{t('Loading')}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">{t('Dashboard')}</h1>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Athletes</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalAthletes || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Coaches</CardTitle>
              <UserCog className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalCoaches || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Competitions</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalCompetitions || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.pendingPayments || 0}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle>Recent Competitions</CardTitle>
            </CardHeader>
            <CardContent>
              {stats?.recentCompetitions?.length ? (
                <div className="space-y-4">
                  {stats.recentCompetitions.map(comp => (
                    <div key={comp.id} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                      <div>
                        <p className="font-medium">{comp.name}</p>
                        <p className="text-sm text-muted-foreground">{new Date(comp.date).toLocaleDateString()}</p>
                      </div>
                      <div className="text-sm uppercase font-semibold text-muted-foreground">
                        {comp.status}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No recent competitions.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}

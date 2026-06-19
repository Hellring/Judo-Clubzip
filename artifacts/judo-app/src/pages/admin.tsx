import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useListAdminUsers, useUpdateAdminUser, useListClubs } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, CheckCircle } from "lucide-react";

const ROLES = ["super_admin", "club_admin", "coach", "athlete", "parent"] as const;
type Role = typeof ROLES[number];

function roleBadgeVariant(role: string): "default" | "secondary" | "outline" | "destructive" {
  if (role === "super_admin") return "destructive";
  if (role === "club_admin") return "default";
  if (role === "coach") return "secondary";
  return "outline";
}

interface UserRowProps {
  user: {
    id: number;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    role: string;
    clubId?: number | null;
    clubName?: string | null;
  };
  clubs: { id: number; name: string }[];
  onSave: (userId: number, role: Role, clubId: number | null) => void;
  saving: boolean;
  saved: boolean;
}

function UserRow({ user, clubs, onSave, saving, saved }: UserRowProps) {
  const { t } = useTranslation();
  const [role, setRole] = useState<Role>(user.role as Role);
  const [clubId, setClubId] = useState<string>(user.clubId?.toString() ?? "none");
  const changed = role !== user.role || (user.clubId?.toString() ?? "none") !== clubId;

  return (
    <div className="flex flex-col md:flex-row md:items-center gap-3 py-4 border-b last:border-0" data-testid={`row-user-${user.id}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium truncate">
            {user.firstName || user.lastName
              ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim()
              : user.email}
          </p>
          {saved && <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />}
        </div>
        <p className="text-sm text-muted-foreground truncate">{user.email}</p>
        {user.clubName && (
          <p className="text-xs text-muted-foreground">{user.clubName}</p>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Select value={role} onValueChange={(v) => setRole(v as Role)}>
          <SelectTrigger className="w-44" data-testid={`select-role-${user.id}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLES.map(r => (
              <SelectItem key={r} value={r}>{t(r as any)}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={clubId} onValueChange={setClubId}>
          <SelectTrigger className="w-44" data-testid={`select-club-${user.id}`}>
            <SelectValue placeholder={t("NoClub")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{t("NoClub")}</SelectItem>
            {clubs.map(c => (
              <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          size="sm"
          disabled={!changed || saving}
          onClick={() => onSave(user.id, role, clubId === "none" ? null : parseInt(clubId))}
          data-testid={`btn-save-user-${user.id}`}
        >
          {t("SaveRole")}
        </Button>

        <Badge variant={roleBadgeVariant(user.role)} className="text-xs">
          {t(user.role as any)}
        </Badge>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: users = [], isLoading } = useListAdminUsers();
  const { data: clubs = [] } = useListClubs();
  const updateUser = useUpdateAdminUser();
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());

  const handleSave = (userId: number, role: string, clubId: number | null) => {
    updateUser.mutate(
      { userId, data: { role: role as Role, clubId } },
      {
        onSuccess: () => {
          setSavedIds(prev => new Set(prev).add(userId));
          setTimeout(() => setSavedIds(prev => {
            const next = new Set(prev);
            next.delete(userId);
            return next;
          }), 2000);
          queryClient.invalidateQueries({ queryKey: ["listAdminUsers"] });
        }
      }
    );
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Shield className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t("Admin")}</h1>
            <p className="text-muted-foreground text-sm">{t("UserManagement")}</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("UserManagement")}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}
              </div>
            ) : users.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("NoData")}</p>
            ) : (
              <div>
                {users.map(user => (
                  <UserRow
                    key={user.id}
                    user={user}
                    clubs={clubs as { id: number; name: string }[]}
                    onSave={handleSave}
                    saving={updateUser.isPending}
                    saved={savedIds.has(user.id)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

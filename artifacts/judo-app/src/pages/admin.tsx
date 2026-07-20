import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  useListAdminUsers,
  useUpdateAdminUser,
  useDeleteAdminUser,
  useListClubs,
  useCreateInvitation,
  useCreateAdminUser,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, CheckCircle, Mail, Send, UserPlus, Trash2, AlertCircle, Users } from "lucide-react";

const ROLES = ["super_admin", "club_admin", "coach", "athlete", "parent", "pending"] as const;
type Role = typeof ROLES[number];
const ASSIGNABLE_ROLES = ["super_admin", "club_admin", "coach", "athlete", "parent"] as const;

function roleBadgeVariant(role: string): "default" | "secondary" | "outline" | "destructive" {
  if (role === "super_admin") return "destructive";
  if (role === "club_admin") return "default";
  if (role === "coach") return "secondary";
  if (role === "pending") return "outline";
  return "outline";
}

type UserData = {
  id: number;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  role: string;
  clubId?: number | null;
  clubName?: string | null;
  parentId?: number | null;
  parentName?: string | null;
};

interface UserRowProps {
  user: UserData;
  clubs: { id: number; name: string }[];
  allUsers: UserData[];
  onSave: (userId: number, role: Role, clubId: number | null, parentId: number | null) => void;
  onDelete: (userId: number) => void;
  saving: boolean;
  saved: boolean;
  deleting: boolean;
}

function UserRow({ user, clubs, allUsers, onSave, onDelete, saving, saved, deleting }: UserRowProps) {
  const { t } = useTranslation();
  const [role, setRole] = useState<Role>(user.role as Role);
  const [clubId, setClubId] = useState<string>(user.clubId?.toString() ?? "none");
  const [parentId, setParentId] = useState<string>(user.parentId?.toString() ?? "none");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const changed =
    role !== user.role ||
    (user.clubId?.toString() ?? "none") !== clubId ||
    (user.parentId?.toString() ?? "none") !== parentId;

  const isPending = user.role === "pending";

  // Only show parent selector for athletes
  const showParentSelector = role === "athlete" || role === "pending";
  const parentUsers = allUsers.filter(u => u.role === "parent" || u.role === "super_admin" || u.role === "club_admin");

  return (
    <div
      className={`flex flex-col gap-3 py-4 border-b last:border-0 ${isPending ? "bg-amber-50/50 -mx-6 px-6 rounded-lg" : ""}`}
      data-testid={`row-user-${user.id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium truncate">
              {user.firstName || user.lastName
                ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim()
                : user.email}
            </p>
            {isPending && (
              <Badge variant="outline" className="text-amber-600 border-amber-400 bg-amber-50 text-xs">
                <AlertCircle className="h-3 w-3 mr-1" />
                Ожидает роли
              </Badge>
            )}
            {saved && <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />}
          </div>
          <p className="text-sm text-muted-foreground truncate">{user.email}</p>
          {user.clubName && <p className="text-xs text-muted-foreground">{user.clubName}</p>}
          {user.parentName && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Users className="h-3 w-3" />
              Родитель: {user.parentName}
            </p>
          )}
        </div>
        <Badge variant={roleBadgeVariant(user.role)} className="text-xs flex-shrink-0">
          {t(user.role as any)}
        </Badge>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Select value={role} onValueChange={(v) => setRole(v as Role)}>
          <SelectTrigger className="w-40" data-testid={`select-role-${user.id}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ASSIGNABLE_ROLES.map(r => (
              <SelectItem key={r} value={r}>{t(r as any)}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={clubId} onValueChange={setClubId}>
          <SelectTrigger className="w-40" data-testid={`select-club-${user.id}`}>
            <SelectValue placeholder={t("NoClub")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{t("NoClub")}</SelectItem>
            {clubs.map(c => (
              <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {showParentSelector && (
          <Select value={parentId} onValueChange={setParentId}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Родитель" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Без родителя</SelectItem>
              {parentUsers.filter(u => u.id !== user.id).map(u => (
                <SelectItem key={u.id} value={u.id.toString()}>
                  {u.firstName || u.lastName
                    ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim()
                    : u.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Button
          size="sm"
          disabled={!changed || saving}
          onClick={() => onSave(
            user.id,
            role,
            clubId === "none" ? null : parseInt(clubId),
            parentId === "none" ? null : parseInt(parentId),
          )}
          data-testid={`btn-save-user-${user.id}`}
          variant={isPending ? "default" : "secondary"}
        >
          {isPending ? "Назначить роль" : t("SaveRole")}
        </Button>

        {confirmDelete ? (
          <div className="flex items-center gap-1">
            <span className="text-xs text-destructive">Удалить?</span>
            <Button
              size="sm"
              variant="destructive"
              disabled={deleting}
              onClick={() => { onDelete(user.id); setConfirmDelete(false); }}
            >
              {deleting ? "..." : "Да"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setConfirmDelete(false)}>Нет</Button>
          </div>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => setConfirmDelete(true)}
            data-testid={`btn-delete-user-${user.id}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

function CreateUserSection({ clubs }: { clubs: { id: number; name: string }[] }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const createUser = useCreateAdminUser();
  const [form, setForm] = useState({
    email: "", password: "", firstName: "", lastName: "",
    role: "pending" as Role, clubId: "none",
  });
  const [result, setResult] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);
    createUser.mutate(
      {
        data: {
          email: form.email.trim(),
          password: form.password,
          firstName: form.firstName || undefined,
          lastName: form.lastName || undefined,
          role: form.role,
          clubId: form.clubId !== "none" ? parseInt(form.clubId) : null,
        }
      },
      {
        onSuccess: () => {
          setResult({ type: "success", message: `Пользователь ${form.email} создан.` });
          setForm({ email: "", password: "", firstName: "", lastName: "", role: "pending", clubId: "none" });
          queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
        },
        onError: (err: any) => {
          const msg = err?.response?.data?.error ?? "Не удалось создать пользователя.";
          setResult({ type: "error", message: msg });
        },
      }
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          Создать пользователя (без подтверждения почты)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Имя</Label>
              <Input placeholder="Иван" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Фамилия</Label>
              <Input placeholder="Иванов" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input type="email" placeholder="user@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label>Пароль *</Label>
              <Input type="password" placeholder="Минимум 8 символов" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Роль <span className="text-muted-foreground text-xs">(можно оставить «Ожидает»)</span></Label>
              <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v as Role }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Ожидает роли</SelectItem>
                  {ASSIGNABLE_ROLES.map(r => <SelectItem key={r} value={r}>{t(r as any)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Клуб</Label>
              <Select value={form.clubId} onValueChange={v => setForm(f => ({ ...f, clubId: v }))}>
                <SelectTrigger><SelectValue placeholder={t("NoClub")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("NoClub")}</SelectItem>
                  {clubs.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button type="submit" disabled={createUser.isPending || !form.email || !form.password}>
            <UserPlus className="h-4 w-4 mr-2" />
            {createUser.isPending ? "Создание..." : "Создать пользователя"}
          </Button>
          {result && (
            <p className={`text-sm ${result.type === "success" ? "text-green-600" : "text-destructive"}`}>
              {result.type === "success" ? "✓ " : "✗ "}{result.message}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Пользователь сразу получит доступ. Роль можно назначить позже в списке ниже.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

function InviteSection() {
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const invite = useCreateInvitation();

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setResult(null);
    invite.mutate(
      { data: { emailAddress: email.trim() } },
      {
        onSuccess: (data) => { setResult({ type: "success", message: data.message }); setEmail(""); },
        onError: () => { setResult({ type: "error", message: "Не удалось отправить приглашение." }); },
      }
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Mail className="h-4 w-4" />
          Пригласить пользователя по email
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleInvite} className="flex gap-3 items-end">
          <div className="flex-1 space-y-2">
            <Label>Email-адрес</Label>
            <Input type="email" placeholder="user@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <Button type="submit" disabled={invite.isPending || !email.trim()}>
            <Send className="h-4 w-4 mr-2" />
            {invite.isPending ? "Отправка..." : "Отправить"}
          </Button>
        </form>
        {result && (
          <p className={`mt-3 text-sm ${result.type === "success" ? "text-green-600" : "text-destructive"}`}>
            {result.type === "success" ? "✓ " : "✗ "}{result.message}
          </p>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          Пользователь получит письмо со ссылкой. После регистрации роль будет «ожидает» — назначьте её в списке ниже.
        </p>
      </CardContent>
    </Card>
  );
}

export default function AdminPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: usersRaw, isLoading } = useListAdminUsers();
  const users = (Array.isArray(usersRaw) ? usersRaw : []) as NonNullable<typeof usersRaw>;
  const { data: clubs = [] } = useListClubs();
  const updateUser = useUpdateAdminUser();
  const deleteUser = useDeleteAdminUser();
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());

  const QUERY_KEY = ["/api/admin/users"];

  const pendingUsers = users.filter(u => u.role === "pending");
  const activeUsers = users.filter(u => u.role !== "pending");

  const handleSave = (userId: number, role: string, clubId: number | null, parentId: number | null) => {
    updateUser.mutate(
      { userId, data: { role: role as any, clubId, parentId } },
      {
        onSuccess: () => {
          setSavedIds(prev => {
            const next = new Set(prev);
            next.add(userId);
            setTimeout(() => setSavedIds(p => { const n = new Set(p); n.delete(userId); return n; }), 2000);
            return next;
          });
          queryClient.invalidateQueries({ queryKey: QUERY_KEY });
        }
      }
    );
  };

  const handleDelete = (userId: number) => {
    deleteUser.mutate({ userId }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: QUERY_KEY }); }
    });
  };

  const userRowProps = (user: UserData) => ({
    key: user.id,
    user,
    clubs: clubs as { id: number; name: string }[],
    allUsers: users as UserData[],
    onSave: handleSave,
    onDelete: handleDelete,
    saving: updateUser.isPending,
    saved: savedIds.has(user.id),
    deleting: deleteUser.isPending,
  });

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

        <CreateUserSection clubs={clubs as { id: number; name: string }[]} />
        <InviteSection />

        {/* Pending users — needs attention */}
        {pendingUsers.length > 0 && (
          <Card className="border-amber-300 bg-amber-50/30">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-amber-700">
                <AlertCircle className="h-4 w-4" />
                Ожидают назначения роли
                <Badge variant="outline" className="border-amber-400 text-amber-700 text-xs ml-auto">
                  {pendingUsers.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">{[1,2].map(i => <Skeleton key={i} className="h-16" />)}</div>
              ) : (
                <div>
                  {pendingUsers.map(user => (
                    <UserRow {...userRowProps(user)} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* All users */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("UserManagement")}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}</div>
            ) : activeUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("NoData")}</p>
            ) : (
              <div>
                {activeUsers.map(user => (
                  <UserRow {...userRowProps(user)} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

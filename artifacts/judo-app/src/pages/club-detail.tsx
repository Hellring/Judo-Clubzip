import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetClub, useGetClubStats, useListClubMembers,
  useListClubAthletes, useListClubCoaches,
  useAddClubMember, useRemoveClubMember, useCreateAthlete,
  getListClubMembersQueryKey, getListClubCoachesQueryKey,
  getGetClubStatsQueryKey, getListClubAthletesQueryKey,
} from "@workspace/api-client-react";
import { getGetClubQueryKey } from "@workspace/api-client-react";
import Layout from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Trophy, CreditCard, ArrowLeft, UserCog, MapPin, GraduationCap, User, UserPlus, Trash2 } from "lucide-react";

export default function ClubDetailPage() {
  const { t } = useTranslation();
  const { clubId } = useParams<{ clubId: string }>();
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
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

  const addMember = useAddClubMember();
  const removeMember = useRemoveClubMember();
  const createAthlete = useCreateAthlete();

  const [athleteOpen, setAthleteOpen] = useState(false);
  const [showAthleteContacts, setShowAthleteContacts] = useState(false);
  const [athleteForm, setAthleteForm] = useState({
    firstName: "", lastName: "", gender: "male", birthDate: "", weightKg: "", belt: "",
    phone: "", parentName: "", parentPhone: "", notes: "",
  });

  const BELTS = ["Белый", "Жёлтый", "Оранжевый", "Зелёный", "Синий", "Коричневый", "Чёрный"];

  const handleAddAthlete = (e: React.FormEvent) => {
    e.preventDefault();
    createAthlete.mutate(
      {
        data: {
          clubId: id,
          firstName: athleteForm.firstName,
          lastName: athleteForm.lastName,
          gender: athleteForm.gender as "male" | "female",
          birthDate: athleteForm.birthDate || undefined,
          weightKg: athleteForm.weightKg ? parseFloat(athleteForm.weightKg) : undefined,
          belt: athleteForm.belt || undefined,
          phone: athleteForm.phone || undefined,
          parentName: athleteForm.parentName || undefined,
          parentPhone: athleteForm.parentPhone || undefined,
          notes: athleteForm.notes || undefined,
        },
      },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListClubAthletesQueryKey(id) });
          qc.invalidateQueries({ queryKey: getGetClubStatsQueryKey(id) });
          setAthleteOpen(false);
          setShowAthleteContacts(false);
          setAthleteForm({ firstName: "", lastName: "", gender: "male", birthDate: "", weightKg: "", belt: "", phone: "", parentName: "", parentPhone: "", notes: "" });
        },
      }
    );
  };

  const [coachOpen, setCoachOpen] = useState(false);
  const [coachForm, setCoachForm] = useState({
    email: "", firstName: "", lastName: "", role: "coach" as "coach" | "club_admin",
  });
  const [coachError, setCoachError] = useState("");

  const handleAddCoach = (e: React.FormEvent) => {
    e.preventDefault();
    if (!coachForm.email.trim()) return;
    setCoachError("");
    addMember.mutate(
      { clubId: id, data: { email: coachForm.email.trim(), role: coachForm.role, firstName: coachForm.firstName || undefined, lastName: coachForm.lastName || undefined } as any },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListClubMembersQueryKey(id) });
          qc.invalidateQueries({ queryKey: getListClubCoachesQueryKey(id) });
          qc.invalidateQueries({ queryKey: getGetClubStatsQueryKey(id) });
          setCoachOpen(false);
          setCoachForm({ email: "", firstName: "", lastName: "", role: "coach" });
        },
        onError: (err: any) => {
          setCoachError(err?.message ?? "Ошибка при добавлении тренера");
        },
      }
    );
  };

  const handleRemoveMember = (memberId: number) => {
    removeMember.mutate(
      { clubId: id, memberId },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListClubMembersQueryKey(id) });
          qc.invalidateQueries({ queryKey: getListClubCoachesQueryKey(id) });
          qc.invalidateQueries({ queryKey: getGetClubStatsQueryKey(id) });
        },
      }
    );
  };

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
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base">Список спортсменов</CardTitle>
                <Dialog open={athleteOpen} onOpenChange={setAthleteOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" data-testid="btn-add-athlete-club">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Добавить спортсмена
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Добавить спортсмена</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddAthlete} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>{t("FirstName")} *</Label>
                          <Input value={athleteForm.firstName} onChange={e => setAthleteForm(f => ({ ...f, firstName: e.target.value }))} required />
                        </div>
                        <div className="space-y-2">
                          <Label>{t("LastName")} *</Label>
                          <Input value={athleteForm.lastName} onChange={e => setAthleteForm(f => ({ ...f, lastName: e.target.value }))} required />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>{t("Gender")} *</Label>
                          <Select value={athleteForm.gender} onValueChange={v => setAthleteForm(f => ({ ...f, gender: v }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="male">{t("Male")}</SelectItem>
                              <SelectItem value="female">{t("Female")}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>{t("BirthDate")}</Label>
                          <Input type="date" value={athleteForm.birthDate} onChange={e => setAthleteForm(f => ({ ...f, birthDate: e.target.value }))} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>{t("Weight")}</Label>
                          <Input type="number" step="0.1" value={athleteForm.weightKg} onChange={e => setAthleteForm(f => ({ ...f, weightKg: e.target.value }))} />
                        </div>
                        <div className="space-y-2">
                          <Label>{t("Belt")}</Label>
                          <Select value={athleteForm.belt} onValueChange={v => setAthleteForm(f => ({ ...f, belt: v }))}>
                            <SelectTrigger><SelectValue placeholder="Выберите пояс" /></SelectTrigger>
                            <SelectContent>
                              {BELTS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      {!showAthleteContacts ? (
                        <button
                          type="button"
                          onClick={() => setShowAthleteContacts(true)}
                          className="text-sm text-primary hover:underline flex items-center gap-1"
                        >
                          + Добавить контактные данные
                        </button>
                      ) : (
                        <div className="rounded-lg border p-3 space-y-3 bg-muted/20">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Контактные данные</p>
                            <button type="button" onClick={() => { setShowAthleteContacts(false); setAthleteForm(f => ({ ...f, phone: "", parentName: "", parentPhone: "", notes: "" })); }} className="text-xs text-muted-foreground hover:text-destructive">✕ Убрать</button>
                          </div>
                          <div className="space-y-2">
                            <Label>Телефон спортсмена</Label>
                            <Input placeholder="+7..." value={athleteForm.phone} onChange={e => setAthleteForm(f => ({ ...f, phone: e.target.value }))} />
                          </div>
                          <div className="space-y-2">
                            <Label>Имя родителя / представителя</Label>
                            <Input placeholder="Иванов Иван Иванович" value={athleteForm.parentName} onChange={e => setAthleteForm(f => ({ ...f, parentName: e.target.value }))} />
                          </div>
                          <div className="space-y-2">
                            <Label>Телефон родителя / представителя</Label>
                            <Input placeholder="+7..." value={athleteForm.parentPhone} onChange={e => setAthleteForm(f => ({ ...f, parentPhone: e.target.value }))} />
                          </div>
                          <div className="space-y-2">
                            <Label>Заметки</Label>
                            <Input placeholder="Дополнительная информация..." value={athleteForm.notes} onChange={e => setAthleteForm(f => ({ ...f, notes: e.target.value }))} />
                          </div>
                        </div>
                      )}
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setAthleteOpen(false)}>{t("Cancel")}</Button>
                        <Button type="submit" disabled={createAthlete.isPending}>
                          {createAthlete.isPending ? "Сохранение..." : t("Save")}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent className="pt-0">
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
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base">Тренерский состав</CardTitle>
                <Dialog open={coachOpen} onOpenChange={v => { setCoachOpen(v); if (!v) setCoachError(""); }}>
                  <DialogTrigger asChild>
                    <Button size="sm" data-testid="btn-add-coach">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Добавить тренера
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Добавить тренера / администратора</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddCoach} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Имя</Label>
                          <Input
                            placeholder="Иван"
                            value={coachForm.firstName}
                            onChange={e => setCoachForm(f => ({ ...f, firstName: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Фамилия</Label>
                          <Input
                            placeholder="Иванов"
                            value={coachForm.lastName}
                            onChange={e => setCoachForm(f => ({ ...f, lastName: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Email *</Label>
                        <Input
                          type="email"
                          placeholder="coach@example.com"
                          value={coachForm.email}
                          onChange={e => setCoachForm(f => ({ ...f, email: e.target.value }))}
                          required
                          data-testid="input-coach-email"
                        />
                        <p className="text-xs text-muted-foreground">
                          Если пользователь с таким email уже существует — он будет привязан к клубу.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label>Роль *</Label>
                        <Select value={coachForm.role} onValueChange={v => setCoachForm(f => ({ ...f, role: v as "coach" | "club_admin" }))}>
                          <SelectTrigger data-testid="select-coach-role">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="coach">Тренер</SelectItem>
                            <SelectItem value="club_admin">Администратор клуба</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {coachError && (
                        <p className="text-sm text-destructive">{coachError}</p>
                      )}
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setCoachOpen(false)}>Отмена</Button>
                        <Button type="submit" disabled={addMember.isPending} data-testid="btn-submit-coach">
                          {addMember.isPending ? "Добавление..." : "Добавить"}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent className="pt-0">
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
                        <div className="flex items-center gap-2">
                          <Badge variant={c.role === "club_admin" ? "default" : "secondary"} className="text-xs">
                            {c.role === "club_admin" ? "Администратор" : "Тренер"}
                          </Badge>
                        </div>
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
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{m.role}</Badge>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                data-testid={`btn-remove-member-${m.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Удалить участника?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Удалить {(m as any).user?.email ?? "участника"} из клуба?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Отмена</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={() => handleRemoveMember(m.id)}
                                  disabled={removeMember.isPending}
                                >
                                  Удалить
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
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

import { useState } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListAthletes,
  useCreateAthlete,
  useDeleteAthlete,
  useGetMe,
  getListAthletesQueryKey,
} from "@workspace/api-client-react";
import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, User, Trash2 } from "lucide-react";

const BELTS = ["Белый", "Жёлтый", "Оранжевый", "Зелёный", "Синий", "Коричневый", "Чёрный", "White", "Yellow", "Orange", "Green", "Blue", "Brown", "Black"];

function beltBadge(belt?: string | null) {
  const colors: Record<string, string> = {
    белый: "bg-white text-gray-800 border",
    white: "bg-white text-gray-800 border",
    жёлтый: "bg-yellow-400 text-yellow-900",
    yellow: "bg-yellow-400 text-yellow-900",
    оранжевый: "bg-orange-400 text-white",
    orange: "bg-orange-400 text-white",
    зелёный: "bg-green-600 text-white",
    green: "bg-green-600 text-white",
    синий: "bg-blue-600 text-white",
    blue: "bg-blue-600 text-white",
    коричневый: "bg-amber-800 text-white",
    brown: "bg-amber-800 text-white",
    чёрный: "bg-gray-900 text-white",
    black: "bg-gray-900 text-white",
  };
  const key = (belt ?? "").toLowerCase();
  return colors[key] ?? "bg-muted text-muted-foreground";
}

export default function AthletesPage() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data: user } = useGetMe();
  const { data: athletes = [], isLoading } = useListAthletes(
    user?.clubId ? { clubId: user.clubId } : {}
  );
  const createAthlete = useCreateAthlete();
  const deleteAthlete = useDeleteAthlete();

  const [search, setSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    firstName: "", lastName: "", gender: "male", birthDate: "",
    weightKg: "", belt: "", phone: "", parentName: "", parentPhone: "", notes: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.clubId) return;
    createAthlete.mutate(
      {
        data: {
          clubId: user.clubId,
          firstName: form.firstName,
          lastName: form.lastName,
          gender: form.gender as "male" | "female",
          birthDate: form.birthDate || undefined,
          weightKg: form.weightKg ? parseFloat(form.weightKg) : undefined,
          belt: form.belt || undefined,
          phone: form.phone || undefined,
          parentName: form.parentName || undefined,
          parentPhone: form.parentPhone || undefined,
          notes: form.notes || undefined,
        }
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListAthletesQueryKey() });
          setOpen(false);
          setForm({ firstName: "", lastName: "", gender: "male", birthDate: "", weightKg: "", belt: "", phone: "", parentName: "", parentPhone: "", notes: "" });
        }
      }
    );
  };

  const handleDelete = (athleteId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteAthlete.mutate(
      { athleteId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListAthletesQueryKey() });
        }
      }
    );
  };

  const filtered = athletes.filter(a => {
    const matchSearch = !search || `${a.firstName} ${a.lastName}`.toLowerCase().includes(search.toLowerCase());
    const matchGender = genderFilter === "all" || a.gender === genderFilter;
    return matchSearch && matchGender;
  });

  const age = (birthDate?: string | null) => {
    if (!birthDate) return "—";
    return Math.floor((Date.now() - new Date(birthDate).getTime()) / (365.25 * 24 * 3600 * 1000));
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">{t("Athletes")}</h1>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-athlete">
                <Plus className="h-4 w-4 mr-2" />
                {t("AddAthlete")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{t("AddAthlete")}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("FirstName")} *</Label>
                    <Input data-testid="input-first-name" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} required />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("LastName")} *</Label>
                    <Input data-testid="input-last-name" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("Gender")} *</Label>
                    <Select value={form.gender} onValueChange={v => setForm(f => ({ ...f, gender: v }))}>
                      <SelectTrigger data-testid="select-gender"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">{t("Male")}</SelectItem>
                        <SelectItem value="female">{t("Female")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("BirthDate")}</Label>
                    <Input type="date" data-testid="input-birth-date" value={form.birthDate} onChange={e => setForm(f => ({ ...f, birthDate: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("Weight")}</Label>
                    <Input type="number" step="0.1" data-testid="input-weight" value={form.weightKg} onChange={e => setForm(f => ({ ...f, weightKg: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("Belt")}</Label>
                    <Select value={form.belt} onValueChange={v => setForm(f => ({ ...f, belt: v }))}>
                      <SelectTrigger data-testid="select-belt"><SelectValue placeholder="Выберите пояс" /></SelectTrigger>
                      <SelectContent>
                        {BELTS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Телефон спортсмена</Label>
                  <Input placeholder="+7..." data-testid="input-phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                  <p className="text-xs text-muted-foreground">Личный номер спортсмена</p>
                </div>
                <div className="rounded-lg border p-3 space-y-3 bg-muted/20">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Контакт родителя / представителя</p>
                  <div className="space-y-2">
                    <Label>Имя родителя / представителя</Label>
                    <Input placeholder="Иванов Иван Иванович" data-testid="input-parent-name" value={form.parentName} onChange={e => setForm(f => ({ ...f, parentName: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Телефон родителя</Label>
                    <Input placeholder="+7..." data-testid="input-parent-phone" value={form.parentPhone} onChange={e => setForm(f => ({ ...f, parentPhone: e.target.value }))} />
                    <p className="text-xs text-muted-foreground">Номер принадлежит родителю / представителю</p>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t("Cancel")}</Button>
                  <Button type="submit" data-testid="button-submit-athlete" disabled={createAthlete.isPending}>{t("Save")}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder={t("Search")}
              data-testid="input-search-athletes"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Select value={genderFilter} onValueChange={setGenderFilter}>
            <SelectTrigger className="w-32" data-testid="select-filter-gender"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все</SelectItem>
              <SelectItem value="male">{t("Male")}</SelectItem>
              <SelectItem value="female">{t("Female")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-lg border border-dashed">
            <User className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-muted-foreground">{t("NoData")}</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("Name")}</TableHead>
                  <TableHead>{t("Gender")}</TableHead>
                  <TableHead>Возраст</TableHead>
                  <TableHead>{t("Weight")}</TableHead>
                  <TableHead>{t("Belt")}</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(a => (
                  <TableRow
                    key={a.id}
                    data-testid={`row-athlete-${a.id}`}
                    className="cursor-pointer hover:bg-muted/30"
                    onClick={() => setLocation(`/athletes/${a.id}`)}
                  >
                    <TableCell className="font-medium">{a.firstName} {a.lastName}</TableCell>
                    <TableCell className="text-muted-foreground">{a.gender === "male" ? t("Male") : t("Female")}</TableCell>
                    <TableCell className="text-muted-foreground">{age(a.birthDate)}</TableCell>
                    <TableCell className="text-muted-foreground">{a.weightKg ? `${a.weightKg} кг` : "—"}</TableCell>
                    <TableCell>
                      {a.belt ? (
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${beltBadge(a.belt)}`}>{a.belt}</span>
                      ) : "—"}
                    </TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={e => e.stopPropagation()}
                            data-testid={`btn-delete-athlete-${a.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Удалить спортсмена?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Вы уверены, что хотите удалить {a.firstName} {a.lastName}? Это действие нельзя отменить.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={e => e.stopPropagation()}>Отмена</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={e => handleDelete(a.id, e)}
                              disabled={deleteAthlete.isPending}
                            >
                              Удалить
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <p className="text-sm text-muted-foreground">{filtered.length} спортсмен(ов)</p>
      </div>
    </Layout>
  );
}

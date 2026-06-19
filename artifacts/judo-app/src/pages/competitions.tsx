import { useState } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListCompetitions,
  useCreateCompetition,
  useDeleteCompetition,
  useGetMe,
  getListCompetitionsQueryKey,
} from "@workspace/api-client-react";
import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trophy, Calendar, MapPin, Users, Trash2 } from "lucide-react";
import LocationPicker from "@/components/location-picker";

export default function CompetitionsPage() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data: user } = useGetMe();
  const { data: competitions = [], isLoading } = useListCompetitions(
    user?.clubId ? { clubId: user.clubId } : {}
  );
  const createCompetition = useCreateCompetition();
  const deleteCompetition = useDeleteCompetition();

  const [open, setOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [form, setForm] = useState({
    name: "", date: "", location: "", lat: undefined as number | undefined,
    lng: undefined as number | undefined, format: "olympic", fightDurationSeconds: "240"
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.clubId) return;
    createCompetition.mutate(
      {
        data: {
          clubId: user.clubId,
          name: form.name,
          date: form.date,
          location: form.location || undefined,
          lat: form.lat,
          lng: form.lng,
          format: form.format as "olympic" | "round_robin",
          fightDurationSeconds: parseInt(form.fightDurationSeconds),
        }
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListCompetitionsQueryKey() });
          setOpen(false);
          setForm({ name: "", date: "", location: "", lat: undefined, lng: undefined, format: "olympic", fightDurationSeconds: "240" });
        }
      }
    );
  };

  const handleDelete = (competitionId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteCompetition.mutate({ competitionId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCompetitionsQueryKey() });
      }
    });
  };

  const filtered = statusFilter === "all"
    ? competitions
    : competitions.filter(c => c.status === statusFilter);

  const statusVariant = (status: string) =>
    status === "active" ? "default" : status === "finished" ? "secondary" : "outline";

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">{t("Competitions")}</h1>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-competition">
                <Plus className="h-4 w-4 mr-2" />
                {t("AddCompetition")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t("AddCompetition")}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>{t("Name")} *</Label>
                  <Input data-testid="input-comp-name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("Date")} *</Label>
                    <Input type="date" data-testid="input-comp-date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("Format")} *</Label>
                    <Select value={form.format} onValueChange={v => setForm(f => ({ ...f, format: v }))}>
                      <SelectTrigger data-testid="select-format"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="olympic">{t("Olympic")}</SelectItem>
                        <SelectItem value="round_robin">{t("RoundRobin")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t("Duration")}</Label>
                  <Input type="number" data-testid="input-duration" value={form.fightDurationSeconds} onChange={e => setForm(f => ({ ...f, fightDurationSeconds: e.target.value }))} />
                </div>
                <LocationPicker
                  address={form.location}
                  lat={form.lat}
                  lng={form.lng}
                  onAddressChange={v => setForm(f => ({ ...f, location: v }))}
                  onLocationChange={(lat, lng) => setForm(f => ({ ...f, lat, lng }))}
                />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t("Cancel")}</Button>
                  <Button type="submit" data-testid="button-submit-competition" disabled={createCompetition.isPending}>{t("Save")}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex gap-2">
          {["all", "draft", "active", "finished"].map(s => (
            <Button
              key={s}
              size="sm"
              variant={statusFilter === s ? "default" : "outline"}
              onClick={() => setStatusFilter(s)}
              data-testid={`filter-status-${s}`}
            >
              {s === "all" ? "Все" : t(s.charAt(0).toUpperCase() + s.slice(1) as any)}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-40" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-lg border border-dashed">
            <Trophy className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-muted-foreground">{t("NoData")}</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(comp => (
              <Card
                key={comp.id}
                data-testid={`card-competition-${comp.id}`}
                className="cursor-pointer transition-all hover:shadow-md hover:border-primary/30"
                onClick={() => setLocation(`/competitions/${comp.id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base leading-tight">{comp.name}</CardTitle>
                    <div className="flex items-center gap-1 shrink-0">
                      <Badge variant={statusVariant(comp.status)} className="text-xs">
                        {t(comp.status.charAt(0).toUpperCase() + comp.status.slice(1) as any)}
                      </Badge>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={e => e.stopPropagation()}
                            data-testid={`btn-delete-competition-${comp.id}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Удалить соревнование?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Вы уверены, что хотите удалить «{comp.name}»? Это действие нельзя отменить.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={e => e.stopPropagation()}>Отмена</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={e => handleDelete(comp.id, e)}
                              disabled={deleteCompetition.isPending}
                            >
                              Удалить
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                  <Badge variant="outline" className="w-fit text-xs">
                    {comp.format === "olympic" ? t("Olympic") : t("RoundRobin")}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-1.5">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4 shrink-0" />
                    {new Date(comp.date).toLocaleDateString("ru-RU")}
                  </div>
                  {comp.location && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 shrink-0" />
                      {comp.location}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4 shrink-0" />
                    {(comp as any).participantCount ?? 0} {t("Participants").toLowerCase()}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

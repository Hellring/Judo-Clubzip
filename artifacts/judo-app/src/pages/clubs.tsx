import { useState } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import {
  useListClubs,
  useCreateClub,
  useDeleteClub,
  getListClubsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, MapPin, Plus, Trash2 } from "lucide-react";

export default function ClubsPage() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data: clubs = [], isLoading } = useListClubs();
  const createClub = useCreateClub();
  const deleteClub = useDeleteClub();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", city: "", country: "", description: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createClub.mutate({ data: form }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListClubsQueryKey() });
        setOpen(false);
        setForm({ name: "", city: "", country: "", description: "" });
      }
    });
  };

  const handleDelete = (clubId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteClub.mutate({ clubId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListClubsQueryKey() });
      }
    });
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">{t("Clubs")}</h1>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-club">
                <Plus className="h-4 w-4 mr-2" />
                {t("AddClub")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("AddClub")}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{t("Name")} *</Label>
                  <Input id="name" data-testid="input-club-name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">{t("City")}</Label>
                    <Input id="city" data-testid="input-club-city" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">{t("Country")}</Label>
                    <Input id="country" data-testid="input-club-country" value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">{t("Description")}</Label>
                  <Textarea id="description" data-testid="input-club-description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t("Cancel")}</Button>
                  <Button type="submit" data-testid="button-submit-club" disabled={createClub.isPending}>{t("Save")}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <p className="text-muted-foreground">{t("Loading")}</p>
          </div>
        ) : clubs.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-lg border border-dashed">
            <Building2 className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-muted-foreground">{t("NoData")}</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {clubs.map((club) => (
              <Card
                key={club.id}
                data-testid={`card-club-${club.id}`}
                className="cursor-pointer transition-all hover:shadow-md hover:border-primary/30 relative"
                onClick={() => setLocation(`/clubs/${club.id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{club.name}</CardTitle>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="shrink-0">
                        <MapPin className="h-3 w-3 mr-1" />
                        {club.city || "—"}
                      </Badge>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                            onClick={e => e.stopPropagation()}
                            data-testid={`btn-delete-club-${club.id}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Удалить клуб?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Вы уверены, что хотите удалить клуб «{club.name}»? Это действие нельзя отменить.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={e => e.stopPropagation()}>Отмена</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={e => handleDelete(club.id, e)}
                              disabled={deleteClub.isPending}
                            >
                              Удалить
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                  {club.country && <p className="text-xs text-muted-foreground">{club.country}</p>}
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span data-testid={`text-athletes-${club.id}`}>{(club as any).athleteCount ?? 0} {t("Athletes").toLowerCase()}</span>
                    </div>
                  </div>
                  {club.description && (
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{club.description}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

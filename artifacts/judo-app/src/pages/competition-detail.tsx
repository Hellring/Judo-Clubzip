import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetCompetition,
  useListWeightCategories,
  useListParticipants,
  useListFights,
  useCreateWeightCategory,
  useAddParticipant,
  useGenerateBracket,
  useListAthletes,
  getGetCompetitionQueryKey,
  getListWeightCategoriesQueryKey,
  getListParticipantsQueryKey,
  getListFightsQueryKey,
} from "@workspace/api-client-react";
import Layout from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Plus, Swords, Users, GitBranch, RefreshCw } from "lucide-react";

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const variant =
    status === "active" ? "default" :
    status === "finished" ? "secondary" : "outline";
  return <Badge variant={variant}>{t(status.charAt(0).toUpperCase() + status.slice(1) as any)}</Badge>;
}

function BracketView({ fights, onFightClick }: { fights: any[]; onFightClick: (f: any) => void }) {
  const { t } = useTranslation();
  const rounds = [...new Set(fights.map(f => f.round))].sort((a, b) => a - b);

  if (fights.length === 0) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-2 text-muted-foreground">
        <Swords className="h-10 w-10 opacity-40" />
        <p>{t("NoFights")}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-8 min-w-max">
        {rounds.map(round => {
          const roundFights = fights.filter(f => f.round === round);
          return (
            <div key={round} className="flex flex-col gap-4 w-56">
              <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider text-center">
                {t("Round")} {round}
              </p>
              {roundFights.map(fight => (
                <div
                  key={fight.id}
                  data-testid={`card-fight-${fight.id}`}
                  className={`rounded-lg border p-3 cursor-pointer transition-all hover:border-primary/50 hover:shadow-sm ${fight.status === "finished" ? "bg-muted/30" : "bg-card"}`}
                  onClick={() => onFightClick(fight)}
                >
                  <div className="space-y-2">
                    {[fight.athlete1, fight.athlete2].map((a, i) => (
                      <div
                        key={i}
                        className={`flex items-center justify-between rounded px-2 py-1 text-sm ${
                          fight.winnerId && (i === 0 ? fight.athlete1Id : fight.athlete2Id) === fight.winnerId
                            ? "bg-primary/10 text-primary font-semibold"
                            : ""
                        }`}
                      >
                        <span className="truncate">
                          {a ? `${a.firstName} ${a.lastName}` : "BYE"}
                        </span>
                        {fight.status !== "pending" && (
                          <span className="text-xs text-muted-foreground ml-1">
                            {i === 0
                              ? `${fight.athlete1Ippon}I ${fight.athlete1WazaAri}W`
                              : `${fight.athlete2Ippon}I ${fight.athlete2WazaAri}W`}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 text-center">
                    <Badge variant={fight.status === "finished" ? "secondary" : fight.status === "in_progress" ? "default" : "outline"} className="text-xs">
                      {fight.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RoundRobinTable({ fights, participants }: { fights: any[]; participants: any[] }) {
  const { t } = useTranslation();
  const athletes = participants.map(p => p.athlete).filter(Boolean);

  if (athletes.length === 0) return <p className="text-muted-foreground text-sm">{t("NoData")}</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            <th className="text-left p-2 font-medium text-muted-foreground border-b">Athlete</th>
            {athletes.map(a => (
              <th key={a.id} className="p-2 font-medium text-muted-foreground border-b text-center">
                {a.firstName[0]}.{a.lastName}
              </th>
            ))}
            <th className="p-2 font-medium text-muted-foreground border-b text-center">W/L</th>
          </tr>
        </thead>
        <tbody>
          {athletes.map(a => {
            const aFights = fights.filter(f =>
              f.status === "finished" && (f.athlete1Id === a.id || f.athlete2Id === a.id)
            );
            const wins = aFights.filter(f => f.winnerId === a.id).length;
            const losses = aFights.filter(f => f.winnerId && f.winnerId !== a.id).length;
            return (
              <tr key={a.id} className="border-b hover:bg-muted/30">
                <td className="p-2 font-medium">{a.firstName} {a.lastName}</td>
                {athletes.map(opp => {
                  if (opp.id === a.id) return <td key={opp.id} className="p-2 text-center bg-muted/50">—</td>;
                  const fight = fights.find(f =>
                    (f.athlete1Id === a.id && f.athlete2Id === opp.id) ||
                    (f.athlete2Id === a.id && f.athlete1Id === opp.id)
                  );
                  if (!fight) return <td key={opp.id} className="p-2 text-center text-muted-foreground">-</td>;
                  const won = fight.winnerId === a.id;
                  return (
                    <td key={opp.id} className={`p-2 text-center font-semibold ${fight.status === "finished" ? (won ? "text-green-600" : "text-red-500") : "text-muted-foreground"}`}>
                      {fight.status === "finished" ? (won ? "W" : "L") : "·"}
                    </td>
                  );
                })}
                <td className="p-2 text-center font-semibold">
                  <span className="text-green-600">{wins}</span>
                  <span className="text-muted-foreground">/</span>
                  <span className="text-red-500">{losses}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function CompetitionDetailPage() {
  const { t } = useTranslation();
  const { competitionId } = useParams<{ competitionId: string }>();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const id = parseInt(competitionId);

  const { data: competition, isLoading } = useGetCompetition(id, {
    query: { enabled: !!id, queryKey: getGetCompetitionQueryKey(id) }
  });
  const { data: categories = [] } = useListWeightCategories(id);
  const { data: participants = [] } = useListParticipants(id);
  const { data: fights = [] } = useListFights(id);
  const { data: athletes = [] } = useListAthletes();

  const createCategory = useCreateWeightCategory();
  const addParticipant = useAddParticipant();
  const generateBracket = useGenerateBracket();

  const [catOpen, setCatOpen] = useState(false);
  const [catForm, setCatForm] = useState({ name: "", gender: "male", maxWeightKg: "" });

  const [participantOpen, setParticipantOpen] = useState(false);
  const [pForm, setPForm] = useState({ athleteId: "", categoryId: "" });

  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    createCategory.mutate(
      { competitionId: id, data: { name: catForm.name, gender: catForm.gender as any, maxWeightKg: catForm.maxWeightKg ? parseFloat(catForm.maxWeightKg) : undefined } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListWeightCategoriesQueryKey(id) });
          setCatOpen(false);
          setCatForm({ name: "", gender: "male", maxWeightKg: "" });
        }
      }
    );
  };

  const handleAddParticipant = (e: React.FormEvent) => {
    e.preventDefault();
    addParticipant.mutate(
      { competitionId: id, data: { athleteId: parseInt(pForm.athleteId), categoryId: parseInt(pForm.categoryId) } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListParticipantsQueryKey(id) });
          setParticipantOpen(false);
          setPForm({ athleteId: "", categoryId: "" });
        }
      }
    );
  };

  const handleGenerateBracket = () => {
    if (!selectedCategoryId) return;
    generateBracket.mutate(
      { competitionId: id, data: { categoryId: selectedCategoryId } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListFightsQueryKey(id) });
        }
      }
    );
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-48" />
        </div>
      </Layout>
    );
  }

  if (!competition) {
    return (
      <Layout>
        <div className="flex h-48 items-center justify-center">
          <p className="text-muted-foreground">Competition not found.</p>
        </div>
      </Layout>
    );
  }

  const catFights = selectedCategoryId ? fights.filter(f => f.categoryId === selectedCategoryId) : fights;
  const catParticipants = selectedCategoryId ? participants.filter(p => p.categoryId === selectedCategoryId) : participants;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/competitions")} data-testid="button-back-competitions">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-bold tracking-tight">{competition.name}</h1>
              <StatusBadge status={competition.status} />
              <Badge variant="outline">{competition.format === "olympic" ? t("Olympic") : t("RoundRobin")}</Badge>
            </div>
            <p className="text-muted-foreground mt-1">
              {new Date(competition.date).toLocaleDateString()}
              {competition.location && ` · ${competition.location}`}
            </p>
          </div>
        </div>

        <Tabs defaultValue="categories">
          <TabsList>
            <TabsTrigger value="categories">
              <Users className="h-4 w-4 mr-2" />
              {t("Categories")}
            </TabsTrigger>
            <TabsTrigger value="bracket">
              <GitBranch className="h-4 w-4 mr-2" />
              {competition.format === "olympic" ? t("Bracket") : t("Results")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="categories" className="mt-4 space-y-4">
            <div className="flex gap-2">
              <Dialog open={catOpen} onOpenChange={setCatOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" data-testid="button-add-category">
                    <Plus className="h-4 w-4 mr-1" />
                    {t("AddCategory")}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>{t("AddCategory")}</DialogTitle></DialogHeader>
                  <form onSubmit={handleCreateCategory} className="space-y-4">
                    <div className="space-y-2">
                      <Label>{t("Name")} *</Label>
                      <Input data-testid="input-cat-name" value={catForm.name} onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))} required />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("Gender")}</Label>
                      <Select value={catForm.gender} onValueChange={v => setCatForm(f => ({ ...f, gender: v }))}>
                        <SelectTrigger data-testid="select-cat-gender"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">{t("Male")}</SelectItem>
                          <SelectItem value="female">{t("Female")}</SelectItem>
                          <SelectItem value="mixed">Mixed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{t("MaxWeight")}</Label>
                      <Input type="number" data-testid="input-cat-weight" value={catForm.maxWeightKg} onChange={e => setCatForm(f => ({ ...f, maxWeightKg: e.target.value }))} />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setCatOpen(false)}>{t("Cancel")}</Button>
                      <Button type="submit" data-testid="button-submit-category">{t("Save")}</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>

              <Dialog open={participantOpen} onOpenChange={setParticipantOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" data-testid="button-add-participant">
                    <Plus className="h-4 w-4 mr-1" />
                    {t("AddParticipant")}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>{t("AddParticipant")}</DialogTitle></DialogHeader>
                  <form onSubmit={handleAddParticipant} className="space-y-4">
                    <div className="space-y-2">
                      <Label>{t("Athletes")} *</Label>
                      <Select value={pForm.athleteId} onValueChange={v => setPForm(f => ({ ...f, athleteId: v }))}>
                        <SelectTrigger data-testid="select-athlete"><SelectValue placeholder="Select athlete" /></SelectTrigger>
                        <SelectContent>
                          {athletes.map(a => (
                            <SelectItem key={a.id} value={String(a.id)}>{a.firstName} {a.lastName}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{t("Categories")} *</Label>
                      <Select value={pForm.categoryId} onValueChange={v => setPForm(f => ({ ...f, categoryId: v }))}>
                        <SelectTrigger data-testid="select-category"><SelectValue placeholder="Select category" /></SelectTrigger>
                        <SelectContent>
                          {categories.map(c => (
                            <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setParticipantOpen(false)}>{t("Cancel")}</Button>
                      <Button type="submit" data-testid="button-submit-participant">{t("Save")}</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {categories.length === 0 ? (
              <div className="flex h-32 items-center justify-center rounded-lg border border-dashed">
                <p className="text-muted-foreground">{t("NoData")}</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {categories.map(cat => {
                  const catParts = participants.filter(p => p.categoryId === cat.id);
                  return (
                    <Card key={cat.id} data-testid={`card-category-${cat.id}`}
                      className={`cursor-pointer transition-all hover:border-primary/30 ${selectedCategoryId === cat.id ? "border-primary" : ""}`}
                      onClick={() => setSelectedCategoryId(selectedCategoryId === cat.id ? null : cat.id)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{cat.name}</CardTitle>
                          <Badge variant="outline" className="text-xs">{cat.gender}</Badge>
                        </div>
                        {cat.maxWeightKg && <p className="text-xs text-muted-foreground">до {cat.maxWeightKg} кг</p>}
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">{catParts.length} {t("Participants").toLowerCase()}</p>
                        {catParts.length > 0 && (
                          <ul className="mt-2 space-y-1">
                            {catParts.slice(0, 3).map(p => (
                              <li key={p.id} className="text-xs text-muted-foreground">
                                {(p as any).athlete ? `${(p as any).athlete.firstName} ${(p as any).athlete.lastName}` : "—"}
                              </li>
                            ))}
                            {catParts.length > 3 && <li className="text-xs text-muted-foreground">+{catParts.length - 3} more</li>}
                          </ul>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="bracket" className="mt-4 space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Label className="text-sm">Категория:</Label>
                <Select
                  value={selectedCategoryId ? String(selectedCategoryId) : "all"}
                  onValueChange={v => setSelectedCategoryId(v === "all" ? null : parseInt(v))}
                >
                  <SelectTrigger className="w-44" data-testid="select-bracket-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все категории</SelectItem>
                    {categories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {selectedCategoryId && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleGenerateBracket}
                  disabled={generateBracket.isPending}
                  data-testid="button-generate-bracket"
                >
                  <RefreshCw className={`h-4 w-4 mr-1 ${generateBracket.isPending ? "animate-spin" : ""}`} />
                  {t("GenerateBracket")}
                </Button>
              )}
            </div>

            {competition.format === "olympic" ? (
              <BracketView
                fights={catFights}
                onFightClick={f => setLocation(`/competitions/${id}/fight/${f.id}`)}
              />
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <RoundRobinTable fights={catFights} participants={catParticipants} />
                  {catFights.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Поединки:</p>
                      <div className="divide-y">
                        {catFights.map(f => (
                          <div
                            key={f.id}
                            className="flex items-center justify-between py-2 cursor-pointer hover:bg-muted/30 -mx-2 px-2 rounded"
                            onClick={() => setLocation(`/competitions/${id}/fight/${f.id}`)}
                            data-testid={`row-fight-${f.id}`}
                          >
                            <span className="text-sm">
                              {f.athlete1 ? `${f.athlete1.firstName} ${f.athlete1.lastName}` : "—"}
                              {" "}{t("vs")}{" "}
                              {f.athlete2 ? `${f.athlete2.firstName} ${f.athlete2.lastName}` : "—"}
                            </span>
                            <Badge variant={f.status === "finished" ? "secondary" : f.status === "in_progress" ? "default" : "outline"}>
                              {f.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

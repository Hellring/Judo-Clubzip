import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetCompetition,
  useListWeightCategories,
  useListFights,
  useListParticipants,
  useUpdateFight,
  getGetCompetitionQueryKey,
  getListFightsQueryKey,
  getListWeightCategoriesQueryKey,
} from "@workspace/api-client-react";
import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Swords,
  Users,
  Trophy,
  Printer,
  AlertTriangle,
  Play,
  PhoneOff,
  RefreshCw,
} from "lucide-react";

// ─── helpers ────────────────────────────────────────────────────────────────

function athleteName(a: any) {
  if (!a) return "—";
  return `${a.firstName} ${a.lastName}`;
}

function placeEmoji(place: number) {
  return place === 1 ? "🥇" : place === 2 ? "🥈" : place === 3 ? "🥉" : `${place}.`;
}

function calcProtocol(catFights: any[], catParticipants: any[]) {
  return catParticipants
    .map((p) => {
      const athlete = p.athlete;
      const myFights = catFights.filter(
        (f) =>
          f.status === "finished" &&
          (f.athlete1Id === p.athleteId || f.athlete2Id === p.athleteId)
      );
      let wins = 0,
        losses = 0,
        ippons = 0,
        wazaAri = 0,
        yuko = 0;
      for (const f of myFights) {
        const isA1 = f.athlete1Id === p.athleteId;
        ippons += isA1 ? f.athlete1Ippon : f.athlete2Ippon;
        wazaAri += isA1 ? f.athlete1WazaAri : f.athlete2WazaAri;
        yuko += isA1 ? f.athlete1Yuko : f.athlete2Yuko;
        if (f.winnerId === p.athleteId) wins++;
        else if (f.winnerId) losses++;
      }
      return {
        athlete,
        athleteId: p.athleteId,
        wins,
        losses,
        ippons,
        wazaAri,
        yuko,
        points: wins * 2,
        fightCount: myFights.length,
      };
    })
    .sort(
      (a, b) =>
        b.points - a.points || b.ippons - a.ippons || b.wazaAri - a.wazaAri
    )
    .map((s, i) => ({ ...s, place: i + 1 }));
}

// ─── Protocol Modal ──────────────────────────────────────────────────────────

function ProtocolModal({
  open,
  onClose,
  catFights,
  catParticipants,
  categoryName,
}: {
  open: boolean;
  onClose: () => void;
  catFights: any[];
  catParticipants: any[];
  categoryName: string;
}) {
  const standings = calcProtocol(catFights, catParticipants);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Протокол — {categoryName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="overflow-x-auto print:block">
            <table className="w-full text-sm border-collapse" id="protocol-table">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left p-2 font-semibold">М</th>
                  <th className="text-left p-2 font-semibold">Спортсмен</th>
                  <th className="text-center p-2 font-semibold">В</th>
                  <th className="text-center p-2 font-semibold">П</th>
                  <th className="text-center p-2 font-semibold">Очки</th>
                  <th className="text-center p-2 font-semibold">Иппон</th>
                  <th className="text-center p-2 font-semibold">В-Ари</th>
                  <th className="text-center p-2 font-semibold">Юко</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((s) => (
                  <tr key={s.athleteId} className="border-b hover:bg-muted/30">
                    <td className="p-2 text-lg">{placeEmoji(s.place)}</td>
                    <td className="p-2 font-medium">
                      {s.athlete ? athleteName(s.athlete) : "—"}
                    </td>
                    <td className="p-2 text-center text-green-600 font-semibold">
                      {s.wins}
                    </td>
                    <td className="p-2 text-center text-red-500 font-semibold">
                      {s.losses}
                    </td>
                    <td className="p-2 text-center font-bold">{s.points}</td>
                    <td className="p-2 text-center">{s.ippons}</td>
                    <td className="p-2 text-center">{s.wazaAri}</td>
                    <td className="p-2 text-center">{s.yuko}</td>
                  </tr>
                ))}
                {standings.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="p-4 text-center text-muted-foreground"
                    >
                      Нет завершённых боёв
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">
            В — победы · П — поражения · Иппон / Ваза-ари / Юко — набрано за все бои
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Закрыть
            </Button>
            <Button onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2" />
              Печать
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Tatami Panel ────────────────────────────────────────────────────────────

function TatamiPanel({
  tatami,
  fights,
  calledFightId,
  onCall,
  onNoShow,
  onStartFight,
}: {
  tatami: number;
  fights: any[];
  calledFightId: number | null;
  onCall: (fightId: number) => void;
  onNoShow: (fight: any, athleteNum: 1 | 2) => void;
  onStartFight: (fight: any) => void;
}) {
  const inProgress = fights.find((f) => f.status === "in_progress");
  const calledFight = calledFightId
    ? fights.find((f) => f.id === calledFightId)
    : null;
  const pendingFights = fights
    .filter((f) => f.status === "pending" && f.id !== calledFightId)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const nextFight = pendingFights[0];
  const queue = pendingFights.slice(1);
  const allDone =
    fights.length > 0 && fights.every((f) => f.status === "finished");

  return (
    <div className="space-y-3 max-w-lg">
      {/* ── In progress ── */}
      {inProgress && (
        <Card className="border-green-500 bg-green-50 dark:bg-green-950/20">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <CardTitle className="text-sm text-green-700 dark:text-green-400">
                Идёт бой
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="font-semibold text-base">
              {athleteName(inProgress.athlete1)}{" "}
              <span className="text-muted-foreground">vs</span>{" "}
              {athleteName(inProgress.athlete2)}
            </p>
            <Button
              size="sm"
              className="mt-3 bg-green-600 hover:bg-green-700 text-white"
              onClick={() => onStartFight(inProgress)}
            >
              <Swords className="h-4 w-4 mr-2" />
              Открыть таймер судьи
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Called fight ── */}
      {calledFight && !inProgress && (
        <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <CardTitle className="text-sm text-amber-700 dark:text-amber-400">
                Вызваны на татами
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="font-semibold text-base mb-3">
              {athleteName(calledFight.athlete1)}{" "}
              <span className="text-muted-foreground">vs</span>{" "}
              {athleteName(calledFight.athlete2)}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                size="sm"
                variant="destructive"
                className="text-xs flex-1"
                onClick={() => onNoShow(calledFight, 1)}
              >
                <PhoneOff className="h-3 w-3 mr-1" />
                Неявка:{" "}
                {calledFight.athlete1
                  ? calledFight.athlete1.firstName
                  : "А1"}
              </Button>
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white flex-1"
                onClick={() => onStartFight(calledFight)}
              >
                <Play className="h-4 w-4 mr-1" />
                Начать бой
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="text-xs flex-1"
                onClick={() => onNoShow(calledFight, 2)}
              >
                <PhoneOff className="h-3 w-3 mr-1" />
                Неявка:{" "}
                {calledFight.athlete2
                  ? calledFight.athlete2.firstName
                  : "А2"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Next fight ── */}
      {nextFight && !inProgress && !calledFight && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Следующий бой
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold text-base mb-3">
              {athleteName(nextFight.athlete1)}{" "}
              <span className="text-muted-foreground">vs</span>{" "}
              {athleteName(nextFight.athlete2)}
            </p>
            <Button size="sm" onClick={() => onCall(nextFight.id)}>
              <Users className="h-4 w-4 mr-2" />
              Вызвать спортсменов
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Queue ── */}
      {queue.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">
            Очередь
          </p>
          {queue.map((f) => (
            <div
              key={f.id}
              className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
            >
              <span>
                {athleteName(f.athlete1)} vs {athleteName(f.athlete2)}
              </span>
              <Badge variant="outline" className="text-xs">
                #{f.position ?? f.id}
              </Badge>
            </div>
          ))}
        </div>
      )}

      {/* ── All done ── */}
      {allDone && (
        <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 p-3 text-center text-sm text-green-700 dark:text-green-400 font-medium">
          ✅ Все бои на Татами {tatami} завершены
        </div>
      )}

      {fights.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground text-sm">
          Нет боёв для выбранной категории на этом татами
        </div>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function RefereePage() {
  const { competitionId } = useParams<{ competitionId: string }>();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const id = parseInt(competitionId);

  const { data: competition } = useGetCompetition(id, {
    query: { enabled: !!id, queryKey: getGetCompetitionQueryKey(id) },
  });
  const { data: categories = [] } = useListWeightCategories(id, {
    query: { queryKey: getListWeightCategoriesQueryKey(id) },
  });
  const { data: fights = [], refetch: refetchFights } = useListFights(id, {
    query: {
      queryKey: getListFightsQueryKey(id),
      refetchInterval: 8000,
      enabled: !!id,
    },
  });
  const { data: participants = [] } = useListParticipants(id);

  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    null
  );
  const [activeTatami, setActiveTatami] = useState<string>("1");
  const [calledFightIds, setCalledFightIds] = useState<
    Record<number, number | null>
  >({});
  const [protocolOpen, setProtocolOpen] = useState(false);

  const updateFight = useUpdateFight();

  const catFights = selectedCategoryId
    ? fights.filter((f) => f.categoryId === selectedCategoryId)
    : fights;

  const tatamiNums = [
    ...new Set(catFights.map((f) => f.tatami).filter(Boolean)),
  ].sort((a, b) => (a as number) - (b as number)) as number[];

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);
  const catParticipants = selectedCategoryId
    ? participants.filter((p) => p.categoryId === selectedCategoryId)
    : [];

  const allCatFightsFinished =
    catFights.length > 0 && catFights.every((f) => f.status === "finished");

  const handleNoShow = (fight: any, athleteNum: 1 | 2) => {
    const winnerId =
      athleteNum === 1 ? fight.athlete2Id : fight.athlete1Id;
    const tatamiNum = fight.tatami ?? 1;
    updateFight.mutate(
      {
        fightId: fight.id,
        data: {
          athlete1NoShow: athleteNum === 1,
          athlete2NoShow: athleteNum === 2,
          winnerId,
          winMethod: "no_show",
          status: "finished",
        } as any,
      },
      {
        onSuccess: () => {
          setCalledFightIds((prev) => ({ ...prev, [tatamiNum]: null }));
          queryClient.invalidateQueries({
            queryKey: getListFightsQueryKey(id),
          });
        },
      }
    );
  };

  const handleStartFight = (fight: any) => {
    const tatamiNum = fight.tatami ?? 1;
    setCalledFightIds((prev) => ({ ...prev, [tatamiNum]: null }));
    setLocation(`/competitions/${id}/fight/${fight.id}?judge=1`);
  };

  const handleCall = (tatami: number, fightId: number) => {
    setCalledFightIds((prev) => ({ ...prev, [tatami]: fightId }));
  };

  const finishedFights = catFights.filter((f) => f.status === "finished");

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 flex-wrap">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation(`/competitions/${id}`)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold">Судейский режим</h1>
            {competition && (
              <p className="text-muted-foreground text-sm truncate">
                {competition.name}
                {competition.location && ` · ${competition.location}`}
              </p>
            )}
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => refetchFights()}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Обновить
          </Button>
          {allCatFightsFinished && selectedCategoryId && (
            <Button onClick={() => setProtocolOpen(true)}>
              <Trophy className="h-4 w-4 mr-2" />
              Протокол категории
            </Button>
          )}
        </div>

        {/* Category selector */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium">Категория:</span>
          <Select
            value={selectedCategoryId ? String(selectedCategoryId) : "all"}
            onValueChange={(v) => {
              setSelectedCategoryId(v === "all" ? null : parseInt(v));
              setActiveTatami("1");
            }}
          >
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Все категории" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все категории</SelectItem>
              {categories.map((c) => {
                const catF = fights.filter(
                  (f) => f.categoryId === c.id
                );
                const done =
                  catF.length > 0 &&
                  catF.every((f) => f.status === "finished");
                return (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}
                    {done ? " ✓" : ""}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          {selectedCategoryId && (
            <Badge variant="outline">
              {catFights.filter((f) => f.status === "finished").length}/
              {catFights.length} боёв
            </Badge>
          )}
        </div>

        {/* Tatami tabs */}
        {tatamiNums.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2 text-muted-foreground rounded-lg border border-dashed">
            <Swords className="h-10 w-10 opacity-30" />
            <p className="font-medium">Нет боёв</p>
            <p className="text-xs text-center">
              Сначала зарегистрируйте участников и сгенерируйте сетку
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation(`/competitions/${id}`)}
            >
              Перейти к соревнованию
            </Button>
          </div>
        ) : (
          <Tabs value={activeTatami} onValueChange={setActiveTatami}>
            <TabsList>
              {tatamiNums.map((t) => {
                const tf = catFights.filter((f) => f.tatami === t);
                const inProg = tf.some((f) => f.status === "in_progress");
                const done =
                  tf.length > 0 && tf.every((f) => f.status === "finished");
                return (
                  <TabsTrigger
                    key={t}
                    value={String(t)}
                    className="gap-1.5"
                  >
                    Татами {t}
                    {inProg && (
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
                    )}
                    {done && (
                      <span className="text-xs text-green-600">✓</span>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>
            {tatamiNums.map((t) => (
              <TabsContent key={t} value={String(t)} className="mt-4">
                <TatamiPanel
                  tatami={t}
                  fights={catFights.filter((f) => f.tatami === t)}
                  calledFightId={calledFightIds[t] ?? null}
                  onCall={(fightId) => handleCall(t, fightId)}
                  onNoShow={handleNoShow}
                  onStartFight={handleStartFight}
                />
              </TabsContent>
            ))}
          </Tabs>
        )}

        {/* Finished fights log */}
        {finishedFights.length > 0 && (
          <div>
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Завершённые бои
            </p>
            <div className="divide-y rounded-lg border">
              {finishedFights.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center justify-between px-3 py-2 text-sm"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge variant="secondary" className="text-xs shrink-0">
                      Т{f.tatami}
                    </Badge>
                    <span className="truncate">
                      <span
                        className={
                          f.winnerId === f.athlete1Id
                            ? "font-semibold text-primary"
                            : "text-muted-foreground"
                        }
                      >
                        {athleteName(f.athlete1)}
                      </span>
                      <span className="mx-1 text-muted-foreground">vs</span>
                      <span
                        className={
                          f.winnerId === f.athlete2Id
                            ? "font-semibold text-primary"
                            : "text-muted-foreground"
                        }
                      >
                        {athleteName(f.athlete2)}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {(f as any).winMethod === "no_show" && (
                      <Badge variant="destructive" className="text-xs">
                        Неявка
                      </Badge>
                    )}
                    {(f as any).winMethod === "no_show" ? null : (
                      <Badge variant="outline" className="text-xs">
                        {f.athlete1Ippon + f.athlete2Ippon > 0
                          ? "Иппон"
                          : f.athlete1WazaAri + f.athlete2WazaAri > 0
                          ? "Ваза-ари"
                          : "По очкам"}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Protocol modal */}
      {selectedCategoryId && (
        <ProtocolModal
          open={protocolOpen}
          onClose={() => setProtocolOpen(false)}
          catFights={catFights}
          catParticipants={catParticipants}
          categoryName={selectedCategory?.name ?? ""}
        />
      )}
    </Layout>
  );
}

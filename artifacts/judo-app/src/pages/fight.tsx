import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetFight,
  useListFightEvents,
  useStartFight,
  useFinishFight,
  useAddFightEvent,
  useDeleteFightEvent,
  getGetFightQueryKey,
  getListFightEventsQueryKey,
} from "@workspace/api-client-react";
import { FightEventInputEventType } from "@workspace/api-client-react";
import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, RotateCcw, Play, Square, Pause } from "lucide-react";

const DEFAULT_DURATION = 240;

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

interface ScoreButtonProps {
  label: string;
  sublabel?: string;
  onClick: () => void;
  disabled?: boolean;
  variant: "ippon" | "wazaari" | "shido" | "hansoku";
  testId: string;
}

function ScoreButton({ label, sublabel, onClick, disabled, variant, testId }: ScoreButtonProps) {
  const classes: Record<string, string> = {
    ippon: "bg-amber-500 hover:bg-amber-400 active:scale-95 text-white shadow-lg shadow-amber-500/30 border-amber-400",
    wazaari: "bg-blue-600 hover:bg-blue-500 active:scale-95 text-white shadow-lg shadow-blue-600/30 border-blue-500",
    shido: "bg-yellow-500 hover:bg-yellow-400 active:scale-95 text-yellow-900 shadow-lg shadow-yellow-500/30 border-yellow-400",
    hansoku: "bg-red-600 hover:bg-red-500 active:scale-95 text-white shadow-lg shadow-red-600/30 border-red-500",
  };

  return (
    <button
      data-testid={testId}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl border-2 px-4 py-5 text-center font-bold tracking-wide uppercase transition-all disabled:opacity-40 disabled:cursor-not-allowed ${classes[variant]}`}
    >
      <div className="text-lg">{label}</div>
      {sublabel && <div className="text-xs font-normal mt-0.5 opacity-80">{sublabel}</div>}
    </button>
  );
}

interface AthleteScoreCardProps {
  athlete?: { firstName: string; lastName: string } | null;
  ippon: number;
  wazaAri: number;
  shido: number;
  isWinner: boolean;
  side: "left" | "right";
  onIppon: () => void;
  onWazaAri: () => void;
  onShido: () => void;
  onHansoku: () => void;
  disabled: boolean;
}

function AthleteScoreCard({
  athlete, ippon, wazaAri, shido, isWinner,
  side, onIppon, onWazaAri, onShido, onHansoku, disabled
}: AthleteScoreCardProps) {
  const { t } = useTranslation();
  const sideColor = side === "left" ? "border-blue-500" : "border-red-500";
  const sideAccent = side === "left" ? "bg-blue-600" : "bg-red-600";

  return (
    <div className={`flex flex-col rounded-2xl border-2 ${sideColor} overflow-hidden ${isWinner ? "ring-2 ring-amber-400 ring-offset-2" : ""}`}>
      <div className={`${sideAccent} px-4 py-3 flex items-center justify-between`}>
        <div>
          <p className="text-white font-bold text-lg leading-tight">
            {athlete ? athlete.lastName : "—"}
          </p>
          <p className="text-white/70 text-sm">
            {athlete ? athlete.firstName : ""}
          </p>
        </div>
        {isWinner && (
          <Badge className="bg-amber-400 text-amber-900 font-bold">{t("Winner")}</Badge>
        )}
      </div>

      <div className="bg-card p-4">
        <div className="grid grid-cols-3 gap-2 mb-4 text-center">
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-2">
            <div className="text-3xl font-black text-amber-600" data-testid={`score-ippon-${side}`}>{ippon}</div>
            <div className="text-xs text-amber-700 font-semibold uppercase tracking-wide">Ippon</div>
          </div>
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-2">
            <div className="text-3xl font-black text-blue-600" data-testid={`score-wazaari-${side}`}>{wazaAri}</div>
            <div className="text-xs text-blue-700 font-semibold uppercase tracking-wide">Waza</div>
          </div>
          <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-2">
            <div className="text-3xl font-black text-yellow-600" data-testid={`score-shido-${side}`}>{shido}</div>
            <div className="text-xs text-yellow-700 font-semibold uppercase tracking-wide">Shido</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <ScoreButton label={t("Ippon")} onClick={onIppon} disabled={disabled} variant="ippon" testId={`btn-ippon-${side}`} />
          <ScoreButton label={t("WazaAri")} onClick={onWazaAri} disabled={disabled} variant="wazaari" testId={`btn-wazaari-${side}`} />
          <ScoreButton label={t("Shido")} onClick={onShido} disabled={disabled} variant="shido" testId={`btn-shido-${side}`} />
          <ScoreButton label={t("Hansoku")} sublabel="(disqualify)" onClick={onHansoku} disabled={disabled} variant="hansoku" testId={`btn-hansoku-${side}`} />
        </div>
      </div>
    </div>
  );
}

export default function FightPage() {
  const { t } = useTranslation();
  const { competitionId, fightId } = useParams<{ competitionId: string; fightId: string }>();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const id = parseInt(fightId);
  const compId = parseInt(competitionId);

  const { data: fight, isLoading } = useGetFight(id, {
    query: { enabled: !!id, queryKey: getGetFightQueryKey(id) }
  });
  const { data: events = [] } = useListFightEvents(id, {
    query: { enabled: !!id, queryKey: getListFightEventsQueryKey(id) }
  });

  const startFight = useStartFight();
  const finishFight = useFinishFight();
  const addEvent = useAddFightEvent();
  const deleteEvent = useDeleteFightEvent();

  const [timeLeft, setTimeLeft] = useState(DEFAULT_DURATION);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (fight && !initializedRef.current) {
      setTimeLeft(DEFAULT_DURATION);
      initializedRef.current = true;
    }
  }, [fight]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev: number) => {
          if (prev <= 1) {
            setRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: getGetFightQueryKey(id) });
    queryClient.invalidateQueries({ queryKey: getListFightEventsQueryKey(id) });
  }, [queryClient, id]);

  const handleStart = () => {
    startFight.mutate({ fightId: id }, {
      onSuccess: () => {
        setRunning(true);
        invalidate();
      }
    });
  };

  const handleFinish = () => {
    setRunning(false);
    const elapsed = DEFAULT_DURATION - timeLeft;
    finishFight.mutate(
      { fightId: id, data: { winnerId: fight?.winnerId ?? null, durationSeconds: elapsed } },
      { onSuccess: invalidate }
    );
  };

  const handleEvent = (athleteId: number, eventType: FightEventInputEventType) => {
    const elapsed = DEFAULT_DURATION - timeLeft;
    addEvent.mutate(
      { fightId: id, data: { athleteId, eventType, timestampSeconds: elapsed } },
      {
        onSuccess: () => {
          invalidate();
          if (eventType === FightEventInputEventType.ippon || eventType === FightEventInputEventType.hansoku) {
            setRunning(false);
          }
        }
      }
    );
  };

  const handleUndo = () => {
    const lastEvent = [...events].reverse()[0];
    if (!lastEvent) return;
    deleteEvent.mutate(
      { fightId: id, eventId: lastEvent.id },
      { onSuccess: invalidate }
    );
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-96" />
        </div>
      </Layout>
    );
  }

  if (!fight) {
    return (
      <Layout>
        <div className="flex h-48 items-center justify-center">
          <p className="text-muted-foreground">Fight not found.</p>
        </div>
      </Layout>
    );
  }

  const isFinished = fight.status === "finished";
  const isInProgress = fight.status === "in_progress";
  const canScore = isInProgress && !isFinished;

  const timerColor =
    timeLeft <= 30 ? "text-red-500" :
    timeLeft <= 60 ? "text-amber-500" : "text-foreground";

  return (
    <Layout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation(`/competitions/${compId}`)} data-testid="button-back-competition">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{t("FightTimer")}</h1>
            <p className="text-muted-foreground text-sm">
              {t("Round")} {fight.round} · Позиция {fight.position}
            </p>
          </div>
          <div className="ml-auto">
            <Badge
              variant={isFinished ? "secondary" : isInProgress ? "default" : "outline"}
              className="text-sm"
              data-testid="status-fight"
            >
              {fight.status}
            </Badge>
          </div>
        </div>

        {/* Timer */}
        <div className="text-center py-6 rounded-2xl bg-card border-2 border-border relative overflow-hidden">
          <div className={`text-8xl font-black tabular-nums tracking-tighter ${timerColor}`} data-testid="display-timer">
            {formatTime(timeLeft)}
          </div>
          <div className="flex justify-center gap-3 mt-6">
            {!isFinished && !isInProgress && (
              <Button size="lg" onClick={handleStart} disabled={startFight.isPending} data-testid="button-start-fight" className="gap-2">
                <Play className="h-5 w-5" />
                {t("Start")}
              </Button>
            )}
            {isInProgress && (
              <>
                <Button size="lg" variant="outline" onClick={() => setRunning((r: boolean) => !r)} data-testid="button-pause-fight" className="gap-2">
                  {running ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                  {running ? t("Pause") : t("Start")}
                </Button>
                <Button size="lg" variant="destructive" onClick={handleFinish} disabled={finishFight.isPending} data-testid="button-finish-fight" className="gap-2">
                  <Square className="h-5 w-5" />
                  {t("Finish")}
                </Button>
              </>
            )}
            {events.length > 0 && !isFinished && (
              <Button size="sm" variant="ghost" onClick={handleUndo} disabled={deleteEvent.isPending} data-testid="button-undo" className="gap-2">
                <RotateCcw className="h-4 w-4" />
                {t("Undo")}
              </Button>
            )}
          </div>
        </div>

        {/* Score boards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AthleteScoreCard
            athlete={fight.athlete1}
            ippon={fight.athlete1Ippon}
            wazaAri={fight.athlete1WazaAri}
            shido={fight.athlete1Shido}
            isWinner={!!fight.winnerId && fight.winnerId === fight.athlete1Id}
            side="left"
            onIppon={() => fight.athlete1Id != null && handleEvent(fight.athlete1Id, FightEventInputEventType.ippon)}
            onWazaAri={() => fight.athlete1Id != null && handleEvent(fight.athlete1Id, FightEventInputEventType.waza_ari)}
            onShido={() => fight.athlete1Id != null && handleEvent(fight.athlete1Id, FightEventInputEventType.shido)}
            onHansoku={() => fight.athlete1Id != null && handleEvent(fight.athlete1Id, FightEventInputEventType.hansoku)}
            disabled={!canScore || addEvent.isPending}
          />
          <AthleteScoreCard
            athlete={fight.athlete2}
            ippon={fight.athlete2Ippon}
            wazaAri={fight.athlete2WazaAri}
            shido={fight.athlete2Shido}
            isWinner={!!fight.winnerId && fight.winnerId === fight.athlete2Id}
            side="right"
            onIppon={() => fight.athlete2Id != null && handleEvent(fight.athlete2Id, FightEventInputEventType.ippon)}
            onWazaAri={() => fight.athlete2Id != null && handleEvent(fight.athlete2Id, FightEventInputEventType.waza_ari)}
            onShido={() => fight.athlete2Id != null && handleEvent(fight.athlete2Id, FightEventInputEventType.shido)}
            onHansoku={() => fight.athlete2Id != null && handleEvent(fight.athlete2Id, FightEventInputEventType.hansoku)}
            disabled={!canScore || addEvent.isPending}
          />
        </div>

        {/* Event log */}
        {events.length > 0 && (
          <div className="rounded-xl border bg-card p-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Лог событий</h3>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {[...events].reverse().map((ev) => {
                const isA1 = ev.athleteId === fight.athlete1Id;
                const athlete = isA1 ? fight.athlete1 : fight.athlete2;
                const label = ev.eventType === "ippon" ? "Иппон" :
                  ev.eventType === "waza_ari" ? "Ваза-ари" :
                  ev.eventType === "shido" ? "Шидо" : "Хансоку";
                return (
                  <div key={ev.id} className="flex items-center justify-between text-sm py-1 border-b last:border-0" data-testid={`event-${ev.id}`}>
                    <span>{label} — {athlete ? `${athlete.firstName} ${athlete.lastName}` : "—"}</span>
                    <span className="text-muted-foreground">{formatTime(ev.timestampSeconds)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

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
import { Input } from "@/components/ui/input";
import { ArrowLeft, RotateCcw, Play, Square, Pause, Settings, Timer, Zap, Star } from "lucide-react";

const AGE_PRESETS = [
  { labelKey: "Kids",    seconds: 60  },
  { labelKey: "Youth",   seconds: 120 },
  { labelKey: "Juniors", seconds: 180 },
  { labelKey: "Adults",  seconds: 240 },
] as const;

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function formatOseikomi(seconds: number) {
  return `${seconds}с`;
}

interface TimerSettingsProps {
  current: number;
  onApply: (seconds: number) => void;
  onClose: () => void;
  disabled: boolean;
}

function TimerSettings({ current, onApply, onClose, disabled }: TimerSettingsProps) {
  const { t } = useTranslation();
  const [custom, setCustom] = useState(current.toString());

  return (
    <div className="rounded-2xl border-2 border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-base">{t("TimerSettings")}</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
      </div>
      <p className="text-xs text-muted-foreground">{t("AgeGroup")}</p>
      <div className="grid grid-cols-2 gap-2">
        {AGE_PRESETS.map(p => (
          <button
            key={p.labelKey}
            disabled={disabled}
            onClick={() => { onApply(p.seconds); onClose(); }}
            className={`rounded-xl border-2 px-3 py-3 text-sm font-semibold text-center transition-all hover:border-primary hover:bg-primary/5 active:scale-95 disabled:opacity-40 ${current === p.seconds ? "border-primary bg-primary/10 text-primary" : "border-border"}`}
          >
            {t(p.labelKey as any)}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">{t("CustomSeconds")}</p>
        <div className="flex gap-2">
          <Input
            type="number" min={10} max={600}
            value={custom}
            onChange={e => setCustom(e.target.value)}
            className="w-24"
          />
          <Button
            size="sm"
            disabled={disabled}
            onClick={() => {
              const v = parseInt(custom);
              if (v >= 10 && v <= 600) { onApply(v); onClose(); }
            }}
          >
            {t("ApplySettings")}
          </Button>
        </div>
      </div>
    </div>
  );
}

interface ScoreButtonProps {
  label: string;
  sublabel?: string;
  onClick: () => void;
  disabled?: boolean;
  variant: "ippon" | "wazaari" | "yuko" | "shido" | "hansoku";
  testId: string;
}

function ScoreButton({ label, sublabel, onClick, disabled, variant, testId }: ScoreButtonProps) {
  const classes: Record<string, string> = {
    ippon:   "bg-amber-500 hover:bg-amber-400 active:scale-95 text-white shadow-lg shadow-amber-500/30 border-amber-400",
    wazaari: "bg-blue-600 hover:bg-blue-500 active:scale-95 text-white shadow-lg shadow-blue-600/30 border-blue-500",
    yuko:    "bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-white shadow-lg shadow-emerald-500/30 border-emerald-400",
    shido:   "bg-yellow-500 hover:bg-yellow-400 active:scale-95 text-yellow-900 shadow-lg shadow-yellow-500/30 border-yellow-400",
    hansoku: "bg-red-600 hover:bg-red-500 active:scale-95 text-white shadow-lg shadow-red-600/30 border-red-500",
  };
  return (
    <button
      data-testid={testId}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl border-2 px-3 py-4 text-center font-bold tracking-wide uppercase transition-all disabled:opacity-40 disabled:cursor-not-allowed ${classes[variant]}`}
    >
      <div className="text-base">{label}</div>
      {sublabel && <div className="text-xs font-normal mt-0.5 opacity-80">{sublabel}</div>}
    </button>
  );
}

// Oseikomi (hold) button
interface OseikomiButtonProps {
  active: boolean;
  elapsed: number;
  onStart: () => void;
  onStop: () => void;
  disabled?: boolean;
}

function OseikomiButton({ active, elapsed, onStart, onStop, disabled }: OseikomiButtonProps) {
  const award =
    elapsed >= 20 ? "→ ИППОН" :
    elapsed >= 10 ? "→ ВАЗА-АРИ" :
    elapsed >= 5  ? "→ ЮКО" : "";

  return (
    <button
      onClick={active ? onStop : onStart}
      disabled={disabled && !active}
      className={`rounded-xl border-2 px-3 py-4 text-center font-bold tracking-wide uppercase transition-all w-full
        ${active
          ? "bg-orange-500 border-orange-400 text-white shadow-lg shadow-orange-500/40 animate-pulse"
          : "bg-orange-100 border-orange-300 text-orange-800 hover:bg-orange-200 active:scale-95 disabled:opacity-40"
        }`}
    >
      <div className="flex items-center justify-center gap-2">
        <Timer className="h-4 w-4" />
        <span>{active ? `${elapsed}с` : "Осекоми"}</span>
      </div>
      {active && award && <div className="text-xs font-semibold mt-0.5 text-orange-100">{award}</div>}
      {!active && <div className="text-xs font-normal mt-0.5 opacity-70">удержание</div>}
    </button>
  );
}

interface AthleteScoreCardProps {
  athlete?: { firstName: string; lastName: string } | null;
  ippon: number;
  wazaAri: number;
  yuko: number;
  shido: number;
  isWinner: boolean;
  side: "left" | "right";
  onIppon: () => void;
  onWazaAri: () => void;
  onYuko: () => void;
  onShido: () => void;
  onHansoku: () => void;
  onOseikomiStart: () => void;
  onOseikomiStop: () => void;
  oseikomiActive: boolean;
  oseikomiElapsed: number;
  disabled: boolean;
}

function AthleteScoreCard({
  athlete, ippon, wazaAri, yuko, shido, isWinner,
  side, onIppon, onWazaAri, onYuko, onShido, onHansoku,
  onOseikomiStart, onOseikomiStop, oseikomiActive, oseikomiElapsed,
  disabled
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
        {/* Score display */}
        <div className="grid grid-cols-4 gap-1.5 mb-4 text-center">
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-2">
            <div className="text-2xl font-black text-amber-600" data-testid={`score-ippon-${side}`}>{ippon}</div>
            <div className="text-xs text-amber-700 font-semibold uppercase tracking-wide">Иппон</div>
          </div>
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-2">
            <div className="text-2xl font-black text-blue-600" data-testid={`score-wazaari-${side}`}>{wazaAri}</div>
            <div className="text-xs text-blue-700 font-semibold uppercase tracking-wide">Ваза-ари</div>
          </div>
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2">
            <div className="text-2xl font-black text-emerald-600">{yuko}</div>
            <div className="text-xs text-emerald-700 font-semibold uppercase tracking-wide">Юко</div>
          </div>
          <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-2">
            <div className="text-2xl font-black text-yellow-600" data-testid={`score-shido-${side}`}>{shido}</div>
            <div className="text-xs text-yellow-700 font-semibold uppercase tracking-wide">Шидо</div>
          </div>
        </div>

        {/* Score buttons */}
        <div className="grid grid-cols-2 gap-2 mb-2">
          <ScoreButton label="Иппон" onClick={onIppon} disabled={disabled} variant="ippon" testId={`btn-ippon-${side}`} />
          <ScoreButton label="Ваза-ари" onClick={onWazaAri} disabled={disabled} variant="wazaari" testId={`btn-wazaari-${side}`} />
          <ScoreButton label="Юко" onClick={onYuko} disabled={disabled} variant="yuko" testId={`btn-yuko-${side}`} />
          <ScoreButton label="Шидо" onClick={onShido} disabled={disabled} variant="shido" testId={`btn-shido-${side}`} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <OseikomiButton
            active={oseikomiActive}
            elapsed={oseikomiElapsed}
            onStart={onOseikomiStart}
            onStop={onOseikomiStop}
            disabled={disabled}
          />
          <ScoreButton label="Хансоку" sublabel="(дискв.)" onClick={onHansoku} disabled={disabled} variant="hansoku" testId={`btn-hansoku-${side}`} />
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

  // Main timer state
  const [duration, setDuration] = useState(240);
  const [timeLeft, setTimeLeft] = useState(240);
  const [running, setRunning] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const initializedRef = useRef(false);

  // Golden Score (overtime)
  const [goldenScore, setGoldenScore] = useState(false);
  const [gsTime, setGsTime] = useState(0); // counts up
  const gsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Oseikomi timers (per athlete: left=athlete1, right=athlete2)
  const [oseikomiSide, setOseikomiSide] = useState<"left" | "right" | null>(null);
  const [oseikomiElapsed, setOseikomiElapsed] = useState(0);
  const oseikomiIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (fight && !initializedRef.current) {
      setDuration(fight.durationSeconds && fight.durationSeconds > 0 ? fight.durationSeconds : 240);
      setTimeLeft(fight.durationSeconds && fight.durationSeconds > 0 ? fight.durationSeconds : 240);
      initializedRef.current = true;
    }
  }, [fight]);

  // Main timer
  useEffect(() => {
    if (running && !goldenScore) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev: number) => {
          if (prev <= 1) {
            setRunning(false);
            setGoldenScore(true); // auto-enter golden score
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, goldenScore]);

  // Golden Score timer (counts up)
  useEffect(() => {
    if (running && goldenScore) {
      gsIntervalRef.current = setInterval(() => {
        setGsTime(prev => prev + 1);
      }, 1000);
    } else {
      if (gsIntervalRef.current) clearInterval(gsIntervalRef.current);
    }
    return () => { if (gsIntervalRef.current) clearInterval(gsIntervalRef.current); };
  }, [running, goldenScore]);

  // Oseikomi timer
  useEffect(() => {
    if (oseikomiSide !== null) {
      oseikomiIntervalRef.current = setInterval(() => {
        setOseikomiElapsed(prev => prev + 1);
      }, 1000);
    } else {
      if (oseikomiIntervalRef.current) clearInterval(oseikomiIntervalRef.current);
    }
    return () => { if (oseikomiIntervalRef.current) clearInterval(oseikomiIntervalRef.current); };
  }, [oseikomiSide]);

  const handleApplyDuration = (seconds: number) => {
    if (running) return;
    setDuration(seconds);
    setTimeLeft(seconds);
  };

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: getGetFightQueryKey(id) });
    queryClient.invalidateQueries({ queryKey: getListFightEventsQueryKey(id) });
  }, [queryClient, id]);

  const handleStart = () => {
    startFight.mutate({ fightId: id }, {
      onSuccess: () => { setRunning(true); invalidate(); }
    });
  };

  const handleFinish = () => {
    setRunning(false);
    setOseikomiSide(null);
    const elapsed = goldenScore ? duration + gsTime : duration - timeLeft;
    finishFight.mutate(
      { fightId: id, data: { winnerId: fight?.winnerId ?? null, durationSeconds: elapsed } },
      { onSuccess: invalidate }
    );
  };

  const handleEvent = (athleteId: number, eventType: FightEventInputEventType) => {
    const elapsed = goldenScore ? duration + gsTime : duration - timeLeft;
    addEvent.mutate(
      { fightId: id, data: { athleteId, eventType, timestampSeconds: elapsed } },
      {
        onSuccess: () => {
          invalidate();
          if (eventType === FightEventInputEventType.ippon || eventType === FightEventInputEventType.hansoku) {
            setRunning(false);
            setOseikomiSide(null);
          }
        }
      }
    );
  };

  const handleOseikomiStop = (side: "left" | "right") => {
    const elapsed = oseikomiElapsed;
    setOseikomiSide(null);
    setOseikomiElapsed(0);

    const athleteId = side === "left" ? fight?.athlete1Id : fight?.athlete2Id;
    if (!athleteId || !fight) return;

    // Auto-award based on hold duration
    if (elapsed >= 20) {
      handleEvent(athleteId, FightEventInputEventType.ippon);
    } else if (elapsed >= 10) {
      handleEvent(athleteId, FightEventInputEventType.waza_ari);
    } else if (elapsed >= 5) {
      handleEvent(athleteId, FightEventInputEventType.yuko);
    }
    // < 5 seconds → no score
  };

  const handleUndo = () => {
    const lastEvent = [...events].reverse()[0];
    if (!lastEvent) return;
    deleteEvent.mutate({ fightId: id, eventId: lastEvent.id }, { onSuccess: invalidate });
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
    goldenScore ? "text-purple-500" :
    timeLeft <= 30 ? "text-red-500" :
    timeLeft <= 60 ? "text-amber-500" : "text-foreground";

  const activePreset = AGE_PRESETS.find(p => p.seconds === duration);

  return (
    <Layout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation(`/competitions/${compId}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{t("FightTimer")}</h1>
            <p className="text-muted-foreground text-sm">
              {t("Round")} {fight.round} · Позиция {fight.position}
              {(fight as any).tatami ? ` · Татами ${(fight as any).tatami}` : ""}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {!isFinished && !isInProgress && (
              <Button variant="outline" size="sm" onClick={() => setShowSettings(s => !s)} className="gap-1.5">
                <Settings className="h-4 w-4" />
                {t("TimerSettings")}
              </Button>
            )}
            <Badge
              variant={isFinished ? "secondary" : isInProgress ? "default" : "outline"}
              className={`text-sm ${goldenScore ? "bg-purple-600 text-white" : ""}`}
              data-testid="status-fight"
            >
              {goldenScore ? "Голден Скоре" : fight.status}
            </Badge>
          </div>
        </div>

        {showSettings && (
          <TimerSettings
            current={duration}
            onApply={handleApplyDuration}
            onClose={() => setShowSettings(false)}
            disabled={isInProgress}
          />
        )}

        {/* Timer */}
        <div className={`text-center py-6 rounded-2xl border-2 relative overflow-hidden ${goldenScore ? "bg-purple-950/10 border-purple-400" : "bg-card border-border"}`}>
          {goldenScore && (
            <div className="absolute inset-x-0 top-0 bg-purple-600 text-white text-xs font-bold py-1.5 flex items-center justify-center gap-1">
              <Star className="h-3.5 w-3.5" />
              ГОЛДЕН СКОРЕ — ДОПОЛНИТЕЛЬНОЕ ВРЕМЯ
              <Star className="h-3.5 w-3.5" />
            </div>
          )}
          {activePreset && !goldenScore && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2">
              <Badge variant="outline" className="text-xs font-medium px-2">
                {t(activePreset.labelKey as any)}
              </Badge>
            </div>
          )}

          <div className={`text-8xl font-black tabular-nums tracking-tighter mt-4 ${timerColor}`} data-testid="display-timer">
            {goldenScore ? formatTime(gsTime) : formatTime(timeLeft)}
          </div>

          {goldenScore ? (
            <div className="text-xs text-purple-600 mt-1 font-semibold">
              ГС · Первый балл побеждает
            </div>
          ) : (
            <div className="text-xs text-muted-foreground mt-1">{t("Duration")}: {formatTime(duration)}</div>
          )}

          <div className="flex justify-center gap-3 mt-6">
            {!isFinished && !isInProgress && (
              <Button size="lg" onClick={handleStart} disabled={startFight.isPending} data-testid="button-start-fight" className="gap-2">
                <Play className="h-5 w-5" />
                {t("Start")}
              </Button>
            )}
            {isInProgress && (
              <>
                <Button size="lg" variant="outline" onClick={() => setRunning((r: boolean) => !r)} data-testid="button-pause-fight" className={`gap-2 ${goldenScore ? "border-purple-400 text-purple-700" : ""}`}>
                  {running ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                  {running ? t("Pause") : t("Start")}
                </Button>
                <Button size="lg" variant="destructive" onClick={handleFinish} disabled={finishFight.isPending} data-testid="button-finish-fight" className="gap-2">
                  <Square className="h-5 w-5" />
                  {t("Finish")}
                </Button>
              </>
            )}
            {timeLeft === 0 && !isInProgress && !goldenScore && (
              <Button
                size="lg"
                variant="outline"
                className="gap-2 border-purple-400 text-purple-700"
                onClick={() => { setGoldenScore(true); setGsTime(0); }}
              >
                <Zap className="h-5 w-5" />
                Голден Скоре
              </Button>
            )}
            {events.length > 0 && !isFinished && (
              <Button size="sm" variant="ghost" onClick={handleUndo} disabled={deleteEvent.isPending} data-testid="button-undo" className="gap-2">
                <RotateCcw className="h-4 w-4" />
                {t("Undo")}
              </Button>
            )}
          </div>
        </div>

        {/* Oseikomi status bar (when active) */}
        {oseikomiSide !== null && (
          <div className="rounded-xl border-2 border-orange-400 bg-orange-50 p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Timer className="h-5 w-5 text-orange-600 animate-pulse" />
              <span className="font-bold text-orange-800">
                Осекоми: {oseikomiSide === "left"
                  ? (fight.athlete1 ? `${fight.athlete1.lastName} ${fight.athlete1.firstName}` : "Синий")
                  : (fight.athlete2 ? `${fight.athlete2.lastName} ${fight.athlete2.firstName}` : "Красный")
                }
              </span>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black text-orange-600">{oseikomiElapsed}с</div>
              <div className="text-xs text-orange-500">
                {oseikomiElapsed >= 20 ? "→ ИППОН" :
                 oseikomiElapsed >= 10 ? "→ ВАЗА-АРИ" :
                 oseikomiElapsed >= 5  ? "→ ЮКО" : "продолжается..."}
              </div>
            </div>
          </div>
        )}

        {/* Score boards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AthleteScoreCard
            athlete={fight.athlete1}
            ippon={fight.athlete1Ippon}
            wazaAri={fight.athlete1WazaAri}
            yuko={(fight as any).athlete1Yuko ?? 0}
            shido={fight.athlete1Shido}
            isWinner={!!fight.winnerId && fight.winnerId === fight.athlete1Id}
            side="left"
            onIppon={() => fight.athlete1Id != null && handleEvent(fight.athlete1Id, FightEventInputEventType.ippon)}
            onWazaAri={() => fight.athlete1Id != null && handleEvent(fight.athlete1Id, FightEventInputEventType.waza_ari)}
            onYuko={() => fight.athlete1Id != null && handleEvent(fight.athlete1Id, FightEventInputEventType.yuko)}
            onShido={() => fight.athlete1Id != null && handleEvent(fight.athlete1Id, FightEventInputEventType.shido)}
            onHansoku={() => fight.athlete1Id != null && handleEvent(fight.athlete1Id, FightEventInputEventType.hansoku)}
            onOseikomiStart={() => { setOseikomiSide("left"); setOseikomiElapsed(0); }}
            onOseikomiStop={() => handleOseikomiStop("left")}
            oseikomiActive={oseikomiSide === "left"}
            oseikomiElapsed={oseikomiElapsed}
            disabled={!canScore || addEvent.isPending}
          />
          <AthleteScoreCard
            athlete={fight.athlete2}
            ippon={fight.athlete2Ippon}
            wazaAri={fight.athlete2WazaAri}
            yuko={(fight as any).athlete2Yuko ?? 0}
            shido={fight.athlete2Shido}
            isWinner={!!fight.winnerId && fight.winnerId === fight.athlete2Id}
            side="right"
            onIppon={() => fight.athlete2Id != null && handleEvent(fight.athlete2Id, FightEventInputEventType.ippon)}
            onWazaAri={() => fight.athlete2Id != null && handleEvent(fight.athlete2Id, FightEventInputEventType.waza_ari)}
            onYuko={() => fight.athlete2Id != null && handleEvent(fight.athlete2Id, FightEventInputEventType.yuko)}
            onShido={() => fight.athlete2Id != null && handleEvent(fight.athlete2Id, FightEventInputEventType.shido)}
            onHansoku={() => fight.athlete2Id != null && handleEvent(fight.athlete2Id, FightEventInputEventType.hansoku)}
            onOseikomiStart={() => { setOseikomiSide("right"); setOseikomiElapsed(0); }}
            onOseikomiStop={() => handleOseikomiStop("right")}
            oseikomiActive={oseikomiSide === "right"}
            oseikomiElapsed={oseikomiElapsed}
            disabled={!canScore || addEvent.isPending}
          />
        </div>

        {/* Oseikomi scoring rules hint */}
        {canScore && (
          <div className="rounded-xl border bg-muted/30 p-3 text-xs text-muted-foreground space-y-0.5">
            <p className="font-semibold text-foreground text-sm">Осекоми (удержание):</p>
            <p>≥ 5с → Юко · ≥ 10с → Ваза-ари · ≥ 20с → Иппон (оценка начисляется при остановке)</p>
          </div>
        )}

        {/* Event log */}
        {events.length > 0 && (
          <div className="rounded-xl border bg-card p-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Лог событий</h3>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {[...events].reverse().map((ev) => {
                const isA1 = ev.athleteId === fight.athlete1Id;
                const athlete = isA1 ? fight.athlete1 : fight.athlete2;
                const label =
                  ev.eventType === "ippon" ? "Иппон" :
                  ev.eventType === "waza_ari" ? "Ваза-ари" :
                  ev.eventType === "yuko" ? "Юко" :
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

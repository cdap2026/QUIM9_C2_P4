import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { EXPERIMENTS, LAWS, OPEN_QUESTIONS, QUIZ } from "../lib/data";
import {
  block1Requirements,
  block2Complete,
  clearPenalties,
  deriveScore,
  extendTime,
  findSession,
  formatClock,
  formatDate,
  formatDuration,
  formatShortTime,
  onStoreChange,
  publishSound,
  readMicCommand,
  readSessions,
  remainingMs,
  removeDemoSessions,
  resetDemoSessions,
  sendTeacherMessage,
  sessionSnapshotForExport,
  setMicCommand,
  setTeacherNote,
  unlockAll,
} from "../lib/storage";
import { downloadClassPdf, downloadStudentPdf } from "../lib/pdf";
import type { Session } from "../lib/types";
import { Icon, type IconName } from "./icons";
import { GasLogo, LiveDot, Modal, ToastViewport, useToasts } from "./ui";

interface Props {
  onExit: () => void;
  onOpenStudent: () => void;
}

type DetailTab = "summary" | "answers" | "security" | "sound";
type Filter = "all" | "online" | "finished" | "alert";

const initialSessions = readSessions();

function isOnline(session: Session) {
  return Boolean(session.isDemo && !session.finishedAt) || Date.now() - session.updatedAt < 1000 * 60 * 3;
}

function blockLabel(session: Session) {
  if (session.finishedAt) return "Informe final";
  return ["Bloque 1 · Simuladores", "Bloque 2 · Saber", "Bloque 3 · Aplicación"][session.currentBlock - 1] ?? "Sin iniciar";
}

function initials(name: string) {
  return name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase();
}

export function TeacherConsole({ onExit, onOpenStudent }: Props) {
  const { toasts, push, remove } = useToasts();
  const [sessions, setSessions] = useState<Session[]>(initialSessions);
  const [selectedId, setSelectedId] = useState<string>(
    initialSessions.find((session) => !session.isDemo)?.id ?? initialSessions[0]?.id ?? ""
  );
  const [detailTab, setDetailTab] = useState<DetailTab>("summary");
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [showDemos, setShowDemos] = useState(true);
  const [threshold, setThreshold] = useState(65);
  const [message, setMessage] = useState("");
  const [noteDraft, setNoteDraft] = useState("");
  const [soundHistory, setSoundHistory] = useState<Record<string, number[]>>({});
  const [confirmAction, setConfirmAction] = useState<"penalties" | "unlock" | null>(null);
  const [now, setNow] = useState(Date.now());

  const refresh = useCallback(() => setSessions(readSessions()), []);

  useEffect(() => {
    const unsubscribe = onStoreChange(refresh);
    const timer = window.setInterval(refresh, 1700);
    const clock = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      unsubscribe();
      window.clearInterval(timer);
      window.clearInterval(clock);
    };
  }, [refresh]);

  const visible = useMemo(() => {
    return sessions
      .filter((session) => (showDemos ? true : !session.isDemo))
      .filter((session) => {
        if (filter === "online") return isOnline(session) && !session.finishedAt;
        if (filter === "finished") return Boolean(session.finishedAt);
        if (filter === "alert") return session.penalties.length > 0;
        return true;
      })
      .filter((session) => {
        const query = search.trim().toLowerCase();
        if (!query) return true;
        return session.name.toLowerCase().includes(query) || session.code.toLowerCase().includes(query);
      });
  }, [sessions, showDemos, filter, search]);

  const selected = sessions.find((session) => session.id === selectedId) ?? visible[0] ?? sessions[0];

  useEffect(() => {
    if (selected && selected.id !== selectedId) setSelectedId(selected.id);
  }, [selected, selectedId]);

  useEffect(() => {
    setNoteDraft(selected?.teacherNote ?? "");
    setMessage("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  /* Lectura simulada para las sesiones de demostración */
  useEffect(() => {
    if (!selected?.isDemo || !selected.sound.on) return;
    const id = selected.id;
    const tick = () => {
      const base = 48 + Math.sin(Date.now() / 950) * 7 + Math.random() * 10;
      const db = Math.max(34, Math.min(88, Math.round(base)));
      const current = findSession(id);
      if (!current) return;
      publishSound(id, {
        on: true,
        status: "simulated",
        db,
        peak: Math.max(current.sound.peak, db),
      });
      setSessions(readSessions());
    };
    tick();
    const timer = window.setInterval(tick, 950);
    return () => window.clearInterval(timer);
  }, [selected?.id, selected?.isDemo, selected?.sound.on]);

  useEffect(() => {
    if (!selected?.sound.db || !selected.sound.on) return;
    setSoundHistory((current) => {
      const list = current[selected.id] ?? [];
      if (list[list.length - 1] === selected.sound.db) return current;
      return { ...current, [selected.id]: [...list, selected.sound.db].slice(-40) };
    });
  }, [selected?.id, selected?.sound.db, selected?.sound.on]);

  const stats = useMemo(() => {
    const pool = sessions.filter((session) => showDemos || !session.isDemo);
    const online = pool.filter((session) => isOnline(session) && !session.finishedAt).length;
    const finished = pool.filter((session) => session.finishedAt).length;
    const alerts = pool.reduce((sum, session) => sum + session.penalties.length, 0);
    const average = pool.length ? Math.round(pool.reduce((sum, session) => sum + deriveScore(session).total, 0) / pool.length) : 0;
    return { total: pool.length, online, finished, alerts, average };
  }, [sessions, showDemos]);

  function selectStudent(id: string) {
    setSelectedId(id);
    setDetailTab("summary");
    setMessage("");
  }

  function act(action: (id: string) => Session | undefined, successMessage: string) {
    if (!selected) return;
    const updated = action(selected.id);
    refresh();
    if (updated) push(successMessage, "success");
    else push("La sesión ya no está disponible.", "error");
  }

  function toggleMeter(session: Session) {
    const command = readMicCommand(session.id);
    const currentlyOn = Boolean(command?.on ?? session.sound.on);
    if (currentlyOn) {
      setMicCommand(session.id, false);
      publishSound(session.id, { on: false, status: "off", db: 0 });
      push(`Sonómetro desactivado para ${session.name.split(" ")[0]}.`, "info");
    } else {
      setMicCommand(session.id, true);
      publishSound(session.id, {
        on: true,
        status: session.isDemo ? "simulated" : "pending",
        db: 0,
        peak: 0,
      });
      push(
        session.isDemo
          ? "Sonómetro de demostración activo (lectura simulada)."
          : `Solicitud de sonómetro enviada a ${session.name.split(" ")[0]}. Debe autorizar el micrófono.`,
        session.isDemo ? "warning" : "success"
      );
      if (!session.isDemo) setDetailTab("sound");
    }
    refresh();
  }

  function retryMeter(session: Session) {
    setMicCommand(session.id, false);
    window.setTimeout(() => {
      setMicCommand(session.id, true);
      publishSound(session.id, { on: true, status: "pending", db: 0 });
      refresh();
    }, 80);
    push("Nueva solicitud de micrófono enviada al estudiante.", "info");
  }

  function handleClassPdf() {
    try {
      downloadClassPdf(visible);
      push("Informe grupal PDF generado.", "success");
    } catch {
      push("No fue posible generar el informe grupal.", "error");
    }
  }

  function handleStudentPdf() {
    if (!selected) return;
    try {
      downloadStudentPdf(selected);
      push(`Informe individual de ${selected.name.split(" ")[0]} generado.`, "success");
    } catch {
      push("No fue posible generar el informe individual.", "error");
    }
  }

  function resetDemos() {
    resetDemoSessions();
    refresh();
    setShowDemos(true);
    push("Sesiones de demostración restablecidas.", "success");
  }

  return (
    <div className="dark-grid min-h-screen text-white">
      <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-[#052427]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[60px] max-w-[1440px] items-center gap-3 px-3 sm:px-5">
          <GasLogo />
          <span className="hidden h-6 w-px bg-white/12 md:block" />
          <div className="hidden md:block">
            <p className="font-display text-[13.5px] font-semibold leading-none text-white/88">Consola de monitoreo</p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.13em] text-white/55">aula de ciencias · grado 9°</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <span className="hidden items-center gap-1.5 rounded-full border border-[var(--lime)]/18 bg-[var(--lime)]/[0.055] px-2.5 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.1em] text-[var(--lime)] sm:inline-flex">
              <LiveDot /> sincronización activa
            </span>
            <span className="hidden rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 font-mono text-[11.5px] text-white/62 lg:block">
              {new Date(now).toLocaleDateString("es-CO", { day: "2-digit", month: "short" })} ·{" "}
              {new Date(now).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
            <button onClick={handleClassPdf} className="btn btn-lime !px-2.5 !py-1.5 !text-[12px]">
              <Icon name="download" size={12} /> <span className="hidden sm:inline">Informe grupal</span>
              <span className="sm:hidden">PDF</span>
            </button>
            <button onClick={onOpenStudent} className="btn btn-outline-light !px-2.5 !py-1.5 !text-[12px]">
              <Icon name="external" size={12} /> <span className="hidden sm:inline">Abrir actividad</span>
            </button>
            <button onClick={onExit} className="icon-button icon-button-dark !h-[30px] !w-[30px]" aria-label="Volver al portal">
              <Icon name="home" size={14} />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-3 py-4 sm:px-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="eyebrow eyebrow-dark mb-1">
              <Icon name="activity" size={10} /> Monitoreo de la sesión
            </p>
            <h1 className="font-display text-[24.5px] font-semibold leading-none tracking-[-0.035em] sm:text-[28.5px]">
              El aula en tiempo real
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="chip chip-dark">
              <Icon name="users" size={10} /> {stats.online} conectados
            </span>
            <span className="chip chip-dark">
              <Icon name="clock" size={10} /> 45 min por estudiante
            </span>
            <span className="hidden items-center gap-1 rounded-full border border-[var(--amber)]/25 bg-[var(--amber)]/[0.07] px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.08em] text-[var(--amber)] sm:inline-flex">
              <Icon name="info" size={9} /> demo incluida
            </span>
          </div>
        </div>

        <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {[
            { label: "Sesiones", value: String(stats.total), icon: "users" as IconName, hint: "en este navegador" },
            { label: "En actividad", value: String(stats.online), icon: "activity" as IconName, hint: "conectados ahora", accent: "#c8f257" },
            { label: "Finalizaron", value: String(stats.finished), icon: "file" as IconName, hint: "informe disponible", accent: "#8de6c8" },
            { label: "Promedio", value: `${stats.average}`, icon: "chart" as IconName, hint: "puntos / 100", accent: "#92d6e8" },
            { label: "Alertas", value: String(stats.alerts), icon: "shield" as IconName, hint: "penalizaciones activas", accent: stats.alerts ? "#e9a63f" : "#8de6c8" },
          ].map((stat) => (
            <div key={stat.label} className="console-card flex items-center gap-2.5 px-3 py-2.5">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.045]" style={{ color: stat.accent ?? "rgba(255,255,255,.65)" }}>
                <Icon name={stat.icon} size={15} />
              </span>
              <div className="min-w-0">
                <p className="font-display text-[19.5px] font-semibold leading-none tracking-[-0.03em]" style={{ color: stat.accent ?? "white" }}>
                  {stat.value}
                </p>
                <p className="mt-1 truncate font-mono text-[10px] uppercase tracking-[0.08em] text-white/55">{stat.label} · {stat.hint}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid items-start gap-3 xl:grid-cols-[330px_minmax(0,1fr)]">
          <aside className="console-card overflow-hidden">
            <div className="border-b border-white/[0.08] p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Icon name="users" size={13} className="text-[var(--lime)]" />
                  <p className="font-display text-[13.5px] font-semibold">Estudiantes</p>
                  <span className="rounded bg-white/[0.07] px-1.5 py-0.5 font-mono text-[10.5px] text-white/62">{visible.length}</span>
                </div>
                <button
                  onClick={refresh}
                  className="inline-flex items-center gap-1 font-mono text-[10.5px] uppercase tracking-[0.08em] text-white/55 transition hover:text-white/74"
                >
                  <Icon name="refresh" size={10} /> actualizar
                </button>
              </div>
              <div className="relative mt-2.5">
                <Icon name="search" size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/55" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar por nombre o código…"
                  className="input input-dark !py-2 !pl-8 !text-[12.5px]"
                  aria-label="Buscar estudiante"
                />
              </div>
              <div className="scroll-slim mt-2 flex gap-1 overflow-x-auto pb-0.5">
                {[
                  { id: "all" as Filter, label: "Todas" },
                  { id: "online" as Filter, label: "En línea" },
                  { id: "finished" as Filter, label: "Finalizadas" },
                  { id: "alert" as Filter, label: "Alertas" },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setFilter(item.id)}
                    className={`shrink-0 rounded-md border px-2 py-1 text-[11.5px] font-medium transition ${
                      filter === item.id
                        ? "border-[var(--lime)]/30 bg-[var(--lime)]/10 text-[var(--lime)]"
                        : "border-white/10 text-white/62 hover:border-white/20 hover:text-white/70"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="scroll-slim max-h-[calc(100vh-330px)] min-h-[260px] overflow-y-auto p-1.5">
              {visible.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                  <Icon name="search" size={20} className="text-white/45" />
                  <p className="text-[13px] font-medium text-white/68">Sin coincidencias</p>
                  <p className="text-[11.5px] leading-relaxed text-white/55">Prueba otro filtro o inicia una sesión desde la actividad del estudiante.</p>
                  <button onClick={onOpenStudent} className="btn btn-outline-light btn-sm mt-1">Abrir actividad</button>
                </div>
              ) : (
                visible.map((session) => {
                  const score = deriveScore(session);
                  const online = isOnline(session);
                  const active = selected?.id === session.id;
                  const command = readMicCommand(session.id);
                  const meterOn = Boolean(command?.on ?? session.sound.on);
                  return (
                    <div
                      key={session.id}
                      onClick={() => selectStudent(session.id)}
                      data-selected={active}
                      className="teacher-row mb-1 cursor-pointer rounded-xl px-2.5 py-2.5"
                    >
                      <div className="flex items-start gap-2.5">
                        <span
                          className={`relative grid h-8 w-8 shrink-0 place-items-center rounded-lg font-display text-[11.5px] font-bold ${
                            session.finishedAt
                              ? "bg-[var(--mint)]/12 text-[var(--mint)]"
                              : session.penalties.length
                                ? "bg-[var(--amber)]/12 text-[var(--amber)]"
                                : "bg-[var(--lime)]/10 text-[var(--lime)]"
                          }`}
                        >
                          {initials(session.name)}
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border-2 border-[#0b383d] ${
                              session.finishedAt ? "bg-[var(--mint)]" : online ? "bg-[var(--lime)]" : "bg-white/25"
                            }`}
                          />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="truncate text-[12.5px] font-medium text-white/86">{session.name}</p>
                            {session.isDemo && <span className="rounded bg-white/[0.08] px-1 py-0.5 font-mono text-[9.5px] text-white/55">demo</span>}
                          </div>
                          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.06em] text-white/55">
                            {session.group} · {session.code}
                          </p>
                          <div className="mt-1.5 flex items-center gap-2">
                            <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/[0.08]">
                              <div
                                className={`h-full rounded-full ${session.penalties.length ? "bg-[var(--amber)]/80" : "bg-[var(--lime)]/75"}`}
                                style={{ width: `${session.finishedAt ? 100 : ((session.currentBlock - 1) / 3) * 100 + 18}%` }}
                              />
                            </div>
                            <span className="font-mono text-[10.5px] text-white/55">{session.finishedAt ? "100%" : `${session.currentBlock}/3`}</span>
                          </div>
                          <div className="mt-1 flex items-center justify-between gap-2">
                            <span className="truncate text-[10.5px] text-white/55">{blockLabel(session)}</span>
                            <div className="flex shrink-0 items-center gap-1.5">
                              {session.penalties.length > 0 && (
                                <span className="font-mono text-[10.5px] text-[var(--amber)]">−{session.penalties.reduce((sum, penalty) => sum + penalty.points, 0)}</span>
                              )}
                              <span className="font-mono text-[10.5px] text-white/62">{score.total} pts</span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedId(session.id);
                            toggleMeter(session);
                          }}
                          className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border transition ${
                            meterOn
                              ? "border-[var(--lime)]/35 bg-[var(--lime)]/15 text-[var(--lime)]"
                              : "border-white/10 bg-white/[0.03] text-white/55 hover:text-white/70"
                          }`}
                          aria-label={`${meterOn ? "Desactivar" : "Activar"} sonómetro de ${session.name}`}
                          title={`${meterOn ? "Desactivar" : "Activar"} sonómetro individual`}
                        >
                          <Icon name={meterOn ? "volume" : "mic"} size={11} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="border-t border-white/[0.08] p-2.5">
              <div className="flex items-center justify-between rounded-lg bg-white/[0.03] px-2.5 py-2">
                <div className="flex items-center gap-2">
                  <button
                    role="switch"
                    aria-checked={showDemos}
                    onClick={() => setShowDemos((current) => !current)}
                    className={`relative h-4 w-7 rounded-full transition ${showDemos ? "bg-[var(--lime)]/80" : "bg-white/15"}`}
                  >
                    <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-[#062629] transition-all ${showDemos ? "left-3.5" : "left-0.5"}`} />
                  </button>
                  <span className="text-[11px] text-white/62">Sesiones demo</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={resetDemos} className="font-mono text-[10.5px] text-white/55 transition hover:text-white/70" title="Restablecer demos">
                    reiniciar
                  </button>
                  <button
                    onClick={() => {
                      removeDemoSessions();
                      refresh();
                      push("Sesiones demo eliminadas.", "info");
                    }}
                    className="font-mono text-[10.5px] text-white/45 transition hover:text-[var(--coral)]"
                    title="Eliminar demos"
                  >
                    limpiar
                  </button>
                </div>
              </div>
            </div>
          </aside>

          {selected ? (
            <section className="min-w-0 space-y-3">
              <div className="console-card overflow-hidden">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/[0.08] p-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--lime)]/12 font-display text-[15px] font-bold text-[var(--lime)]">
                      {initials(selected.name)}
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-display text-[19.5px] font-semibold tracking-[-0.03em] text-white">{selected.name}</h2>
                        {selected.isDemo && <span className="chip chip-dark !py-0.5 !text-[10.5px] text-[var(--amber)]/80">sesión demo</span>}
                        {selected.finishedAt ? (
                          <span className="chip !border-[var(--mint)]/25 !bg-[var(--mint)]/10 !py-0.5 !text-[10.5px] !text-[var(--mint)]">finalizó</span>
                        ) : (
                          <span className="chip !border-[var(--lime)]/25 !bg-[var(--lime)]/10 !py-0.5 !text-[10.5px] !text-[var(--lime)]">
                            <LiveDot /> en línea
                          </span>
                        )}
                      </div>
                      <p className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.08em] text-white/55">
                        {selected.group} · {selected.code} · inicio {formatShortTime(selected.startedAt)} ·{" "}
                        {selected.finishedAt ? `duración ${formatDuration(selected.finishedAt - selected.startedAt)}` : `${formatClock(remainingMs(selected, now))} restantes`}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => setDetailTab("sound")}
                      className={`btn !px-2.5 !py-1.5 !text-[12px] ${
                        selected.sound.on ? "btn-lime" : "btn-outline-light"
                      }`}
                    >
                      <Icon name={selected.sound.on ? "volume" : "mic"} size={12} />
                      {selected.sound.on ? "Sonómetro encendido" : "Activar sonómetro"}
                    </button>
                    <button onClick={() => setDetailTab("security")} className="btn btn-outline-light !px-2.5 !py-1.5 !text-[12px]">
                      <Icon name="shield" size={12} /> Penalizaciones
                    </button>
                    <button onClick={handleStudentPdf} className="btn btn-outline-light !px-2.5 !py-1.5 !text-[12px]">
                      <Icon name="download" size={12} /> PDF
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-px bg-white/[0.07] sm:grid-cols-4">
                  {[
                    { label: "Puntaje actual", value: `${deriveScore(selected).total}`, unit: "/100", accent: "#c8f257" },
                    { label: "Avance", value: selected.finishedAt ? "3" : String(selected.currentBlock), unit: "/ 3 bloques", accent: "white" },
                    { label: "Saber correctas", value: `${deriveScore(selected).correctAnswers}`, unit: "/ 8", accent: "#8de6c8" },
                    { label: "Penalizaciones", value: deriveScore(selected).penalties > 0 ? `−${deriveScore(selected).penalties}` : "0", unit: "puntos", accent: selected.penalties.length ? "#e9a63f" : "#8de6c8" },
                  ].map((item) => (
                    <div key={item.label} className="bg-[#0a3438] px-3 py-2.5">
                      <p className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-white/55">{item.label}</p>
                      <p className="mt-1 font-display text-[18.5px] font-semibold leading-none" style={{ color: item.accent }}>
                        {item.value} <span className="text-[10.5px] font-normal text-white/55">{item.unit}</span>
                      </p>
                    </div>
                  ))}
                </div>

                <div className="flex gap-1 overflow-x-auto p-2">
                  {[
                    { id: "summary" as DetailTab, label: "Resumen", icon: "layers" as IconName },
                    { id: "answers" as DetailTab, label: "Respuestas", icon: "clipboard" as IconName },
                    { id: "security" as DetailTab, label: "Seguridad", icon: "shield" as IconName, count: selected.penalties.length },
                    { id: "sound" as DetailTab, label: "Sonómetro", icon: "volume" as IconName, active: selected.sound.on },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setDetailTab(tab.id)}
                      className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium transition ${
                        detailTab === tab.id ? "bg-white/[0.09] text-white" : "text-white/62 hover:bg-white/[0.045] hover:text-white/70"
                      }`}
                    >
                      <Icon name={tab.icon} size={11} />
                      {tab.label}
                      {"count" in tab && tab.count ? <span className="rounded bg-[var(--amber)]/20 px-1 font-mono text-[10px] text-[var(--amber)]">{tab.count}</span> : null}
                      {"active" in tab && tab.active ? <span className="h-1 w-1 rounded-full bg-[var(--lime)]" /> : null}
                    </button>
                  ))}
                </div>
              </div>

              {detailTab === "summary" && (
                <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
                  <div className="space-y-3">
                    <div className="console-card p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <p className="font-display text-[13.5px] font-semibold">Ruta de la actividad</p>
                        <span className="font-mono text-[10.5px] text-white/55">tiempo real</span>
                      </div>
                      <div className="space-y-2">
                        {[
                          {
                            label: "Simuladores y evidencia",
                            done: Boolean(selected.finishedAt) || block1Requirements(selected).complete,
                            active: selected.currentBlock === 1 && !selected.finishedAt,
                            detail: `${selected.block1.records.length} registros · ${EXPERIMENTS.filter((key) => selected.block1.laws[key] === key).length}/4 leyes`,
                          },
                          {
                            label: "Prueba Saber",
                            done: selected.block2.submitted,
                            active: selected.currentBlock === 2 && !selected.finishedAt,
                            detail: `${Object.keys(selected.block2.answers).length}/8 respondidas · ${deriveScore(selected).correctAnswers} correctas`,
                          },
                          {
                            label: "Aplicación y cierre",
                            done: Boolean(selected.finishedAt),
                            active: selected.currentBlock === 3 && !selected.finishedAt,
                            detail: `${OPEN_QUESTIONS.filter((question) => (selected.block3.answers[question.id] ?? "").trim().length >= question.minChars).length}/4 respuestas completas`,
                          },
                        ].map((step, index) => (
                          <div key={step.label} className={`flex items-center gap-2.5 rounded-lg border px-2.5 py-2 ${step.active ? "border-[var(--lime)]/20 bg-[var(--lime)]/[0.055]" : "border-white/[0.07] bg-white/[0.02]"}`}>
                            <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border text-[11.5px] font-mono ${step.done ? "border-[var(--mint)]/30 bg-[var(--mint)]/15 text-[var(--mint)]" : step.active ? "border-[var(--lime)]/30 bg-[var(--lime)]/15 text-[var(--lime)]" : "border-white/10 text-white/55"}`}>
                              {step.done ? <Icon name="check" size={11} strokeWidth={2.5} /> : `0${index + 1}`}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className={`text-[12px] font-medium ${step.done || step.active ? "text-white/80" : "text-white/62"}`}>{step.label}</p>
                              <p className="mt-0.5 font-mono text-[10px] text-white/55">{step.detail}</p>
                            </div>
                            {step.active && <span className="flex items-center gap-1 font-mono text-[9.5px] uppercase tracking-[0.08em] text-[var(--lime)]"><LiveDot /> activo</span>}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="console-card p-4">
                      <div className="mb-2.5 flex items-center justify-between">
                        <p className="font-display text-[13.5px] font-semibold">Evidencia experimental</p>
                        <span className="font-mono text-[10.5px] text-white/55">{selected.block1.records.length} filas</span>
                      </div>
                      {selected.block1.records.length === 0 ? (
                        <p className="rounded-lg border border-dashed border-white/10 px-3 py-5 text-center text-[11.5px] text-white/55">
                          Aún no hay mediciones registradas.
                        </p>
                      ) : (
                        <div className="scroll-slim max-h-[170px] overflow-auto">
                          <table className="w-full border-collapse text-left">
                            <thead className="sticky top-0 bg-[#0d3b40]">
                              <tr>
                                {["Montaje", "Medición", "Ley", "Hora"].map((header) => (
                                  <th key={header} className="px-2 py-1.5 font-mono text-[9.5px] uppercase tracking-[0.08em] text-white/55">{header}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {selected.block1.records.slice().reverse().map((record) => (
                                <tr key={record.id} className="border-t border-white/[0.055]">
                                  <td className="px-2 py-1.5 text-[11px] text-white/74">{LAWS[record.exp].short}</td>
                                  <td className="px-2 py-1.5 font-mono text-[10.5px] text-white/62">{record.note}</td>
                                  <td className="px-2 py-1.5 text-[10.5px] text-white/62">
                                    {selected.block1.laws[record.exp] === record.exp ? <span className="text-[var(--mint)]">✓ {LAWS[record.exp].short}</span> : "pendiente"}
                                  </td>
                                  <td className="px-2 py-1.5 font-mono text-[10px] text-white/45">{formatShortTime(record.at)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="console-card p-4">
                      <p className="mb-3 font-display text-[13.5px] font-semibold">Puntaje por componente</p>
                      <div className="space-y-2.5">
                        {[
                          { label: "Bloque 1 · Simuladores", value: deriveScore(selected).block1, max: 30, color: "#8de6c8" },
                          { label: "Bloque 2 · Saber", value: deriveScore(selected).block2, max: 40, color: "#c8f257" },
                          { label: "Bloque 3 · Aplicación", value: deriveScore(selected).block3, max: 30, color: "#92d6e8" },
                          { label: "Penalizaciones", value: deriveScore(selected).penalties, max: 30, color: "#e9a63f", negative: true },
                        ].map((row) => (
                          <div key={row.label}>
                            <div className="mb-1 flex items-center justify-between text-[11px]">
                              <span className="text-white/68">{row.label}</span>
                              <span className="font-mono text-white/68">{row.negative ? "−" : ""}{row.value}{row.negative ? " pts" : ` / ${row.max}`}</span>
                            </div>
                            <div className="h-[4px] overflow-hidden rounded-full bg-white/[0.08]">
                              <div className="h-full rounded-full" style={{ width: `${Math.min(100, (row.value / row.max) * 100)}%`, background: row.color }} />
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 flex items-center justify-between border-t border-white/[0.08] pt-2.5">
                        <span className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-white/55">Total actual</span>
                        <span className="font-display text-[20.5px] font-semibold text-[var(--lime)]">{deriveScore(selected).total}<span className="text-[11.5px] font-normal text-white/55"> / 100</span></span>
                      </div>
                    </div>

                    <div className="console-card p-4">
                      <p className="mb-2 flex items-center gap-1.5 font-display text-[13.5px] font-semibold">
                        <Icon name="send" size={12} className="text-[var(--mint)]" /> Mensaje al estudiante
                      </p>
                      <div className="flex gap-1.5">
                        <input
                          className="input input-dark !py-1.5 !text-[12.5px]"
                          placeholder="Ej. Revisa la ley de Graham antes de responder…"
                          value={message}
                          onChange={(event) => setMessage(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" && message.trim()) {
                              sendTeacherMessage(selected.id, message.trim());
                              setMessage("");
                              refresh();
                              push("Mensaje enviado a la actividad del estudiante.", "success");
                            }
                          }}
                          maxLength={160}
                        />
                        <button
                          onClick={() => {
                            if (!message.trim()) return;
                            sendTeacherMessage(selected.id, message.trim());
                            setMessage("");
                            refresh();
                            push("Mensaje enviado a la actividad del estudiante.", "success");
                          }}
                          className="icon-button icon-button-dark !h-[30px] !w-[30px] shrink-0"
                          aria-label="Enviar mensaje"
                        >
                          <Icon name="send" size={13} />
                        </button>
                      </div>
                      <div className="mt-2.5">
                        <div className="mb-1 flex items-center justify-between">
                          <p className="text-[11px] font-medium text-white/62">Observación del docente</p>
                          <button
                            onClick={() => {
                              setTeacherNote(selected.id, noteDraft);
                              refresh();
                              push("Observación guardada en el informe.", "success");
                            }}
                            className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--lime)]/70 transition hover:text-[var(--lime)]"
                          >
                            guardar
                          </button>
                        </div>
                        <textarea
                          value={noteDraft}
                          onChange={(event) => setNoteDraft(event.target.value.slice(0, 400))}
                          className="textarea input-dark !min-h-[62px] !py-2 !text-[12px]"
                          placeholder="Nota cualitativa que aparecerá en el informe PDF…"
                        />
                      </div>
                    </div>

                    <div className="console-card p-4">
                      <p className="mb-2 flex items-center gap-1.5 font-display text-[13.5px] font-semibold">
                        <Icon name="refresh" size={12} className="text-[var(--amber)]" /> Actividad reciente
                      </p>
                      <div className="scroll-slim max-h-[130px] space-y-1.5 overflow-auto pr-1">
                        {selected.log.slice().reverse().slice(0, 8).map((entry) => (
                          <div key={entry.id} className="flex items-start gap-2">
                            <span className={`mt-1 h-1 w-1 shrink-0 rounded-full ${entry.type === "security" ? "bg-[var(--coral)]" : entry.type === "teacher" ? "bg-[var(--amber)]" : entry.type === "answer" ? "bg-[var(--lime)]" : "bg-[var(--mint)]"}`} />
                            <div className="min-w-0">
                              <p className="text-[11px] leading-snug text-white/62">{entry.text}</p>
                              <p className="font-mono text-[9.5px] text-white/45">{formatShortTime(entry.at)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {detailTab === "answers" && (
                <div className="grid gap-3 lg:grid-cols-[1.05fr_0.95fr]">
                  <div className="console-card p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="font-display text-[13.5px] font-semibold">Prueba Saber · 8 preguntas</p>
                      <span className="chip chip-dark !py-0.5 !text-[10.5px]">
                        {deriveScore(selected).correctAnswers}/8 correctas · {block2Complete(selected) ? "enviada" : "en curso"}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {QUIZ.map((question, index) => {
                        const answer = selected.block2.answers[question.id];
                        const correct = answer === question.correct;
                        return (
                          <div key={question.id} className={`rounded-lg border px-2.5 py-2 ${answer === undefined ? "border-white/[0.07] bg-white/[0.02]" : correct ? "border-[var(--mint)]/15 bg-[var(--mint)]/[0.045]" : "border-[var(--coral)]/18 bg-[var(--coral)]/[0.045]"}`}>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex min-w-0 items-start gap-2">
                                <span className="font-mono text-[10.5px] text-white/55">{String(index + 1).padStart(2, "0")}</span>
                                <p className="text-[11px] leading-snug text-white/74">{question.question}</p>
                              </div>
                              <div className="flex shrink-0 items-center gap-1">
                                {answer === undefined ? (
                                  <span className="font-mono text-[10px] uppercase text-white/45">sin responder</span>
                                ) : (
                                  <>
                                    <span className={`grid h-4 w-4 place-items-center rounded font-mono text-[10px] ${correct ? "bg-[var(--mint)]/20 text-[var(--mint)]" : "bg-[var(--coral)]/20 text-[#f0a294]"}`}>
                                      {String.fromCharCode(65 + answer)}
                                    </span>
                                    {!correct && <span className="font-mono text-[9.5px] text-white/55">clave {String.fromCharCode(65 + question.correct)}</span>}
                                  </>
                                )}
                              </div>
                            </div>
                            <p className="mt-1 font-mono text-[9.5px] uppercase tracking-[0.05em] text-white/45">{question.competency}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="console-card p-4">
                      <p className="mb-2.5 flex items-center justify-between font-display text-[13.5px] font-semibold">
                        Respuestas abiertas
                        <span className="font-mono text-[10.5px] font-normal text-white/55">
                          {OPEN_QUESTIONS.filter((question) => (selected.block3.answers[question.id] ?? "").trim()).length}/4
                        </span>
                      </p>
                      <div className="space-y-2">
                        {OPEN_QUESTIONS.map((question, index) => {
                          const answer = (selected.block3.answers[question.id] ?? "").trim();
                          const complete = answer.length >= question.minChars;
                          return (
                            <details key={question.id} className="group rounded-lg border border-white/[0.08] bg-white/[0.025] px-2.5 py-2" open={index === 0}>
                              <summary className="flex cursor-pointer list-none items-center justify-between gap-2">
                                <span className="flex items-center gap-1.5 text-[11.5px] font-medium text-white/74">
                                  <span className="font-mono text-[10px] text-white/55">0{index + 1}</span>
                                  {question.title}
                                </span>
                                <span className={`chip !py-0 !text-[10px] ${complete ? "!border-[var(--mint)]/25 !bg-[var(--mint)]/10 !text-[var(--mint)]" : "!border-white/10 !bg-white/[0.03] !text-white/55"}`}>
                                  {answer.length} car.
                                </span>
                              </summary>
                              <p className="mt-2 border-t border-white/[0.06] pt-2 text-[11px] leading-relaxed text-white/62">
                                {answer || "Sin respuesta registrada."}
                              </p>
                            </details>
                          );
                        })}
                      </div>
                    </div>
                    <div className="console-card p-4">
                      <p className="mb-1.5 font-display text-[13.5px] font-semibold">Conclusión del laboratorio</p>
                      <p className="rounded-lg border border-white/[0.07] bg-white/[0.025] px-2.5 py-2 text-[11px] leading-relaxed text-white/62">
                        {selected.block1.conclusion.trim() || "Sin conclusión registrada."}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-1">
                        {EXPERIMENTS.map((key) => (
                          <span key={key} className={`chip !py-0.5 !text-[10px] ${selected.block1.laws[key] === key ? "!border-[var(--mint)]/25 !bg-[var(--mint)]/10 !text-[var(--mint)]" : "!border-white/10 !bg-white/[0.03] !text-white/55"}`}>
                            {LAWS[key].short}: {selected.block1.laws[key] === key ? "✓" : "pendiente"}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {detailTab === "security" && (
                <div className="grid gap-3 lg:grid-cols-[1fr_0.9fr]">
                  <div className="console-card p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="font-display text-[13.5px] font-semibold">Alertas y penalizaciones</p>
                      <span className="chip chip-dark !py-0.5 !text-[10.5px] text-[var(--amber)]">−{deriveScore(selected).penalties} pts</span>
                    </div>
                    {selected.penalties.length === 0 ? (
                      <div className="flex items-center gap-2 rounded-lg border border-[var(--mint)]/15 bg-[var(--mint)]/[0.05] px-3 py-3">
                        <Icon name="check" size={13} className="text-[var(--mint)]" strokeWidth={2.4} />
                        <p className="text-[11.5px] text-white/68">Sin penalizaciones. Integridad de la sesión conservada.</p>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {selected.penalties.map((penalty) => (
                          <div key={penalty.id} className="flex items-start justify-between gap-3 rounded-lg border border-[var(--coral)]/18 bg-[var(--coral)]/[0.045] px-2.5 py-2">
                            <div>
                              <p className="text-[11.5px] font-medium text-[#f0b3a8]">{penalty.reason}</p>
                              <p className="mt-0.5 font-mono text-[10px] text-white/45">{formatShortTime(penalty.at)}</p>
                            </div>
                            <span className="rounded bg-[var(--coral)]/15 px-1.5 py-0.5 font-mono text-[10.5px] text-[#f3a393]">−{penalty.points}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <button onClick={() => setConfirmAction("penalties")} className="btn btn-lime mt-3 w-full !py-2 !text-[12.5px]">
                      <Icon name="shield" size={13} /> Eliminar penalizaciones y restablecer puntaje
                    </button>
                    <div className="mt-2 grid grid-cols-2 gap-1.5">
                      <button onClick={() => setConfirmAction("unlock")} className="btn btn-outline-light !py-2 !text-[12px]">
                        <Icon name="unlock" size={12} /> Desbloquear bloques
                      </button>
                      <button onClick={() => act((id) => extendTime(id, 5), "Tiempo ampliado en 5 minutos.")} className="btn btn-outline-light !py-2 !text-[12px]">
                        <Icon name="clock" size={12} /> +5 minutos
                      </button>
                    </div>
                    <p className="mt-2 text-[10.5px] leading-relaxed text-white/55">
                      Las acciones docentes se registran en la bitácora y actualizan el informe PDF del estudiante.
                    </p>
                  </div>

                  <div className="console-card p-4">
                    <p className="mb-2.5 flex items-center gap-1.5 font-display text-[13.5px] font-semibold">
                      <Icon name="activity" size={12} className="text-[var(--amber)]" /> Bitácora de la sesión
                    </p>
                    <div className="scroll-slim max-h-[330px] space-y-2 overflow-auto pr-1">
                      {selected.log.slice().reverse().map((entry) => (
                        <div key={entry.id} className="flex items-start gap-2">
                          <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${entry.type === "security" ? "bg-[var(--coral)]" : entry.type === "teacher" ? "bg-[var(--amber)]" : entry.type === "answer" ? "bg-[var(--lime)]" : "bg-[var(--mint)]"}`} />
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] leading-snug text-white/68">{entry.text}</p>
                            <p className="font-mono text-[9.5px] text-white/45">{formatDate(entry.at)}</p>
                          </div>
                          <span className="font-mono text-[9px] uppercase tracking-[0.06em] text-white/45">{entry.type}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-white/[0.08] pt-2.5">
                      <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-white/45">Última señal</p>
                      <p className="font-mono text-[10.5px] text-white/62">{formatShortTime(selected.updatedAt)}</p>
                    </div>
                  </div>
                </div>
              )}

              {detailTab === "sound" && (
                <SoundMeterPanel
                  session={selected}
                  threshold={threshold}
                  setThreshold={setThreshold}
                  history={soundHistory[selected.id] ?? []}
                  onToggle={() => toggleMeter(selected)}
                  onRetry={() => retryMeter(selected)}
                />
              )}
            </section>
          ) : (
            <div className="console-card flex min-h-[420px] flex-col items-center justify-center gap-3 p-8 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/[0.05] text-[var(--lime)]">
                <Icon name="users" size={22} />
              </span>
              <p className="font-display text-sm font-semibold">Aún no hay sesiones conectadas</p>
              <p className="max-w-sm text-[12.5px] leading-relaxed text-white/55">
                Abre la actividad en otra pestaña o dispositivo y comienza una sesión. Las sesiones de este navegador
                aparecerán aquí automáticamente.
              </p>
              <button onClick={onOpenStudent} className="btn btn-lime btn-sm">
                <Icon name="external" size={12} /> Abrir actividad del estudiante
              </button>
            </div>
          )}
        </div>

        <p className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.07] pt-3 font-mono text-[10px] uppercase tracking-[0.07em] text-white/45">
          <span>Monitor de aula · sincronización local entre pestañas del mismo origen</span>
          <span className="flex items-center gap-1.5"><Icon name="lock" size={9} /> los datos permanecen en este navegador</span>
        </p>
      </main>

      <Modal
        open={confirmAction !== null}
        onClose={() => setConfirmAction(null)}
        tone="dark"
        title={confirmAction === "penalties" ? "Eliminar penalizaciones" : "Desbloquear los tres bloques"}
        kicker="Acción docente"
        icon={confirmAction === "penalties" ? "shield" : "unlock"}
        footer={
          <>
            <button onClick={() => setConfirmAction(null)} className="btn btn-outline-light btn-sm">Cancelar</button>
            <button
              onClick={() => {
                if (confirmAction === "penalties") act((id) => clearPenalties(id), "Penalizaciones eliminadas. Puntaje restablecido.");
                if (confirmAction === "unlock") act((id) => unlockAll(id), "Bloques desbloqueados para el estudiante.");
                setConfirmAction(null);
              }}
              className="btn btn-lime btn-sm"
            >
              <Icon name="check" size={12} /> Confirmar
            </button>
          </>
        }
      >
        <p className="text-[13.5px] leading-relaxed text-white/68">
          {confirmAction === "penalties"
            ? `Se retirarán ${selected?.penalties.length ?? 0} penalización(es) de ${selected?.name}. El puntaje se recalculará de inmediato y la acción quedará en la bitácora.`
            : `Se habilitarán los bloques 1, 2 y 3 para ${selected?.name}, incluso si no ha cumplido los requisitos. La acción quedará registrada.`}
        </p>
      </Modal>

      <ToastViewport toasts={toasts} onClose={remove} />
    </div>
  );
}

/* ------------------------------- Sonómetro ------------------------------- */

function SoundMeterPanel({
  session,
  threshold,
  setThreshold,
  history,
  onToggle,
  onRetry,
}: {
  session: Session;
  threshold: number;
  setThreshold: (value: number) => void;
  history: number[];
  onToggle: () => void;
  onRetry: () => void;
}) {
  const status = session.sound.status;
  const active = session.sound.on;
  const db = session.sound.db;
  const simulated = status === "simulated" || session.isDemo;
  const statusText =
    !active
      ? "Sonómetro apagado"
      : status === "pending"
        ? "Esperando autorización del estudiante"
        : status === "denied"
          ? "Micrófono no autorizado"
          : status === "simulated"
            ? "Lectura simulada de demostración"
            : "Micrófono autorizado · nivel en vivo";
  const statusTone = !active
    ? "text-white/55"
    : status === "pending"
      ? "text-[var(--amber)]"
      : status === "denied"
        ? "text-[#f0a294]"
        : status === "simulated"
          ? "text-[var(--amber)]"
          : "text-[var(--mint)]";
  const bars = 32;

  return (
    <div className="grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="console-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3">
          <div className="flex items-center gap-2">
            <span className={`grid h-7 w-7 place-items-center rounded-lg ${active ? "bg-[var(--lime)]/12 text-[var(--lime)]" : "bg-white/[0.05] text-white/55"}`}>
              <Icon name={active ? "volume" : "micOff"} size={14} />
            </span>
            <div>
              <p className="font-display text-[13.5px] font-semibold">Sonómetro individual</p>
              <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-white/55">
                asignado a {session.name.split(" ")[0]} · {session.group}
              </p>
            </div>
          </div>
          <div className={`flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.08em] ${statusTone}`}>
            {active && status !== "pending" && status !== "denied" ? <LiveDot tone={simulated ? "warn" : "active"} /> : null}
            {statusText}
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <div className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-[#062d31] p-4">
            <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-[var(--lime)]/[0.07] blur-2xl" />
            <div className="relative flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-white/55">Nivel de presión sonora</p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className={`font-display text-[55px] font-semibold leading-none tracking-[-0.05em] ${db > threshold ? "text-[var(--coral)]" : active ? "text-[var(--lime)]" : "text-white/45"}`}>
                    {active ? db : "--"}
                  </span>
                  <span className="font-mono text-[15px] text-white/62">dB</span>
                </div>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.08em] text-white/45">aprox. ponderación A · no calibrado</p>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-right">
                <div>
                  <p className="font-mono text-[9.5px] uppercase tracking-[0.08em] text-white/45">Pico</p>
                  <p className="font-display text-[16px] font-semibold text-white/70">{active ? session.sound.peak : "--"} <span className="text-[9.5px] font-normal text-white/55">dB</span></p>
                </div>
                <div>
                  <p className="font-mono text-[9.5px] uppercase tracking-[0.08em] text-white/45">Umbral</p>
                  <p className="font-display text-[16px] font-semibold text-white/70">{threshold} <span className="text-[9.5px] font-normal text-white/55">dB</span></p>
                </div>
                <div>
                  <p className="font-mono text-[9.5px] uppercase tracking-[0.08em] text-white/45">Estado</p>
                  <p className={`text-[11.5px] font-medium ${statusTone}`}>{active ? "Escuchando" : "En pausa"}</p>
                </div>
                <div>
                  <p className="font-mono text-[9.5px] uppercase tracking-[0.08em] text-white/45">Modo</p>
                  <p className="text-[11.5px] font-medium text-white/68">{simulated ? "demo" : "real"}</p>
                </div>
              </div>
            </div>

            <div className="mt-4 flex h-11 items-end gap-[3px]">
              {Array.from({ length: bars }).map((_, index) => {
                const position = 30 + (index / bars) * 70;
                const filled = active && db >= position;
                const nearThreshold = position > threshold;
                return (
                  <span
                    key={index}
                    className="flex-1 rounded-sm transition-all duration-200"
                    style={{
                      height: `${Math.max(14, (index / bars) * 100)}%`,
                      background: filled ? (nearThreshold ? "var(--coral)" : "var(--lime)") : nearThreshold ? "rgba(217,92,72,.15)" : "rgba(255,255,255,.09)",
                      boxShadow: filled ? "0 0 8px rgba(200,242,87,.22)" : "none",
                    }}
                  />
                );
              })}
            </div>
            <div className="mt-1.5 flex justify-between font-mono text-[9px] text-white/45">
              <span>30 dB</span><span>50</span><span>70</span><span>90</span><span>100</span>
            </div>

            {active && db > threshold && (
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-[var(--coral)]/25 bg-[var(--coral)]/[0.09] px-2.5 py-2">
                <Icon name="alert" size={12} className="text-[#f0a294]" />
                <p className="text-[11px] text-[#f4b7ab]">Nivel alto detectado en la sesión de {session.name.split(" ")[0]} · supera el umbral acordado.</p>
              </div>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              <button onClick={onToggle} className={`btn !py-2 !text-[12.5px] ${active ? "btn-outline-light" : "btn-lime"}`}>
                <Icon name={active ? "micOff" : "mic"} size={13} /> {active ? "Detener sonómetro" : "Activar sonómetro"}
              </button>
              {status === "denied" && (
                <button onClick={onRetry} className="btn btn-outline-light !py-2 !text-[12.5px]">
                  <Icon name="refresh" size={12} /> Reintentar permiso
                </button>
              )}
            </div>
            <div className="flex items-center gap-1.5 rounded-lg border border-[var(--lime)]/18 bg-[var(--lime)]/[0.05] px-2.5 py-1.5">
              <Icon name="volume" size={11} className="text-[var(--lime)]" />
              <span className="font-mono text-[10.5px] text-[var(--lime)]/80">solo nivel · sin audio</span>
            </div>
          </div>

          {simulated && (
            <p className="mt-2 flex items-start gap-1.5 text-[10.5px] leading-relaxed text-[var(--amber)]/65">
              <Icon name="info" size={10} className="mt-0.5 shrink-0" />
              Esta es una sesión de demostración. Las lecturas se generan localmente para mostrar el funcionamiento del sonómetro; con un estudiante real se usará el micrófono autorizado de su equipo.
            </p>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div className="console-card p-4">
          <p className="mb-3 font-display text-[13.5px] font-semibold">Regulación y registro</p>
          <label className="mb-1.5 flex items-center justify-between text-[11.5px] text-white/68">
            Umbral de alerta
            <span className="font-mono text-[11.5px] text-[var(--lime)]">{threshold} dB</span>
          </label>
          <input
            type="range"
            min={40}
            max={90}
            step={1}
            value={threshold}
            onChange={(event) => setThreshold(Number(event.target.value))}
            className="lab-range"
            aria-label="Umbral de alerta del sonómetro"
            style={{ "--pct": `${((threshold - 40) / 50) * 100}%`, "--range-color": "#c8f257" } as CSSProperties}
          />
          <div className="mt-1 flex justify-between font-mono text-[9.5px] text-white/45"><span>40</span><span>65</span><span>90</span></div>
          <p className="mt-3 text-[11px] leading-relaxed text-white/55">
            El nivel se actualiza cada segundo mientras el estudiante mantiene la actividad abierta y autoriza el
            micrófono. No se transmite ni almacena audio.
          </p>
        </div>

        <div className="console-card p-4">
          <p className="mb-2.5 font-display text-[13.5px] font-semibold">Historial reciente</p>
          {history.length === 0 ? (
            <p className="rounded-lg border border-dashed border-white/10 px-3 py-5 text-center text-[11px] text-white/55">
              Sin lecturas todavía.
            </p>
          ) : (
            <div className="flex h-20 items-end gap-1">
              {history.slice(-32).map((value, index) => (
                <span
                  key={`${value}-${index}`}
                  className="flex-1 rounded-sm"
                  style={{
                    height: `${Math.max(8, ((value - 30) / 70) * 100)}%`,
                    background: value > threshold ? "var(--coral)" : "rgba(200,242,87,.55)",
                  }}
                  title={`${value} dB`}
                />
              ))}
            </div>
          )}
          <div className="mt-2 flex items-center justify-between border-t border-white/[0.08] pt-2 font-mono text-[9.5px] uppercase tracking-[0.08em] text-white/45">
            <span>muestras: {history.length}</span>
            <span>pico: {session.sound.peak || "--"} dB</span>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--amber)]/20 bg-[var(--amber)]/[0.055] p-3.5">
          <p className="flex items-center gap-1.5 text-[11.5px] font-semibold text-[var(--amber)]">
            <Icon name="shield" size={11} /> Consentimiento y privacidad
          </p>
          <p className="mt-1.5 text-[11px] leading-relaxed text-white/62">
            El sonómetro se activa de forma individual. Al estudiante se le avisa en pantalla y debe autorizar el
            micrófono; puede detenerlo en cualquier momento. Solo se comparte el valor en dB.
          </p>
        </div>

        <div className="console-card p-4">
          <p className="mb-2 flex items-center gap-1.5 font-display text-[13.5px] font-semibold">
            <Icon name="download" size={12} className="text-[var(--lime)]" /> Exportar
          </p>
          <button onClick={() => downloadStudentPdf(session)} className="btn btn-outline-light w-full !py-2 !text-[12px]">
            <Icon name="file" size={12} /> Informe individual PDF
          </button>
          <button
            onClick={() => {
              const blob = new Blob([sessionSnapshotForExport(session)], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = `sesion-${session.code}.json`;
              link.click();
              URL.revokeObjectURL(url);
            }}
            className="btn btn-outline-light mt-1.5 w-full !py-2 !text-[12px]"
          >
            <Icon name="clipboard" size={12} /> Respaldo de la sesión (JSON)
          </button>
        </div>
      </div>
    </div>
  );
}

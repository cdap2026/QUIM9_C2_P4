import { useEffect, useMemo, useRef, useState, type ClipboardEvent as ReactClipboardEvent, type MouseEvent as ReactMouseEvent } from "react";
import {
  ACTIVITY_MINUTES,
  DEMO_TEACHER_KEY,
  EXPERIMENTS,
  GROUP_OPTIONS,
  LAWS,
  OPEN_QUESTIONS,
  QUIZ,
  SECURITY_RULES,
} from "../../lib/data";
import {
  addPenalty,
  block1Requirements,
  clearPenalties,
  emptySession,
  extendTime,
  findSession,
  formatClock,
  formatDate,
  formatDuration,
  getCurrentStudentId,
  makeEvidence,
  onStoreChange,
  patchSession,
  publishSound,
  readMicCommand,
  remainingMs,
  setCurrentStudentId,
  setMicCommand,
  unlockAll,
  wordCount,
  writeSession,
} from "../../lib/storage";
import type { BlockId, LawKey, Session } from "../../lib/types";
import { Icon, type IconName } from "../icons";
import { GasLogo, Modal, ToastViewport, useToasts } from "../ui";
import { SimulationLab } from "./SimulationLab";
import { StudentReport } from "./StudentReport";

interface Props {
  onExit: () => void;
  onOpenTeacher: () => void;
}

const TAB_LABELS: { id: BlockId; short: string; title: string; icon: IconName; time: string }[] = [
  { id: 1, short: "Simula", title: "Simula y evidencia", icon: "flask", time: "18 min" },
  { id: 2, short: "Saber", title: "Prueba Saber", icon: "target", time: "15 min" },
  { id: 3, short: "Aplica", title: "Aplica en tu entorno", icon: "wind", time: "12 min" },
  { id: 4, short: "Informe", title: "Informe de laboratorio", icon: "file", time: "PDF" },
];

export function StudentActivity({ onExit, onOpenTeacher }: Props) {
  const { toasts, push, remove } = useToasts();
  const [session, setSession] = useState<Session | null>(() => {
    const current = getCurrentStudentId();
    return current ? findSession(current) ?? null : null;
  });
  const [activeTab, setActiveTab] = useState<BlockId>(() => {
    const current = getCurrentStudentId();
    const loaded = current ? findSession(current) : null;
    return loaded?.finishedAt ? 4 : loaded?.currentBlock ?? 1;
  });
  const [now, setNow] = useState(Date.now());
  const [name, setName] = useState("");
  const [group, setGroup] = useState(GROUP_OPTIONS[0]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [confirmSubmit, setConfirmSubmit] = useState<"quiz" | "final" | null>(null);
  const [securityOpen, setSecurityOpen] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const [controlOpen, setControlOpen] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [teacherVerified, setTeacherVerified] = useState(false);
  const [dismissedMessages, setDismissedMessages] = useState<string[]>([]);
  const [micRequestOn, setMicRequestOn] = useState(false);
  const [micBusy, setMicBusy] = useState(false);
  const [localDb, setLocalDb] = useState(0);
  const [peakDb, setPeakDb] = useState(0);

  const lastPenaltyRef = useRef(0);
  const lastFocusLogRef = useRef(0);
  const lastCommandRef = useRef(0);
  const meterActiveRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const meterTimerRef = useRef<number | null>(null);
  const peakRef = useRef(0);
  const sessionIdRef = useRef<string | null>(session?.id ?? null);

  sessionIdRef.current = session?.id ?? null;

  /* --------------------------------- Reloj --------------------------------- */

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  /* -------------------------- Sincronización remota ------------------------- */

  useEffect(() => {
    if (!session) return;
    const id = session.id;
    const sync = () => {
      const fresh = findSession(id);
      if (!fresh) return;
      setSession((current) => (current && fresh.updatedAt > current.updatedAt ? fresh : current));
    };
    const unsubscribe = onStoreChange(sync);
    const timer = window.setInterval(sync, 1600);
    return () => {
      unsubscribe();
      window.clearInterval(timer);
    };
  }, [session?.id]);

  /* --------------------------- Cambios de pestaña -------------------------- */

  useEffect(() => {
    if (!session) return;
    const handleVisibility = () => {
      if (document.hidden && !session.finishedAt) {
        if (Date.now() - lastFocusLogRef.current > 45000) {
          lastFocusLogRef.current = Date.now();
          const fresh = findSession(session.id);
          if (fresh) {
            patchSession(session.id, {
              log: [
                ...fresh.log,
                {
                  id: `log-focus-${Date.now()}`,
                  type: "info" as const,
                  text: "El estudiante salió de la pestaña de la actividad.",
                  at: Date.now(),
                },
              ].slice(-80),
            });
          }
        }
      } else if (!document.hidden) {
        if (Date.now() - lastFocusLogRef.current < 1500) {
          push("Registramos tu salida de la pestaña. Mantente en la actividad.", "warning");
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [session?.id, session?.finishedAt, push]);

  /* --------------------------------- Sonómetro ------------------------------ */

  function cleanupMeter(notifyOff: boolean) {
    if (meterTimerRef.current) {
      window.clearInterval(meterTimerRef.current);
      meterTimerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (audioCtxRef.current) {
      void audioCtxRef.current.close().catch(() => undefined);
      audioCtxRef.current = null;
    }
    const id = sessionIdRef.current;
    meterActiveRef.current = false;
    if (notifyOff && id) publishSound(id, { on: false, status: "off", db: 0 });
  }

  async function startMeter() {
    const id = sessionIdRef.current;
    if (!id || micBusy) return;
    setMicBusy(true);
    publishSound(id, { on: true, status: "pending" });
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("sin soporte");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      streamRef.current = stream;
      const AudioCtor =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtor) throw new Error("sin audio");
      const context = new AudioCtor();
      await context.resume().catch(() => undefined);
      audioCtxRef.current = context;
      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.65;
      source.connect(analyser);
      const data = new Uint8Array(analyser.fftSize);
      meterActiveRef.current = true;
      peakRef.current = 0;
      setSession((current) => {
        if (!current) return current;
        const fresh = findSession(current.id);
        return fresh ?? current;
      });
      peakRef.current = 0;
      setPeakDb(0);
      meterTimerRef.current = window.setInterval(() => {
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let index = 0; index < data.length; index += 1) {
          const value = (data[index] - 128) / 128;
          sum += value * value;
        }
        const rms = Math.sqrt(sum / data.length);
        const db = Math.max(28, Math.min(104, Math.round(20 * Math.log10(Math.max(rms, 0.00001)) + 100)));
        peakRef.current = Math.max(peakRef.current, db);
        setLocalDb(db);
        setPeakDb(peakRef.current);
        if (sessionIdRef.current) {
          publishSound(sessionIdRef.current, {
            on: true,
            status: "active",
            db,
            peak: peakRef.current,
          });
        }
      }, 900);
      publishSound(id, { on: true, status: "active", db: 0, peak: 0 });
      push("Micrófono autorizado. Solo se comparte el nivel en dB.", "success");
    } catch {
      publishSound(id, { on: false, status: "denied" });
      push("No se autorizó el micrófono. Puedes intentarlo desde el aviso del docente.", "warning");
    } finally {
      setMicBusy(false);
    }
  }

  function stopMeterFromStudent() {
    cleanupMeter(true);
    setMicRequestOn(false);
    setLocalDb(0);
    setPeakDb(0);
    if (sessionIdRef.current) setMicCommand(sessionIdRef.current, false);
    push("Sonómetro detenido por el estudiante.", "info");
  }

  useEffect(() => {
    const id = session?.id;
    if (!id) return;
    const check = () => {
      const command = readMicCommand(id);
      if (!command) return;
      if (command.at === lastCommandRef.current) return;
      lastCommandRef.current = command.at;
      setMicRequestOn(command.on);
      if (command.on) {
        if (!meterActiveRef.current && !micBusy) void startMeter();
      } else {
        cleanupMeter(true);
        setLocalDb(0);
        setPeakDb(0);
      }
    };
    check();
    const timer = window.setInterval(check, 1500);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id, micBusy]);

  useEffect(
    () => () => {
      cleanupMeter(false);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  /* -------------------------------- Derivados ------------------------------- */

  const remaining = session ? remainingMs(session, now) : ACTIVITY_MINUTES * 60000;
  const timeExpired = Boolean(session) && remaining <= 0 && !session?.finishedAt;
  const requirements = useMemo(() => (session ? block1Requirements(session) : null), [session]);
  const answeredCount = session ? QUIZ.filter((question) => session.block2.answers[question.id] !== undefined).length : 0;
  const openCompleteCount = session
    ? OPEN_QUESTIONS.filter((question) => (session.block3.answers[question.id] ?? "").trim().length >= question.minChars).length
    : 0;
  const canAccess = (tab: BlockId) => {
    if (!session) return false;
    if (tab === 4) return Boolean(session.finishedAt);
    if (session.teacherUnlocked) return true;
    return tab <= session.unlockedThrough;
  };
  const penalties = session?.penalties.reduce((sum, penalty) => sum + penalty.points, 0) ?? 0;
  const lastMessage = session?.messages.at(-1);

  /* --------------------------------- Sesión -------------------------------- */

  function update(patch: Partial<Session>) {
    if (!session) return;
    const updated = patchSession(session.id, patch);
    if (updated) setSession(updated);
  }

  function startSession(overrideName?: string) {
    const studentName = (overrideName ?? name).trim();
    if (studentName.length < 3) {
      push("Escribe tu nombre completo para registrar la sesión.", "error");
      return;
    }
    const created = emptySession(studentName, group);
    writeSession(created);
    setCurrentStudentId(created.id);
    setSession(created);
    setActiveTab(1);
    push("Sesión iniciada. Tienes 45 minutos de laboratorio.", "success");
  }

  function handleTab(tab: BlockId) {
    if (!session) return;
    if (tab === activeTab) return;
    if (!canAccess(tab)) {
      const updated = addPenalty(session.id, `Intento de navegar al bloque ${tab} sin desbloquearlo`, 5);
      if (updated) setSession(updated);
      push(
        tab === 4
          ? "El informe se habilita al finalizar los tres bloques."
          : "Ese bloque aún está bloqueado. Completa los requisitos del bloque actual.",
        "error"
      );
      return;
    }
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (tab < 4) update({ currentBlock: tab });
  }

  function penalize(reason: string) {
    if (!session || session.finishedAt) return;
    if (Date.now() - lastPenaltyRef.current < 12000) return;
    lastPenaltyRef.current = Date.now();
    const updated = addPenalty(session.id, reason, 10);
    if (updated) setSession(updated);
  }

  function blockedClipboard(event: ReactClipboardEvent | ReactMouseEvent) {
    if (!session?.finishedAt) {
      event.preventDefault();
      penalize("Intento de usar el portapapeles o el menú contextual durante la actividad");
      push("El portapapeles está bloqueado. Quedó registrado para el docente.", "error");
    }
  }

  function handleAddRecord(exp: LawKey, p: number, v: number, t: number, note: string): boolean {
    if (!session || session.finishedAt) return false;
    const sameExperiment = session.block1.records.filter((record) => record.exp === exp);
    if (sameExperiment.length >= 4) {
      push("Ya registraste 4 mediciones de este experimento. Explora otro montaje.", "warning");
      return false;
    }
    if (sameExperiment.at(-1)?.note === note) return false;
    const nextBlock1 = {
      ...session.block1,
      records: [...session.block1.records, makeEvidence(exp, p, v, t, note)],
    };
    const nextRequirements = block1Requirements({ ...session, block1: nextBlock1 });
    const patch: Partial<Session> = { block1: nextBlock1 };
    if (nextRequirements.complete && session.unlockedThrough < 2 && !session.teacherUnlocked) {
      patch.unlockedThrough = 2;
      patch.log = [
        ...session.log,
        { id: `log-b1-${Date.now()}`, type: "answer" as const, text: "Bloque 1 completado: 8 registros y 4 leyes identificadas.", at: Date.now() },
      ].slice(-80);
    }
    update(patch);
    if (nextRequirements.complete) push("¡Bloque 1 completo! El segundo bloque está desbloqueado.", "success");
    return true;
  }

  function handleLaw(exp: LawKey, law: LawKey) {
    if (!session || session.finishedAt) return;
    const nextBlock1 = { ...session.block1, laws: { ...session.block1.laws, [exp]: law } };
    const nextRequirements = block1Requirements({ ...session, block1: nextBlock1 });
    const patch: Partial<Session> = { block1: nextBlock1 };
    if (nextRequirements.complete && session.unlockedThrough < 2 && !session.teacherUnlocked) {
      patch.unlockedThrough = 2;
      patch.log = [
        ...session.log,
        { id: `log-b1-${Date.now()}`, type: "answer" as const, text: "Bloque 1 completado: 8 registros y 4 leyes identificadas.", at: Date.now() },
      ].slice(-80);
    }
    update(patch);
    if (nextRequirements.complete) push("¡Bloque 1 completo! Ya puedes avanzar al bloque Saber.", "success");
  }

  function handleAdvanceBlock1() {
    if (!session) return;
    if (!requirements?.complete && !session.teacherUnlocked) {
      push("Completa los 8 registros y acierta las 4 leyes para desbloquear el bloque 2.", "warning");
      return;
    }
    if (session.unlockedThrough < 2 && !session.teacherUnlocked) update({ unlockedThrough: 2 });
    setActiveTab(2);
    update({ currentBlock: 2 });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleAnswer(questionId: string, option: number) {
    if (!session || session.block2.submitted) return;
    update({ block2: { ...session.block2, answers: { ...session.block2.answers, [questionId]: option } } });
  }

  function handleSubmitQuiz() {
    if (!session) return;
    if (answeredCount < QUIZ.length && !timeExpired) {
      push(`Aún faltan ${QUIZ.length - answeredCount} preguntas por responder.`, "warning");
      return;
    }
    const updated = patchSession(session.id, {
      block2: { ...session.block2, submitted: true, submittedAt: Date.now() },
      currentBlock: 3,
      unlockedThrough: session.teacherUnlocked ? session.unlockedThrough : Math.max(3, session.unlockedThrough) as BlockId,
      log: [
        ...session.log,
        {
          id: `log-b2-${Date.now()}`,
          type: "answer" as const,
          text: `Prueba Saber enviada · ${answeredCount} de ${QUIZ.length} preguntas respondidas.`,
          at: Date.now(),
        },
      ].slice(-80),
    });
    if (updated) setSession(updated);
    setConfirmSubmit(null);
    push("Respuestas de la Prueba Saber registradas.", "success");
    setActiveTab(3);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleOpenAnswer(questionId: string, value: string) {
    if (!session || session.block3.submitted || session.finishedAt) return;
    update({ block3: { ...session.block3, answers: { ...session.block3.answers, [questionId]: value } } });
  }

  function finishSession() {
    if (!session) return;
    const updated = patchSession(session.id, {
      block2: { ...session.block2, submitted: true, submittedAt: session.block2.submittedAt ?? Date.now() },
      block3: { ...session.block3, submitted: true, submittedAt: Date.now() },
      finishedAt: Date.now(),
      currentBlock: 3,
      log: [
        ...session.log,
        {
          id: `log-fin-${Date.now()}`,
          type: "answer" as const,
          text: "Actividad finalizada. Informe generado y disponible para el docente.",
          at: Date.now(),
        },
      ].slice(-80),
    });
    if (updated) setSession(updated);
    setConfirmSubmit(null);
    setActiveTab(4);
    push("¡Actividad finalizada! Tu informe está listo para descargar.", "success");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function requestFinish() {
    if (!session) return;
    if (!session.block2.submitted && !timeExpired) {
      push("Primero envía la Prueba Saber del bloque 2.", "warning");
      return;
    }
    if (openCompleteCount < OPEN_QUESTIONS.length && !timeExpired) {
      push("Completa las cuatro preguntas abiertas para generar tu informe.", "warning");
      return;
    }
    setConfirmSubmit("final");
  }

  function handleControlAction(action: "penalties" | "unlock" | "time" | "finish") {
    if (!session) return;
    let updated: Session | undefined;
    if (action === "penalties") updated = clearPenalties(session.id);
    if (action === "unlock") updated = unlockAll(session.id);
    if (action === "time") updated = extendTime(session.id, 5);
    if (action === "finish") {
      updated = patchSession(session.id, {
        finishedAt: Date.now(),
        block2: { ...session.block2, submitted: true, submittedAt: session.block2.submittedAt ?? Date.now() },
        block3: { ...session.block3, submitted: true, submittedAt: Date.now() },
        log: [
          ...session.log,
          { id: `log-tf-${Date.now()}`, type: "teacher" as const, text: "El docente finalizó la sesión y habilitó el informe.", at: Date.now() },
        ].slice(-80),
      });
    }
    if (updated) setSession(updated);
    if (action === "penalties") push("Penalizaciones eliminadas. El puntaje fue restablecido.", "success");
    if (action === "unlock") push("Los tres bloques quedaron desbloqueados.", "success");
    if (action === "time") push("Se amplió el tiempo en 5 minutos.", "success");
    if (action === "finish") {
      setActiveTab(4);
      setControlOpen(false);
      push("Sesión finalizada por control docente.", "info");
    }
  }

  function changeStudent() {
    if (session) setMicCommand(session.id, false);
    cleanupMeter(true);
    setMicRequestOn(false);
    setCurrentStudentId(null);
    setSession(null);
    setActiveTab(1);
    setExitOpen(false);
    setKeyInput("");
    setTeacherVerified(false);
    setName("");
  }

  /* --------------------------------- Render -------------------------------- */

  const toastsNode = <ToastViewport toasts={toasts} onClose={remove} />;

  if (!session) {
    return (
      <div className="dark-grid noise-soft min-h-screen text-white">
        <header className="border-b border-white/[0.08]">
          <div className="mx-auto flex h-[64px] max-w-[1120px] items-center justify-between px-4 sm:px-6">
            <GasLogo />
            <div className="flex items-center gap-2">
              <button onClick={onOpenTeacher} className="btn btn-outline-light btn-sm">
                <Icon name="activity" size={13} /> <span className="hidden sm:inline">Consola docente</span>
              </button>
              <button onClick={onExit} className="icon-button icon-button-dark" aria-label="Volver al portal">
                <Icon name="home" size={15} />
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto grid min-h-[calc(100vh-64px)] max-w-[1120px] items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:gap-14">
          <div>
            <span className="chip chip-dark !text-[var(--lime)]">
              <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-[var(--lime)] text-[var(--lime)]" />
              Estación del estudiante
            </span>
            <h1 className="hero-title mt-4 text-[41.5px] sm:text-[53px]">
              45 minutos para ver la materia{" "}
              <span className="font-serif italic font-normal text-[var(--lime)]">de otra manera.</span>
            </h1>
            <p className="lede-dark mt-4 max-w-[470px] text-[15px]">
              Vas a manipular variables reales en simuladores, resolver una prueba tipo Saber y explicar cómo estas
              leyes aparecen en tu casa, tu colegio y tu entorno.
            </p>
            <div className="mt-7 grid gap-2.5 sm:grid-cols-3">
              {[
                { icon: "flask" as IconName, title: "Explora", text: "4 simuladores" },
                { icon: "target" as IconName, title: "Demuestra", text: "8 preguntas Saber" },
                { icon: "wind" as IconName, title: "Aplica", text: "4 retos abiertos" },
              ].map((item, index) => (
                <div key={item.title} className="glass rounded-xl p-3">
                  <div className="flex items-center justify-between">
                    <Icon name={item.icon} size={16} className="text-[var(--lime)]" />
                    <span className="font-mono text-[10.5px] text-white/45">0{index + 1}</span>
                  </div>
                  <p className="mt-2.5 text-[13px] font-semibold text-white/86">{item.title}</p>
                  <p className="text-[11.5px] text-white/55">{item.text}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 space-y-2">
              {SECURITY_RULES.slice(0, 3).map((rule, index) => (
                <div key={rule.title} className="flex items-center gap-2.5 text-[12.5px] text-white/62">
                  <span className="grid h-5 w-5 place-items-center rounded bg-white/[0.055] text-[var(--mint)]">
                    <Icon name={(["lock", "copy", "refresh"] as IconName[])[index]} size={10} />
                  </span>
                  <span><strong className="font-medium text-white/74">{rule.title}:</strong> {rule.text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-3 rounded-[30px] bg-[var(--lime)]/[0.035] blur-xl" />
            <div className="relative rounded-[24px] border border-white/[0.09] bg-[#f7f4e9] p-5 text-[var(--ink)] shadow-[0_45px_80px_-35px_rgba(0,0,0,0.65)] sm:p-6">
              <div className="mb-5 flex items-start justify-between">
                <div>
                  <p className="eyebrow mb-1">Registro de laboratorio</p>
                  <h2 className="font-display text-[24.5px] font-semibold tracking-[-0.04em]">Entra al laboratorio.</h2>
                </div>
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--ink)] text-[var(--lime)]">
                  <Icon name="flask" size={19} />
                </span>
              </div>

              <form
                className="space-y-3.5"
                onSubmit={(event) => {
                  event.preventDefault();
                  startSession();
                }}
              >
                <div>
                  <label className="field-label" htmlFor="student-name">Nombre completo del estudiante</label>
                  <div className="relative">
                    <Icon name="user" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink)]/48" />
                    <input
                      id="student-name"
                      className="input !pl-9"
                      placeholder="Ej. Valeria Gómez"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      autoComplete="name"
                      maxLength={48}
                    />
                  </div>
                </div>
                <div>
                  <label className="field-label" htmlFor="student-group">Grupo / curso</label>
                  <select id="student-group" className="select" value={group} onChange={(event) => setGroup(event.target.value)}>
                    {GROUP_OPTIONS.map((option) => (
                      <option key={option} value={option}>{option} · Ciencias Naturales</option>
                    ))}
                  </select>
                </div>

                <div className="rounded-xl border border-[var(--teal)]/15 bg-[var(--mist)] p-3">
                  <div className="flex items-start gap-2">
                    <Icon name="clock" size={14} className="mt-0.5 shrink-0 text-[var(--teal)]" />
                    <p className="text-[12.5px] leading-relaxed text-[var(--ink)]/68">
                      El reloj de <strong className="font-semibold">45 minutos</strong> comienza al ingresar. El avance
                      se guarda automáticamente en este dispositivo.
                    </p>
                  </div>
                </div>

                <button type="submit" className="btn btn-ink w-full !py-3">
                  Comenzar la sesión
                  <Icon name="arrowRight" size={15} />
                </button>
              </form>

              <div className="my-4 flex items-center gap-3">
                <span className="h-px flex-1 bg-[var(--line)]" />
                <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-[var(--ink)]/55">o explora primero</span>
                <span className="h-px flex-1 bg-[var(--line)]" />
              </div>
              <button onClick={() => startSession("Estudiante invitado")} className="btn btn-outline w-full">
                <Icon name="play" size={13} /> Entrar en modo demostración
              </button>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--line)] pt-3">
                <button onClick={onOpenTeacher} className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--ink)]/62 transition hover:text-[var(--teal)]">
                  <Icon name="activity" size={11} /> Consola de monitoreo
                </button>
                <span className="inline-flex items-center gap-1 font-mono text-[10.5px] text-[var(--ink)]/48">
                  <Icon name="shield" size={10} /> sesión protegida
                </span>
              </div>
            </div>
          </div>
        </main>
        {toastsNode}
      </div>
    );
  }

  const criticalTime = remaining <= 5 * 60 * 1000;

  return (
    <div className="min-h-screen bg-[var(--paper)]">
      <header className="sticky top-0 z-40 bg-[var(--ink)] text-white shadow-[0_10px_30px_-20px_rgba(0,0,0,0.6)]">
        <div className="mx-auto max-w-[1240px] px-3 sm:px-6">
          <div className="flex h-[58px] items-center gap-3">
            <GasLogo compact />
            <span className="hidden h-5 w-px bg-white/12 sm:block" />
            <div className="hidden min-w-0 sm:block">
              <p className="font-display text-[13.5px] font-semibold leading-none">Leyes de los gases</p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-white/55">Grado 9° · 45 minutos</p>
            </div>

            <div className="ml-auto flex min-w-0 items-center gap-1 sm:gap-2">
              <span className="hidden lg:block">
                <button onClick={() => setSecurityOpen(true)} className="security-chip !py-1.5">
                  <Icon name="lock" size={11} /> pestañas bloqueadas
                </button>
              </span>
              <span className="hidden xl:block">
                <button onClick={() => setSecurityOpen(true)} className="security-chip !py-1.5">
                  <Icon name="copy" size={11} /> portapapeles off
                </button>
              </span>
              {penalties > 0 && (
                <button onClick={() => setSecurityOpen(true)} className="chip chip-amber !px-1.5 !py-1.5 !text-[10px] sm:!px-2 sm:!text-[11.5px]">
                  <Icon name="shield" size={10} /> −{penalties}
                  <span className="hidden sm:inline"> pts</span>
                </button>
              )}
              <div
                className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 font-mono text-[13px] font-medium ${
                  criticalTime
                    ? "border-[var(--coral)]/40 bg-[var(--coral)]/15 text-[#ffb6a5]"
                    : "border-white/12 bg-white/[0.055] text-[var(--lime)]"
                }`}
                title="Tiempo restante"
              >
                <Icon name="clock" size={12} />
                {session.finishedAt ? "FIN" : formatClock(remaining)}
              </div>
              <div className="hidden items-center gap-2 rounded-lg border border-white/10 bg-white/[0.045] py-1 pl-1 pr-2.5 md:flex">
                <span className="grid h-6 w-6 place-items-center rounded bg-[var(--lime)]/12 font-display text-[10.5px] font-bold text-[var(--lime)]">
                  {session.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}
                </span>
                <div className="max-w-[110px]">
                  <p className="truncate text-[12px] font-medium leading-none text-white/85">{session.name}</p>
                  <p className="mt-0.5 font-mono text-[9.5px] uppercase tracking-[0.08em] text-white/55">{session.group} · {session.code}</p>
                </div>
              </div>
              <button
                onClick={() => setControlOpen(true)}
                className="btn btn-outline-light !px-2.5 !py-1.5 !text-[12px]"
                title="Control docente"
              >
                <Icon name="key" size={12} />
                <span className="hidden sm:inline">Control docente</span>
              </button>
              <button onClick={() => setExitOpen(true)} className="icon-button icon-button-dark !h-[30px] !w-[30px] shrink-0" aria-label="Salir">
                <Icon name="logout" size={14} />
              </button>
            </div>
          </div>

          <div className="scroll-slim flex gap-1 overflow-x-auto pb-2">
            {TAB_LABELS.map((tab) => {
              const locked = !canAccess(tab.id);
              const complete =
                tab.id === 1
                  ? requirements?.complete
                  : tab.id === 2
                    ? session.block2.submitted
                    : tab.id === 3
                      ? Boolean(session.finishedAt) || openCompleteCount === 4
                      : false;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTab(tab.id)}
                  className={`flex min-w-0 flex-1 items-center gap-1.5 rounded-lg border px-1.5 py-1.5 text-left transition sm:gap-2 sm:px-2.5 ${
                    activeTab === tab.id
                      ? "border-white/14 bg-white/[0.09] text-white"
                      : locked
                        ? "border-transparent text-white/45"
                        : "border-transparent text-white/68 hover:bg-white/[0.055] hover:text-white/85"
                  }`}
                >
                  <span
                    className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border sm:h-6 sm:w-6 ${
                      activeTab === tab.id
                        ? "border-[var(--lime)]/30 bg-[var(--lime)]/15 text-[var(--lime)]"
                        : "border-white/10 bg-white/[0.04] text-white/55"
                    }`}
                  >
                    <Icon name={locked ? "lock" : complete ? "check" : tab.icon} size={11} strokeWidth={complete ? 2.5 : 1.7} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[12.5px] font-semibold sm:text-[12.5px]">{tab.short}</span>
                    <span className="mt-0.5 hidden font-mono text-[9.5px] uppercase tracking-[0.08em] opacity-45 sm:block">
                      {tab.id === 4 && session.finishedAt ? "disponible" : tab.time}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <div className="border-b border-[var(--line)] bg-[var(--card-soft)]">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-2 px-4 py-1.5 sm:px-6">
          <p className="flex items-center gap-1.5 text-[11px] text-[var(--ink)]/55">
            <Icon name="shield" size={10} className="text-[var(--teal)]" />
            Sesión {session.code} · {session.finishedAt ? "finalizada" : "en curso"} · autoguardado activo
          </p>
          <p className="flex items-center gap-1.5 text-[11px] text-[var(--ink)]/55">
            <Icon name="clock" size={10} />
            Inicio {formatDate(session.startedAt)} · {formatDuration((session.finishedAt ?? now) - session.startedAt)} transcurridos
          </p>
        </div>
      </div>

      <main
        className="mx-auto max-w-[1240px] px-3 py-4 sm:px-6 sm:py-5"
        onCopy={blockedClipboard}
        onCut={blockedClipboard}
        onPaste={blockedClipboard}
        onContextMenu={blockedClipboard}
      >
        {lastMessage && !dismissedMessages.includes(lastMessage.id) && (
          <div className="mb-3 flex items-start gap-2.5 rounded-xl border border-[var(--amber)]/30 bg-[#f4e8d0] px-3.5 py-2.5">
            <Icon name="send" size={14} className="mt-0.5 shrink-0 text-[#a06f19]" />
            <div className="min-w-0 flex-1">
              <p className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-[#8d621a]">Mensaje del docente</p>
              <p className="mt-0.5 text-[13px] leading-relaxed text-[var(--ink)]/74">{lastMessage.text}</p>
            </div>
            <button onClick={() => setDismissedMessages((current) => [...current, lastMessage.id])} className="icon-button !h-6 !w-6">
              <Icon name="x" size={11} />
            </button>
          </div>
        )}

        {micRequestOn && !session.finishedAt && (
          <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-[var(--teal)]/25 bg-[var(--mist)] px-3.5 py-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--teal)] text-white">
              <Icon name="volume" size={15} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] font-semibold text-[var(--ink)]">El docente activó el sonómetro de esta sesión</p>
              <p className="mt-0.5 text-[11.5px] text-[var(--ink)]/68">
                Solo se comparte el nivel de sonido en dB. El audio no se graba ni se transmite.
              </p>
            </div>
            {session.sound.status === "active" ? (
              <div className="flex items-center gap-2">
                <div className="flex h-6 items-end gap-[2px]">
                  {Array.from({ length: 12 }).map((_, index) => (
                    <span
                      key={index}
                      className="w-[3px] rounded-sm transition-all"
                      style={{
                        height: `${5 + (index / 12) * 19}px`,
                        background: localDb > 30 + index * 4 ? "var(--teal)" : "rgba(15,118,110,.16)",
                      }}
                    />
                  ))}
                </div>
                <span className="font-mono text-[13px] font-medium text-[var(--teal)]">{localDb} dB <span className="text-[10.5px] font-normal opacity-50">pico {peakDb}</span></span>
                <button onClick={stopMeterFromStudent} className="btn btn-outline btn-sm">Detener</button>
              </div>
            ) : session.sound.status === "denied" ? (
              <div className="flex items-center gap-2">
                <span className="chip chip-amber">permiso pendiente</span>
                <button onClick={() => void startMeter()} disabled={micBusy} className="btn btn-ink btn-sm">
                  {micBusy ? <span className="spinner" /> : <Icon name="mic" size={12} />} Autorizar
                </button>
              </div>
            ) : (
              <button onClick={() => void startMeter()} disabled={micBusy} className="btn btn-ink btn-sm">
                {micBusy ? <span className="spinner" /> : <Icon name="mic" size={12} />} Autorizar micrófono
              </button>
            )}
          </div>
        )}

        {!session.finishedAt && (criticalTime || timeExpired) && (
          <div className={`mb-3 flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 ${timeExpired ? "border-[var(--coral)]/30 bg-[#f6e4dd]" : "border-[var(--amber)]/30 bg-[#f4e8d0]"}`}>
            <Icon name="alert" size={14} className={`mt-0.5 shrink-0 ${timeExpired ? "text-[var(--coral)]" : "text-[#a06f19]"}`} />
            <p className="text-[12.5px] leading-relaxed text-[var(--ink)]/74">
              {timeExpired
                ? "Tiempo cumplido. Aún puedes finalizar y descargar tu informe con el avance registrado."
                : `Quedan ${formatClock(remaining)} minutos. Prioriza cerrar tus respuestas y generar el informe.`}
            </p>
          </div>
        )}

        {activeTab === 1 && (
          <div className="space-y-4">
            <section className="relative overflow-hidden rounded-[20px] border border-[var(--line)] bg-[var(--white)] p-4 sm:p-5">
              <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[var(--teal)]/[0.045] blur-2xl" />
              <div className="relative flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="chip chip-teal">Bloque 01</span>
                    <span className="chip"><Icon name="clock" size={10} /> 18 min sugeridos</span>
                    <span className="chip chip-lime"><Icon name="flask" size={10} /> 4 simuladores</span>
                  </div>
                  <h1 className="font-display text-[25.5px] font-semibold leading-[1.08] tracking-[-0.04em] sm:text-[30.5px]">
                    Simula y evidencia
                  </h1>
                  <p className="mt-1.5 max-w-[600px] text-[13px] leading-relaxed text-[var(--ink)]/68">
                    Ajusta cada variable, registra al menos dos pares de datos por montaje e identifica qué ley explica
                    el comportamiento. Busca la relación entre las magnitudes, no la memoria.
                  </p>
                </div>
                <div className="grid shrink-0 grid-cols-2 gap-2">
                  <div className="rounded-xl border border-[var(--line)] bg-[var(--card-soft)] px-3 py-2">
                    <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[var(--ink)]/55">Registros</p>
                    <p className="mt-1 font-display text-[19.5px] font-semibold leading-none">
                      {session.block1.records.length}<span className="text-[12.5px] font-normal text-[var(--ink)]/55"> / 8</span>
                    </p>
                  </div>
                  <div className="rounded-xl border border-[var(--line)] bg-[var(--card-soft)] px-3 py-2">
                    <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[var(--ink)]/55">Leyes</p>
                    <p className="mt-1 font-display text-[19.5px] font-semibold leading-none">
                      {EXPERIMENTS.filter((key) => session.block1.laws[key] === key).length}<span className="text-[12.5px] font-normal text-[var(--ink)]/55"> / 4</span>
                    </p>
                  </div>
                </div>
              </div>
              <div className="relative mt-4 flex flex-wrap gap-1.5 border-t border-[var(--line)] pt-3">
                {EXPERIMENTS.map((key) => {
                  const info = requirements?.perExperiment[key];
                  const ok = (info?.count ?? 0) >= 2 && info?.correct;
                  return (
                    <span key={key} className={`chip ${ok ? "chip-lime" : ""}`}>
                      <Icon name={ok ? "check" : LAWS[key].icon} size={10} />
                      {LAWS[key].short} · {info?.count ?? 0}/2
                      {info?.correct ? " · ley ✓" : ""}
                    </span>
                  );
                })}
              </div>
            </section>

            <SimulationLab
              records={session.block1.records}
              laws={session.block1.laws}
              onAddRecord={handleAddRecord}
              onLaw={handleLaw}
              pushToast={push}
              disabled={Boolean(session.finishedAt)}
            />

            <div className="grid gap-3 lg:grid-cols-[1fr_330px]">
              <div className="paper-card p-4">
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-[13px] font-semibold" htmlFor="conclusion">Conclusión del laboratorio <span className="font-normal text-[var(--ink)]/55">(opcional)</span></label>
                  <span className="font-mono text-[11px] text-[var(--ink)]/55">{wordCount(session.block1.conclusion)} palabras</span>
                </div>
                <textarea
                  id="conclusion"
                  className="textarea !min-h-[86px]"
                  placeholder="Con tus palabras: ¿qué relación encontraste entre presión, volumen y temperatura? ¿Qué evidencia lo sustenta?"
                  value={session.block1.conclusion}
                  onChange={(event) => update({ block1: { ...session.block1, conclusion: event.target.value.slice(0, 700) } })}
                  disabled={Boolean(session.finishedAt)}
                />
              </div>
              <div className="paper-card flex flex-col justify-between p-4">
                <div>
                  <p className="eyebrow mb-2">Requisitos para avanzar</p>
                  <div className="space-y-1.5">
                    <RequirementRow ok={Boolean(requirements?.recordsOk)} text="8 mediciones (2 por simulador)" />
                    <RequirementRow ok={Boolean(requirements?.lawsOk)} text="4 leyes identificadas correctamente" />
                  </div>
                  {session.teacherUnlocked && (
                    <p className="mt-2 flex items-center gap-1.5 text-[11.5px] font-medium text-[var(--amber)]">
                      <Icon name="unlock" size={10} /> Bloqueo retirado por el docente
                    </p>
                  )}
                </div>
                <button onClick={handleAdvanceBlock1} className={`btn mt-3 w-full ${requirements?.complete || session.teacherUnlocked ? "btn-ink" : "btn-outline"}`}>
                  {requirements?.complete || session.teacherUnlocked ? "Avanzar al bloque 2" : "Completar requisitos"}
                  <Icon name="arrowRight" size={14} />
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 2 && (
          <div className="space-y-4">
            <section className="relative overflow-hidden rounded-[20px] border border-[var(--line)] bg-[var(--white)] p-4 sm:p-5">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="chip chip-amber">Bloque 02</span>
                    <span className="chip"><Icon name="clock" size={10} /> 15 min sugeridos</span>
                    <span className="chip chip-teal"><Icon name="target" size={10} /> 8 preguntas · 40 pts</span>
                  </div>
                  <h1 className="font-display text-[25.5px] font-semibold leading-[1.08] tracking-[-0.04em] sm:text-[30.5px]">
                    Prueba tipo Saber
                  </h1>
                  <p className="mt-1.5 max-w-[610px] text-[13px] leading-relaxed text-[var(--ink)]/68">
                    Selecciona una respuesta por pregunta. Puedes navegar y cambiar tus elecciones antes de enviar.
                    La retroalimentación se mostrará en el informe final.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="font-mono text-[17.5px] font-medium leading-none">{answeredCount}<span className="text-[11.5px] text-[var(--ink)]/55"> / {QUIZ.length}</span></p>
                    <p className="mt-1 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[var(--ink)]/55">respondidas</p>
                  </div>
                  <div className="relative grid h-11 w-11 place-items-center rounded-full border border-[var(--line)] bg-[var(--card-soft)]">
                    <svg className="absolute inset-0 -rotate-90" viewBox="0 0 44 44">
                      <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(10,43,47,.08)" strokeWidth="3.5" />
                      <circle
                        cx="22"
                        cy="22"
                        r="18"
                        fill="none"
                        stroke="var(--teal)"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 18}
                        strokeDashoffset={2 * Math.PI * 18 * (1 - answeredCount / QUIZ.length)}
                      />
                    </svg>
                    <span className="font-mono text-[11px] font-medium">{Math.round((answeredCount / QUIZ.length) * 100)}%</span>
                  </div>
                </div>
              </div>
              {session.block2.submitted && (
                <div className="mt-3 flex items-center gap-2 rounded-lg border border-[var(--teal)]/18 bg-[var(--mist)] px-3 py-2">
                  <Icon name="check" size={13} className="text-[var(--teal)]" strokeWidth={2.3} />
                  <p className="text-[12.5px] text-[var(--ink)]/74">Respuestas enviadas el {formatDate(session.block2.submittedAt ?? Date.now())}. Las respuestas quedaron bloqueadas.</p>
                </div>
              )}
            </section>

            <div className="grid gap-3 lg:grid-cols-[1fr_280px]">
              <div className="paper-card overflow-hidden">
                <div className="flex items-center justify-between border-b border-[var(--line)] bg-[var(--card-soft)] px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="grid h-6 w-6 place-items-center rounded-md bg-[var(--ink)] font-mono text-[11.5px] font-semibold text-[var(--lime)]">
                      {String(questionIndex + 1).padStart(2, "0")}
                    </span>
                    <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--ink)]/62">
                      {QUIZ[questionIndex].competency}
                    </p>
                  </div>
                  <span className="font-mono text-[11px] text-[var(--ink)]/55">{questionIndex + 1} / {QUIZ.length}</span>
                </div>
                <div className="p-4 sm:p-5">
                  <div className="mb-4 rounded-xl border-l-[3px] border-[var(--teal)] bg-[var(--mist)]/70 px-3.5 py-3">
                    <p className="eyebrow mb-1 !text-[10.5px]">Situación</p>
                    <p className="text-[13px] leading-relaxed text-[var(--ink)]/74">{QUIZ[questionIndex].context}</p>
                  </div>
                  <p className="mb-3 text-[15px] font-semibold leading-[1.5] text-[var(--ink)]">{QUIZ[questionIndex].question}</p>
                  <div className="space-y-2">
                    {QUIZ[questionIndex].options.map((option, index) => (
                      <button
                        key={option}
                        onClick={() => handleAnswer(QUIZ[questionIndex].id, index)}
                        data-selected={session.block2.answers[QUIZ[questionIndex].id] === index}
                        disabled={session.block2.submitted}
                        className="option-card"
                      >
                        <span className="option-letter">{String.fromCharCode(65 + index)}</span>
                        <span className="flex-1">{option}</span>
                        {session.block2.answers[QUIZ[questionIndex].id] === index && (
                          <Icon name="check" size={13} className="mt-0.5 shrink-0 text-[var(--teal)]" strokeWidth={2.4} />
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-2 border-t border-[var(--line)] pt-3">
                    <button
                      onClick={() => setQuestionIndex((index) => Math.max(0, index - 1))}
                      disabled={questionIndex === 0}
                      className="btn btn-outline btn-sm"
                    >
                      <Icon name="arrowLeft" size={13} /> Anterior
                    </button>
                    <div className="flex gap-1">
                      {QUIZ.map((question, index) => (
                        <button
                          key={question.id}
                          onClick={() => setQuestionIndex(index)}
                          aria-label={`Ir a la pregunta ${index + 1}`}
                          className={`h-1.5 rounded-full transition-all ${
                            index === questionIndex ? "w-5 bg-[var(--ink)]" : session.block2.answers[question.id] !== undefined ? "w-1.5 bg-[var(--teal)]" : "w-1.5 bg-[var(--ink)]/38"
                          }`}
                        />
                      ))}
                    </div>
                    <button
                      onClick={() => setQuestionIndex((index) => Math.min(QUIZ.length - 1, index + 1))}
                      disabled={questionIndex === QUIZ.length - 1}
                      className="btn btn-ink btn-sm"
                    >
                      Siguiente <Icon name="arrowRight" size={13} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="paper-card p-4">
                  <p className="eyebrow mb-2">Paleta de respuestas</p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {QUIZ.map((question, index) => {
                      const answered = session.block2.answers[question.id] !== undefined;
                      return (
                        <button
                          key={question.id}
                          onClick={() => setQuestionIndex(index)}
                          className={`grid h-9 place-items-center rounded-lg border font-mono text-[12.5px] font-medium transition ${
                            index === questionIndex
                              ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--lime)]"
                              : answered
                                ? "border-[var(--teal)]/25 bg-[var(--mist)] text-[var(--teal)]"
                                : "border-[var(--line)] bg-[var(--card-soft)] text-[var(--ink)]/62 hover:border-[var(--teal)]/30"
                          }`}
                        >
                          {String(index + 1).padStart(2, "0")}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-3 space-y-1.5">
                    <div className="flex items-center justify-between text-[11.5px] text-[var(--ink)]/62">
                      <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-[var(--mist)] ring-1 ring-[var(--teal)]/20" /> respondida</span>
                      <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-[var(--card-soft)] ring-1 ring-[var(--line)]" /> pendiente</span>
                    </div>
                  </div>
                  <div className="mt-3 border-t border-[var(--line)] pt-3">
                    <div className="mb-2 flex items-center justify-between text-[11.5px]">
                      <span className="text-[var(--ink)]/62">Avance</span>
                      <span className="font-mono">{answeredCount}/{QUIZ.length}</span>
                    </div>
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${(answeredCount / QUIZ.length) * 100}%` }} />
                    </div>
                  </div>
                  {session.block2.submitted ? (
                    <button onClick={() => handleTab(3)} className="btn btn-ink mt-3 w-full">
                      Ir al bloque 3 <Icon name="arrowRight" size={13} />
                    </button>
                  ) : (
                    <button onClick={() => setConfirmSubmit("quiz")} className="btn btn-lime mt-3 w-full">
                      <Icon name="send" size={13} /> Enviar respuestas
                    </button>
                  )}
                  <p className="mt-2 text-center text-[10.5px] leading-relaxed text-[var(--ink)]/55">
                    Una vez enviadas, las respuestas no podrán modificarse.
                  </p>
                </div>

                <div className="rounded-xl border border-[var(--amber)]/25 bg-[#f4e8d0] p-3.5">
                  <div className="flex items-center gap-1.5">
                    <Icon name="info" size={12} className="text-[#9b6b1b]" />
                    <p className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-[#8d621a]">Recuerda</p>
                  </div>
                  <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--ink)]/68">
                    Usa temperatura absoluta (K). Para la difusión, compara la raíz de la masa molar de cada gas.
                  </p>
                </div>

                <div className="rounded-xl border border-[var(--line)] bg-[var(--white)] p-3.5">
                  <p className="eyebrow mb-1.5">Seguridad activa</p>
                  <div className="space-y-1.5 text-[11.5px] text-[var(--ink)]/62">
                    <p className="flex items-center gap-1.5"><Icon name="lock" size={10} /> Navegación secuencial</p>
                    <p className="flex items-center gap-1.5"><Icon name="copy" size={10} /> Portapapeles deshabilitado</p>
                    <p className="flex items-center gap-1.5"><Icon name="activity" size={10} /> Docente en línea</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 3 && (
          <div className="space-y-4">
            <section className="relative overflow-hidden rounded-[20px] border border-[var(--line)] bg-[var(--white)] p-4 sm:p-5">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="chip" style={{ background: "#e9f2f5", color: "#0d6383", borderColor: "rgba(13,99,131,.16)" }}>Bloque 03</span>
                    <span className="chip"><Icon name="clock" size={10} /> 12 min sugeridos</span>
                    <span className="chip chip-teal"><Icon name="wind" size={10} /> 4 preguntas abiertas</span>
                  </div>
                  <h1 className="font-display text-[25.5px] font-semibold leading-[1.08] tracking-[-0.04em] sm:text-[30.5px]">
                    Aplica en tu entorno
                  </h1>
                  <p className="mt-1.5 max-w-[620px] text-[13px] leading-relaxed text-[var(--ink)]/68">
                    Argumenta con el modelo de partículas y las leyes. Cada respuesta debe superar los 120 caracteres para
                    completar el bloque; el docente podrá leerlas en su consola.
                  </p>
                </div>
                <div className="shrink-0 rounded-xl border border-[var(--line)] bg-[var(--card-soft)] px-3.5 py-2.5 text-right">
                  <p className="font-display text-[21.5px] font-semibold leading-none">{openCompleteCount}<span className="text-[12.5px] font-normal text-[var(--ink)]/55"> / 4</span></p>
                  <p className="mt-1 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[var(--ink)]/55">respuestas completas</p>
                </div>
              </div>
            </section>

            <div className="grid gap-3 lg:grid-cols-2">
              {OPEN_QUESTIONS.map((question, index) => (
                <OpenQuestionCard
                  key={question.id}
                  index={index}
                  title={question.title}
                  context={question.context}
                  prompt={question.prompt}
                  hint={question.hint}
                  minChars={question.minChars}
                  value={session.block3.answers[question.id] ?? ""}
                  onChange={(value) => handleOpenAnswer(question.id, value)}
                  locked={Boolean(session.finishedAt) || session.block3.submitted}
                />
              ))}
            </div>

            <div className="grid gap-3 lg:grid-cols-[1fr_330px]">
              <div className="paper-card p-4">
                <p className="eyebrow mb-2">Antes de finalizar</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <RequirementRow ok={session.block2.submitted} text="Prueba Saber enviada" />
                  <RequirementRow ok={openCompleteCount === 4} text="4 respuestas de 120+ caracteres" />
                  <RequirementRow ok={Boolean(session.finishedAt)} text="Informe generado" />
                  <RequirementRow ok={Boolean(requirements?.complete)} text="Evidencia del bloque 1" />
                </div>
                <p className="mt-3 text-[11.5px] leading-relaxed text-[var(--ink)]/62">
                  Al finalizar se habilitan tu informe completo y la descarga en PDF. Si el tiempo termina, podrás cerrar
                  con lo que hayas registrado.
                </p>
              </div>
              <div className="paper-card flex flex-col justify-between p-4">
                <div>
                  <div className="flex items-center justify-between">
                    <p className="text-[12.5px] font-semibold">Estado de la sesión</p>
                    <span className={`chip !py-0.5 ${timeExpired ? "chip-amber" : ""}`}>
                      <Icon name="clock" size={9} /> {session.finishedAt ? "final" : formatClock(remaining)}
                    </span>
                  </div>
                  <div className="mt-2.5 progress-track">
                    <div className="progress-fill progress-fill-lime" style={{ width: `${(openCompleteCount / 4) * 100}%` }} />
                  </div>
                  <p className="mt-2 text-[11.5px] text-[var(--ink)]/62">{openCompleteCount} de 4 respuestas listas para revisión.</p>
                </div>
                <button onClick={requestFinish} className="btn btn-ink mt-3 w-full">
                  <Icon name="file" size={14} /> Finalizar y generar informe
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 4 && (
          <StudentReport session={session} onExit={() => setExitOpen(true)} onNotify={push} />
        )}
      </main>

      <footer className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-2 border-t border-[var(--line)] px-4 py-3 text-[11px] text-[var(--ink)]/55 sm:px-6">
        <p>GASLAB 9° · Leyes de los gases y difusión · Ciencias Naturales</p>
        <div className="flex items-center gap-3">
          <button onClick={() => setSecurityOpen(true)} className="transition hover:text-[var(--ink)]/74">Medidas de seguridad</button>
          <button onClick={() => setControlOpen(true)} className="transition hover:text-[var(--ink)]/74">Control docente</button>
          <span className="font-mono">v1.0</span>
        </div>
      </footer>

      {/* Confirmar envío del cuestionario o informe */}
      <Modal
        open={confirmSubmit !== null}
        onClose={() => setConfirmSubmit(null)}
        title={confirmSubmit === "quiz" ? "Enviar Prueba Saber" : "Finalizar la actividad"}
        kicker="Confirmación"
        icon={confirmSubmit === "quiz" ? "send" : "file"}
        footer={
          <>
            <button onClick={() => setConfirmSubmit(null)} className="btn btn-outline btn-sm">Revisar de nuevo</button>
            <button onClick={confirmSubmit === "quiz" ? handleSubmitQuiz : finishSession} className="btn btn-ink btn-sm">
              <Icon name="check" size={13} /> {confirmSubmit === "quiz" ? "Enviar respuestas" : "Generar informe"}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-[14px] leading-relaxed text-[var(--ink)]/74">
            {confirmSubmit === "quiz"
              ? `Has respondido ${answeredCount} de ${QUIZ.length} preguntas. Después de enviar no podrás modificar tus elecciones y se desbloqueará el bloque de aplicación.`
              : "Se cerrará la sesión, se guardarán todas tus respuestas y se generará el informe descargable. El docente verá el resultado en su consola."}
          </p>
          <div className="flex items-start gap-2 rounded-xl border border-[var(--amber)]/25 bg-[#f4e8d0] p-3">
            <Icon name="alert" size={14} className="mt-0.5 text-[#a06f19]" />
            <p className="text-[12.5px] leading-relaxed text-[var(--ink)]/68">
              {confirmSubmit === "quiz"
                ? "Las preguntas sin responder se contabilizan como incorrectas."
                : "La acción queda registrada en la bitácora de la sesión."}
            </p>
          </div>
        </div>
      </Modal>

      {/* Salir / cambiar de estudiante */}
      <Modal
        open={exitOpen}
        onClose={() => setExitOpen(false)}
        title="Salir de la sesión"
        kicker="Sesión en curso"
        icon="logout"
        footer={
          <>
            <button onClick={() => setExitOpen(false)} className="btn btn-outline btn-sm">Continuar trabajando</button>
            <button
              onClick={() => {
                setExitOpen(false);
                onExit();
              }}
              className="btn btn-ink btn-sm"
            >
              <Icon name="home" size={13} /> Volver al portal
            </button>
          </>
        }
      >
        <p className="text-[14px] leading-relaxed text-[var(--ink)]/74">
          Tu avance está guardado. Si cierras sesión en este dispositivo podrás iniciar a otro estudiante; la sesión actual
          seguirá disponible para la consola del docente.
        </p>
        <div className="mt-3 rounded-xl border border-[var(--line)] bg-[var(--card-soft)] p-3 font-mono text-[11.5px] text-[var(--ink)]/68">
          {session.name} · {session.group} · {session.code}
        </div>
        <button onClick={changeStudent} className="btn btn-outline mt-3 w-full">
          <Icon name="users" size={13} /> Cerrar sesión y cambiar de estudiante
        </button>
      </Modal>

      {/* Reglas de seguridad */}
      <Modal open={securityOpen} onClose={() => setSecurityOpen(false)} title="Medidas de seguridad activas" kicker="Integridad académica" icon="shield" size="lg">
        <div className="grid gap-2 sm:grid-cols-2">
          {SECURITY_RULES.map((rule, index) => (
            <div key={rule.title} className="rounded-xl border border-[var(--line)] bg-[var(--card-soft)] p-3.5">
              <div className="mb-2 flex items-center justify-between">
                <span className="grid h-7 w-7 place-items-center rounded-md bg-[var(--mist)] text-[var(--teal)]">
                  <Icon name={(["lock", "copy", "refresh", "mic"] as IconName[])[index]} size={13} />
                </span>
                <span className="font-mono text-[10.5px] text-[var(--ink)]/48">0{index + 1}</span>
              </div>
              <p className="text-[12.5px] font-semibold">{rule.title}</p>
              <p className="mt-1 text-[12px] leading-relaxed text-[var(--ink)]/62">{rule.text}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-[var(--coral)]/20 bg-[#f6e4dd] p-3">
          <Icon name="shield" size={13} className="mt-0.5 shrink-0 text-[#a13c29]" />
          <div className="flex-1">
            <p className="text-[12.5px] font-semibold text-[#8c3525]">Penalizaciones vigentes: −{penalties} pts</p>
            <p className="mt-0.5 text-[12px] leading-relaxed text-[var(--ink)]/68">
              Copiar, pegar o forzar el acceso a un bloque genera sanciones en el puntaje. El docente puede retirarlas desde
              el control docente o su consola de monitoreo.
            </p>
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <button onClick={() => { setSecurityOpen(false); setControlOpen(true); }} className="btn btn-outline btn-sm">
            <Icon name="key" size={12} /> Abrir control docente
          </button>
        </div>
      </Modal>

      {/* Control docente */}
      <Modal
        open={controlOpen}
        onClose={() => setControlOpen(false)}
        title="Control docente"
        kicker="Acceso restringido"
        icon="key"
        size="md"
        footer={
          teacherVerified ? (
            <>
              <button onClick={onOpenTeacher} className="btn btn-outline btn-sm">
                <Icon name="activity" size={13} /> Consola completa
              </button>
              <button onClick={() => setControlOpen(false)} className="btn btn-ink btn-sm">Cerrar</button>
            </>
          ) : (
            <button onClick={() => setControlOpen(false)} className="btn btn-outline btn-sm">Cancelar</button>
          )
        }
      >
        {!teacherVerified ? (
          <div>
            <p className="text-[14px] leading-relaxed text-[var(--ink)]/74">
              Ingresa la clave docente para desbloquear los bloques, ampliar el tiempo o eliminar las penalizaciones de
              esta sesión. Todas las acciones quedan registradas en la bitácora.
            </p>
            <div className="mt-3">
              <label className="field-label" htmlFor="teacher-key">Clave docente</label>
              <input
                id="teacher-key"
                className="input font-mono tracking-[0.18em]"
                type="password"
                placeholder="••••••"
                value={keyInput}
                onChange={(event) => setKeyInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    if (keyInput.trim().toUpperCase() === DEMO_TEACHER_KEY) {
                      setTeacherVerified(true);
                      push("Acceso docente verificado.", "success");
                    } else push("Clave docente incorrecta.", "error");
                  }
                }}
              />
              <p className="mt-1.5 flex items-center gap-1 font-mono text-[11px] text-[var(--ink)]/55">
                <Icon name="info" size={10} /> Clave de demostración: {DEMO_TEACHER_KEY}
              </p>
            </div>
            <button
              onClick={() => {
                if (keyInput.trim().toUpperCase() === DEMO_TEACHER_KEY) {
                  setTeacherVerified(true);
                  push("Acceso docente verificado.", "success");
                } else push("Clave docente incorrecta.", "error");
              }}
              className="btn btn-ink mt-3 w-full"
            >
              <Icon name="unlock" size={13} /> Validar clave
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-start gap-2.5 rounded-xl border border-[var(--teal)]/18 bg-[var(--mist)] p-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--teal)] text-white">
                <Icon name="check" size={15} strokeWidth={2.4} />
              </span>
              <div>
                <p className="text-[12.5px] font-semibold">Acceso docente verificado</p>
                <p className="mt-0.5 text-[12px] text-[var(--ink)]/62">{session.name} · {session.code} · {session.group}</p>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <button onClick={() => handleControlAction("penalties")} className="btn btn-outline justify-start !py-2.5">
                <Icon name="shield" size={14} /> Eliminar penalizaciones ({penalties} pts)
              </button>
              <button onClick={() => handleControlAction("unlock")} className="btn btn-outline justify-start !py-2.5">
                <Icon name="unlock" size={14} /> Desbloquear los tres bloques
              </button>
              <button onClick={() => handleControlAction("time")} className="btn btn-outline justify-start !py-2.5">
                <Icon name="clock" size={14} /> Ampliar tiempo 5 minutos
              </button>
              <button onClick={() => handleControlAction("finish")} className="btn btn-outline justify-start !py-2.5">
                <Icon name="file" size={14} /> Finalizar y habilitar informe
              </button>
            </div>
            <div className="rounded-xl border border-[var(--line)] bg-[var(--card-soft)] p-3">
              <p className="eyebrow mb-1.5">Sonómetro de la sesión</p>
              <p className="text-[12px] leading-relaxed text-[var(--ink)]/62">
                Estado actual: <strong className="font-medium">{session.sound.status === "active" ? `activo · ${session.sound.db} dB` : "inactivo"}</strong>. El
                sonómetro individual se activa desde la consola de monitoreo del docente.
              </p>
            </div>
            <button onClick={onOpenTeacher} className="btn btn-ink w-full">
              <Icon name="activity" size={13} /> Abrir consola de monitoreo
            </button>
            <p className="text-[11.5px] leading-relaxed text-[var(--ink)]/55">
              Las acciones docentes se registran y se reflejan en el informe PDF del estudiante.
            </p>
          </div>
        )}
      </Modal>

      {toastsNode}
    </div>
  );
}

function RequirementRow({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`grid h-4 w-4 shrink-0 place-items-center rounded-full ${ok ? "bg-[var(--teal)] text-white" : "border border-[var(--line)] bg-[var(--card-soft)] text-transparent"}`}>
        <Icon name="check" size={9} strokeWidth={3} />
      </span>
      <p className={`text-[12px] ${ok ? "text-[var(--ink)]/74" : "text-[var(--ink)]/62"}`}>{text}</p>
    </div>
  );
}

function OpenQuestionCard({
  index,
  title,
  context,
  prompt,
  hint,
  minChars,
  value,
  onChange,
  locked,
}: {
  index: number;
  title: string;
  context: string;
  prompt: string;
  hint: string;
  minChars: number;
  value: string;
  onChange: (value: string) => void;
  locked: boolean;
}) {
  const [showHint, setShowHint] = useState(false);
  const complete = value.trim().length >= minChars;
  return (
    <div className="paper-card overflow-hidden">
      <div className="flex items-start justify-between gap-2 border-b border-[var(--line)] bg-[var(--card-soft)] px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-md bg-[#e9f2f5] font-mono text-[11.5px] font-semibold text-[#0d6383]">
            {String(index + 1).padStart(2, "0")}
          </span>
          <p className="text-[13px] font-semibold">{title}</p>
        </div>
        <span className={`chip !py-0.5 !text-[11px] ${complete ? "chip-lime" : ""}`}>
          {complete ? <><Icon name="check" size={9} /> completa</> : `${value.trim().length}/${minChars} car.`}
        </span>
      </div>
      <div className="p-4">
        <p className="rounded-lg border-l-2 border-[#0d6383]/30 bg-[#f2f7f8] px-3 py-2 text-[12px] leading-relaxed text-[var(--ink)]/68">{context}</p>
        <p className="mt-2.5 text-[13px] font-medium leading-relaxed text-[var(--ink)]/80">{prompt}</p>
        <textarea
          className="textarea mt-2.5 !min-h-[128px] text-[13px]"
          placeholder="Escribe tu explicación científica: identifica la ley, las variables y una consecuencia segura…"
          value={value}
          onChange={(event) => onChange(event.target.value.slice(0, 900))}
          disabled={locked}
          maxLength={900}
        />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <button onClick={() => setShowHint((current) => !current)} className="inline-flex items-center gap-1 text-[11.5px] font-medium text-[#0d6383]">
            <Icon name={showHint ? "chevronDown" : "chevronRight"} size={10} /> {showHint ? "Ocultar orientación" : "Ver orientación"}
          </button>
          <span className={`font-mono text-[11px] ${complete ? "text-[var(--teal)]" : "text-[var(--ink)]/55"}`}>
            {wordCount(value)} palabras · {value.length} caracteres
          </span>
        </div>
        {showHint && (
          <p className="mt-2 rounded-lg border border-[var(--line)] bg-[var(--card-soft)] px-2.5 py-2 text-[11.5px] leading-relaxed text-[var(--ink)]/68">
            {hint}
          </p>
        )}
      </div>
    </div>
  );
}

import { ACTIVITY_MINUTES, LAWS, OPEN_QUESTIONS, QUIZ, EXPERIMENTS } from "./data";
import type {
  BlockId,
  Evidence,
  LawKey,
  MicCommand,
  Penalty,
  ScoreBreakdown,
  Session,
  SoundState,
} from "./types";

const SESSIONS_KEY = "gaslab9.sessions.v1";
const CURRENT_STUDENT_KEY = "gaslab9.student.current.v1";
const MIC_KEY = "gaslab9.mic.commands.v1";
const SEED_KEY = "gaslab9.demo.seeded.v1";

const memory = new Map<string, string>();

const canStore = (() => {
  try {
    const key = "__gaslab_test__";
    window.localStorage.setItem(key, "1");
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
})();

function getRaw(key: string): string | null {
  if (canStore) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return memory.get(key) ?? null;
    }
  }
  return memory.get(key) ?? null;
}

function setRaw(key: string, value: string) {
  memory.set(key, value);
  if (canStore) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      /* memoria como respaldo */
    }
  }
}

function parse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function newId(prefix = "id"): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function makeCode(): string {
  return `G9-${Math.floor(1000 + Math.random() * 9000)}`;
}

export function emptySession(name: string, group: string): Session {
  const now = Date.now();
  return {
    id: newId("ses"),
    code: makeCode(),
    name: name.trim(),
    group,
    createdAt: now,
    startedAt: now,
    endsAt: now + ACTIVITY_MINUTES * 60 * 1000,
    updatedAt: now,
    currentBlock: 1,
    unlockedThrough: 1,
    teacherUnlocked: false,
    block1: { records: [], laws: {}, conclusion: "" },
    block2: { answers: {}, submitted: false },
    block3: { answers: {}, submitted: false },
    penalties: [],
    log: [
      {
        id: newId("log"),
        type: "info",
        text: `Sesión iniciada · ${ACTIVITY_MINUTES} minutos · ${group}`,
        at: now,
      },
    ],
    sound: { on: false, status: "off", db: 0, peak: 0, updatedAt: now },
    messages: [],
  };
}

function rawSessions(): Session[] {
  return parse<Session[]>(getRaw(SESSIONS_KEY), []);
}

function rawWrite(sessions: Session[]) {
  setRaw(SESSIONS_KEY, JSON.stringify(sessions));
}

export function readSessions(): Session[] {
  ensureDemoSessions();
  return rawSessions().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function findSession(id: string): Session | undefined {
  return rawSessions().find((s) => s.id === id);
}

export function writeSession(session: Session): Session {
  const sessions = rawSessions();
  const index = sessions.findIndex((s) => s.id === session.id);
  const next = { ...session, updatedAt: Date.now() };
  if (index >= 0) sessions[index] = next;
  else sessions.push(next);
  rawWrite(sessions);
  return next;
}

export function patchSession(id: string, patch: Partial<Session>, touch = true): Session | undefined {
  const sessions = rawSessions();
  const index = sessions.findIndex((s) => s.id === id);
  if (index < 0) return undefined;
  const next: Session = {
    ...sessions[index],
    ...patch,
    updatedAt: touch ? Date.now() : sessions[index].updatedAt,
  };
  sessions[index] = next;
  rawWrite(sessions);
  return next;
}

export function deleteSession(id: string) {
  rawWrite(rawSessions().filter((s) => s.id !== id));
}

export function getCurrentStudentId(): string | null {
  return getRaw(CURRENT_STUDENT_KEY);
}

export function setCurrentStudentId(id: string | null) {
  if (id) setRaw(CURRENT_STUDENT_KEY, id);
  else if (canStore) {
    try {
      window.localStorage.removeItem(CURRENT_STUDENT_KEY);
    } catch {
      memory.delete(CURRENT_STUDENT_KEY);
    }
  } else memory.delete(CURRENT_STUDENT_KEY);
}

export function logEvent(id: string, type: Session["log"][number]["type"], text: string): Session | undefined {
  const session = findSession(id);
  if (!session) return undefined;
  const entry = { id: newId("log"), type, text, at: Date.now() };
  return patchSession(id, { log: [...session.log, entry].slice(-80) });
}

export function addPenalty(id: string, reason: string, points: number): Session | undefined {
  const session = findSession(id);
  if (!session) return undefined;
  const penalty: Penalty = { id: newId("pen"), reason, points, at: Date.now() };
  const entry = {
    id: newId("log"),
    type: "security" as const,
    text: `Penalización −${points} pts · ${reason}`,
    at: Date.now(),
  };
  return patchSession(id, {
    penalties: [...session.penalties, penalty],
    log: [...session.log, entry].slice(-80),
  });
}

export function clearPenalties(id: string): Session | undefined {
  const session = findSession(id);
  if (!session) return undefined;
  return patchSession(id, {
    penalties: [],
    log: [
      ...session.log,
      {
        id: newId("log"),
        type: "teacher" as const,
        text: "El docente eliminó todas las penalizaciones de la sesión.",
        at: Date.now(),
      },
    ].slice(-80),
  });
}

export function unlockAll(id: string): Session | undefined {
  const session = findSession(id);
  if (!session) return undefined;
  return patchSession(id, {
    teacherUnlocked: true,
    unlockedThrough: 3 as BlockId,
    log: [
      ...session.log,
      {
        id: newId("log"),
        type: "teacher" as const,
        text: "El docente desbloqueó los tres bloques.",
        at: Date.now(),
      },
    ].slice(-80),
  });
}

export function lockAll(id: string): Session | undefined {
  const session = findSession(id);
  if (!session) return undefined;
  return patchSession(id, { teacherUnlocked: false });
}

export function extendTime(id: string, minutes: number): Session | undefined {
  const session = findSession(id);
  if (!session) return undefined;
  return patchSession(id, {
    endsAt: session.endsAt + minutes * 60 * 1000,
    log: [
      ...session.log,
      {
        id: newId("log"),
        type: "teacher" as const,
        text: `El docente amplió el tiempo en ${minutes} minutos.`,
        at: Date.now(),
      },
    ].slice(-80),
  });
}

export function sendTeacherMessage(id: string, text: string): Session | undefined {
  const session = findSession(id);
  if (!session) return undefined;
  return patchSession(id, {
    messages: [...session.messages, { id: newId("msg"), text, at: Date.now() }].slice(-10),
  });
}

export function setTeacherNote(id: string, note: string): Session | undefined {
  return patchSession(id, { teacherNote: note });
}

export function setMicCommand(id: string, on: boolean): MicCommand {
  const commands = parse<Record<string, MicCommand>>(getRaw(MIC_KEY), {});
  commands[id] = { on, at: Date.now() };
  setRaw(MIC_KEY, JSON.stringify(commands));
  if (!on) {
    const session = findSession(id);
    if (session) {
      patchSession(id, { sound: { ...session.sound, on: false, status: "off", updatedAt: Date.now() } });
    }
  }
  return commands[id];
}

export function readMicCommand(id: string): MicCommand | undefined {
  return parse<Record<string, MicCommand>>(getRaw(MIC_KEY), {})[id];
}

export function publishSound(id: string, sound: Partial<SoundState>) {
  const session = findSession(id);
  if (!session) return;
  const next: SoundState = { ...session.sound, ...sound, updatedAt: Date.now() };
  patchSession(id, { sound: next });
}

export function onStoreChange(callback: () => void): () => void {
  const handler = (event: StorageEvent) => {
    if (!event.key || [SESSIONS_KEY, MIC_KEY].includes(event.key)) callback();
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}

export function remainingMs(session: Session, now = Date.now()): number {
  return Math.max(0, session.endsAt - now);
}

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function formatDuration(ms: number): string {
  if (ms > 0 && ms < 60000) return "menos de 1 min";
  const total = Math.max(0, Math.round(ms / 60000));
  return `${total} min`;
}

export function formatDate(at: number, withTime = true): string {
  const date = new Date(at);
  const base = date.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
  if (!withTime) return base;
  return `${base} · ${date.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}`;
}

export function formatShortTime(at: number): string {
  return new Date(at).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
}

export function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

export interface Requirements {
  perExperiment: Record<LawKey, { count: number; correct: boolean }>;
  recordsOk: boolean;
  lawsOk: boolean;
  complete: boolean;
}

export function block1Requirements(session: Session): Requirements {
  const perExperiment = {} as Requirements["perExperiment"];
  EXPERIMENTS.forEach((key) => {
    perExperiment[key] = {
      count: session.block1.records.filter((r) => r.exp === key).length,
      correct: session.block1.laws[key] === key,
    };
  });
  const recordsOk = EXPERIMENTS.every((key) => perExperiment[key].count >= 2);
  const lawsOk = EXPERIMENTS.every((key) => perExperiment[key].correct);
  return { perExperiment, recordsOk, lawsOk, complete: recordsOk && lawsOk };
}

export function block2Complete(session: Session): boolean {
  return session.block2.submitted || QUIZ.every((q) => session.block2.answers[q.id] !== undefined);
}

export function block3Complete(session: Session): boolean {
  return session.block3.submitted || OPEN_QUESTIONS.every((q) => (session.block3.answers[q.id] ?? "").trim().length >= q.minChars);
}

export function deriveScore(session: Session): ScoreBreakdown {
  let block1 = 0;
  EXPERIMENTS.forEach((key) => {
    const count = session.block1.records.filter((r) => r.exp === key).length;
    block1 += Math.min(1, count / 2) * 3.75;
    if (session.block1.laws[key] === key) block1 += 3.75;
  });
  let correctAnswers = 0;
  QUIZ.forEach((q) => {
    if (session.block2.answers[q.id] === q.correct) correctAnswers += 1;
  });
  const block2 = correctAnswers * 5;
  let block3 = 0;
  OPEN_QUESTIONS.forEach((q) => {
    if ((session.block3.answers[q.id] ?? "").trim().length >= q.minChars) block3 += 7.5;
  });
  const penalties = session.penalties.reduce((sum, p) => sum + p.points, 0);
  return {
    block1: Math.round(block1 * 10) / 10,
    block2,
    block3: Math.round(block3 * 10) / 10,
    penalties,
    total: Math.max(0, Math.round(block1 + block2 + block3 - penalties)),
    max: 100,
    correctAnswers,
  };
}

export function statusLabel(session: Session): { label: string; tone: "active" | "finished" | "idle" | "alert" } {
  if (session.finishedAt) return { label: "Finalizó", tone: "finished" };
  const online = Date.now() - session.updatedAt < 1000 * 60 * 3;
  if (session.penalties.length) return { label: online ? "En línea" : "Revisar", tone: "alert" };
  if (online) return { label: "En línea", tone: "active" };
  return { label: "Sin señal", tone: "idle" };
}

export function makeEvidence(
  exp: LawKey,
  p: number,
  v: number,
  t: number,
  note: string
): Evidence {
  return { id: newId("ev"), exp, p, v, t, note, at: Date.now() };
}

export function lawName(key: LawKey | undefined): string {
  return key ? LAWS[key].name : "Sin identificar";
}

/* ---------------------------- Sesiones de muestra ---------------------------- */

function record(exp: LawKey, p: number, v: number, t: number, note: string, minute: number): Evidence {
  return { id: newId("demo-ev"), exp, p, v, t, note, at: Date.now() - minute * 60000 };
}

export function buildDemoSessions(): Session[] {
  const now = Date.now();
  const valentina: Session = {
    ...emptySession("Valentina Ríos", "9°A"),
    id: "demo-valentina",
    code: "G9-2041",
    startedAt: now - 22 * 60000,
    createdAt: now - 23 * 60000,
    endsAt: now + 23 * 60000,
    updatedAt: now - 4000,
    currentBlock: 2,
    unlockedThrough: 2,
    isDemo: true,
    block1: {
      records: [
        record("boyle", 3.0, 2.0, 298, "V=2,0 L", 18),
        record("boyle", 6.0, 1.0, 298, "V=1,0 L", 17),
        record("charles", 1.0, 30.0, 300, "T=300 K", 16),
        record("charles", 1.0, 40.0, 400, "T=400 K", 15),
        record("gaylussac", 2.4, 5.0, 300, "T=300 K", 12),
        record("gaylussac", 3.2, 5.0, 400, "T=400 K", 11),
        record("graham", 1.0, 1.0, 298, "NH₃ / HCl · 59 cm", 8),
        record("graham", 1.0, 1.0, 350, "NH₃ / HCl · 55 cm", 7),
      ],
      laws: { boyle: "boyle", charles: "charles", gaylussac: "gaylussac", graham: "graham" },
      conclusion: "Al reducir el volumen se duplicó la presión.",
    },
    block2: {
      answers: { q1: 1, q2: 2, q3: 3, q4: 2, q5: 0 },
      submitted: false,
    },
    block3: { answers: {}, submitted: false },
    penalties: [{ id: "demo-p1", reason: "Intento de copiar texto del examen", points: 10, at: now - 9 * 60000 }],
    log: [
      { id: "l1", type: "info", text: "Sesión iniciada · 45 minutos · 9°A", at: now - 23 * 60000 },
      { id: "l2", type: "answer", text: "Bloque 1 completado: 8 registros y 4 leyes identificadas.", at: now - 10 * 60000 },
      { id: "l3", type: "security", text: "Penalización −10 pts · Intento de copiar texto del examen", at: now - 9 * 60000 },
    ],
    sound: { on: false, status: "off", db: 0, peak: 0, updatedAt: now - 4000 },
    messages: [],
  };

  const santiago: Session = {
    ...emptySession("Santiago Mejía", "9°B"),
    id: "demo-santiago",
    code: "G9-3177",
    startedAt: now - 34 * 60000,
    createdAt: now - 35 * 60000,
    endsAt: now + 11 * 60000,
    updatedAt: now - 9000,
    currentBlock: 3,
    unlockedThrough: 3,
    isDemo: true,
    block1: {
      records: [
        record("boyle", 3.0, 2.0, 298, "V=2,0 L", 28),
        record("boyle", 4.0, 1.5, 298, "V=1,5 L", 27),
        record("charles", 1.0, 25.0, 250, "T=250 K", 25),
        record("charles", 1.0, 40.0, 400, "T=400 K", 24),
        record("gaylussac", 1.6, 5.0, 200, "T=200 K", 22),
        record("gaylussac", 3.2, 5.0, 400, "T=400 K", 21),
        record("graham", 1.0, 1.0, 298, "H₂ / O₂ · difusión", 19),
        record("graham", 1.0, 1.0, 330, "He / CO₂ · difusión", 18),
      ],
      laws: { boyle: "boyle", charles: "charles", gaylussac: "gaylussac", graham: "graham" },
      conclusion: "P y V son inversas; V y T son directamente proporcionales.",
    },
    block2: {
      answers: QUIZ.reduce<Record<string, number>>((acc, q) => {
        acc[q.id] = q.correct;
        return acc;
      }, {}),
      submitted: true,
      submittedAt: now - 12 * 60000,
    },
    block3: {
      answers: {
        o1: "En la olla a presión el vapor queda atrapado y el volumen es constante. Al aumentar la temperatura, la presión sube; según Gay-Lussac, presión y temperatura absoluta son directamente proporcionales. El agua hierve a más de 100 °C y el alimento se cocina más rápido porque recibe calor a mayor temperatura.",
        o2: "Dentro de la nevera el gas se enfría y su volumen disminuye; el globo se arruga. En el auto al sol la temperatura sube y el volumen aumenta, por lo que puede estallar. Conviene no dejar aerosoles ni globos expuestos al sol porque la presión interna puede superar la resistencia del material.",
        o3: "",
        o4: "",
      },
      submitted: false,
    },
    penalties: [],
    log: [
      { id: "s1", type: "info", text: "Sesión iniciada · 45 minutos · 9°B", at: now - 35 * 60000 },
      { id: "s2", type: "answer", text: "Prueba Saber enviada · 8 preguntas.", at: now - 12 * 60000 },
      { id: "s3", type: "info", text: "Escribiendo en el bloque 3: la ley en tu día a día.", at: now - 3 * 60000 },
    ],
    sound: { on: false, status: "off", db: 0, peak: 0, updatedAt: now - 9000 },
    messages: [],
  };

  const isabella: Session = {
    ...emptySession("Isabella Torres", "9°A"),
    id: "demo-isabella",
    code: "G9-1180",
    startedAt: now - 52 * 60000,
    createdAt: now - 53 * 60000,
    endsAt: now - 7 * 60000,
    updatedAt: now - 6 * 60000,
    finishedAt: now - 7 * 60000,
    currentBlock: 3,
    unlockedThrough: 3,
    isDemo: true,
    block1: {
      records: [
        record("boyle", 2.0, 3.0, 298, "V=3,0 L", 44),
        record("boyle", 6.0, 1.0, 298, "V=1,0 L", 43),
        record("charles", 1.0, 20.0, 200, "T=200 K", 41),
        record("charles", 1.0, 50.0, 500, "T=500 K", 40),
        record("gaylussac", 2.0, 5.0, 250, "T=250 K", 37),
        record("gaylussac", 4.0, 5.0, 500, "T=500 K", 36),
        record("graham", 1.0, 1.0, 298, "NH₃ / HCl", 33),
        record("graham", 1.0, 1.0, 350, "H₂ / O₂", 32),
      ],
      laws: { boyle: "boyle", charles: "charles", gaylussac: "gaylussac", graham: "graham" },
      conclusion: "Las tres leyes se cumplen al controlar cada variable.",
    },
    block2: {
      answers: { q1: 1, q2: 2, q3: 3, q4: 2, q5: 0, q6: 1, q7: 0, q8: 3 },
      submitted: true,
      submittedAt: now - 22 * 60000,
    },
    block3: {
      answers: {
        o1: "La olla a presión mantiene un volumen constante y el vapor eleva la presión interna. Según la ley de Gay-Lussac, a mayor temperatura aumenta la presión. El agua alcanza más de 100 °C antes de hervir y transmite más calor al alimento, reduciendo el tiempo de cocción.",
        o2: "Al enfriar el globo en la nevera, la temperatura absoluta baja y el volumen disminuye. En el auto caliente ocurre lo contrario: el gas se expande y el globo puede estallar. Debo evitar dejar objetos presurizados bajo el sol.",
        o3: "El amoníaco es más liviano que el aire y difunde con rapidez; la temperatura alta acelera su dispersión. Se debe ventilar, cerrar la fuente, alejarse del área y usar protección respiratoria antes de intervenir.",
        o4: "El balón de fútbol funciona con la ley de Gay-Lussac: al calentarse, la presión del aire interno aumenta y puede deformarse. Recomiendo inflarlo a la presión indicada y revisar la presión antes de jugar.",
      },
      submitted: true,
      submittedAt: now - 7 * 60000,
    },
    penalties: [],
    log: [
      { id: "i1", type: "info", text: "Sesión iniciada · 45 minutos · 9°A", at: now - 53 * 60000 },
      { id: "i2", type: "answer", text: "Prueba Saber enviada · 7 de 8 respuestas correctas.", at: now - 22 * 60000 },
      { id: "i3", type: "info", text: "Actividad finalizada. Informe disponible.", at: now - 7 * 60000 },
    ],
    sound: { on: false, status: "off", db: 0, peak: 0, updatedAt: now - 6 * 60000 },
    messages: [],
  };

  const andres: Session = {
    ...emptySession("Andrés Cárdenas", "9°C"),
    id: "demo-andres",
    code: "G9-5524",
    startedAt: now - 8 * 60000,
    createdAt: now - 9 * 60000,
    endsAt: now + 37 * 60000,
    updatedAt: now - 15000,
    currentBlock: 1,
    unlockedThrough: 1,
    isDemo: true,
    block1: {
      records: [
        record("boyle", 3.0, 2.0, 298, "V=2,0 L", 4),
        record("boyle", 2.0, 3.0, 298, "V=3,0 L", 3),
      ],
      laws: { boyle: "boyle", charles: "boyle" },
      conclusion: "",
    },
    block2: { answers: {}, submitted: false },
    block3: { answers: {}, submitted: false },
    penalties: [
      { id: "demo-p2", reason: "Intento de navegar al bloque 2 sin completar el bloque 1", points: 5, at: now - 5 * 60000 },
      { id: "demo-p3", reason: "Atajo de pegado en el cuaderno de laboratorio", points: 10, at: now - 3 * 60000 },
    ],
    log: [
      { id: "a1", type: "info", text: "Sesión iniciada · 45 minutos · 9°C", at: now - 9 * 60000 },
      { id: "a2", type: "security", text: "Penalización −5 pts · Intento de navegar al bloque 2 sin completar el bloque 1", at: now - 5 * 60000 },
      { id: "a3", type: "security", text: "Penalización −10 pts · Atajo de pegado en el cuaderno de laboratorio", at: now - 3 * 60000 },
    ],
    sound: { on: false, status: "off", db: 0, peak: 0, updatedAt: now - 15000 },
    messages: [],
  };

  return [valentina, santiago, isabella, andres];
}

export function ensureDemoSessions() {
  if (getRaw(SEED_KEY) === "1") return;
  const sessions = rawSessions();
  const hasDemo = sessions.some((s) => s.isDemo);
  if (!hasDemo) {
    rawWrite([...buildDemoSessions(), ...sessions]);
  }
  setRaw(SEED_KEY, "1");
}

export function resetDemoSessions() {
  const real = rawSessions().filter((s) => !s.isDemo);
  rawWrite([...real, ...buildDemoSessions()]);
  setRaw(SEED_KEY, "1");
}

export function removeDemoSessions() {
  rawWrite(rawSessions().filter((s) => !s.isDemo));
}

/* ------------------------------- Descargas ------------------------------- */

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export async function downloadStandaloneHtml(mode: "student" | "teacher"): Promise<void> {
  const source = new URL(window.location.href);
  source.hash = "";
  const response = await fetch(source.toString(), { cache: "no-store" });
  if (!response.ok) throw new Error("No se pudo leer la aplicación empaquetada.");
  let html = await response.text();
  if (/<script[^>]+type="module"[^>]+src=/.test(html)) {
    throw new Error(
      "La versión de desarrollo no se puede exportar. Ejecuta npm run build y descarga desde la versión compilada."
    );
  }
  html = html.replace(/<script>window\.__LAB_BOOT_MODE__="(?:student|teacher)";<\/script>\n?/g, "");
  const title =
    mode === "student"
      ? "Actividad · Leyes de los gases y difusión · Grado 9°"
      : "Consola docente · Leyes de los gases · Grado 9°";
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`);
  const bootScript = `<script>window.__LAB_BOOT_MODE__=${JSON.stringify(mode)};</script>`;
  const closeBody = html.lastIndexOf("</body>");
  if (closeBody < 0) {
    throw new Error("La aplicación empaquetada no tiene un cierre de documento reconocible.");
  }
  html = `${html.slice(0, closeBody)}${bootScript}\n${html.slice(closeBody)}`;
  if (!html.includes(`__LAB_BOOT_MODE__=${JSON.stringify(mode)}`) || !/<script type="module"/.test(html)) {
    throw new Error("La exportación quedó incompleta. Intenta de nuevo o usa npm run build.");
  }
  downloadBlob(
    new Blob([html], { type: "text/html;charset=utf-8" }),
    mode === "student" ? "actividad-leyes-gases-9.html" : "consola-docente-gases-9.html"
  );
}

export function sessionSnapshotForExport(session: Session) {
  return JSON.stringify(
    {
      actividad: "Leyes de los gases y difusión · Grado 9°",
      exportado: new Date().toISOString(),
      sesion: session,
      puntaje: deriveScore(session),
    },
    null,
    2
  );
}

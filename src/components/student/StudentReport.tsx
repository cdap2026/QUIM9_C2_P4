import { EXPERIMENTS, LAWS, OPEN_QUESTIONS, QUIZ } from "../../lib/data";
import { downloadStudentPdf } from "../../lib/pdf";
import { deriveScore, formatDate, formatDuration, lawName } from "../../lib/storage";
import type { Session } from "../../lib/types";
import { Icon } from "../icons";
import { ScoreRing } from "../ui";
import { formatEvidence } from "./SimulationLab";

const LETTERS = ["A", "B", "C", "D"];

export function StudentReport({
  session,
  onExit,
  onNotify,
}: {
  session: Session;
  onExit: () => void;
  onNotify: (message: string, kind?: "success" | "error" | "warning" | "info") => void;
}) {
  const score = deriveScore(session);
  const duration = (session.finishedAt ?? Date.now()) - session.startedAt;
  const blocks = [
    { label: "Bloque 1 · Simuladores", value: score.block1, max: 30, color: "#0f766e" },
    { label: "Bloque 2 · Prueba Saber", value: score.block2, max: 40, color: "#b7791f" },
    { label: "Bloque 3 · Aplicación", value: score.block3, max: 30, color: "#0d6383" },
  ];

  function handlePdf() {
    try {
      downloadStudentPdf(session);
      onNotify("Informe PDF generado. Revisa la carpeta de descargas.", "success");
    } catch {
      onNotify("No fue posible generar el PDF en este navegador.", "error");
    }
  }

  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-[22px] bg-[var(--ink)] p-5 text-white sm:p-7">
        <div className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full bg-[var(--lime)]/[0.09] blur-3xl" />
        <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="chip chip-dark !text-[var(--lime)]">
                <Icon name="file" size={11} /> Informe de laboratorio
              </span>
              <span className={`chip ${session.finishedAt ? "chip-lime" : "chip-amber"}`}>
                {session.finishedAt ? "Actividad finalizada" : "Sesión en desarrollo"}
              </span>
            </div>
            <h1 className="font-display text-[31.5px] font-semibold leading-[1.03] tracking-[-0.045em] sm:text-[39.5px]">
              Tu evidencia, <span className="font-serif italic font-normal text-[var(--lime)]">en una sola mirada.</span>
            </h1>
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[12.5px] text-white/68">
              <span className="inline-flex items-center gap-1.5">
                <Icon name="user" size={11} /> {session.name}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Icon name="graduation" size={11} /> {session.group}
              </span>
              <span className="inline-flex items-center gap-1.5 font-mono">
                <Icon name="key" size={11} /> {session.code}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Icon name="clock" size={11} /> {formatDuration(duration)} de trabajo
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Icon name="chart" size={11} /> {formatDate(session.startedAt)}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={handlePdf} className="btn btn-lime">
              <Icon name="download" size={14} /> Descargar informe PDF
            </button>
            <button onClick={onExit} className="btn btn-outline-light">
              <Icon name="home" size={14} /> Salir del laboratorio
            </button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-[220px_1fr]">
        <div className="paper-card flex flex-col items-center justify-center gap-3 p-5 text-center">
          <ScoreRing value={score.total} max={score.max} size={128} />
          <div>
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-[var(--ink)]/55">Resultado de la sesión</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--ink)]/62">
              {score.total >= 80
                ? "Dominio sobresaliente de las leyes y su aplicación."
                : score.total >= 60
                  ? "Comprensión adecuada; conviene reforzar la difusión."
                  : "Retoma las relaciones entre P, V y T antes de una nueva aplicación."}
            </p>
          </div>
          <span className="chip chip-teal">
            <Icon name="target" size={10} /> {score.correctAnswers}/8 Saber correctas
          </span>
        </div>

        <div className="paper-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="eyebrow mb-1">Desempeño por bloque</p>
              <p className="text-[12.5px] text-[var(--ink)]/62">El puntaje incluye las penalizaciones vigentes (retirables por el docente).</p>
            </div>
            <span className="font-display text-[25.5px] font-semibold tracking-[-0.04em]">{score.total}<span className="text-[14px] font-normal text-[var(--ink)]/55">/100</span></span>
          </div>
          <div className="space-y-3">
            {blocks.map((block) => (
              <div key={block.label}>
                <div className="mb-1 flex items-center justify-between text-[12.5px]">
                  <span className="font-medium text-[var(--ink)]/74">{block.label}</span>
                  <span className="font-mono text-[12px] text-[var(--ink)]/62">{block.value} / {block.max}</span>
                </div>
                <div className="progress-track">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, (block.value / block.max) * 100)}%`, background: block.color }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-3 divide-x divide-[var(--line)] border-t border-[var(--line)] pt-3.5">
            {[
              { label: "Registros", value: `${session.block1.records.length}` },
              { label: "Abiertas", value: `${OPEN_QUESTIONS.filter((question) => (session.block3.answers[question.id] ?? "").trim().length > 0).length}/4` },
              { label: "Penalizaciones", value: score.penalties > 0 ? `−${score.penalties}` : "0", danger: score.penalties > 0 },
            ].map((stat) => (
              <div key={stat.label} className="px-3 first:pl-0 last:pr-0">
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[var(--ink)]/55">{stat.label}</p>
                <p className={`mt-0.5 font-display text-[18.5px] font-semibold ${stat.danger ? "text-[var(--coral)]" : ""}`}>{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <section className="paper-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Icon name="flask" size={15} className="text-[var(--teal)]" />
            <p className="text-[14px] font-semibold">Bloque 1 · Evidencia experimental</p>
          </div>
          <span className="chip">{session.block1.records.length} mediciones registradas</span>
        </div>
        <div className="scroll-slim max-h-[250px] overflow-auto">
          {session.block1.records.length === 0 ? (
            <p className="px-5 py-8 text-center text-[13px] text-[var(--ink)]/62">No se registraron mediciones en los simuladores.</p>
          ) : (
            <table className="w-full border-collapse text-left">
              <thead className="sticky top-0 bg-[var(--mist)]">
                <tr>
                  {["Experimento", "Dato registrado", "Ley inferida", "Hora"].map((header) => (
                    <th key={header} className="px-4 py-2 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[var(--ink)]/62">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {session.block1.records.map((record) => (
                  <tr key={record.id} className="border-t border-[var(--line-soft)]">
                    <td className="px-4 py-2 text-[12.5px] font-medium">{LAWS[record.exp].name}</td>
                    <td className="px-4 py-2 font-mono text-[11.5px] text-[var(--ink)]/68">{formatEvidence(record)}</td>
                    <td className="px-4 py-2 text-[12px]">{lawName(session.block1.laws[record.exp])}</td>
                    <td className="px-4 py-2 font-mono text-[11px] text-[var(--ink)]/55">
                      {new Date(record.at).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="grid gap-3 border-t border-[var(--line)] bg-[var(--card-soft)] p-4 sm:grid-cols-2">
          <div>
            <p className="eyebrow mb-2">Identificación por experimento</p>
            <div className="flex flex-wrap gap-1.5">
              {EXPERIMENTS.map((key) => (
                <span key={key} className={`chip ${session.block1.laws[key] === key ? "chip-lime" : "chip-danger"}`}>
                  <Icon name={session.block1.laws[key] === key ? "check" : "x"} size={9} />
                  {LAWS[key].short}: {lawName(session.block1.laws[key])}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="eyebrow mb-1.5">Conclusión escrita</p>
            <p className="text-[12.5px] leading-relaxed text-[var(--ink)]/68">
              {session.block1.conclusion.trim() || "Sin conclusión registrada."}
            </p>
          </div>
        </div>
      </section>

      <section className="paper-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Icon name="target" size={15} className="text-[#a06f19]" />
            <p className="text-[14px] font-semibold">Bloque 2 · Prueba Saber</p>
          </div>
          <span className={`chip ${score.correctAnswers >= 6 ? "chip-lime" : "chip-amber"}`}>
            {score.correctAnswers} de {QUIZ.length} correctas · {score.block2}/40
          </span>
        </div>
        <div className="grid gap-2 p-4 lg:grid-cols-2">
          {QUIZ.map((question, index) => {
            const answer = session.block2.answers[question.id];
            const correct = answer === question.correct;
            return (
              <div key={question.id} className={`rounded-xl border p-3 ${correct ? "border-[var(--teal)]/18 bg-[#e9f2e4]" : "border-[var(--coral)]/18 bg-[#f6e4dd]"}`}>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--ink)]/55">Pregunta {index + 1} · {question.competency.split("·")[0]}</span>
                  <span className={`chip !py-0.5 !text-[10.5px] ${correct ? "chip-lime" : "chip-danger"}`}>
                    <Icon name={correct ? "check" : "x"} size={8} /> {correct ? "correcta" : "por revisar"}
                  </span>
                </div>
                <p className="text-[12.5px] font-medium leading-snug">{question.question}</p>
                <div className="mt-2 flex flex-wrap gap-2 font-mono text-[11px]">
                  <span className="rounded border border-[var(--line)] bg-[var(--card)] px-1.5 py-0.5 text-[var(--ink)]/68">
                    Tu respuesta: {answer !== undefined ? LETTERS[answer] : "sin responder"}
                  </span>
                  <span className="rounded border border-[var(--teal)]/20 bg-[var(--mist)] px-1.5 py-0.5 text-[var(--teal)]">
                    Clave: {LETTERS[question.correct]}
                  </span>
                </div>
                <p className="mt-2 text-[11.5px] leading-relaxed text-[var(--ink)]/62">{question.explanation}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="paper-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Icon name="wind" size={15} className="text-[#0d6383]" />
            <p className="text-[14px] font-semibold">Bloque 3 · Aplicación en el entorno</p>
          </div>
          <span className="chip">
            {OPEN_QUESTIONS.filter((question) => (session.block3.answers[question.id] ?? "").trim().length >= question.minChars).length}/4 completas
          </span>
        </div>
        <div className="grid gap-3 p-4 lg:grid-cols-2">
          {OPEN_QUESTIONS.map((question, index) => {
            const answer = (session.block3.answers[question.id] ?? "").trim();
            const complete = answer.length >= question.minChars;
            return (
              <div key={question.id} className="rounded-xl border border-[var(--line)] bg-[var(--card)] p-3.5">
                <div className="mb-1.5 flex items-center justify-between">
                  <p className="text-[12.5px] font-semibold">{index + 1}. {question.title}</p>
                  <span className={`chip !py-0.5 !text-[10.5px] ${complete ? "chip-lime" : "chip-amber"}`}>
                    {complete ? "completa" : `${answer.length} car.`}
                  </span>
                </div>
                <p className="text-[12px] leading-relaxed text-[var(--ink)]/68">{answer || "Sin respuesta registrada."}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="paper-card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-[var(--line)] px-5 py-3.5">
          <Icon name="shield" size={15} className="text-[var(--teal)]" />
          <p className="text-[14px] font-semibold">Bitácora de seguridad y acompañamiento</p>
        </div>
        <div className="grid gap-4 p-4 lg:grid-cols-2">
          <div>
            <p className="eyebrow mb-2">Penalizaciones vigentes · −{score.penalties} pts</p>
            {session.penalties.length === 0 ? (
              <div className="flex items-center gap-2 rounded-lg border border-[var(--teal)]/15 bg-[var(--mist)] px-3 py-2.5">
                <Icon name="check" size={13} className="text-[var(--teal)]" strokeWidth={2.2} />
                <p className="text-[12.5px] text-[var(--ink)]/68">Sin penalizaciones. Integridad de la sesión conservada.</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {session.penalties.map((penalty) => (
                  <div key={penalty.id} className="flex items-start justify-between gap-3 rounded-lg border border-[var(--coral)]/15 bg-[#f6e4dd] px-3 py-2">
                    <div>
                      <p className="text-[12px] font-medium text-[#953826]">{penalty.reason}</p>
                      <p className="mt-0.5 font-mono text-[10.5px] text-[var(--ink)]/55">{formatDate(penalty.at)}</p>
                    </div>
                    <span className="chip chip-danger shrink-0 !py-0.5">−{penalty.points}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <p className="eyebrow mb-2">Registro de la sesión</p>
            <div className="scroll-slim max-h-[170px] space-y-1.5 overflow-auto pr-1">
              {session.log.slice().reverse().slice(0, 12).map((entry) => (
                <div key={entry.id} className="flex items-start gap-2">
                  <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${entry.type === "security" ? "bg-[var(--coral)]" : entry.type === "teacher" ? "bg-[var(--amber)]" : "bg-[var(--teal)]"}`} />
                  <div className="min-w-0">
                    <p className="text-[12px] leading-snug text-[var(--ink)]/68">{entry.text}</p>
                    <p className="font-mono text-[10px] text-[var(--ink)]/48">{new Date(entry.at).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        {session.teacherNote?.trim() && (
          <div className="mx-4 mb-4 rounded-xl border border-[var(--amber)]/25 bg-[#f4e8d0] p-3">
            <p className="eyebrow mb-1 text-[#8d621a]">Observación del docente</p>
            <p className="text-[12.5px] leading-relaxed text-[var(--ink)]/74">{session.teacherNote}</p>
          </div>
        )}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-[var(--line)] bg-[var(--white)] px-4 py-3.5">
        <p className="max-w-[520px] text-[12px] leading-relaxed text-[var(--ink)]/62">
          Este informe se actualiza con las acciones del docente. La versión PDF incluye la totalidad de las respuestas y la
          bitácora de seguridad de la sesión {session.code}.
        </p>
        <div className="flex gap-2">
          <button onClick={handlePdf} className="btn btn-ink btn-sm">
            <Icon name="download" size={13} /> Descargar PDF
          </button>
          <button onClick={onExit} className="btn btn-outline btn-sm">
            Finalizar
          </button>
        </div>
      </div>
    </div>
  );
}

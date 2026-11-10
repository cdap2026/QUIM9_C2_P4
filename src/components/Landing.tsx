import { useState, type CSSProperties } from "react";
import { DEMO_TEACHER_KEY, SECURITY_RULES } from "../lib/data";
import { downloadStandaloneHtml } from "../lib/storage";
import { GasLogo, ToastViewport, useToasts } from "./ui";
import { Icon, type IconName } from "./icons";

interface LandingProps {
  onStartStudent: () => void;
  onOpenTeacher: () => void;
}

const PARTICLES = [
  { left: "12%", top: "22%", size: 7, color: "#c8f257", duration: "7s", delay: "0s", dx: "15px", dy: "-20px" },
  { left: "28%", top: "58%", size: 5, color: "#8de6c8", duration: "9s", delay: "1.1s", dx: "-16px", dy: "-13px" },
  { left: "46%", top: "34%", size: 9, color: "#c8f257", duration: "8s", delay: "0.4s", dx: "20px", dy: "16px" },
  { left: "63%", top: "66%", size: 6, color: "#8de6c8", duration: "10s", delay: "1.8s", dx: "-12px", dy: "-22px" },
  { left: "78%", top: "28%", size: 5, color: "#4d9fbe", duration: "7.5s", delay: "0.8s", dx: "-18px", dy: "12px" },
  { left: "86%", top: "58%", size: 8, color: "#c8f257", duration: "9.5s", delay: "2.1s", dx: "10px", dy: "-16px" },
  { left: "18%", top: "80%", size: 4, color: "#4d9fbe", duration: "8.5s", delay: "0.2s", dx: "18px", dy: "-9px" },
  { left: "55%", top: "82%", size: 6, color: "#8de6c8", duration: "7s", delay: "2.6s", dx: "-10px", dy: "-18px" },
  { left: "36%", top: "14%", size: 4, color: "#c8f257", duration: "11s", delay: "1.5s", dx: "14px", dy: "18px" },
  { left: "70%", top: "12%", size: 5, color: "#4d9fbe", duration: "9s", delay: "0.6s", dx: "-16px", dy: "14px" },
  { left: "8%", top: "48%", size: 4, color: "#8de6c8", duration: "8s", delay: "1.9s", dx: "12px", dy: "10px" },
  { left: "92%", top: "40%", size: 4, color: "#c8f257", duration: "10s", delay: "0.9s", dx: "-11px", dy: "19px" },
];

const BLOCKS = [
  {
    number: "01",
    minutes: "18 min",
    title: "Simula y evidencia",
    label: "Bloque experimental",
    icon: "flask" as IconName,
    description:
      "Cuatro simuladores para modificar presión, volumen, temperatura y masa molar. Registra los datos y deduce qué ley gobierna cada fenómeno.",
    bullets: ["Boyle · Charles · Gay-Lussac · Graham", "8 registros mínimos", "Identifica la ley en cada montaje"],
    accent: "#0f766e",
    tint: "#eaf3ec",
  },
  {
    number: "02",
    minutes: "15 min",
    title: "Prueba Saber",
    label: "Selección múltiple",
    icon: "target" as IconName,
    description:
      "Ocho preguntas con contexto experimental y aplicación cotidiana. Alternativas de extensión similar y clave distribuida entre A, B, C y D.",
    bullets: ["Competencias de uso y explicación", "Retroalimentación al finalizar", "Paleta de respuestas variada"],
    accent: "#b7791f",
    tint: "#fdf5e7",
  },
  {
    number: "03",
    minutes: "12 min",
    title: "Aplica en tu entorno",
    label: "Preguntas abiertas",
    icon: "wind" as IconName,
    description:
      "La olla a presión, un globo al sol y una fuga de amoníaco: argumenta con evidencia y propone decisiones seguras para tu comunidad.",
    bullets: ["4 situaciones cotidianas", "Argumentación científica", "Informe PDF descargable"],
    accent: "#0d6383",
    tint: "#e9f2f5",
  },
];

const CONSOLE_STUDENTS = [
  { name: "Valentina Ríos", group: "9°A", block: "Bloque 2", score: "74", tone: "active" as const, initials: "VR" },
  { name: "Santiago Mejía", group: "9°B", block: "Bloque 3", score: "86", tone: "active" as const, initials: "SM" },
  { name: "Isabella Torres", group: "9°A", block: "Finalizó", score: "95", tone: "finished" as const, initials: "IT" },
  { name: "Andrés Cárdenas", group: "9°C", block: "Bloque 1", score: "62", tone: "alert" as const, initials: "AC" },
];

export function Landing({ onStartStudent, onOpenTeacher }: LandingProps) {
  const { toasts, push, remove } = useToasts();
  const [downloading, setDownloading] = useState<"student" | "teacher" | null>(null);

  async function handleDownload(mode: "student" | "teacher") {
    setDownloading(mode);
    try {
      await downloadStandaloneHtml(mode);
      push(mode === "student" ? "Actividad HTML descargada." : "Consola docente HTML descargada.", "success");
    } catch (error) {
      push(error instanceof Error ? error.message : "No se pudo preparar la descarga.", "error");
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div className="dark-grid noise-soft min-h-screen text-white">
      <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-[#052427]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-[64px] max-w-[1180px] items-center justify-between gap-4 px-4 sm:px-6">
          <GasLogo />
          <nav className="hidden items-center gap-1 lg:flex">
            {[
              { label: "La actividad", href: "#actividad" },
              { label: "Bloques", href: "#bloques" },
              { label: "Seguridad", href: "#seguridad" },
              { label: "Descargas", href: "#descargas" },
            ].map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2 text-[13.5px] font-medium text-white/74 transition hover:bg-white/[0.06] hover:text-white"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <span className="hidden sm:block">
              <button onClick={onOpenTeacher} className="btn btn-outline-light btn-sm">
                <Icon name="activity" size={14} />
                Consola docente
              </button>
            </span>
            <button onClick={onStartStudent} className="btn btn-lime btn-sm">
              Iniciar actividad
              <Icon name="arrowRight" size={14} />
            </button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section id="actividad" className="relative overflow-hidden">
          <div className="pointer-events-none absolute -right-40 top-10 h-[420px] w-[420px] rounded-full bg-[var(--lime)]/[0.055] blur-3xl" />
          <div className="mx-auto grid max-w-[1180px] gap-10 px-4 pb-12 pt-10 sm:px-6 sm:pt-14 lg:grid-cols-[0.98fr_1.02fr] lg:gap-8 lg:pb-16 lg:pt-16">
            <div className="relative z-10 flex flex-col justify-center">
              <div className="mb-5 flex flex-wrap items-center gap-2">
                <span className="chip chip-dark !text-[var(--lime)]">
                  <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-[var(--lime)] text-[var(--lime)]" />
                  Actividad lista para el aula
                </span>
                <span className="chip chip-dark">
                  <Icon name="graduation" size={11} />
                  Ciencias Naturales · Grado 9°
                </span>
              </div>
              <h1 className="hero-title max-w-[680px] text-[43px] text-[#f5faee] sm:text-[59px] lg:text-[65px]">
                Las leyes de los gases,{" "}
                <span className="font-serif italic font-normal text-[var(--lime)]">en movimiento.</span>
              </h1>
              <p className="lede-dark mt-5 max-w-[520px] text-[16px] sm:text-[16.5px]">
                Una sesión de laboratorio de <strong className="font-semibold text-white/90">45 minutos</strong> para
                explorar la presión, el volumen, la temperatura y la difusión. Simula, demuestra lo que comprendiste y
                explica cómo estas leyes atraviesan la vida cotidiana.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <button onClick={onStartStudent} className="btn btn-lime btn-lg">
                  <Icon name="play" size={15} strokeWidth={2.2} />
                  Comenzar la actividad
                </button>
                <button onClick={onOpenTeacher} className="btn btn-outline-light btn-lg">
                  <Icon name="activity" size={16} />
                  Monitorear sesiones
                </button>
              </div>

              <div className="mt-7 grid max-w-[520px] grid-cols-3 divide-x divide-white/10 rounded-xl border border-white/[0.08] bg-white/[0.045] py-3.5">
                {[
                  { value: "45", label: "minutos", icon: "clock" as IconName },
                  { value: "3", label: "bloques", icon: "layers" as IconName },
                  { value: "4", label: "simuladores", icon: "flask" as IconName },
                ].map((stat) => (
                  <div key={stat.label} className="min-w-0 px-2 sm:px-4">
                    <div className="flex flex-wrap items-baseline gap-x-1 gap-y-0.5">
                      <span className="font-display text-[23px] font-semibold leading-none tracking-[-0.04em] text-white sm:text-[25.5px]">
                        {stat.value}
                      </span>
                      <span className="text-[9px] uppercase tracking-[0.08em] text-white/75 sm:text-[12px] sm:tracking-[0.12em]">{stat.label}</span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-1 text-[10px] text-[var(--lime)]/85 sm:text-[11.5px]">
                      <Icon name={stat.icon} size={10} />
                      <span>{stat.icon === "clock" ? "Tiempo total" : stat.icon === "layers" ? "Ruta guiada" : "Interactivos"}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-[12px] font-medium text-white/62">
                <span className="inline-flex items-center gap-1.5">
                  <Icon name="lock" size={11} /> Navegación entre pestañas bloqueada
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Icon name="copy" size={11} /> Copiar y pegar restringido
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Icon name="mic" size={11} /> Sonómetro con autorización
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Icon name="file" size={11} /> Informe PDF
                </span>
              </div>
            </div>

            <div className="relative z-10 flex items-center">
              <div className="relative w-full">
                <div className="absolute -left-6 top-[128px] z-20 hidden rounded-xl border border-white/10 bg-[#0b3639]/95 px-3 py-2 shadow-2xl backdrop-blur-xl sm:block floating-card">
                  <div className="flex items-center gap-2">
                    <span className="grid h-7 w-7 place-items-center rounded-lg bg-[var(--lime)]/12 text-[var(--lime)]">
                      <Icon name="gauge" size={14} />
                    </span>
                    <div>
                      <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-white/62">Presión</p>
                      <p className="font-display text-[15px] font-semibold leading-none text-white">
                        3,2 <span className="text-[10.5px] font-normal text-white/62">atm</span>
                      </p>
                    </div>
                  </div>
                </div>
                <div className="absolute -bottom-5 -right-2 z-20 hidden rounded-xl border border-white/10 bg-[#0b3639]/95 px-3 py-2 shadow-2xl backdrop-blur-xl sm:block floating-card-slow">
                  <div className="flex items-center gap-2">
                    <span className="grid h-7 w-7 place-items-center rounded-lg bg-[var(--mint)]/12 text-[var(--mint)]">
                      <Icon name="wind" size={14} />
                    </span>
                    <div>
                      <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-white/62">Difusión</p>
                      <p className="font-display text-[15px] font-semibold leading-none text-white">
                        r ∝ 1/√M
                      </p>
                    </div>
                  </div>
                </div>

                <div className="glass-strong relative overflow-hidden rounded-[26px] p-4 shadow-[0_40px_80px_-45px_rgba(0,0,0,0.9)] sm:p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="relative grid h-8 w-8 place-items-center rounded-lg bg-[var(--lime)] text-[var(--ink)]">
                        <Icon name="flask" size={16} />
                      </div>
                      <div>
                        <p className="font-display text-[14px] font-semibold leading-none text-white">Cámara de gases</p>
                        <p className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.14em] text-white/62">
                          simulador · ley de Boyle
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/20 bg-emerald-300/[0.07] px-2 py-1 font-mono text-[10.5px] uppercase tracking-[0.1em] text-[var(--mint)]">
                      <span className="h-1 w-1 rounded-full bg-[var(--mint)]" />
                      en línea
                    </span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-[1.1fr_0.9fr]">
                    <div className="relative h-[212px] overflow-hidden rounded-[16px] border border-white/10 bg-[#062b2f]">
                      <div className="lab-grid-fine absolute inset-0 opacity-[0.15]" />
                      <div className="absolute left-[44%] right-[44%] top-0 h-[10px] rounded-b bg-white/15" />
                      <div className="absolute left-[36%] right-[36%] top-2 h-[26px] rounded-b-md border border-white/20 bg-gradient-to-b from-[#dbe9dd] to-[#9db7ae]" />
                      <div className="absolute left-3 right-3 top-[58px] h-full rounded-t-lg border-x border-t border-white/15 bg-gradient-to-b from-[var(--lime)]/[0.06] to-[var(--mint)]/[0.1]">
                        {PARTICLES.slice(0, 9).map((particle, index) => (
                          <span
                            key={index}
                            className="gas-particle"
                            style={
                              {
                                left: particle.left,
                                top: `calc(${particle.top} + 14%)`,
                                width: particle.size + 2,
                                height: particle.size + 2,
                                "--particle-color": particle.color,
                                "--duration": particle.duration,
                                "--delay": particle.delay,
                                "--dx": particle.dx,
                                "--dy": particle.dy,
                              } as CSSProperties
                            }
                          />
                        ))}
                      </div>
                      <div className="absolute bottom-2.5 left-3 right-3 flex items-end justify-between">
                        {[
                          { label: "P", value: "3,2 atm" },
                          { label: "V", value: "1,9 L" },
                          { label: "T", value: "298 K" },
                        ].map((metric) => (
                          <div key={metric.label} className="rounded-lg border border-white/10 bg-[#052427]/80 px-2 py-1.5 backdrop-blur">
                            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/62">{metric.label}</p>
                            <p className="mt-0.5 font-mono text-[11.5px] font-medium text-white/80">{metric.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col justify-between gap-3">
                      <div className="rounded-[14px] border border-white/10 bg-white/[0.035] p-3">
                        <div className="mb-1.5 flex items-center justify-between">
                          <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-white/62">P vs. V</p>
                          <span className="font-mono text-[10.5px] text-[var(--lime)]">PV = k</span>
                        </div>
                        <svg viewBox="0 0 180 84" className="h-[72px] w-full" aria-hidden="true">
                          {[18, 38, 58].map((y) => (
                            <line key={y} x1="8" y1={y} x2="172" y2={y} stroke="rgba(255,255,255,.07)" strokeDasharray="2 4" />
                          ))}
                          <line x1="8" y1="70" x2="172" y2="70" stroke="rgba(255,255,255,.16)" />
                          <line x1="8" y1="10" x2="8" y2="70" stroke="rgba(255,255,255,.16)" />
                          <path
                            d="M18 18 C34 40, 50 55, 78 62 S138 67.5, 168 69"
                            fill="none"
                            stroke="#c8f257"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                          />
                          <circle cx="60" cy="58" r="3.4" fill="#c8f257" stroke="#062b2f" strokeWidth="1.5" />
                          <text x="66" y="50" fill="rgba(255,255,255,.55)" fontSize="6" fontFamily="monospace">
                            punto registrado
                          </text>
                        </svg>
                      </div>
                      <div className="rounded-[14px] border border-white/10 bg-white/[0.035] p-3">
                        <div className="flex items-center gap-2">
                          <span className="grid h-6 w-6 place-items-center rounded-md bg-[var(--lime)]/10 text-[var(--lime)]">
                            <Icon name="spark" size={12} />
                          </span>
                          <div>
                            <p className="font-display text-[12.5px] font-semibold text-white/90">A mayor presión, menor volumen</p>
                            <p className="mt-0.5 text-[11px] leading-relaxed text-white/62">T y n permanecen constantes.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between rounded-[12px] border border-white/[0.08] bg-white/[0.03] px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-[var(--lime)]" />
                      <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-white/62">Registro 02 / 08</span>
                    </div>
                    <span className="font-mono text-[10.5px] text-[var(--mint)]">ley identificada ✓</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-y border-white/[0.07] bg-white/[0.018]">
            <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-center gap-x-8 gap-y-3 px-6 py-3.5 sm:justify-between">
              {[
                { law: "Boyle", formula: "P · V = k", color: "text-[var(--mint)]" },
                { law: "Charles", formula: "V / T = k", color: "text-[var(--amber)]" },
                { law: "Gay-Lussac", formula: "P / T = k", color: "text-[var(--coral)]" },
                { law: "Graham", formula: "r ∝ 1/√M", color: "text-[#7cc4de]" },
              ].map((item) => (
                <div key={item.law} className="flex items-center gap-2">
                  <span className={`font-display text-[12.5px] font-semibold uppercase tracking-[0.12em] ${item.color}`}>{item.law}</span>
                  <span className="h-3 w-px bg-white/10" />
                  <span className="font-mono text-[12px] text-white/62">{item.formula}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Bloques */}
        <section id="bloques" className="relative mx-auto max-w-[1180px] px-4 py-14 sm:px-6 sm:py-16">
          <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="eyebrow eyebrow-dark mb-2">
                <Icon name="layers" size={11} /> Ruta de aprendizaje
              </p>
              <h2 className="font-display text-[31.5px] font-semibold leading-[1.05] tracking-[-0.04em] sm:text-[37.5px]">
                Una sesión, <span className="font-serif italic font-normal text-[var(--lime)]">tres movimientos.</span>
              </h2>
            </div>
            <p className="max-w-[345px] text-[14px] leading-relaxed text-white/62">
              La secuencia avanza de la exploración guiada a la aplicación argumentada. Cada bloque se
              desbloquea cuando el anterior está completo o cuando el docente lo autoriza.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {BLOCKS.map((block, index) => (
              <article
                key={block.number}
                className="group glass relative flex flex-col overflow-hidden rounded-[22px] p-5 transition duration-300 hover:-translate-y-1 hover:border-white/20"
              >
                <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/[0.035] blur-xl" />
                <div className="mb-5 flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="grid h-10 w-10 place-items-center rounded-xl border"
                      style={{ background: "rgba(255,255,255,0.06)", color: block.accent === "#0f766e" ? "#8de6c8" : block.accent === "#b7791f" ? "#f3c476" : "#92d6e8", borderColor: "rgba(255,255,255,0.12)" }}
                    >
                      <Icon name={block.icon} size={19} />
                    </span>
                    <div>
                      <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-white/55">{block.label}</p>
                      <p className="font-display text-[13px] font-semibold text-white/80">{block.number} / 03</p>
                    </div>
                  </div>
                  <span className="chip chip-dark !text-white/68">
                    <Icon name="clock" size={10} /> {block.minutes}
                  </span>
                </div>
                <h3 className="font-display text-[20.5px] font-semibold tracking-[-0.03em] text-white">{block.title}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-white/62">{block.description}</p>
                <ul className="mt-4 space-y-1.5 border-t border-white/[0.08] pt-3.5">
                  {block.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-2 text-[12.5px] text-white/74">
                      <Icon name="check" size={11} className="mt-0.5 shrink-0 text-[var(--lime)]" strokeWidth={2.4} />
                      {bullet}
                    </li>
                  ))}
                </ul>
                <div className="mt-4 flex items-center justify-between">
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-white/55">Bloque {index + 1}</span>
                  <button
                    onClick={onStartStudent}
                    className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-[var(--lime)]/80 transition group-hover:text-[var(--lime)]"
                  >
                    Explorar <Icon name="arrowRight" size={12} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Consola docente */}
        <section className="relative border-y border-white/[0.07] bg-white/[0.018]">
          <div className="mx-auto grid max-w-[1180px] items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14">
            <div>
              <p className="eyebrow eyebrow-dark mb-2">
                <Icon name="activity" size={11} /> Acompañamiento en tiempo real
              </p>
              <h2 className="font-display text-[31.5px] font-semibold leading-[1.07] tracking-[-0.04em] sm:text-[35.5px]">
                Un aula que se puede{" "}
                <span className="font-serif italic font-normal text-[var(--lime)]">leer mientras ocurre.</span>
              </h2>
              <p className="lede-dark mt-4 max-w-[420px] text-[14.5px]">
                La consola reúne el avance de cada estudiante, las alertas de seguridad y el estado del sonómetro.
                Puedes desbloquear bloques, ampliar el tiempo y retirar penalizaciones de forma individual.
              </p>
              <div className="mt-5 space-y-2.5">
                {[
                  { icon: "users" as IconName, title: "Progreso individual", text: "Bloque activo, puntaje, tiempo y última conexión." },
                  { icon: "shield" as IconName, title: "Alertas de integridad", text: "Intentos de copiar, pegar o saltar de bloque, con trazabilidad." },
                  { icon: "volume" as IconName, title: "Sonómetro autorizado", text: "Actívalo solo para el estudiante que necesites; mide dB, no audio." },
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] p-3">
                    <span className="mt-0.5 text-[var(--mint)]">
                      <Icon name={item.icon} size={16} />
                    </span>
                    <div>
                      <p className="text-[13.5px] font-semibold text-white/86">{item.title}</p>
                      <p className="mt-0.5 text-[12.5px] leading-relaxed text-white/62">{item.text}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={onOpenTeacher} className="btn btn-lime mt-5">
                <Icon name="activity" size={14} />
                Abrir consola docente
              </button>
            </div>

            <div className="relative">
              <div className="console-card overflow-hidden rounded-[22px]">
                <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="grid h-6 w-6 place-items-center rounded-md bg-[var(--lime)]/10 text-[var(--lime)]">
                      <Icon name="activity" size={13} />
                    </span>
                    <div>
                      <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-white/55">monitor de sesión</p>
                      <p className="font-display text-[13px] font-semibold text-white/86">Ciencias Naturales · 9°</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--lime)]/20 bg-[var(--lime)]/[0.06] px-2 py-1 font-mono text-[10.5px] uppercase tracking-[0.1em] text-[var(--lime)]">
                    <span className="h-1 w-1 rounded-full bg-[var(--lime)]" />
                    4 conectados
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 border-b border-white/[0.07] px-4 py-3">
                  {[
                    { label: "En actividad", value: "3" },
                    { label: "Finalizaron", value: "1" },
                    { label: "Alertas", value: "2", accent: true },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-lg border border-white/[0.07] bg-white/[0.025] px-2.5 py-2">
                      <p className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-white/55">{stat.label}</p>
                      <p className={`mt-0.5 font-display text-[18.5px] font-semibold leading-none ${stat.accent ? "text-[var(--amber)]" : "text-white/90"}`}>
                        {stat.value}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="p-2">
                  {CONSOLE_STUDENTS.map((student) => (
                    <div key={student.name} className="teacher-row flex items-center gap-2.5 rounded-lg px-2.5 py-2.5">
                      <span
                        className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg font-display text-[11.5px] font-bold ${
                          student.tone === "finished" ? "bg-[var(--mint)]/15 text-[var(--mint)]" : student.tone === "alert" ? "bg-[var(--amber)]/15 text-[var(--amber)]" : "bg-white/10 text-white/70"
                        }`}
                      >
                        {student.initials}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-[12.5px] font-medium text-white/84">{student.name}</p>
                          <span className="font-mono text-[10.5px] text-white/55">{student.score} pts</span>
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-white/55">
                            {student.group} · {student.block}
                          </span>
                          <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/[0.08]">
                            <div
                              className="h-full rounded-full bg-[var(--lime)]/80"
                              style={{ width: student.tone === "finished" ? "100%" : student.tone === "alert" ? "34%" : "68%" }}
                            />
                          </div>
                        </div>
                      </div>
                      <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                          student.tone === "finished" ? "bg-[var(--mint)]" : student.tone === "alert" ? "bg-[var(--amber)]" : "bg-[var(--lime)]"
                        }`}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between gap-2 border-t border-white/[0.08] px-4 py-2.5">
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-white/55">sonómetro · Valentina Ríos</span>
                  <div className="flex items-center gap-2">
                    <div className="flex h-4 items-end gap-[2px]">
                      {[4, 9, 14, 7, 12, 16, 6, 11, 8].map((height, index) => (
                        <span
                          key={index}
                          className="w-[3px] rounded-sm"
                          style={{ height, background: index > 6 ? "#c8f257" : "rgba(200,242,87,.35)" }}
                        />
                      ))}
                    </div>
                    <span className="font-mono text-[11.5px] text-[var(--lime)]">52 dB</span>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-4 -right-3 hidden rounded-xl border border-white/10 bg-[#0b3639] px-3 py-2 shadow-2xl sm:block">
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/55">Penalización retirada</p>
                <p className="mt-0.5 flex items-center gap-1 text-[12px] font-medium text-[var(--mint)]">
                  <Icon name="check" size={10} strokeWidth={2.5} /> Sesión restablecida
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Seguridad + descargas */}
        <section id="seguridad" className="mx-auto max-w-[1180px] px-4 py-14 sm:px-6 sm:py-16">
          <div className="grid gap-10 lg:grid-cols-[1fr_0.94fr] lg:gap-14">
            <div>
              <p className="eyebrow eyebrow-dark mb-2">
                <Icon name="shield" size={11} /> Integridad de la actividad
              </p>
              <h2 className="font-display text-[31.5px] font-semibold leading-[1.07] tracking-[-0.04em] sm:text-[35.5px]">
                Reglas claras,{" "}
                <span className="font-serif italic font-normal text-[var(--lime)]">evidencia transparente.</span>
              </h2>
              <p className="lede-dark mt-3 max-w-[430px] text-[14px]">
                Las medidas no buscan vigilar, sino proteger la validez del aprendizaje y dar al docente
                información útil para intervenir a tiempo.
              </p>
              <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
                {SECURITY_RULES.map((rule, index) => (
                  <div key={rule.title} className="glass rounded-xl p-3.5">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="grid h-7 w-7 place-items-center rounded-lg bg-white/[0.06] text-[var(--lime)]">
                        <Icon
                          name={(["lock", "copy", "refresh", "mic"] as IconName[])[index]}
                          size={13}
                        />
                      </span>
                      <span className="font-mono text-[10.5px] text-white/45">0{index + 1}</span>
                    </div>
                    <p className="text-[13px] font-semibold text-white/85">{rule.title}</p>
                    <p className="mt-1 text-[12px] leading-relaxed text-white/62">{rule.text}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-start gap-3 rounded-xl border border-[var(--amber)]/20 bg-[var(--amber)]/[0.055] p-3.5">
                <span className="mt-0.5 text-[var(--amber)]">
                  <Icon name="key" size={16} />
                </span>
                <div>
                  <p className="text-[13px] font-semibold text-[var(--amber)]">Control docente y eliminación de penalizaciones</p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-white/62">
                    El docente puede retirar sanciones, desbloquear bloques o ampliar el tiempo desde la consola.
                    En la actividad, el panel de control se abre con la clave de demostración{" "}
                    <code className="rounded bg-black/30 px-1.5 py-0.5 font-mono text-[12px] text-[var(--lime)]">{DEMO_TEACHER_KEY}</code>.
                  </p>
                </div>
              </div>
            </div>

            <div id="descargas" className="scroll-mt-24">
              <p className="eyebrow eyebrow-dark mb-2">
                <Icon name="download" size={11} /> Archivos autónomos
              </p>
              <h2 className="font-display text-[27.5px] font-semibold leading-[1.1] tracking-[-0.04em] sm:text-[31.5px]">
                Dos HTML.{" "}
                <span className="font-serif italic font-normal text-[var(--lime)]">Cero instalación.</span>
              </h2>
              <p className="mt-3 max-w-[440px] text-[13.5px] leading-relaxed text-white/62">
                Descarga cada archivo y súbelos a un repositorio con GitHub Pages. Comparten las sesiones del
                mismo origen: abre la actividad en un dispositivo y la consola en otro, o simula el aula con las
                sesiones de demostración incluidas.
              </p>

              <div className="mt-5 space-y-3">
                <div className="glass rounded-2xl p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--lime)]/10 text-[var(--lime)]">
                        <Icon name="file" size={18} />
                      </span>
                      <div>
                        <p className="font-display text-[15px] font-semibold text-white">Actividad del estudiante</p>
                        <p className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.1em] text-white/55">
                          actividad-leyes-gases-9.html
                        </p>
                        <p className="mt-1.5 max-w-[270px] text-[12.5px] leading-relaxed text-white/62">
                          Reto de 45 min con simuladores, Saber, preguntas abiertas e informe PDF.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDownload("student")}
                      disabled={downloading !== null}
                      className="btn btn-lime btn-sm"
                    >
                      {downloading === "student" ? <span className="spinner" /> : <Icon name="download" size={13} />}
                      Descargar
                    </button>
                  </div>
                </div>

                <div className="glass rounded-2xl p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--mint)]/10 text-[var(--mint)]">
                        <Icon name="activity" size={18} />
                      </span>
                      <div>
                        <p className="font-display text-[15px] font-semibold text-white">Consola de monitoreo</p>
                        <p className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.1em] text-white/55">
                          consola-docente-gases-9.html
                        </p>
                        <p className="mt-1.5 max-w-[270px] text-[12.5px] leading-relaxed text-white/62">
                          Progreso, respuestas, bitácora, penalizaciones, sonómetro y PDF grupal.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDownload("teacher")}
                      disabled={downloading !== null}
                      className="btn btn-outline-light btn-sm"
                    >
                      {downloading === "teacher" ? <span className="spinner spinner-light" /> : <Icon name="download" size={13} />}
                      Descargar
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-start gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] p-3">
                <Icon name="info" size={12} className="mt-0.5 shrink-0 text-[var(--mint)]/70" />
                <p className="text-[12px] leading-relaxed text-white/62">
                  La sincronización usa el almacenamiento del navegador entre pestañas del mismo dominio. Para
                  despliegue en GitHub Pages, sube ambos archivos a la misma raíz. Cuando el sonómetro se activa,
                  el estudiante debe autorizar el micrófono; solo se comparte el nivel en dB.
                </p>
              </div>

              <details className="group mt-3 rounded-xl border border-white/[0.08] bg-white/[0.025]">
                <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2.5">
                  <span className="flex items-center gap-2 text-[12.5px] font-semibold text-white/74">
                    <Icon name="code" size={12} className="text-[var(--lime)]/75" /> Cómo publicarlo en GitHub Pages
                  </span>
                  <Icon name="chevronDown" size={12} className="text-white/55 transition group-open:rotate-180" />
                </summary>
                <ol className="space-y-1.5 border-t border-white/[0.07] px-3 py-2.5 text-[11.5px] leading-relaxed text-white/62">
                  <li><span className="mr-1 font-mono text-[var(--lime)]/70">01</span> Crea un repositorio público y sube <span className="font-mono text-white/74">index.html</span> (la actividad) y <span className="font-mono text-white/74">consola-docente-gases-9.html</span>.</li>
                  <li><span className="mr-1 font-mono text-[var(--lime)]/70">02</span> En Settings → Pages elige la rama principal y la carpeta raíz.</li>
                  <li><span className="mr-1 font-mono text-[var(--lime)]/70">03</span> Comparte el enlace de la actividad; la consola abre desde <span className="font-mono text-white/74">/#docente</span> en el mismo dominio.</li>
                  <li><span className="mr-1 font-mono text-[var(--lime)]/70">04</span> Para monitorear desde otro equipo, ambos deben estar en el mismo navegador; si no, la consola funciona en modo local con las sesiones de su dispositivo.</li>
                </ol>
              </details>

              <div className="mt-3 flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase tracking-[0.1em] text-white/55">
                <span className="rounded border border-white/10 px-1.5 py-1">sin backend</span>
                <span className="rounded border border-white/10 px-1.5 py-1">sin dependencias</span>
                <span className="rounded border border-white/10 px-1.5 py-1">offline-first</span>
                <span className="rounded border border-white/10 px-1.5 py-1">responsive</span>
              </div>
            </div>
          </div>
        </section>

        {/* Franja final */}
        <section className="border-t border-white/[0.07]">
          <div className="mx-auto flex max-w-[1180px] flex-col items-start justify-between gap-5 px-4 py-9 sm:flex-row sm:items-center sm:px-6">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--lime)] text-[var(--ink)]">
                <Icon name="flask" size={19} />
              </div>
              <div>
                <p className="font-display text-[16px] font-semibold tracking-[-0.02em]">¿Listo para abrir el laboratorio?</p>
                <p className="mt-0.5 text-[12.5px] text-white/62">45 minutos · Grado 9° · Leyes de los gases y difusión</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={onStartStudent} className="btn btn-lime">
                Entrar como estudiante <Icon name="arrowRight" size={14} />
              </button>
              <button onClick={onOpenTeacher} className="btn btn-outline-light">
                <Icon name="activity" size={14} /> Consola docente
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/[0.07] bg-[#041d20]">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-5 px-4 py-7 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-4">
            <GasLogo compact />
            <span className="hidden h-4 w-px bg-white/10 md:block" />
            <p className="text-[12px] text-white/55">
              Recurso educativo · Leyes de los gases y difusión · Grado 9°
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-[12px] text-white/62">
            <button onClick={onStartStudent} className="transition hover:text-white/70">Actividad</button>
            <button onClick={onOpenTeacher} className="transition hover:text-white/70">Consola docente</button>
            <a href="#descargas" className="transition hover:text-white/70">Descargas</a>
            <span className="inline-flex items-center gap-1 text-[var(--lime)]/60">
              <Icon name="code" size={10} /> HTML autónomo
            </span>
          </div>
        </div>
      </footer>

      <ToastViewport toasts={toasts} onClose={remove} />
    </div>
  );
}

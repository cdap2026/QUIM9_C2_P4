import { useMemo, useState, type CSSProperties } from "react";
import { EXPERIMENTS, EXPERIMENT_BRIEF, LAWS, SIM_GASES } from "../../lib/data";
import type { Evidence, LawKey } from "../../lib/types";
import { Icon, type IconName } from "../icons";

const gasColors: Record<string, string> = {
  nh3: "#3fae8f",
  hcl: "#d9a13d",
  h2: "#5fa8c9",
  o2: "#d96c58",
  co2: "#9b8fc4",
  he: "#9dc53f",
};

const lawIcons: Record<LawKey, IconName> = {
  boyle: "piston",
  charles: "balloon",
  gaylussac: "gauge",
  graham: "wind",
};

const CLOUD = [
  [12, 22], [26, 54], [41, 18], [55, 64], [68, 31], [82, 55], [20, 78], [36, 42],
  [49, 85], [61, 15], [74, 73], [88, 38], [14, 60], [31, 30], [45, 50], [58, 88],
  [70, 52], [84, 18], [24, 12], [52, 34], [77, 82], [92, 66], [8, 38], [38, 70],
];

interface Props {
  records: Evidence[];
  laws: Partial<Record<LawKey, LawKey>>;
  onAddRecord: (exp: LawKey, p: number, v: number, t: number, note: string) => boolean;
  onLaw: (exp: LawKey, law: LawKey) => void;
  pushToast: (message: string, kind?: "success" | "error" | "warning" | "info") => void;
  disabled?: boolean;
}

export function formatEvidence(record: Evidence): string {
  if (record.exp === "graham") return record.note;
  return `P = ${record.p.toFixed(2)} atm · V = ${record.v.toFixed(2)} L · T = ${Math.round(record.t)} K`;
}

export function SimulationLab({ records, laws, onAddRecord, onLaw, pushToast, disabled }: Props) {
  const [active, setActive] = useState<LawKey>("boyle");
  const [boyleV, setBoyleV] = useState(2);
  const [charlesT, setCharlesT] = useState(300);
  const [gayT, setGayT] = useState(300);
  const [gasA, setGasA] = useState("nh3");
  const [gasB, setGasB] = useState("hcl");
  const [grahamT, setGrahamT] = useState(298);
  const [showHint, setShowHint] = useState(false);

  const boyleP = 6 / boyleV;
  const charlesV = charlesT / 10;
  const gayP = 0.008 * gayT;
  const massA = SIM_GASES.find((gas) => gas.id === gasA)?.mass ?? 17;
  const massB = SIM_GASES.find((gas) => gas.id === gasB)?.mass ?? 36.5;
  const speedA = 1 / Math.sqrt(massA);
  const speedB = 1 / Math.sqrt(massB);
  const ratio = speedA / speedB;
  const meet = (100 * speedA) / (speedA + speedB);
  const arrival = ((0.62 * Math.sqrt((massA + massB) / 2)) * (298 / grahamT)).toFixed(1);

  const counts = useMemo(() => {
    const map = {} as Record<LawKey, number>;
    EXPERIMENTS.forEach((key) => {
      map[key] = records.filter((record) => record.exp === key).length;
    });
    return map;
  }, [records]);

  const selectedLaw = laws[active];
  const isCorrect = selectedLaw === active;
  const brief = EXPERIMENT_BRIEF[active];

  const readings = {
    boyle: { main: `${boyleV.toFixed(1)} L`, side: `${boyleP.toFixed(2)} atm`, third: "298 K" },
    charles: { main: `${charlesT} K`, side: `${charlesV.toFixed(1)} L`, third: "1,00 atm" },
    gaylussac: { main: `${gayT} K`, side: `${gayP.toFixed(2)} atm`, third: "5,00 L" },
    graham: { main: `${meet.toFixed(0)} cm`, side: `${ratio.toFixed(2)}×`, third: `${grahamT} K` },
  }[active];

  function handleRecord() {
    if (disabled) return;
    let ok = false;
    if (active === "boyle") {
      ok = onAddRecord("boyle", boyleP, boyleV, 298, `V = ${boyleV.toFixed(1)} L · P = ${boyleP.toFixed(2)} atm`);
    } else if (active === "charles") {
      ok = onAddRecord("charles", 1, charlesV, charlesT, `T = ${charlesT} K · V = ${charlesV.toFixed(1)} L`);
    } else if (active === "gaylussac") {
      ok = onAddRecord("gaylussac", gayP, 5, gayT, `T = ${gayT} K · P = ${gayP.toFixed(2)} atm`);
    } else {
      const gasALabel = SIM_GASES.find((gas) => gas.id === gasA)?.formula ?? gasA;
      const gasBLabel = SIM_GASES.find((gas) => gas.id === gasB)?.formula ?? gasB;
      ok = onAddRecord(
        "graham",
        massA,
        massB,
        grahamT,
        `${gasALabel} (${massA} g/mol) + ${gasBLabel} (${massB} g/mol) · encuentro a ${meet.toFixed(0)} cm · ${grahamT} K`
      );
    }
    if (ok) pushToast("Medición añadida al cuaderno de laboratorio.", "success");
    else pushToast("Cambia al menos una variable antes de registrar otra medición.", "warning");
  }

  return (
    <div className="paper-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] px-4 py-3.5 sm:px-5">
        <div className="flex items-center gap-2.5">
          <div className="icon-badge !bg-[var(--ink)] !text-[var(--lime)] !border-transparent">
            <Icon name="flask" size={17} />
          </div>
          <div>
            <p className="eyebrow mb-0.5">Mesa de simulación</p>
            <h3 className="font-display text-[16.5px] font-semibold tracking-[-0.02em]">Explora, registra y deduce</h3>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="text-right">
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-[var(--ink)]/62">Evidencia</p>
            <p className="font-mono text-[13px] font-medium">{records.length} / 8 registros</p>
          </div>
          <div className="h-8 w-24">
            <div className="progress-track mt-3 !h-[5px]">
              <div className="progress-fill" style={{ width: `${Math.min(100, (records.length / 8) * 100)}%` }} />
            </div>
            <p className="mt-1 text-right font-mono text-[10.5px] text-[var(--ink)]/55">{Math.min(8, records.length)} de 8 mínimos</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1.5 border-b border-[var(--line)] bg-[var(--card-soft)] p-2 sm:grid-cols-4">
        {EXPERIMENTS.map((key) => {
          const done = counts[key] >= 2 && laws[key] === key;
          return (
            <button
              key={key}
              onClick={() => {
                setShowHint(false);
                setActive(key);
              }}
              data-active={active === key}
              className={`group flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition ${
                active === key
                  ? "border-[var(--teal)]/30 bg-[var(--card)] shadow-sm"
                  : "border-transparent bg-transparent hover:border-[var(--line)] hover:bg-white/60"
              }`}
            >
              <span
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-md transition ${
                  active === key ? "bg-[var(--teal)] text-white" : "bg-[var(--card)] text-[var(--ink)]/62 group-hover:text-[var(--teal)]"
                }`}
              >
                <Icon name={lawIcons[key]} size={14} />
              </span>
              <div className="min-w-0 flex-1">
                <p className={`truncate text-[12.5px] font-semibold ${active === key ? "text-[var(--ink)]" : "text-[var(--ink)]/74"}`}>
                  {key === "gaylussac" ? "Gay-Lussac" : key === "graham" ? "Difusión" : LAWS[key].short}
                </p>
                <p className="mt-0.5 font-mono text-[10.5px] text-[var(--ink)]/55">
                  {counts[key]} reg. {done ? "· ✓" : ""}
                </p>
              </div>
              {done && <Icon name="check" size={11} className="text-[var(--teal)]" strokeWidth={2.5} />}
            </button>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-[1.06fr_0.94fr]">
        <div className="border-b border-[var(--line)] p-4 sm:p-5 lg:border-b-0 lg:border-r">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="kicker-number mb-1">MONTAJE {String(EXPERIMENTS.indexOf(active) + 1).padStart(2, "0")} / 04</p>
              <h4 className="font-display text-[18.5px] font-semibold tracking-[-0.025em]">{brief.title}</h4>
              <p className="mt-1 text-[13px] leading-relaxed text-[var(--ink)]/68">{brief.prompt}</p>
            </div>
            <button
              onClick={() => setShowHint((current) => !current)}
              className="chip chip-teal shrink-0 transition hover:bg-[var(--lime-soft)]"
            >
              <Icon name="spark" size={11} />
              {showHint ? "Ocultar pista" : "Pista"}
            </button>
          </div>

          {showHint && (
            <div className="mb-3 flex items-start gap-2 rounded-lg border border-[var(--teal)]/15 bg-[var(--mist)] px-3 py-2.5">
              <Icon name="info" size={13} className="mt-0.5 shrink-0 text-[var(--teal)]" />
              <p className="text-[12.5px] leading-relaxed text-[var(--ink)]/74">{brief.hint}</p>
            </div>
          )}

          <div className="relative overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--card-soft)] lab-grid-fine">
            {active === "boyle" && <BoyleVisual volume={boyleV} pressure={boyleP} />}
            {active === "charles" && <CharlesVisual temperature={charlesT} volume={charlesV} />}
            {active === "gaylussac" && <GayVisual temperature={gayT} pressure={gayP} />}
            {active === "graham" && (
              <GrahamVisual gasA={gasA} gasB={gasB} meet={meet} temperature={grahamT} ratio={ratio} />
            )}
            <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded border border-[var(--line)] bg-white/85 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--ink)]/62 backdrop-blur">
              <span className="h-1 w-1 rounded-full bg-[var(--teal)]" />
              simulación en vivo
            </span>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            {[
              { label: active === "graham" ? "Punto de encuentro" : active === "boyle" ? "Volumen" : "Temperatura", value: readings.main },
              { label: active === "graham" ? "Razón de velocidades" : active === "boyle" ? "Presión" : active === "charles" ? "Volumen" : "Presión", value: readings.side },
              { label: active === "graham" ? "Temperatura" : "Constante", value: readings.third },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border border-[var(--line)] bg-white/60 px-2.5 py-2">
                <p className="truncate text-[10.5px] font-semibold uppercase tracking-[0.09em] text-[var(--ink)]/55">{item.label}</p>
                <p className="mt-0.5 font-mono text-[13px] font-medium text-[var(--ink)]">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <div className="rounded-xl border border-[var(--line)] bg-[var(--card-soft)] p-3.5">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="eyebrow mb-0.5">Variables del montaje</p>
                <p className="text-[12.5px] text-[var(--ink)]/62">{brief.fixed}</p>
              </div>
              <span className="chip shrink-0">
                <Icon name="activity" size={10} /> n fijo
              </span>
            </div>

            {active === "boyle" && (
              <Slider
                label="Volumen del gas"
                unit="L"
                min={0.5}
                max={6}
                step={0.1}
                value={boyleV}
                onChange={setBoyleV}
                color="#0f766e"
                left="6,0 L → 1,0 atm"
                right="0,5 L → 12 atm"
                disabled={disabled}
              />
            )}

            {active === "charles" && (
              <Slider
                label="Temperatura absoluta"
                unit="K"
                min={200}
                max={500}
                step={5}
                value={charlesT}
                onChange={setCharlesT}
                color="#d97706"
                left="200 K · frío"
                right="500 K · calor"
                disabled={disabled}
              />
            )}

            {active === "gaylussac" && (
              <Slider
                label="Temperatura del tanque"
                unit="K"
                min={200}
                max={500}
                step={5}
                value={gayT}
                onChange={setGayT}
                color="#be123c"
                left="200 K"
                right="500 K"
                disabled={disabled}
              />
            )}

            {active === "graham" && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="field-label" htmlFor="gas-a">Gas del extremo A</label>
                    <select id="gas-a" className="select !py-2 text-[13px]" value={gasA} onChange={(event) => setGasA(event.target.value)} disabled={disabled}>
                      {SIM_GASES.map((gas) => (
                        <option key={gas.id} value={gas.id}>{gas.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="field-label" htmlFor="gas-b">Gas del extremo B</label>
                    <select id="gas-b" className="select !py-2 text-[13px]" value={gasB} onChange={(event) => setGasB(event.target.value)} disabled={disabled}>
                      {SIM_GASES.map((gas) => (
                        <option key={gas.id} value={gas.id}>{gas.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <Slider
                  label="Temperatura del tubo"
                  unit="K"
                  min={200}
                  max={500}
                  step={5}
                  value={grahamT}
                  onChange={setGrahamT}
                  color="#0369a1"
                  left="200 K"
                  right="500 K"
                  disabled={disabled}
                />
                <div className="grid grid-cols-2 gap-2 font-mono text-[11.5px] text-[var(--ink)]/68">
                  <span className="rounded border border-[var(--line)] bg-[var(--card)] px-2 py-1.5">M(A) = {massA} g/mol</span>
                  <span className="rounded border border-[var(--line)] bg-[var(--card)] px-2 py-1.5">M(B) = {massB} g/mol</span>
                  <span className="rounded border border-[var(--line)] bg-[var(--card)] px-2 py-1.5">t ≈ {arrival} s</span>
                  <span className="rounded border border-[var(--line)] bg-[var(--card)] px-2 py-1.5">r(A)/r(B) = {ratio.toFixed(2)}</span>
                </div>
              </div>
            )}

            <button onClick={handleRecord} disabled={disabled} className="btn btn-ink mt-3 w-full">
              <Icon name="plus" size={14} strokeWidth={2.1} />
              Registrar esta medición
            </button>
            <p className="mt-1.5 text-center text-[11px] text-[var(--ink)]/55">
              Necesitas 2 mediciones por experimento. Cambia una variable antes de registrar.
            </p>
          </div>

          <div className="mt-3.5">
            <div className="mb-2 flex items-center justify-between">
              <p className="eyebrow">¿Qué ley explica el montaje?</p>
              {isCorrect && (
                <span className="chip chip-lime">
                  <Icon name="check" size={10} strokeWidth={2.5} /> identificada
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {EXPERIMENTS.map((key) => {
                const isSelected = selectedLaw === key;
                const isTheKey = key === active;
                return (
                  <button
                    key={key}
                    onClick={() => {
                      onLaw(active, key);
                      pushToast(
                        isTheKey
                          ? `Correcto: ${LAWS[active].name}.`
                          : "Revisa la magnitud que cambia y la que se mantiene constante.",
                        isTheKey ? "success" : "warning"
                      );
                    }}
                    disabled={disabled}
                    className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition ${
                      isSelected
                        ? isTheKey
                          ? "border-[var(--teal)] bg-[#e4efe0]"
                          : "border-[var(--coral)]/40 bg-[#f6e4dd]"
                        : "border-[var(--line)] bg-[var(--card)] hover:border-[var(--teal)]/30"
                    }`}
                  >
                    <span
                      className={`grid h-6 w-6 shrink-0 place-items-center rounded-md ${
                        isSelected
                          ? isTheKey
                            ? "bg-[var(--teal)] text-white"
                            : "bg-[var(--coral)] text-white"
                          : "bg-[var(--card-soft)] text-[var(--ink)]/62"
                      }`}
                    >
                      <Icon name={lawIcons[key]} size={12} />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[12.5px] font-semibold">{LAWS[key].short}</p>
                      <p className="truncate font-mono text-[10.5px] text-[var(--ink)]/55">{LAWS[key].equation}</p>
                    </div>
                    {isSelected && (
                      <Icon name={isTheKey ? "check" : "x"} size={11} className="ml-auto shrink-0" strokeWidth={2.3} />
                    )}
                  </button>
                );
              })}
            </div>
            {selectedLaw && (
              <div
                className={`mt-2 flex items-start gap-2 rounded-lg border px-2.5 py-2 text-[12px] leading-relaxed ${
                  isCorrect
                    ? "border-[var(--teal)]/15 bg-[var(--mist)] text-[var(--ink)]/74"
                    : "border-[var(--amber)]/25 bg-[#f4e8d0] text-[var(--ink)]/74"
                }`}
              >
                <Icon name={isCorrect ? "check" : "info"} size={12} className="mt-0.5 shrink-0" />
                <p>
                  {isCorrect
                    ? LAWS[active].description
                    : `Aún no es ${LAWS[selectedLaw].name}. Observa: ${brief.fixed.toLowerCase()}.`}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-[var(--line)] bg-[var(--card-soft)] px-4 py-4 sm:px-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Icon name="clipboard" size={14} className="text-[var(--teal)]" />
            <p className="text-[13.5px] font-semibold">Cuaderno de evidencias</p>
            <span className="chip !py-0.5">{records.length} filas</span>
          </div>
          <p className="text-[11.5px] text-[var(--ink)]/62">Autoguardado por medición</p>
        </div>
        {records.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-[var(--line)] bg-white/45 px-4 py-7 text-center">
            <Icon name="clipboard" size={20} className="text-[var(--ink)]/48" />
            <p className="text-[13px] font-medium text-[var(--ink)]/68">Tu cuaderno está en blanco</p>
            <p className="max-w-[320px] text-[12px] leading-relaxed text-[var(--ink)]/55">
              Ajusta una variable en el simulador y pulsa “Registrar esta medición”. Repite el proceso en los cuatro montajes.
            </p>
          </div>
        ) : (
          <div className="scroll-slim max-h-[220px] overflow-auto rounded-xl border border-[var(--line)] bg-[var(--card)]">
            <table className="w-full border-collapse text-left">
              <thead className="sticky top-0 bg-[var(--mist)]">
                <tr>
                  {["#", "Experimento", "Datos registrados", "Inferencia"].map((header) => (
                    <th key={header} className="px-3 py-2 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[var(--ink)]/62">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records
                  .slice()
                  .reverse()
                  .map((record, index) => (
                    <tr key={record.id} className="border-t border-[var(--line-soft)]">
                      <td className="px-3 py-2 font-mono text-[11.5px] text-[var(--ink)]/55">
                        {String(records.length - index).padStart(2, "0")}
                      </td>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center gap-1.5 text-[12px] font-medium">
                          <span className="h-1.5 w-1.5 rounded-full" style={{ background: LAWS[record.exp].color }} />
                          {LAWS[record.exp].short}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-mono text-[11.5px] text-[var(--ink)]/74">{formatEvidence(record)}</td>
                      <td className="px-3 py-2">
                        {laws[record.exp] === record.exp ? (
                          <span className="chip chip-lime !py-0.5 !text-[10.5px]">correcta</span>
                        ) : (
                          <span className="chip !py-0.5 !text-[10.5px] text-[var(--ink)]/55">por verificar</span>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* --------------------------------- Slider --------------------------------- */

function Slider({
  label,
  unit,
  min,
  max,
  step,
  value,
  onChange,
  color,
  left,
  right,
  disabled,
}: {
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  color: string;
  left: string;
  right: string;
  disabled?: boolean;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="mb-2 flex items-end justify-between">
        <label className="text-[12.5px] font-semibold text-[var(--ink)]/74">{label}</label>
        <span className="rounded-md border border-[var(--line)] bg-[var(--card)] px-2 py-0.5 font-mono text-[13px] font-medium">
          {value} <span className="text-[10.5px] font-normal text-[var(--ink)]/62">{unit}</span>
        </span>
      </div>
      <input
        type="range"
        className="lab-range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label={label}
        style={{ "--pct": `${pct}%`, "--range-color": color } as CSSProperties}
      />
      <div className="mt-1.5 flex justify-between font-mono text-[10px] text-[var(--ink)]/55">
        <span>{left}</span>
        <span>{right}</span>
      </div>
    </div>
  );
}

/* -------------------------------- Visuales -------------------------------- */

function Particles({ color, count = 16, opacity = 0.8 }: { color: string; count?: number; opacity?: number }) {
  return (
    <>
      {CLOUD.slice(0, count).map(([x, y], index) => (
        <circle
          key={index}
          cx={x}
          cy={y}
          r={index % 3 === 0 ? 3.1 : 2.2}
          fill={color}
          opacity={opacity * (index % 2 === 0 ? 1 : 0.66)}
        />
      ))}
    </>
  );
}

function BoyleVisual({ volume, pressure }: { volume: number; pressure: number }) {
  const gasHeight = 26 + (volume / 6) * 128;
  const gasTop = 192 - gasHeight;
  const needle = -120 + ((Math.min(pressure, 12) - 1) / 11) * 240;
  return (
    <div className="relative h-[210px] w-full">
      <svg viewBox="0 0 340 210" className="h-full w-full">
        <defs>
          <linearGradient id="boyleGas" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#b7eadb" stopOpacity=".75" />
            <stop offset="100%" stopColor="#2d9d8b" stopOpacity=".55" />
          </linearGradient>
          <clipPath id="boyleClip">
            <rect x="98" y={gasTop} width="116" height={gasHeight} rx="5" />
          </clipPath>
        </defs>
        <rect x="94" y="24" width="124" height="170" rx="12" fill="#fffdf7" stroke="#c9c5b6" />
        <rect x="98" y="188" width="116" height="6" rx="3" fill="#c9c5b6" />
        <rect x="146" y="4" width="20" height="44" rx="4" fill="#d9d6c8" stroke="#bfbbac" />
        <rect x="104" y={gasTop - 12} width="104" height="14" rx="3" fill="#4d6d6d" />
        <rect x="140" y="12" width="32" height={Math.max(12, gasTop - 24)} rx="2" fill="#9eaaa3" />
        <rect x="98" y={gasTop} width="116" height={gasHeight} fill="url(#boyleGas)" />
        <g clipPath="url(#boyleClip)" transform={`translate(98 ${gasTop})`}>
          <Particles color="#0b6b60" count={Math.min(24, Math.round(30 - volume * 3))} />
        </g>
        <path d="M94 66h-14M94 105h-14M94 144h-14" stroke="#bbb7a8" />
        <text x="72" y="69" textAnchor="end" fill="#75746a" fontSize="7" fontFamily="monospace">{Math.round(volume * 10) / 10}L</text>
        <text x="72" y="108" textAnchor="end" fill="#9a988c" fontSize="6.5" fontFamily="monospace">V gas</text>
        <text x="72" y="147" textAnchor="end" fill="#9a988c" fontSize="6.5" fontFamily="monospace">pistón</text>
        <g transform="translate(278 82)">
          <circle r="42" fill="#fffdf7" stroke="#d5d1c1" />
          <circle r="35" fill="#f4f2e9" stroke="#e2dfd2" />
          {Array.from({ length: 9 }).map((_, index) => {
            const angle = (-120 + (index / 8) * 240) * (Math.PI / 180);
            return (
              <line
                key={index}
                x1={Math.sin(angle) * 28}
                y1={-Math.cos(angle) * 28}
                x2={Math.sin(angle) * 32}
                y2={-Math.cos(angle) * 32}
                stroke={index > 5 ? "#c96850" : "#8a9b91"}
                strokeWidth="1.3"
              />
            );
          })}
          <g transform={`rotate(${needle})`}>
            <line x1="0" y1="3" x2="0" y2="-26" stroke="#173b3d" strokeWidth="1.8" strokeLinecap="round" />
            <circle cy="-26" r="1.8" fill="#173b3d" />
          </g>
          <circle r="3.5" fill="#173b3d" />
          <text y="24" textAnchor="middle" fontSize="6.5" fill="#74746a" fontFamily="monospace">PRESIÓN</text>
        </g>
        <text x="278" y="140" textAnchor="middle" fill="#173b3d" fontSize="12" fontFamily="monospace" fontWeight="600">{pressure.toFixed(2)}</text>
        <text x="278" y="151" textAnchor="middle" fill="#8b8a7f" fontSize="6.5" fontFamily="monospace">atm</text>
        <path d="M240 56c-18-5-32 2-38 12" stroke="#a5b7a9" strokeWidth="1" strokeDasharray="3 3" fill="none" />
      </svg>
    </div>
  );
}

function CharlesVisual({ temperature, volume }: { temperature: number; volume: number }) {
  const radius = 22 + ((volume - 20) / 30) * 28;
  const level = ((temperature - 200) / 300) * 100;
  const heat = Math.min(1, (temperature - 200) / 300);
  return (
    <div className="relative h-[210px] w-full">
      <svg viewBox="0 0 340 210" className="h-full w-full">
        <defs>
          <radialGradient id="balloonFill" cx="35%" cy="30%">
            <stop offset="0%" stopColor="#ffe3b0" />
            <stop offset="62%" stopColor="#f2b764" />
            <stop offset="100%" stopColor="#d68a39" />
          </radialGradient>
          <linearGradient id="heatFill" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#e9a63f" />
            <stop offset="100%" stopColor="#df5b3f" />
          </linearGradient>
        </defs>
        <line x1="34" y1="166" x2="196" y2="166" stroke="#c8c4b4" strokeDasharray="3 4" />
        <rect x="134" y="156" width="24" height="10" rx="3" fill="#8a9186" />
        <ellipse cx="146" cy={104 - radius * 0.12} rx={radius} ry={radius * 0.92} fill="url(#balloonFill)" stroke="#bf7c35" strokeOpacity=".35" />
        <ellipse cx={120} cy={104 - radius * 0.3} rx={radius * 0.42} ry={radius * 0.52} fill="#fff3d5" opacity=".28" />
        <path d={`M${146 - radius * 0.28} ${156} Q146 ${170} ${146 + radius * 0.28} ${156}`} stroke="#a3a79b" strokeWidth="2" fill="none" />
        <g opacity={0.25 + heat * 0.75}>
          <path d="M146 190c-8-8 2-12-3-19 10 4 13 11 8 17 5-2 7-6 7-10 5 7 2 17-12 12Z" fill="#e2763b" />
          <path d="M146 196c-4-4 1-6-1-10 5 2 6 6 4 9 3-1 3-3 3-5 3 4 1 8-6 6Z" fill="#e9a63f" />
        </g>
        <path d="M142 160 Q130 178 148 182 Q164 178 152 162" fill="none" stroke="#d2cfc1" strokeDasharray="2 3" />
        <g transform="translate(270 28)">
          <rect x="-15" y="0" width="30" height="144" rx="15" fill="#fffdf7" stroke="#d4d0c0" />
          <rect x="-8" y="116" width="16" height="20" rx="8" fill="#f3efe2" />
          <rect x="-8" y={116 - (102 * level) / 100} width="16" height={(102 * level) / 100 + 20} rx="8" fill="url(#heatFill)" />
          {[0, 25, 50, 75, 100].map((tick) => (
            <g key={tick}>
              <line x1="15" y1={116 - (102 * tick) / 100} x2="20" y2={116 - (102 * tick) / 100} stroke="#a8a69a" />
              <text x="24" y={119 - (102 * tick) / 100} fontSize="5.5" fill="#8f8d81" fontFamily="monospace">{200 + tick * 3}</text>
            </g>
          ))}
          <text x="0" y="158" textAnchor="middle" fontSize="6" fill="#7f7e72" fontFamily="monospace">K</text>
        </g>
        <text x="146" y="26" textAnchor="middle" fontSize="7" fill="#8b8a7d" fontFamily="monospace" letterSpacing="1.5">GLOBO TÉRMICO</text>
        <text x="146" y="205" textAnchor="middle" fontSize="7.5" fill="#5c6d62" fontFamily="monospace">P constante · n constante</text>
        <g>
          <rect x="226" y="168" width="76" height="26" rx="5" fill="#fffdf7" stroke="#ddd9ca" />
          <text x="233" y="179" fontSize="5.8" fill="#8d8b7f" fontFamily="monospace">VOLUMEN</text>
          <text x="233" y="189" fontSize="8.5" fill="#173b3d" fontFamily="monospace" fontWeight="600">{volume.toFixed(1)} L</text>
        </g>
      </svg>
    </div>
  );
}

function GayVisual({ temperature, pressure }: { temperature: number; pressure: number }) {
  const needle = -118 + ((pressure - 1.6) / 2.4) * 236;
  const intensity = Math.min(1, (temperature - 200) / 300);
  return (
    <div className="relative h-[210px] w-full">
      <svg viewBox="0 0 340 210" className="h-full w-full">
        <defs>
          <linearGradient id="tank" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e7e5da" />
            <stop offset="45%" stopColor="#bcc5bd" />
            <stop offset="100%" stopColor="#a3afa7" />
          </linearGradient>
          <linearGradient id="tankGas" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#e28a70" stopOpacity=".85" />
            <stop offset="100%" stopColor="#f0c49d" stopOpacity=".32" />
          </linearGradient>
        </defs>
        <ellipse cx="142" cy="190" rx="82" ry="5" fill="#d9d5c5" opacity=".6" />
        <rect x="80" y="54" width="122" height="126" rx="26" fill="url(#tank)" stroke="#9aa79e" />
        <rect x="88" y="62" width="106" height="110" rx="20" fill="url(#tankGas)" opacity={0.35 + intensity * 0.65} />
        <rect x="128" y="30" width="26" height="26" rx="4" fill="#8d9b92" />
        <rect x="121" y="22" width="40" height="11" rx="5" fill="#6d7e75" />
        <g transform="translate(88 103)">
          <Particles color="#b4543d" count={Math.round(8 + intensity * 13)} opacity={0.35 + intensity * 0.4} />
        </g>
        <path d="M80 66c-14 8-17 18-17 30M202 66c14 8 17 18 17 30" stroke="#b2b8ad" strokeWidth="4" strokeLinecap="round" />
        <g transform="translate(266 85)">
          <circle r="45" fill="#fffdf7" stroke="#d3cfbf" />
          <circle r="37" fill="#f6f3ea" stroke="#e5e1d3" />
          {Array.from({ length: 11 }).map((_, index) => {
            const angle = (-122 + (index / 10) * 244) * (Math.PI / 180);
            return (
              <line
                key={index}
                x1={Math.sin(angle) * 29}
                y1={-Math.cos(angle) * 29}
                x2={Math.sin(angle) * 34}
                y2={-Math.cos(angle) * 34}
                stroke={index > 7 ? "#c65d47" : "#8d9e94"}
                strokeWidth="1.2"
              />
            );
          })}
          <g transform={`rotate(${needle})`}>
            <line x1="0" y1="2" x2="0" y2="-28" stroke="#173b3d" strokeWidth="1.8" strokeLinecap="round" />
            <circle cy="-28" r="1.7" fill="#173b3d" />
          </g>
          <circle r="3.4" fill="#173b3d" />
          <text y="26" textAnchor="middle" fontSize="6" fill="#7f7e73" fontFamily="monospace">P (atm)</text>
          <text y="37" textAnchor="middle" fontSize="7" fill="#173b3d" fontFamily="monospace" fontWeight="600">{pressure.toFixed(2)}</text>
        </g>
        <g opacity={0.3 + intensity * 0.7}>
          <path d="M141 196c-9-8 2-13-3-20 11 4 14 12 8 18 5-2 8-6 8-11 5 7 2 18-13 13Z" fill="#e2763b" />
        </g>
        <text x="141" y="205" textAnchor="middle" fontSize="6" fill="#838176" fontFamily="monospace">calor · V constante</text>
        <g>
          <rect x="23" y="137" width="58" height="32" rx="5" fill="#fffdf7" stroke="#ddd9ca" />
          <text x="30" y="148" fontSize="5.5" fill="#8d8b7f" fontFamily="monospace">TEMP.</text>
          <text x="30" y="161" fontSize="9" fill="#173b3d" fontFamily="monospace" fontWeight="600">{temperature} K</text>
        </g>
      </svg>
    </div>
  );
}

function GrahamVisual({
  gasA,
  gasB,
  meet,
  temperature,
  ratio,
}: {
  gasA: string;
  gasB: string;
  meet: number;
  temperature: number;
  ratio: number;
}) {
  const colorA = gasColors[gasA] ?? "#0f766e";
  const colorB = gasColors[gasB] ?? "#d97706";
  const formulaA = SIM_GASES.find((gas) => gas.id === gasA)?.formula ?? gasA;
  const formulaB = SIM_GASES.find((gas) => gas.id === gasB)?.formula ?? gasB;
  const markerX = 40 + (meet / 100) * 260;
  return (
    <div className="relative h-[210px] w-full">
      <svg viewBox="0 0 340 210" className="h-full w-full">
        <defs>
          <linearGradient id="tubeA" x1="0%" x2="100%">
            <stop offset="0%" stopColor={colorA} stopOpacity=".55" />
            <stop offset="100%" stopColor={colorA} stopOpacity=".02" />
          </linearGradient>
          <linearGradient id="tubeB" x1="100%" x2="0%">
            <stop offset="0%" stopColor={colorB} stopOpacity=".55" />
            <stop offset="100%" stopColor={colorB} stopOpacity=".02" />
          </linearGradient>
        </defs>
        <rect x="32" y="74" width="276" height="58" rx="29" fill="#fffdf7" stroke="#cbc7b7" strokeWidth="1.5" />
        <rect x="38" y="80" width="264" height="46" rx="23" fill="#f7f5ec" />
        <rect x="38" y="80" width={markerX - 34} height="46" rx="23" fill="url(#tubeA)" />
        <rect x={markerX} y="80" width={302 - markerX} height="46" rx="23" fill="url(#tubeB)" />
        <g opacity=".75">
          {CLOUD.slice(0, 10).map(([x, y], index) => (
            <circle key={`a-${index}`} cx={45 + (x / 100) * (markerX - 50)} cy={88 + (y / 100) * 30} r={index % 3 === 0 ? 2.4 : 1.7} fill={colorA} />
          ))}
          {CLOUD.slice(10, 22).map(([x, y], index) => (
            <circle key={`b-${index}`} cx={markerX + 6 + ((100 - x) / 100) * (292 - markerX)} cy={88 + (y / 100) * 30} r={index % 3 === 0 ? 2.4 : 1.7} fill={colorB} />
          ))}
        </g>
        <g>
          <line x1={markerX} y1="64" x2={markerX} y2="140" stroke="#173b3d" strokeWidth="1" strokeDasharray="2 3" />
          <rect x={markerX - 20} y="48" width="40" height="13" rx="3" fill="#173b3d" />
          <text x={markerX} y="57" textAnchor="middle" fill="#d9f59a" fontSize="6" fontFamily="monospace">ENCUENTRO</text>
          <path d={`M${markerX - 1} 62 l2 5 l2 -5`} fill="none" stroke="#173b3d" />
          <ellipse cx={markerX} cy="103" rx="7" ry="16" fill="#ffffff" opacity=".8" />
          <ellipse cx={markerX} cy="103" rx="4" ry="12" fill="#f4ead2" opacity=".7" />
        </g>
        <g>
          <rect x="20" y="74" width="30" height="58" rx="9" fill={colorA} opacity=".13" />
          <text x="35" y="142" textAnchor="middle" fontSize="6.5" fill="#6d7167" fontFamily="monospace">A · {formulaA}</text>
        </g>
        <g>
          <rect x="290" y="74" width="30" height="58" rx="9" fill={colorB} opacity=".13" />
          <text x="305" y="142" textAnchor="middle" fontSize="6.5" fill="#6d7167" fontFamily="monospace">B · {formulaB}</text>
        </g>
        <line x1="40" y1="158" x2="300" y2="158" stroke="#c7c3b3" />
        {[0, 25, 50, 75, 100].map((tick) => (
          <g key={tick}>
            <line x1={40 + (tick / 100) * 260} y1="158" x2={40 + (tick / 100) * 260} y2="163" stroke="#b4b1a2" />
            <text x={40 + (tick / 100) * 260} y="172" textAnchor="middle" fontSize="5.5" fill="#959387" fontFamily="monospace">{tick} cm</text>
          </g>
        ))}
        <text x="170" y="29" textAnchor="middle" fontSize="7" fill="#8b8a7d" fontFamily="monospace" letterSpacing="1.3">TUBO DE DIFUSIÓN · 1,0 m</text>
        <text x="170" y="43" textAnchor="middle" fontSize="6.5" fill="#75908a" fontFamily="monospace">T = {temperature} K · r(A)/r(B) = {ratio.toFixed(2)}</text>
        <line x1="40" y1="192" x2={markerX} y2="192" stroke={colorA} strokeWidth="1.6" strokeDasharray="4 2" />
        <line x1={markerX} y1="192" x2="300" y2="192" stroke={colorB} strokeWidth="1.6" strokeDasharray="4 2" />
        <text x={(40 + markerX) / 2} y="204" textAnchor="middle" fontSize="6" fill={colorA} fontFamily="monospace">mayor recorrido si es más liviano</text>
      </svg>
    </div>
  );
}

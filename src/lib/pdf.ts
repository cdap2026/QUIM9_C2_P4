import { EXPERIMENTS, LAWS, OPEN_QUESTIONS, QUIZ } from "./data";
import { deriveScore, downloadBlob, formatDate, formatDuration, lawName } from "./storage";
import type { Session } from "./types";

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 44;
const CONTENT_W = PAGE_W - MARGIN * 2;
const BOTTOM = 792;

const CHAR_MAP: Record<string, string> = {
  "₀": "0",
  "₁": "1",
  "₂": "2",
  "₃": "3",
  "₄": "4",
  "–": "-",
  "—": "-",
  "−": "-",
  "…": "...",
  "“": '"',
  "”": '"',
  "‘": "'",
  "’": "'",
  "✓": "OK",
  "•": "-",
  "≥": ">=",
  "≤": "<=",
  "→": "->",
  "×": "x",
};

function sanitize(input: string): string {
  let out = "";
  for (const char of input.replace(/\r/g, "")) {
    if (CHAR_MAP[char] !== undefined) {
      out += CHAR_MAP[char];
      continue;
    }
    if (char === "\n") {
      out += " ";
      continue;
    }
    if (char === "\t") {
      out += "    ";
      continue;
    }
    out += char.charCodeAt(0) <= 255 ? char : "?";
  }
  return out;
}

function escapePdf(text: string): string {
  return sanitize(text).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function toBytes(text: string): Uint8Array {
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i += 1) bytes[i] = text.charCodeAt(i) & 0xff;
  return bytes;
}

function byteLength(text: string): number {
  return text.length;
}

function charWidth(char: string, size: number): number {
  if ("iljtfrI.,:;'!|".includes(char)) return size * 0.29;
  if ("mwMW".includes(char)) return size * 0.86;
  if ("ABCDEFGHJKLNOPQRSTUVXYZ".includes(char)) return size * 0.66;
  if (char === " ") return size * 0.3;
  return size * 0.535;
}

function measure(text: string, size: number): number {
  let width = 0;
  for (const char of sanitize(text)) width += charWidth(char, size);
  return width;
}

function wrapText(text: string, size: number, maxWidth: number): string[] {
  const clean = sanitize(text).replace(/\s+/g, " ").trim();
  if (!clean) return [""];
  const words = clean.split(" ");
  const lines: string[] = [];
  let current = "";
  words.forEach((word) => {
    const candidate = current ? `${current} ${word}` : word;
    if (measure(candidate, size) > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  });
  if (current) lines.push(current);
  return lines;
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

type Theme = { r: number; g: number; b: number };
const INK: Theme = { r: 0.043, g: 0.176, b: 0.192 };
const TEAL: Theme = { r: 0.059, g: 0.463, b: 0.431 };
const LIME: Theme = { r: 0.776, g: 0.949, b: 0.306 };
const AMBER: Theme = { r: 0.804, g: 0.502, b: 0.098 };
const CORAL: Theme = { r: 0.75, g: 0.235, b: 0.196 };
const GRAY: Theme = { r: 0.34, g: 0.38, b: 0.38 };
const LIGHT: Theme = { r: 0.94, g: 0.955, b: 0.93 };
const WHITE: Theme = { r: 1, g: 1, b: 1 };

class PdfReport {
  private pages: string[][] = [];
  private current: string[] = [];
  private y = 0;
  private page = 0;
  private title: string;
  private subtitle: string;
  constructor(title: string, subtitle: string) {
    this.title = title;
    this.subtitle = subtitle;
    this.newPage(true);
  }

  private color(theme: Theme, stroke = false) {
    return `${theme.r.toFixed(3)} ${theme.g.toFixed(3)} ${theme.b.toFixed(3)} ${stroke ? "RG" : "rg"}`;
  }

  private rect(x: number, top: number, w: number, h: number, theme: Theme) {
    this.current.push(`q ${this.color(theme)} ${x.toFixed(2)} ${(PAGE_H - top - h).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f Q`);
  }

  private line(x1: number, top1: number, x2: number, top2: number, theme: Theme, width = 0.6) {
    this.current.push(
      `q ${this.color(theme, true)} ${width} w ${x1.toFixed(2)} ${(PAGE_H - top1).toFixed(2)} m ${x2.toFixed(2)} ${(PAGE_H - top2).toFixed(2)} l S Q`
    );
  }

  private text(text: string, x: number, top: number, size: number, bold = false, theme: Theme = INK) {
    this.current.push(
      `BT /${bold ? "F2" : "F1"} ${size} Tf ${this.color(theme)} 1 0 0 1 ${x.toFixed(2)} ${(PAGE_H - top).toFixed(2)} Tm (${escapePdf(text)}) Tj ET`
    );
  }

  private newPage(first = false) {
    this.current = [];
    this.pages.push(this.current);
    this.page += 1;
    this.rect(0, 0, PAGE_W, 44, INK);
    this.rect(MARGIN, 15, 5, 14, LIME);
    this.text("GASLAB 9°", MARGIN + 12, 26, 9.5, true, LIME);
    this.text("Ciencias Naturales · Leyes de los gases y difusión", 170, 26, 8, false, { r: 0.76, g: 0.85, b: 0.83 });
    this.text(`Pág. ${this.page}`, PAGE_W - MARGIN - 42, 26, 8, false, { r: 0.76, g: 0.85, b: 0.83 });
    if (first) {
      this.rect(0, 44, PAGE_W, 100, { r: 0.055, g: 0.212, b: 0.227 });
      this.text(this.title, MARGIN, 82, 21, true, WHITE);
      this.text(this.subtitle, MARGIN, 103, 10, false, { r: 0.73, g: 0.87, b: 0.83 });
      this.rect(MARGIN, 119, 38, 3, LIME);
      this.y = 166;
    } else {
      this.y = 66;
    }
  }

  private ensure(height: number) {
    if (this.y + height > BOTTOM) this.newPage();
  }

  heading(text: string, kicker?: string) {
    this.ensure(kicker ? 44 : 30);
    this.y += 7;
    if (kicker) {
      this.text(kicker.toUpperCase(), MARGIN, this.y, 7.5, true, TEAL);
      this.y += 13;
    }
    this.text(text, MARGIN, this.y + 9, 12.5, true, INK);
    this.y += 17;
    this.line(MARGIN, this.y, MARGIN + CONTENT_W, this.y, { r: 0.82, g: 0.85, b: 0.8 });
    this.y += 12;
  }

  paragraph(text: string, options: { size?: number; color?: Theme; indent?: number; maxChars?: number } = {}) {
    const size = options.size ?? 9.4;
    const indent = options.indent ?? 0;
    const maxChars = options.maxChars;
    const content = maxChars ? truncate(text, maxChars) : text;
    const lines = wrapText(content, size, CONTENT_W - indent);
    lines.forEach((line) => {
      this.ensure(size + 5);
      this.text(line, MARGIN + indent, this.y + size, size, false, options.color ?? INK);
      this.y += size + 4.4;
    });
    this.y += 2;
  }

  metaGrid(items: { label: string; value: string }[], columns = 3) {
    const gap = 8;
    const width = (CONTENT_W - gap * (columns - 1)) / columns;
    const rowHeight = 32;
    for (let i = 0; i < items.length; i += columns) {
      this.ensure(rowHeight + 4);
      items.slice(i, i + columns).forEach((item, index) => {
        const x = MARGIN + index * (width + gap);
        this.rect(x, this.y, width, rowHeight, { r: 0.955, g: 0.965, b: 0.945 });
        this.text(item.label.toUpperCase(), x + 8, this.y + 11, 6.6, true, TEAL);
        this.text(truncate(item.value, 40), x + 8, this.y + 24, 9.2, true, INK);
      });
      this.y += rowHeight + gap;
    }
    this.y += 2;
  }

  metrics(items: { label: string; value: string; accent?: Theme }[]) {
    const gap = 8;
    const width = (CONTENT_W - gap * (items.length - 1)) / items.length;
    const height = 48;
    this.ensure(height + 6);
    items.forEach((item, index) => {
      const x = MARGIN + index * (width + gap);
      this.rect(x, this.y, width, height, LIGHT);
      this.rect(x, this.y, 3, height, item.accent ?? TEAL);
      this.text(item.label.toUpperCase(), x + 10, this.y + 15, 6.6, true, GRAY);
      this.text(item.value, x + 10, this.y + 34, 16, true, INK);
    });
    this.y += height + 10;
  }

  table(headers: string[], rows: string[][], widths: number[], maxCell = 70) {
    const size = 7.8;
    const pad = 5;
    const headerHeight = 19;
    const drawHeader = () => {
      this.rect(MARGIN, this.y, CONTENT_W, headerHeight, { r: 0.91, g: 0.945, b: 0.925 });
      let x = MARGIN;
      headers.forEach((header, index) => {
        this.text(header.toUpperCase(), x + pad, this.y + 12, 6.6, true, TEAL);
        x += widths[index];
      });
      this.line(MARGIN, this.y + headerHeight, MARGIN + CONTENT_W, this.y + headerHeight, { r: 0.8, g: 0.84, b: 0.79 });
      this.y += headerHeight;
    };
    this.ensure(headerHeight + 24);
    drawHeader();
    rows.forEach((row, rowIndex) => {
      const wrapped = row.map((cell, index) => wrapText(truncate(cell, maxCell), size, widths[index] - pad * 2));
      const lines = Math.max(...wrapped.map((cell) => cell.length), 1);
      const height = lines * (size + 2.6) + 7;
      if (this.y + height > BOTTOM) {
        this.newPage();
        drawHeader();
      }
      if (rowIndex % 2 === 1) this.rect(MARGIN, this.y, CONTENT_W, height, { r: 0.977, g: 0.98, b: 0.965 });
      let x = MARGIN;
      wrapped.forEach((cellLines, index) => {
        cellLines.forEach((cellLine, lineIndex) => {
          this.text(cellLine, x + pad, this.y + 11 + lineIndex * (size + 2.6), size, index === 0, INK);
        });
        x += widths[index];
      });
      this.line(MARGIN, this.y + height, MARGIN + CONTENT_W, this.y + height, { r: 0.89, g: 0.9, b: 0.87 }, 0.4);
      this.y += height;
    });
    this.y += 9;
  }

  noteBox(text: string, theme: Theme = TEAL) {
    const lines = wrapText(text, 8.6, CONTENT_W - 24);
    this.ensure(lines.length * 12 + 18);
    this.rect(MARGIN, this.y, CONTENT_W, lines.length * 12 + 14, { r: 0.955, g: 0.965, b: 0.94 });
    this.rect(MARGIN, this.y, 3, lines.length * 12 + 14, theme);
    lines.forEach((line, index) => {
      this.text(line, MARGIN + 12, this.y + 12 + index * 12, 8.6, false, INK);
    });
    this.y += lines.length * 12 + 22;
  }

  spacer(height = 8) {
    this.y += height;
  }

  finish(): Blob {
    const total = this.pages.length;
    this.pages.forEach((content, index) => {
      const page = index + 1;
      const footerTop = PAGE_H - 30;
      const lineY = PAGE_H - 42;
      content.push(
        `q 0.82 0.85 0.80 RG 0.5 w ${MARGIN} ${lineY} m ${PAGE_W - MARGIN} ${lineY} l S Q`
      );
      content.push(
        `BT /F1 7 Tf 0.42 0.46 0.45 rg 1 0 0 1 ${MARGIN} ${PAGE_H - footerTop} Tm (${escapePdf(
          "Documento generado por GASLAB 9° · Actividad de ciencias naturales"
        )}) Tj ET`
      );
      const pageLabel = `Página ${page} de ${total}`;
      content.push(
        `BT /F1 7 Tf 0.42 0.46 0.45 rg 1 0 0 1 ${(PAGE_W - MARGIN - measure(pageLabel, 7)).toFixed(2)} ${
          PAGE_H - footerTop
        } Tm (${escapePdf(pageLabel)}) Tj ET`
      );
    });

    const objects: string[] = [];
    const kids = this.pages.map((_, index) => `${6 + index * 2} 0 R`).join(" ");
    objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
    objects[2] = `<< /Type /Pages /Kids [${kids}] /Count ${this.pages.length} >>`;
    objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
    objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";
    this.pages.forEach((content, index) => {
      const stream = content.join("\n");
      const contentObj = 5 + index * 2;
      const pageObj = 6 + index * 2;
      objects[contentObj] = `<< /Length ${byteLength(stream)} >>\nstream\n${stream}\nendstream`;
      objects[pageObj] =
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W.toFixed(2)} ${PAGE_H.toFixed(2)}] ` +
        `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObj} 0 R >>`;
    });

    let file = "%PDF-1.4\n%âãÏÓ\n";
    const offsets: number[] = [];
    for (let i = 1; i < objects.length; i += 1) {
      if (!objects[i]) continue;
      offsets[i] = byteLength(file);
      file += `${i} 0 obj\n${objects[i]}\nendobj\n`;
    }
    const xrefStart = byteLength(file);
    file += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
    for (let i = 1; i < objects.length; i += 1) {
      const offset = offsets[i] ?? 0;
      file += `${String(offset).padStart(10, "0")} 00000 n \n`;
    }
    file += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
    return new Blob([toBytes(file) as unknown as BlobPart], { type: "application/pdf" });
  }
}

export function downloadStudentPdf(session: Session) {
  const score = deriveScore(session);
  const report = new PdfReport(
    "Informe de laboratorio",
    "Leyes de los gases y difusión · Actividad de 45 minutos · Grado 9°"
  );
  report.metaGrid([
    { label: "Estudiante", value: session.name },
    { label: "Código de sesión", value: session.code },
    { label: "Grupo", value: session.group },
    { label: "Inicio", value: formatDate(session.startedAt) },
    { label: "Tiempo disponible", value: formatDuration(session.endsAt - session.startedAt) },
    { label: "Estado", value: session.finishedAt ? "Finalizada" : "En desarrollo" },
  ]);

  report.heading("Resultado general", "Síntesis de la actividad");
  report.metrics([
    { label: "Puntaje total", value: `${score.total} / ${score.max}`, accent: score.total >= 70 ? TEAL : AMBER },
    { label: "Bloque 1 · Simulación", value: `${score.block1} / 30` },
    { label: "Bloque 2 · Saber", value: `${score.block2} / 40` },
    { label: "Bloque 3 · Aplicación", value: `${score.block3} / 30` },
    { label: "Penalizaciones", value: `−${score.penalties}`, accent: score.penalties > 0 ? CORAL : TEAL },
  ]);
  report.noteBox(
    score.correctAnswers >= 7
      ? "Desempeño destacado: identifica y aplica las leyes de los gases para explicar situaciones cotidianas."
      : score.correctAnswers >= 5
        ? "Desempeño adecuado: reconoce la mayoría de las relaciones entre presión, volumen y temperatura. Se sugiere reforzar la ley de Graham y el uso de temperatura absoluta."
        : "Se recomienda retroalimentar las relaciones presión-volumen-temperatura y el modelo de partículas antes de una nueva aplicación."
  );

  report.heading("Bloque 1 · Evidencia experimental", "Simuladores y registro de datos");
  const headers = ["Experimento", "P (atm)", "V (L)", "T (K)", "Constante / observación"];
  const records = session.block1.records.map((r) => [
    LAWS[r.exp].name,
    r.p.toFixed(2),
    r.v.toFixed(2),
    String(Math.round(r.t)),
    r.note,
  ]);
  report.table(
    headers,
    records.length ? records : [["Sin registros", "-", "-", "-", "El estudiante no guardó mediciones"]],
    [105, 48, 48, 44, 202],
    70
  );
  report.paragraph(
    `Identificación de leyes: ${EXPERIMENTS.map(
      (key) => `${LAWS[key].short}: ${session.block1.laws[key] === key ? "correcta" : "pendiente o incorrecta"}`
    ).join(" · ")}.`,
    { size: 8.8 }
  );
  if (session.block1.conclusion.trim()) {
    report.paragraph(`Conclusión del estudiante: ${session.block1.conclusion}`, { size: 8.8 });
  }

  report.heading("Bloque 2 · Prueba Saber", "8 preguntas de selección múltiple");
  const quizRows = QUIZ.map((question, index) => {
    const answer = session.block2.answers[question.id];
    const letters = ["A", "B", "C", "D"];
    return [
      `P${index + 1}. ${truncate(question.question, 62)}`,
      answer !== undefined ? letters[answer] : "Sin responder",
      letters[question.correct],
      answer === question.correct ? "Correcta" : "Por revisar",
    ];
  });
  report.table(["Pregunta", "Respuesta", "Clave", "Resultado"], quizRows, [298, 58, 48, 103], 80);
  report.paragraph(
    `Respuestas correctas: ${score.correctAnswers} de ${QUIZ.length}. Puntaje del bloque: ${score.block2} / 40.`,
    { size: 8.8 }
  );

  report.heading("Bloque 3 · Aplicación en el entorno", "Preguntas abiertas");
  OPEN_QUESTIONS.forEach((question, index) => {
    const answer = (session.block3.answers[question.id] ?? "").trim();
    report.spacer(2);
    report.paragraph(`${index + 1}. ${question.title}`, { size: 9.2 });
    report.paragraph(answer || "Sin respuesta registrada.", { size: 8.8, indent: 8, color: GRAY });
  });

  report.heading("Seguridad y seguimiento", "Bitácora de la sesión");
  const penalties = session.penalties.map((penalty) => [
    formatDate(penalty.at),
    penalty.reason,
    `−${penalty.points}`,
  ]);
  report.table(
    ["Fecha y hora", "Evento registrado", "Puntos"],
    penalties.length ? penalties : [["—", "Sin penalizaciones registradas", "0"]],
    [120, 347, 40],
    80
  );
  const teacherLogs = session.log.filter((entry) => entry.type === "teacher").map((entry) => entry.text);
  if (teacherLogs.length) {
    report.paragraph("Acciones docentes", { size: 9 });
    teacherLogs.slice(-5).forEach((text) => report.paragraph(`• ${text}`, { size: 8.5, indent: 6 }));
  }
  if (session.teacherNote?.trim()) {
    report.paragraph("Observación del docente", { size: 9 });
    report.paragraph(session.teacherNote, { size: 8.8, indent: 6 });
  } else {
    report.paragraph("Observación del docente: sin observaciones adicionales.", { size: 8.5, color: GRAY });
  }

  downloadBlob(report.finish(), `informe-${slug(session.name)}-gases9.pdf`);
}

export function downloadClassPdf(sessions: Session[], teacherName = "Docente de Ciencias Naturales") {
  const report = new PdfReport(
    "Informe de sesión grupal",
    "Consola de monitoreo · Leyes de los gases y difusión · Grado 9°"
  );
  const completed = sessions.filter((session) => session.finishedAt);
  const active = sessions.filter((session) => !session.finishedAt);
  const average = sessions.length
    ? Math.round(sessions.reduce((sum, session) => sum + deriveScore(session).total, 0) / sessions.length)
    : 0;
  const alerts = sessions.reduce((sum, session) => sum + session.penalties.length, 0);
  report.metaGrid([
    { label: "Docente", value: teacherName },
    { label: "Fecha del informe", value: formatDate(Date.now()) },
    { label: "Sesiones incluidas", value: String(sessions.length) },
  ]);
  report.metrics([
    { label: "Estudiantes", value: String(sessions.length) },
    { label: "En actividad", value: String(active.length), accent: TEAL },
    { label: "Finalizaron", value: String(completed.length), accent: TEAL },
    { label: "Promedio", value: `${average} / 100`, accent: average >= 70 ? TEAL : AMBER },
    { label: "Alertas", value: String(alerts), accent: alerts ? CORAL : TEAL },
  ]);
  report.paragraph(
    "Resumen generado desde la consola de monitoreo. Los puntajes incluyen las penalizaciones vigentes y la valoración automática de los tres bloques. Las preguntas abiertas requieren la retroalimentación cualitativa del docente.",
    { size: 8.8, color: GRAY }
  );

  report.heading("Panorama del grupo", "Progreso por estudiante");
  report.table(
    ["Estudiante", "Código", "Bloque", "Estado", "Puntaje", "Penal."],
    sessions.map((session) => {
      const score = deriveScore(session);
      return [
        `${session.name}${session.isDemo ? " (demo)" : ""}`,
        session.code,
        session.finishedAt ? "Final" : `B${session.currentBlock}`,
        session.finishedAt ? "Finalizó" : "En línea",
        `${score.total}`,
        session.penalties.length ? `${session.penalties.length}` : "0",
      ];
    }),
    [155, 72, 52, 74, 58, 56],
    45
  );

  report.heading("Detalle académico", "Bloques y comprensión");
  report.table(
    ["Estudiante", "B1 simuladores", "B2 Saber", "B3 aplicación", "Correctas", "Total"],
    sessions.map((session) => {
      const score = deriveScore(session);
      return [
        session.name,
        `${score.block1} / 30`,
        `${score.block2} / 40`,
        `${score.block3} / 30`,
        `${score.correctAnswers} / 8`,
        `${score.total}`,
      ];
    }),
    [170, 76, 66, 74, 64, 61],
    40
  );

  const alertRows: string[][] = [];
  sessions.forEach((session) => {
    session.penalties.forEach((penalty) => {
      alertRows.push([session.name, penalty.reason, `−${penalty.points}`, formatDate(penalty.at)]);
    });
  });
  report.heading("Alertas de seguridad", "Navegación y portapapeles");
  report.table(
    ["Estudiante", "Evento", "Puntos", "Registro"],
    alertRows.length ? alertRows : [["—", "Sin alertas en la sesión", "0", "—"]],
    [112, 235, 46, 114],
    70
  );

  const pending = sessions.filter((session) => !session.finishedAt);
  if (pending.length) {
    report.heading("Sesiones en curso", "Seguimiento sugerido");
    pending.forEach((session) => {
      const score = deriveScore(session);
      report.paragraph(
        `• ${session.name} · Bloque ${session.currentBlock} · ${score.total} pts · ${
          session.penalties.length ? `${session.penalties.length} alerta(s)` : "sin alertas"
        } · última señal ${formatDate(session.updatedAt)}`,
        { size: 8.6 }
      );
    });
  }

  downloadBlob(report.finish(), `informe-grupal-gases9-${new Date().toISOString().slice(0, 10)}.pdf`);
}

function slug(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function lawShort(key: keyof typeof LAWS) {
  return lawName(key);
}

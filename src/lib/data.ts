import type { LawInfo, LawKey, OpenQuestion, QuizQuestion } from "./types";

export const ACTIVITY_MINUTES = 45;
export const DEMO_TEACHER_KEY = "GASES9";

export const LAWS: Record<LawKey, LawInfo> = {
  boyle: {
    key: "boyle",
    name: "Ley de Boyle",
    short: "Boyle",
    equation: "P₁ · V₁ = P₂ · V₂",
    condition: "Temperatura y cantidad de gas constantes",
    description:
      "A temperatura constante, la presión de una cantidad fija de gas es inversamente proporcional a su volumen.",
    color: "#0f766e",
    icon: "piston",
  },
  charles: {
    key: "charles",
    name: "Ley de Charles",
    short: "Charles",
    equation: "V₁ / T₁ = V₂ / T₂",
    condition: "Presión y cantidad de gas constantes",
    description:
      "A presión constante, el volumen de un gas es directamente proporcional a su temperatura absoluta.",
    color: "#d97706",
    icon: "balloon",
  },
  gaylussac: {
    key: "gaylussac",
    name: "Ley de Gay-Lussac",
    short: "P–T",
    equation: "P₁ / T₁ = P₂ / T₂",
    condition: "Volumen y cantidad de gas constantes",
    description:
      "A volumen constante, la presión de un gas es directamente proporcional a su temperatura absoluta.",
    color: "#be123c",
    icon: "gauge",
  },
  graham: {
    key: "graham",
    name: "Ley de Graham",
    short: "Difusión",
    equation: "r₁ / r₂ = √(M₂ / M₁)",
    condition: "Difusión de gases a la misma temperatura",
    description:
      "La velocidad de difusión de un gas es inversamente proporcional a la raíz cuadrada de su masa molar: los gases más livianos se dispersan más rápido.",
    color: "#0369a1",
    icon: "wind",
  },
};

export const EXPERIMENTS: LawKey[] = ["boyle", "charles", "gaylussac", "graham"];

export const EXPERIMENT_BRIEF: Record<
  LawKey,
  { title: string; variable: string; variable2: string; fixed: string; prompt: string; hint: string }
> = {
  boyle: {
    title: "Pistón de presión",
    variable: "Volumen (V)",
    variable2: "Presión (P)",
    fixed: "T = 298 K y n constante",
    prompt: "Modifica el volumen del pistón y observa cómo responde la presión.",
    hint: "Si el volumen baja a la mitad, ¿qué le ocurre a la presión?",
  },
  charles: {
    title: "Globo térmico",
    variable: "Temperatura (T)",
    variable2: "Volumen (V)",
    fixed: "P = 1,00 atm y n constante",
    prompt: "Calienta o enfría el globo manteniendo la presión del laboratorio.",
    hint: "Trabaja siempre con temperatura absoluta (Kelvin).",
  },
  gaylussac: {
    title: "Tanque rígido",
    variable: "Temperatura (T)",
    variable2: "Presión (P)",
    fixed: "V = 5,0 L y n constante",
    prompt: "Calienta el tanque sellado y registra la presión que alcanza el gas.",
    hint: "El volumen no cambia porque el tanque es rígido.",
  },
  graham: {
    title: "Tubo de difusión",
    variable: "Temperatura y masa molar",
    variable2: "Velocidad de difusión",
    fixed: "Recorrido total de 100 cm",
    prompt: "Elige dos gases, ajusta la temperatura y ubica el punto de encuentro.",
    hint: "A menor masa molar, mayor rapidez de difusión. La temperatura acelera ambos gases.",
  },
};

export const QUIZ: QuizQuestion[] = [
  {
    id: "q1",
    competency: "Explicación de fenómenos · Ley de Boyle",
    context:
      "En un laboratorio se comprime una muestra de gas desde 4,0 L hasta 1,0 L. La temperatura y la cantidad de gas no cambian.",
    question: "¿Cuál será la nueva presión del gas si inicialmente era 1,0 atm?",
    options: ["0,25 atm", "4,0 atm", "1,0 atm", "8,0 atm"],
    correct: 1,
    explanation:
      "Al reducir el volumen cuatro veces, la presión aumenta cuatro veces (P₁V₁ = P₂V₂). 1,0 atm × 4,0 L = P₂ × 1,0 L, por lo que P₂ = 4,0 atm.",
  },
  {
    id: "q2",
    competency: "Uso de modelos · Ley de Charles",
    context:
      "Una muestra de gas ocupa 2,0 L a 300 K. Se calienta hasta 450 K mientras la presión permanece constante.",
    question: "¿Cuál será el volumen aproximado de la muestra a 450 K?",
    options: ["1,0 L", "1,5 L", "3,0 L", "4,5 L"],
    correct: 2,
    explanation:
      "V₂ = V₁ × (T₂/T₁) = 2,0 L × (450 K / 300 K) = 3,0 L. El volumen crece en la misma proporción que la temperatura absoluta.",
  },
  {
    id: "q3",
    competency: "Uso de modelos · Ley de Gay-Lussac",
    context:
      "Un recipiente rígido contiene un gas a 27 °C (300 K) y 1,2 atm. Se calienta hasta 127 °C (400 K) sin que cambie el volumen.",
    question: "¿Cuál será la presión aproximada del gas a 127 °C?",
    options: ["0,9 atm", "1,2 atm", "0,6 atm", "1,6 atm"],
    correct: 3,
    explanation:
      "P₂ = P₁ × (T₂/T₁) = 1,2 atm × (400 K / 300 K) = 1,6 atm. La temperatura debe usarse en Kelvin.",
  },
  {
    id: "q4",
    competency: "Indagación · Difusión y temperatura",
    context:
      "En un salón se enciende un aromatizante. El olor se percibe más rápido en un día caluroso que en uno frío.",
    question: "¿Qué explica mejor este fenómeno?",
    options: [
      "Las moléculas adquieren mayor masa y se dispersan por el aire.",
      "La presión del aire impide que el aroma se concentre en un punto.",
      "Las moléculas tienen mayor energía cinética y difunden más rápido.",
      "El aromatizante cambia de estado y se convierte en un sólido.",
    ],
    correct: 2,
    explanation:
      "Al aumentar la temperatura, la energía cinética media de las moléculas crece. Los choques y el desplazamiento aleatorio son más rápidos, favoreciendo la difusión.",
  },
  {
    id: "q5",
    competency: "Indagación · Ley de Graham",
    context:
      "En un tubo largo se liberan simultáneamente amoníaco, NH₃ (M = 17 g/mol), y ácido clorhídrico, HCl (M = 36,5 g/mol). Ambos gases se encuentran formando un anillo blanco.",
    question: "¿Dónde se formará el anillo y por qué?",
    options: [
      "Cerca del HCl, porque el NH₃ es más liviano y difunde más rápido.",
      "Cerca del NH₃, porque el HCl tiene mayor masa y se mueve antes.",
      "Justo en el centro, porque la velocidad depende solo del tiempo.",
      "En el extremo del HCl, porque el NH₃ se detiene al primer choque.",
    ],
    correct: 0,
    explanation:
      "La ley de Graham indica que el NH₃ (menor masa molar) se difunde más rápido y recorre más distancia; por eso el encuentro ocurre más cerca del extremo del HCl.",
  },
  {
    id: "q6",
    competency: "Explicación de fenómenos · Modelo cinético",
    context:
      "Una lata de aerosoles cerrada se calienta lentamente. Su volumen se mantiene prácticamente constante.",
    question: "¿Por qué aumenta la presión del gas al calentarse?",
    options: [
      "Las moléculas crecen de tamaño y ocupan un espacio mayor.",
      "Aumentan los choques contra las paredes y su energía media.",
      "El gas se transforma en un líquido de mayor densidad.",
      "Disminuye la cantidad de materia que contiene la lata.",
    ],
    correct: 1,
    explanation:
      "A mayor temperatura, las moléculas se mueven más rápido y golpean las paredes del recipiente con mayor frecuencia e intensidad. Si el volumen no cambia, la presión aumenta.",
  },
  {
    id: "q7",
    competency: "Aplicación · Ley de Charles",
    context:
      "Un globo se deja al sol y se observa que se infla lentamente; la presión que ejerce el aire exterior sobre él no cambia.",
    question: "Desde la ley de Charles, el globo se infla porque:",
    options: [
      "el volumen aumenta al aumentar la temperatura, a presión constante.",
      "la presión disminuye mientras el volumen permanece constante.",
      "la cantidad de moles del gas aumenta con la radiación solar.",
      "la masa del gas cambia al calentarse y ocupa más volumen.",
    ],
    correct: 0,
    explanation:
      "Con presión constante y cantidad de gas fija, el volumen es directamente proporcional a la temperatura absoluta. Al calentarse, el gas se expande y el globo aumenta de tamaño.",
  },
  {
    id: "q8",
    competency: "Comparación · Ley de Graham",
    context:
      "Dos gases se encuentran a la misma temperatura: helio (M = 4 g/mol) y oxígeno (M = 32 g/mol).",
    question: "¿Cuál se difunde más rápido y en qué proporción?",
    options: [
      "El O₂, unas 8,0 veces más rápido que el He.",
      "El He, unas 8,0 veces más rápido que el O₂.",
      "El O₂, unas 2,8 veces más rápido que el He.",
      "El He, unas 2,8 veces más rápido que el O₂.",
    ],
    correct: 3,
    explanation:
      "r(He)/r(O₂) = √(32/4) = √8 ≈ 2,83. El helio es más liviano y difunde cerca de 2,8 veces más rápido que el oxígeno.",
  },
];

export const OPEN_QUESTIONS: OpenQuestion[] = [
  {
    id: "o1",
    title: "La olla a presión",
    context:
      "En una olla a presión el vapor queda atrapado y la temperatura de ebullición del agua supera los 100 °C.",
    prompt:
      "Explica qué ocurre con la presión, la temperatura y el volumen del vapor. ¿Qué ley de los gases ayuda a entenderlo? Relaciónalo con la cocción de los alimentos.",
    hint:
      "Identifica qué magnitud permanece constante y cuál cambia. Menciona qué ocurre con las moléculas y por qué el alimento se cocina antes.",
    minChars: 120,
  },
  {
    id: "o2",
    title: "Globo dentro y fuera de casa",
    context:
      "Un globo lleno de aire se introduce en una nevera y luego se deja dentro de un automóvil al sol.",
    prompt:
      "Describe y explica los cambios de tamaño y de presión del globo en cada situación. Establece la diferencia entre un gas que se expande y un recipiente que puede estallar.",
    hint:
      "Relaciona la temperatura absoluta con el volumen y la presión. Explica también un riesgo cotidiano y cómo prevenirlo.",
    minChars: 120,
  },
  {
    id: "o3",
    title: "Fuga de amoníaco",
    context:
      "En una práctica se libera amoníaco (NH₃, M = 17 g/mol) en un laboratorio. Hay otro gas más pesado presente en el ambiente y una ventana abierta.",
    prompt:
      "¿Cómo influyen la temperatura y la masa molar en la dispersión del amoníaco? Propón dos medidas de seguridad con su justificación científica.",
    hint:
      "Vincula difusión, energía cinética y ley de Graham. Piensa en ventilación, señalización y protección personal.",
    minChars: 120,
  },
  {
    id: "o4",
    title: "La ley en tu día a día",
    context:
      "Bombas de bicicleta, balones, llantas de automóvil y tanques de buceo almacenan gases a presión.",
    prompt:
      "Elige uno de estos dispositivos o propone otro. Explica qué ley de los gases describe su funcionamiento, qué variable se modifica y qué recomendación de uso seguro darías a tu comunidad.",
    hint:
      "Define con claridad la situación inicial y final, indica la variable constante y argumenta con el modelo de partículas.",
    minChars: 120,
  },
];

export const SECURITY_RULES = [
  {
    title: "Navegación entre pestañas",
    text: "Los bloques se desbloquean en orden. Al completar uno se habilita el siguiente. Si intentas saltar, quedará registrado en la bitácora.",
  },
  {
    title: "Copiar y pegar",
    text: "El portapapeles está deshabilitado dentro de la actividad y cada intento genera una penalización visible para el docente.",
  },
  {
    title: "Autoguardado",
    text: "Cada respuesta se guarda en este dispositivo. El avance no se pierde si recargas la página.",
  },
  {
    title: "Sonómetro autorizado",
    text: "El docente puede solicitar el nivel de sonido ambiente. El estudiante debe autorizar el micrófono; solo se comparte el valor en dB, nunca el audio.",
  },
];

export const SIM_GASES = [
  { id: "nh3", name: "Amoníaco (NH₃)", formula: "NH₃", mass: 17 },
  { id: "hcl", name: "Ácido clorhídrico (HCl)", formula: "HCl", mass: 36.5 },
  { id: "h2", name: "Hidrógeno (H₂)", formula: "H₂", mass: 2 },
  { id: "o2", name: "Oxígeno (O₂)", formula: "O₂", mass: 32 },
  { id: "co2", name: "Dióxido de carbono (CO₂)", formula: "CO₂", mass: 44 },
  { id: "he", name: "Helio (He)", formula: "He", mass: 4 },
];

export const GROUP_OPTIONS = ["9°A", "9°B", "9°C", "9°D"];

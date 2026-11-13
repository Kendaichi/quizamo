// shortcut: mock questionnaire/question store over localStorage, no backend.
// Stands in for web-quizmosa/src/stores/questionnaires.ts (Supabase). The
// react-query hooks in questionnaires.ts call these; swap these bodies for
// Supabase reads/writes when the backend lands and the hooks stay unchanged.

export type Kind = "standard" | "pretest" | "posttest";
export type ChoiceKey = "A" | "B" | "C" | "D";

export type Questionnaire = {
  id: number;
  name: string;
  kind: Kind;
  secondsPerQuestion: number;
  createdAt: string; // ISO
};

export type Question = {
  id: number;
  questionnaireId: number;
  prompt: string;
  // Unused choices (typically C/D) are empty strings.
  choices: Record<ChoiceKey, string>;
  correct: ChoiceKey;
  points: number;
  secondsOverride: number | null;
  position: number;
};

export type QuestionnaireWithCounts = Questionnaire & {
  questionCount: number;
  // Always 0 until the hosts/sessions slice exists; kept so the UI and the
  // later Supabase swap already have the field.
  sessionCount: number;
};

export type QuestionnaireInput = {
  id: number | null;
  name: string;
  kind: Kind;
  secondsPerQuestion: number;
};

export type QuestionInput = {
  id: number | null;
  questionnaireId: number;
  prompt: string;
  choices: Record<ChoiceKey, string>;
  correct: ChoiceKey;
  points: number;
  secondsOverride: number | null;
};

type Store = {
  nextId: number;
  questionnaires: Questionnaire[];
  questions: Question[];
};

const STORAGE_KEY = "quizamo-mockdb";

const seed = (): Store => {
  const now = Date.now();
  const iso = (daysAgo: number) => new Date(now - daysAgo * 86_400_000).toISOString();
  const demo: Array<[string, ChoiceKey, [string, string, string, string]]> = [
    ["Which planet is known as the Red Planet?", "B", ["Venus", "Mars", "Jupiter", "Mercury"]],
    ["What does “HTTP” stand for?", "A", [
      "HyperText Transfer Protocol",
      "High Transfer Text Process",
      "Hyperlink Transfer Protocol",
      "Home Tool Transfer Protocol",
    ]],
    ["How many continents are there on Earth?", "C", ["Five", "Six", "Seven", "Eight"]],
    ["Which language runs natively in a web browser?", "D", ["Python", "C++", "Java", "JavaScript"]],
    ["What is the largest ocean on Earth?", "D", ["Atlantic", "Indian", "Arctic", "Pacific"]],
  ];
  const questions: Question[] = demo.map(([prompt, correct, [a, b, c, d]], i) => ({
    id: 100 + i,
    questionnaireId: 1,
    prompt,
    choices: { A: a, B: b, C: c, D: d },
    correct,
    points: 1000,
    secondsOverride: null,
    position: i,
  }));
  return {
    nextId: 200,
    questionnaires: [
      { id: 1, name: "General Knowledge", kind: "standard", secondsPerQuestion: 15, createdAt: iso(2) },
      { id: 2, name: "Onboarding Pre-test", kind: "pretest", secondsPerQuestion: 20, createdAt: iso(0) },
    ],
    questions,
  };
};

function read(): Store {
  if (typeof window === "undefined") return { nextId: 1, questionnaires: [], questions: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Store;
  } catch {}
  const fresh = seed();
  write(fresh);
  return fresh;
}

function write(store: Store) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {}
}

// Mimic network latency so loading states are exercised.
const delay = <T>(value: T, ms = 220): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), ms));

const withCounts = (store: Store, q: Questionnaire): QuestionnaireWithCounts => ({
  ...q,
  questionCount: store.questions.filter((x) => x.questionnaireId === q.id).length,
  sessionCount: 0,
});

export function listQuestionnaires(): Promise<QuestionnaireWithCounts[]> {
  const store = read();
  const rows = [...store.questionnaires]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((q) => withCounts(store, q));
  return delay(rows);
}

export function getQuestionnaire(id: number): Promise<QuestionnaireWithCounts> {
  const store = read();
  const found = store.questionnaires.find((q) => q.id === id);
  if (!found) return Promise.reject(new Error("Questionnaire not found"));
  return delay(withCounts(store, found));
}

export function saveQuestionnaire(input: QuestionnaireInput): Promise<number> {
  const store = read();
  if (input.id !== null) {
    const row = store.questionnaires.find((q) => q.id === input.id);
    if (!row) return Promise.reject(new Error("Questionnaire not found"));
    row.name = input.name;
    row.kind = input.kind;
    row.secondsPerQuestion = input.secondsPerQuestion;
    write(store);
    return delay(row.id);
  }
  const id = store.nextId++;
  store.questionnaires.push({
    id,
    name: input.name,
    kind: input.kind,
    secondsPerQuestion: input.secondsPerQuestion,
    createdAt: new Date().toISOString(),
  });
  write(store);
  return delay(id);
}

export function deleteQuestionnaire(id: number): Promise<void> {
  const store = read();
  store.questionnaires = store.questionnaires.filter((q) => q.id !== id);
  store.questions = store.questions.filter((q) => q.questionnaireId !== id);
  write(store);
  return delay(undefined);
}

export function listQuestions(questionnaireId: number): Promise<Question[]> {
  const store = read();
  const rows = store.questions
    .filter((q) => q.questionnaireId === questionnaireId)
    .sort((a, b) => a.position - b.position);
  return delay(rows);
}

export function saveQuestion(input: QuestionInput): Promise<void> {
  const store = read();
  if (input.id !== null) {
    const row = store.questions.find((q) => q.id === input.id);
    if (!row) return Promise.reject(new Error("Question not found"));
    Object.assign(row, {
      prompt: input.prompt,
      choices: input.choices,
      correct: input.correct,
      points: input.points,
      secondsOverride: input.secondsOverride,
    });
    write(store);
    return delay(undefined);
  }
  const siblings = store.questions.filter((q) => q.questionnaireId === input.questionnaireId);
  const position = siblings.reduce((max, q) => Math.max(max, q.position + 1), 0);
  store.questions.push({
    id: store.nextId++,
    questionnaireId: input.questionnaireId,
    prompt: input.prompt,
    choices: input.choices,
    correct: input.correct,
    points: input.points,
    secondsOverride: input.secondsOverride,
    position,
  });
  write(store);
  return delay(undefined);
}

export function deleteQuestion(id: number): Promise<void> {
  const store = read();
  store.questions = store.questions.filter((q) => q.id !== id);
  write(store);
  return delay(undefined);
}

export function reorderQuestions(ids: number[]): Promise<void> {
  const store = read();
  const order = new Map(ids.map((id, index) => [id, index]));
  for (const q of store.questions) {
    const next = order.get(q.id);
    if (next !== undefined) q.position = next;
  }
  write(store);
  return delay(undefined);
}

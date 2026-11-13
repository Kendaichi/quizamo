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

export type SessionStatus = "lobby" | "question" | "reveal" | "finished";

export type Session = {
  id: number;
  joinCode: string;
  questionnaireId: number;
  status: SessionStatus;
  currentQuestionId: number | null;
  questionStartedAt: string | null;
  questionEndsAt: string | null;
  createdAt: string;
  // Mock: final "answered" count per question id, fixed when the question starts.
  answered: Record<number, number>;
};

export type Participant = {
  id: number;
  sessionId: number;
  displayName: string;
  joinedAt: string;
  isKicked: boolean;
};

export type SessionWithMeta = Session & {
  questionnaire: { name: string; kind: Kind } | null;
  participantCount: number;
};

type Store = {
  nextId: number;
  questionnaires: Questionnaire[];
  questions: Question[];
  sessions: Session[];
  participants: Participant[];
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
    sessions: [],
    participants: [],
  };
};

function read(): Store {
  if (typeof window === "undefined")
    return { nextId: 1, questionnaires: [], questions: [], sessions: [], participants: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Store;
      // Carry stores seeded before the sessions slice existed.
      parsed.sessions ??= [];
      parsed.participants ??= [];
      return parsed;
    }
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

// Sessions (hosts) ---------------------------------------------------------
// shortcut: no real quizzers. Participants are seeded bots and "answered"
// counts are random targets, so the host control flow is demoable without
// realtime. Swap for Supabase create_session / start_question / realtime.

const BOT_NAMES = ["Mara", "Dex", "Lin", "Ava", "Theo", "Noa", "Kai", "Rue", "Sol", "Pia"];
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no ambiguous 0/O/1/I/L

function genJoinCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++)
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  return code;
}

const sessionMeta = (store: Store, s: Session): SessionWithMeta => {
  const qn = store.questionnaires.find((q) => q.id === s.questionnaireId) ?? null;
  return {
    ...s,
    questionnaire: qn ? { name: qn.name, kind: qn.kind } : null,
    participantCount: store.participants.filter((p) => p.sessionId === s.id && !p.isKicked).length,
  };
};

export function createSession(questionnaireId: number): Promise<number> {
  const store = read();
  const qn = store.questionnaires.find((q) => q.id === questionnaireId);
  if (!qn) return Promise.reject(new Error("Questionnaire not found"));
  if (store.questions.filter((q) => q.questionnaireId === questionnaireId).length === 0)
    return Promise.reject(new Error("Add questions before hosting this questionnaire"));

  const id = store.nextId++;
  store.sessions.push({
    id,
    joinCode: genJoinCode(),
    questionnaireId,
    status: "lobby",
    currentQuestionId: null,
    questionStartedAt: null,
    questionEndsAt: null,
    createdAt: new Date().toISOString(),
    answered: {},
  });
  // Seed a few bots so the lobby and participant list aren't empty.
  const count = 3 + Math.floor(Math.random() * 3);
  const names = [...BOT_NAMES].sort(() => Math.random() - 0.5).slice(0, count);
  names.forEach((name, i) => {
    store.participants.push({
      id: store.nextId++,
      sessionId: id,
      displayName: `${name} ${String.fromCharCode(65 + i)}.`,
      joinedAt: new Date(Date.now() + i).toISOString(),
      isKicked: false,
    });
  });
  write(store);
  return delay(id);
}

export function listSessions(): Promise<SessionWithMeta[]> {
  const store = read();
  const rows = [...store.sessions]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((s) => sessionMeta(store, s));
  return delay(rows);
}

export function getSession(id: number): Promise<SessionWithMeta> {
  const store = read();
  const found = store.sessions.find((s) => s.id === id);
  if (!found) return Promise.reject(new Error("Host not found"));
  return delay(sessionMeta(store, found));
}

export function listParticipants(sessionId: number): Promise<Participant[]> {
  const store = read();
  const rows = store.participants
    .filter((p) => p.sessionId === sessionId)
    .sort((a, b) => a.joinedAt.localeCompare(b.joinedAt));
  return delay(rows);
}

function mutateSession(id: number, fn: (s: Session, store: Store) => void): Promise<void> {
  const store = read();
  const s = store.sessions.find((x) => x.id === id);
  if (!s) return Promise.reject(new Error("Host not found"));
  fn(s, store);
  write(store);
  return delay(undefined);
}

export function startQuestion(sessionId: number, questionId: number): Promise<void> {
  return mutateSession(sessionId, (s, store) => {
    const question = store.questions.find((q) => q.id === questionId);
    const qn = store.questionnaires.find((q) => q.id === s.questionnaireId);
    const seconds = question?.secondsOverride ?? qn?.secondsPerQuestion ?? 15;
    const active = store.participants.filter((p) => p.sessionId === sessionId && !p.isKicked).length;
    const now = Date.now();
    s.status = "question";
    s.currentQuestionId = questionId;
    s.questionStartedAt = new Date(now).toISOString();
    s.questionEndsAt = new Date(now + seconds * 1000).toISOString();
    // Most but not all of the room answers; fixed now so reveal is stable.
    s.answered[questionId] = Math.round(active * (0.6 + Math.random() * 0.4));
  });
}

export function revealQuestion(sessionId: number): Promise<void> {
  return mutateSession(sessionId, (s) => {
    s.status = "reveal";
  });
}

export function finishSession(sessionId: number): Promise<void> {
  return mutateSession(sessionId, (s) => {
    s.status = "finished";
  });
}

export function returnToLobby(sessionId: number): Promise<void> {
  return mutateSession(sessionId, (s) => {
    s.status = "lobby";
    s.currentQuestionId = null;
    s.questionStartedAt = null;
    s.questionEndsAt = null;
  });
}

export function kickParticipant(participantId: number): Promise<void> {
  const store = read();
  const p = store.participants.find((x) => x.id === participantId);
  if (p) p.isKicked = true;
  write(store);
  return delay(undefined);
}

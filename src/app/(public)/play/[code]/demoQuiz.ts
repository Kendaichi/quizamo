// Mock quiz data + pure scoring/leaderboard helpers for the player demo.
// No backend: the host-paced flow from web-quizmosa is driven client-side by
// usePlaySession. Swap QUESTIONS/BOTS for Supabase reads when the backend lands.

export type ChoiceKey = "A" | "B" | "C" | "D";

export type DemoQuestion = {
  prompt: string;
  choices: Record<ChoiceKey, string>;
  correct: ChoiceKey;
  // Fixed bot votes shown as the reveal tally; sums to BOTS.length.
  votes: Record<ChoiceKey, number>;
};

export const LOBBY_MS = 4_000;
export const QUESTION_MS = 15_000;
export const REVEAL_MS = 5_000;

export const CHOICE_KEYS: ChoiceKey[] = ["A", "B", "C", "D"];

export const QUESTIONS: DemoQuestion[] = [
  {
    prompt: "Which planet is known as the Red Planet?",
    choices: { A: "Venus", B: "Mars", C: "Jupiter", D: "Mercury" },
    correct: "B",
    votes: { A: 1, B: 3, C: 0, D: 1 },
  },
  {
    prompt: "What does “HTTP” stand for?",
    choices: {
      A: "HyperText Transfer Protocol",
      B: "High Transfer Text Process",
      C: "Hyperlink Transfer Protocol",
      D: "Home Tool Transfer Protocol",
    },
    correct: "A",
    votes: { A: 3, B: 0, C: 2, D: 0 },
  },
  {
    prompt: "How many continents are there on Earth?",
    choices: { A: "Five", B: "Six", C: "Seven", D: "Eight" },
    correct: "C",
    votes: { A: 0, B: 1, C: 3, D: 1 },
  },
  {
    prompt: "Which language runs natively in a web browser?",
    choices: { A: "Python", B: "C++", C: "Java", D: "JavaScript" },
    correct: "D",
    votes: { A: 1, B: 0, C: 1, D: 3 },
  },
  {
    prompt: "What is the largest ocean on Earth?",
    choices: { A: "Atlantic", B: "Indian", C: "Arctic", D: "Pacific" },
    correct: "D",
    votes: { A: 1, B: 1, C: 0, D: 3 },
  },
];

export function choiceList(q: DemoQuestion) {
  return CHOICE_KEYS.map((key) => ({ key, text: q.choices[key] }));
}

// Correct answers earn more the faster you tap; wrong earns 0 — the reference's
// scoring intent (web-quizmosa get_reveal.points_awarded).
export function scoreAnswer(correct: boolean, remainingMs: number) {
  if (!correct) return 0;
  const frac = Math.max(0, Math.min(1, remainingMs / QUESTION_MS));
  return Math.round(500 + 500 * frac);
}

export type Player = { name: string; score: number; you: boolean };

const BOTS: ReadonlyArray<{ name: string; score: number }> = [
  { name: "Mara P.", score: 3860 },
  { name: "Dex", score: 3120 },
  { name: "Lin", score: 2740 },
  { name: "Ava", score: 2210 },
  { name: "Theo", score: 1580 },
];

export function buildLeaderboard(you: string, score: number): Player[] {
  return [
    ...BOTS.map((b) => ({ ...b, you: false })),
    { name: you || "You", score, you: true },
  ].sort((a, b) => b.score - a.score);
}

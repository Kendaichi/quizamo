// Supabase-backed data layer for the admin app. Keeps the same camelCase shapes
// the hooks/components use, mapping the snake_case rows + RPCs underneath, so the
// react-query hooks and screens are unchanged.
// (Filename kept as mockDb for now to avoid churn; it is no longer a mock.)
// The quizzer play/join pages still use their own demo until anonymous sign-in
// and the play flow are wired.

import { supabase } from "./supabase";

export type Kind = "standard" | "pretest" | "posttest";
export type ChoiceKey = "A" | "B" | "C" | "D";
export type SessionStatus = "lobby" | "question" | "reveal" | "finished";

export type Questionnaire = {
  id: number;
  name: string;
  kind: Kind;
  secondsPerQuestion: number;
  createdAt: string;
};

export type Question = {
  id: number;
  questionnaireId: number;
  prompt: string;
  choices: Record<ChoiceKey, string>;
  correct: ChoiceKey;
  points: number;
  secondsOverride: number | null;
  position: number;
};

export type QuestionnaireWithCounts = Questionnaire & {
  questionCount: number;
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

export type Session = {
  id: number;
  joinCode: string;
  questionnaireId: number;
  status: SessionStatus;
  currentQuestionId: number | null;
  questionStartedAt: string | null;
  questionEndsAt: string | null;
  createdAt: string;
  finishedAt: string | null;
  answered: Record<number, number>;
};

export type Participant = {
  id: number;
  sessionId: number;
  displayName: string;
  joinedAt: string;
  isKicked: boolean;
  finishedAt: string | null;
};

export type SessionWithMeta = Session & {
  questionnaire: { name: string; kind: Kind } | null;
  participantCount: number;
};

export type LeaderboardEntry = { participantId: number; name: string; score: number; rank: number };
export type ReportQuestion = {
  questionId: number;
  position: number;
  prompt: string;
  answered: number;
  correct: number;
  accuracy: number | null;
};
export type SessionReport = {
  leaderboard: LeaderboardEntry[];
  questions: ReportQuestion[];
  participantCount: number;
  averageScore: number;
  averageAccuracy: number | null;
};
export type HistoryRow = {
  sessionId: number;
  joinCode: string;
  questionnaireName: string;
  kind: Kind;
  endedAt: string;
  participantCount: number;
  averageScore: number;
  averageAccuracy: number | null;
};
export type ParticipantOverviewRow = {
  participantId: number;
  displayName: string;
  isKicked: boolean;
  joinCode: string;
  joinedAt: string;
  kind: Kind;
  questionnaireName: string;
  score: number;
  sessionId: number;
};

// save_question's generated Args type marks its nullable params as required.
const arg = <T>(v: T | null) => v as T;
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

async function hostId(): Promise<number> {
  const { data, error } = await supabase.rpc("my_host_id");
  if (error) throw error;
  return data as number;
}

// Questionnaires --------------------------------------------------------------
type CountRow = { count: number }[];

export async function listQuestionnaires(): Promise<QuestionnaireWithCounts[]> {
  const { data, error } = await supabase
    .from("questionnaires")
    .select("*, questions(count), sessions(count)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((q) => ({
    id: q.id,
    name: q.name,
    kind: q.kind,
    secondsPerQuestion: q.seconds_per_question,
    createdAt: q.created_at,
    questionCount: (q.questions as CountRow)?.[0]?.count ?? 0,
    sessionCount: (q.sessions as CountRow)?.[0]?.count ?? 0,
  }));
}

export async function getQuestionnaire(id: number): Promise<QuestionnaireWithCounts> {
  const { data, error } = await supabase
    .from("questionnaires")
    .select("*, questions(count), sessions(count)")
    .eq("id", id)
    .single();
  if (error) throw error;
  return {
    id: data.id,
    name: data.name,
    kind: data.kind,
    secondsPerQuestion: data.seconds_per_question,
    createdAt: data.created_at,
    questionCount: (data.questions as CountRow)?.[0]?.count ?? 0,
    sessionCount: (data.sessions as CountRow)?.[0]?.count ?? 0,
  };
}

export async function saveQuestionnaire(input: QuestionnaireInput): Promise<number> {
  const values = {
    name: input.name,
    kind: input.kind,
    seconds_per_question: input.secondsPerQuestion,
  };
  if (input.id !== null) {
    const { error } = await supabase.from("questionnaires").update(values).eq("id", input.id);
    if (error) throw error;
    return input.id;
  }
  const { data, error } = await supabase
    .from("questionnaires")
    .insert({ ...values, host_id: await hostId() })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function deleteQuestionnaire(id: number): Promise<void> {
  const { error } = await supabase.from("questionnaires").delete().eq("id", id);
  if (error) throw error;
}

// Questions -------------------------------------------------------------------
type QuestionRow = {
  id: number;
  questionnaire_id: number;
  prompt: string;
  choice_a: string;
  choice_b: string;
  choice_c: string | null;
  choice_d: string | null;
  points: number;
  position: number;
  seconds_override: number | null;
  question_keys: { correct_choice: string } | { correct_choice: string }[] | null;
};

function mapQuestion(row: QuestionRow): Question {
  const key = Array.isArray(row.question_keys) ? row.question_keys[0] : row.question_keys;
  return {
    id: row.id,
    questionnaireId: row.questionnaire_id,
    prompt: row.prompt,
    choices: { A: row.choice_a, B: row.choice_b, C: row.choice_c ?? "", D: row.choice_d ?? "" },
    correct: (key?.correct_choice ?? "A") as ChoiceKey,
    points: row.points,
    secondsOverride: row.seconds_override,
    position: row.position,
  };
}

export async function listQuestions(questionnaireId: number): Promise<Question[]> {
  const { data, error } = await supabase
    .from("questions")
    .select("*, question_keys(correct_choice)")
    .eq("questionnaire_id", questionnaireId)
    .order("position");
  if (error) throw error;
  return (data as unknown as QuestionRow[]).map(mapQuestion);
}

export async function saveQuestion(input: QuestionInput): Promise<void> {
  const { error } = await supabase.rpc("save_question", {
    p_questionnaire_id: input.questionnaireId,
    p_question_id: arg(input.id),
    p_prompt: input.prompt,
    p_image_path: arg<string>(null),
    p_choice_a: input.choices.A,
    p_choice_b: input.choices.B,
    p_choice_c: input.choices.C,
    p_choice_d: input.choices.D,
    p_correct: input.correct,
    p_points: input.points,
    p_seconds_override: arg(input.secondsOverride),
  });
  if (error) throw error;
}

export async function deleteQuestion(id: number): Promise<void> {
  const { error } = await supabase.from("questions").delete().eq("id", id);
  if (error) throw error;
}

export async function reorderQuestions(questionnaireId: number, ids: number[]): Promise<void> {
  const { error } = await supabase.rpc("reorder_questions", {
    p_questionnaire_id: questionnaireId,
    p_ids: ids,
  });
  if (error) throw error;
}

// Sessions (hosts) ------------------------------------------------------------
type SessionRow = {
  id: number;
  join_code: string;
  questionnaire_id: number;
  status: SessionStatus;
  current_question_id: number | null;
  question_started_at: string | null;
  question_ends_at: string | null;
  created_at: string;
  ended_at: string | null;
  questionnaires: { name: string; kind: Kind } | { name: string; kind: Kind }[] | null;
  participants?: CountRow;
};

function mapSession(row: SessionRow, answered: Record<number, number>): SessionWithMeta {
  const qn = Array.isArray(row.questionnaires) ? row.questionnaires[0] : row.questionnaires;
  return {
    id: row.id,
    joinCode: row.join_code,
    questionnaireId: row.questionnaire_id,
    status: row.status,
    currentQuestionId: row.current_question_id,
    questionStartedAt: row.question_started_at,
    questionEndsAt: row.question_ends_at,
    createdAt: row.created_at,
    finishedAt: row.ended_at,
    answered,
    questionnaire: qn ? { name: qn.name, kind: qn.kind } : null,
    participantCount: row.participants?.[0]?.count ?? 0,
  };
}

export async function createSession(questionnaireId: number): Promise<number> {
  const { data, error } = await supabase.rpc("create_session", {
    p_questionnaire_id: questionnaireId,
  });
  if (error) throw error;
  return data as number;
}

export async function listSessions(): Promise<SessionWithMeta[]> {
  const { data, error } = await supabase
    .from("sessions")
    .select("*, questionnaires(name, kind), participants(count)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as unknown as SessionRow[]).map((s) => mapSession(s, {}));
}

async function answeredCounts(sessionId: number): Promise<Record<number, number>> {
  const { data, error } = await supabase
    .from("answers")
    .select("question_id")
    .eq("session_id", sessionId);
  if (error) throw error;
  const counts: Record<number, number> = {};
  for (const a of data ?? []) counts[a.question_id] = (counts[a.question_id] ?? 0) + 1;
  return counts;
}

export async function getSession(id: number): Promise<SessionWithMeta> {
  const { data, error } = await supabase
    .from("sessions")
    .select("*, questionnaires(name, kind), participants(count)")
    .eq("id", id)
    .single();
  if (error) throw error;
  return mapSession(data as unknown as SessionRow, await answeredCounts(id));
}

export async function listParticipants(sessionId: number): Promise<Participant[]> {
  const { data, error } = await supabase
    .from("participants")
    .select("id, session_id, display_name, joined_at, is_kicked, finished_at")
    .eq("session_id", sessionId)
    .order("joined_at");
  if (error) throw error;
  return (data ?? []).map((p) => ({
    id: p.id,
    sessionId: p.session_id,
    displayName: p.display_name,
    joinedAt: p.joined_at,
    isKicked: p.is_kicked,
    finishedAt: p.finished_at,
  }));
}

async function rpcVoid(
  fn: "reveal_question" | "finish_session" | "return_to_lobby" | "open_pretest",
  sessionId: number,
): Promise<void> {
  const { error } = await supabase.rpc(fn, { p_session_id: sessionId });
  if (error) throw error;
}

// Pre-tests aren't host-paced: the host opens them, then quizzers self-advance.
export const openPretest = (sessionId: number) => rpcVoid("open_pretest", sessionId);

export async function startQuestion(sessionId: number, questionId: number): Promise<void> {
  const { error } = await supabase.rpc("start_question", {
    p_session_id: sessionId,
    p_question_id: questionId,
  });
  if (error) throw error;
}

export const revealQuestion = (sessionId: number) => rpcVoid("reveal_question", sessionId);
export const finishSession = (sessionId: number) => rpcVoid("finish_session", sessionId);
export const returnToLobby = (sessionId: number) => rpcVoid("return_to_lobby", sessionId);

export async function kickParticipant(participantId: number): Promise<void> {
  const { error } = await supabase
    .from("participants")
    .update({ is_kicked: true })
    .eq("id", participantId);
  if (error) throw error;
}

export async function getAnswerDistribution(
  sessionId: number,
  questionId: number,
): Promise<Record<ChoiceKey, number>> {
  const dist: Record<ChoiceKey, number> = { A: 0, B: 0, C: 0, D: 0 };
  const { data, error } = await supabase
    .from("answers")
    .select("selected_choice")
    .eq("session_id", sessionId)
    .eq("question_id", questionId);
  if (error) throw error;
  for (const a of data ?? []) {
    const k = a.selected_choice as ChoiceKey;
    if (k in dist) dist[k] += 1;
  }
  return dist;
}

// Results / history -----------------------------------------------------------
type ReportJson = {
  scores: number[];
  questions: {
    question_id: number;
    position: number;
    prompt: string;
    answered: number;
    correct: number;
    accuracy: number | null;
  }[];
};

export async function getSessionReport(sessionId: number): Promise<SessionReport> {
  const [lb, rep] = await Promise.all([
    supabase.rpc("get_leaderboard", { p_session_id: sessionId }),
    supabase.rpc("get_session_report", { p_session_id: sessionId }),
  ]);
  if (lb.error) throw lb.error;
  if (rep.error) throw rep.error;

  const leaderboard: LeaderboardEntry[] = (lb.data ?? []).map((r) => ({
    participantId: r.participant_id,
    name: r.display_name,
    score: Number(r.score),
    rank: Number(r.rank),
  }));
  const report = rep.data as unknown as ReportJson;
  const questions: ReportQuestion[] = (report?.questions ?? []).map((q) => ({
    questionId: q.question_id,
    position: q.position,
    prompt: q.prompt,
    answered: Number(q.answered),
    correct: Number(q.correct),
    accuracy: q.accuracy === null ? null : Number(q.accuracy),
  }));
  const answeredQuestions = questions.filter((q) => q.accuracy !== null);
  return {
    leaderboard,
    questions,
    participantCount: leaderboard.length,
    averageScore: Math.round(mean(leaderboard.map((e) => e.score))),
    averageAccuracy: answeredQuestions.length
      ? mean(answeredQuestions.map((q) => q.accuracy as number))
      : null,
  };
}

export async function listHistory(): Promise<HistoryRow[]> {
  const [hist, sess] = await Promise.all([
    supabase.rpc("get_history"),
    supabase.from("sessions").select("id, join_code"),
  ]);
  if (hist.error) throw hist.error;
  if (sess.error) throw sess.error;
  const codes = new Map((sess.data ?? []).map((s) => [s.id, s.join_code]));
  return (hist.data ?? []).map((r) => ({
    sessionId: r.session_id,
    joinCode: codes.get(r.session_id) ?? "—",
    questionnaireName: r.questionnaire_name,
    kind: r.kind,
    endedAt: r.ended_at,
    participantCount: Number(r.participant_count),
    averageScore: Number(r.average_score),
    averageAccuracy: r.average_accuracy === null ? null : Number(r.average_accuracy),
  }));
}

export async function listParticipantsOverview(): Promise<ParticipantOverviewRow[]> {
  const { data, error } = await supabase.rpc("get_participants_overview");
  if (error) throw error;
  return (data ?? []).map((r) => ({
    participantId: r.participant_id,
    displayName: r.display_name,
    isKicked: r.is_kicked,
    joinCode: r.join_code,
    joinedAt: r.joined_at,
    kind: r.kind,
    questionnaireName: r.questionnaire_name,
    score: Number(r.score),
    sessionId: r.session_id,
  }));
}

// Quizzer play flow -----------------------------------------------------------
// Ported from web-quizmosa's quizzers store. join_session() resolves the caller
// via my_quizzer_id(), so we sign in anonymously and self-provision a quizzers
// row (quizzer_self_insert policy) before joining. Standard/posttest quizzes are
// host-paced (reveal on the host's cue); a pretest is self-paced — each quizzer
// gets their own question + timer from get_my_progress and taps Next themselves.

export type PlaySession = {
  id: number;
  status: SessionStatus;
  currentQuestionId: number | null;
  questionStartedAt: string | null;
  questionEndsAt: string | null;
};

export type PlayParticipant = { id: number; displayName: string; isKicked: boolean };

export type PlayProgress = {
  kind: Kind;
  questionId: number | null;
  questionStartedAt: string | null;
  questionEndsAt: string | null;
  served: number;
  total: number;
  finishedAt: string | null;
};

export type PlayQuestion = {
  id: number;
  prompt: string;
  choices: Record<ChoiceKey, string>;
};

export type Reveal = {
  correct: ChoiceKey | null;
  myChoice: ChoiceKey | null;
  points: number | null;
  pointsSoFar: number;
  counts: Record<ChoiceKey, number>;
};

export type PlayLeaderRow = LeaderboardEntry & { correctCount: number };

export async function joinSession(code: string, displayName: string): Promise<number> {
  const { data: current } = await supabase.auth.getSession();
  let session = current.session;
  if (!session) {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
    session = data.session;
  }
  // Create the quizzer profile once; join_session() needs my_quizzer_id().
  const { data: quizzerId } = await supabase.rpc("my_quizzer_id");
  if (!quizzerId && session) {
    const { error } = await supabase
      .from("quizzers")
      .insert({ user_id: session.user.id, full_name: displayName });
    if (error && error.code !== "23505") throw error; // ignore a concurrent insert
  }
  const { data, error } = await supabase.rpc("join_session", {
    p_code: code,
    p_display_name: displayName,
  });
  if (error) throw error;
  return data as number;
}

// Read by join code; RLS only returns it to a participant of that session.
export async function getPlaySession(code: string): Promise<PlaySession | null> {
  const { data, error } = await supabase
    .from("sessions")
    .select("id, status, current_question_id, question_started_at, question_ends_at")
    .eq("join_code", code)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    status: data.status,
    currentQuestionId: data.current_question_id,
    questionStartedAt: data.question_started_at,
    questionEndsAt: data.question_ends_at,
  };
}

export async function getPlayParticipant(sessionId: number): Promise<PlayParticipant | null> {
  const { data, error } = await supabase
    .from("participants")
    .select("id, display_name, is_kicked")
    .eq("session_id", sessionId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { id: data.id, displayName: data.display_name, isKicked: data.is_kicked };
}

export async function getMyProgress(sessionId: number): Promise<PlayProgress | null> {
  const { data, error } = await supabase.rpc("get_my_progress", { p_session_id: sessionId });
  if (error) throw error;
  if (!data) return null;
  const r = data as {
    kind: Kind;
    question_id: number | null;
    question_started_at: string | null;
    question_ends_at: string | null;
    served: number;
    total: number;
    finished_at: string | null;
  };
  return {
    kind: r.kind,
    questionId: r.question_id,
    questionStartedAt: r.question_started_at,
    questionEndsAt: r.question_ends_at,
    served: r.served,
    total: r.total,
    finishedAt: r.finished_at,
  };
}

export async function getPlayQuestion(questionId: number): Promise<PlayQuestion | null> {
  const { data, error } = await supabase
    .from("questions")
    .select("id, prompt, choice_a, choice_b, choice_c, choice_d")
    .eq("id", questionId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    prompt: data.prompt,
    choices: { A: data.choice_a, B: data.choice_b, C: data.choice_c ?? "", D: data.choice_d ?? "" },
  };
}

export async function getMyAnswer(
  sessionId: number,
  questionId: number,
): Promise<ChoiceKey | null> {
  const { data, error } = await supabase.rpc("get_my_answer", {
    p_session_id: sessionId,
    p_question_id: questionId,
  });
  if (error) throw error;
  return (data as ChoiceKey | null) ?? null;
}

// Returns false when the quizzer had already answered this question.
export async function submitAnswer(
  sessionId: number,
  questionId: number,
  choice: ChoiceKey,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("submit_answer", {
    p_session_id: sessionId,
    p_question_id: questionId,
    p_choice: choice,
  });
  if (error) throw error;
  return data as boolean;
}

// Pre-test only: serve this quizzer their next question and start their timer.
export async function nextQuestion(sessionId: number): Promise<void> {
  const { error } = await supabase.rpc("next_question", { p_session_id: sessionId });
  if (error) throw error;
}

export async function getReveal(sessionId: number, questionId: number): Promise<Reveal | null> {
  const { data, error } = await supabase.rpc("get_reveal", {
    p_session_id: sessionId,
    p_question_id: questionId,
  });
  if (error) throw error;
  if (!data) return null;
  const r = data as {
    correct_choice?: string | null;
    my_answer?: { selected_choice: string; points_awarded: number } | null;
    counts?: Record<string, number>;
    points_so_far?: number;
  };
  const counts: Record<ChoiceKey, number> = { A: 0, B: 0, C: 0, D: 0 };
  for (const k of ["A", "B", "C", "D"] as ChoiceKey[]) counts[k] = r.counts?.[k] ?? 0;
  return {
    correct: (r.correct_choice as ChoiceKey) ?? null,
    myChoice: (r.my_answer?.selected_choice as ChoiceKey) ?? null,
    points: r.my_answer?.points_awarded ?? null,
    pointsSoFar: r.points_so_far ?? 0,
    counts,
  };
}

export async function getPlayLeaderboard(sessionId: number): Promise<PlayLeaderRow[]> {
  const { data, error } = await supabase.rpc("get_leaderboard", { p_session_id: sessionId });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    participantId: r.participant_id,
    name: r.display_name,
    score: Number(r.score),
    rank: Number(r.rank),
    correctCount: Number(r.correct_count),
  }));
}

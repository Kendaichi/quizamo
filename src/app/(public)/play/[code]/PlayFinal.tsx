import Link from "next/link";
import { cn } from "@/lib/cn";
import type { Player } from "./demoQuiz";

type Props = {
  leaderboard: Player[];
  correctCount: number;
  total: number;
};

/** Final rank hero + full leaderboard with "you" highlighted. */
export function PlayFinal({ leaderboard, correctCount, total }: Props) {
  const rank = leaderboard.findIndex((p) => p.you) + 1;
  const me = leaderboard.find((p) => p.you);

  return (
    <div className="flex flex-col gap-5">
      <div className="glass flex flex-col items-center gap-1 p-8 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-muted">Final rank</p>
        <p className="text-6xl font-extrabold text-primary">#{rank}</p>
        <p className="text-sm text-muted">out of {leaderboard.length}</p>
        <p className="mt-3 text-2xl font-bold">{me?.score ?? 0} points</p>
        <p className="text-sm text-muted">
          {correctCount} of {total} correct
        </p>
      </div>

      <ul className="flex flex-col gap-2">
        {leaderboard.map((p, i) => (
          <li
            key={`${p.name}-${i}`}
            className={cn(
              "glass flex items-center gap-3 !rounded-xl px-4 py-3",
              p.you && "!border-primary",
            )}
          >
            <span className="w-6 text-center font-extrabold text-muted">{i + 1}</span>
            <span className="min-w-0 flex-1 truncate font-semibold">
              {p.name}
              {p.you && <span className="text-primary"> (you)</span>}
            </span>
            <span className="font-bold tabular-nums">{p.score}</span>
          </li>
        ))}
      </ul>

      <Link
        href="/"
        className="glass mx-auto inline-flex items-center !rounded-full px-6 py-3 font-bold transition hover:brightness-105"
      >
        Play again
      </Link>
    </div>
  );
}

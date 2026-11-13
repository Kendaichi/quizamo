import Link from "next/link";

type Props = {
  result: { rank: number; score: number; correctCount: number } | undefined;
  players: number;
  loading: boolean;
};

/** Your own final standing, matching web-quizmosa's PlayFinal. */
export function PlayFinal({ result, players, loading }: Props) {
  return (
    <div className="flex flex-col items-center gap-5">
      <div className="glass flex w-full flex-col items-center gap-1 p-8 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-muted">Final rank</p>

        {loading ? (
          <p className="mt-2 text-muted">Tallying…</p>
        ) : result ? (
          <>
            <p className="text-6xl font-extrabold text-primary">#{result.rank}</p>
            <p className="text-sm text-muted">out of {players}</p>
            <p className="mt-3 text-2xl font-bold">{result.score} points</p>
            <p className="text-sm text-muted">{result.correctCount} correct</p>
          </>
        ) : (
          <p className="mt-2 text-lg">The quiz has ended.</p>
        )}
      </div>

      <Link
        href="/"
        className="glass inline-flex items-center !rounded-full px-6 py-3 font-bold transition hover:brightness-105"
      >
        Back home
      </Link>
    </div>
  );
}

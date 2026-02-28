"use client";

type VoteErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function VoteError({ error, reset }: VoteErrorProps) {
  return (
    <main style={{ padding: "2rem", display: "grid", gap: "0.75rem" }}>
      <h1>No fue posible cargar la votacion</h1>
      <p>{error.message}</p>
      <button type="button" onClick={reset} style={{ width: "fit-content" }}>
        Reintentar
      </button>
    </main>
  );
}

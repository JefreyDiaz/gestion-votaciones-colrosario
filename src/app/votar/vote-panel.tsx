"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";

import { castVoteAction } from "@/app/actions";
import type { ActivePoll } from "@/lib/polls";

import styles from "./page.module.css";

type VotePanelProps = {
  poll: ActivePoll;
  voterDocument: string;
};

type VoteResultState = {
  ok: boolean;
  message: string;
} | null;

export function VotePanel({ poll, voterDocument }: VotePanelProps) {
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [voteResult, setVoteResult] = useState<VoteResultState>(null);
  const [isPending, startTransition] = useTransition();

  const selectedCandidate = useMemo(
    () => poll.options.find((option) => option.id === selectedCandidateId) ?? null,
    [poll.options, selectedCandidateId],
  );

  const confirmVote = () => {
    if (!selectedCandidateId) {
      return;
    }

    startTransition(async () => {
      const result = await castVoteAction({ optionId: selectedCandidateId });
      setVoteResult(result);
      if (result.ok) {
        setSelectedCandidateId(null);
      }
    });
  };

  return (
    <section className={styles.votingContainer}>
      <p className={styles.helperText}>
        Documento registrado: <strong>{voterDocument}</strong>
      </p>

      <div className={styles.grid}>
        {poll.options.map((candidate) => (
          <button
            key={candidate.id}
            type="button"
            className={styles.card}
            onClick={() => setSelectedCandidateId(candidate.id)}
            disabled={Boolean(voteResult?.ok)}
          >
            <div className={styles.imageWrapper}>
              <Image
                src={candidate.imageUrl ?? "/placeholder-candidate.svg"}
                alt={`Foto de ${candidate.candidateName}`}
                fill
                sizes="(max-width: 768px) 50vw, 220px"
              />
            </div>
            <p>{candidate.candidateName}</p>
          </button>
        ))}
      </div>

      {voteResult ? (
        <p className={voteResult.ok ? styles.successMessage : styles.errorMessage}>
          {voteResult.message}
        </p>
      ) : null}

      {selectedCandidate ? (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
          <div className={styles.modal}>
            <h2>Confirmar voto</h2>
            <p>
              Documento <strong>{voterDocument}</strong>, vas a votar por{" "}
              <strong>{selectedCandidate.candidateName}</strong>.
            </p>
            <div className={styles.modalActions}>
              <button type="button" onClick={() => setSelectedCandidateId(null)}>
                Elegir otro
              </button>
              <button type="button" onClick={confirmVote} disabled={isPending}>
                {isPending ? "Guardando..." : "Confirmar voto"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";

import { castVoteAction } from "@/app/actions";
import type { ActivePoll } from "@/lib/polls";

import styles from "./page.module.css";

type VotePanelProps = {
  poll: ActivePoll;
  voterDocument: string;
  hasMorePolls: boolean;
};

type VoteResultState = {
  ok: boolean;
  message: string;
} | null;

export function VotePanel({ poll, voterDocument, hasMorePolls }: Readonly<VotePanelProps>) {
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
        <div className={styles.resultBox}>
          <p className={voteResult.ok ? styles.successMessage : styles.errorMessage}>{voteResult.message}</p>
          {voteResult.ok ? (
            <div className={styles.resultActions}>
              {hasMorePolls ? (
                <Link href="/votar" className={styles.secondaryLinkButton}>
                  Realizar otra votacion
                </Link>
              ) : null}
              <Link href="/" className={styles.primaryLinkButton}>
                Ingresar otro votante
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}

      {selectedCandidate ? (
        <div className={styles.modalBackdrop}>
          <dialog className={styles.modal} open>
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
          </dialog>
        </div>
      ) : null}
    </section>
  );
}

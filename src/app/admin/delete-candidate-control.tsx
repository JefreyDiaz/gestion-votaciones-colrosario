"use client";

import { useState } from "react";

import { deleteCandidateAction } from "@/app/actions";

import styles from "./page.module.css";

type DeleteCandidateControlProps = Readonly<{
  pollId: string;
  candidateId: string;
  candidateName: string;
}>;

export function DeleteCandidateControl({
  pollId,
  candidateId,
  candidateName,
}: DeleteCandidateControlProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button type="button" className={styles.dangerButton} onClick={() => setIsOpen(true)}>
        Eliminar
      </button>

      {isOpen ? (
        <div className={styles.modalBackdrop}>
          <dialog className={styles.modalCard} open>
            <h3>Confirmar eliminacion</h3>
            <p>
              Vas a eliminar al candidato <strong>{candidateName}</strong>. Esta accion no se puede
              deshacer.
            </p>
            <div className={styles.modalActions}>
              <button type="button" className={styles.secondaryButton} onClick={() => setIsOpen(false)}>
                Cancelar
              </button>
              <form action={deleteCandidateAction}>
                <input type="hidden" name="pollId" value={pollId} />
                <input type="hidden" name="candidateId" value={candidateId} />
                <button type="submit" className={styles.dangerButton}>
                  Confirmar eliminacion
                </button>
              </form>
            </div>
          </dialog>
        </div>
      ) : null}
    </>
  );
}

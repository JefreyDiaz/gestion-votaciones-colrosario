import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getActivePoll } from "@/lib/polls";
import { BrandBanner } from "@/components/brand-banner";

import styles from "./page.module.css";
import { VotePanel } from "./vote-panel";

export default async function VotePage() {
  const cookieStore = await cookies();
  const voterDocument = cookieStore.get("voter_document")?.value;

  if (!voterDocument) {
    redirect("/");
  }

  const poll = await getActivePoll();

  if (!poll) {
    return (
      <main className={styles.page}>
        <section className={styles.bannerWrap}>
          <BrandBanner
            title="Jornada electoral"
            subtitle="Actualmente no hay una votacion abierta."
            compact
          />
        </section>
        <section className={styles.emptyState}>
          <h1>No hay una votacion abierta</h1>
          <p>Cuando el administrador abra la jornada podras votar desde aqui.</p>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <section className={styles.bannerWrap}>
        <BrandBanner
          title="Elige tu candidato"
          subtitle="Haz clic en la opcion de tu preferencia y confirma tu voto."
        />
      </section>
      <section className={styles.header}>
        <h1>{poll.title}</h1>
        {poll.description ? <p>{poll.description}</p> : null}
      </section>
      <VotePanel poll={poll} voterDocument={voterDocument} />
    </main>
  );
}

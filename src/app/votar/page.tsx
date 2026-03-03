import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getVoterAvailablePolls } from "@/lib/polls";
import { BrandBanner } from "@/components/brand-banner";

import styles from "./page.module.css";
import { VotePanel } from "./vote-panel";

type VotePageProps = {
  searchParams: Promise<{
    poll?: string;
  }>;
};

function scopeLabel(scope: "general" | "salon") {
  return scope === "general" ? "General" : "Por salon";
}

export default async function VotePage({ searchParams }: Readonly<VotePageProps>) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const voterDocument = cookieStore.get("voter_document")?.value;

  if (!voterDocument) {
    redirect("/");
  }

  const availablePolls = await getVoterAvailablePolls(voterDocument);

  if (availablePolls.length === 0) {
    return (
      <main className={styles.page}>
        <section className={styles.bannerWrap}>
          <BrandBanner
            title="Jornada electoral"
            subtitle="No tienes votaciones pendientes en este momento."
            compact
          />
        </section>
        <section className={styles.emptyState}>
          <h1>No tienes votaciones pendientes</h1>
          <p>
            Si ya participaste en todas las votaciones activas, aqui apareceran de nuevo cuando se abra una
            nueva jornada.
          </p>
          <Link href="/" className={styles.selectorLink}>
            Ingresar otro votante
          </Link>
        </section>
      </main>
    );
  }

  const selectedPollFromQuery = params.poll
    ? availablePolls.find((poll) => poll.id === params.poll) ?? null
    : null;
  const selectedPoll = selectedPollFromQuery ?? (availablePolls.length === 1 ? availablePolls[0] : null);

  if (!selectedPoll) {
    return (
      <main className={styles.page}>
        <section className={styles.bannerWrap}>
          <BrandBanner
            title="Elige la votacion"
            subtitle="Selecciona la jornada en la que quieres participar."
          />
        </section>
        <section className={styles.header}>
          <h1>Votaciones disponibles</h1>
          <p>
            Documento registrado: <strong>{voterDocument}</strong>
          </p>
          <Link href="/" className={styles.selectorSecondaryLink}>
            Ingresar otro votante
          </Link>
        </section>
        {params.poll ? (
          <section className={styles.noticeError}>
            La votacion seleccionada ya no esta disponible para este documento.
          </section>
        ) : null}
        <section className={styles.selectorGrid}>
          {availablePolls.map((poll) => (
            <article key={poll.id} className={styles.selectorCard}>
              <div className={styles.selectorCardHeader}>
                <h2>{poll.title}</h2>
                <span className={styles.scopeBadge}>{scopeLabel(poll.scope)}</span>
              </div>
              {poll.description ? <p>{poll.description}</p> : null}
              <p className={styles.selectorMeta}>
                {poll.options.length} candidato(s) disponible(s)
              </p>
              <Link href={`/votar?poll=${poll.id}`} className={styles.selectorLink}>
                Participar en esta votacion
              </Link>
            </article>
          ))}
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
        <h1>{selectedPoll.title}</h1>
        <p>
          Tipo de votacion: <strong>{scopeLabel(selectedPoll.scope)}</strong>
        </p>
        {selectedPoll.description ? <p>{selectedPoll.description}</p> : null}
        <Link href="/" className={styles.selectorSecondaryLink}>
          Ingresar otro votante
        </Link>
      </section>
      <VotePanel poll={selectedPoll} voterDocument={voterDocument} hasMorePolls={availablePolls.length > 1} />
    </main>
  );
}

import styles from "./page.module.css";
import { setVoterDocumentAction } from "./actions";
import { BrandBanner } from "@/components/brand-banner";

type HomePageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function Home({ searchParams }: Readonly<HomePageProps>) {
  const params = await searchParams;
  const errorMessage = params.error;

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <BrandBanner
          title="Sistema de votaciones estudiantiles"
          subtitle="Ingresa tu documento para participar en la jornada electoral."
        />
        <header className={styles.header}>
          <h2>Ingresa a la votacion</h2>
          <p>Tu documento se usa para validar que votes una sola vez por jornada.</p>
        </header>

        <form action={setVoterDocumentAction} className={styles.form}>
          <label htmlFor="documento">Documento</label>
          <input
            id="documento"
            name="documento"
            inputMode="numeric"
            pattern="[0-9]{6,15}"
            placeholder="Ej. 12345678"
            required
          />
          <button type="submit">Continuar a votar</button>
          {errorMessage ? <p className={styles.error}>{errorMessage}</p> : null}
        </form>
      </main>
    </div>
  );
}

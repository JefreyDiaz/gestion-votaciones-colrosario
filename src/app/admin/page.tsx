import {
  addCandidateAction,
  adminLoginAction,
  adminLogoutAction,
  createPollAction,
  isAdminSessionActive,
  updatePollDetailsAction,
  updatePollStatusAction,
} from "@/app/actions";
import { getAdminDashboardData, getAdminManageData } from "@/lib/polls";

import { DeleteCandidateControl } from "./delete-candidate-control";
import { BrandBanner } from "@/components/brand-banner";
import styles from "./page.module.css";

type AdminPageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;
    tab?: string;
    pollId?: string;
  }>;
};

function formatDateTime(dateIso: string) {
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateIso));
}

function getTab(tab?: string) {
  return tab === "manage" ? "manage" : "overview";
}

function toDateTimeLocalValue(dateIso: string) {
  const date = new Date(dateIso);
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
}

export default async function AdminPage({ searchParams }: Readonly<AdminPageProps>) {
  const params = await searchParams;
  const activeTab = getTab(params.tab);
  const isAuthorized = await isAdminSessionActive();

  if (!isAuthorized) {
    return (
      <main className={styles.page}>
        <section className={styles.loginCard}>
          <BrandBanner
            title="Panel privado de administracion"
            subtitle="Solo personal autorizado puede gestionar la votacion."
            compact
          />
          <h1>Dashboard privado</h1>
          <p>Ingresa la clave de administrador para consultar resultados y votos.</p>
          <form action={adminLoginAction} className={styles.loginForm}>
            <label htmlFor="clave">Clave</label>
            <input id="clave" name="clave" type="password" required minLength={8} />
            <button type="submit">Entrar</button>
            {params.error ? <p className={styles.error}>{params.error}</p> : null}
          </form>
        </section>
      </main>
    );
  }

  const [dashboardData, manageData] = await Promise.all([
    getAdminDashboardData(),
    getAdminManageData(params.pollId),
  ]);

  const selectedPoll = manageData.polls.find((poll) => poll.id === manageData.selectedPollId) ?? null;
  const manageTabHref = manageData.selectedPollId
    ? `/admin?tab=manage&pollId=${manageData.selectedPollId}`
    : "/admin?tab=manage";

  const overviewSection = dashboardData ? (
    <>
      <section className={styles.panel}>
        <h2>{dashboardData.pollTitle}</h2>
        <p>Total de votos: {dashboardData.totalVotes}</p>
        <div className={styles.candidateGrid}>
          {dashboardData.candidates.map((candidate) => (
            <article key={candidate.id} className={styles.candidateCard}>
              <h3>{candidate.candidateName}</h3>
              <p>{candidate.votes} voto(s)</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.panel}>
        <h2>Registros recientes</h2>
        <div className={styles.tableWrapper}>
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Documento</th>
                <th>Candidato</th>
              </tr>
            </thead>
            <tbody>
              {dashboardData.recentVotes.map((vote) => (
                <tr key={vote.id}>
                  <td>{formatDateTime(vote.createdAt)}</td>
                  <td>{vote.voterDocument}</td>
                  <td>{vote.candidateName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  ) : (
    <section className={styles.panel}>
      <h2>No hay datos de votacion aun</h2>
      <p>Crea una votacion en la pestaña Gestionar para comenzar.</p>
    </section>
  );

  const manageSection = (
    <>
      <section className={styles.panel}>
        <h2>Crear votacion</h2>
        <form action={createPollAction} className={styles.formGrid}>
          <label htmlFor="title">Titulo</label>
          <input id="title" name="title" required minLength={3} maxLength={120} />

          <label htmlFor="description">Descripcion</label>
          <textarea id="description" name="description" rows={3} maxLength={500} />

          <label htmlFor="startsAt">Apertura</label>
          <input id="startsAt" name="startsAt" type="datetime-local" required />

          <label htmlFor="endsAt">Cierre</label>
          <input id="endsAt" name="endsAt" type="datetime-local" required />

          <label htmlFor="status">Estado inicial</label>
          <select id="status" name="status" defaultValue="draft">
            <option value="draft">Borrador</option>
            <option value="open">Abierta</option>
            <option value="closed">Cerrada</option>
          </select>

          <button type="submit">Crear votacion</button>
        </form>
      </section>

      <section className={styles.panel}>
        <h2>Votaciones creadas</h2>
        {manageData.polls.length === 0 ? (
          <p>Aun no tienes votaciones.</p>
        ) : (
          <div className={styles.tableWrapper}>
            <table>
              <thead>
                <tr>
                  <th>Titulo</th>
                  <th>Estado</th>
                  <th>Apertura</th>
                  <th>Cierre</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {manageData.polls.map((poll) => (
                  <tr key={poll.id}>
                    <td>{poll.title}</td>
                    <td>{poll.status}</td>
                    <td>{formatDateTime(poll.startsAt)}</td>
                    <td>{formatDateTime(poll.endsAt)}</td>
                    <td className={styles.actionCell}>
                      <a href={`/admin?tab=manage&pollId=${poll.id}`}>Seleccionar</a>
                      <form action={updatePollStatusAction}>
                        <input type="hidden" name="pollId" value={poll.id} />
                        <input type="hidden" name="status" value="open" />
                        <button type="submit">Abrir</button>
                      </form>
                      <form action={updatePollStatusAction}>
                        <input type="hidden" name="pollId" value={poll.id} />
                        <input type="hidden" name="status" value="closed" />
                        <button type="submit">Cerrar</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={styles.panel}>
        <h2>Cargar candidatos</h2>
        {selectedPoll ? (
          <>
            <p>
              Votacion seleccionada: <strong>{selectedPoll.title}</strong>
            </p>
            <form action={addCandidateAction} className={styles.formGrid}>
              <input type="hidden" name="pollId" value={selectedPoll.id} />

              <label htmlFor="candidateName">Nombre candidato</label>
              <input id="candidateName" name="candidateName" required minLength={2} maxLength={120} />

              <label htmlFor="candidateImage">Imagen en carpeta local</label>
              <input id="candidateImage" name="candidateImage" placeholder="jefren.png" />
              <small className={styles.helpText}>
                Guarda la imagen en <strong>public/candidatos</strong> y escribe solo el nombre del
                archivo.
              </small>

              <label htmlFor="sortOrder">Orden</label>
              <input id="sortOrder" name="sortOrder" type="number" defaultValue={0} min={0} max={999} />

              <button type="submit">Agregar candidato</button>
            </form>

            <div className={styles.tableWrapper}>
              <table>
                <thead>
                  <tr>
                    <th>Orden</th>
                    <th>Nombre</th>
                    <th>Imagen</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {manageData.selectedPollOptions.map((option) => (
                    <tr key={option.id}>
                      <td>{option.sortOrder}</td>
                      <td>{option.candidateName}</td>
                      <td>{option.imageUrl ?? "-"}</td>
                      <td>
                        <DeleteCandidateControl
                          pollId={selectedPoll.id}
                          candidateId={option.id}
                          candidateName={option.candidateName}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p>Crea una votacion y seleccionala para cargar candidatos.</p>
        )}
      </section>

      {selectedPoll ? (
        <section className={styles.panel}>
          <h2>Editar votacion seleccionada</h2>
          <p>
            Editando: <strong>{selectedPoll.title}</strong>
          </p>
          <form action={updatePollDetailsAction} className={styles.formGrid}>
            <input type="hidden" name="pollId" value={selectedPoll.id} />

            <label htmlFor="editStartsAt">Apertura</label>
            <input
              id="editStartsAt"
              name="startsAt"
              type="datetime-local"
              defaultValue={toDateTimeLocalValue(selectedPoll.startsAt)}
              required
            />

            <label htmlFor="editEndsAt">Cierre</label>
            <input
              id="editEndsAt"
              name="endsAt"
              type="datetime-local"
              defaultValue={toDateTimeLocalValue(selectedPoll.endsAt)}
              required
            />

            <label htmlFor="editStatus">Estado</label>
            <select id="editStatus" name="status" defaultValue={selectedPoll.status}>
              <option value="draft">Borrador</option>
              <option value="open">Abierta</option>
              <option value="closed">Cerrada</option>
              <option value="archived">Archivada</option>
            </select>

            <button type="submit">Guardar cambios</button>
          </form>
        </section>
      ) : null}
    </>
  );

  return (
    <main className={styles.page}>
      <section className={styles.bannerWrap}>
        <BrandBanner
          title="Administracion de elecciones"
          subtitle="Configura jornadas, candidatos y consulta resultados en tiempo real."
          compact
        />
      </section>
      <section className={styles.topBar}>
        <div>
          <h1>Administrador de votaciones</h1>
          <p>Gestiona procesos y consulta resultados.</p>
        </div>
        <form action={adminLogoutAction}>
          <button type="submit">Cerrar sesion</button>
        </form>
      </section>

      <section className={styles.panel}>
        <div className={styles.tabs}>
          <a
            className={activeTab === "overview" ? styles.tabActive : styles.tab}
            href="/admin?tab=overview"
          >
            Resumen
          </a>
          <a
            className={activeTab === "manage" ? styles.tabActive : styles.tab}
            href={manageTabHref}
          >
            Gestionar votacion
          </a>
        </div>

        {params.error ? <p className={styles.error}>{params.error}</p> : null}
        {params.success ? <p className={styles.success}>{params.success}</p> : null}
      </section>

      {activeTab === "overview" ? overviewSection : manageSection}
    </main>
  );
}

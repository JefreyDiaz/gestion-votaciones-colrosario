# Sistema de votaciones (Next.js + Supabase)

Aplicacion de votaciones con las reglas de negocio definidas:

- Ingreso por documento.
- Un voto por documento en cada votacion.
- Votaciones parametrizadas por fecha/hora de apertura y cierre.
- Voto inmutable (sin editar ni eliminar).
- Ganador por mayoria simple.
- Dashboard privado para administrador.

## Flujo implementado

1. `/` solicita documento y continua a votar.
2. `/votar` muestra candidatos (imagen + nombre).
3. Al seleccionar candidato aparece modal de confirmacion.
4. Al confirmar, se guarda el voto en PostgreSQL.
5. `/admin` muestra dashboard con conteo y registros (protegido por clave).

## Configuracion local

1. Copia `.env.example` a `.env.local`.
2. Completa variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
ADMIN_ACCESS_KEY=...
```

3. Ejecuta la migracion SQL en Supabase (`SQL Editor`) usando:
   - `supabase/migrations/001_init_voting_schema.sql`
4. Levanta el proyecto:

```bash
npm install
npm run dev
```

## Datos iniciales recomendados

Primero crea una votacion:

```sql
insert into public.polls (title, description, starts_at, ends_at, status)
values (
  'Personero Estudiantil 2026',
  'Eleccion oficial del personero',
  '2026-02-28T08:00:00-05',
  '2026-02-28T15:00:00-05',
  'open'
)
returning id;
```

Luego agrega candidatos (reemplaza `POLL_ID`):

```sql
insert into public.poll_options (poll_id, candidate_name, image_url, sort_order)
values
  ('POLL_ID', 'Candidato A', 'https://tu-cdn/candidato-a.jpg', 1),
  ('POLL_ID', 'Candidato B', 'https://tu-cdn/candidato-b.jpg', 2),
  ('POLL_ID', 'Candidato C', 'https://tu-cdn/candidato-c.jpg', 3);
```

## Seguridad aplicada

- RLS habilitado en tablas productivas.
- Sin `service_role` en frontend.
- Consultas sensibles solo en servidor.
- `select` explicito de columnas.
- Restriccion unica para impedir doble voto por votacion:
  - `unique (poll_id, voter_document)`

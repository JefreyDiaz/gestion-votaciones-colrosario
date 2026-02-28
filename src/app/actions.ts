"use server";

import { createHash } from "node:crypto";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getAdminAccessKey } from "@/lib/env";
import { createServerAnonClient, createServerServiceClient } from "@/lib/supabase/server";

const VOTER_DOCUMENT_COOKIE = "voter_document";
const ADMIN_SESSION_COOKIE = "admin_session";

const documentSchema = z
  .string()
  .trim()
  .regex(/^\d{6,15}$/, "El documento debe tener entre 6 y 15 digitos.");

const voteInputSchema = z.object({
  optionId: z.uuid(),
});

function hashAdminKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}

function buildErrorRedirect(basePath: string, message: string) {
  const params = new URLSearchParams({ error: message });
  return `${basePath}?${params.toString()}`;
}

function buildAdminRedirect(params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      search.set(key, value);
    }
  });

  const query = search.toString();
  return query ? `/admin?${query}` : "/admin";
}

async function ensureAdminAuthorized() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) {
    return false;
  }

  try {
    return token === hashAdminKey(getAdminAccessKey());
  } catch {
    return false;
  }
}

export async function setVoterDocumentAction(formData: FormData) {
  const rawDocument = formData.get("documento");
  const parsedDocument = documentSchema.safeParse(rawDocument);

  if (!parsedDocument.success) {
    redirect(buildErrorRedirect("/", "Documento invalido. Revisa e intenta de nuevo."));
  }

  const cookieStore = await cookies();
  cookieStore.set(VOTER_DOCUMENT_COOKIE, parsedDocument.data, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 4,
    path: "/",
  });

  redirect("/votar");
}

export async function castVoteAction(input: unknown) {
  const parsedInput = voteInputSchema.safeParse(input);
  if (!parsedInput.success) {
    return { ok: false, message: "Seleccion invalida." };
  }

  const cookieStore = await cookies();
  const voterDocumentCookie = cookieStore.get(VOTER_DOCUMENT_COOKIE)?.value ?? "";
  const parsedDocument = documentSchema.safeParse(voterDocumentCookie);

  if (!parsedDocument.success) {
    return {
      ok: false,
      message: "Tu sesion de votacion expiro. Vuelve a ingresar el documento.",
    };
  }

  const supabase = createServerAnonClient();
  const { data: selectedOption, error: optionError } = await supabase
    .from("poll_options")
    .select("id, poll_id, candidate_name")
    .eq("id", parsedInput.data.optionId)
    .maybeSingle();

  if (optionError) {
    return { ok: false, message: "No se pudo validar el candidato seleccionado." };
  }

  if (!selectedOption) {
    return { ok: false, message: "Candidato no encontrado." };
  }

  const nowIso = new Date().toISOString();
  const { data: poll, error: pollError } = await supabase
    .from("polls")
    .select("id, status, starts_at, ends_at")
    .eq("id", selectedOption.poll_id)
    .eq("status", "open")
    .lte("starts_at", nowIso)
    .gte("ends_at", nowIso)
    .maybeSingle();

  if (pollError || !poll) {
    return { ok: false, message: "La votacion no esta disponible en este momento." };
  }

  const { error: insertError } = await supabase.from("votes").insert({
    poll_id: poll.id,
    option_id: selectedOption.id,
    voter_document: parsedDocument.data,
  });

  if (insertError) {
    if (insertError.code === "23505") {
      return { ok: false, message: "Este documento ya voto en esta votacion." };
    }

    return { ok: false, message: "No fue posible guardar tu voto. Intenta nuevamente." };
  }

  revalidatePath("/admin");
  return {
    ok: true,
    message: `Voto registrado por ${selectedOption.candidate_name}.`,
  };
}

export async function adminLoginAction(formData: FormData) {
  const adminKeyInput = z.string().trim().min(8).safeParse(formData.get("clave"));
  if (!adminKeyInput.success) {
    redirect(buildErrorRedirect("/admin", "Clave invalida."));
  }

  const expectedAdminKey = getAdminAccessKey();
  if (adminKeyInput.data !== expectedAdminKey) {
    redirect(buildErrorRedirect("/admin", "Clave incorrecta."));
  }

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, hashAdminKey(expectedAdminKey), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });

  redirect("/admin");
}

export async function adminLogoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
  redirect("/admin");
}

export async function isAdminSessionActive() {
  return ensureAdminAuthorized();
}

export async function createPollAction(formData: FormData) {
  const isAuthorized = await ensureAdminAuthorized();
  if (!isAuthorized) {
    redirect(buildAdminRedirect({ error: "Sesion de administrador expirada.", tab: "manage" }));
  }

  const title = z.string().trim().min(3).max(120).safeParse(formData.get("title"));
  const description = z.string().trim().max(500).safeParse(formData.get("description") ?? "");
  const startsAtRaw = z.string().trim().safeParse(formData.get("startsAt"));
  const endsAtRaw = z.string().trim().safeParse(formData.get("endsAt"));
  const status = z.enum(["draft", "open", "closed"]).safeParse(formData.get("status"));

  if (!title.success || !description.success || !startsAtRaw.success || !endsAtRaw.success || !status.success) {
    redirect(buildAdminRedirect({ error: "Datos invalidos para crear votacion.", tab: "manage" }));
  }

  const startsAtDate = new Date(startsAtRaw.data);
  const endsAtDate = new Date(endsAtRaw.data);

  if (Number.isNaN(startsAtDate.getTime()) || Number.isNaN(endsAtDate.getTime())) {
    redirect(buildAdminRedirect({ error: "Fechas invalidas.", tab: "manage" }));
  }

  if (endsAtDate <= startsAtDate) {
    redirect(
      buildAdminRedirect({
        error: "La fecha de cierre debe ser posterior a la apertura.",
        tab: "manage",
      }),
    );
  }

  const supabase = createServerServiceClient();
  const { data: createdPoll, error } = await supabase
    .from("polls")
    .insert({
      title: title.data,
      description: description.data || null,
      starts_at: startsAtDate.toISOString(),
      ends_at: endsAtDate.toISOString(),
      status: status.data,
    })
    .select("id")
    .single();

  if (error || !createdPoll) {
    redirect(
      buildAdminRedirect({
        error: "No se pudo crear la votacion.",
        tab: "manage",
      }),
    );
  }

  revalidatePath("/admin");
  redirect(
    buildAdminRedirect({
      success: "Votacion creada correctamente.",
      tab: "manage",
      pollId: createdPoll.id,
    }),
  );
}

export async function addCandidateAction(formData: FormData) {
  const isAuthorized = await ensureAdminAuthorized();
  if (!isAuthorized) {
    redirect(buildAdminRedirect({ error: "Sesion de administrador expirada.", tab: "manage" }));
  }

  const pollId = z.uuid().safeParse(formData.get("pollId"));
  const candidateName = z.string().trim().min(2).max(120).safeParse(formData.get("candidateName"));
  const candidateImageRaw = z.string().trim().safeParse(formData.get("candidateImage") ?? "");
  const sortOrder = z.coerce.number().int().min(0).max(999).safeParse(formData.get("sortOrder"));

  if (!pollId.success || !candidateName.success || !candidateImageRaw.success || !sortOrder.success) {
    redirect(buildAdminRedirect({ error: "Datos invalidos para candidato.", tab: "manage" }));
  }

  const normalizedImageName = candidateImageRaw.data
    .replace(/^\/?candidatos\//i, "")
    .trim();

  const imageNamePattern = /^[a-z0-9_-]+\.(png|jpg|jpeg|webp|gif)$/i;

  if (normalizedImageName && !imageNamePattern.test(normalizedImageName)) {
    redirect(
      buildAdminRedirect({
        error: "Nombre de imagen invalido. Usa formato como jefren.png",
        tab: "manage",
        pollId: pollId.data,
      }),
    );
  }

  const imagePath = normalizedImageName ? `/candidatos/${normalizedImageName}` : null;

  const supabase = createServerServiceClient();
  const { error } = await supabase.from("poll_options").insert({
    poll_id: pollId.data,
    candidate_name: candidateName.data,
    image_url: imagePath,
    sort_order: sortOrder.data,
  });

  if (error) {
    redirect(
      buildAdminRedirect({
        error: "No se pudo agregar el candidato.",
        tab: "manage",
        pollId: pollId.data,
      }),
    );
  }

  revalidatePath("/admin");
  redirect(
    buildAdminRedirect({
      success: "Candidato agregado correctamente.",
      tab: "manage",
      pollId: pollId.data,
    }),
  );
}

export async function updatePollStatusAction(formData: FormData) {
  const isAuthorized = await ensureAdminAuthorized();
  if (!isAuthorized) {
    redirect(buildAdminRedirect({ error: "Sesion de administrador expirada.", tab: "manage" }));
  }

  const pollId = z.uuid().safeParse(formData.get("pollId"));
  const status = z.enum(["draft", "open", "closed", "archived"]).safeParse(formData.get("status"));

  if (!pollId.success || !status.success) {
    redirect(buildAdminRedirect({ error: "Datos invalidos para cambiar estado.", tab: "manage" }));
  }

  const supabase = createServerServiceClient();
  const { error } = await supabase
    .from("polls")
    .update({
      status: status.data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", pollId.data);

  if (error) {
    redirect(
      buildAdminRedirect({
        error: "No se pudo actualizar el estado.",
        tab: "manage",
        pollId: pollId.data,
      }),
    );
  }

  revalidatePath("/admin");
  redirect(
    buildAdminRedirect({
      success: "Estado de votacion actualizado.",
      tab: "manage",
      pollId: pollId.data,
    }),
  );
}

export async function updatePollDetailsAction(formData: FormData) {
  const isAuthorized = await ensureAdminAuthorized();
  if (!isAuthorized) {
    redirect(buildAdminRedirect({ error: "Sesion de administrador expirada.", tab: "manage" }));
  }

  const pollId = z.uuid().safeParse(formData.get("pollId"));
  const startsAtRaw = z.string().trim().safeParse(formData.get("startsAt"));
  const endsAtRaw = z.string().trim().safeParse(formData.get("endsAt"));
  const status = z.enum(["draft", "open", "closed", "archived"]).safeParse(formData.get("status"));

  if (!pollId.success || !startsAtRaw.success || !endsAtRaw.success || !status.success) {
    redirect(buildAdminRedirect({ error: "Datos invalidos para editar votacion.", tab: "manage" }));
  }

  const startsAtDate = new Date(startsAtRaw.data);
  const endsAtDate = new Date(endsAtRaw.data);

  if (Number.isNaN(startsAtDate.getTime()) || Number.isNaN(endsAtDate.getTime())) {
    redirect(buildAdminRedirect({ error: "Fechas invalidas.", tab: "manage", pollId: pollId.data }));
  }

  if (endsAtDate <= startsAtDate) {
    redirect(
      buildAdminRedirect({
        error: "La fecha de cierre debe ser posterior a la apertura.",
        tab: "manage",
        pollId: pollId.data,
      }),
    );
  }

  const supabase = createServerServiceClient();
  const { error } = await supabase
    .from("polls")
    .update({
      starts_at: startsAtDate.toISOString(),
      ends_at: endsAtDate.toISOString(),
      status: status.data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", pollId.data);

  if (error) {
    redirect(
      buildAdminRedirect({
        error: "No se pudo actualizar la votacion seleccionada.",
        tab: "manage",
        pollId: pollId.data,
      }),
    );
  }

  revalidatePath("/admin");
  redirect(
    buildAdminRedirect({
      success: "Votacion actualizada correctamente.",
      tab: "manage",
      pollId: pollId.data,
    }),
  );
}

export async function deleteCandidateAction(formData: FormData) {
  const isAuthorized = await ensureAdminAuthorized();
  if (!isAuthorized) {
    redirect(buildAdminRedirect({ error: "Sesion de administrador expirada.", tab: "manage" }));
  }

  const pollId = z.uuid().safeParse(formData.get("pollId"));
  const candidateId = z.uuid().safeParse(formData.get("candidateId"));

  if (!pollId.success || !candidateId.success) {
    redirect(buildAdminRedirect({ error: "Datos invalidos para eliminar candidato.", tab: "manage" }));
  }

  const supabase = createServerServiceClient();
  const { error } = await supabase
    .from("poll_options")
    .delete()
    .eq("id", candidateId.data)
    .eq("poll_id", pollId.data);

  if (error) {
    const message =
      error.code === "23503"
        ? "No se puede eliminar este candidato porque ya tiene votos registrados."
        : "No se pudo eliminar el candidato.";

    redirect(
      buildAdminRedirect({
        error: message,
        tab: "manage",
        pollId: pollId.data,
      }),
    );
  }

  revalidatePath("/admin");
  redirect(
    buildAdminRedirect({
      success: "Candidato eliminado correctamente.",
      tab: "manage",
      pollId: pollId.data,
    }),
  );
}

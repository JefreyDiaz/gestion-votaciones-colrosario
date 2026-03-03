import { createServerServiceClient } from "@/lib/supabase/server";

export type PollScope = "general" | "salon";

export type CandidateOption = {
  id: string;
  candidateName: string;
  imageUrl: string | null;
};

export type ActivePoll = {
  id: string;
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string;
  scope: PollScope;
  options: CandidateOption[];
};

type PollRow = {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string;
  scope: PollScope;
};

function mapPollWithOptions(poll: PollRow, options: CandidateOption[]): ActivePoll {
  return {
    id: poll.id,
    title: poll.title,
    description: poll.description,
    startsAt: poll.starts_at,
    endsAt: poll.ends_at,
    scope: poll.scope,
    options,
  };
}

export async function getVoterAvailablePolls(voterDocument: string): Promise<ActivePoll[]> {
  const supabase = createServerServiceClient();
  const nowIso = new Date().toISOString();

  const { data: openPolls, error: pollError } = await supabase
    .from("polls")
    .select("id, title, description, starts_at, ends_at, scope")
    .eq("status", "open")
    .lte("starts_at", nowIso)
    .gte("ends_at", nowIso)
    .order("starts_at", { ascending: false })
    .range(0, 19);

  if (pollError) {
    throw new Error(`No se pudieron obtener las votaciones activas: ${pollError.message}`);
  }

  if (!openPolls.length) {
    return [];
  }

  const openPollIds = openPolls.map((poll) => poll.id);

  const { data: votedRows, error: votedError } = await supabase
    .from("votes")
    .select("poll_id")
    .eq("voter_document", voterDocument)
    .in("poll_id", openPollIds);

  if (votedError) {
    throw new Error(`No se pudieron validar votos previos: ${votedError.message}`);
  }

  const votedPollIds = new Set(votedRows.map((vote) => vote.poll_id));
  const availablePolls = openPolls.filter((poll) => !votedPollIds.has(poll.id));

  if (!availablePolls.length) {
    return [];
  }

  const availablePollIds = availablePolls.map((poll) => poll.id);
  const { data: options, error: optionsError } = await supabase
    .from("poll_options")
    .select("id, poll_id, candidate_name, image_url, sort_order")
    .in("poll_id", availablePollIds)
    .order("sort_order", { ascending: true });

  if (optionsError) {
    throw new Error(`No se pudieron obtener los candidatos: ${optionsError.message}`);
  }

  const optionsByPoll = new Map<string, CandidateOption[]>();
  options.forEach((option) => {
    const currentOptions = optionsByPoll.get(option.poll_id) ?? [];
    currentOptions.push({
      id: option.id,
      candidateName: option.candidate_name,
      imageUrl: option.image_url,
    });
    optionsByPoll.set(option.poll_id, currentOptions);
  });

  return availablePolls
    .map((poll) => mapPollWithOptions(poll, optionsByPoll.get(poll.id) ?? []))
    .filter((poll) => poll.options.length > 0);
}

export type AdminVoteRow = {
  id: string;
  createdAt: string;
  voterDocument: string;
  candidateName: string;
};

export type AdminDashboardData = {
  pollTitle: string;
  pollId: string;
  scope: PollScope;
  totalVotes: number;
  candidates: Array<{
    id: string;
    candidateName: string;
    votes: number;
  }>;
  recentVotes: AdminVoteRow[];
};

export type AdminManagePoll = {
  id: string;
  title: string;
  scope: PollScope;
  status: "draft" | "open" | "closed" | "archived";
  startsAt: string;
  endsAt: string;
  createdAt: string;
};

export type AdminManagePollOption = {
  id: string;
  candidateName: string;
  imageUrl: string | null;
  sortOrder: number;
};

export async function getAdminDashboardData(): Promise<AdminDashboardData | null> {
  const supabase = createServerServiceClient();

  const { data: poll, error: pollError } = await supabase
    .from("polls")
    .select("id, title, status, starts_at, ends_at, scope")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (pollError) {
    throw new Error(`No se pudo obtener la votacion para dashboard: ${pollError.message}`);
  }

  if (!poll) {
    return null;
  }

  const { data: options, error: optionsError } = await supabase
    .from("poll_options")
    .select("id, candidate_name, sort_order")
    .eq("poll_id", poll.id)
    .order("sort_order", { ascending: true });

  if (optionsError) {
    throw new Error(`No se pudieron obtener candidatos para dashboard: ${optionsError.message}`);
  }

  const countPromises = options.map(async (candidate) => {
    const { count, error } = await supabase
      .from("votes")
      .select("id", { count: "exact", head: true })
      .eq("poll_id", poll.id)
      .eq("option_id", candidate.id);

    if (error) {
      throw new Error(`No se pudo contar votos para ${candidate.candidate_name}: ${error.message}`);
    }

    return {
      id: candidate.id,
      candidateName: candidate.candidate_name,
      votes: count ?? 0,
    };
  });

  const candidates = await Promise.all(countPromises);

  const totalVotes = candidates.reduce((sum, candidate) => sum + candidate.votes, 0);

  const { data: recentVotes, error: recentVotesError } = await supabase
    .from("votes")
    .select("id, created_at, voter_document, option_id")
    .eq("poll_id", poll.id)
    .order("created_at", { ascending: false })
    .range(0, 49);

  if (recentVotesError) {
    throw new Error(`No se pudieron obtener votos recientes: ${recentVotesError.message}`);
  }

  const optionById = new Map(options.map((option) => [option.id, option.candidate_name]));

  return {
    pollTitle: poll.title,
    pollId: poll.id,
    scope: poll.scope,
    totalVotes,
    candidates,
    recentVotes: recentVotes.map((vote) => ({
      id: vote.id,
      createdAt: vote.created_at,
      voterDocument: vote.voter_document,
      candidateName: optionById.get(vote.option_id) ?? "Candidato desconocido",
    })),
  };
}

export async function getAdminManageData(selectedPollId?: string) {
  const supabase = createServerServiceClient();

  const { data: polls, error: pollsError } = await supabase
    .from("polls")
    .select("id, title, scope, status, starts_at, ends_at, created_at")
    .order("created_at", { ascending: false })
    .range(0, 29);

  if (pollsError) {
    throw new Error(`No se pudieron obtener votaciones: ${pollsError.message}`);
  }

  const mappedPolls: AdminManagePoll[] = polls.map((poll) => ({
    id: poll.id,
    title: poll.title,
    scope: poll.scope,
    status: poll.status,
    startsAt: poll.starts_at,
    endsAt: poll.ends_at,
    createdAt: poll.created_at,
  }));

  if (!mappedPolls.length) {
    return {
      polls: mappedPolls,
      selectedPollId: undefined,
      selectedPollOptions: [] as AdminManagePollOption[],
    };
  }

  const selectedId =
    (selectedPollId && mappedPolls.some((poll) => poll.id === selectedPollId) ? selectedPollId : undefined) ??
    mappedPolls[0].id;

  const { data: options, error: optionsError } = await supabase
    .from("poll_options")
    .select("id, candidate_name, image_url, sort_order")
    .eq("poll_id", selectedId)
    .order("sort_order", { ascending: true });

  if (optionsError) {
    throw new Error(`No se pudieron obtener candidatos de la votacion: ${optionsError.message}`);
  }

  return {
    polls: mappedPolls,
    selectedPollId: selectedId,
    selectedPollOptions: options.map((option) => ({
      id: option.id,
      candidateName: option.candidate_name,
      imageUrl: option.image_url,
      sortOrder: option.sort_order,
    })),
  };
}

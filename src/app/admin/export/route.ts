import { NextResponse } from "next/server";
import { z } from "zod";

import { isAdminSessionActive } from "@/app/actions";
import { getAdminPollExportData } from "@/lib/polls";

function csvCell(value: string | number) {
  const normalized = String(value ?? "");
  return `"${normalized.replaceAll('"', '""')}"`;
}

function toSafeFileName(input: string) {
  return input
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/g, "")
    .replaceAll(/[^a-zA-Z0-9-_]+/g, "-")
    .replaceAll(/^-+|-+$/g, "")
    .toLowerCase();
}

export async function GET(request: Request) {
  const isAuthorized = await isAdminSessionActive();
  if (!isAuthorized) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const url = new URL(request.url);
  const pollId = z.uuid().safeParse(url.searchParams.get("pollId"));

  if (!pollId.success) {
    return NextResponse.json({ error: "pollId invalido." }, { status: 400 });
  }

  const exportData = await getAdminPollExportData(pollId.data);
  if (!exportData) {
    return NextResponse.json({ error: "Votacion no encontrada." }, { status: 404 });
  }

  const lines: string[] = [
    `${csvCell("Votacion")},${csvCell(exportData.pollTitle)},${csvCell("Alcance")},${csvCell(exportData.scope)}`,
    `${csvCell("Total votos")},${csvCell(exportData.totalVotes)}`,
    "",
    `${csvCell("Candidato")},${csvCell("Votos")}`,
  ];
  exportData.candidates.forEach((candidate) => {
    lines.push(`${csvCell(candidate.candidateName)},${csvCell(candidate.votes)}`);
  });
  lines.push("", `${csvCell("Fecha")},${csvCell("Documento")},${csvCell("Candidato")}`);
  exportData.recentVotes.forEach((vote) => {
    lines.push(
      `${csvCell(vote.createdAt)},${csvCell(vote.voterDocument)},${csvCell(vote.candidateName)}`,
    );
  });

  const csvContent = `\ufeff${lines.join("\n")}`;
  const fileName = `${toSafeFileName(exportData.pollTitle) || "resumen-votacion"}.csv`;

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}

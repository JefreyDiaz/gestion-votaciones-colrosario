"use client";

import { useTransition } from "react";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { AdminManagePoll } from "@/lib/polls";

import styles from "./page.module.css";

type OverviewPollSelectorProps = Readonly<{
  polls: AdminManagePoll[];
  selectedPollId?: string;
}>;

export function OverviewPollSelector({ polls, selectedPollId }: OverviewPollSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  if (!polls.length) {
    return null;
  }

  return (
    <div className={styles.inlineForm}>
      <label htmlFor="overviewPollId" className={styles.inlineLabel}>
        Votacion
      </label>
      <select
        id="overviewPollId"
        name="overviewPollId"
        value={selectedPollId ?? polls[0].id}
        disabled={isPending}
        onChange={(event) => {
          const params = new URLSearchParams(searchParams.toString());
          params.set("tab", "overview");
          params.set("overviewPollId", event.currentTarget.value);
          params.delete("error");
          params.delete("success");

          startTransition(() => {
            router.push(`${pathname}?${params.toString()}`);
          });
        }}
      >
        {polls.map((poll) => (
          <option key={poll.id} value={poll.id}>
            {poll.title}
          </option>
        ))}
      </select>
    </div>
  );
}

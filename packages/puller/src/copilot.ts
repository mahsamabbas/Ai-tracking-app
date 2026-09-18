export interface CopilotReportLink {
  download_url?: string;
}

/** Fetches signed download URL for org daily user metrics (Tier B). */
export async function fetchCopilotUsersReportUrl(
  token: string,
  org: string,
  day: string,
): Promise<string | null> {
  const url = `https://api.github.com/orgs/${org}/copilot/metrics/reports/users-1-day?day=${day}`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { report_download_url?: string };
  return json.report_download_url ?? null;
}

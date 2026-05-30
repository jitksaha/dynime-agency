// Catalog of platforms where we cross-post job openings.
// "Dynime Jobs" is our internal/business-manager listing and is intentionally
// listed first so admins can pick it as the canonical apply source.

export interface JobChannelDef {
  id: string;
  name: string;
  /** Lucide icon name OR public URL to logo */
  logo?: string;
  /** Hint shown under the URL input */
  hint?: string;
  color: string; // tailwind color token / hex for badge
}

export const JOB_CHANNELS: JobChannelDef[] = [
  { id: "dynime",   name: "Dynime Jobs",     hint: "Our business manager (internal)", color: "#6366f1" },
  { id: "bdjobs",   name: "Bdjobs",          hint: "https://www.bdjobs.com/...",      color: "#ef4444" },
  { id: "linkedin", name: "LinkedIn",        hint: "https://www.linkedin.com/jobs/view/...", color: "#0a66c2" },
  { id: "indeed",   name: "Indeed",          hint: "https://www.indeed.com/viewjob?jk=...", color: "#2557a7" },
  { id: "dynamite", name: "Dynamite Jobs",   hint: "https://dynamitejobs.com/...",    color: "#f97316" },
  { id: "glassdoor",name: "Glassdoor",       hint: "https://www.glassdoor.com/job-listing/...", color: "#0caa41" },
  { id: "weworkremotely", name: "We Work Remotely", hint: "https://weworkremotely.com/remote-jobs/...", color: "#1d4ed8" },
  { id: "remoteok", name: "Remote OK",       hint: "https://remoteok.com/remote-jobs/...",  color: "#111827" },
  { id: "wellfound",name: "Wellfound",       hint: "https://wellfound.com/jobs/...",  color: "#000000" },
  { id: "other",    name: "Other",           hint: "Any other listing URL",           color: "#64748b" },
];

export const findChannel = (id: string) =>
  JOB_CHANNELS.find((c) => c.id === id) ?? JOB_CHANNELS[JOB_CHANNELS.length - 1];

export interface PostingChannel {
  id: string;          // matches JobChannelDef.id
  url: string;         // posting URL on that platform
  label?: string;      // optional override label
}

/**
 * Auto-generate descriptive alt text for portfolio thumbnails from project metadata.
 * Used as a fallback when an editor hasn't provided a custom alt text.
 */
export const generateAltText = (opts: {
  title?: string;
  category?: string;
  clientName?: string | null;
  description?: string | null;
  technologies?: string[] | null;
}): string => {
  const { title, category, clientName, description, technologies } = opts;
  if (!title) return "Portfolio project thumbnail";

  const parts: string[] = [];
  parts.push(`${title} — ${category || "portfolio"} project`);

  if (clientName) parts.push(`for ${clientName}`);

  if (technologies && technologies.length > 0) {
    parts.push(`built with ${technologies.slice(0, 3).join(", ")}`);
  } else if (description) {
    // first sentence, max 80 chars
    const firstSentence = description.split(/[.!?]/)[0].trim();
    if (firstSentence.length > 0) {
      parts.push(firstSentence.length > 80 ? `${firstSentence.slice(0, 77)}...` : firstSentence);
    }
  }

  return parts.join(" ").replace(/\s+/g, " ").trim();
};

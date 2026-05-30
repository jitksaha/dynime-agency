// Tokenization + stopword filtering used by deterministic keyword scoring.
const STOPWORDS = new Set([
  "the","and","for","with","you","your","our","are","will","that","this","from","have","has",
  "but","not","all","any","can","into","its","out","who","why","how","what","when","where",
  "we","us","be","is","of","to","in","on","an","a","or","at","as","by","it","if","do","so",
  "their","they","them","etc","eg","ie","via","per","up","also","just","like","more","most",
  "team","role","work","working","job","jobs","position","candidate","applicant","experience",
  "year","years","skill","skills","ability","strong","good","great","excellent","plus","nice",
  "must","should","required","preferred","including","include","includes","using","use","used",
  "able","across","within","while","other","others","new","help","build","building","based",
  "company","companies","business","product","products","customer","customers","client","clients",
]);

export function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z][a-z0-9+.#-]{1,40}/g) || [])
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
}

export function deriveKeywords(career: any): string[] {
  if (!career) return [];
  const out = new Set<string>();
  (Array.isArray(career.requirements) ? career.requirements : []).forEach((r: string) => {
    tokenize(String(r || "")).forEach((t) => out.add(t));
  });
  tokenize(`${career.title || ""} ${career.department || ""}`).forEach((t) => out.add(t));
  const plain = String(career.content_html || "").replace(/<[^>]+>/g, " ");
  const freq = new Map<string, number>();
  tokenize(plain).forEach((t) => freq.set(t, (freq.get(t) || 0) + 1));
  for (const [t, c] of freq) if (c >= 2) out.add(t);
  return Array.from(out).slice(0, 80);
}

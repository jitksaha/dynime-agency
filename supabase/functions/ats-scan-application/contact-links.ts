// Regex-based contact extraction from any free text (resume / cover letter).
export interface ContactLinks {
  emails: string[];
  phones: string[];
  urls: string[];
  linkedIn: string[];
  github: string[];
  twitter: string[];
  dribbble: string[];
  portfolio: string[];
}

export function extractContactLinks(text: string): ContactLinks {
  const t = text || "";
  const emails = Array.from(new Set((t.match(/[\w.+-]+@[\w-]+\.[\w.-]+/g) || []).map((s) => s.toLowerCase())));
  const phones = Array.from(new Set((t.match(/(\+?\d[\d\s().-]{7,}\d)/g) || []).map((s) => s.replace(/\s+/g, " ").trim())));
  const urls = Array.from(new Set((t.match(/https?:\/\/[^\s)<>'"]+/gi) || [])));
  const linkedIn = urls.filter((u) => /linkedin\.com/i.test(u));
  const github = urls.filter((u) => /github\.com/i.test(u));
  const twitter = urls.filter((u) => /(twitter\.com|x\.com)/i.test(u));
  const dribbble = urls.filter((u) => /dribbble\.com|behance\.net/i.test(u));
  const portfolio = urls.filter((u) =>
    !linkedIn.includes(u) && !github.includes(u) && !twitter.includes(u) && !dribbble.includes(u)
  );
  return { emails, phones, urls, linkedIn, github, twitter, dribbble, portfolio };
}

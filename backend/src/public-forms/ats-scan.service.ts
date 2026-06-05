import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MinioService } from '../storage/minio.service';
import { extractText, getDocumentProxy } from 'unpdf';
import * as mammoth from 'mammoth';

export interface KeywordMatch {
  matched: string[];
  missing: string[];
}

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

export interface AiInsights {
  detected_skills?: string[];
  detected_titles?: string[];
  detected_experience_years?: number | null;
  education?: string;
  contact_links?: {
    emails?: string[];
    phones?: string[];
    linkedin?: string[];
    github?: string[];
    portfolio?: string[];
    other?: string[];
  };
  highlights?: string[];
  red_flags?: string[];
  recommendation?: string;
  fit_score?: number;
}

const STOPWORDS = new Set([
  'the','and','for','with','you','your','our','are','will','that','this','from','have','has',
  'but','not','all','any','can','into','its','out','who','why','how','what','when','where',
  'we','us','be','is','of','to','in','on','an','a','or','at','as','by','it','if','do','so',
  'their','they','them','etc','eg','ie','via','per','up','also','just','like','more','most',
  'team','role','work','working','job','jobs','position','candidate','applicant','experience',
  'year','years','skill','skills','ability','strong','good','great','excellent','plus','nice',
  'must','should','required','preferred','including','include','includes','using','use','used',
  'able','across','within','while','other','others','new','help','build','building','based',
  'company','companies','business','product','products','customer','customers','client','clients',
]);

@Injectable()
export class AtsScanService {
  private readonly logger = new Logger(AtsScanService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly minio: MinioService,
  ) {}

  tokenize(text: string): string[] {
    return (text.toLowerCase().match(/[a-z][a-z0-9+.#-]{1,40}/g) || [])
      .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
  }

  deriveKeywords(career: any): string[] {
    if (!career) return [];
    const out = new Set<string>();
    
    // Safety check for requirements JSON
    const requirements = Array.isArray(career.requirements) 
      ? career.requirements 
      : typeof career.requirements === 'string'
      ? JSON.parse(career.requirements || '[]')
      : [];

    requirements.forEach((r: string) => {
      this.tokenize(String(r || '')).forEach((t) => out.add(t));
    });
    
    this.tokenize(`${career.title || ''} ${career.department || ''}`).forEach((t) => out.add(t));
    const plain = String(career.content_html || '').replace(/<[^>]+>/g, ' ');
    const freq = new Map<string, number>();
    this.tokenize(plain).forEach((t) => freq.set(t, (freq.get(t) || 0) + 1));
    for (const [t, c] of freq) {
      if (c >= 2) out.add(t);
    }
    return Array.from(out).slice(0, 80);
  }

  matchKeywords(corpus: string, keywords: string[]): KeywordMatch {
    const tokens = new Set(this.tokenize(corpus));
    const matched: string[] = [];
    const missing: string[] = [];
    for (const k of keywords) {
      if (tokens.has(k) || corpus.includes(k)) {
        matched.push(k);
      } else {
        missing.push(k);
      }
    }
    return { matched, missing };
  }

  computeBaseScore(opts: {
    keywords: string[];
    matched: string[];
    resumeChars: number;
  }): number {
    const { keywords, matched, resumeChars } = opts;
    if (keywords.length > 0) {
      return Math.round((matched.length / keywords.length) * 100);
    }
    return resumeChars > 200 ? 50 : 25;
  }

  detectRequiredYears(career: any): number | null {
    const requirements = Array.isArray(career?.requirements)
      ? career.requirements
      : typeof career?.requirements === 'string'
      ? JSON.parse(career.requirements || '[]')
      : [];
      
    const reqText = requirements.join(' ') + ' ' + (career?.content_html || '');
    const yrMatch = reqText.match(/(\d+)\+?\s*(?:\+|to\s*\d+)?\s*year/i);
    return yrMatch ? parseInt(yrMatch[1], 10) : null;
  }

  applyExperiencePenalty(opts: {
    baseScore: number;
    requiredYears: number | null;
    applicantYears: number | null;
  }): number {
    const { baseScore, requiredYears, applicantYears } = opts;
    let score = baseScore;
    if (requiredYears != null && applicantYears != null) {
      const gap = requiredYears - Number(applicantYears);
      if (gap > 0) {
        score = Math.max(0, score - Math.min(30, gap * 8));
      }
    }
    return Math.max(0, Math.min(100, score));
  }

  blendWithAiScore(baseScore: number, aiScore: number | null): number {
    if (aiScore == null || !Number.isFinite(aiScore)) return baseScore;
    const clamped = Math.max(0, Math.min(100, Math.round(aiScore)));
    return Math.max(0, Math.min(100, Math.round(clamped * 0.6 + baseScore * 0.4)));
  }

  levelFromScore(score: number): 'high' | 'medium' | 'low' {
    return score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low';
  }

  buildCandidateCorpus(app: any, resumeText: string): string {
    return [
      app.full_name, app.email, app.phone, app.country, app.current_position,
      app.expected_salary != null ? String(app.expected_salary) : '',
      app.experience_years != null ? `${app.experience_years} years experience` : '',
      app.linkedin_url, app.portfolio_url,
      app.cover_letter, resumeText,
    ].filter(Boolean).join('\n').toLowerCase();
  }

  extractContactLinks(text: string): ContactLinks {
    const t = text || '';
    const emails = Array.from(new Set((t.match(/[\w.+-]+@[\w-]+\.[\w.-]+/g) || []).map((s) => s.toLowerCase())));
    const phones = Array.from(new Set((t.match(/(\+?\d[\d\s().-]{7,}\d)/g) || []).map((s) => s.replace(/\s+/g, ' ').trim())));
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

  async extractResumeText(buf: Buffer, filename: string): Promise<string> {
    const lower = filename.toLowerCase();
    try {
      if (lower.endsWith('.pdf')) {
        const pdf = await getDocumentProxy(new Uint8Array(buf));
        const { text } = await extractText(pdf, { mergePages: true });
        return Array.isArray(text) ? text.join('\n') : String(text || '');
      }
      if (lower.endsWith('.docx') || lower.endsWith('.doc')) {
        const result = await mammoth.extractRawText({ buffer: buf });
        return result.value || '';
      }
      if (lower.endsWith('.txt') || lower.endsWith('.md') || lower.endsWith('.rtf')) {
        return buf.toString('utf-8');
      }
    } catch (e) {
      this.logger.error(`Resume text extraction failed: ${e.message}`);
    }
    try {
      return buf.toString('utf-8').slice(0, 200000);
    } catch {
      return '';
    }
  }

  async aiStructuredExtract(args: {
    career: any;
    app: any;
    resumeText: string;
  }): Promise<AiInsights | null> {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      this.logger.warn('LOVABLE_API_KEY not configured, skipping AI insights extraction');
      return null;
    }

    const system =
      'You are an expert ATS (Applicant Tracking System) analyst. Parse the candidate\'s full submission and return strict JSON only. Be objective, concise, and grounded in evidence from the materials.';

    const careerReqs = Array.isArray(args.career?.requirements)
      ? args.career.requirements
      : typeof args.career?.requirements === 'string'
      ? JSON.parse(args.career.requirements || '[]')
      : [];

    const careerSummary = {
      title: args.career?.title || null,
      department: args.career?.department || null,
      requirements: careerReqs.slice(0, 30),
      description: String(args.career?.content_html || '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .slice(0, 4000),
    };

    const appSummary = {
      full_name: args.app.full_name,
      email: args.app.email,
      phone: args.app.phone,
      country: args.app.country,
      current_position: args.app.current_position,
      experience_years: args.app.experience_years,
      expected_salary: args.app.expected_salary,
      linkedin_url: args.app.linkedin_url,
      portfolio_url: args.app.portfolio_url,
      cover_letter: String(args.app.cover_letter || '').slice(0, 4000),
    };

    const prompt = `JOB POST:
${JSON.stringify(careerSummary, null, 2)}

APPLICANT SUBMISSION (form fields):
${JSON.stringify(appSummary, null, 2)}

RESUME / CV TEXT (may be empty if unparseable):
"""${String(args.resumeText || '').slice(0, 14000)}"""

Return JSON with exactly this shape:
{
  "detected_skills": string[],
  "detected_titles": string[],
  "detected_experience_years": number | null,
  "education": string,
  "contact_links": {
    "emails": string[], "phones": string[],
    "linkedin": string[], "github": string[],
    "portfolio": string[], "other": string[]
  },
  "highlights": string[],
  "red_flags": string[],
  "recommendation": string,
  "fit_score": number
}
Only return JSON. No prose, no markdown.`;

    try {
      const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: prompt },
          ],
          response_format: { type: 'json_object' },
        }),
      });
      if (!resp.ok) {
        this.logger.error(`Lovable AI Gateway error: ${resp.status} - ${await resp.text().catch(() => '')}`);
        return null;
      }
      const json = await resp.json();
      const raw = json?.choices?.[0]?.message?.content || '';
      const cleaned = String(raw).trim().replace(/^```json\s*/i, '').replace(/```\s*$/i, '');
      return JSON.parse(cleaned) as AiInsights;
    } catch (e) {
      this.logger.error(`AI structured extraction parse failed: ${e.message}`);
      return null;
    }
  }

  mergeContactLinks(opts: {
    app: any;
    regex: ContactLinks;
    ai: AiInsights | null;
  }) {
    const { app, regex, ai } = opts;
    const aiLinks = ai?.contact_links || {};
    const dedup = (arr: string[]) => Array.from(new Set(arr.filter(Boolean))).slice(0, 10);
    return {
      emails: dedup([
        ...(aiLinks.emails || []),
        ...regex.emails,
        ...(app.email ? [String(app.email).toLowerCase()] : []),
      ]),
      phones: dedup([
        ...(aiLinks.phones || []),
        ...regex.phones,
        ...(app.phone ? [app.phone] : []),
      ]),
      linkedin: dedup([
        ...(aiLinks.linkedin || []),
        ...regex.linkedIn,
        ...(app.linkedin_url ? [app.linkedin_url] : []),
      ]),
      github: dedup([...(aiLinks.github || []), ...regex.github]),
      portfolio: dedup([
        ...(aiLinks.portfolio || []),
        ...regex.portfolio,
        ...(app.portfolio_url ? [app.portfolio_url] : []),
      ]),
      other: dedup([...(aiLinks.other || []), ...regex.twitter, ...regex.dribbble]),
    };
  }

  buildSummary(opts: {
    career: any;
    app: any;
    matched: string[];
    keywords: string[];
    requiredYears: number | null;
    resumeChars: number;
    ai: AiInsights | null;
  }): string {
    const { career, app, matched, keywords, requiredYears, resumeChars, ai } = opts;
    if (!career) return 'No matching job post found for this application.';
    return (
      `Matched ${matched.length}/${keywords.length} keywords for "${career.title}".` +
      (requiredYears != null && app.experience_years != null
        ? ` Required ~${requiredYears}y, candidate has ${app.experience_years}y.` : '') +
      (ai?.recommendation ? ` ${ai.recommendation}` : '') +
      (resumeChars === 0 && app.resume_url ? ' Resume could not be parsed.' : '') +
      (!app.resume_url ? ' No resume uploaded.' : '')
    );
  }

  buildUpdatePayload(opts: {
    score: number;
    level: 'high' | 'medium' | 'low';
    matched: string[];
    missing: string[];
    summary: string;
    resumeChars: number;
    contactLinks: any;
    ai: AiInsights | null;
  }): Record<string, any> {
    const { score, level, matched, missing, summary, resumeChars, contactLinks, ai } = opts;
    const payload: Record<string, any> = {
      ats_score: score,
      ats_match_level: level,
      ats_matched_keywords: matched.slice(0, 50),
      ats_missing_keywords: missing.slice(0, 50),
      ats_summary: summary,
      ats_scanned_at: new Date(),
      ats_resume_chars: resumeChars,
      ats_contact_links: contactLinks,
    };
    if (ai) {
      if (Array.isArray(ai.detected_skills)) {
        payload.ats_detected_skills = ai.detected_skills.slice(0, 60);
      }
      if (Array.isArray(ai.detected_titles)) {
        payload.ats_detected_titles = ai.detected_titles.slice(0, 20);
      }
      if (typeof ai.detected_experience_years === 'number') {
        payload.ats_detected_experience_years = ai.detected_experience_years;
      }
      if (typeof ai.education === 'string') {
        payload.ats_education = ai.education.slice(0, 1000);
      }
      if (Array.isArray(ai.red_flags)) {
        payload.ats_red_flags = ai.red_flags.slice(0, 20);
      }
      if (typeof ai.recommendation === 'string') {
        payload.ats_recommendation = ai.recommendation.slice(0, 500);
      }
      if (Array.isArray(ai.highlights)) {
        payload.ats_highlights = ai.highlights.slice(0, 20);
      }
    }
    return payload;
  }

  private async streamToBuffer(stream: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: any[] = [];
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }

  async scanApplication(applicationId: string): Promise<any> {
    this.logger.log(`Starting ATS scan for application: ${applicationId}`);
    try {
      const app = await this.prisma.job_applications.findUnique({
        where: { id: applicationId },
      });
      if (!app) {
        throw new Error(`Application ${applicationId} not found`);
      }

      // Load career
      const career = app.career_id
        ? await this.prisma.careers.findUnique({ where: { id: app.career_id } })
        : app.career_slug
        ? await this.prisma.careers.findUnique({ where: { slug: app.career_slug } })
        : null;

      if (!career) {
        throw new Error(`Career not found for application ${applicationId}`);
      }

      // Load resume text
      let resumeText = '';
      let resumeChars = 0;
      if (app.resume_url) {
        try {
          const stream = await this.minio.getObject('job-applications', app.resume_url);
          const buf = await this.streamToBuffer(stream);
          resumeText = await this.extractResumeText(buf, app.resume_url);
          resumeChars = resumeText.length;
        } catch (err) {
          this.logger.error(`Could not read resume file ${app.resume_url}: ${err.message}`);
        }
      }

      // Deterministic keyword scoring
      const corpus = this.buildCandidateCorpus(app, resumeText);
      const keywords = this.deriveKeywords(career);
      const { matched, missing } = this.matchKeywords(corpus, keywords);
      const requiredYears = this.detectRequiredYears(career);
      const baseScore = this.applyExperiencePenalty({
        baseScore: this.computeBaseScore({ keywords, matched, resumeChars }),
        requiredYears,
        applicantYears: app.experience_years,
      });

      // AI structured extract (non-blocking, best-effort)
      const regexLinks = this.extractContactLinks(`${resumeText}\n${app.cover_letter || ''}`);
      const ai = await this.aiStructuredExtract({ career, app, resumeText });

      // Score blending
      const score = this.blendWithAiScore(baseScore, ai?.fit_score ?? null);
      const level = this.levelFromScore(score);

      // Merge and updates
      const contactLinks = this.mergeContactLinks({ app, regex: regexLinks, ai });
      const summary = this.buildSummary({ career, app, matched, keywords, requiredYears, resumeChars, ai });
      const payload = this.buildUpdatePayload({
        score, level, matched, missing, summary, resumeChars, contactLinks, ai,
      });

      await this.prisma.job_applications.update({
        where: { id: applicationId },
        data: payload,
      });

      this.logger.log(`Completed ATS scan for application ${applicationId}. Score: ${score}, Level: ${level}`);
      return {
        ok: true,
        score,
        level,
        matched_count: matched.length,
        total_keywords: keywords.length,
        ai_enriched: !!ai,
      };
    } catch (err) {
      this.logger.error(`ATS scan failed for application ${applicationId}: ${err.message}`);
      return { ok: false, error: err.message };
    }
  }
}

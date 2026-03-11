import type { BlogPromptInput } from '@/features/writing/types';

export function buildBlogPrompt(input: BlogPromptInput): string {
  const wordCount = input.targetWordCount ?? 2000;

  const parts: string[] = [
    `TASK: Write a blog post about ${input.topic} using the following research.`,
    '',
    `RESEARCH NOTES:\n${input.researchNotes}`,
    '',
    `SOURCES WITH CITATIONS:\n${input.sources}`,
    '',
    `KEY DATA POINTS:\n${input.dataPoints}`,
  ];

  if (input.authorContext) {
    parts.push('', `AUTHOR CONTEXT:\n${input.authorContext}`);
  }

  parts.push(
    '',
    `FORMAT: Blog post (${wordCount} words)`,
    '',
    `STRUCTURE:
1. TITLE: Specific and descriptive. Include the core topic naturally. No clickbait. No "The Ultimate Guide to..."
2. TL;DR SUMMARY (top of post): 2-3 sentences stating what the reader will learn and why it matters.
3. SECTION 1 — THE PROBLEM/CONTEXT: Set up why this topic matters using a concrete example or data point. (150-250 words)
4. SECTION 2 — CORE ANALYSIS: The main substance. Break into sub-sections. Every claim backed by cited research. (600-1000 words)
5. SECTION 3 — PRACTICAL APPLICATION: Actionable steps the reader can take. Be specific enough to act on today. (200-300 words)
6. SECTION 4 — IMPLICATIONS: Your perspective on what this means going forward. Take a stance. (150-250 words)
7. SOURCES: Formatted list of all references cited in the post.`,
    '',
    `CITATION RULES:
- Cite sources inline using the format: "finding or claim (Source Name, Year)"
- Every statistic must have a source
- Prefer recent sources (last 2-3 years)
- Include a formatted source list at the end
- Never fabricate citations — if unsure, flag it with [NEEDS VERIFICATION]`,
    '',
    `FORMATTING:
- H2 heading every 150-250 words
- Short paragraphs (2-4 sentences)
- Bullet points for lists of 3+ items
- Bold key phrases sparingly (not entire sentences)
- Block quotes for important citations with attribution`,
    '',
    'TONE: Analytical practitioner writing a thorough brief for intelligent peers. Evidence-based but not dry. Personal perspective woven throughout.',
  );

  return parts.join('\n');
}

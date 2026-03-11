import type { OutlinePromptInput } from '@/features/writing/types';

export function buildOutlinePrompt(input: OutlinePromptInput): string {
  const contentLabel = input.contentType === 'linkedin' ? 'LinkedIn post' : 'blog post';

  const parts: string[] = [
    `TASK: Create a detailed outline for a ${contentLabel} about ${input.topic}.`,
    '',
    `RESEARCH NOTES:\n${input.researchNotes}`,
    '',
    `AVAILABLE DATA POINTS:\n${input.dataPoints}`,
    '',
    `REQUIREMENTS:
1. Identify the single strongest angle or thesis from the research. State it in one sentence.
2. For each section, provide:
   - Section heading (specific, not generic)
   - 2-3 bullet points of what this section will cover
   - Which research source(s) support this section
   - Suggested opening line for the section
3. Identify gaps: flag any sections where the research is thin and additional sources would strengthen the argument.
4. Suggest the ideal order for maximum reader engagement (which may differ from the obvious chronological or logical order).`,
    '',
    `OUTPUT FORMAT (respond with valid JSON inside a code fence):
\`\`\`json
{
  "thesis": "one sentence thesis statement",
  "sections": [
    {
      "id": "section-1",
      "heading": "specific heading",
      "points": ["point 1", "point 2"],
      "sources": ["source name 1", "source name 2"],
      "openingLine": "suggested first sentence",
      "data": "relevant statistic if applicable"
    }
  ],
  "researchGaps": ["areas where more evidence would help"]
}
\`\`\``,
  ];

  return parts.join('\n');
}

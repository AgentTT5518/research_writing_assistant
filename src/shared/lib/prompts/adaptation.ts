import type { AdaptationPromptInput } from '@/features/writing/types';

function getBlogToLinkedInRules(): string {
  return `ADAPTATION RULES (Blog --> LinkedIn):
- Extract the single most compelling insight or finding
- Open with that insight as the hook (under 200 characters)
- Condense the argument to 3-5 key points
- Keep only the strongest 1-2 data points
- Add a discussion-provoking CTA question
- Target 900-1,500 characters total
- Remove all external links (suggest putting them in first comment)
- Rewrite the tone from "analytical brief" to "peer sharing an insight"
- Double line break between every paragraph
- 3-5 relevant hashtags at the end
- No bold/italic markdown (LinkedIn doesn't render it)`;
}

function getLinkedInToBlogRules(targetWordCount?: number): string {
  const wordTarget = targetWordCount ?? 2000;
  return `ADAPTATION RULES (LinkedIn --> Blog):
- Expand each point with supporting evidence and research
- Add context, nuance, and counterarguments
- Include full citations for all data referenced
- Add practical application section
- Expand to approximately ${wordTarget} words
- Rewrite the tone from "quick insight" to "thorough analysis"
- Add a TL;DR summary at the top
- Use H2 headings every 150-250 words
- Short paragraphs (2-4 sentences)
- Include a formatted source list at the end`;
}

export function buildAdaptationPrompt(input: AdaptationPromptInput): string {
  const sourceLabel = input.direction === 'blog_to_linkedin' ? 'blog post' : 'LinkedIn post';
  const targetLabel = input.direction === 'blog_to_linkedin' ? 'LinkedIn post' : 'blog post';

  const rules = input.direction === 'blog_to_linkedin'
    ? getBlogToLinkedInRules()
    : getLinkedInToBlogRules(input.targetWordCount);

  const parts: string[] = [
    `TASK: Adapt the following ${sourceLabel} into a ${targetLabel}.`,
    '',
    `SOURCE CONTENT:\n${input.originalContent}`,
    '',
    rules,
    '',
    'CRITICAL: The adapted version must feel native to its platform, not like a resized version of the original. A LinkedIn post extracted from a blog post should feel like it was always meant to be a LinkedIn post.',
  ];

  return parts.join('\n');
}

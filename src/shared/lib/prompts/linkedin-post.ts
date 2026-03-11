import type { LinkedInPromptInput, LinkedInPostType } from '@/features/writing/types';

function getInsightTemplate(): string {
  return `STRUCTURE (follow this exactly):
1. HOOK (first 2 lines, under 200 characters): Start with the single most surprising or contrarian insight from the research. No preamble.
2. CONTEXT (2-3 sentences): Why this matters right now.
3. VALUE (3-5 short paragraphs): Key insights, each making one clear point. Use line breaks between paragraphs.
4. PROOF (1 paragraph): One specific example, statistic, or finding with its source cited inline.
5. CTA (1 line): A specific question that invites the reader to share their experience. Not "What do you think?" — be specific.`;
}

function getStoryTemplate(): string {
  return `STRUCTURE (follow this exactly):
1. HOOK: Start in the middle of the story. "Last Tuesday, I..." or a surprising outcome stated upfront.
2. TENSION: What went wrong, what was unexpected, what was the challenge.
3. RESOLUTION: What happened. Keep it specific with real details.
4. LESSON: The transferable insight. 1-2 sentences, stated directly. No "And the moral of the story is..."
5. BRIDGE: Connect the personal story to the reader's world. "If you're dealing with [related situation]..."
6. CTA: Question that invites readers to share their own related experience.`;
}

function getDataResearchTemplate(): string {
  return `STRUCTURE (follow this exactly):
1. HOOK: Lead with the most surprising finding or statistic.
2. SOURCE: Where this data comes from. 1 sentence establishing credibility.
3. KEY FINDINGS: 3-5 bullet points. Each one a specific, cited data point. Use symbols (-->, numbers, etc.) for visual hierarchy.
4. SO WHAT: Your interpretation. What this means in practice. This is where your perspective matters most.
5. CTA: "Does this match what you're seeing?" or "What would you add to this?"`;
}

function getStructureTemplate(postType: LinkedInPostType): string {
  switch (postType) {
    case 'insight':
      return getInsightTemplate();
    case 'story':
      return getStoryTemplate();
    case 'data_research':
      return getDataResearchTemplate();
  }
}

export function buildLinkedInPrompt(input: LinkedInPromptInput): string {
  const postType = input.postType ?? 'insight';

  const parts: string[] = [
    `TASK: Write a LinkedIn post about ${input.topic} using the following research.`,
    '',
    `RESEARCH NOTES:\n${input.researchNotes}`,
    '',
    `KEY DATA POINTS:\n${input.dataPoints}`,
  ];

  if (input.authorContext) {
    parts.push('', `AUTHOR CONTEXT:\n${input.authorContext}`);
  }

  parts.push(
    '',
    'FORMAT: LinkedIn post (900-1,500 characters)',
    '',
    getStructureTemplate(postType),
    '',
    `FORMATTING RULES:
- Double line break between every paragraph
- No external links in the post body
- 3-5 relevant hashtags at the end
- No emojis unless specifically requested
- No bold/italic markdown (LinkedIn doesn't render it)
- Front-load every paragraph — put the key point first`,
    '',
    'TONE: Confident peer sharing practical insights. Not a lecture. Not a sales pitch. Not a motivational speech.',
  );

  return parts.join('\n');
}

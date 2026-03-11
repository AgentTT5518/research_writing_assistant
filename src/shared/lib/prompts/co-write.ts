import type { CoWritePromptInput } from '@/features/writing/types';

function getActionInstructions(action: CoWritePromptInput['action']): string {
  switch (action) {
    case 'continue':
      return `The user wants you to CONTINUE writing.
- Write the next 1-2 paragraphs that naturally follow from the current text
- Match the tone and style already established in the draft
- Incorporate relevant research points that haven't been used yet`;

    case 'improve':
      return `The user wants you to IMPROVE the selected text.
- Rewrite the selected text to be clearer, more specific, and more engaging
- Preserve the original meaning and the author's voice
- Explain briefly what you changed and why in a final note (prefix with "Changes:")`;

    case 'suggest':
      return `The user wants SUGGESTIONS for what to write next.
- Offer 2-3 different directions the next section could take
- For each, give a one-sentence summary and a sample opening line
- Recommend which direction is strongest and why
- Format as numbered options`;

    case 'transform':
      return `The user wants to TRANSFORM the selected text.
- Rewrite the selected text following the user's specific instructions
- Maintain consistency with the surrounding draft
- Preserve the factual content while changing the style/structure as directed`;
  }
}

export function buildCoWritePrompt(input: CoWritePromptInput): string {
  const contentLabel = input.contentType === 'linkedin' ? 'LinkedIn post' : 'blog post';

  const parts: string[] = [
    `ROLE: You are a co-writing partner. The user is writing a ${contentLabel} about ${input.topic}. Your job is to assist paragraph-by-paragraph, not take over.`,
    '',
    `RESEARCH CONTEXT:\n${input.researchNotes}`,
    '',
    `CURRENT DRAFT STATE:\n${input.existingDraft}`,
  ];

  if (input.selection) {
    parts.push('', `SELECTED TEXT:\n${input.selection}`);
  }

  parts.push(
    '',
    `ACTION: ${input.action.toUpperCase()}`,
    '',
    getActionInstructions(input.action),
  );

  if (input.userInstructions) {
    parts.push('', `USER INSTRUCTIONS:\n${input.userInstructions}`);
  }

  parts.push(
    '',
    `ALWAYS:
- Match the voice and tone of what the user has already written
- Suggest specific data or citations from the research notes where relevant
- Keep suggestions concise — never write more than the user asks for
- If the user's draft contradicts the research, flag it diplomatically`,
  );

  return parts.join('\n');
}

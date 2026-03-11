import type { AntiSlopReviewInput, AntiSlopReport } from '@/features/writing/types';
import { logger } from '@/shared/lib/logger';

export function buildAntiSlopReviewPrompt(input: AntiSlopReviewInput): string {
  const contentLabel = input.contentType === 'linkedin' ? 'LinkedIn post' : 'blog post';

  const parts: string[] = [
    `TASK: Review the following ${contentLabel} for AI-generated writing patterns and score its quality.`,
    '',
    `CONTENT TO REVIEW:\n${input.draftContent}`,
    '',
    `REVIEW CHECKLIST:
1. VOCABULARY SCAN: Flag any words/phrases from the banned list. Suggest specific replacements for each.
2. SENTENCE RHYTHM: Highlight any sequence of 3+ sentences with similar length or structure. Suggest varied rhythm.
3. SPECIFICITY CHECK: Flag any abstract claim not backed by a specific example, data point, or experience. Mark these [NEEDS SPECIFICITY].
4. THROAT-CLEARING: Identify any sentence that exists only to introduce the next sentence. Mark for deletion.
5. STANCE CHECK: Does the piece take a clear position? If it reads as balanced-to-the-point-of-saying-nothing, flag it.
6. OPENING AUDIT: Does the first sentence deliver value or provoke curiosity? If it's a warm-up sentence, suggest a rewrite.
7. FILLER DETECTION: Flag any paragraph that could be removed without the reader missing it.
8. HUMAN VOICE: Does this sound like a person wrote it? Check for contractions, varied paragraph lengths, informal asides.`,
    '',
    `OUTPUT FORMAT: Respond with valid JSON inside a code fence. Provide a score from 0-100 and up to 5 specific suggestions.

\`\`\`json
{
  "score": 82,
  "suggestions": [
    {
      "line": "paragraph 2, sentence 1",
      "issue": "banned word usage",
      "original": "the problematic text",
      "suggested": "the improved version",
      "reason": "brief explanation"
    }
  ],
  "revisedContent": "The complete revised version with all fixes applied. Include this only if the score is below 90."
}
\`\`\``,
  ];

  return parts.join('\n');
}

export function parseAntiSlopReviewResponse(response: string): AntiSlopReport {
  // Extract JSON from code fence
  const jsonMatch = response.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (!jsonMatch) {
    logger.warn('writing', 'Anti-slop review response did not contain a JSON code fence, attempting direct parse');
    return tryDirectParse(response);
  }

  try {
    const parsed = JSON.parse(jsonMatch[1].trim());
    return validateReport(parsed);
  } catch (err) {
    logger.warn('writing', 'Failed to parse anti-slop review JSON from code fence', {
      error: (err as Error).message,
    });
    return tryDirectParse(response);
  }
}

function tryDirectParse(response: string): AntiSlopReport {
  try {
    // Try parsing the entire response as JSON
    const parsed = JSON.parse(response.trim());
    return validateReport(parsed);
  } catch {
    // Return a fallback report with the raw response
    logger.error('writing', 'Could not parse anti-slop review response as JSON');
    return {
      score: 50,
      suggestions: [{
        line: 'N/A',
        issue: 'Review parsing failed',
        original: '',
        suggested: '',
        reason: 'The AI response could not be parsed. Please try again.',
      }],
    };
  }
}

function validateReport(parsed: Record<string, unknown>): AntiSlopReport {
  const score = typeof parsed.score === 'number'
    ? Math.max(0, Math.min(100, parsed.score))
    : 50;

  const suggestions = Array.isArray(parsed.suggestions)
    ? parsed.suggestions.slice(0, 5).map((s: Record<string, unknown>) => ({
        line: String(s.line ?? ''),
        issue: String(s.issue ?? ''),
        original: String(s.original ?? ''),
        suggested: String(s.suggested ?? ''),
        reason: String(s.reason ?? ''),
      }))
    : [];

  const revisedContent = typeof parsed.revisedContent === 'string'
    ? parsed.revisedContent
    : undefined;

  return { score, suggestions, revisedContent };
}

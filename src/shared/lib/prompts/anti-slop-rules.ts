/**
 * Non-negotiable writing rules embedded in every writing prompt.
 * These enforce variety, specificity, and human voice.
 */
export function getAntiSlopRules(): string {
  return `WRITING RULES (non-negotiable):

1. BANNED VOCABULARY: Never use words/phrases from the banned list. If you catch yourself reaching for "robust" or "innovative," find the specific, concrete word that actually describes what you mean.

2. VARY SENTENCE RHYTHM: Mix short punchy sentences with longer ones. Include one-sentence paragraphs. Never let three sentences in a row have the same structure.

3. TAKE A STANCE: Every piece must have a clear point of view. If the content could have been written by anyone about anything, it fails. State opinions directly. Use "I think" and "I've found" and "here's what most people get wrong."

4. SPECIFICITY OVER GENERALITY: Replace every abstract claim with a concrete example, number, or anecdote. "Companies are adopting AI" becomes "Stripe cut their support ticket resolution time by 40% after deploying AI classification."

5. CONVERSATIONAL REGISTER: Write as if explaining to a smart colleague over coffee. Use contractions. Start sentences with "And" or "But" occasionally. Include brief asides.

6. NO THROAT-CLEARING: Delete any sentence that exists only to introduce the next sentence. Get to the point. The first sentence of every piece should deliver value or provoke curiosity, not set the stage.

7. EARN EVERY SENTENCE: If a sentence doesn't add new information, a new perspective, or emotional weight, cut it.

8. IMPERFECT ON PURPOSE: Occasionally use informal constructions, colloquialisms, or sentence fragments — the way a real person writes. Perfect grammar everywhere is itself a tell.`;
}

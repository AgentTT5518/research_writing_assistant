import { eq } from 'drizzle-orm';
import { db } from '@/shared/lib/db';
import { researchItems, draftResearchLinks } from '@/db/schema';

export interface ResearchContextItem {
  title: string;
  summary: string;
  url: string;
  content: string;
}

export interface ResearchContext {
  /** Raw fetched items for custom formatting */
  items: ResearchContextItem[];
  /** Formatted notes with source URLs: "## Title\nBody\nSource: url" */
  researchNotes: string;
  /** Formatted notes without URLs: "## Title\nBody" */
  researchNotesCompact: string;
  /** Raw content joined by newlines (items that have content) */
  dataPoints: string;
  /** Formatted "Title — URL" source list */
  sources: string;
}

/**
 * Fetch research items by IDs and build formatted context strings.
 *
 * Each ID must exist in the database — callers should validate existence
 * before calling this function.
 */
export function buildResearchContext(researchItemIds: string[]): ResearchContext {
  const items: ResearchContextItem[] = researchItemIds.map((rid) => {
    const item = db.select().from(researchItems).where(eq(researchItems.id, rid)).get()!;
    return {
      title: item.title,
      summary: item.summary ?? '',
      url: item.url ?? '',
      content: item.content ?? '',
    };
  });

  return formatResearchContext(items);
}

/**
 * Fetch research context from a draft's linked research items.
 *
 * Used by routes that operate on an existing draft (co-write, expand)
 * rather than receiving research IDs directly.
 */
export function buildResearchContextFromDraftLinks(draftId: string): ResearchContext {
  const links = db
    .select({ researchItemId: draftResearchLinks.researchItemId })
    .from(draftResearchLinks)
    .where(eq(draftResearchLinks.draftId, draftId))
    .all();

  const items: ResearchContextItem[] = links
    .filter((l): l is { researchItemId: string } => l.researchItemId !== null)
    .map((l) => {
      const item = db.select().from(researchItems).where(eq(researchItems.id, l.researchItemId)).get();
      if (!item) return null;
      return {
        title: item.title,
        summary: item.summary ?? '',
        url: item.url ?? '',
        content: item.content ?? '',
      };
    })
    .filter((item): item is ResearchContextItem => item !== null);

  return formatResearchContext(items);
}

function formatResearchContext(items: ResearchContextItem[]): ResearchContext {
  const researchNotes = items
    .map((r) => {
      const body = r.summary || r.content;
      return r.url
        ? `## ${r.title}\n${body}\nSource: ${r.url}`
        : `## ${r.title}\n${body}`;
    })
    .join('\n\n');

  const researchNotesCompact = items
    .map((r) => `## ${r.title}\n${r.summary || r.content}`)
    .join('\n\n');

  const dataPoints = items
    .filter((r) => r.content)
    .map((r) => r.content)
    .join('\n');

  const sources = items
    .map((r) => `${r.title} — ${r.url}`)
    .join('\n');

  return { items, researchNotes, researchNotesCompact, dataPoints, sources };
}

import sanitizeHtml from 'sanitize-html';

const BLOG_SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li',
    'a', 'strong', 'em', 'code', 'pre', 'blockquote',
    'img', 'br', 'hr', 'span',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
  ],
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
    img: ['src', 'alt', 'width', 'height'],
    td: ['colspan', 'rowspan'],
    th: ['colspan', 'rowspan'],
  },
  // Strip all event handlers and dangerous schemes
  allowedSchemes: ['http', 'https', 'mailto'],
  disallowedTagsMode: 'discard',
};

const LINKEDIN_MAX_LENGTH = 3000;

const DANGEROUS_URI_PATTERNS = [
  /javascript:/i,
  /data:/i,
  /vbscript:/i,
];

/**
 * Sanitize blog HTML content using an allowlist approach.
 * TipTap stores HTML directly (editor.getHTML()), so this sanitizes
 * the stored content before writing to Firebase Firestore.
 * Safe tags (p, h1-h6, code, pre, etc.) are preserved.
 * Event handlers, script tags, and dangerous attributes are stripped.
 */
export function sanitizeBlogContent(html: string): string {
  return sanitizeHtml(html, BLOG_SANITIZE_OPTIONS);
}

/**
 * Validate LinkedIn plain text content.
 * LinkedIn content comes from editor.getText() (plain text, not HTML).
 * Checks for dangerous URI patterns and length limits.
 */
export function validateLinkedInContent(text: string): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  if (text.length > LINKEDIN_MAX_LENGTH) {
    issues.push(`Content exceeds LinkedIn's ${LINKEDIN_MAX_LENGTH} character limit (${text.length} chars)`);
  }

  for (const pattern of DANGEROUS_URI_PATTERNS) {
    if (pattern.test(text)) {
      issues.push(`Content contains potentially dangerous URI pattern: ${pattern.source}`);
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

import { describe, it, expect } from 'vitest';
import { sanitizeBlogContent, validateLinkedInContent } from '@/shared/lib/validate-content';

describe('sanitizeBlogContent', () => {
  it('preserves safe HTML tags', () => {
    const html = '<h1>Title</h1><p>Hello <strong>world</strong></p>';
    expect(sanitizeBlogContent(html)).toBe(html);
  });

  it('preserves code blocks', () => {
    const html = '<pre><code>const x = 1;</code></pre>';
    expect(sanitizeBlogContent(html)).toBe(html);
  });

  it('preserves links with safe attributes', () => {
    const html = '<a href="https://example.com" target="_blank" rel="noopener">Link</a>';
    expect(sanitizeBlogContent(html)).toBe(html);
  });

  it('preserves images with safe attributes', () => {
    const html = '<img src="https://example.com/img.jpg" alt="Test" width="100" />';
    const result = sanitizeBlogContent(html);
    expect(result).toContain('src="https://example.com/img.jpg"');
    expect(result).toContain('alt="Test"');
  });

  it('strips script tags', () => {
    const html = '<p>Hello</p><script>alert("xss")</script>';
    expect(sanitizeBlogContent(html)).toBe('<p>Hello</p>');
  });

  it('strips event handlers', () => {
    const html = '<p onclick="alert(1)">Click me</p>';
    const result = sanitizeBlogContent(html);
    expect(result).not.toContain('onclick');
    expect(result).toContain('<p>Click me</p>');
  });

  it('strips iframe tags', () => {
    const html = '<p>Content</p><iframe src="https://evil.com"></iframe>';
    expect(sanitizeBlogContent(html)).toBe('<p>Content</p>');
  });

  it('strips javascript: URIs from links', () => {
    const html = '<a href="javascript:alert(1)">Click</a>';
    const result = sanitizeBlogContent(html);
    expect(result).not.toContain('javascript:');
  });

  it('preserves table elements', () => {
    const html = '<table><thead><tr><th>Header</th></tr></thead><tbody><tr><td>Cell</td></tr></tbody></table>';
    expect(sanitizeBlogContent(html)).toBe(html);
  });

  it('handles empty string', () => {
    expect(sanitizeBlogContent('')).toBe('');
  });
});

describe('validateLinkedInContent', () => {
  it('accepts valid plain text', () => {
    const result = validateLinkedInContent('Hello, this is a LinkedIn post about AI.');
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('rejects content exceeding 3000 characters', () => {
    const result = validateLinkedInContent('x'.repeat(3001));
    expect(result.valid).toBe(false);
    expect(result.issues[0]).toContain('3000');
  });

  it('accepts content at exactly 3000 characters', () => {
    const result = validateLinkedInContent('x'.repeat(3000));
    expect(result.valid).toBe(true);
  });

  it('rejects javascript: URIs', () => {
    const result = validateLinkedInContent('Check out this link: javascript:alert(1)');
    expect(result.valid).toBe(false);
    expect(result.issues[0]).toContain('javascript');
  });

  it('rejects data: URIs', () => {
    const result = validateLinkedInContent('See this image: data:text/html,<script>alert(1)</script>');
    expect(result.valid).toBe(false);
    expect(result.issues[0]).toContain('data');
  });

  it('handles empty string', () => {
    const result = validateLinkedInContent('');
    expect(result.valid).toBe(true);
  });
});

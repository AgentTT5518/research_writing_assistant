import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the Anthropic SDK before importing ai-client
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [{ type: 'text', text: 'This is a summary of the content.' }],
          usage: { input_tokens: 100, output_tokens: 50 },
        }),
      },
    })),
  };
});

// Mock the db module
vi.mock('@/shared/lib/db', () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        run: vi.fn(),
      }),
    }),
  },
}));

// Mock the id module
vi.mock('@/shared/lib/id', () => ({
  generateId: vi.fn().mockReturnValue('test-id-123'),
}));

describe('AI Client', () => {
  const originalEnv = process.env.ANTHROPIC_API_KEY;

  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env.ANTHROPIC_API_KEY = originalEnv;
  });

  it('throws when API key is not configured', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    // Need to re-import to get fresh module
    const { summarizeContent } = await import('@/shared/lib/ai-client');
    await expect(summarizeContent('test content')).rejects.toThrow('ANTHROPIC_API_KEY is not configured');
  });

  it('returns summarized content', async () => {
    const { summarizeContent } = await import('@/shared/lib/ai-client');
    const result = await summarizeContent('Some long article content');
    expect(result).toBe('This is a summary of the content.');
  });

  it('passes correct parameters to the API', async () => {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const { summarizeContent } = await import('@/shared/lib/ai-client');

    await summarizeContent('test content', { maxTokens: 512 });

    const mockInstance = (Anthropic as unknown as ReturnType<typeof vi.fn>).mock.results[0]?.value;
    if (mockInstance) {
      expect(mockInstance.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          max_tokens: 512,
        })
      );
    }
  });
});

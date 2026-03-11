'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Badge } from '@/shared/components/ui/badge';
import { Separator } from '@/shared/components/ui/separator';
import {
  Loader2,
  Wand2,
  ListTree,
  ShieldCheck,
  ArrowLeftRight,
  Save,
} from 'lucide-react';
import { ModeSelector } from './mode-selector';
import { ContentTypeSelector } from './content-type-selector';
import { ResearchSelector } from './research-selector';
import { TipTapEditor } from './tiptap-editor';
import { CharacterCounter } from './character-counter';
import { PlatformPreview } from './platform-preview';
import { AntiSlopReportView } from './anti-slop-report';
import { CoWritePanel } from './co-write-panel';
import { OutlinePanel } from './outline-panel';
import { CoverImageUpload } from './cover-image-upload';
import { useDraft, useUpdateDraft } from '../hooks';
import { useStreamDraft } from '../hooks/use-stream-draft';
import { useStreamExpand } from '../hooks/use-stream-expand';
import { useStreamCoWrite } from '../hooks/use-stream-co-write';
import { useGenerateOutline } from '../hooks/use-generate-outline';
import { useAdaptContent } from '../hooks/use-adapt-content';
import { useReviewContent } from '../hooks/use-review-content';
import type {
  WritingMode,
  ContentType,
  CoWriteAction,
  Outline,
  AntiSlopReport,
} from '../types';

interface WritingWorkspaceProps {
  projectId: string;
}

const AUTOSAVE_DELAY = 5000;
const LINKEDIN_CHAR_LIMIT = 3000;

const STATUS_COLORS: Record<string, string> = {
  generating: 'bg-blue-100 text-blue-800',
  draft: 'bg-gray-100 text-gray-800',
  reviewing: 'bg-purple-100 text-purple-800',
  approved: 'bg-green-100 text-green-800',
  scheduled: 'bg-orange-100 text-orange-800',
  published: 'bg-emerald-100 text-emerald-800',
  failed: 'bg-red-100 text-red-800',
};

export function WritingWorkspace({ projectId }: WritingWorkspaceProps) {
  // ─── State ───
  const [writingMode, setWritingMode] = useState<WritingMode>('full_draft');
  const [contentType, setContentType] = useState<ContentType>('linkedin');
  const [topic, setTopic] = useState('');
  const [selectedResearchIds, setSelectedResearchIds] = useState<string[]>([]);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [editorContent, setEditorContent] = useState('');
  const [outline, setOutline] = useState<Outline | null>(null);
  const [slopReport, setSlopReport] = useState<AntiSlopReport | null>(null);
  const [expandingSection, setExpandingSection] = useState<string | null>(null);
  const [hasSelection, setHasSelection] = useState(false);

  // ─── Hooks ───
  const { data: draft } = useDraft(draftId ?? '');
  const updateDraft = useUpdateDraft();
  const streamDraft = useStreamDraft();
  const streamExpand = useStreamExpand();
  const streamCoWrite = useStreamCoWrite();
  const generateOutline = useGenerateOutline();
  const adaptContent = useAdaptContent();
  const reviewContent = useReviewContent();

  const isStreaming = streamDraft.isStreaming || streamExpand.isStreaming || streamCoWrite.isStreaming;

  // ─── Auto-save (debounced, disabled during streaming) ───
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!draftId || isStreaming || !editorContent) return;

    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);

    autoSaveTimer.current = setTimeout(() => {
      const data =
        contentType === 'linkedin'
          ? { linkedinContent: editorContent }
          : { blogContent: editorContent };
      updateDraft.mutate({ id: draftId, data });
    }, AUTOSAVE_DELAY);

    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [editorContent, draftId, isStreaming, contentType]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Sync streamed content to editor ───
  useEffect(() => {
    if (streamDraft.isStreaming && streamDraft.streamedContent) {
      setEditorContent(streamDraft.streamedContent);
    }
  }, [streamDraft.streamedContent, streamDraft.isStreaming]);

  useEffect(() => {
    if (streamDraft.draftId) {
      setDraftId(streamDraft.draftId);
    }
  }, [streamDraft.draftId]);

  useEffect(() => {
    if (streamExpand.isStreaming && streamExpand.streamedContent) {
      setEditorContent((prev) => prev + streamExpand.streamedContent);
    }
  }, [streamExpand.streamedContent, streamExpand.isStreaming]);

  useEffect(() => {
    if (streamCoWrite.isStreaming && streamCoWrite.streamedContent) {
      setEditorContent(streamCoWrite.streamedContent);
    }
  }, [streamCoWrite.streamedContent, streamCoWrite.isStreaming]);

  // ─── Handlers ───

  const handleGenerate = useCallback(() => {
    if (!topic.trim() || selectedResearchIds.length === 0) return;

    if (writingMode === 'outline_expand') {
      generateOutline.mutate(
        {
          projectId,
          researchItemIds: selectedResearchIds,
          contentType,
          topic: topic.trim(),
        },
        { onSuccess: (data) => setOutline(data) },
      );
    } else {
      streamDraft.generate({
        projectId,
        researchItemIds: selectedResearchIds,
        contentType,
        writingMode,
        topic: topic.trim(),
      });
    }
  }, [topic, selectedResearchIds, writingMode, projectId, contentType, streamDraft, generateOutline]);

  const handleExpandSection = useCallback(
    (sectionId: string) => {
      if (!draftId || !outline) return;
      setExpandingSection(sectionId);

      streamExpand.expand({
        draftId,
        sectionId,
        outline: JSON.stringify(outline),
      });

      // Reset when done
      const checkDone = setInterval(() => {
        if (!streamExpand.isStreaming) {
          setExpandingSection(null);
          clearInterval(checkDone);
        }
      }, 500);
    },
    [draftId, outline, streamExpand],
  );

  const handleCoWrite = useCallback(
    (action: CoWriteAction, instructions?: string) => {
      if (!draftId) return;

      streamCoWrite.coWrite({
        draftId,
        action,
        contentType,
        existingDraft: editorContent,
        topic,
        userInstructions: instructions,
      });
    },
    [draftId, contentType, editorContent, topic, streamCoWrite],
  );

  const handleReview = useCallback(() => {
    if (!draftId) return;
    reviewContent.mutate(
      { draftId },
      { onSuccess: (data) => setSlopReport(data) },
    );
  }, [draftId, reviewContent]);

  const handleAdapt = useCallback(() => {
    if (!draftId) return;
    const from = contentType;
    const to = contentType === 'linkedin' ? 'blog' : 'linkedin';
    adaptContent.mutate({ draftId, from, to });
  }, [draftId, contentType, adaptContent]);

  const handleSaveVersion = useCallback(() => {
    if (!draftId) return;
    const data =
      contentType === 'linkedin'
        ? { linkedinContent: editorContent, changeNote: 'Manual save' }
        : { blogContent: editorContent, changeNote: 'Manual save' };
    updateDraft.mutate({ id: draftId, data });
  }, [draftId, contentType, editorContent, updateDraft]);

  const handleApplyRevisedContent = useCallback(() => {
    if (slopReport?.revisedContent) {
      setEditorContent(slopReport.revisedContent);
      setSlopReport(null);
    }
  }, [slopReport]);

  // ─── Render ───

  const canGenerate = topic.trim().length > 0 && selectedResearchIds.length > 0 && !isStreaming;

  return (
    <div className="flex gap-6">
      {/* Left Panel (60%) */}
      <div className="flex-[3] space-y-4">
        <ModeSelector
          value={writingMode}
          onChange={setWritingMode}
          disabled={isStreaming}
        />

        <ContentTypeSelector
          value={contentType}
          onChange={setContentType}
          disabled={isStreaming}
        />

        <ResearchSelector
          projectId={projectId}
          selectedIds={selectedResearchIds}
          onChange={setSelectedResearchIds}
          disabled={isStreaming}
        />

        <Input
          placeholder="Topic or thesis..."
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          disabled={isStreaming}
        />

        <Button
          onClick={handleGenerate}
          disabled={!canGenerate}
          className="w-full"
        >
          {isStreaming || generateOutline.isPending ? (
            <Loader2 className="size-4 mr-2 animate-spin" />
          ) : writingMode === 'outline_expand' ? (
            <ListTree className="size-4 mr-2" />
          ) : (
            <Wand2 className="size-4 mr-2" />
          )}
          {writingMode === 'outline_expand' ? 'Generate Outline' : 'Generate Draft'}
        </Button>

        <Separator />

        <TipTapEditor
          contentType={contentType}
          content={editorContent}
          onUpdate={setEditorContent}
          disabled={isStreaming}
        />

        {contentType === 'linkedin' && (
          <CharacterCounter
            current={editorContent.length}
            limit={LINKEDIN_CHAR_LIMIT}
          />
        )}

        {/* Action Bar */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveVersion}
            disabled={!draftId || isStreaming}
          >
            <Save className="size-3.5 mr-1.5" />
            Save Version
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleReview}
            disabled={!draftId || isStreaming || reviewContent.isPending}
          >
            <ShieldCheck className="size-3.5 mr-1.5" />
            {reviewContent.isPending ? 'Reviewing...' : 'Review'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAdapt}
            disabled={!draftId || isStreaming || adaptContent.isPending}
          >
            <ArrowLeftRight className="size-3.5 mr-1.5" />
            {adaptContent.isPending ? 'Adapting...' : 'Adapt'}
          </Button>

          {draft?.status && (
            <Badge className={STATUS_COLORS[draft.status] || ''}>
              {draft.status}
            </Badge>
          )}
        </div>

        {/* Error Display */}
        {(streamDraft.error || streamExpand.error || streamCoWrite.error) && (
          <p className="text-sm text-destructive">
            {streamDraft.error?.message ||
              streamExpand.error?.message ||
              streamCoWrite.error?.message}
          </p>
        )}
      </div>

      {/* Right Panel (40%) */}
      <div className="flex-[2] space-y-4">
        <PlatformPreview
          contentType={contentType}
          linkedinContent={
            contentType === 'linkedin' ? editorContent : draft?.linkedinContent
          }
          blogTitle={draft?.blogTitle}
          blogContent={
            contentType === 'blog' ? editorContent : draft?.blogContent
          }
          blogExcerpt={draft?.blogExcerpt}
          coverImagePath={draft?.coverImagePath}
        />

        {slopReport && (
          <AntiSlopReportView
            report={slopReport}
            onApplyAll={handleApplyRevisedContent}
            onDismiss={() => setSlopReport(null)}
            onDeepReview={handleReview}
            isReviewing={reviewContent.isPending}
          />
        )}

        {writingMode === 'outline_expand' && outline && (
          <OutlinePanel
            outline={outline}
            onExpand={handleExpandSection}
            expandingSection={expandingSection}
          />
        )}

        {writingMode === 'co_writing' && (
          <CoWritePanel
            onAction={handleCoWrite}
            hasSelection={hasSelection}
            isStreaming={isStreaming}
          />
        )}

        {draftId && <CoverImageUpload draftId={draftId} currentPath={draft?.coverImagePath} />}
      </div>
    </div>
  );
}

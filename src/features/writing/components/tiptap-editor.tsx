'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import History from '@tiptap/extension-history';
import HardBreak from '@tiptap/extension-hard-break';
import CharacterCount from '@tiptap/extension-character-count';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { useEffect } from 'react';
import { cn } from '@/shared/lib/utils';
import type { ContentType } from '../types';

interface TipTapEditorProps {
  contentType: ContentType;
  content: string;
  onUpdate: (content: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const LINKEDIN_CHAR_LIMIT = 3000;

export function TipTapEditor({
  contentType,
  content,
  onUpdate,
  placeholder = 'Start writing...',
  disabled = false,
  className,
}: TipTapEditorProps) {
  const isLinkedIn = contentType === 'linkedin';

  const editor = useEditor({
    extensions: isLinkedIn
      ? [
          Document,
          Paragraph,
          Text,
          HardBreak,
          History,
          CharacterCount.configure({ limit: LINKEDIN_CHAR_LIMIT }),
          Placeholder.configure({ placeholder }),
        ]
      : [
          StarterKit,
          CharacterCount,
          Placeholder.configure({ placeholder }),
          Image,
          Link.configure({ openOnClick: false }),
        ],
    content: isLinkedIn ? content : content,
    editable: !disabled,
    onUpdate: ({ editor: ed }) => {
      if (isLinkedIn) {
        onUpdate(ed.getText());
      } else {
        onUpdate(ed.getHTML());
      }
    },
  });

  // Sync external content changes
  useEffect(() => {
    if (!editor) return;
    const currentContent = isLinkedIn ? editor.getText() : editor.getHTML();
    if (content !== currentContent) {
      editor.commands.setContent(content);
    }
  }, [content, editor, isLinkedIn]);

  // Sync disabled state
  useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled);
    }
  }, [disabled, editor]);

  return (
    <div
      className={cn(
        'rounded-lg border border-input bg-background',
        disabled && 'opacity-60 cursor-not-allowed',
        className,
      )}
    >
      <EditorContent
        editor={editor}
        className={cn(
          'prose prose-sm max-w-none p-4',
          '[&_.ProseMirror]:min-h-[200px] [&_.ProseMirror]:outline-none',
          '[&_.ProseMirror_p.is-editor-empty:first-child::before]:text-muted-foreground',
          '[&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]',
          '[&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left',
          '[&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0',
          '[&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none',
        )}
      />
    </div>
  );
}

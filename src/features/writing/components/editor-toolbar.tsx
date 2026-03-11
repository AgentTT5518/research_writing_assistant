'use client';

import type { Editor } from '@tiptap/react';
import { Button } from '@/shared/components/ui/button';
import {
  Bold,
  Italic,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  LinkIcon,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import type { ContentType } from '../types';

interface EditorToolbarProps {
  editor: Editor | null;
  contentType: ContentType;
}

export function EditorToolbar({ editor, contentType }: EditorToolbarProps) {
  // LinkedIn: no formatting toolbar
  if (contentType === 'linkedin' || !editor) {
    return null;
  }

  function setLink() {
    const previousUrl = editor!.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);
    if (url === null) return;
    if (url === '') {
      editor!.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor!.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }

  const tools = [
    {
      icon: Bold,
      label: 'Bold',
      action: () => editor.chain().focus().toggleBold().run(),
      isActive: editor.isActive('bold'),
    },
    {
      icon: Italic,
      label: 'Italic',
      action: () => editor.chain().focus().toggleItalic().run(),
      isActive: editor.isActive('italic'),
    },
    {
      icon: Heading2,
      label: 'Heading 2',
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      isActive: editor.isActive('heading', { level: 2 }),
    },
    {
      icon: Heading3,
      label: 'Heading 3',
      action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      isActive: editor.isActive('heading', { level: 3 }),
    },
    {
      icon: List,
      label: 'Bullet List',
      action: () => editor.chain().focus().toggleBulletList().run(),
      isActive: editor.isActive('bulletList'),
    },
    {
      icon: ListOrdered,
      label: 'Ordered List',
      action: () => editor.chain().focus().toggleOrderedList().run(),
      isActive: editor.isActive('orderedList'),
    },
    {
      icon: Quote,
      label: 'Blockquote',
      action: () => editor.chain().focus().toggleBlockquote().run(),
      isActive: editor.isActive('blockquote'),
    },
    {
      icon: LinkIcon,
      label: 'Link',
      action: setLink,
      isActive: editor.isActive('link'),
    },
  ];

  return (
    <div className="flex flex-wrap gap-1 rounded-t-lg border-b border-input bg-muted/30 p-1">
      {tools.map((tool) => (
        <Button
          key={tool.label}
          variant="ghost"
          size="icon-xs"
          onClick={tool.action}
          title={tool.label}
          className={cn(
            'size-7',
            tool.isActive && 'bg-accent text-accent-foreground',
          )}
        >
          <tool.icon className="size-3.5" />
        </Button>
      ))}
    </div>
  );
}

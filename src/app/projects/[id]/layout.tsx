'use client';

import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { Search, PenTool, Send, ArrowLeft } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

const subNavItems = [
  { segment: '', label: 'Overview', icon: ArrowLeft },
  { segment: '/research', label: 'Research', icon: Search },
  { segment: '/write', label: 'Write', icon: PenTool },
  { segment: '/publish', label: 'Publish', icon: Send },
];

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const params = useParams<{ id: string }>();
  const basePath = `/projects/${params.id}`;

  return (
    <div>
      <nav className="mb-6 flex gap-1 border-b border-border">
        {subNavItems.map((item) => {
          const href = `${basePath}${item.segment}`;
          const isActive =
            item.segment === ''
              ? pathname === basePath
              : pathname.startsWith(href);
          return (
            <Link
              key={item.segment}
              href={href}
              className={cn(
                'flex items-center gap-2 border-b-2 px-4 py-2 text-sm transition-colors',
                isActive
                  ? 'border-primary text-primary font-medium'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
}

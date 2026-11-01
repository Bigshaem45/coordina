import { useState } from 'react';
import { Icon } from './Icon';
import { Badge, BottomSheet, Button, Card, Chip, Cover, EmptyState, ErrorState, Skeleton, Stars, VerifiedBadge } from './ui';
import { Logo } from './Logo';
import { CATEGORY_PHOTO } from '../lib/constants';
import type { Category } from '../types';

const swatches = [
  ['Primary Indigo', '#4F46E5'],
  ['Accent Purple', '#8B5CF6'],
  ['Soft Lavender', '#EDE9FE'],
  ['Midnight Navy', '#0B1120'],
  ['Slate Gray', '#64748B'],
  ['Surface Border', '#E2E8F0'],
  ['Alert Coral', '#F43F5E'],
  ['Verified Emerald', '#10B981'],
];

export default function DesignSystem() {
  const [sheet, setSheet] = useState(false);
  const [on, setOn] = useState(true);

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 md:px-0">
      <div>
        <Logo size={40} />
        <h1 className="mt-3 text-3xl font-semibold text-slate-900 dark:text-slate-100">Design System</h1>
      </div>

      <Card className="p-5">
        <h2 className="mb-3 text-base font-semibold text-slate-900 dark:text-slate-100">Brand Palette</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {swatches.map(([n, c]) => (
            <div key={n} className="flex items-center gap-3 rounded-xl border border-slate-200 p-2.5 dark:border-slate-800">
              <div className="h-10 w-10 shrink-0 rounded-lg border border-black/10" style={{ background: c }} />
              <div className="min-w-0 text-xs">
                <p className="truncate font-medium text-slate-900 dark:text-slate-100">{n}</p>
                <p className="muted font-mono">{c}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="space-y-2 p-5">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Typography</h2>
        <p className="font-display text-3xl font-semibold text-slate-900 dark:text-slate-100">
          Questrial — Geometric Minimalist Display
        </p>
        <p className="muted text-sm">
          Clean, high-legibility geometric proportions paired with Material Symbols Rounded icons and guaranteed WCAG AA contrast.
        </p>
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 text-base font-semibold text-slate-900 dark:text-slate-100">Buttons</h2>
        <div className="flex flex-wrap gap-2.5">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="coral">Coral</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button disabled>Disabled</Button>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 text-base font-semibold text-slate-900 dark:text-slate-100">Chips &amp; Badges</h2>
        <div className="flex flex-wrap items-center gap-2.5">
          <Chip active={on} onClick={() => setOn(!on)}>
            Active Filter
          </Chip>
          <Chip>Inactive</Chip>
          <Badge tone="brand">Brand</Badge>
          <Badge tone="coral">Alert</Badge>
          <Badge tone="neon">Success</Badge>
          <Badge tone="muted">Muted</Badge>
          <VerifiedBadge />
          <Stars value={4.8} />
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 text-base font-semibold text-slate-900 dark:text-slate-100">Editorial Photography Covers</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {(['Concerts', 'Nightlife', 'Art'] as Category[]).map((cat) => (
            <div key={cat} className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
              <Cover gradient={CATEGORY_PHOTO[cat]} category={cat} label={cat} className="h-28 w-full" />
              <div className="px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-200">{cat}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 text-base font-semibold text-slate-900 dark:text-slate-100">Schedule Advisory Card</h2>
        <div className="rounded-2xl border border-amber-500/30 bg-amber-50/70 p-4 text-sm dark:bg-amber-500/10">
          <div className="flex items-center gap-2 font-semibold text-amber-800 dark:text-amber-300">
            <Icon name="schedule" className="text-lg" />
            <span>Tight Transit Window</span>
          </div>
          <p className="mt-1 text-slate-700 dark:text-slate-300">
            Schedule clash advisories automatically calculate area-to-area transit times across Abuja and Lagos.
          </p>
        </div>
      </Card>

      <Card className="space-y-4 p-5">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">System States</h2>
        <Skeleton className="h-14" />
        <EmptyState icon="inbox" title="Nothing scheduled yet" text="Events added to your plan will appear here in chronological order." />
        <ErrorState />
      </Card>

      <div>
        <Button variant="outline" onClick={() => setSheet(true)}>
          Preview Bottom Sheet
        </Button>
      </div>
      <BottomSheet open={sheet} onClose={() => setSheet(false)} title="Minimalist Sheet">
        <p className="muted text-sm">Used across mobile and desktop for filters, event swaps, and ticket transfers.</p>
      </BottomSheet>
    </div>
  );
}

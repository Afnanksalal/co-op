'use client';

import { Warning } from '@phosphor-icons/react';
import { DatePicker } from '@/components/ui/date-picker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { KnowledgeGraphSnapshot } from '@/lib/desktop/runtime';
import type { DesktopIcon } from './shell-types';
import {
  graphLabel,
  labelOption,
  memoryRelationshipDisplay,
  memoryTypeDisplay,
} from './utils';


export function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: DesktopIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-border/50 bg-background p-4">
      <Icon className="h-5 w-5 text-muted-foreground" />
      <p className="mt-3 text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}

export function MemoryBoard({
  nodes,
  totalCount,
}: {
  nodes: KnowledgeGraphSnapshot['nodes'];
  totalCount: number;
}) {
  return (
    <section className="min-w-0 rounded-lg border border-border/60 bg-background p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">What Co-Op remembers</h3>
        <Badge variant="secondary">{totalCount} facts</Badge>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 2xl:grid-cols-1">
        {nodes.map((node) => (
          <article
            key={node.id}
            className="min-w-0 rounded-md border border-border/60 bg-card/70 p-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{node.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {memoryTypeDisplay(node.nodeType)}
                </p>
              </div>
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-primary/70" />
            </div>
            {node.summary && (
              <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">
                {node.summary}
              </p>
            )}
          </article>
        ))}
        {nodes.length === 0 && (
          <div className="rounded-md border border-dashed border-border p-5 text-sm text-muted-foreground">
            Add a company profile or files to build business memory.
          </div>
        )}
      </div>
    </section>
  );
}

export function RelationshipBoard({
  graph,
  edges,
  totalCount,
}: {
  graph: KnowledgeGraphSnapshot | null;
  edges: KnowledgeGraphSnapshot['edges'];
  totalCount: number;
}) {
  return (
    <section className="min-w-0 rounded-lg border border-border/60 bg-background p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">Useful links</h3>
        <Badge variant="secondary">{totalCount} links</Badge>
      </div>
      <div className="mt-4 space-y-2">
        {edges.map((edge) => (
          <article
            key={edge.id}
            className="grid min-w-0 gap-2 rounded-md border border-border/60 bg-card/70 p-3 text-sm sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center"
          >
            <span className="min-w-0 truncate font-medium">{graphLabel(graph, edge.source)}</span>
            <Badge variant="outline" className="justify-center whitespace-nowrap">
              {memoryRelationshipDisplay(edge.relationship)}
            </Badge>
            <span className="min-w-0 truncate text-muted-foreground sm:text-right">
              {graphLabel(graph, edge.target)}
            </span>
          </article>
        ))}
        {edges.length === 0 && (
          <div className="rounded-md border border-dashed border-border p-5 text-sm text-muted-foreground">
            Co-Op will connect people, files, customers, and plans as you use it.
          </div>
        )}
      </div>
    </section>
  );
}

export function PanelTitle({
  icon: Icon,
  title,
  compact = false,
}: {
  icon: DesktopIcon;
  title: string;
  compact?: boolean;
}) {
  return (
    <div className={`${compact ? 'mb-0' : 'mb-5'} flex items-center gap-3`}>
      <Icon className="h-5 w-5 text-muted-foreground" />
      <h2 className="text-lg font-semibold tracking-normal">{title}</h2>
    </div>
  );
}

export function SectionHeading({ title, detail }: { title: string; detail: string }) {
  return (
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  text,
  action,
  onAction,
}: {
  icon: DesktopIcon;
  title: string;
  text: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="rounded-lg border border-dashed border-border p-8 text-center">
      <Icon className="mx-auto h-8 w-8 text-muted-foreground" weight="light" />
      <h3 className="mt-4 font-serif text-lg font-medium">{title}</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{text}</p>
      {action && onAction && (
        <Button className="mt-5" size="sm" variant="outline" onClick={onAction}>
          {action}
        </Button>
      )}
    </div>
  );
}

export function ChoiceCard({
  selected,
  title,
  text,
  onClick,
}: {
  selected: boolean;
  title: string;
  text: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border p-4 text-left transition-all ${
        selected
          ? 'border-primary bg-primary/5 shadow-sm'
          : 'border-border/60 bg-background hover:border-border hover:bg-muted/40'
      }`}
    >
      <span className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold">{title}</span>
        <span
          className={`h-2.5 w-2.5 rounded-full ${
            selected ? 'bg-primary' : 'bg-muted-foreground/35'
          }`}
        />
      </span>
      <span className="mt-2 block text-xs leading-5 text-muted-foreground">{text}</span>
    </button>
  );
}

export function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string;
  value: string;
  type?: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return (
    <div className="min-w-0 space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

export function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return (
    <div className="min-w-0 space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <DatePicker id={id} value={value} onChange={onChange} placeholder="Pick a date" />
    </div>
  );
}

export function TextArea({
  label,
  value,
  onChange,
  minHeight = 'min-h-28',
  placeholder,
}: {
  label: string;
  value: string;
  minHeight?: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return (
    <div className="min-w-0 space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <textarea
        id={id}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={`coop-scrollbar ${minHeight} max-h-64 w-full resize-none overflow-y-auto rounded-md border border-input bg-background px-3 py-2.5 text-sm leading-6 text-foreground transition-all placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20`}
      />
    </div>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  labels = {},
}: {
  label: string;
  value: string;
  options: string[];
  labels?: Record<string, string>;
  onChange: (value: string) => void;
}) {
  return (
    <div className="min-w-0 space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {labels[option] ?? labelOption(option)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center justify-between gap-4 rounded-md border px-3 py-2.5 text-sm transition-colors ${
        checked
          ? 'border-primary/25 bg-primary/10 text-foreground'
          : 'border-border bg-background text-muted-foreground hover:text-foreground'
      }`}
    >
      <span className="font-medium">{label}</span>
      <input
        type="checkbox"
        role="switch"
        aria-checked={checked}
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="sr-only"
      />
      <span
        aria-hidden="true"
        className={`flex h-5 w-9 items-center rounded-full p-0.5 transition-colors ${
          checked ? 'bg-primary' : 'bg-muted-foreground/30'
        }`}
      >
        <span
          className={`h-4 w-4 rounded-full bg-background shadow-sm transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </span>
    </label>
  );
}

export function TogglePill({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
        checked
          ? 'border-primary/20 bg-primary/10 text-foreground'
          : 'border-border bg-background text-muted-foreground hover:text-foreground'
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full ${checked ? 'bg-primary' : 'bg-muted-foreground/40'}`}
      />
      {label}
    </button>
  );
}

export function SegmentedControl({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { id: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="coop-scrollbar inline-flex max-w-full overflow-x-auto rounded-lg bg-muted/70 p-1">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          data-testid={`segment-${option.id}`}
          onClick={() => onChange(option.id)}
          className={`h-9 whitespace-nowrap rounded-md px-3 text-sm font-medium transition-colors ${
            value === option.id
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function Notice({ tone, text }: { tone: 'warning' | 'error'; text: string }) {
  const classes =
    tone === 'error'
      ? 'border-destructive/30 bg-destructive/10 text-destructive'
      : 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300';
  return (
    <div className={`flex gap-3 rounded-lg border p-4 text-sm ${classes}`}>
      <Warning className="mt-0.5 h-5 w-5 shrink-0" />
      <p>{text}</p>
    </div>
  );
}

export function Rows({ rows }: { rows: [string, string][] }) {
  return (
    <div className="space-y-3 text-sm">
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="grid min-w-0 gap-1 border-b border-border pb-2 last:border-0 sm:grid-cols-[minmax(7rem,0.8fr)_minmax(0,1.2fr)] sm:gap-4"
        >
          <span className="text-muted-foreground">{label}</span>
          <span className="min-w-0 break-words font-medium sm:text-right">{value}</span>
        </div>
      ))}
    </div>
  );
}

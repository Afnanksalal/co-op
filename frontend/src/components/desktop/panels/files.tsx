'use client';

import { type ChangeEvent, useEffect, useState } from 'react';
import { Brain, Database, FlowArrow, HardDrives, MagnifyingGlass } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { addKnowledgeDocument, getKnowledgeGraph, searchKnowledge, type DesktopState, type KnowledgeGraphSnapshot, type SearchResult } from '@/lib/desktop/runtime';
import { EmptyState, Field, MemoryBoard, MetricCard, Notice, PanelTitle, RelationshipBoard, TextArea } from '../shared';
import { errorMessage, formatBytes, knowledgeChunkCount } from '../utils';

export function RagPanel({
  state,
  busyAction,
  runWithState,
}: {
  state: DesktopState;
  busyAction: string;
  runWithState: (
    label: string,
    action: () => Promise<DesktopState>,
    success: string
  ) => Promise<boolean>;
}) {
  const maxFileChars = 250_000;
  const [document, setDocument] = useState({ title: '', source: '', content: '' });
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [graph, setGraph] = useState<KnowledgeGraphSnapshot | null>(null);
  const [graphError, setGraphError] = useState('');
  const [fileStatus, setFileStatus] = useState('');
  const [fileError, setFileError] = useState('');

  useEffect(() => {
    let mounted = true;
    void getKnowledgeGraph()
      .then((snapshot) => {
        if (mounted) setGraph(snapshot);
      })
      .catch((error) => {
        if (mounted) setGraphError(errorMessage(error, 'Business memory could not be loaded'));
      });
    return () => {
      mounted = false;
    };
  }, [
    state.documents.length,
    state.leads.length,
    state.campaigns.length,
    state.workflowRuns.length,
  ]);

  const refreshGraph = () => {
    setGraphError('');
    void getKnowledgeGraph()
      .then(setGraph)
      .catch((error) => setGraphError(errorMessage(error, 'Business memory could not be loaded')));
  };

  async function importFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    setFileError('');
    if (!file) return;
    if (file.size > 1_500_000) {
      setFileStatus('');
      setFileError('Choose a text-based file under 1.5 MB.');
      return;
    }
    try {
      const content = await file.text();
      if (content.trim().length < 3) {
        setFileStatus('');
        setFileError('That file did not contain readable text.');
        return;
      }
      if (content.length > maxFileChars) {
        setFileStatus('');
        setFileError(
          'That file is too large for the local file index. Split it into smaller files.'
        );
        return;
      }
      setDocument({
        title: document.title || file.name.replace(/\.[^.]+$/, ''),
        source: file.name,
        content,
      });
      setFileStatus(`${file.name} ready (${formatBytes(file.size)})`);
    } catch (error) {
      setFileStatus('');
      setFileError(errorMessage(error, 'Could not read that file.'));
    }
  }

  return (
    <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] gap-5 overflow-hidden xl:grid-cols-[400px_minmax(0,1fr)] xl:grid-rows-1">
      <form
        className="coop-scrollbar max-h-80 overflow-y-auto rounded-lg border border-border bg-card p-5 xl:max-h-none"
        onSubmit={(event) => {
          event.preventDefault();
          void runWithState(
            'document',
            () => addKnowledgeDocument(document),
            'File saved for Co-Op.'
          ).then((saved) => {
            if (saved) {
              setDocument({ title: '', source: '', content: '' });
              setFileStatus('');
              setFileError('');
            }
          });
        }}
      >
        <PanelTitle icon={HardDrives} title="Add a business file" />
        <label className="mt-4 flex cursor-pointer flex-col gap-2 rounded-lg border border-dashed border-border bg-background p-4 transition-colors hover:bg-muted/40">
          <span className="text-sm font-medium">Import a text file</span>
          <span className="text-xs leading-5 text-muted-foreground">
            Notes, policies, customer calls, research, CSVs, and plain text stay on this computer.
          </span>
          <input
            type="file"
            className="sr-only"
            accept=".txt,.md,.markdown,.csv,.json,.log,.html,.htm"
            onChange={(event) => void importFile(event)}
          />
        </label>
        {fileStatus && (
          <p className="mt-2 text-xs text-green-700 dark:text-green-300">{fileStatus}</p>
        )}
        {fileError && <p className="mt-2 text-xs text-destructive">{fileError}</p>}
        <Field
          label="Title"
          value={document.title}
          onChange={(title) => setDocument({ ...document, title })}
        />
        <Field
          label="Source"
          value={document.source}
          onChange={(source) => setDocument({ ...document, source })}
        />
        <TextArea
          label="Content"
          value={document.content}
          onChange={(content) => setDocument({ ...document, content })}
          minHeight="min-h-48"
        />
        <div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>
            {document.content.length.toLocaleString()} / {maxFileChars.toLocaleString()} characters
          </span>
          <span>Saved locally</span>
        </div>
        <Button
          className="mt-5"
          type="submit"
          disabled={
            busyAction === 'document' ||
            fileError.length > 0 ||
            document.title.trim().length < 2 ||
            document.content.trim().length < 3 ||
            document.content.length > maxFileChars
          }
        >
          Add file
        </Button>
      </form>

      <div className="coop-scrollbar min-h-0 space-y-5 overflow-y-auto pr-1">
        <section className="rounded-lg border border-border bg-card p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <PanelTitle icon={MagnifyingGlass} title="Find answers" compact />
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Search saved files without uploading business data to Co-Op cloud.
              </p>
            </div>
            <Badge variant="secondary">{state.documents.length} files</Badge>
          </div>
          <form
            className="mt-5 flex gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              void searchKnowledge({ query, limit: 6 }).then(setResults);
            }}
          >
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search company files"
            />
            <Button type="submit">Search</Button>
          </form>
          <div className="mt-5 grid gap-3">
            {results.map((result) => (
              <article
                key={result.chunkId}
                className="rounded-md border border-border bg-background p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-medium">{result.title}</h3>
                  <Badge variant="secondary">{Math.round(result.score * 100)}% match</Badge>
                </div>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {result.source || 'Local file'}
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{result.content}</p>
              </article>
            ))}
            {results.length === 0 && (
              <EmptyState
                icon={Database}
                title="No search results yet"
                text="Add files, notes, research, or pitch material, then search here."
              />
            )}
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <PanelTitle icon={Brain} title="What Co-Op knows" compact />
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Co-Op connects your profile, files, customers, research, and plans so answers stay
                grounded.
              </p>
            </div>
            <Button type="button" variant="outline" onClick={refreshGraph}>
              Refresh
            </Button>
          </div>
          {graphError && <Notice tone="error" text={graphError} />}
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            <MetricCard
              icon={Database}
              label="Saved facts"
              value={String(graph?.nodes.length ?? 0)}
            />
            <MetricCard
              icon={FlowArrow}
              label="Useful links"
              value={String(graph?.edges.length ?? 0)}
            />
            <MetricCard
              icon={Brain}
              label="Status"
              value={graph && graph.nodes.length > 0 ? 'Ready' : 'Needs profile'}
            />
          </div>
          <div className="mt-5 grid min-w-0 gap-4 2xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
            <MemoryBoard
              nodes={(graph?.nodes ?? []).slice(0, 6)}
              totalCount={graph?.nodes.length ?? 0}
            />
            <RelationshipBoard
              graph={graph}
              edges={(graph?.edges ?? []).slice(0, 7)}
              totalCount={graph?.edges.length ?? 0}
            />
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-5">
          <PanelTitle icon={HardDrives} title="Saved files" />
          <div className="grid gap-3">
            {state.documents.map((doc) => (
              <article key={doc.id} className="rounded-md border border-border bg-background p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-medium">{doc.title}</h3>
                  <Badge variant="secondary">{knowledgeChunkCount(doc)} sections</Badge>
                </div>
                <p className="mt-2 break-words text-sm text-muted-foreground">
                  {doc.source || '-'}
                </p>
              </article>
            ))}
            {state.documents.length === 0 && (
              <EmptyState
                icon={HardDrives}
                title="No files added"
                text="Add company docs, research notes, policies, call notes, or pitch content."
              />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

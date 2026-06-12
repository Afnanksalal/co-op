import type { ReactNode } from 'react';

export function MarkdownOutput({
  text,
  className = '',
  compact = false,
}: {
  text: string;
  className?: string;
  compact?: boolean;
}) {
  const blocks = parseMarkdownBlocks(text);
  const spacing = compact ? 'space-y-2' : 'space-y-3';

  return (
    <div className={`${spacing} break-words text-sm leading-6 ${className}`}>
      {blocks.length > 0 ? blocks : <p>{markdownToPlainText(text)}</p>}
    </div>
  );
}

function parseMarkdownBlocks(text: string): ReactNode[] {
  const lines = normalizeMarkdown(text).split('\n');
  const blocks: ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (isMarkdownRule(line)) {
      blocks.push(<hr key={`rule-${index}`} className="border-0 border-t border-border/70" />);
      index += 1;
      continue;
    }

    if (line.trimStart().startsWith('```')) {
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].trimStart().startsWith('```')) {
        code.push(lines[index]);
        index += 1;
      }
      index += index < lines.length ? 1 : 0;
      blocks.push(
        <pre
          key={`code-${index}`}
          className="coop-scrollbar overflow-auto rounded-md bg-muted px-3 py-2 font-mono text-xs leading-5 text-foreground"
        >
          {code.join('\n')}
        </pre>
      );
      continue;
    }

    if (isMarkdownTable(lines, index)) {
      const tableLines = [lines[index]];
      index += 2;
      while (index < lines.length && lines[index].includes('|') && lines[index].trim()) {
        tableLines.push(lines[index]);
        index += 1;
      }
      blocks.push(renderMarkdownTable(tableLines, `table-${index}`));
      continue;
    }

    const heading = line.match(/^\s{0,3}(#{1,4})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      const Tag = level <= 2 ? 'h3' : 'h4';
      blocks.push(
        <Tag
          key={`heading-${index}`}
          className="font-serif text-base font-semibold text-foreground"
        >
          {renderInlineMarkdown(heading[2], `heading-${index}`)}
        </Tag>
      );
      index += 1;
      continue;
    }

    const bullet = line.match(/^\s*[-*•]\s+(.+)$/);
    if (bullet) {
      const items: string[] = [];
      while (index < lines.length) {
        const match = lines[index].match(/^\s*[-*•]\s+(.+)$/);
        if (!match) break;
        items.push(match[1]);
        index += 1;
      }
      blocks.push(
        <ul key={`ul-${index}`} className="list-disc space-y-1 pl-5">
          {items.map((item, itemIndex) => (
            <li key={`ul-${index}-${itemIndex}`}>
              {renderInlineMarkdown(item, `ul-${index}-${itemIndex}`)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    const ordered = line.match(/^\s*\d+[.)]\s+(.+)$/);
    if (ordered) {
      const items: string[] = [];
      while (index < lines.length) {
        const match = lines[index].match(/^\s*\d+[.)]\s+(.+)$/);
        if (!match) break;
        items.push(match[1]);
        index += 1;
      }
      blocks.push(
        <ol key={`ol-${index}`} className="list-decimal space-y-1 pl-5">
          {items.map((item, itemIndex) => (
            <li key={`ol-${index}-${itemIndex}`}>
              {renderInlineMarkdown(item, `ol-${index}-${itemIndex}`)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    const quote = line.match(/^\s*>\s?(.+)$/);
    if (quote) {
      const quotes: string[] = [];
      while (index < lines.length) {
        const match = lines[index].match(/^\s*>\s?(.+)$/);
        if (!match) break;
        quotes.push(match[1]);
        index += 1;
      }
      blocks.push(
        <blockquote
          key={`quote-${index}`}
          className="border-l-2 border-border pl-3 text-muted-foreground"
        >
          {renderInlineMarkdown(quotes.join(' '), `quote-${index}`)}
        </blockquote>
      );
      continue;
    }

    const paragraph: string[] = [line.trim()];
    index += 1;
    while (index < lines.length && lines[index].trim() && !isMarkdownBlockStart(lines, index)) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    blocks.push(
      <p key={`p-${index}`} className="text-current">
        {renderInlineMarkdown(paragraph.join(' '), `p-${index}`)}
      </p>
    );
  }

  return blocks;
}

function renderMarkdownTable(lines: string[], key: string) {
  const rows = lines.map(splitMarkdownTableRow).filter((row) => row.length > 0);
  const [header, ...body] = rows;

  return (
    <div key={key} className="coop-scrollbar overflow-x-auto rounded-md border border-border">
      <table className="w-full min-w-[32rem] text-left text-sm">
        <thead className="bg-muted/60 text-foreground">
          <tr>
            {header.map((cell, index) => (
              <th key={`${key}-head-${index}`} className="px-3 py-2 font-medium">
                {renderInlineMarkdown(cell, `${key}-head-${index}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, rowIndex) => (
            <tr key={`${key}-row-${rowIndex}`} className="border-t border-border">
              {row.map((cell, cellIndex) => (
                <td key={`${key}-${rowIndex}-${cellIndex}`} className="px-3 py-2 align-top">
                  {renderInlineMarkdown(cell, `${key}-${rowIndex}-${cellIndex}`)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderInlineMarkdown(value: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern =
    /\[([^\]]+)\]\(((?:https?:\/\/|mailto:)[^\s)]+)\)|`([^`]+)`|\*\*([^*\n]+)\*\*|__([^_\n]+)__|\*([^*\n]+)\*|_([^_\n]+)_/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(value)) !== null) {
    if (match.index > cursor) {
      nodes.push(cleanMarkdownArtifacts(value.slice(cursor, match.index)));
    }

    const key = `${keyPrefix}-${match.index}`;
    if (match[1] && match[2]) {
      nodes.push(
        <a
          key={key}
          href={match[2]}
          target="_blank"
          rel="noreferrer"
          className="text-primary underline-offset-4 hover:underline"
        >
          {cleanMarkdownArtifacts(match[1])}
        </a>
      );
    } else if (match[3]) {
      nodes.push(
        <code key={key} className="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground">
          {match[3]}
        </code>
      );
    } else if (match[4] || match[5]) {
      nodes.push(
        <strong key={key} className="font-semibold text-foreground">
          {cleanMarkdownArtifacts(match[4] ?? match[5] ?? '')}
        </strong>
      );
    } else if (match[6] || match[7]) {
      nodes.push(
        <em key={key} className="italic">
          {cleanMarkdownArtifacts(match[6] ?? match[7] ?? '')}
        </em>
      );
    }

    cursor = pattern.lastIndex;
  }

  if (cursor < value.length) {
    nodes.push(cleanMarkdownArtifacts(value.slice(cursor)));
  }

  return nodes.filter((node) => node !== '');
}

export function markdownToPlainText(text: string) {
  return cleanMarkdownArtifacts(
    normalizeMarkdown(text)
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/\[([^\]]+)\]\((?:https?:\/\/|mailto:)[^\s)]+\)/g, '$1')
      .replace(/^\s{0,3}#{1,6}\s+/gm, '')
      .replace(/^\s{0,3}(?:[-*_]\s*){3,}$/gm, ' ')
      .replace(/^\s*[-*•]\s+/gm, '')
      .replace(/^\s*\d+[.)]\s+/gm, '')
      .replace(/^\s*>\s?/gm, '')
      .replace(/\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

function normalizeMarkdown(text: string) {
  return text.replace(/\r\n?/g, '\n').replace(/\u00a0/g, ' ');
}

function cleanMarkdownArtifacts(text: string) {
  return text
    .replace(/\\([\\`*_{}[\]()#+\-.!|>])/g, '$1')
    .replace(/\*\*/g, '')
    .replace(/__/g, '')
    .replace(/(^|\s)[*_](?=\s|$)/g, '$1')
    .replace(/\s+([,.;:!?])/g, '$1');
}

function isMarkdownBlockStart(lines: string[], index: number) {
  const line = lines[index] ?? '';
  return (
    line.trimStart().startsWith('```') ||
    isMarkdownRule(line) ||
    isMarkdownTable(lines, index) ||
    /^\s{0,3}#{1,4}\s+/.test(line) ||
    /^\s*[-*•]\s+/.test(line) ||
    /^\s*\d+[.)]\s+/.test(line) ||
    /^\s*>\s?/.test(line)
  );
}

function isMarkdownRule(line: string): boolean {
  return /^\s{0,3}(?:[-*_]\s*){3,}$/.test(line.trimEnd());
}

function isMarkdownTable(lines: string[], index: number) {
  const header = lines[index] ?? '';
  const divider = lines[index + 1] ?? '';
  return header.includes('|') && /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(divider);
}

function splitMarkdownTableRow(line: string) {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return trimmed.split('|').map((cell) => cell.trim());
}

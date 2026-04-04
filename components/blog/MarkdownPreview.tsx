'use client';

import { colors } from '@/lib/design-tokens';

interface MarkdownPreviewProps {
  content: string;
}

function parseMarkdown(markdown: string): React.ReactNode[] {
  const lines = markdown.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trimStart();

    // Headings
    if (trimmed.startsWith('# ')) {
      elements.push(
        <h1 key={i} style={styles.h1}>
          {parseInline(trimmed.slice(2).trim())}
        </h1>,
      );
    } else if (trimmed.startsWith('## ')) {
      elements.push(
        <h2 key={i} style={styles.h2}>
          {parseInline(trimmed.slice(3).trim())}
        </h2>,
      );
    } else if (trimmed.startsWith('### ')) {
      elements.push(
        <h3 key={i} style={styles.h3}>
          {parseInline(trimmed.slice(4).trim())}
        </h3>,
      );
    }
    // Code blocks
    else if (trimmed.startsWith('```')) {
      let code = '';
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        code += lines[i] + '\n';
        i++;
      }
      elements.push(
        <pre key={i} style={styles.codeBlock}>
          <code style={styles.code}>{code.trim()}</code>
        </pre>,
      );
    }
    // Blockquotes
    else if (trimmed.startsWith('> ')) {
      const quote = trimmed.slice(2).trim();
      elements.push(
        <blockquote key={i} style={styles.blockquote}>
          {parseInline(quote)}
        </blockquote>,
      );
    }
    // Unordered lists
    else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const listItems: React.ReactNode[] = [];
      while (
        i < lines.length &&
        (lines[i].trim().startsWith('- ') || lines[i].trim().startsWith('* '))
      ) {
        const item = lines[i].trim().slice(2).trim();
        listItems.push(
          <li key={i} style={styles.listItem}>
            {parseInline(item)}
          </li>,
        );
        i++;
      }
      elements.push(
        <ul key={i} style={styles.list}>
          {listItems}
        </ul>,
      );
      i--;
    }
    // Paragraphs
    else if (trimmed.length > 0) {
      elements.push(
        <p key={i} style={styles.paragraph}>
          {parseInline(line)}
        </p>,
      );
    }

    i++;
  }

  return elements;
}

function parseInline(text: string): React.ReactNode {
  // Split by patterns for bold, italic, code, and links
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Bold: **text**
    const boldMatch = remaining.match(/\*\*([^*]+)\*\*/);
    // Italic: *text* or _text_
    const italicMatch = remaining.match(/[*_]([^*_]+)[*_]/);
    // Code: `text`
    const codeMatch = remaining.match(/`([^`]+)`/);
    // Link: [text](url)
    const linkMatch = remaining.match(/\[([^\]]+)\]\(([^)]+)\)/);

    let nextMatch = null;
    let nextIndex = Infinity;
    let type = '';

    if (boldMatch && boldMatch.index !== undefined && boldMatch.index < nextIndex) {
      nextMatch = boldMatch;
      nextIndex = boldMatch.index;
      type = 'bold';
    }
    if (italicMatch && italicMatch.index !== undefined && italicMatch.index < nextIndex) {
      nextMatch = italicMatch;
      nextIndex = italicMatch.index;
      type = 'italic';
    }
    if (codeMatch && codeMatch.index !== undefined && codeMatch.index < nextIndex) {
      nextMatch = codeMatch;
      nextIndex = codeMatch.index;
      type = 'code';
    }
    if (linkMatch && linkMatch.index !== undefined && linkMatch.index < nextIndex) {
      nextMatch = linkMatch;
      nextIndex = linkMatch.index;
      type = 'link';
    }

    if (!nextMatch) {
      parts.push(remaining);
      break;
    }

    // Add text before match
    if (nextIndex > 0) {
      parts.push(remaining.slice(0, nextIndex));
    }

    // Add the matched element
    if (type === 'bold') {
      parts.push(
        <strong key={key++} style={{ fontWeight: 700 }}>
          {nextMatch[1]}
        </strong>,
      );
      remaining = remaining.slice(nextIndex + nextMatch[0].length);
    } else if (type === 'italic') {
      parts.push(
        <em key={key++} style={{ fontStyle: 'italic' }}>
          {nextMatch[1]}
        </em>,
      );
      remaining = remaining.slice(nextIndex + nextMatch[0].length);
    } else if (type === 'code') {
      parts.push(
        <code key={key++} style={styles.inlineCode}>
          {nextMatch[1]}
        </code>,
      );
      remaining = remaining.slice(nextIndex + nextMatch[0].length);
    } else if (type === 'link') {
      parts.push(
        <a
          key={key++}
          href={nextMatch[2]}
          style={styles.link}
          target="_blank"
          rel="noopener noreferrer"
        >
          {nextMatch[1]}
        </a>,
      );
      remaining = remaining.slice(nextIndex + nextMatch[0].length);
    }
  }

  return parts.length === 1 && typeof parts[0] === 'string' ? parts[0] : parts;
}

export default function MarkdownPreview({ content }: MarkdownPreviewProps) {
  const elements = parseMarkdown(content);

  return (
    <div style={styles.preview}>
      <h3 style={styles.previewTitle}>Preview</h3>
      <div style={styles.previewContent}>{elements}</div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  preview: {
    paddingBottom: 20,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: colors.gray600,
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  previewContent: {
    fontSize: 14,
    lineHeight: 1.6,
    color: colors.navy,
  },
  h1: {
    fontSize: 28,
    fontWeight: 700,
    color: colors.navy,
    margin: '24px 0 16px',
    lineHeight: 1.3,
  },
  h2: {
    fontSize: 22,
    fontWeight: 700,
    color: colors.navy,
    margin: '20px 0 12px',
    lineHeight: 1.3,
  },
  h3: {
    fontSize: 18,
    fontWeight: 700,
    color: colors.navy,
    margin: '16px 0 10px',
    lineHeight: 1.3,
  },
  paragraph: {
    margin: '12px 0',
    lineHeight: 1.6,
  },
  list: {
    margin: '12px 0',
    paddingLeft: 20,
  },
  listItem: {
    margin: '6px 0',
  },
  blockquote: {
    margin: '12px 0',
    paddingLeft: 16,
    borderLeft: `4px solid ${colors.gold}`,
    color: colors.gray600,
    fontStyle: 'italic',
  },
  codeBlock: {
    background: colors.gray50,
    border: `1px solid ${colors.gray200}`,
    borderRadius: 6,
    padding: 12,
    margin: '12px 0',
    overflow: 'auto' as const,
  },
  code: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: colors.navy,
  },
  inlineCode: {
    background: colors.gray100,
    borderRadius: 3,
    padding: '2px 6px',
    fontFamily: 'monospace',
    fontSize: '0.9em',
    color: colors.navy,
  },
  link: {
    color: colors.blue,
    textDecoration: 'underline',
    cursor: 'pointer',
  },
};

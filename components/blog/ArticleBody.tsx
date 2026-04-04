'use client';

import { colors } from '@/lib/design-tokens';

interface ArticleBodyProps {
  content: string;
}

// Simple markdown-to-HTML regex-based renderer
const renderMarkdown = (markdown: string): React.ReactNode => {
  // Split content into lines for processing
  const lines = markdown.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;
  let inCodeBlock = false;
  let codeBlockContent = '';

  while (i < lines.length) {
    const line = lines[i];

    // Code blocks
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        inCodeBlock = false;
        elements.push(
          <pre
            key={`code-${i}`}
            style={{
              backgroundColor: colors.gray100,
              border: `1px solid ${colors.gray200}`,
              borderRadius: '8px',
              padding: '16px',
              overflowX: 'auto',
              fontFamily: "'Courier New', monospace",
              fontSize: '13px',
              lineHeight: 1.5,
              color: colors.gray600,
              margin: '16px 0',
            }}
          >
            <code>{codeBlockContent}</code>
          </pre>,
        );
        codeBlockContent = '';
      } else {
        inCodeBlock = true;
      }
      i++;
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent += (codeBlockContent ? '\n' : '') + line;
      i++;
      continue;
    }

    // Headings
    if (line.startsWith('### ')) {
      elements.push(
        <h3
          key={`h3-${i}`}
          style={{
            fontSize: '20px',
            fontWeight: 600,
            fontFamily: "'Instrument Serif', serif",
            color: colors.navy,
            margin: '24px 0 12px 0',
            lineHeight: 1.3,
          }}
        >
          {renderInline(line.replace(/^### /, ''))}
        </h3>,
      );
      i++;
      continue;
    }

    if (line.startsWith('## ')) {
      elements.push(
        <h2
          key={`h2-${i}`}
          style={{
            fontSize: '28px',
            fontWeight: 600,
            fontFamily: "'Instrument Serif', serif",
            color: colors.navy,
            margin: '32px 0 16px 0',
            lineHeight: 1.3,
          }}
        >
          {renderInline(line.replace(/^## /, ''))}
        </h2>,
      );
      i++;
      continue;
    }

    if (line.startsWith('# ')) {
      elements.push(
        <h1
          key={`h1-${i}`}
          style={{
            fontSize: '36px',
            fontWeight: 600,
            fontFamily: "'Instrument Serif', serif",
            color: colors.navy,
            margin: '40px 0 20px 0',
            lineHeight: 1.2,
          }}
        >
          {renderInline(line.replace(/^# /, ''))}
        </h1>,
      );
      i++;
      continue;
    }

    // Blockquotes
    if (line.startsWith('> ')) {
      const quoteLines = [];
      while (i < lines.length && lines[i].startsWith('> ')) {
        quoteLines.push(lines[i].replace(/^> /, ''));
        i++;
      }
      elements.push(
        <blockquote
          key={`quote-${i}`}
          style={{
            borderLeft: `4px solid ${colors.gold}`,
            paddingLeft: '16px',
            margin: '20px 0',
            color: colors.gray600,
            fontStyle: 'italic',
            fontSize: '15px',
            lineHeight: 1.6,
          }}
        >
          {quoteLines.map((quoteLine, idx) => (
            <div key={idx}>{renderInline(quoteLine)}</div>
          ))}
        </blockquote>,
      );
      continue;
    }

    // Ordered lists
    if (line.match(/^\d+\. /)) {
      const listItems = [];
      while (i < lines.length && lines[i].match(/^\d+\. /)) {
        listItems.push(lines[i].replace(/^\d+\. /, ''));
        i++;
      }
      elements.push(
        <ol
          key={`ol-${i}`}
          style={{
            margin: '16px 0',
            paddingLeft: '24px',
            color: colors.gray600,
            fontSize: '15px',
            lineHeight: 1.6,
          }}
        >
          {listItems.map((item, idx) => (
            <li key={idx} style={{ marginBottom: '8px' }}>
              {renderInline(item)}
            </li>
          ))}
        </ol>,
      );
      continue;
    }

    // Unordered lists
    if (line.startsWith('- ') || line.startsWith('* ')) {
      const listItems = [];
      while (i < lines.length && (lines[i].startsWith('- ') || lines[i].startsWith('* '))) {
        listItems.push(lines[i].replace(/^[-*] /, ''));
        i++;
      }
      elements.push(
        <ul
          key={`ul-${i}`}
          style={{
            margin: '16px 0',
            paddingLeft: '24px',
            color: colors.gray600,
            fontSize: '15px',
            lineHeight: 1.6,
            listStyleType: 'disc',
          }}
        >
          {listItems.map((item, idx) => (
            <li key={idx} style={{ marginBottom: '8px' }}>
              {renderInline(item)}
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    // Paragraphs and empty lines
    if (line.trim() === '') {
      i++;
      continue;
    }

    elements.push(
      <p
        key={`p-${i}`}
        style={{
          fontSize: '15px',
          color: colors.gray600,
          margin: '16px 0',
          lineHeight: 1.7,
        }}
      >
        {renderInline(line)}
      </p>,
    );

    i++;
  }

  return elements;
};

// Render inline markdown (bold, italic, links, code)
const renderInline = (text: string): React.ReactNode => {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  const regex =
    /\*\*(.+?)\*\*|__(.+?)__|_(.+?)_|\*(.+?)\*|\[(.+?)\]\((.+?)\)|`(.+?)`|!\[(.+?)\]\((.+?)\)/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    // Bold
    if (match[1] || match[2]) {
      parts.push(
        <strong key={`bold-${parts.length}`} style={{ fontWeight: 700 }}>
          {match[1] || match[2]}
        </strong>,
      );
    }
    // Italic
    else if (match[3] || match[4]) {
      parts.push(
        <em key={`italic-${parts.length}`} style={{ fontStyle: 'italic' }}>
          {match[3] || match[4]}
        </em>,
      );
    }
    // Link
    else if (match[5] && match[6]) {
      parts.push(
        <a
          key={`link-${parts.length}`}
          href={match[6]}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: colors.blue,
            textDecoration: 'underline',
            cursor: 'pointer',
          }}
        >
          {match[5]}
        </a>,
      );
    }
    // Inline code
    else if (match[7]) {
      parts.push(
        <code
          key={`code-${parts.length}`}
          style={{
            backgroundColor: colors.gray100,
            padding: '2px 6px',
            borderRadius: '4px',
            fontFamily: "'Courier New', monospace",
            fontSize: '13px',
            color: colors.gray600,
          }}
        >
          {match[7]}
        </code>,
      );
    }
    // Image
    else if (match[8] && match[9]) {
      parts.push(
        <img
          key={`img-${parts.length}`}
          src={match[9]}
          alt={match[8]}
          style={{
            maxWidth: '100%',
            height: 'auto',
            borderRadius: '8px',
            margin: '16px 0',
            display: 'block',
          }}
        />,
      );
    }

    lastIndex = regex.lastIndex;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length === 0 ? text : parts;
};

export default function ArticleBody({ content }: ArticleBodyProps) {
  return (
    <div
      style={{
        fontSize: '15px',
        lineHeight: 1.7,
        color: colors.gray600,
      }}
    >
      {renderMarkdown(content)}
    </div>
  );
}

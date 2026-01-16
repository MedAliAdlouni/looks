import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
// @ts-ignore - dynamic import for styles
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { Components } from 'react-markdown';

interface MarkdownMessageProps {
  content: string;
  isUser?: boolean;
}

export default function MarkdownMessage({ content, isUser = false }: MarkdownMessageProps) {
  const components: Components = {
    code({ node, inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      const codeString = String(children).replace(/\n$/, '');
      
      return !inline && match ? (
        <SyntaxHighlighter
          style={vscDarkPlus}
          language={match[1]}
          PreTag="div"
          {...props}
          customStyle={{
            margin: '0.75rem 0',
            borderRadius: '0.5rem',
            padding: '1rem',
            fontSize: '0.875rem',
            background: isUser ? 'rgba(0, 0, 0, 0.4)' : '#1e1e1e',
            border: 'none',
          }}
        >
          {codeString}
        </SyntaxHighlighter>
      ) : (
        <code
          className={className}
          {...props}
          style={{
            background: isUser ? 'rgba(255, 255, 255, 0.25)' : '#f4f4f4',
            padding: '0.2rem 0.4rem',
            borderRadius: '0.25rem',
            fontSize: '0.875rem',
            fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
            color: isUser ? '#fff' : '#e83e8c',
            fontWeight: '500',
          }}
        >
          {children}
        </code>
      );
    },
    p: ({ children }) => (
      <p style={{ 
        margin: '0.125rem 0', 
        lineHeight: '1.5',
        fontSize: '0.9375rem',
      }}>
        {children}
      </p>
    ),
    h1: ({ children }) => (
      <h1 style={{ 
        fontSize: '1.5rem', 
        fontWeight: '700', 
        margin: '1.25rem 0 0.75rem 0',
        lineHeight: '1.4',
        color: isUser ? '#fff' : '#111827',
      }}>
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 style={{ 
        fontSize: '1.25rem', 
        fontWeight: '600', 
        margin: '1rem 0 0.625rem 0',
        lineHeight: '1.4',
        color: isUser ? '#fff' : '#111827',
      }}>
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 style={{ 
        fontSize: '1.125rem', 
        fontWeight: '600', 
        margin: '0.875rem 0 0.5rem 0',
        lineHeight: '1.4',
        color: isUser ? '#fff' : '#111827',
      }}>
        {children}
      </h3>
    ),
    ul: ({ children }) => (
      <ul style={{ 
        margin: '0.25rem 0', 
        paddingLeft: '1.5rem', 
        listStyleType: 'disc',
        lineHeight: '1.5',
      }}>
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol style={{ 
        margin: '0.25rem 0', 
        paddingLeft: '1.5rem', 
        listStyleType: 'decimal',
        lineHeight: '1.5',
      }}>
        {children}
      </ol>
    ),
    li: ({ children }) => (
      <li style={{ 
        margin: '0.125rem 0', 
        lineHeight: '1.5',
        fontSize: '0.9375rem',
      }}>
        {children}
      </li>
    ),
    blockquote: ({ children }) => (
      <blockquote
        style={{
          borderLeft: `4px solid ${isUser ? 'rgba(255, 255, 255, 0.4)' : '#667eea'}`,
          paddingLeft: '0.75rem',
          margin: '0.375rem 0',
          fontStyle: 'italic',
          color: isUser ? 'rgba(255, 255, 255, 0.95)' : '#6b7280',
          background: isUser ? 'rgba(255, 255, 255, 0.05)' : '#f9fafb',
          padding: '0.5rem 0.75rem',
          borderRadius: '0.375rem',
        }}
      >
        {children}
      </blockquote>
    ),
    a: ({ href, children }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          color: isUser ? '#a5d8ff' : '#667eea',
          textDecoration: 'underline',
          textUnderlineOffset: '2px',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = '0.8';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = '1';
        }}
      >
        {children}
      </a>
    ),
    strong: ({ children }) => (
      <strong style={{ fontWeight: '700', color: isUser ? '#fff' : '#111827' }}>
        {children}
      </strong>
    ),
    em: ({ children }) => (
      <em style={{ fontStyle: 'italic' }}>
        {children}
      </em>
    ),
    hr: () => (
      <hr
        style={{
          border: 'none',
          borderTop: `1px solid ${isUser ? 'rgba(255, 255, 255, 0.2)' : '#e5e7eb'}`,
          margin: '1.25rem 0',
        }}
      />
    ),
    table: ({ children }) => (
      <div style={{ overflowX: 'auto', margin: '0.875rem 0', borderRadius: '0.5rem' }}>
        <table
          style={{
            borderCollapse: 'collapse',
            width: '100%',
            fontSize: '0.875rem',
            background: isUser ? 'rgba(255, 255, 255, 0.05)' : '#fff',
            borderRadius: '0.5rem',
            overflow: 'hidden',
          }}
        >
          {children}
        </table>
      </div>
    ),
    thead: ({ children }) => (
      <thead style={{ 
        background: isUser ? 'rgba(255, 255, 255, 0.1)' : '#f9fafb',
        borderBottom: `2px solid ${isUser ? 'rgba(255, 255, 255, 0.2)' : '#e5e7eb'}`,
      }}>
        {children}
      </thead>
    ),
    tbody: ({ children }) => <tbody>{children}</tbody>,
    tr: ({ children }) => (
      <tr style={{ 
        borderBottom: `1px solid ${isUser ? 'rgba(255, 255, 255, 0.1)' : '#e5e7eb'}`,
      }}>
        {children}
      </tr>
    ),
    td: ({ children }) => (
      <td style={{ 
        padding: '0.75rem', 
        textAlign: 'left',
        color: isUser ? 'rgba(255, 255, 255, 0.9)' : '#374151',
      }}>
        {children}
      </td>
    ),
    th: ({ children }) => (
      <th
        style={{
          padding: '0.75rem',
          textAlign: 'left',
          fontWeight: '600',
          color: isUser ? '#fff' : '#374151',
        }}
      >
        {children}
      </th>
    ),
    pre: ({ children }) => (
      <pre style={{ margin: 0 }}>
        {children}
      </pre>
    ),
  };

  return (
    <div style={{ 
      wordBreak: 'break-word',
      color: isUser ? '#fff' : '#111827',
    }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}


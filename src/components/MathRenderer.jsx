import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import katex from 'katex';
import { Copy, Check } from 'lucide-react';

/**
 * Normalizes LaTeX delimiters so remark-math and KaTeX reliably detect them.
 * Converts:
 *   - \[ equation \] or \\[ equation \\]  -->  $$ \n equation \n $$
 *   - \( formula \) or \\( formula \\)    -->  $ formula $
 */
export function preprocessMath(content) {
  if (!content || typeof content !== 'string') return '';

  return content
    // Double-backslash block delimiters: \\[ ... \\]
    .replace(/\\\\\[([\s\S]*?)\\\\\]/g, (_, eq) => `$$\n${eq.trim()}\n$$`)
    // Single-backslash block delimiters: \[ ... \]
    .replace(/\\\[([\s\S]*?)\\\]/g, (_, eq) => `$$\n${eq.trim()}\n$$`)
    // Double-backslash inline delimiters: \\( ... \\)
    .replace(/\\\\\(([\s\S]*?)\\\\\)/g, (_, eq) => `$${eq.trim()}$`)
    // Single-backslash inline delimiters: \( ... \)
    .replace(/\\\(([\s\S]*?)\\\)/g, (_, eq) => `$${eq.trim()}$`);
}

/**
 * LatexBlock: Renders a standalone LaTeX formula in display/block mode.
 * Includes a subtle card background, auto-scroll for wide formulas, and a copy button.
 */
export function LatexBlock({ formula, className = '', showCopy = true }) {
  const [copied, setCopied] = useState(false);

  if (!formula || typeof formula !== 'string') return null;

  // Clean off wrapping $$ or $ if provided
  const rawClean = formula.trim()
    .replace(/^\$\$([\s\S]*)\$\$$/, '$1')
    .replace(/^\$([\s\S]*)\$$/, '$1')
    .trim();

  let renderedHtml = '';
  let hasError = false;

  try {
    renderedHtml = katex.renderToString(rawClean, {
      displayMode: true,
      throwOnError: false,
      output: 'htmlAndMathml',
    });
  } catch (err) {
    hasError = true;
    console.warn('KaTeX rendering error:', err);
  }

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(rawClean);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`group relative my-3 p-4 rounded-xl border overflow-x-auto sa-scroll transition-colors ${className}`}
      style={{
        background: 'var(--surface-subtle)',
        borderColor: 'var(--line)',
      }}
    >
      {showCopy && (
        <button
          onClick={handleCopy}
          title="Copy LaTeX formula"
          className="absolute top-2 right-2 p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity text-xs flex items-center gap-1 z-10"
          style={{
            background: 'var(--surface)',
            color: copied ? 'var(--success)' : 'var(--muted)',
            border: '1px solid var(--line)',
          }}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          <span className="text-[10px]">{copied ? 'Copied' : 'LaTeX'}</span>
        </button>
      )}

      {hasError ? (
        <code className="text-xs font-mono text-amber-500 whitespace-pre-wrap">{rawClean}</code>
      ) : (
        <div
          className="text-center font-serif py-1 select-text"
          style={{ color: 'var(--text)' }}
          dangerouslySetInnerHTML={{ __html: renderedHtml }}
        />
      )}
    </div>
  );
}

/**
 * InlineMath: Renders a single inline LaTeX formula.
 */
export function InlineMath({ formula, className = '' }) {
  if (!formula || typeof formula !== 'string') return null;

  const rawClean = formula.trim()
    .replace(/^\$([\s\S]*)\$$/, '$1')
    .trim();

  try {
    const html = katex.renderToString(rawClean, {
      displayMode: false,
      throwOnError: false,
      output: 'htmlAndMathml',
    });
    return (
      <span
        className={`inline-block align-middle ${className}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  } catch (err) {
    return <code className="text-xs font-mono">{rawClean}</code>;
  }
}

/**
 * FormattedText: Perfect for question text, multiple choice options, flashcards,
 * headings, or any string that might have mixed text and LaTeX ($...$ or $$...$$).
 * When `inline` is true, replaces top-level <p> with <span> to prevent invalid DOM nesting.
 */
export function FormattedText({ text, className = '', inline = false, components = {} }) {
  if (!text) return null;

  const processed = preprocessMath(String(text));

  const defaultComponents = inline
    ? {
        p: ({ node, ...props }) => <span className="inline" {...props} />,
        ...components,
      }
    : {
        p: ({ node, ...props }) => <p className="my-1 leading-relaxed" {...props} />,
        strong: ({ node, ...props }) => <strong className="font-semibold" style={{ color: 'var(--accent-ink)' }} {...props} />,
        code: ({ node, inline: isInline, ...props }) => (
          <code
            className="rounded px-1 py-0.5 text-[0.85em] font-mono"
            style={{ background: 'var(--surface-subtle)', border: '1px solid var(--line-subtle)' }}
            {...props}
          />
        ),
        ...components,
      };

  return (
    <span className={`inline-math-container ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[[rehypeKatex, { throwOnError: false }]]}
        components={defaultComponents}
      >
        {processed}
      </ReactMarkdown>
    </span>
  );
}

/**
 * MathRenderer: Full-featured markdown and LaTeX math renderer.
 * Use for AI responses, document summaries, study notes, worked solutions.
 */
export default function MathRenderer({
  content,
  className = '',
  inline = false,
  components = {},
}) {
  if (!content) return null;

  const processed = preprocessMath(String(content));

  const standardComponents = {
    h1: ({ node, ...props }) => (
      <h1 className="sa-serif text-2xl font-bold mt-4 mb-2 pb-1 border-b" style={{ borderColor: 'var(--line)' }} {...props} />
    ),
    h2: ({ node, ...props }) => (
      <h2 className="sa-serif text-xl font-semibold mt-3.5 mb-1.5" {...props} />
    ),
    h3: ({ node, ...props }) => (
      <h3 className="sa-serif text-lg font-semibold mt-3 mb-1" {...props} />
    ),
    h4: ({ node, ...props }) => (
      <h4 className="text-base font-semibold mt-2 mb-1" {...props} />
    ),
    p: inline
      ? ({ node, ...props }) => <span className="inline" {...props} />
      : ({ node, ...props }) => <p className="my-2 leading-relaxed" {...props} />,
    ul: ({ node, ...props }) => <ul className="list-disc pl-5 space-y-1 my-2" {...props} />,
    ol: ({ node, ...props }) => <ol className="list-decimal pl-5 space-y-1 my-2" {...props} />,
    li: ({ node, ...props }) => <li className="pl-1 leading-relaxed" {...props} />,
    blockquote: ({ node, ...props }) => (
      <blockquote
        className="border-l-4 pl-4 py-1.5 my-3 rounded-r-lg italic"
        style={{ borderColor: 'var(--accent)', background: 'var(--accent-soft)', color: 'var(--text)' }}
        {...props}
      />
    ),
    strong: ({ node, ...props }) => (
      <strong className="font-semibold" style={{ color: 'var(--accent-ink)' }} {...props} />
    ),
    code: ({ node, inline: isInline, ...props }) =>
      isInline ? (
        <code
          className="rounded px-1.5 py-0.5 text-[0.85em] font-mono"
          style={{ background: 'var(--surface-subtle)', border: '1px solid var(--line-subtle)' }}
          {...props}
        />
      ) : (
        <code
          className="block p-3 rounded-xl text-[0.85em] font-mono overflow-x-auto my-2.5"
          style={{ background: 'var(--surface-subtle)', border: '1px solid var(--line)' }}
          {...props}
        />
      ),
    table: ({ node, ...props }) => (
      <div className="overflow-x-auto my-3 rounded-lg border" style={{ borderColor: 'var(--line)' }}>
        <table className="w-full text-left text-sm border-collapse" {...props} />
      </div>
    ),
    th: ({ node, ...props }) => (
      <th className="p-2.5 font-semibold border-b text-xs uppercase tracking-wider" style={{ background: 'var(--surface-subtle)', borderColor: 'var(--line)' }} {...props} />
    ),
    td: ({ node, ...props }) => (
      <td className="p-2.5 border-b text-xs" style={{ borderColor: 'var(--line-subtle)' }} {...props} />
    ),
    ...components,
  };

  return (
    <div className={`math-content text-sm leading-relaxed ${className}`} style={{ color: 'var(--text)' }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[[rehypeKatex, { throwOnError: false }]]}
        components={standardComponents}
      >
        {processed}
      </ReactMarkdown>
    </div>
  );
}

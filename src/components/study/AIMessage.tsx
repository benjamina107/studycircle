import { memo } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { normalizeMathDelimiters } from '@/lib/math-markdown';

/** Model output stays untrusted: no raw HTML, remote images, or trusted TeX commands. */
export default memo(function AIMessage({ text, className }: { text: string; className?: string }) {
  return <div className={className}>
    <Markdown
      skipHtml
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[[rehypeKatex, { trust: false, strict: 'ignore', maxExpand: 1000, maxSize: 20 }]]}
      components={{
        a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>,
        img: ({ alt }) => <span>{alt || 'Image'}</span>,
        table: ({ children }) => <div role="region" aria-label="Table" tabIndex={0} style={{ overflowX: 'auto' }}><table>{children}</table></div>,
      }}
    >{normalizeMathDelimiters(text)}</Markdown>
  </div>;
});

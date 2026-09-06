import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import AIMessage from './AIMessage';
import { normalizeMathDelimiters } from '@/lib/math-markdown';

const render = (text: string) => renderToStaticMarkup(<AIMessage text={text} />);

test('renders Markdown blocks, tables and code without changing citations', () => {
 const html = render('# Derivative\n\n**Power rule** [1]\n\n- First\n- Second\n\n| x | y |\n| - | - |\n| 1 | 2 |\n\n```js\nconst x = 2 < 3;\n```');
 for (const pattern of [/<h1>Derivative<\/h1>/, /<strong>Power rule<\/strong> \[1\]/, /<ul>/, /<table>/, /const x = 2 &lt; 3;/]) assert.match(html, pattern);
});

test('renders both dollar and backslash LaTeX delimiters with accessible MathML', () => {
 for (const text of ['$x^2$', String.raw`\(x^2\)`]) {
  const html = render(text);
  assert.match(html, /class="katex"/);
  assert.match(html, /<math/);
  assert.doesNotMatch(html, /katex-display/);
 }
 for (const text of ['$$\n\\frac{1}{2}\n$$', String.raw`\[\frac{1}{2}\]`]) assert.match(render(text), /katex-display/);
});

test('preserves literal TeX inside inline, fenced and indented code', () => {
 for (const text of ['`\\(x\\)`', '``code ` \\[x\\]``', '```tex\n\\[x\\]\n```', '~~~tex\n\\(x\\)\n~~~', '    \\[x\\]\n']) {
  assert.equal(normalizeMathDelimiters(text), text);
  assert.doesNotMatch(render(text), /class="katex/);
 }
 assert.equal(normalizeMathDelimiters(String.raw`Unclosed \(x`), String.raw`Unclosed \(x`);
});

test('does not execute raw HTML, unsafe links, images or trusted TeX commands', () => {
 const html = render('<script>alert(1)</script>\n\n<img src="x" onerror="alert(1)">\n\n[bad](javascript:alert%281%29)\n\n![tracking](https://example.com/pixel)\n\n$\\href{javascript:alert(1)}{click}$');
 assert.doesNotMatch(html, /<script|<img|onerror=|href="javascript:/);
 assert.match(html, /tracking/);
 assert.match(render('[Docs](https://example.com)'), /rel="noopener noreferrer"/);
});

test('malformed math remains visible instead of crashing the message', () => {
 const html = render('Before $\\notARealMathCommand{x}$ after.');
 assert.match(html, /Before/);
 assert.match(html, /notARealMathCommand/);
 assert.match(html, /after/);
});

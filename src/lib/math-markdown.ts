import { unified } from 'unified';
import remarkParse from 'remark-parse';

const parser = unified().use(remarkParse);
type Node = { type: string; position?: { start: { offset?: number }; end: { offset?: number } }; children?: Node[] };

/** Accept common AI LaTeX delimiters without rewriting code or link targets. */
export function normalizeMathDelimiters(source: string): string {
  const protectedRanges: [number, number][] = [];
  function visit(node: Node) {
    if (['code', 'inlineCode', 'html', 'link', 'image', 'definition'].includes(node.type)) {
      const start = node.position?.start.offset, end = node.position?.end.offset;
      if (start !== undefined && end !== undefined) protectedRanges.push([start, end]);
    } else node.children?.forEach(visit);
  }
  visit(parser.parse(source));
  function normalize(text: string) {
    return text.replace(/(?<!\\)\\\[([\s\S]*?)\\\]/g, (_, math: string) => `\n\n$$\n${math.trim()}\n$$\n\n`)
      .replace(/(?<!\\)\\\(([^\n]*?)\\\)/g, (_, math: string) => `$${math.trim()}$`);
  }
  let result = '', offset = 0;
  for (const [start, end] of protectedRanges) {
    result += normalize(source.slice(offset, start)) + source.slice(start, end);
    offset = end;
  }
  return result + normalize(source.slice(offset));
}

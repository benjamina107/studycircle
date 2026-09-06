import {CLASS_CHANNELS,type StudyChannel} from './channels';
export const MAX_FILE_BYTES = 25_000_000;
export const ACCEPT_FILES = '.pdf,.docx,.txt,.md,.jpg,.jpeg,.png,.webp,.mp3,.m4a,.wav,.ogg,.flac';
export type Card = { question: string; answer: string };
export type Source = { id: string; uploadId: string; name: string; locator: string };
export type AnswerPayload = { cards: Card[]; sources: Source[] };
export type Passage = { content: string; locator: string };
export type SearchPassage = Passage & { id: string; asset_id: string; score: number };
export function quizletText(cards: Card[]) {
  const clean = (s: string) => s.replace(/[\t\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
  return cards.map(c => `${clean(c.question)}\t${clean(c.answer)}`).join('\n');
}
export function splitPassages(parts: Passage[]): Passage[] {
  const output: Passage[] = [];
  for (const part of parts) {
    const text = part.content.replace(/\u0000/g, '').trim();
    for (let start = 0; start < text.length;) {
      let end = Math.min(start + 2200, text.length);
      if (end < text.length) { const boundary = text.lastIndexOf(' ', end); if (boundary > start + 1000) end = boundary; }
      output.push({ content: text.slice(start, end), locator: part.locator });
      if (end === text.length) break;
      start = Math.max(start + 1, end - 200);
    }
  }
  if (output.length > 250) throw new Error('This file is too long. Split it into smaller files.');
  return output.filter(p => p.content.trim());
}
function fingerprint(s: string) { return (s.toLowerCase().match(/[\p{L}\p{N}]+|[<>=+*/^-]/gu)||[]).join(' '); }
// Suppress near-duplicates, then round-robin sources so one document does not crowd out the rest.
export function diversePassages(rows: SearchPassage[], limit = 18): SearchPassage[] {
  const unique: SearchPassage[] = [];
  for (const row of [...rows].sort((a,b) => b.score-a.score)) {
    // Conservative normalization preserves negations, values and mathematical operators.
    // Similarity alone can hide a one-word contradiction in otherwise identical notes.
    if (!unique.some(prior => fingerprint(prior.content)===fingerprint(row.content))) unique.push(row);
  }
  const groups = new Map<string, SearchPassage[]>();
  for (const row of unique) groups.set(row.asset_id,[...(groups.get(row.asset_id)||[]),row]);
  const output: SearchPassage[]=[];
  while(output.length<limit && [...groups.values()].some(g=>g.length)) for(const group of groups.values()) { const row=group.shift(); if(row && output.length<limit) output.push(row); }
  return output;
}
export const hasMention = (text: string) => /(^|\s)@(?:circle[ \t]+ai|circleai|ai|classai)\b/i.test(text);
export const isChannel = (value: unknown): value is StudyChannel => value==='ai'||value==='meetups'||CLASS_CHANNELS.some(c=>c.id===value);

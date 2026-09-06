import { notFound } from 'next/navigation';
import AIMessage from '@/components/study/AIMessage';
import AppearanceSettings from '@/components/AppearanceSettings';
import styles from '@/components/study/Study.module.css';
import '../../(app)/workspace.css';

const sample = String.raw`## The quadratic formula

For **any quadratic** $ax^2 + bx + c = 0$, with $a \ne 0$:

\[
x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}
\]

1. Identify $a$, $b$, and $c$.
2. Calculate the discriminant, \(\Delta = b^2 - 4ac\).
3. Substitute and simplify. [1]

| Discriminant | Real solutions |
| --- | --- |
| $\Delta > 0$ | Two |
| $\Delta = 0$ | One repeated root |
| $\Delta < 0$ | None |

> Check your answer by substituting it into the original equation.

An inline code example: \`x = (-b + Math.sqrt(d)) / (2 * a)\`.

~~~python
# Code remains literal, including LaTeX delimiters.
formula = r"\(x^2\)"
~~~
`;

export default function MarkdownPreview() {
  if (process.env.NODE_ENV !== 'development') notFound();
  return <div className="workspace"><main className="group-content settings-page">
    <header className="page-heading"><h1>AI formatting preview</h1><p>Fictional content for checking Markdown and math rendering.</p></header>
    <AppearanceSettings />
    <section className="workspace-panel"><AIMessage text={sample.replaceAll('\\`', '`')} className={styles.markdown} /></section>
  </main></div>;
}

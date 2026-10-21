import type { ReactNode } from 'react'

const bullet = /^\s*([-*•]|\d+\.)\s+/
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, index) =>
    /^\*\*.+\*\*$/.test(part) ? <strong key={index}>{part.slice(2, -2)}</strong>
      : /^`.+`$/.test(part) ? <code key={index}>{part.slice(1, -1)}</code> : part)
}

// Subconjunto que usa el modelo: código, títulos, listas, **negrita** y `código`. Nunca HTML crudo.
export function Markdown({ text }: { text: string }) {
  const lines = text.split('\n')
  const blocks: ReactNode[] = []
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]
    if (line.trimStart().startsWith('```')) {
      const code: string[] = []
      while (++index < lines.length && !lines[index].trimStart().startsWith('```')) code.push(lines[index])
      blocks.push(<pre key={index}><code>{code.join('\n')}</code></pre>)
    } else if (bullet.test(line)) {
      const ordered = /^\s*\d/.test(line)
      const items: string[] = []
      for (; index < lines.length && bullet.test(lines[index]); index++) items.push(lines[index].replace(bullet, ''))
      index--
      const content = items.map((item, key) => <li key={key}>{inline(item)}</li>)
      blocks.push(ordered ? <ol key={index} start={parseInt(line)}>{content}</ol> : <ul key={index}>{content}</ul>)
    } else if (/^#{1,4}\s/.test(line)) blocks.push(<h4 key={index}>{inline(line.replace(/^#+\s/, ''))}</h4>)
    else if (line.trim()) blocks.push(<p key={index}>{inline(line)}</p>)
  }
  return <>{blocks}</>
}

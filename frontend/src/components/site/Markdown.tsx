import { Fragment, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

// **bold**, *italic*, [text](https://… or /internal-path). Anything else stays plain text.
const INLINE = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|\[[^\]]+\]\((?:https?:\/\/|\/)[^)\s]+\))/g
const LINK = /^\[([^\]]+)\]\(([^)\s]+)\)$/
const BULLET = /^\s*[-*]\s+/
const NUMBERED = /^\s*\d{1,2}[.)]\s+/

function inline(text: string): ReactNode[] {
  return text.split(INLINE).map((part, i) => {
    if (!part) return null
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>
    const link = LINK.exec(part)
    if (link) {
      const [, label, href] = link
      return href.startsWith('/') ? (
        <Link key={i} to={href}>
          {label}
        </Link>
      ) : (
        <a key={i} href={href} target="_blank" rel="noopener noreferrer">
          {label}
        </a>
      )
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) return <em key={i}>{part.slice(1, -1)}</em>
    return <Fragment key={i}>{part}</Fragment>
  })
}

/**
 * The small Markdown dialect used by articles: "## " / "### " headings, paragraphs, "- " and "1. "
 * lists, bold, italic and links. Rendered as React elements (never raw HTML), so content can't inject scripts.
 */
export function Markdown({ content, className = 'prose-clinic' }: { content: string; className?: string }) {
  return (
    <div className={className}>
      {content
        .trim()
        .split(/\n{2,}/)
        .map((block, i) => {
          const lines = block.split('\n').filter((l) => l.trim())
          if (lines[0]?.startsWith('## ') || lines[0]?.startsWith('### ')) {
            const [heading, ...rest] = lines
            const Tag = heading.startsWith('### ') ? 'h3' : 'h2'
            return (
              <Fragment key={i}>
                <Tag>{inline(heading.replace(/^#{2,3}\s+/, ''))}</Tag>
                {rest.length > 0 && <p>{inline(rest.join(' '))}</p>}
              </Fragment>
            )
          }
          if (lines.length && lines.every((l) => BULLET.test(l))) {
            return <ul key={i}>{lines.map((l, j) => <li key={j}>{inline(l.replace(BULLET, ''))}</li>)}</ul>
          }
          if (lines.length && lines.every((l) => NUMBERED.test(l))) {
            return <ol key={i}>{lines.map((l, j) => <li key={j}>{inline(l.replace(NUMBERED, ''))}</li>)}</ol>
          }
          return <p key={i}>{inline(lines.join(' '))}</p>
        })}
    </div>
  )
}

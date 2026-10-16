import { Fragment, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

/**
 * Renders the small Markdown subset the assistant uses (**bold**, "- " bullets,
 * paragraphs) and turns internal paths like /appointments into router links.
 * No HTML is ever injected, so model output cannot run scripts.
 */
const INLINE = /(\*\*[^*]+\*\*|\/(?:appointments|contact|doctors|about|services(?:\/(?:dental|skin|hair))?|blog(?:\/[a-z0-9-]+)?)\b)/g

function inline(text: string, onNavigate?: () => void): ReactNode[] {
  return text.split(INLINE).map((part, i) => {
    if (!part) return null
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>
    if (part.startsWith('/'))
      return (
        <Link key={i} to={part} onClick={onNavigate} className="font-medium text-brand-700 underline underline-offset-2">
          {part}
        </Link>
      )
    return <Fragment key={i}>{part}</Fragment>
  })
}

export function RichText({ text, onNavigate }: { text: string; onNavigate?: () => void }) {
  const blocks = text.trim().split(/\n{2,}/)
  return (
    <div className="space-y-2">
      {blocks.map((block, i) => {
        const lines = block.split('\n')
        const bullets = lines.filter((l) => /^\s*[-•*]\s+/.test(l))
        if (bullets.length && bullets.length === lines.filter((l) => l.trim()).length) {
          return (
            <ul key={i} className="list-disc space-y-1 pl-5 marker:text-brand-400">
              {bullets.map((l, j) => (
                <li key={j}>{inline(l.replace(/^\s*[-•*]\s+/, ''), onNavigate)}</li>
              ))}
            </ul>
          )
        }
        return (
          <p key={i}>
            {lines.map((l, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                {inline(l.replace(/^\s*[-•*]\s+/, '• '), onNavigate)}
              </Fragment>
            ))}
          </p>
        )
      })}
    </div>
  )
}

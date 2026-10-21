import { Fragment, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/utils/format'

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
    if (part.startsWith('/')) {
      const target = part === '/appointments' ? '/appointments#book' : part
      return (
        <Link
          key={i}
          to={target}
          onClick={() => {
            onNavigate?.()
            if (part === '/appointments') {
              setTimeout(() => {
                document.getElementById('book')?.scrollIntoView({ behavior: 'smooth' })
              }, 50)
            }
          }}
          className="font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-800"
        >
          {part}
        </Link>
      )
    }
    return <Fragment key={i}>{part}</Fragment>
  })
}

// "- item", "* item", "• item" or "1. step", optionally indented for a nested item.
const LIST_ITEM = /^(\s*)([-•*]|\d{1,2}[.)])\s+/

/** Split a block into runs of plain lines and list items, so "Intro:\n- a\n- b" keeps both. */
function runs(block: string): { list: boolean; lines: string[] }[] {
  const out: { list: boolean; lines: string[] }[] = []
  for (const line of block.split('\n').filter((l) => l.trim())) {
    const list = LIST_ITEM.test(line)
    const last = out[out.length - 1]
    if (last && last.list === list) last.lines.push(line)
    else out.push({ list, lines: [line] })
  }
  return out
}

export function RichText({ text, onNavigate }: { text: string; onNavigate?: () => void }) {
  const blocks = text.trim().split(/\n{2,}/)
  return (
    <div className="space-y-2">
      {blocks.flatMap((block, i) =>
        runs(block).map((run, r) =>
          run.list ? (
            <ul key={`${i}-${r}`} className="space-y-1">
              {run.lines.map((l, j) => {
                const [, indent, marker] = l.match(LIST_ITEM) ?? ['', '', '-']
                const numbered = /\d/.test(marker)
                return (
                  <li key={j} className={cn('flex gap-2', indent.length >= 2 && 'pl-5')}>
                    {numbered ? (
                      <span className="min-w-4 shrink-0 font-semibold text-brand-700">{marker}</span>
                    ) : (
                      <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-brand-400" aria-hidden="true" />
                    )}
                    <span className="min-w-0">{inline(l.replace(LIST_ITEM, ''), onNavigate)}</span>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p key={`${i}-${r}`}>
              {run.lines.map((l, j) => (
                <Fragment key={j}>
                  {j > 0 && <br />}
                  {inline(l, onNavigate)}
                </Fragment>
              ))}
            </p>
          ),
        ),
      )}
    </div>
  )
}

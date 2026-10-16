"""Post-generation checks and the no-LLM extractive answerer.

`is_grounded` is a cheap guard against the most damaging hallucinations in a
clinic setting: wrong numbers (times, prices, phone numbers, years) and doctor
names that were never retrieved. If an LLM answer mentions any number or
"Dr. ..." name that is not present in the retrieved context, we discard it and
fall back to quoting the context directly.
"""

import math
import re

from app.services.chatbot.retrieval import RetrievedChunk
from app.services.knowledge_base.embeddings import lexical_terms

_NUMBER_RE = re.compile(r"\d+(?:[.,:]\d+)*")
_DOCTOR_RE = re.compile(r"\bDr\.?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)")
_SENTENCE_SPLIT = re.compile(r"(?<=[.!?])(?<!Dr\.)\s+|\n+")


def _normalise_number(n: str) -> str:
    return n.replace(",", "").lstrip("0") or "0"


def is_grounded(answer: str, chunks: list[RetrievedChunk]) -> bool:
    context = "\n".join(c.content + " " + c.title for c in chunks)
    context_numbers = {_normalise_number(n) for n in _NUMBER_RE.findall(context)}
    # Also accept every individual numeric component (e.g. "9" from "9:00").
    context_numbers |= {_normalise_number(p) for n in _NUMBER_RE.findall(context) for p in re.split(r"[.,:]", n)}
    for number in _NUMBER_RE.findall(answer):
        if _normalise_number(number) not in context_numbers:
            return False
    for name in _DOCTOR_RE.findall(answer):
        if name not in context:
            return False
    return True


def _format_paragraph(paragraph: str, max_chars: int = 450) -> str:
    """Render "## Heading\\nBody" as "**Heading** — Body", trimmed at a sentence boundary."""
    lines = [line.strip() for line in paragraph.strip().splitlines() if line.strip()]
    heading = ""
    while lines and lines[0].startswith("#"):  # stacked headings: keep the most specific one
        heading = lines.pop(0).lstrip("#").strip()
    body = "\n".join(lines)
    if len(body) > max_chars:
        # Trim lists line by line and prose sentence by sentence, never mid-fact.
        is_list = any(line.startswith("- ") for line in lines)
        pieces = lines if is_list else _SENTENCE_SPLIT.split(body)
        kept: list[str] = []
        for piece in pieces:
            if sum(len(k) + 1 for k in kept) + len(piece) > max_chars:
                break
            kept.append(piece)
        body = ("\n" if is_list else " ").join(kept) or body[:max_chars]
    if heading and body:
        return f"**{heading}** — {body}"
    return heading or body


def extractive_answer(question: str, chunks: list[RetrievedChunk], max_paragraphs: int = 2) -> str:
    """Quote the retrieved paragraphs that best match the question. Never invents text.

    Whole paragraphs are used (a heading stays with its body) so a fact such as a
    price is never shown detached from the service it belongs to.
    """
    question_terms = set(lexical_terms(question))
    candidates: list[tuple[float, str]] = []
    seen: set[str] = set()
    for rank, chunk in enumerate(chunks[:5]):
        for position, paragraph in enumerate(chunk.content.split("\n\n")):
            paragraph = paragraph.strip()
            if len(paragraph) < 25 or paragraph in seen:
                continue
            seen.add(paragraph)
            first_line = paragraph.splitlines()[0]
            heading_terms = set(lexical_terms(first_line)) if first_line.startswith("#") else set()
            overlap = len(question_terms & set(lexical_terms(paragraph)))
            overlap += 0.5 * len(question_terms & heading_terms)  # a matching heading is a strong signal
            # Favour matching paragraphs, then higher-ranked chunks, then content earlier in the document.
            score = (
                overlap / math.sqrt(1 + len(question_terms))
                + chunk.similarity
                - rank * 0.05
                - chunk.chunk_index * 0.03
                - position * 0.01
            )
            candidates.append((score, paragraph))
    if not candidates:
        return chunks[0].content[:600]
    best = [p for _, p in sorted(candidates, key=lambda c: -c[0])[:max_paragraphs]]
    return "Here's what I found in the clinic's information:\n\n" + "\n\n".join(
        _format_paragraph(p) for p in best
    )

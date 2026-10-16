"""Split cleaned text into overlapping chunks that respect paragraph and sentence boundaries.

Strategy (a small "recursive" splitter):
1. Split into paragraphs; a Markdown heading is glued to the paragraph that follows it.
2. Paragraphs longer than `chunk_size` are split into sentences, and over-long
   sentences into word windows.
3. Units are packed greedily into chunks of at most ~`chunk_size` characters.
4. Each new chunk starts with the last ~`overlap` characters of the previous one,
   so a fact that straddles a boundary is still retrievable.
"""

import re

# Sentence boundary: after . ! ? (but not the "Dr." title) and before a capital/digit/quote.
_SENTENCE_RE = re.compile(r"(?<=[.!?])(?<!Dr\.)\s+(?=[A-Z0-9\"'(])")


def _split_long(unit: str, chunk_size: int) -> list[str]:
    """Split an over-long paragraph by lines, then sentences, then words."""
    if len(unit) <= chunk_size:
        return [unit]
    lines = unit.split("\n")
    if len(lines) > 1:
        # Keep list items whole; pack consecutive lines back together up to chunk_size.
        packed, current = [], ""
        for line in lines:
            for piece in _split_long(line, chunk_size):
                if current and len(current) + 1 + len(piece) > chunk_size:
                    packed.append(current)
                    current = piece
                else:
                    current = f"{current}\n{piece}" if current else piece
        if current:
            packed.append(current)
        return packed
    pieces: list[str] = []
    for sentence in _SENTENCE_RE.split(unit):
        if len(sentence) <= chunk_size:
            pieces.append(sentence)
            continue
        words, current = sentence.split(), ""
        for word in words:
            if current and len(current) + 1 + len(word) > chunk_size:
                pieces.append(current)
                current = word
            else:
                current = f"{current} {word}".strip()
        if current:
            pieces.append(current)
    return pieces


def _paragraphs(text: str) -> list[str]:
    paragraphs: list[str] = []
    pending_heading = ""
    for block in (b.strip() for b in text.split("\n\n")):
        if not block:
            continue
        if block.startswith("#") and "\n" not in block:
            pending_heading = f"{pending_heading}\n{block}".strip()
            continue
        if pending_heading:
            block = f"{pending_heading}\n{block}"
            pending_heading = ""
        paragraphs.append(block)
    if pending_heading:
        paragraphs.append(pending_heading)
    return paragraphs


def _overlap_tail(chunk: str, overlap: int) -> str:
    """The last whole sentences of `chunk` that fit in `overlap` characters."""
    if overlap <= 0 or len(chunk) <= overlap:
        return ""
    last_paragraph = chunk.rsplit("\n\n", 1)[-1]
    tail: list[str] = []
    for sentence in reversed(_SENTENCE_RE.split(last_paragraph)):
        if sum(len(s) + 1 for s in tail) + len(sentence) > overlap:
            break
        tail.insert(0, sentence)
    return " ".join(tail)


def chunk_text(text: str, chunk_size: int = 800, overlap: int = 150) -> list[str]:
    if chunk_size <= 0:
        raise ValueError("chunk_size must be positive")
    if not 0 <= overlap < chunk_size:
        raise ValueError("overlap must be between 0 and chunk_size")

    units: list[str] = []
    for paragraph in _paragraphs(text):
        units.extend(_split_long(paragraph, chunk_size))

    chunks: list[str] = []
    current = ""
    for unit in units:
        if not current:
            current = unit
        elif len(current) + 2 + len(unit) <= chunk_size:
            current = f"{current}\n\n{unit}"
        else:
            chunks.append(current)
            tail = _overlap_tail(current, overlap)
            # Keep the overlap as its own paragraph so it never merges into the next unit's text.
            current = f"{tail}\n\n{unit}" if tail and len(tail) + 2 + len(unit) <= chunk_size else unit
    if current:
        chunks.append(current)
    return [c.strip() for c in chunks if c.strip()]

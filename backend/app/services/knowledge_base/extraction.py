"""Text extraction and cleaning for uploaded knowledge documents (PDF, TXT, Markdown)."""

import io
import re
import unicodedata
from pathlib import Path

from pypdf import PdfReader
from pypdf.errors import PdfReadError

from app.core.exceptions import AppError

ALLOWED_EXTENSIONS = {".pdf", ".txt", ".md"}


class UnsupportedFileError(AppError):
    status_code = 415
    code = "unsupported_file"


class ExtractionError(AppError):
    status_code = 422
    code = "extraction_failed"


def extract_text(filename: str, data: bytes) -> str:
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise UnsupportedFileError("Only PDF, TXT and MD files are supported.")

    if ext == ".pdf":
        if not data.startswith(b"%PDF"):  # don't trust the extension alone
            raise UnsupportedFileError("The file is not a valid PDF.")
        text = _extract_pdf(data)
    else:
        if b"\x00" in data[:2048]:
            raise UnsupportedFileError("The file does not look like plain text.")
        try:
            text = data.decode("utf-8-sig")
        except UnicodeDecodeError:
            text = data.decode("latin-1")

    text = clean_text(text)
    if len(text) < 20:
        raise ExtractionError(
            "No readable text was found in this file. Scanned/image-only PDFs are not supported."
        )
    return text


def _extract_pdf(data: bytes) -> str:
    try:
        reader = PdfReader(io.BytesIO(data))
        if reader.is_encrypted:
            raise ExtractionError("Password-protected PDFs are not supported.")
        return "\n\n".join(page.extract_text() or "" for page in reader.pages)
    except PdfReadError as exc:
        raise ExtractionError("The PDF could not be read.") from exc


def clean_text(text: str) -> str:
    """Normalise unicode and whitespace while keeping paragraph breaks."""
    text = unicodedata.normalize("NFKC", text)
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    # Remove control characters except newline and tab.
    text = "".join(ch for ch in text if ch in "\n\t" or unicodedata.category(ch)[0] != "C")
    text = re.sub(r"(\w)-\n(\w)", r"\1\2", text)  # re-join words hyphenated across lines
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r" *\n *", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()

from pathlib import Path

def load_pdf(path: Path) -> str:
    import fitz
    with fitz.open(path) as doc:
        return "\n\n".join(page.get_text("text") for page in doc).strip()

def load_docx(path: Path) -> str:
    from docx import Document
    doc = Document(path)
    return "\n".join(para.text for para in doc.paragraphs if para.text.strip()).strip()

def load_txt(path: Path) -> str:
    return path.read_text(encoding="utf-8").strip()

def load_document(file_path: str | Path) -> tuple[str, str]:
    path = Path(file_path)
    ext = path.suffix.lower()
    source = path.name

    loaders = {
        ".pdf": load_pdf,
        ".docx": load_docx,
        ".doc": load_docx,
        ".txt": load_txt,
    }

    loader = loaders.get(ext)
    if loader is None:
        print(f"Skipping unsupported file: {path}")
        return "", ""

    text = loader(path)
    return text.strip(), source
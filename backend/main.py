"""PDF text extraction API for Access Ready."""

import fitz
import logging
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

if __package__:
    from .ai_analysis.analyzer import analyze
    from .ai_analysis.schemas import Analysis
else:  # Also support uvicorn main:app from backend/.
    from ai_analysis.analyzer import analyze
    from ai_analysis.schemas import Analysis

logger = logging.getLogger(__name__)


class Document(BaseModel):
    name: str
    pages: int


class Page(BaseModel):
    page: int
    text: str


class UploadResponse(BaseModel):
    document: Document
    pages: list[Page]


app = FastAPI(title="Access Ready API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/upload", response_model=UploadResponse)
def upload_pdf(file: UploadFile = File(...)) -> UploadResponse:
    return extract_pdf(file)


@app.post("/api/analyze", response_model=Analysis)
def analyze_pdf(file: UploadFile = File(...)) -> Analysis:
    source = extract_pdf(file)
    try:
        return analyze(source.model_dump())
    except Exception as exc:
        logger.exception("PDF analysis failed")
        raise HTTPException(
            status_code=502, detail="Document analysis failed. Please try again."
        ) from exc


def extract_pdf(file: UploadFile) -> UploadResponse:
    """Extract text in page order without saving the uploaded document."""
    try:
        if not file.filename or not file.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Please upload a PDF file (.pdf).")
        if file.content_type not in ("application/pdf", "application/octet-stream"):
            raise HTTPException(status_code=400, detail="The uploaded file must be a PDF.")

        contents = file.file.read()
        if not contents:
            raise HTTPException(status_code=400, detail="The uploaded file is empty.")
        if not contents.startswith(b"%PDF-"):
            raise HTTPException(status_code=400, detail="The uploaded file is not a valid PDF.")

        try:
            with fitz.open(stream=contents, filetype="pdf") as pdf:
                if pdf.needs_pass:
                    raise HTTPException(status_code=400, detail="Password-protected PDFs are not supported.")
                pages = [
                    Page(page=index + 1, text=page.get_text("text") or "")
                    for index, page in enumerate(pdf)
                ]
                return UploadResponse(
                    document=Document(name=file.filename, pages=len(pages)),
                    pages=pages,
                )
        except (fitz.FileDataError, RuntimeError, ValueError) as exc:
            raise HTTPException(
                status_code=400, detail="The PDF is malformed or its text could not be extracted."
            ) from exc
    finally:
        file.file.close()

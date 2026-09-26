# Access Ready backend

A small FastAPI API that extracts PDF text with PyMuPDF and passes it to the existing validated analyzer.
Requires Python 3.10 or newer. Run the commands below from `backend/`.

## Install and run

Windows PowerShell:

```powershell
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

macOS / Linux:

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

API: http://127.0.0.1:8000. Interactive API docs and upload form:
http://127.0.0.1:8000/docs. Stop the server with Ctrl+C.

## Endpoints

`GET /health` returns `{"status":"ok"}`.

`POST /api/upload` accepts one PDF in the multipart form field `file`:

```sh
curl -F "file=@lecture.pdf;type=application/pdf" http://127.0.0.1:8000/api/upload
```

In Windows PowerShell use `curl.exe` for this command.

Example response for a two-page PDF:

```json
{
  "document": { "name": "lecture.pdf", "pages": 2 },
  "pages": [
    { "page": 1, "text": "Lecture notes\n" },
    { "page": 2, "text": "" }
  ]
}
```

Page numbers start at 1 and preserve document order. Pages with no extractable
text return an empty string, including image-only pages. No OCR is performed.
Text is returned as extracted, without cleanup or layout reconstruction.

Uploads must have a `.pdf` filename, a PDF or generic binary content type,
and a PDF file signature. PyMuPDF then parses the content. Invalid, empty,
malformed, or password-protected PDFs return HTTP 400 with a `detail` message.
A missing `file` field returns FastAPI's HTTP 422 validation response.

## Local frontend access

CORS allows `http://localhost:5173`, `http://127.0.0.1:5173`,
`http://localhost:3000`, and `http://127.0.0.1:3000`. If the frontend runs
on another origin, add it to `allow_origins` in `main.py`.

```javascript
const form = new FormData();
form.append("file", selectedFile);
const response = await fetch("http://127.0.0.1:8000/api/upload", {
  method: "POST",
  body: form,
});
const result = await response.json();
if (!response.ok) throw new Error(JSON.stringify(result.detail));
```

Let the browser set the multipart `Content-Type` and boundary automatically.

This backend has no authentication, database, or external model calls by default.
Documents are read into memory for extraction and are not saved by the app.
This simple local demo does not impose an upload size limit; use modest PDFs.

## Analysis and integration tests

`POST /api/analyze` accepts the same multipart `file` as extraction and returns
validated `document`, `barriers`, and `concepts` from the existing analyzer.
Extraction errors remain HTTP 400; analysis/provider failures return HTTP 502.
There is no silent server-side switch to static sample content.

The analyzer currently defaults to its deterministic offline extractive provider.
Results come from the uploaded PDF, but this is not live semantic AI analysis.
It flags text density and creates short source excerpts and recall questions.
Image-only pages need OCR (not included); unsuitable text can yield zero concepts.
Visual layout barriers cannot be inferred from extracted text.

From the repository root, run the backend and tests using the existing environment:

```powershell
backend/.venv/Scripts/python.exe -m pip install -r backend/requirements-dev.txt
backend/.venv/Scripts/python.exe -m unittest backend.ai_analysis.test_analysis backend.test_api -v
backend/.venv/Scripts/python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

Start the frontend in another terminal with `cd frontend; npm run dev`.
Upload a PDF, review its returned barriers/concepts, then click Create Focus View.
Tests generate actual PDF bytes and exercise multipart extraction and analysis,
page references, blank pages, invalid/encrypted uploads, provider errors, and CORS.
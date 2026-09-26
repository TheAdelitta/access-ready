# Access Ready backend

A small FastAPI API that extracts text from uploaded PDFs using PyMuPDF.
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

This backend has no authentication, database, Azure services, or AI calls.
Documents are read into memory for extraction and are not saved by the app.
This simple local demo does not impose an upload size limit; use modest PDFs.

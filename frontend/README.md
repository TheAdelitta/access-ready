# Access Ready frontend

React, TypeScript, Vite, and Tailwind CSS.

## Run locally

Requires Node.js 20.19+ or 22.12+.

```sh
cd frontend
npm install
npm run dev
```

On Windows, use `npm.cmd` if PowerShell blocks `npm.ps1`.
Run the backend on `http://127.0.0.1:8000` (see `../backend/README.md`).
Use Vite's default port 5173, which is allowed by the backend CORS configuration.

Run `npm run build` for TypeScript checks and a production build.
To test that build against the backend, use `npm run preview -- --port 5173`.

## PDF analysis flow

Choose or drop a PDF (up to 25 MB). The frontend sends multipart field `file` to
`http://127.0.0.1:8000/api/analyze` and announces a loading state.
The analysis screen displays returned document metadata, barriers, and concepts.
Create Focus View uses those concepts for navigation, adjustable explanations,
quick checks, and original PDF page links. Empty results disable Focus View.

On API failure or a two-minute timeout, an error appears and the user can retry
by selecting the PDF again, or explicitly choose **Use demo fallback**.
Only that fallback uses `../demo/demo-response.json`. It is labeled as sample
content and clears the uploaded PDF preview so sample citations never point to
an unrelated upload. The sample PDF is not included; its preview is illustrative.

The backend's default analyzer is an offline extractive provider, not a live LLM.
PDFs are processed in backend memory without storage. Native PDF preview support
depends on the browser; scanned/image-only documents require OCR, not included.

The existing responsive design, keyboard focus, skip link, semantic controls,
feedback announcements, and native source dialog are retained.
Refreshing resets the session. No authentication, database, or chatbot.
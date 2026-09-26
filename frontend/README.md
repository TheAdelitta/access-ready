# Access Ready frontend

React, TypeScript, Vite, and Tailwind CSS. Frontend only.

## Run locally

Requires Node.js 20.19+ or 22.12+.

```sh
cd frontend
npm install
npm run dev
```

On Windows, use `npm.cmd` if PowerShell blocks `npm.ps1`.

Run `npm run build` for TypeScript checks and a production build, then `npm run preview` to preview it.

## Demo flow

Choose or drop a PDF (up to 25 MB), or try the sample. Review the barriers, create a Focus View, adjust detail, answer the optional Quick Check, and continue to completion. Source links return to the referenced page.

Concept content and the initial barrier come from `../demo/demo-response.json`. The frontend supplements the fixture with three sample barriers for a four-barrier demonstration. Numbered regions in the dense illustrative preview match the barrier cards: information density, bundled concepts, competing visuals, and weak hierarchy. These annotations apply only to the sample, not to uploaded PDFs. Uploaded PDFs are previewed locally using object URLs; content is not analyzed or transmitted. The sample PDF is not provided, so its preview is explicitly illustrative. Source links for uploaded PDFs use the mock page number, which may not correspond to the uploaded document. Native PDF preview support depends on the browser.

Includes responsive layouts, keyboard focus indicators, focus management, a skip link, semantic form controls, feedback announcements, and a native modal source preview. Refreshing resets the session; files are not persisted. No authentication, database, chatbot, or backend APIs.

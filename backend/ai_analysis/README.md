# AI analysis integration

Python 3.10+ and Pydantic 2. Install and run from the repository root:

```powershell
py -m pip install -r backend/ai_analysis/requirements.txt
py -m backend.ai_analysis.sample
py -m unittest backend.ai_analysis.test_analysis -v
```

Pass a different extracted PDF JSON file as the sample script's first argument.
JSON is printed to stdout; the validation result is printed to stderr.

```python
from backend.ai_analysis import analyze

result = analyze(extracted_pdf_json)
frontend_json = result.model_dump()
```

The default is an explicit, deterministic offline demo; no credentials or network
are needed. It extracts short verbatim passages, creates source-recall questions,
and flags pages with at least 150 words as a demo density heuristic. It does not
perform semantic concept detection. Pages without suitable excerpts yield no
concepts. The sample uses a subset of pages to demonstrate preserved page numbers.

For a live model, inject `StructuredModelProvider(request)` into `analyze`.
The callable receives `system`, `user`, and a strict `response_format` JSON schema
and must return the response's JSON text. A vendor adapter must forward the schema
to a model supporting structured output and handle transport/refusal responses.
No vendor SDK or API integration is included; this is the no-key provider boundary.
Model failures and invalid responses raise errors, never silently switch to demo.

Pydantic rejects extra fields, invalid types, invalid answer indices, duplicate IDs,
and invalid page references. The analyzer also checks original metadata and requires
citations to nonempty supplied pages. The prompt requires source-grounded claims
and treats document instructions as untrusted data. Schema validation cannot prove
semantic truth; live output still needs grounding evaluation before production.

All four barrier types exist in the schema. Text-only analysis allows
`high_information_density` and `multiple_concepts`; `competing_visuals` and
`weak_hierarchy` require layout evidence that this extraction contract does not
provide, so the analyzer rejects them. Nothing assesses or diagnoses users.
No PDF extraction, endpoints, chatbot, authentication, or database is added.

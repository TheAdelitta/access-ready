from .providers import AnalysisProvider, DemoProvider
from .schemas import Analysis, ExtractedDocument


def analyze(payload: dict | ExtractedDocument,
            provider: AnalysisProvider | None = None) -> Analysis:
    """Validate extraction, generate structured JSON, then validate references.

    Defaults explicitly to the offline demo. Pass a provider to enable live analysis.
    """
    source = ExtractedDocument.model_validate(payload)
    result = Analysis.model_validate_json(
        (provider if provider is not None else DemoProvider()).generate(
            source, Analysis.model_json_schema()))
    if result.document != source.document:
        raise ValueError('Provider changed document metadata')
    available = {p.page for p in source.pages if p.text.strip()}
    references = [b.page for b in result.barriers] + [c.sourcePage for c in result.concepts]
    if any(p not in available for p in references):
        raise ValueError('Provider cited an absent or empty source page')
    if any(b.type in {'competing_visuals', 'weak_hierarchy'} for b in result.barriers):
        raise ValueError('Visual layout barriers cannot be established from this text-only input')
    return result

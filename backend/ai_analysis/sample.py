"""Run from repository root: py -m backend.ai_analysis.sample [extracted.json]."""
import json
from pathlib import Path
import sys

from . import Analysis, analyze


def main():
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else (
        Path(__file__).resolve().parents[2] / 'demo' / 'extracted-pages.json')
    result = analyze(json.loads(path.read_text(encoding='utf-8')))
    output = result.model_dump_json(indent=2)
    Analysis.model_validate_json(output)
    print(output)
    print('PASS: demo analysis validated against the Pydantic schema.', file=sys.stderr)


if __name__ == '__main__':
    main()

"""Exercise multipart uploads with real, in-memory PDF documents."""
import unittest
from unittest.mock import patch

import fitz
from fastapi.testclient import TestClient

from backend.main import app
from backend.ai_analysis.schemas import Analysis


def make_pdf(texts, encrypted=False):
    with fitz.open() as pdf:
        for text in texts:
            page = pdf.new_page()
            page.insert_textbox(page.rect + (40, 40, -40, -40), text, fontsize=10)
        if encrypted:
            return pdf.tobytes(encryption=fitz.PDF_ENCRYPT_AES_256, owner_pw="owner", user_pw="secret")
        return pdf.tobytes()


class ApiTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def upload(self, data, endpoint="/api/analyze", name="biology.pdf", mime="application/pdf"):
        return self.client.post(endpoint, files={"file": (name, data, mime)})

    def test_pdf_to_validated_analysis(self):
        first = "Plants absorb sunlight to produce chemical energy."
        second = "Roots absorb water and minerals from the soil."
        data = make_pdf([first + "\n" + "This page describes how plants obtain energy. " * 25, second])
        raw = self.upload(data, "/api/upload")
        self.assertEqual(raw.status_code, 200)
        self.assertEqual([p["page"] for p in raw.json()["pages"]], [1, 2])
        response = self.upload(data)
        self.assertEqual(response.status_code, 200, response.text)
        result = Analysis.model_validate(response.json())
        self.assertEqual(result.document.name, "biology.pdf")
        self.assertEqual(result.document.pages, 2)
        self.assertEqual([c.sourcePage for c in result.concepts], [1, 2])
        self.assertEqual(result.concepts[0].essential, [first])
        self.assertEqual(result.concepts[1].essential, [second])
        self.assertEqual(result.barriers[0].page, 1)
        for concept in result.concepts:
            self.assertIn(concept.quickCheck.choices[concept.quickCheck.correct],
                          raw.json()["pages"][concept.sourcePage - 1]["text"])

    def test_empty_page_has_no_invented_concepts(self):
        response = self.upload(make_pdf([""]))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["concepts"], [])
        self.assertEqual(response.json()["barriers"], [])

    def test_invalid_uploads_preserve_errors(self):
        valid = make_pdf(["A source statement about biology."])
        cases = [(b"", "empty.pdf", "application/pdf"),
                 (b"not a PDF", "fake.pdf", "application/pdf"),
                 (b"%PDF-broken", "broken.pdf", "application/pdf"),
                 (valid, "notes.txt", "application/pdf"),
                 (valid, "notes.pdf", "text/plain"),
                 (make_pdf(["Private notes"], encrypted=True), "locked.pdf", "application/pdf")]
        for endpoint in ("/api/upload", "/api/analyze"):
            for data, name, mime in cases:
                with self.subTest(endpoint=endpoint, name=name, mime=mime):
                    response = self.upload(data, endpoint, name, mime)
                    self.assertEqual(response.status_code, 400, response.text)
            self.assertEqual(self.client.post(endpoint).status_code, 422)

    def test_analysis_failure_is_not_silently_demo(self):
        with patch("backend.main.analyze", side_effect=ValueError("invalid provider output")):
            with self.assertLogs("backend.main", level="ERROR"):
                response = self.upload(make_pdf(["A source statement about biology."]))
        self.assertEqual(response.status_code, 502)
        self.assertNotIn("concepts", response.json())

    def test_frontend_cors(self):
        response = self.client.options("/api/analyze", headers={
            "Origin": "http://127.0.0.1:5173", "Access-Control-Request-Method": "POST"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers["access-control-allow-origin"], "http://127.0.0.1:5173")


if __name__ == "__main__":
    unittest.main()

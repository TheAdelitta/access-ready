import copy
import json
import unittest

from pydantic import ValidationError

from . import Analysis, StructuredModelProvider, analyze


class AnalysisTests(unittest.TestCase):
    def setUp(self):
        self.payload = {'document': {'name': 'lecture.pdf', 'pages': 21},
                        'pages': [{'page': 7, 'text':
                                   'The OS transforms physical resources into virtual forms.'}]}

    def test_demo_is_deterministic_and_preserves_source(self):
        result = analyze(self.payload)
        self.assertEqual(result, analyze(self.payload))
        self.assertEqual(result.concepts[0].sourcePage, 7)
        self.assertEqual(result.concepts[0].essential[0], self.payload['pages'][0]['text'])
        self.assertEqual(result, Analysis.model_validate_json(result.model_dump_json()))

    def test_empty_pages(self):
        self.payload['pages'][0]['text'] = '  '
        self.assertEqual(analyze(self.payload).concepts, [])
        self.payload['pages'] = []
        self.assertEqual(analyze(self.payload).barriers, [])

    def test_duplicate_and_out_of_range_input(self):
        self.payload['pages'].append(copy.deepcopy(self.payload['pages'][0]))
        with self.assertRaises(ValidationError):
            analyze(self.payload)
        self.payload['pages'] = [{'page': 22, 'text': 'Example'}]
        with self.assertRaises(ValidationError):
            analyze(self.payload)

    def test_text_density(self):
        self.payload['pages'][0]['text'] = 'A source statement about resources. ' * 30
        result = analyze(self.payload)
        self.assertEqual(result.barriers[0].type, 'high_information_density')
        self.assertEqual(result.barriers[0].page, 7)

    def test_structured_request(self):
        expected = analyze(self.payload)

        def request(**kwargs):
            fmt = kwargs['response_format']
            self.assertEqual(fmt['type'], 'json_schema')
            self.assertTrue(fmt['json_schema']['strict'])
            self.assertFalse(fmt['json_schema']['schema']['additionalProperties'])
            self.assertEqual(json.loads(kwargs['user']), self.payload)
            return expected.model_dump_json()

        self.assertEqual(analyze(self.payload, StructuredModelProvider(request)), expected)

    def test_invalid_provider_output_rejected(self):
        original = analyze(self.payload).model_dump()
        for case in ('metadata', 'missing_page', 'correct_index', 'extra_field',
                     'duplicate_id', 'visual_barrier', 'bad_json'):
            with self.subTest(case=case):
                data = copy.deepcopy(original)
                if case == 'metadata':
                    data['document']['name'] = 'other.pdf'
                elif case == 'missing_page':
                    data['concepts'][0]['sourcePage'] = 3
                elif case == 'correct_index':
                    data['concepts'][0]['quickCheck']['correct'] = 3
                elif case == 'extra_field':
                    data['diagnosis'] = 'unsupported'
                elif case == 'duplicate_id':
                    data['concepts'].append(copy.deepcopy(data['concepts'][0]))
                elif case == 'visual_barrier':
                    data['barriers'] = [{'page': 7, 'type': 'competing_visuals',
                                         'label': 'Visuals', 'reason': 'Unsupported'}]
                raw = 'not JSON' if case == 'bad_json' else json.dumps(data)
                with self.assertRaises(ValueError):
                    analyze(self.payload, StructuredModelProvider(lambda **kwargs: raw))


if __name__ == '__main__':
    unittest.main()

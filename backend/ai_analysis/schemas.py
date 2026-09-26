"""Validated backend extraction and frontend Focus View contracts."""
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

Text = Annotated[str, Field(min_length=1, strict=True)]
PageNumber = Annotated[int, Field(ge=1, strict=True)]
BarrierType = Literal['high_information_density', 'multiple_concepts',
                      'competing_visuals', 'weak_hierarchy']


class Model(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)


class Document(Model):
    name: Text
    pages: Annotated[int, Field(ge=0, strict=True)]


class Page(Model):
    page: PageNumber
    text: str


class ExtractedDocument(Model):
    document: Document
    pages: list[Page]

    @model_validator(mode='after')
    def check_pages(self):
        numbers = [p.page for p in self.pages]
        if len(numbers) != len(set(numbers)):
            raise ValueError('Duplicate source page numbers')
        if any(n > self.document.pages for n in numbers):
            raise ValueError('Source page exceeds document page count')
        return self


class Barrier(Model):
    page: PageNumber
    type: BarrierType
    label: Text
    reason: Text


class QuickCheck(Model):
    question: Text
    choices: Annotated[list[Text], Field(min_length=3, max_length=3)]
    correct: Annotated[int, Field(ge=0, le=2, strict=True)]

    @model_validator(mode='after')
    def distinct_choices(self):
        if len(set(self.choices)) != len(self.choices):
            raise ValueError('Quick check choices must be distinct')
        return self


class Concept(Model):
    id: PageNumber
    title: Annotated[str, Field(min_length=1, max_length=120)]
    subtitle: Text
    essential: Annotated[list[Text], Field(min_length=1, max_length=3)]
    keyIdea: Text
    expandedExplanation: Text
    sourcePage: PageNumber
    quickCheck: QuickCheck


class Analysis(Model):
    document: Document
    barriers: list[Barrier]
    concepts: list[Concept]

    @model_validator(mode='after')
    def check_references(self):
        ids = [c.id for c in self.concepts]
        if len(ids) != len(set(ids)):
            raise ValueError('Concept IDs must be unique')
        numbers = [b.page for b in self.barriers] + [c.sourcePage for c in self.concepts]
        if any(n > self.document.pages for n in numbers):
            raise ValueError('Output page exceeds document page count')
        return self

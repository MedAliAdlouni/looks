"""Document processing services."""

from app.services.documents.extraction.dispatcher import (
    get_file_type,
    is_text_processable,
    is_media_file,
    is_image_file,
    extract_text_from_file,
)
from app.services.documents.viewers.docx_html import convert_docx_to_html
from app.services.documents.viewers.pptx_slides import extract_pptx_slides

__all__ = [
    "get_file_type",
    "is_text_processable",
    "is_media_file",
    "is_image_file",
    "extract_text_from_file",
    "convert_docx_to_html",
    "extract_pptx_slides",
]

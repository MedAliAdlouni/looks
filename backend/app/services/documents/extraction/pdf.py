"""PDF text extraction."""

import fitz  # PyMuPDF
from typing import List, Dict
import logging

logger = logging.getLogger(__name__)


def extract_text_from_pdf(file_path: str) -> List[Dict]:
    """
    Extract text from PDF file, returning text per page.

    Args:
        file_path: Path to the PDF file

    Returns:
        List of dictionaries with page_number and text keys

    Raises:
        Exception: If PDF cannot be opened or processed
    """
    try:
        doc = fitz.open(file_path)
        pages = []

        for page_num in range(len(doc)):
            page = doc[page_num]
            text = page.get_text()

            pages.append(
                {
                    "page_number": page_num + 1,  # 1-indexed
                    "text": text,
                }
            )

        doc.close()
        return pages

    except Exception as e:
        logger.error(f"Error extracting text from PDF {file_path}: {str(e)}")
        raise Exception(f"Failed to extract text from PDF: {str(e)}")


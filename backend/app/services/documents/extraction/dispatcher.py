"""
File type detection and extraction routing.
Pure routing logic - delegates to specific extractors.
"""

import mimetypes
import os
from typing import List, Dict
import logging

logger = logging.getLogger(__name__)


def get_file_type(filename: str) -> tuple[str, str]:
    """
    Determine file type and MIME type from filename.
    
    Args:
        filename: Name of the file
        
    Returns:
        Tuple of (file_type, mime_type)
    """
    ext = os.path.splitext(filename)[1].lower()
    
    # Map extensions to file types and MIME types
    type_map = {
        '.pdf': ('pdf', 'application/pdf'),
        '.docx': ('docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
        '.doc': ('doc', 'application/msword'),
        '.pptx': ('pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'),
        '.ppt': ('ppt', 'application/vnd.ms-powerpoint'),
        '.txt': ('txt', 'text/plain'),
        '.rtf': ('rtf', 'application/rtf'),
        '.csv': ('csv', 'text/csv'),
        '.xlsx': ('xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
        '.xls': ('xls', 'application/vnd.ms-excel'),
        '.mp3': ('mp3', 'audio/mpeg'),
        '.wav': ('wav', 'audio/wav'),
        '.mp4': ('mp4', 'video/mp4'),
        '.webm': ('webm', 'video/webm'),
        '.png': ('png', 'image/png'),
        '.jpg': ('jpg', 'image/jpeg'),
        '.jpeg': ('jpeg', 'image/jpeg'),
        '.svg': ('svg', 'image/svg+xml'),
    }
    
    file_type, mime_type = type_map.get(ext, ('unknown', 'application/octet-stream'))
    
    # Fallback to mimetypes if not in our map
    if file_type == 'unknown':
        guessed_mime, _ = mimetypes.guess_type(filename)
        if guessed_mime:
            mime_type = guessed_mime
            # Extract file type from MIME type
            if '/' in guessed_mime:
                file_type = guessed_mime.split('/')[1].split('-')[-1]
    
    return file_type, mime_type


def is_text_processable(file_type: str) -> bool:
    """
    Check if a file type should be processed for text extraction and RAG.
    
    Args:
        file_type: File type string
        
    Returns:
        True if file should be processed for text extraction
    """
    text_processable = {'pdf', 'docx', 'doc', 'pptx', 'ppt', 'txt', 'rtf', 'csv', 'xlsx', 'xls'}
    return file_type in text_processable


def is_media_file(file_type: str) -> bool:
    """
    Check if a file is a media file (audio/video).
    
    Args:
        file_type: File type string
        
    Returns:
        True if file is a media file
    """
    media_types = {'mp3', 'wav', 'mp4', 'webm'}
    return file_type in media_types


def is_image_file(file_type: str) -> bool:
    """
    Check if a file is an image file.
    
    Args:
        file_type: File type string
        
    Returns:
        True if file is an image file
    """
    image_types = {'png', 'jpg', 'jpeg', 'svg'}
    return file_type in image_types


def extract_text_from_file(file_path: str, file_type: str) -> List[Dict]:
    """
    Extract text from various file formats.
    Routes to appropriate extractor based on file type.
    
    Args:
        file_path: Path to the file
        file_type: Type of the file (pdf, docx, pptx, etc.)
        
    Returns:
        List of dictionaries with page_number and text keys
        
    Raises:
        ValueError: If file type is unsupported
        Exception: If extraction fails
    """
    if file_type == 'pdf':
        from app.services.documents.extraction.pdf import extract_text_from_pdf
        return extract_text_from_pdf(file_path)
    elif file_type in ('docx', 'doc'):
        from app.services.documents.extraction.docx import extract_text_from_docx
        return extract_text_from_docx(file_path)
    elif file_type in ('pptx', 'ppt'):
        from app.services.documents.extraction.pptx import extract_text_from_pptx
        return extract_text_from_pptx(file_path)
    elif file_type == 'txt':
        # Simple text file - handle inline
        return _extract_text_from_txt(file_path)
    elif file_type == 'rtf':
        # Simple RTF file - handle inline
        return _extract_text_from_rtf(file_path)
    elif file_type == 'csv':
        from app.services.documents.extraction.tabular import extract_text_from_csv
        return extract_text_from_csv(file_path)
    elif file_type in ('xlsx', 'xls'):
        from app.services.documents.extraction.tabular import extract_text_from_xlsx
        return extract_text_from_xlsx(file_path)
    else:
        raise ValueError(f"Unsupported file type for text extraction: {file_type}")


def _extract_text_from_txt(file_path: str) -> List[Dict]:
    """Extract text from TXT file."""
    try:
        # Try different encodings
        encodings = ['utf-8', 'latin-1', 'cp1252', 'iso-8859-1']
        text = None
        
        for encoding in encodings:
            try:
                with open(file_path, 'r', encoding=encoding) as f:
                    text = f.read()
                break
            except UnicodeDecodeError:
                continue
        
        if text is None:
            # Last resort: read as binary and decode with errors='replace'
            with open(file_path, 'rb') as f:
                text = f.read().decode('utf-8', errors='replace')
        
        # Split into pages (every ~2000 characters)
        chars_per_page = 2000
        pages = []
        page_num = 1
        
        for i in range(0, len(text), chars_per_page):
            page_text = text[i:i + chars_per_page]
            pages.append({
                "page_number": page_num,
                "text": page_text
            })
            page_num += 1
        
        return pages if pages else [{"page_number": 1, "text": text or ""}]
        
    except Exception as e:
        logger.error(f"Error extracting text from TXT {file_path}: {str(e)}")
        raise Exception(f"Failed to extract text from TXT: {str(e)}")


def _extract_text_from_rtf(file_path: str) -> List[Dict]:
    """Extract text from RTF file."""
    try:
        import re
        
        with open(file_path, 'r', encoding='latin-1', errors='ignore') as f:
            rtf_content = f.read()
        
        # Simple RTF text extraction (removes RTF control codes)
        # This is a basic implementation - for production, consider using striprtf or similar
        text = re.sub(r'\\[a-z]+\d*\s?', '', rtf_content)
        text = re.sub(r'\{[^}]*\}', '', text)
        text = re.sub(r'\s+', ' ', text).strip()
        
        # Split into pages
        chars_per_page = 2000
        pages = []
        page_num = 1
        
        for i in range(0, len(text), chars_per_page):
            page_text = text[i:i + chars_per_page]
            pages.append({
                "page_number": page_num,
                "text": page_text
            })
            page_num += 1
        
        return pages if pages else [{"page_number": 1, "text": text or ""}]
        
    except Exception as e:
        logger.error(f"Error extracting text from RTF {file_path}: {str(e)}")
        raise Exception(f"Failed to extract text from RTF: {str(e)}")


"""
Text file viewer - simple text extraction for display.
"""

import os
import logging

logger = logging.getLogger(__name__)


def get_txt_content(file_path: str) -> str:
    """
    Read text content from a TXT file.
    
    Args:
        file_path: Path to the text file
        
    Returns:
        Text content as string
    """
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
        
        return text
        
    except Exception as e:
        logger.error(f"Error reading TXT file {file_path}: {str(e)}")
        raise Exception(f"Failed to read text file: {str(e)}")


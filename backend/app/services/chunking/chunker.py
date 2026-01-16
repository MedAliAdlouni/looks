"""
Pure chunking logic - no database dependencies.
Pure functions for text chunking and token estimation.
"""

from typing import List, Dict, Optional
import uuid
import tiktoken

# Initialize tokenizer once for efficiency
_TOKENIZER = tiktoken.get_encoding("cl100k_base")


def estimate_tokens(text: str) -> int:
    """
    Estimate token count using tiktoken (cl100k_base).
    
    Args:
        text: Text to estimate tokens for
        
    Returns:
        Estimated token count
    """
    return len(_TOKENIZER.encode(text))


def chunk_text_parent_child(
    pages: List[Dict],
    document_id: str,
    small_chunk_size: Optional[int] = None,
    parent_chunk_size: Optional[int] = None,
    overlap: Optional[int] = None
) -> tuple[List[Dict], List[Dict]]:
    """
    Simple chunking: one chunk per page.
    Returns (small_chunks, parent_chunks) where parent_chunks is empty for now.
    
    Args:
        pages: List of {page_number: int, text: str}
        document_id: UUID of the document
        small_chunk_size: Ignored (kept for compatibility)
        parent_chunk_size: Ignored (kept for compatibility)
        overlap: Ignored (kept for compatibility)
    
    Returns:
        Tuple of (small_chunks, parent_chunks)
    """
    small_chunks = []
    
    for chunk_index, page in enumerate(pages):
        page_text = page.get("text", "").strip()
        
        # Skip empty pages
        if not page_text:
            continue
        
        # Get and validate page_number - ALWAYS ensure it's a valid integer
        page_number = page.get("page_number")
        if page_number is None or not isinstance(page_number, int) or page_number < 1:
            page_number = chunk_index + 1  # Use index-based page number as fallback
        
        # Create chunk for this page
        chunk_id = str(uuid.uuid4())
        token_count = estimate_tokens(page_text)
        
        # Ensure page_number is definitely an integer (not None)
        final_page_number = int(page_number) if page_number is not None else (chunk_index + 1)
        if final_page_number < 1:
            final_page_number = chunk_index + 1
        
        small_chunks.append({
            "chunk_id": chunk_id,
            "document_id": document_id,
            "content": page_text,
            "page_number": final_page_number,
            "chunk_index": chunk_index,
            "token_count": token_count,
        })
    
    # Return empty parent_chunks for now
    return small_chunks, []


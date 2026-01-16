"""
Pure source formatting functions for chat responses.
No side effects, pure data transformation.
"""

from typing import List, Dict, Any


def format_sources_for_response(
    sources: List[Dict[str, Any]],
    document_map: Dict[str, str],
    chunk_map: Dict[str, str],
) -> List[Dict[str, Any]]:
    """
    Format sources for API response.
    
    Args:
        sources: Raw source list from RAG with keys:
                - page: int
                - chunk_id: str
                - similarity: float
                - document_id: str (optional)
                - text: str (optional, fallback)
        document_map: {document_id: filename}
        chunk_map: {chunk_id: content}
        
    Returns:
        List of formatted source dictionaries (Source schema objects)
    """
    from app.schemas.chat import Source
    
    return [
        Source(
            page=src["page"],
            chunk_id=src["chunk_id"],
            similarity=src["similarity"],
            document_id=src.get("document_id", ""),
            document_name=document_map.get(src.get("document_id", ""), "Unknown Document"),
            chunk_text=chunk_map.get(src.get("chunk_id", ""), src.get("text", "")),
        )
        for src in sources
    ]


def format_sources_for_db(
    sources: List[Dict[str, Any]],
    document_map: Dict[str, str],
    chunk_map: Dict[str, str],
) -> List[Dict[str, Any]]:
    """
    Format sources for database storage (JSONB).
    
    Args:
        sources: Raw source list from RAG with keys:
                - page: int
                - chunk_id: str
                - similarity: float
                - document_id: str (optional)
                - text: str (optional, fallback)
        document_map: {document_id: filename}
        chunk_map: {chunk_id: content}
        
    Returns:
        List of source dictionaries for DB storage
    """
    return [
        {
            "page": src["page"],
            "chunk_id": src["chunk_id"],
            "similarity": float(src["similarity"]),
            "document_id": src.get("document_id", ""),
            "document_name": document_map.get(src.get("document_id", ""), "Unknown Document"),
            "chunk_text": chunk_map.get(src.get("chunk_id", ""), src.get("text", "")),
        }
        for src in sources
    ]


"""
Pure source formatting functions for RAG.
No side effects, pure data transformation.
"""

from typing import Dict, List, Any


def format_sources(matches: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Format vector search matches into source dictionaries.
    
    Args:
        matches: List of match dictionaries from vector search with keys:
                 - text: str
                 - page: int
                 - chunk_id: str
                 - similarity: float
                 - document_id: str (optional)
    
    Returns:
        List of formatted source dictionaries with keys:
        - text: str
        - page: int
        - chunk_id: str
        - similarity: float
        - document_id: str
    """
    return [
        {
            "text": m["text"],
            "page": m["page"],
            "chunk_id": m["chunk_id"],
            "similarity": m["similarity"],
            "document_id": m.get("document_id", ""),
        }
        for m in matches
    ]


"""
Pure prompt construction functions for RAG.
No side effects, no external dependencies beyond config.
"""

from typing import Dict, List, Any
from app.config.ai import ai_config


def get_verbosity_instruction(verbosity: str) -> str:
    """Get verbosity instruction based on verbosity level."""
    verbosity_map = {
        "concise": "Be concise and brief - provide only essential information without extra details",
        "normal": "Provide a balanced response with adequate detail - explain concepts clearly but avoid unnecessary elaboration",
        "detailed": "Be thorough and comprehensive - explain concepts fully, provide context, examples, and detailed explanations",
    }
    return verbosity_map.get(verbosity, verbosity_map["normal"])


def build_prompt(sources: List[Dict[str, Any]], question: str, verbosity: str = "normal") -> str:
    """
    Build prompt for strict mode (only course material).
    
    Args:
        sources: List of source dictionaries with 'page' and 'text' keys
        question: User question
        verbosity: Verbosity level ("concise", "normal", "detailed")
        
    Returns:
        Formatted prompt string
    """
    context = "\n\n".join(
        f"[Page {s['page']}]\n{s['text']}"
        for s in sources
    )
    
    verbosity_instruction = get_verbosity_instruction(verbosity)

    return ai_config.RAG_PROMPT_TEMPLATE.format(
        context_str=context,
        question=question,
        verbosity_instruction=verbosity_instruction,
    )


def build_prompt_hybrid(sources: List[Dict[str, Any]], question: str, verbosity: str = "normal") -> str:
    """
    Build prompt for hybrid mode (course material + general knowledge).
    
    Args:
        sources: List of source dictionaries with 'page' and 'text' keys
        question: User question
        verbosity: Verbosity level ("concise", "normal", "detailed")
        
    Returns:
        Formatted prompt string
    """
    context = "\n\n".join(
        f"[Page {s['page']}]\n{s['text']}"
        for s in sources
    )
    
    verbosity_instruction = get_verbosity_instruction(verbosity)

    return ai_config.RAG_PROMPT_TEMPLATE_HYBRID.format(
        context_str=context,
        question=question,
        verbosity_instruction=verbosity_instruction,
    )

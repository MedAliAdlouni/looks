"""
RAG (Retrieval-Augmented Generation) pipeline.
Orchestrates embedding, retrieval, prompt building, and generation.
"""

from typing import Dict
import asyncio
import logging

from app.services.integrations.embeddings import create_embedding
from app.services.integrations.pinecone_store import query_vectors
from app.services.rag.prompts import build_prompt, build_prompt_hybrid
from app.services.rag.sources import format_sources
from app.services.integrations.gemini_client import generate_content
from app.config.services import service_config

logger = logging.getLogger(__name__)


async def answer_question(course_id: str, question: str, mode: str = "strict", verbosity: str = "normal") -> Dict:
    """
    Answer a question using a RAG pipeline.

    Args:
        course_id: UUID of the course
        question: User question
        mode: "strict" (only course material) or "hybrid" (course material + general knowledge)
        verbosity: "concise", "normal", or "detailed"

    Returns:
        {
            "answer": str,
            "sources": List[dict]
        }
    """
    try:
        # 1. Embed question
        question_embedding = await create_embedding(question)

        # 2. Retrieve relevant chunks
        matches = await query_vectors(
            vector=question_embedding,
            course_id=course_id,
            top_k=service_config.RAG_TOP_K,
        )

        if not matches:
            return {
                "answer": "I could not find relevant course material to answer this question.",
                "sources": [],
            }

        # 3. Build context
        sources = format_sources(matches)
        # Choose prompt template based on mode
        if mode == "hybrid":
            prompt = build_prompt_hybrid(sources, question, verbosity)
        else:
            prompt = build_prompt(sources, question, verbosity)

        # 4. Generate answer (Gemini is sync → run in executor with timeout)
        loop = asyncio.get_running_loop()
        # Set timeout to 30 seconds for generation (should be plenty)
        try:
            answer = await asyncio.wait_for(
                loop.run_in_executor(None, generate_content, prompt),
                timeout=30.0
            )
        except asyncio.TimeoutError:
            logger.error("Gemini API call timed out after 30 seconds")
            raise RuntimeError("AI response generation timed out. Please try again.")

        return {
            "answer": answer,
            "sources": sources,
        }

    except Exception as e:
        logger.exception("RAG pipeline failed")
        raise RuntimeError(f"Failed to answer question: {e}") from e


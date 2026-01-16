"""Tests for RAG service."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.services.rag import answer_question
from app.services.rag.sources import format_sources
from app.services.rag.prompts import build_prompt


@pytest.mark.asyncio
async def test_answer_question_with_sources():
    """Test RAG pipeline returns answer and properly formatted sources."""
    # Mock embedding service
    mock_embedding = [0.1] * 768
    
    # Mock vector service
    mock_matches = [
        {
            "chunk_id": "chunk-1",
            "similarity": 0.95,
            "page": 1,
            "text": "This is test content from page 1.",
            "document_id": "doc-1",
        },
        {
            "chunk_id": "chunk-2",
            "similarity": 0.88,
            "page": 2,
            "text": "This is test content from page 2.",
            "document_id": "doc-1",
        },
    ]
    
    # Mock Gemini response
    mock_gemini_response = MagicMock()
    mock_gemini_response.text = "This is a test answer based on the provided context."
    
    with patch("app.services.rag.pipeline.create_embedding", new_callable=AsyncMock) as mock_embed:
        with patch("app.services.rag.pipeline.query_vectors", new_callable=AsyncMock) as mock_query:
            with patch("app.services.rag.pipeline.generate_content") as mock_generate:
                mock_embed.return_value = mock_embedding
                mock_query.return_value = mock_matches
                mock_generate.return_value = "This is a test answer based on the provided context."
                
                result = await answer_question("course-123", "What is this about?", mode="strict")
                
                assert "answer" in result
                assert "sources" in result
                assert result["answer"] == "This is a test answer based on the provided context."
                assert len(result["sources"]) == 2
                assert result["sources"][0]["chunk_id"] == "chunk-1"
                assert result["sources"][0]["similarity"] == 0.95
                assert result["sources"][0]["page"] == 1
                assert result["sources"][0]["document_id"] == "doc-1"


@pytest.mark.asyncio
async def test_answer_question_no_sources():
    """Test RAG pipeline handles case when no sources are found."""
    mock_embedding = [0.1] * 768
    
    with patch("app.services.rag.pipeline.create_embedding", new_callable=AsyncMock) as mock_embed:
        with patch("app.services.rag.pipeline.query_vectors", new_callable=AsyncMock) as mock_query:
            mock_embed.return_value = mock_embedding
            mock_query.return_value = []  # No matches
            
            result = await answer_question("course-123", "What is this about?", mode="strict")
            
            assert "answer" in result
            assert "sources" in result
            assert "could not find relevant course material" in result["answer"].lower()
            assert result["sources"] == []


def test_format_sources():
    """Test source formatting preserves all required fields."""
    matches = [
        {
            "chunk_id": "chunk-1",
            "similarity": 0.95,
            "page": 1,
            "text": "Test content",
            "document_id": "doc-1",
        },
        {
            "chunk_id": "chunk-2",
            "similarity": 0.88,
            "page": 2,
            "text": "More test content",
            # Missing document_id (should default to empty string)
        },
    ]
    
    formatted = format_sources(matches)
    
    assert len(formatted) == 2
    assert formatted[0]["chunk_id"] == "chunk-1"
    assert formatted[0]["similarity"] == 0.95
    assert formatted[0]["page"] == 1
    assert formatted[0]["text"] == "Test content"
    assert formatted[0]["document_id"] == "doc-1"
    assert formatted[1]["document_id"] == ""  # Default for missing


def test_build_prompt_includes_context_and_question():
    """Test prompt building includes context and question."""
    sources = [
        {"page": 1, "text": "Context from page 1"},
        {"page": 2, "text": "Context from page 2"},
    ]
    
    prompt = build_prompt(sources, "What is this about?", verbosity="normal")
    
    assert "Context from page 1" in prompt
    assert "Context from page 2" in prompt
    assert "What is this about?" in prompt
    assert "[Page 1]" in prompt
    assert "[Page 2]" in prompt


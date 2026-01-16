"""Tests for chat endpoint citation handling."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User
from app.models.course import Course
from app.models.document import Document
from app.models.chunk import Chunk
import uuid


@pytest.mark.asyncio
async def test_chat_endpoint_fetches_source_metadata_efficiently():
    """Test that chat endpoint fetches document and chunk metadata in batch (not N+1)."""
    from app.services.chat.service import fetch_source_metadata
    
    # Create test data
    doc_id = uuid.uuid4()
    chunk_id_1 = uuid.uuid4()
    chunk_id_2 = uuid.uuid4()
    
    sources = [
        {
            "chunk_id": str(chunk_id_1),
            "document_id": str(doc_id),
            "page": 1,
            "similarity": 0.95,
        },
        {
            "chunk_id": str(chunk_id_2),
            "document_id": str(doc_id),
            "page": 2,
            "similarity": 0.88,
        },
    ]
    
    # Mock database session
    mock_db = MagicMock(spec=AsyncSession)
    
    # Mock document query result
    mock_doc = MagicMock(spec=Document)
    mock_doc.id = doc_id
    mock_doc.filename = "test_document.pdf"
    
    # Mock chunk query result
    mock_chunk_1 = MagicMock(spec=Chunk)
    mock_chunk_1.id = chunk_id_1
    mock_chunk_1.content = "Content from chunk 1"
    
    mock_chunk_2 = MagicMock(spec=Chunk)
    mock_chunk_2.id = chunk_id_2
    mock_chunk_2.content = "Content from chunk 2"
    
    # Setup mock execute results
    doc_result = MagicMock()
    doc_result.scalars.return_value.all.return_value = [mock_doc]
    
    chunk_result = MagicMock()
    chunk_result.scalars.return_value.all.return_value = [mock_chunk_1, mock_chunk_2]
    
    # Mock execute to return different results based on query
    async def mock_execute(query):
        # Check if querying documents or chunks
        if "documents" in str(query).lower() or "Document" in str(query):
            return doc_result
        elif "chunks" in str(query).lower() or "Chunk" in str(query):
            return chunk_result
        return MagicMock()
    
    mock_db.execute = AsyncMock(side_effect=mock_execute)
    
    # Call function
    document_map, chunk_map = await fetch_source_metadata(sources, mock_db)
    
    # Verify results
    assert str(doc_id) in document_map
    assert document_map[str(doc_id)] == "test_document.pdf"
    assert str(chunk_id_1) in chunk_map
    assert chunk_map[str(chunk_id_1)] == "Content from chunk 1"
    assert str(chunk_id_2) in chunk_map
    assert chunk_map[str(chunk_id_2)] == "Content from chunk 2"
    
    # Verify only 2 queries were made (one for documents, one for chunks)
    assert mock_db.execute.call_count == 2


def test_format_sources_for_response():
    """Test source formatting for API response includes all required fields."""
    from app.services.chat.sources import format_sources_for_response
    from app.schemas.chat import Source
    
    sources = [
        {
            "chunk_id": "chunk-1",
            "document_id": "doc-1",
            "page": 1,
            "similarity": 0.95,
        },
    ]
    
    document_map = {"doc-1": "test.pdf"}
    chunk_map = {"chunk-1": "Full chunk content here"}
    
    formatted = format_sources_for_response(sources, document_map, chunk_map)
    
    assert len(formatted) == 1
    assert isinstance(formatted[0], Source)
    source = formatted[0]
    assert source.chunk_id == "chunk-1"
    assert source.document_id == "doc-1"
    assert source.document_name == "test.pdf"
    assert source.chunk_text == "Full chunk content here"
    assert source.page == 1
    assert source.similarity == 0.95


def test_format_sources_for_response_missing_metadata():
    """Test source formatting handles missing document/chunk metadata gracefully."""
    from app.services.chat.sources import format_sources_for_response
    
    sources = [
        {
            "chunk_id": "chunk-1",
            "document_id": "doc-1",
            "page": 1,
            "similarity": 0.95,
            "text": "Fallback text",
        },
    ]
    
    # Empty maps (metadata not found)
    document_map = {}
    chunk_map = {}
    
    formatted = format_sources_for_response(sources, document_map, chunk_map)
    
    assert len(formatted) == 1
    source = formatted[0]
    assert source.document_name == "Unknown Document"
    assert source.chunk_text == "Fallback text"  # Falls back to "text" field


def test_format_sources_for_db():
    """Test source formatting for database storage."""
    from app.services.chat.sources import format_sources_for_db
    
    sources = [
        {
            "chunk_id": "chunk-1",
            "document_id": "doc-1",
            "page": 1,
            "similarity": 0.95,
        },
    ]
    
    document_map = {"doc-1": "test.pdf"}
    chunk_map = {"chunk-1": "Full chunk content"}
    
    formatted = format_sources_for_db(sources, document_map, chunk_map)
    
    assert len(formatted) == 1
    source = formatted[0]
    assert isinstance(source, dict)
    assert source["chunk_id"] == "chunk-1"
    assert source["document_id"] == "doc-1"
    assert source["document_name"] == "test.pdf"
    assert source["chunk_text"] == "Full chunk content"
    assert source["page"] == 1
    assert isinstance(source["similarity"], float)
    assert source["similarity"] == 0.95


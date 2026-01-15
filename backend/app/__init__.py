# Backend application package

"""FastAPI application entry point."""

import logging
import sys
import time
from fastapi import FastAPI, Request
from app.api import auth, courses, documents, chat, document_viewers, assessment

# Configure logging - but don't override uvicorn's configuration
# Only configure if logging hasn't been configured yet
if not logging.root.handlers:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

# Get logger for this module
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# Configure uvicorn access logger to ensure it shows requests
access_logger = logging.getLogger("uvicorn.access")
access_logger.setLevel(logging.INFO)
# Don't set propagate=False - let it use uvicorn's handlers

app = FastAPI(
    title="Curriculum-Aligned AI Tutor API",
    description="Backend API for the AI tutoring platform",
    version="1.0.0",
)

@app.on_event("startup")
async def startup_event():
    """Initialize application on startup."""
    logger.info("=" * 60)
    logger.info("FastAPI application started - Logging is configured!")
    logger.info("=" * 60)
    # Test that logging works
    print("=" * 60, file=sys.stderr, flush=True)
    print("STARTUP: Logging test - if you see this, stderr is working", file=sys.stderr, flush=True)
    print("=" * 60, file=sys.stderr, flush=True)
    
    # Initialize Pinecone index at startup to avoid first-request delay
    try:
        from app.services.vector_service import _initialize_index
        import asyncio
        # Run initialization in executor since it may have blocking calls
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, _initialize_index)
        logger.info("Pinecone index initialized successfully")
    except Exception as e:
        logger.warning(f"Failed to initialize Pinecone index at startup: {e}")
        logger.warning("Index will be initialized on first use")

# Middleware to log requests - MUST be before routers
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all incoming requests."""
    start_time = time.time()
    
    # Log request using our app logger
    logger.info(f"→ {request.method} {request.url.path}")
    
    response = await call_next(request)
    
    process_time = time.time() - start_time
    status_code = response.status_code
    
    # Log response
    logger.info(
        f"← {request.method} {request.url.path} - "
        f"Status: {status_code} - Time: {process_time:.3f}s"
    )
    
    return response

# Include routers
app.include_router(auth.router)
app.include_router(courses.router)
app.include_router(documents.router)
app.include_router(chat.router)
app.include_router(document_viewers.router)
app.include_router(assessment.router)


@app.get("/")
async def root():
    """Root endpoint."""
    logger.info("Root endpoint called")
    return {"message": "Curriculum-Aligned AI Tutor API"}


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    logger.info("Health check endpoint called")
    return {"status": "healthy"}

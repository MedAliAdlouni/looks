# Backend application package

"""FastAPI application entry point."""

import logging
import sys
import time
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from app.api import auth, courses, documents, chat, document_viewers, assessment
from app.config.api import api_config

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

# CORS configuration
# For production, set CORS_ORIGINS environment variable to your frontend URL(s)
# Example: CORS_ORIGINS='["https://your-frontend.onrender.com"]'
cors_origins = api_config.CORS_ORIGINS
# FastAPI doesn't allow credentials with "*" origin, so disable it when using "*"
# For authentication to work properly, set specific origins instead of "*"
use_wildcard = isinstance(cors_origins, list) and "*" in cors_origins

# Middleware to handle OPTIONS requests BEFORE routing (must be first)
@app.middleware("http")
async def handle_options_middleware(request: Request, call_next):
    """Handle OPTIONS requests for CORS preflight before routing."""
    if request.method == "OPTIONS":
        origin = request.headers.get("origin", "*")
        response = Response(status_code=200)
        
        # Determine allowed origin
        if "*" in cors_origins:
            allow_origin = "*"
        elif origin in cors_origins:
            allow_origin = origin
        elif cors_origins:
            allow_origin = cors_origins[0]
        else:
            allow_origin = "*"
        
        response.headers["Access-Control-Allow-Origin"] = allow_origin
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD"
        response.headers["Access-Control-Allow-Headers"] = "*"
        response.headers["Access-Control-Allow-Credentials"] = "true" if not use_wildcard else "false"
        response.headers["Access-Control-Max-Age"] = "3600"
        return response
    
    return await call_next(request)

# Add CORS middleware - MUST be before routers
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=not use_wildcard,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH", "HEAD"],
    allow_headers=["*"],
    expose_headers=["*"],
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
        from app.services.integrations.pinecone_store import init_index
        import asyncio
        # Run initialization in executor since it may have blocking calls
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(None, init_index)
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

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
    
    # Run database migrations
    try:
        from alembic.config import Config
        from alembic import context
        from sqlalchemy import pool
        from sqlalchemy.ext.asyncio import async_engine_from_config
        from app.config.database import db_config
        from app.db import Base
        import os
        
        # Get the path to alembic.ini (should be in the backend directory)
        alembic_ini_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "alembic.ini")
        
        if os.path.exists(alembic_ini_path):
            alembic_cfg = Config(alembic_ini_path)
            
            # Get database URL and convert to asyncpg format
            database_url = db_config.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")
            alembic_cfg.set_main_option("sqlalchemy.url", database_url)
            
            # Create async engine
            configuration = alembic_cfg.get_section(alembic_cfg.config_ini_section)
            engine = async_engine_from_config(
                configuration,
                prefix="sqlalchemy.",
                poolclass=pool.NullPool,
            )
            
            # Run migrations using async connection
            def do_run_migrations(connection):
                """Run migrations with connection (sync function for run_sync)."""
                # Set the config on context so it can find migration scripts
                context.config = alembic_cfg
                context.configure(
                    connection=connection,
                    target_metadata=Base.metadata,
                )
                with context.begin_transaction():
                    context.run_migrations()
            
            async with engine.begin() as connection:
                await connection.run_sync(do_run_migrations)
            
            await engine.dispose()
            logger.info("Database migrations completed successfully")
        else:
            logger.warning(f"Alembic config not found at {alembic_ini_path}, skipping migrations")
    except Exception as e:
        logger.error(f"Failed to run database migrations: {e}")
        import traceback
        logger.error(traceback.format_exc())
        logger.error("Application will continue, but database may not be up to date")
        # Don't fail startup - let the app run and handle errors at runtime
    
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

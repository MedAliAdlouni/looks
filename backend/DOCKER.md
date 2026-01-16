# Docker Setup Guide

This guide explains how to run the backend application using Docker Compose.

## Quick Start

1. Create a `.env` file in the `backend` directory (optional - defaults are provided)
2. Run: `docker-compose up --build`
3. Access the API at `http://localhost:8000`

## Environment Variables

All environment variables are optional and have defaults. Create a `.env` file in the `backend` directory to override them.

### Database Configuration

```env
# PostgreSQL database credentials
POSTGRES_USER=looks_user          # Default: looks_user
POSTGRES_PASSWORD=looks_password  # Default: looks_password
POSTGRES_DB=looks_db              # Default: looks_db
POSTGRES_PORT=5432                 # Default: 5432
```

### Backend Configuration

```env
# Backend port
BACKEND_PORT=8000                  # Default: 8000

# Database connection (automatically constructed from above)
# DATABASE_URL is built from POSTGRES_USER, POSTGRES_PASSWORD, and POSTGRES_DB

# Database logging
DB_ECHO=false                      # Default: false (set to true for SQL query logging)
```

### AI/ML API Keys

```env
# Required for AI features
GEMINI_API_KEY=your_gemini_api_key_here
PINECONE_API_KEY=your_pinecone_api_key_here
```

## Example .env File

```env
# Database
POSTGRES_USER=myuser
POSTGRES_PASSWORD=mysecurepassword
POSTGRES_DB=mydb

# Backend
BACKEND_PORT=8000
DB_ECHO=false

# AI Services
GEMINI_API_KEY=your_actual_key_here
PINECONE_API_KEY=your_actual_key_here
```

## Docker Compose Commands

```bash
# Start services
docker-compose up

# Start in detached mode (background)
docker-compose up -d

# Rebuild and start
docker-compose up --build

# Stop services
docker-compose down

# Stop and remove volumes (deletes database data)
docker-compose down -v

# View logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f backend
docker-compose logs -f db
```

## Services

- **backend**: FastAPI application (port 8000)
- **db**: PostgreSQL database (port 5432)

## Database Migrations

Database migrations run automatically when the backend container starts. The backend waits for the database to be healthy before running migrations.

## Data Persistence

Database data is persisted in a Docker volume named `postgres_data`. This means your data survives container restarts. To completely reset the database, use `docker-compose down -v`.

## Connecting to Database from Host

If you need to connect to the database from your host machine (e.g., using a database client), use:

```
Host: localhost
Port: 5432 (or your POSTGRES_PORT value)
Database: looks_db (or your POSTGRES_DB value)
Username: looks_user (or your POSTGRES_USER value)
Password: looks_password (or your POSTGRES_PASSWORD value)
```



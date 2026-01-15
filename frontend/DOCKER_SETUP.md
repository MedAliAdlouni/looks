# Frontend Docker Setup Guide

## Prerequisites

1. **Docker Desktop** must be installed and running
   - Download from: https://www.docker.com/products/docker-desktop/
   - Make sure Docker Desktop is running before proceeding

## Quick Start with Docker

### Option 1: Using Docker Compose (Recommended)

```bash
# Navigate to frontend directory
cd frontend

# Build and start the container
docker-compose up

# Or run in background
docker-compose up -d
```

The frontend will be available at `http://localhost:3000`

### Option 2: Using Docker Commands Directly

#### Step 1: Pull Node.js Image
```bash
docker pull node:24-alpine
```

#### Step 2: Install Dependencies (First Time Only)
```bash
# Run npm install in a container
docker run -it --rm \
  -v ${PWD}:/app \
  -w /app \
  node:24-alpine \
  npm install
```

#### Step 3: Start Development Server
```bash
# Start the dev server
docker run -it --rm \
  -v ${PWD}:/app \
  -w /app \
  -p 3000:3000 \
  node:24-alpine \
  npm run dev -- --host 0.0.0.0
```

**Note:** On Windows PowerShell, use `$PWD` instead of `${PWD}`:
```powershell
docker run -it --rm -v ${PWD}:/app -w /app -p 3000:3000 node:24-alpine npm run dev -- --host 0.0.0.0
```

## Verify Installation

After pulling the image, verify Node.js and npm:

```bash
docker run --rm node:24-alpine node -v
docker run --rm node:24-alpine npm -v
```

Should show:
- Node.js: v24.12.0 (or similar)
- npm: 11.6.2 (or similar)

## Important Notes

1. **Volume Mounting**: The `-v ${PWD}:/app` flag mounts your current directory into the container so changes are reflected
2. **Port Mapping**: The `-p 3000:3000` flag maps port 3000 from container to your host
3. **Hot Reload**: File changes should work with volume mounting, but may be slightly slower than native

## Troubleshooting

### Issue: "Cannot find module" errors
**Solution:** Make sure you ran `npm install` first (Step 2 above)

### Issue: Port already in use
**Solution:** Change the port mapping: `-p 3001:3000` (use port 3001 on your machine)

### Issue: File changes not reflected
**Solution:** 
- Make sure you're using volume mounting (`-v` flag)
- Check Docker Desktop file sharing settings
- Try restarting Docker Desktop

## Comparison: Docker vs Native Installation

| Aspect | Docker | Native Node.js |
|--------|--------|----------------|
| Setup Complexity | Medium | Easy |
| Performance | Slightly slower | Faster |
| Isolation | Complete | System-wide |
| File Watching | May be slower | Fast |
| Portability | High | Medium |

**Recommendation:** For development, native Node.js installation is simpler and faster. Docker is better for production deployments or if you prefer containerized environments.



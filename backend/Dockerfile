FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy uv project files
COPY pyproject.toml uv.lock ./

# Install Python dependencies using uv
RUN pip install --upgrade pip \
    && pip install uv

RUN uv sync

# Copy the application code
COPY . .

# Make start script executable
RUN chmod +x start.sh

# Expose port
EXPOSE 8000

# Run the application
CMD ["./start.sh"]
# OneCX Playwright E2E Docker Image
#
# One-shot container: runs Playwright tests, exits with test result code.
# Testcontainers mounts the output directory and captures logs automatically.
#
# Build:
#   docker build -f Dockerfile.workspace -t onecx-workspace-e2e:latest .
#

FROM mcr.microsoft.com/playwright:v1.59.1-noble

LABEL maintainer="OneCX Team"
LABEL description="E2E Tests für OneCX Workspace Management"

WORKDIR /app

# Environment defaults — BASE_URL is set at runtime by Testcontainers
ENV NODE_ENV=production
ENV USERNAME=onecx
ENV PASSWORD=onecx
ENV OUTPUT_DIR=/e2e-results
ENV CI=true

# Install dependencies
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci --include=dev; else npm install --include=dev; fi

# Copy test sources
COPY tsconfig.json playwright.config.ts env.ts ./
COPY harnesses/ ./harnesses/
COPY tests/ ./tests/

# Create output root directory. Subdirectories are created by Playwright/runtime as needed.
RUN mkdir -p /e2e-results

# Run tests directly — exit code propagates to Testcontainers
CMD ["npx", "playwright", "test"]

# Docker Setup Guide

## Overview

All services are now containerized using Docker Compose:

- **postgres** - PostgreSQL database
- **redis** - Redis for Bull queue
- **app** - Next.js development server (port 3000)
- **worker** - Bull queue worker process
- **queue-ui** - Bull Board monitoring UI (port 3001)

## Quick Start

### 1. Build and start all services:

```bash
docker-compose up --build
```

### 2. Run in background (detached mode):

```bash
docker-compose up -d
```

### 3. View logs:

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f app
docker-compose logs -f worker
docker-compose logs -f queue-ui
```

### 4. Stop all services:

```bash
docker-compose down
```

### 5. Stop and remove volumes (clean slate):

```bash
docker-compose down -v
```

## Database Migrations

Run Prisma migrations inside the container:

```bash
docker-compose exec app npx prisma migrate dev
```

## Prisma Studio

Access Prisma Studio:

```bash
docker-compose exec app npx prisma studio
```

Then visit: http://localhost:5555

## Environment Variables

The `.env.docker` file contains environment variables for Docker containers. Key differences from `.env`:

- `DATABASE_URL` uses `postgres` hostname (container name) instead of `localhost`
- `REDIS_URL` uses `redis` hostname (container name) instead of `localhost`

## Individual Service Management

Start specific services:

```bash
docker-compose up app
docker-compose up worker
docker-compose up queue-ui
```

Restart a service:

```bash
docker-compose restart app
docker-compose restart worker
```

## Development Workflow

The services are configured with volume mounts for hot-reload:

- Code changes will automatically reload the Next.js app
- Worker and queue-ui use `tsx watch` for auto-restart

## Accessing Services

- **Next.js App**: http://localhost:9000
- **Bull Board UI**: http://localhost:9001
- **PostgreSQL**: localhost:9432
- **Redis**: localhost:9379

Note: These ports are mapped to avoid conflicts with your local services. Inside the Docker network, services communicate on standard ports.

## Troubleshooting

### Rebuild containers after dependency changes:

```bash
docker-compose up --build
```

### Shell into a container:

```bash
docker-compose exec app sh
docker-compose exec worker sh
```

### Check container status:

```bash
docker-compose ps
```

### View resource usage:

```bash
docker-compose stats
```

## Notes

- All services are connected via the `locklock-network` bridge network
- Puppeteer dependencies (Chromium) are installed in the Docker image
- Node modules are cached in anonymous volumes for faster rebuilds
- Database and Redis data persist in named volumes

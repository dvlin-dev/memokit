# Memory SaaS Platform

A standalone Memory API service similar to [mem0.ai](https://mem0.ai), built with NestJS 11 + PostgreSQL + pgvector.

## Features

- **Memory Management** - Store and search semantic memories using vector embeddings
- **Entity Extraction** - Automatically extract entities from unstructured text
- **Relation Graphs** - Build knowledge graphs from entities and relationships
- **Multi-tenant API** - API key based data isolation for SaaS deployment
- **Subscription System** - Free, Hobby ($19/mo), and Enterprise (usage-based) tiers

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | NestJS 11, TypeScript |
| Database | PostgreSQL + pgvector |
| ORM | Prisma 7 |
| Cache | Redis |
| Queue | BullMQ |
| Auth | Better Auth |
| Frontend | React 19, Vite, Tailwind CSS 4 |
| UI | shadcn/ui |
| Payments | Creem.io |

## Project Structure

```
.
├── apps/
│   ├── server/      # NestJS API server
│   ├── console/     # User dashboard (React)
│   ├── admin/       # Admin panel (React)
│   └── www/         # Marketing site (React)
├── packages/
│   ├── ui/          # Shared UI components
│   └── shared-types/ # Shared TypeScript types
└── docs/            # Documentation
```

## Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev:server

# Start console app
pnpm dev:console
```

## License

MIT

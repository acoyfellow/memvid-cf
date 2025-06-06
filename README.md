# Memvid-CF with Alchemy

A Cloudflare-native implementation inspired by [Memvid](https://github.com/Olow304/memvid) - the revolutionary video-based AI memory library by Olow304. This project adapts the core concept of QR codes + semantic search for the Cloudflare Workers ecosystem.

> **Inspired by Memvid**: This project is inspired by [Olow304's Memvid](https://github.com/Olow304/memvid), which pioneered the concept of storing text chunks in video files with semantic search. We've adapted this innovative approach for Cloudflare's serverless platform.

## Features

- **QR Code Generation**: Generate QR codes and store them in R2 (inspired by Memvid's video encoding)
- **AI-Powered Semantic Search**: Use Cloudflare AI embeddings to find similar content
- **Infrastructure as Code**: Managed with Alchemy for reproducible deployments
- **Serverless & Scalable**: Built on Cloudflare Workers for global edge deployment
- **Beautiful Web UI**: Modern React-like interface using Hono JSX

## Quick Start

1. **Install dependencies:**
```bash
bun install
```

2. **Deploy infrastructure:**
```bash
bun run deploy
```

3. **Run locally:**
```bash
bun run dev
```

4. **Open your browser** to see the beautiful interface!

## How It Works

This project adapts Memvid's core innovation for the Cloudflare ecosystem:

1. **📝 Encode**: Users input text which gets converted to QR codes (like Memvid's video frames)
2. **🧠 AI Processing**: Cloudflare AI generates embeddings for semantic understanding
3. **🔍 Smart Search**: Find QR codes using natural language queries, not exact matches

## API Endpoints

### POST /encode
Encode text into a QR code and store with embedding:
```json
{
  "text": "Hello World",
  "id": "unique-id"
}
```

### POST /query
Query for similar content and return QR code:
```json
{
  "prompt": "search query"
}
```

## Deployment

Deploy the infrastructure and worker:
```bash
bun run deploy
```

This will:
- Create a D1 database for storing embeddings
- Create an R2 bucket for QR code storage
- Deploy the worker with proper bindings
- Generate a `wrangler.jsonc` for local development

## Local Development

After deployment, you can run locally:
```bash
bun run dev
```

## Environment Setup

Set up environment variables (optional):
```bash
export BRANCH_PREFIX="your-branch-name"  # Defaults to $USER
```

## Cleanup

To destroy all resources:
```bash
bun run destroy
```

## Architecture

- **Alchemy**: Infrastructure management and deployment
- **Hono**: Web framework with JSX support for beautiful UI
- **D1**: Database for storing text and embeddings
- **R2**: Object storage for QR codes
- **Cloudflare AI**: Embedding generation using BGE models

## Acknowledgments

This project is inspired by and pays homage to:

- **[Memvid](https://github.com/Olow304/memvid)** by [Olow304](https://github.com/Olow304) - The original revolutionary concept of video-based AI memory with semantic search
- **Cloudflare Workers** - For providing the serverless platform
- **Alchemy** - For infrastructure-as-code management

## License

MIT License - Built with inspiration from the open-source community. 
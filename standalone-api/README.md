# Standalone Miners API

A standalone Express.js API server for managing BIP38 miners, designed to work independently of Next.js and compatible with static hosting setups.

## Features

- **Database Integration**: PostgreSQL connection with connection pooling
- **Security**: Helmet, CORS, rate limiting, and input validation
- **Performance**: Connection pooling and optimized queries
- **Monitoring**: Health check endpoint and comprehensive error handling
- **Scalability**: Designed for production deployment

## API Endpoints

### Health Check
\`\`\`
GET /health
\`\`\`
Returns server health status and uptime.

### Active Miners
\`\`\`
GET /api/miners/active
\`\`\`
Returns count and details of currently running miners.

**Response:**
\`\`\`json
{
  "activeCount": 10,
  "workers": [
    {
      "id": 1,
      "name": "bip38cpu",
      "wallet_id": 1,
      "state": "running",
      "heartbeat": "2025-08-11T11:17:49.689Z"
    }
  ],
  "lastUpdated": "2025-08-11T11:20:30.123Z"
}
\`\`\`

### All Miners
\`\`\`
GET /api/miners/all
\`\`\`
Returns all miners with status summary.

### Update Miner Status
\`\`\`
PATCH /api/miners/:id/status
\`\`\`
Updates the status of a specific miner.

**Request Body:**
\`\`\`json
{
  "state": "running" // or "stopped", "error", "maintenance"
}
\`\`\`

## Installation

1. **Install Dependencies**
   \`\`\`bash
   cd standalone-api
   npm install
   \`\`\`

2. **Environment Setup**
   \`\`\`bash
   cp .env.example .env
   # Edit .env with your database credentials
   \`\`\`

3. **Development**
   \`\`\`bash
   npm run dev
   \`\`\`

4. **Production**
   \`\`\`bash
   npm start
   \`\`\`

## Deployment Options

### Docker Deployment
\`\`\`dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
\`\`\`

### PM2 Deployment
\`\`\`bash
npm install -g pm2
pm2 start server.js --name miners-api
pm2 startup
pm2 save
\`\`\`

### Vercel Serverless
\`\`\`json
{
  "functions": {
    "standalone-api/server.js": {
      "runtime": "@vercel/node"
    }
  },
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/standalone-api/server.js"
    }
  ]
}
\`\`\`

## Security Considerations

- Rate limiting (100 requests per 15 minutes per IP)
- CORS configuration for allowed origins
- Helmet.js for security headers
- Input validation and sanitization
- Environment variable protection
- Graceful shutdown handling

## Integration with Static Frontend

Update your static Next.js app to use the external API:

\`\`\`javascript
// In your static Next.js app
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const fetchActiveMiners = async () => {
  const response = await fetch(`${API_BASE_URL}/api/miners/active`);
  return response.json();
};
\`\`\`

## Environment Variables

- `DATABASE_URL`: PostgreSQL connection string
- `PORT`: Server port (default: 3001)
- `NODE_ENV`: Environment (development/production)
- `ALLOWED_ORIGINS`: Comma-separated list of allowed origins
- `API_KEY`: Optional API key for additional security

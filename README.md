# Influencia Backend API

A production-ready NestJS backend for the Influencia influencer marketing platform. Connects brands with creators using AI-powered matching.

![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)

## 🚀 Features

- **Authentication & Authorization**
  - JWT-based authentication with Redis session management
  - Role-based access control (Creator, Brand, Admin)
  - Multi-device session tracking with logout-all capability

- **Creator Management**
  - Profile creation and management
  - Social media account linking (Instagram, YouTube, TikTok)
  - Performance analytics and metrics tracking

- **Brand & Campaign Management**
  - Brand profile management
  - Campaign creation with targeting options
  - Budget and timeline management

- **AI-Powered Matching**
  - Integration with Python AI microservice
  - Smart creator recommendations for campaigns
  - Match scoring and analysis reports

- **Social Media Integration**
  - OAuth flows for Instagram, YouTube, TikTok
  - Automatic metrics synchronization
  - Engagement rate calculations

- **Payments & Analytics**
  - Payment tracking for collaborations
  - Creator earnings dashboard
  - Campaign performance analytics

## 📋 Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- Python AI Service (optional, for AI features)

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/suhelali14/influencia-backend.git
   cd influencia-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Run database migrations**
   ```bash
   node run-all-migrations.js
   ```

5. **Start the development server**
   ```bash
   npm run start:dev
   ```

## ⚙️ Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | ✅ |
| `REDIS_HOST` | Redis server host | ✅ |
| `REDIS_PORT` | Redis server port | ✅ |
| `REDIS_PASSWORD` | Redis password | ❌ |
| `JWT_SECRET` | JWT signing secret (32+ chars) | ✅ |
| `AI_SERVICE_URL` | Python AI service URL | ❌ |
| `GEMINI_API_KEY` | Google Gemini API key | ❌ |

## 📁 Project Structure

```
src/
├── auth/           # Authentication & authorization
├── brands/         # Brand management
├── campaigns/      # Campaign CRUD & management
├── creators/       # Creator profiles & management
├── matching/       # AI matching & collaboration
├── social/         # Social media integrations
├── payments/       # Payment processing
├── analytics/      # Analytics & reporting
├── common/         # Shared utilities, guards, filters
└── main.ts         # Application entry point
```

## 🔌 API Endpoints

### Authentication
- `POST /v1/auth/register` - Register new user
- `POST /v1/auth/login` - Login user
- `POST /v1/auth/logout` - Logout current session
- `GET /v1/auth/profile` - Get current user profile

### Creators
- `GET /v1/creators` - List all creators
- `GET /v1/creators/me` - Get current creator profile
- `POST /v1/creators` - Create creator profile
- `GET /v1/creators/search` - Search creators

### Campaigns
- `GET /v1/campaigns` - List campaigns
- `POST /v1/campaigns` - Create campaign
- `GET /v1/campaigns/:id` - Get campaign details
- `GET /v1/campaigns/active` - Get active campaigns

### Matching
- `GET /v1/matching/campaign/:id/creators` - Get matched creators
- `POST /v1/matching/campaign/:id/creator/:creatorId/request` - Send collaboration request

### Health
- `GET /v1/health` - Basic health check
- `GET /v1/health/detailed` - Detailed system health

## 🧪 Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## 🐳 Docker

```bash
# Build image
docker build -t influencia-backend .

# Run container
docker run -p 3000:3000 --env-file .env influencia-backend
```

## 📚 API Documentation

Swagger documentation available at `/api/docs` when running in development mode.

## 🤝 Related Repositories

- [influencia-frontend](https://github.com/suhelali14/influencia-frontend) - React Frontend
- [influencia-ai](https://github.com/suhelali14/influencia-ai) - AI Recommendation Service

## 📄 License

MIT License

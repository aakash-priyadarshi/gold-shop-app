# Gold Shop - Multi-Vendor Jewellery Marketplace

A comprehensive multi-vendor jewellery marketplace supporting both inventory sales and custom manufacturing via RFQ (Request for Quote) system. Initially targeting Nepal, with planned expansion to India.

## 🌟 Features

### For Customers
- **Browse Inventory**: Shop ready-made jewellery from verified local shops
- **Custom Orders (RFQ)**: Request custom jewellery with specific materials and design
- **Multi-Shop Quotes**: Receive competitive offers from multiple shops
- **Order Tracking**: Real-time tracking with manufacturing milestones
- **Multiple Payment Options**: eSewa, Khalti, Razorpay, COD

### For Shopkeepers
- **Shop Management**: Complete dashboard for managing inventory and orders
- **Custom Metal Rates**: Set shop-specific rates for different metals
- **RFQ Response**: Receive and respond to custom manufacturing requests
- **Order Management**: Track and update order status with milestones
- **Analytics**: Sales statistics and performance metrics

### Platform Features
- **4 Manufacturing Methods**: Support for diverse jewellery construction
- **Strict Material Classification**: Certified purity tracking
- **24-Hour Booking System**: Secure offer acceptance with deadline
- **Multi-Language Support**: English, Nepali, Hindi
- **Audit Trail**: Complete transaction history

## 🏗️ Architecture

```
gold-shop-app/
├── apps/
│   ├── api/                 # NestJS Backend API
│   │   ├── src/
│   │   │   ├── modules/     # Feature modules
│   │   │   │   ├── auth/    # Authentication & RBAC
│   │   │   │   ├── users/   # User management
│   │   │   │   ├── shops/   # Shop management
│   │   │   │   ├── inventory/# Ready-made items
│   │   │   │   ├── rfq/     # Custom order requests
│   │   │   │   ├── offers/  # RFQ responses
│   │   │   │   ├── orders/  # Order processing
│   │   │   │   ├── payments/# Payment gateway
│   │   │   │   ├── notifications/
│   │   │   │   ├── materials/# Reference data
│   │   │   │   ├── audit/   # Activity logging
│   │   │   │   ├── jobs/    # Background tasks
│   │   │   │   └── i18n/    # Internationalization
│   │   │   └── prisma/      # Database ORM
│   │   └── prisma/
│   │       ├── schema.prisma # Database schema
│   │       └── seed.ts      # Test data
│   │
│   └── web/                 # Next.js Frontend
│       └── src/
│           ├── app/         # App router pages
│           ├── components/  # UI components
│           ├── lib/         # Utilities & API client
│           └── hooks/       # Custom hooks
│
└── packages/
    └── shared/              # Shared types & validation
        └── src/
            ├── enums/       # Material & status enums
            ├── types/       # TypeScript types
            └── validation/  # Composition validators
```

## 🛠️ Tech Stack

### Backend
- **NestJS 10** - Node.js framework with TypeScript
- **PostgreSQL** - Primary database
- **Prisma ORM** - Database access & migrations
- **Redis + BullMQ** - Job queues & caching
- **Passport.js** - JWT authentication
- **Swagger** - API documentation

### Frontend
- **Next.js 14** - React framework with App Router
- **TailwindCSS** - Utility-first styling
- **Radix UI** - Headless UI components
- **React Query** - Data fetching & caching
- **Zustand** - State management
- **React Hook Form + Zod** - Form handling

## 📦 Manufacturing Methods

### Method A - Single Precious Metal
Pure precious metal construction (e.g., 22K gold ring)

### Method B - Precious + Base Metal
Precious metal with base metal components (e.g., gold ring with steel core)

### Method C - Precious + Plating
Base metal with precious metal plating (e.g., gold-plated brass)

### Method D - Multi-Metal
Multiple precious metals combined:
- **D1 (Layered)**: Distinct metal layers
- **D2 (Inlay)**: One metal inlaid into another
- **D3 (Fusion)**: Metals fused at molecular level

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- pnpm (recommended)

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/gold-shop-app.git
cd gold-shop-app
```

2. Install dependencies
```bash
pnpm install
```

3. Set up environment variables
```bash
# Backend
cp apps/api/.env.example apps/api/.env

# Frontend
cp apps/web/.env.example apps/web/.env
```

4. Set up the database
```bash
cd apps/api
pnpm prisma migrate dev
pnpm prisma db seed
```

5. Start development servers
```bash
# From root directory
pnpm dev
```

This starts:
- Backend API at http://localhost:4000
- Frontend at http://localhost:3000
- API Docs at http://localhost:4000/api/docs

### Test Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@goldshop.com | admin123 |
| Customer | customer@test.com | customer123 |
| Shopkeeper | rameshgold@test.com | shop123 |
| Shopkeeper | sunajewellers@test.com | shop123 |

## 📝 API Documentation

The API documentation is available at `/api/docs` when running the backend server.

### Key Endpoints

#### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh token

#### Inventory
- `GET /api/inventory` - Browse items
- `POST /api/inventory/shop/:shopId` - Add item (shopkeeper)
- `PATCH /api/inventory/:id` - Update item

#### RFQ (Custom Orders)
- `POST /api/rfq` - Create RFQ request
- `POST /api/rfq/:id/broadcast` - Broadcast to shops
- `GET /api/rfq/:id/offers` - Get offers
- `POST /api/rfq/:id/select-offer` - Accept offer

#### Orders
- `POST /api/orders/inventory` - Order from inventory
- `POST /api/orders/custom` - Create from RFQ
- `GET /api/orders/my-orders` - Customer orders
- `PATCH /api/orders/:id/status` - Update status

## 🔐 User Roles

| Role | Permissions |
|------|-------------|
| **Customer** | Browse, create RFQ, place orders, track orders |
| **Shopkeeper** | Manage shop, inventory, respond to RFQ, process orders |
| **Admin** | All permissions, user management, platform settings |
| **Support** | View orders, handle disputes, customer support |

## 🌐 Internationalization

Supported languages:
- English (en)
- Nepali (ne)
- Hindi (hi)

Translation files located in `apps/api/src/modules/i18n/locales/`

## 💳 Payment Integration

### Nepal
- **eSewa** - Digital wallet
- **Khalti** - Digital wallet
- **Bank Transfer**
- **Cash on Delivery**

### India (Phase 2)
- **Razorpay** - Cards, UPI, wallets
- **Cash on Delivery**

## 📊 Database Schema

Key entities:
- **User** - All user types with role
- **Shop** - Jeweller shops with capabilities
- **ShopMetalRate** - Shop-specific pricing
- **InventoryItem** - Ready-made jewellery
- **RfqRequest** - Custom order requests
- **RfqOffer** - Shop responses to RFQ
- **Order** - Both inventory and custom orders
- **OrderMilestone** - Manufacturing progress
- **Payment** - Transaction records
- **Notification** - User notifications
- **AuditLog** - Activity tracking

## 🧪 Testing

```bash
# Unit tests
pnpm test

# E2E tests
pnpm test:e2e

# Test coverage
pnpm test:cov
```

## 📈 Deployment

### Docker (Recommended)
```bash
docker-compose up -d
```

### Manual
```bash
# Build
pnpm build

# Start production
pnpm start:prod
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is proprietary software. All rights reserved.

## 📞 Support

- Email: support@goldshop.com.np
- Documentation: https://docs.goldshop.com.np

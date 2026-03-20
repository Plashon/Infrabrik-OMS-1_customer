# Infrabrik OMS 1 — Order Management System API

A RESTful API backend for managing orders, customers, products, and sales reporting.

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Language | TypeScript 5.9 |
| Runtime | Node.js |
| Framework | Express.js v5.1 |
| Database | MongoDB (Atlas) |
| ORM | Prisma v6.19 |
| Validation | Zod v4.1 |
| Dev Runner | ts-node-dev |

---

## System Architecture

```
src/
├── index.ts                    # App entry point, route registration
├── prisma/
│   └── client.ts               # Prisma singleton client
├── customer/                   # Customer module
│   ├── customer.routes.ts
│   ├── customer.controller.ts
│   └── customer.validator.ts
├── addresses/                  # Address module
│   ├── addresses.routes.ts
│   └── addresses.controller.ts
├── category/                   # Category module
│   ├── category.routes.ts
│   ├── category.controller.ts
│   └── category.validator.ts
├── products/                   # Product module
│   ├── product.routes.ts
│   ├── product.controller.ts
│   └── product.validator.ts
├── productSet/                 # Product Set module
│   ├── productSet.routes.ts
│   ├── productSet.controller.ts
│   └── productSet.validator.ts
├── productSetItem/             # Product Set Item module
│   ├── productSetItem.routes.ts
│   ├── productSetItem.controller.ts
│   └── pruductSetItem.validator.ts
├── order/                      # Order module
│   ├── order.routes.ts
│   ├── order.controller.ts
│   └── order.validator.ts
└── utils/
    └── orderNumberGenerator.ts # Auto order number: ORD-YYYYMM-NNNN
```

### Pattern
Each module follows an **MVC** structure: `routes → controller → validator (Zod)`.

MongoDB aggregation (`aggregateRaw`) is used for complex joins and reporting queries.

---

## Modules & Features

### Customer
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/customer/create` | Create customer (HEAD_OFFICE / BRANCH_OFFICE) |
| GET | `/customer/get-all` | List all customers (paginated) |
| GET | `/customer/get-by-id/:id` | Get customer with addresses |
| GET | `/customer/:customerId` | Get addresses for a customer |
| POST | `/customer/create-address/:id` | Add address to customer |
| PUT | `/customer/edit/:id` | Update customer info |
| DELETE | `/customer/delete/:id` | Delete customer and addresses |

- Supports `INDIVIDUAL` / `CORPORATE` and `HEAD_OFFICE` / `BRANCH_OFFICE` types
- Duplicate customer code detection
- Pagination (default limit 5)

---

### Address
| Method | Endpoint | Description |
|--------|----------|-------------|
| PUT | `/addresses/edit/:id` | Update address |
| DELETE | `/addresses/delete/:id` | Delete address |

---

### Category
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/category/create` | Create category |
| GET | `/category/getAll` | List all categories (paginated) |
| GET | `/category/get/:id` | Get category with its products |
| PUT | `/category/update/:id` | Update category |
| DELETE | `/category/delete/:id` | Delete category |

- Unique name and code enforcement

---

### Product
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/products/product/create` | Create product |
| GET | `/products/product/getAll` | List all products (paginated) |
| GET | `/products/product/get/:id` | Get product with category and sets |
| PUT | `/products/product/update/:id` | Update product |
| DELETE | `/products/product/delete/:id` | Delete product |

- Unique SKU and product code enforcement
- Category existence validation

---

### Product Set
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/productSets/product-set/create` | Create product set |
| GET | `/productSets/product-set/getAll` | List all product sets (paginated) |
| GET | `/productSets/product-set/get/:id` | Get set with items |
| PUT | `/productSets/product-set/update/:id` | Update product set |
| DELETE | `/productSets/product-set/delete/:id` | Delete product set |

---

### Product Set Item
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/productSetItems/set-item/create` | Add product to a set |
| GET | `/productSetItems/set-item/getAll` | List all set items (paginated) |
| GET | `/productSetItems/set-item/get/:id` | Get set item details |
| PUT | `/productSetItems/set-item/update/:id` | Update set item |
| DELETE | `/productSetItems/set-item/delete/:id` | Remove product from set |

- Prevents duplicate product entries within the same set

---

### Order
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/orders/create` | Create order with items |
| PUT | `/orders/update-status/:id` | Update order status |
| GET | `/orders/customer/:customerId` | Get customer order history |
| GET | `/orders/reports/sales` | Sales report (daily / monthly) |
| GET | `/orders/reports/orders-by-month` | Orders grouped by month with status breakdown |
| GET | `/orders/reports/top-customers` | Top customers by total spending |

**Order Status Flow:**
```
PENDING → PAID → SHIPPED → COMPLETED
       ↘                 ↗
         CANCELED (only from PENDING or PAID)
```

**Payment Methods:** `COD`, `CREDIT_CARD`, `PROMPTPAY`

**Order Number Format:** `ORD-YYYYMM-NNNN` (auto-generated)

---

## Data Models

```
Customer ──< Address
Customer ──< Order ──< OrderItem >── Product
Category ──< Product >──< ProductSetItem >── ProductSet
```

---

## Setup

### Prerequisites
- Node.js
- MongoDB Atlas cluster

### Environment Variables

Create a `.env` file in the project root:

```env
DATABASE_URL="mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<dbname>"
PORT=5000
```

### Install & Run

```bash
npm install
npx prisma generate
npm run dev
```

The server starts on `http://localhost:5000`.

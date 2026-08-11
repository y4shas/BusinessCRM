# BusinessCRM API Documentation

Base URL: `/api/v1`

## Authentication

All endpoints (except login and health) require a valid JWT token passed in the `Authorization` header.

**Header Format:**
```
Authorization: Bearer <token>
```

### 1. Login
- **Endpoint:** `POST /auth/login`
- **Description:** Authenticate a user and receive a JWT token.
- **Request Body:**
  ```json
  {
    "email": "user@demo.local",
    "password": "Password123"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "user": { "id": 1, "email": "...", "role": "ADMIN", "name": "..." },
      "token": "ey..."
    }
  }
  ```

---

## Dashboard

### 1. Dashboard Summary
- **Endpoint:** `GET /dashboard/summary`
- **Description:** Get role-scoped dashboard metrics (Customers, Products, Challans, Follow-ups). Data structure returned depends on the user's role (ADMIN, SALES, WAREHOUSE, ACCOUNTS).
- **Response:** `200 OK` with JSON object containing `role` and `data`.

---

## Customers (CRM)

### 1. List Customers
- **Endpoint:** `GET /customers`
- **Query Params:** `page` (default: 1), `limit` (default: 20), `search` (filter by name/businessName/mobile/email)
- **Response:** Paginated list of customers.

### 2. Get Customer Details
- **Endpoint:** `GET /customers/:id`
- **Response:** Customer object including recent challans and follow-ups.

### 3. Create Customer
- **Endpoint:** `POST /customers`
- **Request Body:** `name`, `mobile`, `email`, `businessName`, `gstNumber`, `customerType` (B2B, B2C), `address`, `status`, `notes`.
- **Response:** Created customer object.

### 4. Update Customer
- **Endpoint:** `PUT /customers/:id`
- **Request Body:** Partial update fields.
- **Response:** Updated customer object.

### 5. Add Follow-up
- **Endpoint:** `POST /customers/:id/follow-ups`
- **Request Body:**
  ```json
  {
    "note": "Called regarding new requirements.",
    "nextFollowUp": "2026-08-15T10:00:00Z"
  }
  ```
- **Response:** Created follow-up object.

---

## Products (Inventory)

### 1. List Products
- **Endpoint:** `GET /products`
- **Query Params:** `page` (default: 1), `limit` (default: 20), `search` (filter by name/sku/category), `lowStock` (boolean)
- **Response:** Paginated list of products.

### 2. Get Product Details
- **Endpoint:** `GET /products/:id`
- **Response:** Product object including stock movements.

### 3. Create Product
- **Endpoint:** `POST /products`
- **Request Body:** `name`, `sku`, `category`, `unitPrice`, `currentStock`, `minStockAlert`, `location`.
- **Response:** Created product object.

### 4. Update Product
- **Endpoint:** `PUT /products/:id`
- **Request Body:** Partial update fields.
- **Response:** Updated product object.

### 5. Record Stock Movement
- **Endpoint:** `POST /products/:id/stock-movements`
- **Request Body:**
  ```json
  {
    "movementType": "IN", // or "OUT"
    "quantity": 50,
    "reason": "Restock"
  }
  ```
- **Response:** Created stock movement object and automatically updated product `currentStock`.

---

## Challans (Sales Orders)

### 1. List Challans
- **Endpoint:** `GET /challans`
- **Query Params:** `page` (default: 1), `limit` (default: 20), `status` (DRAFT, CONFIRMED, CANCELLED)
- **Response:** Paginated list of challans.

### 2. Get Challan Details
- **Endpoint:** `GET /challans/:id`
- **Response:** Challan object including line items and customer info.

### 3. Create Challan
- **Endpoint:** `POST /challans`
- **Request Body:**
  ```json
  {
    "customerId": 1,
    "items": [
      {
        "productId": 2,
        "quantity": 5
      }
    ]
  }
  ```
- **Response:** Created challan in `DRAFT` status with automatically calculated `unitPriceSnap` and `lineTotal` per item based on current product pricing.

### 4. Confirm Challan
- **Endpoint:** `POST /challans/:id/confirm`
- **Description:** Marks challan as `CONFIRMED` and automatically deducts stock from inventory (`OUT` movement). Returns `409 Conflict` if insufficient stock.
- **Response:** Updated challan.

### 5. Cancel Challan
- **Endpoint:** `POST /challans/:id/cancel`
- **Description:** Marks challan as `CANCELLED`. If previously confirmed, this will reverse the stock deduction (`IN` movement).
- **Response:** Updated challan.

### 6. Download PDF
- **Endpoint:** `GET /challans/:id/pdf`
- **Description:** Generates a PDF version of the challan.
- **Response:** `application/pdf` binary stream.

---

## Users (Admin Only)

### 1. List Users
- **Endpoint:** `GET /users`
- **Response:** List of system users.

### 2. Create User
- **Endpoint:** `POST /users`
- **Request Body:** `email`, `password`, `name`, `role` (ADMIN, SALES, WAREHOUSE, ACCOUNTS).
- **Response:** Created user object.

### 3. Update User
- **Endpoint:** `PUT /users/:id`
- **Response:** Updated user object.

### 4. Delete User
- **Endpoint:** `DELETE /users/:id`
- **Response:** Success confirmation.

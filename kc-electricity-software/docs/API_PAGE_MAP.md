# Electricity Billing System — Web Version Map
**Stack:** Next.js (App Router) + TypeScript + Node.js

---

## Business Logic Summary (Reverse Engineered)

### Bill Calculation Flow
```
useunit     = current meter reading − previous reading (from Prev table)
amt         = (useunit × puc) + mrent + scharge + pasige
tax         = tax % on amt
gamt        = amt + tax + arr (gross amount including arrears)
bal         = gamt − dbt (balance after payment)
arr         = carried forward from previous unpaid bal
```

### Status Values
| Field   | Values                          |
|---------|---------------------------------|
| Status  | `Active`, `Uncleared`, `Cleared`|
| pstat   | `Consumer`, (others)            |
| meterstat / status | `Active`, `Inactive` |

### Unit Rate Fields (Add_unit per floor)
| Field | Meaning              |
|-------|----------------------|
| puc   | Per Unit Charge      |
| pc    | Fixed Charge         |
| mr    | Meter Rent           |
| sc    | Service Charge       |
| avr   | Average Rate         |

---

## Backend API Routes

### Auth
| Method | Route              | Description          |
|--------|--------------------|----------------------|
| POST   | `/api/auth/login`  | Login with credentials |
| POST   | `/api/auth/logout` | Logout               |
| GET    | `/api/auth/me`     | Get current user     |

---

### Floors
| Method | Route              | Description         |
|--------|--------------------|---------------------|
| GET    | `/api/floors`      | List all floors     |
| POST   | `/api/floors`      | Add a floor         |
| PUT    | `/api/floors/:id`  | Update floor        |
| DELETE | `/api/floors/:id`  | Delete floor        |

---

### Parties (Shops / Consumers)
| Method | Route                  | Description             |
|--------|------------------------|-------------------------|
| GET    | `/api/parties`         | List all parties        |
| GET    | `/api/parties/:idno`   | Get single party        |
| POST   | `/api/parties`         | Add new party/shop      |
| PUT    | `/api/parties/:idno`   | Update party            |
| DELETE | `/api/parties/:idno`   | Delete party            |

---

### Meters
| Method | Route                       | Description             |
|--------|-----------------------------|-------------------------|
| GET    | `/api/meters`               | List all meters         |
| GET    | `/api/meters/:serial`       | Get single meter        |
| POST   | `/api/meters`               | Assign meter to party   |
| PUT    | `/api/meters/:serial`       | Update meter info       |
| PATCH  | `/api/meters/:serial/status`| Toggle Active/Inactive  |

---

### Unit Rates
| Method | Route                    | Description               |
|--------|--------------------------|---------------------------|
| GET    | `/api/unit-rates`        | List rates for all floors |
| GET    | `/api/unit-rates/:floor` | Get rate for a floor      |
| POST   | `/api/unit-rates`        | Add rate for a floor      |
| PUT    | `/api/unit-rates/:id`    | Update floor rate         |

---

### Meter Readings (Prev)
| Method | Route                          | Description                   |
|--------|--------------------------------|-------------------------------|
| GET    | `/api/readings`                | List all readings             |
| GET    | `/api/readings/party/:idno`    | Reading history for a party   |
| POST   | `/api/readings`                | Submit new meter reading      |

---

### Billing (Ledger)
| Method | Route                          | Description                        |
|--------|--------------------------------|------------------------------------|
| GET    | `/api/bills`                   | List all bills (filterable)        |
| GET    | `/api/bills/:serial`           | Get single bill                    |
| GET    | `/api/bills/party/:idno`       | Bill history for a party           |
| POST   | `/api/bills/generate`          | Generate bills for a billing period|
| PATCH  | `/api/bills/:serial/payment`   | Record payment (update dbt, bal)   |
| PATCH  | `/api/bills/:serial/discount`  | Apply discount                     |

---

### Reports
| Method | Route                            | Description                        |
|--------|----------------------------------|------------------------------------|
| GET    | `/api/reports/balance-sheet`     | Balance sheet (amt, arr per shop)  |
| GET    | `/api/reports/daily`             | Daily payments by floor/date       |
| GET    | `/api/reports/defaulters`        | Parties with unpaid arrears        |
| GET    | `/api/reports/floor-list`        | Floor-wise party list              |
| GET    | `/api/reports/monthly-summary`   | Monthly units & amounts by floor   |
| GET    | `/api/reports/recovery`          | Recovery summary by date & floor   |
| GET    | `/api/reports/statement/:idno`   | Account statement for a party      |
| GET    | `/api/reports/use-units`         | Unit consumption per party         |
| GET    | `/api/reports/avg-bill`          | Average bill per floor             |

---

### Dashboard
| Method | Route               | Description                              |
|--------|---------------------|------------------------------------------|
| GET    | `/api/dashboard`    | Stats: total collected, defaulters count, units consumed, pending balance |

---

## Frontend Pages (Next.js App Router)

### Auth
| Route          | Page            | Description         |
|----------------|-----------------|---------------------|
| `/login`       | Login Page      | Username + password |

---

### Dashboard
| Route  | Page      | Description                                                    |
|--------|-----------|----------------------------------------------------------------|
| `/`    | Dashboard | Total bills, total collection, defaulters count, pending balance, monthly chart |

---

### Floors
| Route          | Page          | Description          |
|----------------|---------------|----------------------|
| `/floors`      | Floor List    | Add / edit / delete floors |

---

### Parties
| Route               | Page           | Description                     |
|---------------------|----------------|---------------------------------|
| `/parties`          | Party List     | All shops with floor filter     |
| `/parties/new`      | Add Party      | Form to add new shop/consumer   |
| `/parties/[idno]`   | Party Detail   | Info + meter + bill history     |
| `/parties/[idno]/edit` | Edit Party  | Edit party details              |

---

### Meters
| Route           | Page        | Description                  |
|-----------------|-------------|------------------------------|
| `/meters`       | Meter List  | All meters, status filter    |
| `/meters/new`   | Add Meter   | Assign meter to party        |
| `/meters/[serial]/edit` | Edit Meter | Update meter info  |

---

### Unit Rates
| Route          | Page             | Description              |
|----------------|------------------|--------------------------|
| `/unit-rates`  | Unit Rate List   | View & edit rates per floor (puc, pc, mr, sc, avr) |

---

### Meter Readings
| Route            | Page             | Description                    |
|------------------|------------------|--------------------------------|
| `/readings`      | Readings List    | All submitted readings         |
| `/readings/new`  | Submit Reading   | Enter current meter reading for a party → auto calculates useunit |

---

### Billing
| Route                   | Page              | Description                          |
|-------------------------|-------------------|--------------------------------------|
| `/billing`              | Bills List        | All bills, filter by floor/date/status |
| `/billing/generate`     | Generate Bills    | Select billing period → generate for all active consumers |
| `/billing/[serial]`     | Bill Detail       | View bill breakdown + record payment |

---

### Reports
| Route                       | Page                  |
|-----------------------------|-----------------------|
| `/reports/balance-sheet`    | Balance Sheet         |
| `/reports/daily`            | Daily Report          |
| `/reports/defaulters`       | Defaulter List        |
| `/reports/floor-list`       | Floor List            |
| `/reports/monthly-summary`  | Monthly Summary       |
| `/reports/recovery`         | Recovery Report       |
| `/reports/statement`        | Account Statement     |
| `/reports/use-units`        | Use Units Report      |
| `/reports/avg-bill`         | Average Bill Report   |

All report pages have: **date range filter + floor filter + print/export to PDF button**

---

## Folder Structure (Next.js App Router)

```
src/
├── app/
│   ├── (auth)/
│   │   └── login/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx               ← sidebar + topbar
│   │   ├── page.tsx                 ← dashboard
│   │   ├── floors/page.tsx
│   │   ├── parties/
│   │   │   ├── page.tsx
│   │   │   ├── new/page.tsx
│   │   │   └── [idno]/
│   │   │       ├── page.tsx
│   │   │       └── edit/page.tsx
│   │   ├── meters/
│   │   │   ├── page.tsx
│   │   │   ├── new/page.tsx
│   │   │   └── [serial]/edit/page.tsx
│   │   ├── unit-rates/page.tsx
│   │   ├── readings/
│   │   │   ├── page.tsx
│   │   │   └── new/page.tsx
│   │   ├── billing/
│   │   │   ├── page.tsx
│   │   │   ├── generate/page.tsx
│   │   │   └── [serial]/page.tsx
│   │   └── reports/
│   │       ├── balance-sheet/page.tsx
│   │       ├── daily/page.tsx
│   │       ├── defaulters/page.tsx
│   │       ├── floor-list/page.tsx
│   │       ├── monthly-summary/page.tsx
│   │       ├── recovery/page.tsx
│   │       ├── statement/page.tsx
│   │       ├── use-units/page.tsx
│   │       └── avg-bill/page.tsx
│   └── api/
│       ├── auth/
│       ├── floors/
│       ├── parties/
│       ├── meters/
│       ├── unit-rates/
│       ├── readings/
│       ├── bills/
│       ├── reports/
│       └── dashboard/
├── lib/
│   ├── db.ts                        ← DB connection (Prisma / node-mssql)
│   └── bill-calculator.ts           ← billing logic (useunit, amt, gamt, bal)
└── types/
    └── index.ts
```

---

## Key Business Logic to Implement in `bill-calculator.ts`

```typescript
function calculateBill(params: {
  currentReading: number
  previousReading: number
  previousArr: number
  rates: { puc: number; pc: number; mr: number; sc: number }
  taxRate: number
}) {
  const useunit  = currentReading - previousReading
  const amt      = (useunit * params.rates.puc) + params.rates.mr + params.rates.sc + params.rates.pc
  const tax      = amt * (params.taxRate / 100)
  const gamt     = amt + tax + params.previousArr
  return { useunit, amt, tax, gamt, bal: gamt, arr: params.previousArr }
}
```

# TechStore — Product Search Screen

Responsive product search and detail interface for the **Smart Electronics Store** project, Group 07, CSC13002 — Introduction to Software Engineering.

This screen supports **UC17: Search and Filter Products** and **UC16: View Product Details**. It connects the React frontend to the Express API and PostgreSQL catalog.

## Overview

The screen helps customers find laptops, phones, and tablets by keyword, category, brand, budget, and stock availability. Customers can switch between grid and list views, browse result pages, save products during the current session, and open a product detail dialog.

The visual layout includes a TechStore header, search bar, category navigation, technology banner, filter panel, product results, and pagination. On smaller screens, the filter panel can be expanded using the **Bộ lọc** button.

Design reference: [Smart Electronics Store Figma](https://www.figma.com/design/LQZnlJKKJQPkP0ryP17InQ/CSC13002-PA04-%E2%80%94-Smart-Electronics-Store?node-id=3-128).

## Features

| Feature | Behavior |
| --- | --- |
| Keyword search | Submit with Enter or the search button; supports Vietnamese text with or without accents. |
| Search suggestions | Show up to five matching products while typing, starting at two characters with a 250 ms debounce. Suggestions respect the selected category and filters. Support ↑/↓, Enter, Esc, mouse selection, cancellation, and stale-response protection. |
| Category filter | Categories are loaded from the API. Selecting a category in the top navigation clears the previous search and filters. |
| Brand filter | Show only brands with active products in the selected category. Changing category clears previous brand/spec selections. Brands are combined using OR; different filter types use AND. |
| Technical filters | Category-specific RAM, SSD capacity, CPU/chip family, screen size, screen technology, OS, refresh rate, and laptop usage. Only groups and values present in the catalog are shown. |
| Price filter | Adjust the maximum price or use the 15M, 20M, and 30M VND presets. The slider's upper position means **no price limit**. |
| Stock filter | Show products with available inventory. Inventory is simulated for the project demo. |
| Active filters | Remove an individual filter or reset all filters. Resetting filters preserves the submitted keyword. |
| Sorting | Default order, ascending price, or descending price. The current backend default order is descending product ID. |
| Pagination | Six products per page; total counts and regular search pages come from the API. |
| Grid/list views | Switch the presentation without changing the search criteria. |
| Saved products | Save or unsave a product and view the saved list. Saved IDs are held in React state and reset on page reload. |
| Product details | Fetch product information, specifications, configurations, SKU identifiers, and variant prices/stock. |
| Loading and errors | Show loading feedback, empty results, connection errors, and a retry action. |
| Image fallback | Use the catalog image when available and a local vector illustration when the image is missing or fails. |
| Request cancellation | Cancel outdated search/detail requests so an older response does not replace newer results. |

Catalog search and the saved-products view both use server-side filtering and pagination. The saved view passes its session-local product IDs to the API along with the same search/filter criteria.

Technical filters, price and stock availability must match the **same active SKU**. The displayed price and specifications come from the cheapest matching SKU; opening details preserves that SKU while also listing the other configurations. Multiple values in a technical group use OR; groups use AND. Missing technical values do not match a selected filter. Option counts indicate distinct product groups with that value in the selected category, independent of the keyword or other filters. CPU, screen technology and OS options are normalized families rather than full raw descriptions.

## Technology

- React 19 and TypeScript.
- Vite 6 for development and production builds.
- CSS media queries for responsive layouts.
- Fetch API and AbortController for HTTP requests and cancellation.
- Node.js/Express backend with PostgreSQL 16 in Docker.

## Run Locally

Requirements: Node.js and npm, Docker Desktop running with Linux containers, and the project catalog imported into PostgreSQL. Node.js 24 was used for the recorded integration checks.

Run each terminal from the repository root unless otherwise noted.

### 1. Start PostgreSQL

```powershell
cd D:\IntroSE\TH\SE
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
docker compose up -d --wait
```

For a database that already contains the catalog, reuse the existing volume. For a fresh database, follow the [database setup guide](../docs/database/README_PA4.md). The catalog setup script resets catalog data, so it should not be rerun as part of normal startup.

### 2. Start the Backend

Open a second terminal:

```powershell
cd D:\IntroSE\TH\SE\backend
npm ci
npm run dev
```

The API runs at `http://localhost:5000/api` by default.

### 3. Start the Frontend

Open a third terminal:

```powershell
cd D:\IntroSE\TH\SE\frontend
npm ci
npm run dev
```

Open **http://localhost:5173**, or the URL printed by Vite if that port is occupied. Keep the backend and frontend terminals running. After the initial dependency installation, subsequent starts only require `npm run dev`.

### API Configuration

The frontend defaults to `http://localhost:5000/api`. To use another API address, create `frontend/.env`:

```dotenv
VITE_API_URL=http://localhost:5000/api
```

Restart Vite after changing this setting. Frontend environment variables are public and must not contain credentials.

The backend loads `backend/.env`, then the repository-root `.env`, while preserving existing process environment variables. Mock fallback is disabled by default; `ALLOW_MOCK_DATA=true` explicitly enables it for isolated mock testing.

## Verify the Data Source

```powershell
Invoke-RestMethod http://localhost:5000/api/health
```

For a PostgreSQL-backed demo, the response must include:

```json
{
  "status": "ok",
  "database": "connected",
  "dataSource": "postgresql"
}
```

The screenshot-like UI alone does not prove database connectivity. When PostgreSQL is unavailable and mock mode is disabled, catalog endpoints return HTTP `503` with code `DATABASE_UNAVAILABLE`.

## API Endpoints Used

All paths below are relative to `VITE_API_URL`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/health` | Check the backend and identify the data source. |
| GET | `/categories` | Load category names and codes. |
| GET | `/brands` | Load available brands. |
| GET | `/products/filters?category=phone` | Load technical groups, values and model counts for a category. |
| GET | `/products/suggestions` | Fetch up to five matching product suggestions using the current keyword and filters. |
| GET | `/products/search` | Search, filter, sort, and paginate products. |
| GET | `/products/:id` | Load product details and variants. |

Search parameters sent by this screen:

| Parameter | Example | Meaning |
| --- | --- | --- |
| `q` | `iPhone 16` | Submitted keyword. |
| `category` | `phone` | Category code; omitted for all categories. |
| `brand` | `ASUS,Apple` | Comma-separated selected brands. |
| `maxPrice` | `30000000` | Maximum price in VND; omitted when unlimited. |
| `inStock` | `true` | Require available inventory. |
| `sort` | `relevant`, `asc`, `desc` | Default order or price order. |
| `page` | `1` | Requested result page. |
| `limit` | `6` | Products per page. |
| `ram`, `storage` | `16`, `512,1024` | Selected RAM/storage capacities in GB. |
| `cpu` | `Intel Core i5` | Normalized CPU/chip family. |
| `screenSize`, `screenTech` | `14,15.6`, `OLED` | Screen diagonal in inches and technology family. |
| `os`, `usage`, `refreshRate` | `Windows`, `Gaming`, `144` | OS family, usage, and refresh rate in Hz. |
| `ids` | `12,45` | Product IDs for the saved-products view; an empty list matches no products. |

The API returns a `data` array and a `pagination` object containing `page`, `pageSize`, `total`, and `totalPages`. The frontend adapter converts API fields such as `image_url` and `review_count` into the view model used by the components.

## Source Files

```text
frontend/
├── src/
│   ├── App.tsx                         # Search state, filters, requests, pagination, and detail dialog
│   ├── main.tsx                        # React entry point
│   ├── search.css                      # Screen styling and responsive layouts
│   ├── discovery.css                   # Technical filters and autocomplete dropdown styling
│   ├── components/
│   │   ├── ProductCard.tsx             # Product result card
│   │   ├── SearchBox.tsx               # Debounced, keyboard-accessible autocomplete
│   │   ├── TechnicalFilters.tsx        # Collapsible category-specific specification groups
│   │   ├── ProductImage.tsx            # Catalog image with failure fallback
│   │   ├── ProductArt.tsx              # Local vector device illustrations
│   │   └── Icon.tsx                    # Shared SVG icons
│   ├── services/
│   │   ├── apiClient.ts                # Base URL, timeout, cancellation, and HTTP errors
│   │   └── productApi.ts               # Typed catalog requests and response adapter
│   └── data/
│       └── mockProducts.ts            # Earlier prototype data; not used by the integrated screen
├── scripts/
│   ├── check-search-integration.mjs    # Frontend/API integration and React rendering checks
│   └── check-discovery.mjs             # In-memory DOM autocomplete and category/filter interaction checks
├── .env.example
├── index.html
└── package.json
```

## Demo Scenarios

1. Search for `iPhone 16` using Enter. Confirm results and the `/api/products/search` request in the browser Network panel.
2. Select the phone category, Apple brand, and a maximum price of 30M VND. Results must satisfy all selected filter types.
3. Search for `laptop`, sort by ascending price, and move to the next page.
4. Search for a nonexistent keyword to demonstrate the empty-results state.
5. Clear the keyword, reset filters, and select tablets to show products with missing prices.
6. Open a product to demonstrate UC16: specifications, configurations, SKU identifiers, and variant availability.
7. Save a product using the heart button and switch to **Đã lưu**. Existing search filters still apply to the saved list.
8. Stop the backend, submit another search, and show the error state. Restart the backend and select **Thử lại**.
9. Switch from laptops to phones: laptop-only brands and usage filters disappear, and incompatible selections are cleared.
10. Select laptop RAM 16 GB, storage 512 GB and Windows. Check the selected configuration and price in the product details.
11. Type `ip` in the search bar, wait for suggestions, use arrow keys and Enter to select one. Press Esc to dismiss the dropdown.

For the complete group demo workflow, see the [UC17/UC16 integration guide](../docs/integration/search-demo.md).

## Build and Check

From `frontend/`:

```powershell
npm run build
npm run test:integration
npm run test:discovery
```

The integration check requires the backend and PostgreSQL to be running. It uses the actual frontend API adapter and renders product cards with React, covering metadata, search, server pagination, combined filters, missing values, product details, empty results, errors, and cancellation. `test:discovery` additionally uses jsdom to exercise autocomplete debounce, keyboard selection, cancellation, stale results and category-specific screen state. These checks do not automate a browser or verify visual layout.

From `backend/`:

```powershell
npm run build
npm test
npm run test:integration
npm run test:discovery
```

Recorded checks on **15 November 2026** passed: frontend/backend builds, 7 existing API tests against PostgreSQL, 7 additional backend integration checks, and the frontend API/rendering check. Automated visual browser verification was unavailable; manually review layout and interactions before presenting.

The technical-filter/autocomplete update also passed 8 backend discovery checks against PostgreSQL and the jsdom interaction checks. Filter structure was informed by the [Phong Vũ laptop catalog](https://phongvu.vn/c/laptop) and [phone catalog](https://phongvu.vn/c/phone-dien-thoai), with options derived from this project's own snapshot.

## Data and Scope

- The imported snapshot contains 368 product groups and 703 SKUs across laptops, phones, and tablets. Displayed search counts refer to product groups, not individual SKUs.
- Catalog prices are historical snapshot values; inventory is simulated for the course project.
- A missing price is displayed as **Chưa có giá**. Missing ratings are displayed as **Chưa có đánh giá**.
- Price filtering excludes products without a price. With no price limit, those products can appear in results.
- Product images use catalog URLs, with local vector fallbacks if those URLs fail.
- Saving products is temporary and does not create an account or persist a wishlist.
- This screen implements product discovery and read-only details; checkout and inventory updates are outside its current scope.

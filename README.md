# Sweet Bouquets

Sweet Bouquets is a full-stack catalogue website for a small business offering handmade sweet and chocolate bouquets. Customers browse visible products and contact the business through a prefilled email enquiry. An authenticated admin manages products, visibility, ordering, and images.

The project has two user-facing parts:

- A public Next.js customer website at `/`.
- A protected Next.js admin dashboard at `/admin`.

The backend is a NestJS API backed by PostgreSQL and Prisma. Images are processed by Sharp and stored in Supabase Storage.

## Features

### Public website

- Responsive homepage with hero, about, catalogue, contact, and footer sections.
- Visible products loaded from the backend API.
- Product images with a consistent layout and fallback placeholders.
- Loading, empty, and friendly API error states.
- Responsive mobile navigation with section links.
- SEO title and description metadata.
- Keyboard-visible focus states and semantic page landmarks.

### Product ordering

Customers can select **Order this bouquet** on a product card. The site opens the customer's email client using `mailto:` with a URL-encoded subject and message containing:

- The selected product title.
- The product description.
- A request to discuss availability and customisation.
- Space for the customer's name and contact details.

There is no shopping cart, online payment, order database, customer account, or order status system. The customer reviews and sends the enquiry directly from their email client.

### Admin dashboard

Admins sign in at `/admin/login` using JWT authentication and can:

- View all products, including hidden products.
- Create, edit, and delete products.
- Control public visibility.
- Set display sort order.
- Upload, replace, and delete product images.
- Log out.

Product mutations, image operations, admin product listing, and login require authentication. Public product reads do not.

## How to Use the Website

### Customer workflow

1. Open the public website at `/`.
2. Browse the available bouquets in the collection.
3. Review a product card's image, title, and description.
4. Select **Order this bouquet**.
5. The email client opens with a prefilled enquiry.
6. Review or edit the message and add personal details.
7. Send the enquiry to the business.

Products hidden in the admin dashboard are not returned by the public product endpoint and do not appear on the public website.

### Admin workflow

1. Open `/admin/login`.
2. Enter the configured admin email and password.
3. Open the dashboard.
4. Create a product with a title and description.
5. Set its public visibility.
6. Set a sort order when needed.
7. Upload an image and save the product.
8. Confirm that a visible product appears on the public website.

Use **Edit** to change a product's title, description, visibility, or sort order. Use **Replace image** or **Remove image** for image management. Use **Delete** to remove a product after confirmation. Select **Log out** when finished.

## Architecture

```text
Customer browser
      |
      v
Next.js public website
      |
      v
NestJS API ----> Prisma ----> PostgreSQL
      |
      v
Supabase Storage (processed product images)

Admin browser
      |
      v
Next.js admin UI -- JWT --> NestJS API
```

- **Next.js:** serves the public catalogue and authenticated admin interface.
- **NestJS:** validates requests, authenticates admins, and exposes product APIs.
- **Prisma/PostgreSQL:** stores product and admin records. Image binaries are not stored in PostgreSQL.
- **Supabase Storage:** stores processed WebP product images.

## API

All product responses are returned directly as Product objects or arrays of Product objects.

### Public endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/products` | List visible products in display order. |
| `GET` | `/products/:id` | Read one product. |

### Authenticated admin endpoints

Send `Authorization: Bearer <accessToken>` where marked as protected.

| Method | Endpoint | Auth | Purpose |
| --- | --- | --- |
| `POST` | `/auth/login` | No | Return an admin JWT as `{ accessToken }`. |
| `GET` | `/products/admin` | JWT | List all products, including hidden products. |
| `POST` | `/products` | JWT | Create a product. |
| `PATCH` | `/products/:id` | JWT | Update product fields. |
| `DELETE` | `/products/:id` | JWT | Delete a product and its stored image. |
| `POST` | `/products/:id/image` | JWT | Upload or replace a product image. |
| `DELETE` | `/products/:id/image` | JWT | Delete a product image. |

Additional endpoints:

- `GET /health` returns the backend health status.
- `GET /api` serves Swagger UI documentation.

## Local Development

### Requirements

- Docker Desktop with Docker Compose.
- Node.js 20 or newer for non-container development.
- npm 10 or newer for non-container development.

### Docker startup

Set the required values in the shell or a local untracked environment file. Never commit them:

```bash
export JWT_SECRET='replace-with-a-local-secret'
export ADMIN_EMAIL='admin@example.com'
export ADMIN_PASSWORD='replace-with-a-local-password'
export SUPABASE_URL='https://your-project.supabase.co'
export SUPABASE_SERVICE_ROLE_KEY='replace-with-your-service-role-key'
export SUPABASE_STORAGE_BUCKET='sweet-bouquets'
export NEXT_PUBLIC_API_URL='http://localhost:3001'
export NEXT_PUBLIC_ORDER_EMAIL='orders@example.com'
docker compose up --build -d
```

Services:

- Public website: http://localhost:3000
- Admin login: http://localhost:3000/admin/login
- Admin dashboard: http://localhost:3000/admin
- Backend API: http://localhost:3001
- Swagger: http://localhost:3001/api
- PostgreSQL: `localhost:5432`

The PostgreSQL data is stored in the persistent `postgres-data` Docker volume. Stop the stack without deleting data with:

```bash
docker compose down
```

The backend waits for PostgreSQL health, runs `prisma migrate deploy`, and then starts NestJS. It does not create an admin automatically. Create the configured admin once with:

```bash
docker compose exec backend npm run admin:create
```

For a non-container development setup, copy the example environment files, install dependencies in `frontend/` and `backend/`, start PostgreSQL, then run the respective development scripts.

## Environment Variables

### Backend-only configuration and secrets

- `DATABASE_URL`
- `PORT`
- `FRONTEND_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_STORAGE_BUCKET`

### Browser-safe frontend configuration

- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_ORDER_EMAIL`
- `NEXT_PUBLIC_BUSINESS_PHONE`
- `NEXT_PUBLIC_INSTAGRAM_URL`

Never put `JWT_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, database credentials, admin passwords, or any other backend secret in a `NEXT_PUBLIC_*` variable. The service-role key is used only by the backend.

Example files with safe placeholders are available at `backend/.env.example` and `frontend/.env.example`.

## Supabase Storage

Product images are stored in the configured Supabase Storage bucket. PostgreSQL stores only the resulting public image URL, never image binary data.

- Accepted uploads: JPEG, PNG, and WebP.
- Maximum upload size: 5 MB.
- Images are rotated according to metadata, resized so the longest dimension is at most approximately 2000px, and converted to WebP at quality 82.
- Stored objects use generated paths such as `products/<uuid>.webp`.
- Replacements upload the new image and update PostgreSQL before attempting old-image cleanup.
- Product and image deletion are protected by JWT.

Valid Supabase credentials are required for real image upload and deletion. The local automated checks mock storage where appropriate unless valid credentials are configured.

## Security

- Admin passwords are bcrypt-hashed and never stored in plaintext.
- JWT authentication protects admin mutations and image operations.
- Public product reads remain unauthenticated.
- DTO validation, property whitelisting, and UUID validation are enabled.
- Secrets are supplied through environment variables.
- The Supabase service-role key remains backend-only.
- Frontend bundles contain only browser-safe `NEXT_PUBLIC_*` configuration.

## Deployment Preparation

The intended production architecture is:

- Next.js frontend on Vercel.
- NestJS backend on Render or another managed Node.js host.
- Managed PostgreSQL database.
- Supabase Storage for product images.
- A custom domain can be added later.

Production frontend variables:

- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_ORDER_EMAIL`
- `NEXT_PUBLIC_BUSINESS_PHONE`
- `NEXT_PUBLIC_INSTAGRAM_URL`

Production backend variables:

- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_STORAGE_BUCKET`
- `FRONTEND_URL`
- `PORT`

Production PostgreSQL must be managed separately from the local Docker database. Apply the existing Prisma migrations with `prisma migrate deploy`; do not use `prisma migrate reset` or the local Docker database for production.

## Validation Commands

```bash
cd frontend
npm run lint
npm run build

cd ../backend
npm run db:generate
npm run build
npm test

cd ..
docker compose config
docker compose up --build -d
```

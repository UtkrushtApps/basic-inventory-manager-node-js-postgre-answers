# Solution Steps

1. Design the PostgreSQL schema: Create a 'products' table with columns for id (primary key), name (unique, varchar), price (numeric), quantity (int), and created_at, adding appropriate constraints and indexes for uniqueness and performance.

2. Save the schema migration as db/schema.sql to be run once to initialize the database.

3. Set up the PostgreSQL connection pool in db/index.js using environment variables or a sensible default connection string.

4. Replace mock data access in the Node.js API with real database queries via the db module. Handle parameterized queries to avoid SQL injection and ensure all user data is validated.

5. For POST /products, validate input, enforce unique product name, and insert into the products table, handling errors gracefully (including duplicate entries).

6. For GET /products, implement offset-based pagination using SQL and return total count for client-side pagination.

7. For PUT /products/:id/quantity and DELETE /products/:id, use transactions and SELECT ... FOR UPDATE to lock the row, ensuring quantity updates and deletions are safe and atomic even under concurrent access. Validate all constraints and roll back on error.

8. Add error handling for all routes, returning proper error messages and status codes, catching constraint or SQL errors as needed.

9. Start the app from server.js, which imports app.js and listens on the specified port.

10. Test the end-to-end API (add, list with pagination, update quantity, delete) to ensure all functions use the real database robustly.


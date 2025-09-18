const express = require('express');
const bodyParser = require('body-parser');
const db = require('./db');

const app = express();
app.use(bodyParser.json());

// Add new product
app.post('/products', async (req, res) => {
  try {
    const { name, price, quantity } = req.body;
    if (!name || typeof price !== 'number' || typeof quantity !== 'number') {
      return res.status(400).json({ error: 'Missing required fields.' });
    }
    // Insert new product, name must be unique
    const result = await db.query(
      'INSERT INTO products (name, price, quantity) VALUES ($1, $2, $3) RETURNING *',
      [name, price, quantity]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') { // unique_violation
      return res.status(409).json({ error: 'Product name already exists.' });
    }
    return res.status(500).json({ error: 'Database error.' });
  }
});

// Paginated product retrieval
app.get('/products', async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const offset = (page - 1) * limit;

    const [productsResult, countResult] = await Promise.all([
      db.query(
        'SELECT id, name, price, quantity, created_at FROM products ORDER BY created_at DESC OFFSET $1 LIMIT $2',
        [offset, limit]
      ),
      db.query('SELECT COUNT(*) FROM products')
    ]);
    return res.json({
      products: productsResult.rows,
      total: parseInt(countResult.rows[0].count, 10),
      page,
      pageSize: limit
    });
  } catch (err) {
    return res.status(500).json({ error: 'Database error.' });
  }
});

// Update product quantity (atomic & safe)
app.put('/products/:id/quantity', async (req, res) => {
  const { id } = req.params;
  const { quantity } = req.body;
  if (typeof quantity !== 'number') {
    return res.status(400).json({ error: 'Invalid quantity.' });
  }
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    // Lock the row for update
    const { rows } = await client.query('SELECT * FROM products WHERE id = $1 FOR UPDATE', [id]);
    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Product not found.' });
    }
    // Update quantity (ensuring non-negative)
    if (quantity < 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Quantity cannot be negative.' });
    }
    const updateResult = await client.query(
      'UPDATE products SET quantity = $1 WHERE id = $2 RETURNING *',
      [quantity, id]
    );
    await client.query('COMMIT');
    return res.json(updateResult.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    return res.status(500).json({ error: 'Database error.' });
  } finally {
    client.release();
  }
});

// Delete product (atomic & safe)
app.delete('/products/:id', async (req, res) => {
  const { id } = req.params;
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    // Lock the row for update, if exists
    const { rows } = await client.query('SELECT * FROM products WHERE id = $1 FOR UPDATE', [id]);
    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Product not found.' });
    }
    await client.query('DELETE FROM products WHERE id = $1', [id]);
    await client.query('COMMIT');
    return res.status(204).send();
  } catch (err) {
    await client.query('ROLLBACK');
    return res.status(500).json({ error: 'Database error.' });
  } finally {
    client.release();
  }
});

// Basic health endpoint
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Error middleware (fallback)
app.use((err, req, res, next) => {
  res.status(500).json({ error: 'Internal server error.' });
});

module.exports = app;

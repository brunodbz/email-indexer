const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

class User {
  static async createTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'user')),
        is_active BOOLEAN DEFAULT true,
        mfa_secret VARCHAR(255),
        mfa_enabled BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await pool.query(query);
  }

  static async create(userData) {
    const { username, email, password, role = 'user' } = userData;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const query = `
      INSERT INTO users (username, email, password_hash, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, username, email, role, is_active, mfa_enabled;
    `;
    const values = [username, email, hashedPassword, role];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await pool.query(query, [email]);
    return result.rows[0];
  }

  static async findById(id) {
    const query = 'SELECT id, username, email, role, is_active, mfa_enabled FROM users WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async updateMfaSecret(userId, secret) {
    const query = 'UPDATE users SET mfa_secret = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2';
    await pool.query(query, [secret, userId]);
  }

  static async enableMfa(userId) {
    const query = 'UPDATE users SET mfa_enabled = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1';
    await pool.query(query, [userId]);
  }

  static async disableMfa(userId) {
    const query = 'UPDATE users SET mfa_enabled = false, mfa_secret = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1';
    await pool.query(query, [userId]);
  }

  static async updatePassword(userId, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const query = 'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2';
    await pool.query(query, [hashedPassword, userId]);
  }

  static async toggleStatus(userId) {
    const query = 'UPDATE users SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING is_active';
    const result = await pool.query(query, [userId]);
    return result.rows[0].is_active;
  }

  static async delete(userId) {
    const query = 'DELETE FROM users WHERE id = $1';
    await pool.query(query, [userId]);
  }

  static async getAll() {
    const query = 'SELECT id, username, email, role, is_active, mfa_enabled, created_at FROM users ORDER BY created_at DESC';
    const result = await pool.query(query);
    return result.rows;
  }

  static async getFirstUser() {
    const query = 'SELECT * FROM users ORDER BY created_at ASC LIMIT 1';
    const result = await pool.query(query);
    return result.rows[0];
  }
}

module.exports = User;
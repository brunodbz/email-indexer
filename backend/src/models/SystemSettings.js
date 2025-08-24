const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

class SystemSettings {
  static async createTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS system_settings (
        id SERIAL PRIMARY KEY,
        setting_key VARCHAR(50) UNIQUE NOT NULL,
        setting_value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await pool.query(query);
    
    // Inserir configurações padrão
    await this.upsert('allow_new_users', 'true');
  }

  static async upsert(key, value) {
    const query = `
      INSERT INTO system_settings (setting_key, setting_value)
      VALUES ($1, $2)
      ON CONFLICT (setting_key) 
      DO UPDATE SET setting_value = $2, updated_at = CURRENT_TIMESTAMP;
    `;
    await pool.query(query, [key, value]);
  }

  static async get(key) {
    const query = 'SELECT setting_value FROM system_settings WHERE setting_key = $1';
    const result = await pool.query(query, [key]);
    return result.rows[0] ? result.rows[0].setting_value : null;
  }

  static async getAllowNewUsers() {
    const value = await this.get('allow_new_users');
    return value === 'true';
  }

  static async setAllowNewUsers(allow) {
    await this.upsert('allow_new_users', allow ? 'true' : 'false');
  }
}

module.exports = SystemSettings;
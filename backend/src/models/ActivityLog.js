const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

class ActivityLog {
  static async createTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS activity_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        action VARCHAR(50) NOT NULL,
        entity_type VARCHAR(50),
        entity_id INTEGER,
        details JSONB,
        ip_address INET,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await pool.query(query);
  }

  static async create(logData) {
    const { userId, action, entityType, entityId, details, ipAddress } = logData;
    
    const query = `
      INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details, ip_address)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    const values = [userId, action, entityType, entityId, details, ipAddress];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async getAll(page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    
    const query = `
      SELECT al.id, al.action, al.entity_type, al.entity_id, al.details, al.ip_address, al.created_at, u.username
      FROM activity_logs al
      JOIN users u ON al.user_id = u.id
      ORDER BY al.created_at DESC
      LIMIT $1 OFFSET $2;
    `;
    const values = [limit, offset];
    const result = await pool.query(query, values);
    
    const countQuery = 'SELECT COUNT(*) FROM activity_logs';
    const countResult = await pool.query(countQuery);
    const total = parseInt(countResult.rows[0].count);
    
    return {
      data: result.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }
}

// Adicionar métodos estáticos fora da classe
ActivityLog.getTotalUsers = async function() {
  const query = 'SELECT COUNT(*) FROM users';
  const result = await pool.query(query);
  return parseInt(result.rows[0].count);
};

ActivityLog.getTotalDocuments = async function() {
  const query = 'SELECT COUNT(*) FROM documents';
  const result = await pool.query(query);
  return parseInt(result.rows[0].count);
};

ActivityLog.getTotalSearches = async function() {
  const query = "SELECT COUNT(*) FROM activity_logs WHERE action = 'document_search'";
  const result = await pool.query(query);
  return parseInt(result.rows[0].count);
};

ActivityLog.getTotalExports = async function() {
  const query = "SELECT COUNT(*) FROM activity_logs WHERE action = 'document_export'";
  const result = await pool.query(query);
  return parseInt(result.rows[0].count);
};

ActivityLog.getRecentActivities = async function(limit = 10) {
  const query = `
    SELECT al.id, al.action, al.entity_type, al.entity_id, al.details, al.ip_address, al.created_at, u.username
    FROM activity_logs al
    JOIN users u ON al.user_id = u.id
    ORDER BY al.created_at DESC
    LIMIT $1;
  `;
  const result = await pool.query(query, [limit]);
  return result.rows;
};

module.exports = ActivityLog;
const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { Client } = require('@elastic/elasticsearch');
const { v4: uuidv4 } = require('uuid');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

const esClient = new Client({ node: process.env.ELASTICSEARCH_URL });

class Document {
  static async createTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS documents (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        file_size BIGINT NOT NULL,
        user_id INTEGER REFERENCES users(id),
        upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        content_hash VARCHAR(64) NOT NULL
      );
    `;
    await pool.query(query);
  }

  static async create(fileData, userId) {
    const { filename, originalName, size, path: filePath } = fileData;
    
    // Calcular hash do conteúdo
    const content = await fs.readFile(filePath, 'utf8');
    const contentHash = crypto.createHash('sha256').update(content).digest('hex');
    
    const query = `
      INSERT INTO documents (filename, original_name, file_size, user_id, content_hash)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, filename, original_name, file_size, user_id, upload_date;
    `;
    const values = [filename, originalName, size, userId, contentHash];
    const result = await pool.query(query, values);
    
    // Indexar conteúdo no Elasticsearch
    await this.indexContent(content, result.rows[0].id, userId);
    
    return result.rows[0];
  }

  static async indexContent(content, documentId, userId) {
    const lines = content.split('\n');
    const bulkOperations = [];
    
    for (const line of lines) {
      if (line.trim()) {
        // Extrair email usando regex
        const emailMatch = line.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
        
        if (emailMatch) {
          const email = emailMatch[1];
          const domain = email.split('@')[1];
          
          bulkOperations.push({
            index: {
              _index: process.env.ELASTICSEARCH_INDEX || 'document_lines',
              _id: uuidv4()
            }
          });
          
          bulkOperations.push({
            content: line,
            document_id: documentId,
            user_id: userId,
            upload_date: new Date(),
            email: email,
            domain: domain
          });
        }
      }
    }
    
    if (bulkOperations.length > 0) {
      await esClient.bulk({ body: bulkOperations });
    }
  }

  static async searchByDomain(domain, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    
    const { body } = await esClient.search({
      index: process.env.ELASTICSEARCH_INDEX || 'document_lines',
      body: {
        query: {
          match: {
            domain: domain
          }
        },
        from: offset,
        size: limit
      }
    });
    
    const results = body.hits.hits.map(hit => ({
      id: hit._id,
      ...hit._source
    }));
    
    return {
      data: results,
      total: body.hits.total.value,
      page,
      limit,
      totalPages: Math.ceil(body.hits.total.value / limit)
    };
  }

  static async getAll(page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    
    const query = `
      SELECT d.id, d.filename, d.original_name, d.file_size, d.upload_date, u.username
      FROM documents d
      JOIN users u ON d.user_id = u.id
      ORDER BY d.upload_date DESC
      LIMIT $1 OFFSET $2;
    `;
    const values = [limit, offset];
    const result = await pool.query(query, values);
    
    const countQuery = 'SELECT COUNT(*) FROM documents';
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

  static async exportToCsv(searchResults) {
    const { createReadStream } = require('fs');
    const { parse } = require('json2csv');
    
    const fields = ['content', 'email', 'domain', 'upload_date'];
    const opts = { fields };
    
    try {
      const csv = parse(searchResults, opts);
      return csv;
    } catch (err) {
      throw new Error('Erro ao gerar CSV');
    }
  }

  static async exportToXlsx(searchResults) {
    const XLSX = require('xlsx');
    
    const worksheet = XLSX.utils.json_to_sheet(searchResults);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Results');
    
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return buffer;
  }
}

module.exports = Document;

// Adicionar estes métodos à classe Document

static async getTotalDocuments() {
  const query = 'SELECT COUNT(*) FROM documents';
  const result = await pool.query(query);
  return parseInt(result.rows[0].count);
}
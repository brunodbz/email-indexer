const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const { body, validationResult } = require('express-validator');
const Document = require('../models/Document');
const ActivityLog = require('../models/ActivityLog');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Upload de documento
router.post('/upload', authenticate, [
  body('document').custom((value, { req }) => {
    if (!req.files || !req.files.document) {
      throw new Error('Documento é obrigatório');
    }
    return true;
  })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { document } = req.files;
    
    // Validar tipo de arquivo
    if (!document.mimetype.includes('text/plain') && !document.name.endsWith('.txt')) {
      return res.status(400).json({ message: 'Apenas arquivos de texto (.txt) são permitidos' });
    }
    
    // Criar diretório de uploads se não existir
    const uploadDir = path.join(__dirname, '../../uploads');
    await fs.mkdir(uploadDir, { recursive: true });
    
    // Gerar nome de arquivo único
    const fileName = `${Date.now()}-${document.name}`;
    const filePath = path.join(uploadDir, fileName);
    
    // Salvar arquivo
    await document.mv(filePath);
    
    // Registrar documento no banco
    const fileData = {
      filename: fileName,
      originalName: document.name,
      size: document.size,
      path: filePath
    };
    
    const documentRecord = await Document.create(fileData, req.user.id);
    
    // Registrar atividade
    await ActivityLog.create({
      userId: req.user.id,
      action: 'document_upload',
      entityType: 'document',
      entityId: documentRecord.id,
      details: { filename: document.name, size: document.size },
      ipAddress: req.ip
    });
    
    res.status(201).json({
      message: 'Documento enviado com sucesso',
      document: {
        id: documentRecord.id,
        filename: documentRecord.original_name,
        uploadDate: documentRecord.upload_date
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao enviar documento' });
  }
});

// Buscar por domínio
router.get('/search', authenticate, [
  body('domain').notEmpty().withMessage('Domínio é obrigatório')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { domain } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    
    const results = await Document.searchByDomain(domain, page, limit);
    
    // Registrar atividade
    await ActivityLog.create({
      userId: req.user.id,
      action: 'document_search',
      entityType: 'document',
      entityId: null,
      details: { domain, results: results.total },
      ipAddress: req.ip
    });
    
    res.json(results);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao buscar documentos' });
  }
});

// Exportar resultados
router.post('/export', authenticate, [
  body('domain').notEmpty().withMessage('Domínio é obrigatório'),
  body('format').isIn(['csv', 'xlsx']).withMessage('Formato inválido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { domain, format } = req.body;
    
    // Buscar todos os resultados (sem paginação)
    const results = await Document.searchByDomain(domain, 1, 10000);
    
    let exportData;
    let contentType;
    let fileName;
    
    if (format === 'csv') {
      exportData = await Document.exportToCsv(results.data);
      contentType = 'text/csv';
      fileName = `emails_${domain}_${Date.now()}.csv`;
    } else {
      exportData = await Document.exportToXlsx(results.data);
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      fileName = `emails_${domain}_${Date.now()}.xlsx`;
    }
    
    // Registrar atividade
    await ActivityLog.create({
      userId: req.user.id,
      action: 'document_export',
      entityType: 'document',
      entityId: null,
      details: { domain, format, results: results.total },
      ipAddress: req.ip
    });
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
    res.send(exportData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao exportar documentos' });
  }
});

// Listar documentos
router.get('/', authenticate, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    
    const documents = await Document.getAll(page, limit);
    res.json(documents);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao listar documentos' });
  }
});

module.exports = router;
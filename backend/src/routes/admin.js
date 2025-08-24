const express = require('express');
const { body, validationResult } = require('express-validator');
const ActivityLog = require('../models/ActivityLog');
const SystemSettings = require('../models/SystemSettings');
const Document = require('../models/Document');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Obter painel administrativo
router.get('/dashboard', authenticate, requireAdmin, async (req, res) => {
  try {
    // Estatísticas básicas
    const totalUsers = await ActivityLog.getTotalUsers();
    const totalDocuments = await Document.getTotalDocuments();
    const totalSearches = await ActivityLog.getTotalSearches();
    const totalExports = await ActivityLog.getTotalExports();
    
    // Configurações do sistema
    const allowNewUsers = await SystemSettings.getAllowNewUsers();
    
    // Atividades recentes
    const recentActivities = await ActivityLog.getRecentActivities(10);
    
    res.json({
      stats: {
        totalUsers,
        totalDocuments,
        totalSearches,
        totalExports
      },
      settings: {
        allowNewUsers
      },
      recentActivities
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao obter painel administrativo' });
  }
});

// Listar logs de atividades
router.get('/activity-logs', authenticate, requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    
    const logs = await ActivityLog.getAll(page, limit);
    res.json(logs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao listar logs de atividades' });
  }
});

// Atualizar configurações do sistema
router.put('/settings', authenticate, requireAdmin, [
  body('allowNewUsers').isBoolean().withMessage('allowNewUsers deve ser um booleano')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { allowNewUsers } = req.body;
    
    // Atualizar configuração
    await SystemSettings.setAllowNewUsers(allowNewUsers);
    
    // Registrar atividade
    await ActivityLog.create({
      userId: req.user.id,
      action: 'settings_update',
      entityType: 'system_settings',
      entityId: null,
      details: { allowNewUsers },
      ipAddress: req.ip
    });
    
    res.json({
      message: 'Configurações atualizadas com sucesso',
      settings: {
        allowNewUsers
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao atualizar configurações' });
  }
});

module.exports = router;
const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Obter perfil do usuário atual
router.get('/profile', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      mfaEnabled: user.mfa_enabled
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao obter perfil' });
  }
});

// Atualizar senha
router.put('/password', authenticate, [
  body('currentPassword').notEmpty().withMessage('Senha atual é obrigatória'),
  body('newPassword').isLength({ min: 6 }).withMessage('Nova senha deve ter pelo menos 6 caracteres')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);
    
    // Verificar senha atual
    const bcrypt = require('bcryptjs');
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Senha atual inválida' });
    }
    
    // Atualizar senha
    await User.updatePassword(user.id, newPassword);
    
    // Registrar atividade
    await ActivityLog.create({
      userId: user.id,
      action: 'password_change',
      entityType: 'user',
      entityId: user.id,
      details: { success: true },
      ipAddress: req.ip
    });
    
    res.json({ message: 'Senha atualizada com sucesso' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao atualizar senha' });
  }
});

// Listar todos os usuários (admin)
router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const users = await User.getAll();
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao listar usuários' });
  }
});

// Criar novo usuário (admin)
router.post('/', authenticate, requireAdmin, [
  body('username').notEmpty().withMessage('Nome de usuário é obrigatório'),
  body('email').isEmail().withMessage('Email inválido'),
  body('password').isLength({ min: 6 }).withMessage('Senha deve ter pelo menos 6 caracteres'),
  body('role').isIn(['admin', 'user']).withMessage('Role inválido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { username, email, password, role } = req.body;
    
    // Verificar se usuário já existe
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: 'Email já está em uso' });
    }
    
    // Criar usuário
    const user = await User.create({ username, email, password, role });
    
    // Registrar atividade
    await ActivityLog.create({
      userId: req.user.id,
      action: 'user_create',
      entityType: 'user',
      entityId: user.id,
      details: { username, email, role },
      ipAddress: req.ip
    });
    
    res.status(201).json({
      message: 'Usuário criado com sucesso',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao criar usuário' });
  }
});

// Atualizar usuário (admin)
router.put('/:id', authenticate, requireAdmin, [
  body('username').optional().notEmpty().withMessage('Nome de usuário não pode ser vazio'),
  body('email').optional().isEmail().withMessage('Email inválido'),
  body('role').optional().isIn(['admin', 'user']).withMessage('Role inválido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { id } = req.params;
    const { username, email, role } = req.body;
    
    // Verificar se usuário existe
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    // Verificar se email já está em uso por outro usuário
    if (email && email !== user.email) {
      const existingUser = await User.findByEmail(email);
      if (existingUser && existingUser.id !== parseInt(id)) {
        return res.status(400).json({ message: 'Email já está em uso' });
      }
    }
    
    // Atualizar usuário
    const updates = {};
    if (username) updates.username = username;
    if (email) updates.email = email;
    if (role) updates.role = role;
    
    // Construir query dinâmica
    const setClause = Object.keys(updates).map((key, index) => `${key} = $${index + 2}`).join(', ');
    const values = [id, ...Object.values(updates)];
    
    const query = `
      UPDATE users 
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $1
      RETURNING id, username, email, role, is_active, mfa_enabled;
    `;
    
    const { Pool } = require('pg');
    const pool = new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });
    
    const result = await pool.query(query, values);
    const updatedUser = result.rows[0];
    
    // Registrar atividade
    await ActivityLog.create({
      userId: req.user.id,
      action: 'user_update',
      entityType: 'user',
      entityId: updatedUser.id,
      details: updates,
      ipAddress: req.ip
    });
    
    res.json({
      message: 'Usuário atualizado com sucesso',
      user: updatedUser
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao atualizar usuário' });
  }
});

// Ativar/desativar usuário (admin)
router.patch('/:id/toggle-status', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar se usuário existe
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    // Não permitir desativar a si mesmo
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ message: 'Não é possível desativar seu próprio usuário' });
    }
    
    // Atualizar status
    const isActive = await User.toggleStatus(id);
    
    // Registrar atividade
    await ActivityLog.create({
      userId: req.user.id,
      action: isActive ? 'user_activate' : 'user_deactivate',
      entityType: 'user',
      entityId: parseInt(id),
      details: { status: isActive },
      ipAddress: req.ip
    });
    
    res.json({
      message: `Usuário ${isActive ? 'ativado' : 'desativado'} com sucesso`,
      isActive
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao atualizar status do usuário' });
  }
});

// Redefinir senha (admin)
router.post('/:id/reset-password', authenticate, requireAdmin, [
  body('newPassword').isLength({ min: 6 }).withMessage('Nova senha deve ter pelo menos 6 caracteres')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { id } = req.params;
    const { newPassword } = req.body;
    
    // Verificar se usuário existe
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    // Atualizar senha
    await User.updatePassword(user.id, newPassword);
    
    // Registrar atividade
    await ActivityLog.create({
      userId: req.user.id,
      action: 'password_reset',
      entityType: 'user',
      entityId: user.id,
      details: { success: true },
      ipAddress: req.ip
    });
    
    res.json({ message: 'Senha redefinida com sucesso' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao redefinir senha' });
  }
});

// Excluir usuário (admin)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar se usuário existe
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    // Não permitir excluir a si mesmo
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ message: 'Não é possível excluir seu próprio usuário' });
    }
    
    // Excluir usuário
    await User.delete(id);
    
    // Registrar atividade
    await ActivityLog.create({
      userId: req.user.id,
      action: 'user_delete',
      entityType: 'user',
      entityId: parseInt(id),
      details: { username: user.username, email: user.email },
      ipAddress: req.ip
    });
    
    res.json({ message: 'Usuário excluído com sucesso' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao excluir usuário' });
  }
});

module.exports = router;
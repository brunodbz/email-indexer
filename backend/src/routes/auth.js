const express = require('express');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const SystemSettings = require('../models/SystemSettings');
const ActivityLog = require('../models/ActivityLog');
const { authenticate } = require('../middleware/auth');
const jwt = require('jsonwebtoken');

const router = express.Router();

// Registro de usuário
router.post('/register', [
  body('username').notEmpty().withMessage('Nome de usuário é obrigatório'),
  body('email').isEmail().withMessage('Email inválido'),
  body('password').isLength({ min: 6 }).withMessage('Senha deve ter pelo menos 6 caracteres')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    // Verificar se criação de novos usuários está permitida
    const allowNewUsers = await SystemSettings.getAllowNewUsers();
    if (!allowNewUsers) {
      return res.status(403).json({ message: 'Criação de novos usuários está desativada' });
    }
    
    const { username, email, password } = req.body;
    
    // Verificar se usuário já existe
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: 'Email já está em uso' });
    }
    
    // Verificar se é o primeiro usuário (deve ser admin)
    const firstUser = await User.getFirstUser();
    const role = firstUser ? 'user' : 'admin';
    
    // Criar usuário
    const user = await User.create({ username, email, password, role });
    
    // Registrar atividade
    await ActivityLog.create({
      userId: user.id,
      action: 'register',
      entityType: 'user',
      entityId: user.id,
      details: { username, email },
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
    res.status(500).json({ message: 'Erro ao registrar usuário' });
  }
});

// Login
router.post('/login', [
  body('email').isEmail().withMessage('Email inválido'),
  body('password').notEmpty().withMessage('Senha é obrigatória')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { email, password } = req.body;
    
    // Encontrar usuário
    const user = await User.findByEmail(email);
    if (!user || !user.is_active) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }
    
    // Verificar senha
    const bcrypt = require('bcryptjs');
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }
    
    // Registrar atividade
    await ActivityLog.create({
      userId: user.id,
      action: 'login',
      entityType: 'user',
      entityId: user.id,
      details: { email },
      ipAddress: req.ip
    });
    
    // Gerar token JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
    
    res.json({
      message: 'Login realizado com sucesso',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        mfaEnabled: user.mfa_enabled
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao fazer login' });
  }
});

// Verificação MFA
router.post('/verify-mfa', authenticate, [
  body('token').notEmpty().withMessage('Token é obrigatório')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { token } = req.body;
    const user = await User.findById(req.user.id);
    
    if (!user.mfa_secret) {
      return res.status(400).json({ message: 'MFA não configurado para este usuário' });
    }
    
    const verified = speakeasy.totp.verify({
      secret: user.mfa_secret,
      encoding: 'base32',
      token: token,
      window: 2
    });
    
    if (!verified) {
      return res.status(401).json({ message: 'Token inválido' });
    }
    
    // Registrar atividade
    await ActivityLog.create({
      userId: user.id,
      action: 'mfa_verify',
      entityType: 'user',
      entityId: user.id,
      details: { success: true },
      ipAddress: req.ip
    });
    
    res.json({ message: 'MFA verificado com sucesso' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao verificar MFA' });
  }
});

// Configurar MFA
router.post('/setup-mfa', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (user.mfa_enabled) {
      return res.status(400).json({ message: 'MFA já está configurado' });
    }
    
    // Gerar segredo
    const secret = speakeasy.generateSecret({
      name: `${process.env.MFA_ISSUER || 'EmailIndexer'} (${user.email})`,
      issuer: process.env.MFA_ISSUER || 'EmailIndexer'
    });
    
    // Salvar segredo no banco
    await User.updateMfaSecret(user.id, secret.base32);
    
    // Gerar QR Code
    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);
    
    res.json({
      secret: secret.base32,
      qrCode: qrCodeUrl
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao configurar MFA' });
  }
});

// Ativar MFA
router.post('/enable-mfa', authenticate, [
  body('token').notEmpty().withMessage('Token é obrigatório')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { token } = req.body;
    const user = await User.findById(req.user.id);
    
    if (!user.mfa_secret) {
      return res.status(400).json({ message: 'MFA não configurado para este usuário' });
    }
    
    const verified = speakeasy.totp.verify({
      secret: user.mfa_secret,
      encoding: 'base32',
      token: token,
      window: 2
    });
    
    if (!verified) {
      return res.status(401).json({ message: 'Token inválido' });
    }
    
    // Ativar MFA
    await User.enableMfa(user.id);
    
    // Registrar atividade
    await ActivityLog.create({
      userId: user.id,
      action: 'mfa_enable',
      entityType: 'user',
      entityId: user.id,
      details: { success: true },
      ipAddress: req.ip
    });
    
    res.json({ message: 'MFA ativado com sucesso' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao ativar MFA' });
  }
});

// Desativar MFA
router.post('/disable-mfa', authenticate, [
  body('password').notEmpty().withMessage('Senha é obrigatória')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { password } = req.body;
    const user = await User.findById(req.user.id);
    
    // Verificar senha
    const bcrypt = require('bcryptjs');
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Senha inválida' });
    }
    
    // Desativar MFA
    await User.disableMfa(user.id);
    
    // Registrar atividade
    await ActivityLog.create({
      userId: user.id,
      action: 'mfa_disable',
      entityType: 'user',
      entityId: user.id,
      details: { success: true },
      ipAddress: req.ip
    });
    
    res.json({ message: 'MFA desativado com sucesso' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao desativar MFA' });
  }
});

module.exports = router;
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Acesso não autorizado' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    
    if (!user || !user.is_active) {
      return res.status(401).json({ message: 'Token inválido ou usuário inativo' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token inválido' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Acesso negado. Permissão de administrador necessária.' });
  }
  next();
};

const requireMfa = (req, res, next) => {
  if (req.user.mfa_enabled) {
    return res.status(403).json({ message: 'Autenticação de dois fatores necessária' });
  }
  next();
};

module.exports = { authenticate, requireAdmin, requireMfa };
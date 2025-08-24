require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const fileUpload = require('express-fileupload');
const path = require('path');

const authRoutes = require('./src/routes/auth');
const userRoutes = require('./src/routes/users');
const documentRoutes = require('./src/routes/documents');
const adminRoutes = require('./src/routes/admin');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload({
  limits: { fileSize: process.env.MAX_FILE_SIZE || 10 * 1024 * 1024 },
  createParentPath: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // limite de 100 requisições por janela
});
app.use(limiter);

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/admin', adminRoutes);

// Servir arquivos estáticos de uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Tratamento de erros
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Erro interno do servidor' });
});

// Inicialização do servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
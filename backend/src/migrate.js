require('dotenv').config();
const User = require('./models/User');
const Document = require('./models/Document');
const ActivityLog = require('./models/ActivityLog');
const SystemSettings = require('./models/SystemSettings');

async function migrate() {
  try {
    console.log('Criando tabelas...');
    await User.createTable();
    await Document.createTable();
    await ActivityLog.createTable();
    await SystemSettings.createTable();
    console.log('Migração concluída com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('Erro na migração:', error);
    process.exit(1);
  }
}

migrate();
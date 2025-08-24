FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

# Adicionar script para migração do banco de dados
COPY src/migrate.js /app/src/migrate.js
RUN chmod +x /app/src/migrate.js

EXPOSE 3000

CMD ["npm", "start"]
# Build stage
FROM node:18-alpine AS build
WORKDIR /app

# Copiar package.json e package-lock.json primeiro
COPY package*.json ./
RUN npm install

# Copiar todo o conteúdo do projeto
COPY . .

# Construir a aplicação
RUN npm run build

# Production stage
FROM nginx:alpine

# Copiar os arquivos de build
COPY --from=build /app/build /usr/share/nginx/html

# Copiar o arquivo de configuração do nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
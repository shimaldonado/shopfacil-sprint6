# Usar imagen oficial de Node.js
FROM node:18-alpine

# Crear carpeta de trabajo dentro del contenedor
WORKDIR /app

# Copiar package.json e instalar dependencias
COPY package*.json ./
RUN npm install

# Copiar el resto del código
COPY . .

# Exponer el puerto del servidor
EXPOSE 3000

# Comando para arrancar el servidor
CMD ["node", "src/index.js"]
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate --schema=src/prisma/schema.prisma && npm run build
EXPOSE 3333
CMD ["node", "dist/server.js"]

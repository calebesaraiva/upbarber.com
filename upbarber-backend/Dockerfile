FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM deps AS build
COPY . .
RUN npx prisma generate --schema=src/prisma/schema.prisma
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
COPY --from=build /app/src/prisma ./src/prisma
COPY --from=build /app/node_modules ./node_modules
COPY package*.json ./
COPY .env.example ./
RUN mkdir -p uploads
EXPOSE 3333
CMD ["node", "dist/server.js"]

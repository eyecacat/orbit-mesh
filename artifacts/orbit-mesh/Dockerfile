FROM node:18-alpine

RUN npm install -g pnpm

WORKDIR /app

COPY . .

RUN pnpm i --no-frozen-lockfile

ENV EXPO_PUBLIC_DOMAIN=orbit-mesh-production.up.railway.app

RUN node artifacts/orbit-mesh/scripts/build.js

EXPOSE 3000

CMD ["node", "artifacts/orbit-mesh/server/serve.js"]

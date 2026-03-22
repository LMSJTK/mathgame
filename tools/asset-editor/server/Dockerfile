FROM node:20-alpine

WORKDIR /usr/src/app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 4174

CMD ["npx", "tsx", "server.ts"]

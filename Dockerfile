FROM node:12-alpine

RUN apk update; apk add tzdata

RUN ln -sf /usr/share/zoneinfo/Asia/Jakarta /etc/localtime

WORKDIR /app
COPY package.json .
RUN npm install
COPY . .

ENV NODE_ENV production

ENTRYPOINT [ "node", "index.js"]

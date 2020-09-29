FROM node:12-alpine

RUN apk add tzdata
RUN ln -sf /usr/share/zoneinfo/Asia/Jakarta /etc/localtime

# create app directory
WORKDIR /app

COPY package.json ./

RUN npm install --save

# Bundle app source
COPY . .

# Run the command on container startup
ENTRYPOINT ["npm", "start"]

FROM node:20-alpine

WORKDIR /app

COPY package*.json tsconfig.json ./

RUN npm install

COPY src ./src

COPY test.xml ./test.xml

RUN npx tsc

CMD ["node", "dist/index.js"]

FROM oven/bun:latest

WORKDIR /app

COPY package*.json ./
RUN bun install

COPY . .

EXPOSE 5000 5001

CMD [ "bun", "run", "main.js" ]

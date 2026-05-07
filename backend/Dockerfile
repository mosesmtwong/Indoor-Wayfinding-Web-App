FROM node:20-alpine

WORKDIR /app

# Copy package files first for better layer caching
COPY package.json package-lock.json* ./

RUN npm install --production

# Copy the rest of the source code
COPY . .

# Expose the API port
EXPOSE 3001

# Seed the database and start the server
CMD ["sh", "-c", "node seed.js && node src/app.js"]

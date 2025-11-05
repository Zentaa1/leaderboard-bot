# Use an official Node image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files and install deps
COPY package*.json ./
RUN npm install --production

# Copy source files
COPY . .

# Start the bot
CMD ["npm", "start"]
FROM node:20-alpine

WORKDIR /usr/src/app

# Copy editor package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy editor source
COPY . .

# Build the editor for production
RUN npm run build

# Serve the built output with a lightweight static server
RUN npm install -g serve

EXPOSE 5180

CMD ["serve", "-s", "dist", "-l", "5180"]

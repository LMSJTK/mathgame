# Use an official Node runtime as a parent image
# Using alpine for a smaller image footprint
FROM node:20-alpine

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install project dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# The server.mjs uses port 4173 by default, or the PORT env var.
# Let's set it explicitly to 4173.
ENV PORT=4173

# Expose the port the app runs on
EXPOSE 4173

# Command to run the application
CMD ["npm", "start"]
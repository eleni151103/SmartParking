# =============================================================================
# Frontend Dockerfile - React/Vite Application
# =============================================================================
# Builds the React frontend with Vite dev server.
# Runs on port 5173 with hot module replacement enabled.
# =============================================================================

# Use official Node.js Alpine image (smaller size)
FROM node:20-alpine

# Set working directory inside container
WORKDIR /app

# Copy package files first (for Docker layer caching)
COPY package.json package-lock.json* ./

# Install npm dependencies
RUN npm install

# Copy all source code
COPY . .

# Expose Vite dev server port
EXPOSE 5173

# Run Vite dev server (--host allows external connections)
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

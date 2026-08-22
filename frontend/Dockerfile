# ==========================================
# Stage 1: Build stage
# ==========================================
FROM node:20-alpine AS build

WORKDIR /app

# Install dependencies based on package-lock.json
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code
COPY . .

# Environment variables for build time (Vite uses import.meta.env)
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# Build production bundle to /app/dist
RUN npm run build

# ==========================================
# Stage 2: Production runtime stage
# ==========================================
FROM nginx:1.27-alpine AS production

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy build artifacts from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Run Nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]

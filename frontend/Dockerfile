# --- Build ---------------------------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Empty VITE_API_URL = same origin; nginx below proxies /api to the backend.
ARG VITE_API_URL=""
ARG VITE_SITE_URL="http://localhost:8080"
ENV VITE_API_URL=$VITE_API_URL VITE_SITE_URL=$VITE_SITE_URL
RUN npm run build

# --- Serve ---------------------------------------------------------------------
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
# Where nginx forwards /api requests (the backend service in docker-compose).
ENV API_UPSTREAM=http://backend:8000
EXPOSE 80

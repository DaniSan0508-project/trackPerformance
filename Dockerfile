# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

ARG VITE_API_SECRET
ENV VITE_API_SECRET=$VITE_API_SECRET

ARG VITE_ENABLE_DEMO_DASHBOARD
ENV VITE_ENABLE_DEMO_DASHBOARD=$VITE_ENABLE_DEMO_DASHBOARD

ARG VITE_DEFAULT_DOMAIN
ENV VITE_DEFAULT_DOMAIN=$VITE_DEFAULT_DOMAIN

RUN npm run build

# Production stage
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

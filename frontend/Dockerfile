# Build stage
FROM node:20-alpine AS builder

WORKDIR /build
COPY package.json package-lock.json* ./
RUN npm install

COPY . .
RUN npm run build:h5

# Runtime stage
FROM nginx:alpine

COPY --from=builder /build/dist/build/h5 /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS build

WORKDIR /app

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

ARG VITE_API_URL=/api
ARG VITE_RETRY_DELAY=3000
ARG VITE_RETRY_MAX_ATTEMPTS=3
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_RETRY_DELAY=$VITE_RETRY_DELAY
ENV VITE_RETRY_MAX_ATTEMPTS=$VITE_RETRY_MAX_ATTEMPTS

RUN pnpm build

FROM nginx:1.27-alpine AS runtime

RUN <<'EOF'
cat > /etc/nginx/conf.d/default.conf <<'NGINX'
server {
  listen 3000;
  server_name _;

  root /usr/share/nginx/html;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }

  location /assets/ {
    try_files $uri =404;
    expires 1y;
    add_header Cache-Control "public, immutable";
  }
}
NGINX
EOF

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]

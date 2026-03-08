FROM node:20-alpine AS builder

WORKDIR /app

ARG VITE_USE_MOCK_API=false
ENV VITE_USE_MOCK_API=${VITE_USE_MOCK_API}

COPY package*.json /app/
RUN npm install

COPY . /app
RUN npm run build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

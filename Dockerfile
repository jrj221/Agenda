FROM node:22-alpine
WORKDIR /app
COPY server/sync-server.mjs ./server/
COPY server/package.json ./server/
RUN cd server && npm install --omit=dev
EXPOSE 8080
ENV PORT=8080
CMD ["node", "server/sync-server.mjs"]

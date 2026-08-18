FROM node:24.18.0-alpine@sha256:a0b9bf06e4e6193cf7a0f58816cc935ff8c2a908f81e6f1a95432d679c54fbfd

WORKDIR /app

RUN npm install -g mcp-remote@0.1.38 --ignore-scripts \
    && npm cache clean --force

COPY glama-stdio-wrapper.mjs /app/glama-stdio-wrapper.mjs

ENV NODE_ENV=production

USER node

CMD ["node", "/app/glama-stdio-wrapper.mjs"]

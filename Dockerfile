FROM node:24.22.2-alpine@sha256:8a32c8cf649a49915a66e81e7a609223c708d0adabf288ee3f4077d765542f85

WORKDIR /app

# The wrapper starts mcp-remote with node and never runs a package manager, so
# remove the bundled ones in this same layer.
RUN npm install -g mcp-remote@0.1.49 --ignore-scripts \
    && npm cache clean --force \
    && rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
        /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack \
        /opt/yarn-v* /usr/local/bin/yarn /usr/local/bin/yarnpkg /root/.npm

COPY glama-stdio-wrapper.mjs /app/glama-stdio-wrapper.mjs

ENV NODE_ENV=production

USER node

CMD ["node", "/app/glama-stdio-wrapper.mjs"]

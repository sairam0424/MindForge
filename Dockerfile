# MindForge MCP server — container image for the Docker MCP Catalog.
#
# The MCP server is a single self-contained bundle (esbuild inlines the MCP SDK + Zod;
# zero runtime node_modules), so installing the published npm package is trivial and robust.
# It runs headless, scoping all reads to CLAUDE_PROJECT_DIR (the mounted project).
#
# Pin MINDFORGE_MCP_VERSION at build time to the release you are publishing to the catalog:
#   docker build --build-arg MINDFORGE_MCP_VERSION=11.5.1 -t mindforge-mcp .

FROM node:22-bookworm-slim AS build

ARG MINDFORGE_MCP_VERSION=11.5.1

WORKDIR /opt/mindforge
RUN npm init -y >/dev/null 2>&1 \
    && npm install --omit=dev --no-audit --no-fund "mindforge-mcp-server@${MINDFORGE_MCP_VERSION}"

FROM node:22-bookworm-slim AS runtime

LABEL org.opencontainers.image.title="MindForge MCP Server" \
      org.opencontainers.image.description="Read the MindForge engine — knowledge graph, project health, and audit log — over the Model Context Protocol (stdio)." \
      org.opencontainers.image.source="https://github.com/sairam0424/MindForge" \
      org.opencontainers.image.licenses="MIT"

ENV NODE_ENV=production

# Non-root: the server only reads/append-writes within the mounted project dir.
RUN useradd --create-home --shell /usr/sbin/nologin mindforge
WORKDIR /home/mindforge/app

COPY --from=build /opt/mindforge/node_modules ./node_modules

USER mindforge

# stdio JSON-RPC transport. Mount the target project and pass its path:
#   docker run -i --rm -v "$PWD:/project" -e CLAUDE_PROJECT_DIR=/project mindforge-mcp
ENTRYPOINT ["node", "node_modules/mindforge-mcp-server/dist/index.js"]

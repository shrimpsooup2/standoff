# The introduction service, for anywhere that takes a container.
#
# It is the same server that hosts a game on a laptop; deployed in public it is
# doing the smaller job of letting two browsers find each other. See render.yaml
# for what to do with the address once it is running.

FROM node:22-slim
WORKDIR /app
COPY package.json ./
COPY server.js ./
COPY src ./src
COPY public ./public
ENV PORT=8787
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8787)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]

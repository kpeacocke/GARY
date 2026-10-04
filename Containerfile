FROM registry.access.redhat.com/ubi9/nodejs-22-minimal

WORKDIR /opt/app-root/src
COPY --chown=1001:0 package.json ./
COPY --chown=1001:0 app ./app

ENV NODE_ENV=production \
    PORT=8080
EXPOSE 8080

USER 1001
CMD ["node", "app/server/index.js"]

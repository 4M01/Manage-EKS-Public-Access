FROM node:22-alpine AS builder

WORKDIR /action
COPY package*.json ./
RUN npm ci
COPY tsconfig*.json ./
COPY src/ src/
RUN npm run build

FROM node:22-alpine
RUN apk add --no-cache tini
COPY --from=builder action/package.json .
COPY --from=builder action/dist dist/
COPY --from=builder action/node_modules node_modules/
ENTRYPOINT [ "/sbin/tini", "--", "node", "/dist/index.js" ]


# # RUN chmod +x /dist/index.js
# RUN ["chmod", "+x", "/dist/index.js"]

# # Run the command by default when the container starts
# CMD ["node", "dist/index.js"]

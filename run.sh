set +e && npx tsc
set -xe && ./node_modules/.bin/node-pg-migrate up
node dist/index.mjs

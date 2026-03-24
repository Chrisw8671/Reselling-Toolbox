module.exports = {
  apps: [{
    name: 'reseller-app',
    script: 'node',
    args: 'node_modules\\next\\dist\\bin\\next dev --hostname 0.0.0.0 --port 3000',
    autorestart: true,
    watch: false,
    env: { NODE_ENV: 'development' }
  }]
};
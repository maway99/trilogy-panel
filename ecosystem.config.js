module.exports = {
  apps: [{
    name: 'trilogy-panel',
    script: 'server.js',
    watch: false,
    restart_delay: 2000,
    max_restarts: 50,
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}

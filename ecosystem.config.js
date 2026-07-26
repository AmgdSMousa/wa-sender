module.exports = {
  apps: [
    {
      name: 'wa-sender',
      script: 'node_modules/next/dist/bin/next',
      args: 'dev -p 3000',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      }
    }
  ]
};

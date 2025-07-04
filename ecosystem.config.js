module.exports = {
  apps: [
    {
      name: 'autogolfer',
      cwd: '/home/altiplano/autogolfer/dist',
      script: 'main.js',
      env: {
        ACTIVE_GAME: 'spiral',
        GAME_ID: '4',
        STATION_ID: 'RPI-01',
        MODE: 'PROD',
        API_BASE: 'https://vmi693601.contaboserver.net:9010/api/game-manager',
      },
    },
  ],
};

const nodeEnv = process.env.NODE_ENV || 'development';

export const WS_Origin = nodeEnv === 'production'
  ? ['https://jukebar.ovh', 'https://www.jukebar.ovh']
  : 'http://localhost:5173';

export const WEBSOCKET_CONFIG = {
  cors: {
    origin: WS_Origin,
    methods: ['GET', 'POST'],
    credentials: true,
  },
};

if (process.env.NODE_ENV === 'production') {
    const origin = "https://jukebar.ovh";
}else{
    const origin = "*";
}


export const WEBSOCKET_CONFIG = {
    cors: {
        origin: origin,
    },
    namespace: '/price-updates',
};

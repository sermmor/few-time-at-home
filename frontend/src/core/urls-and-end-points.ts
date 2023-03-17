const ip = '192.168.1.120'; // 'localhost';
const port = '3001';

export let URL_API = `http://${ip}:${port}`;

export const queryRssEndpoint  = (nameEndpoint: 'all' | 'mastodon' | 'twitter' | 'blog', amount: number): string => `${URL_API}/rss/${nameEndpoint}?amount=${amount}`;
export const configurationEndpoint = `${URL_API}/rss/configuration`;

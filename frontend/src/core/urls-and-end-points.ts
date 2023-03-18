const ip = '192.168.1.120'; // 'localhost';
const port = '3001';

const URL_API = `http://${ip}:${port}`;

export const IS_USING_MOCKS = false;

export const queryRssEndpoint  = (nameEndpoint: 'all' | 'mastodon' | 'twitter' | 'blog', amount: number): string => `${URL_API}/rss/${nameEndpoint}?amount=${amount}`;
export const configurationEndpoint = `${URL_API}/rss/configuration`;

const ip = '192.168.1.120'; // 'localhost';
const port = '3001';

export let URL_API = `http://${ip}:${port}`;

// export const queryAllRssEndpoint  = (amount: number) => `${URL_API}/rss/all?amount=${amount}`;
// export const queryRssMastoEndpoint  = (amount: number) => `${URL_API}/rss/mastodon?amount=${amount}`;
// export const queryRssTwitterEndpoint  = (amount: number) => `${URL_API}/rss/twitter?amount=${amount}`;
// export const queryRssBlogEndpoint  = (amount: number) => `${URL_API}/rss/blog?amount=${amount}`;
export const queryRssEndpoint  = (nameEndpoint: 'all' | 'mastodon' | 'twitter' | 'blog', amount: number): string => `${URL_API}/rss/${nameEndpoint}?amount=${amount}`;
export const configurationEndpoint = `${URL_API}/rss/configuration`;

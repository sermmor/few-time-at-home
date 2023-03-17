const ip = 'localhost';
const port = '3001';

export let URL_API = `http://${ip}:${port}`;

export const queryAllRssEndpoint  = (amount: number) => `${URL_API}/rss/all?amount=${amount}`;
export const queryRssMastoEndpoint  = (amount: number) => `${URL_API}/rss/mastodon?amount=${amount}`;
export const queryRssTwitterEndpoint  = (amount: number) => `${URL_API}/rss/twitter?amount=${amount}`;
export const queryRssBlogEndpoint  = (amount: number) => `${URL_API}/rss/blog?amount=${amount}`;
export const configurationEndpoint = `${URL_API}/rss/configuration`;

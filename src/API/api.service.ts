import express, {Express, Request, Response} from 'express';
import { ChannelMediaRSSCollection, TelegramBotCommand } from './messagesRSS.service';

const cors = require('cors');

export class APIService {
    static getAllRssEndpoint  = "/rss/all"; // query: http://localhost:${port}/rss/all?amount=20
    static getRssMastoEndpoint  = "/rss/mastodon";
    static getRssTwitterEndpoint  = "/rss/twitter";
    static getRssBlogEndpoint  = "/rss/blog";

    app: Express;

    constructor(
        private channelMediaCollection: ChannelMediaRSSCollection,
        private commands: TelegramBotCommand,
        apiPort: number
    ) {
        this.app = express();
        this.app.use(express.json())
        this.app.use(cors());

        this.getRSS(APIService.getAllRssEndpoint, this.commands.onCommandAll);
        this.getRSS(APIService.getRssMastoEndpoint, this.commands.onCommandMasto);
        this.getRSS(APIService.getRssTwitterEndpoint, this.commands.onCommandNitter);
        this.getRSS(APIService.getRssBlogEndpoint, this.commands.onCommandBlog);
        
        this.app.listen(apiPort, () => {
            console.log("> Server ready!");
        });
    }

    getRSS = (endpoint: string, rssCommand: () => Promise<string[]>) => {
        this.app.get(endpoint, (req, res) => {
            const webNumberOfMessagesWithLinks: number = req.query.amount ? +req.query.amount : 0;
            rssCommand().then(messagesToSend => {
                const messages = messagesToSend.slice(messagesToSend.length - webNumberOfMessagesWithLinks);
                res.send({ messages });
            });
        });
    }
}
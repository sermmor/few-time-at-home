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

        this.getAllRSS();
        this.getMastoRSS();
        this.getBlogRSS();
        this.getNitterRSS();
        

        this.app.listen(apiPort, () => {
            console.log("> Server ready!");
        });
    }

    getAllRSS = () => {
        this.app.get(APIService.getAllRssEndpoint, (req, res) => {
            const webNumberOfMessagesWithLinks: number = req.query.amount ? +req.query.amount : 0;
            this.commands.onCommandAll().then(messagesToSend => {
                const messages = messagesToSend.slice(messagesToSend.length - webNumberOfMessagesWithLinks);
                res.send({ messages });
            });
        });
    }

    getMastoRSS = () => {
        this.app.get(APIService.getRssMastoEndpoint, (req, res) => {
            const webNumberOfMastoWithLinks: number = req.query.amount ? +req.query.amount : 0;
            this.commands.onCommandMasto().then(messagesToSend => {
                const messages = messagesToSend.slice(messagesToSend.length - webNumberOfMastoWithLinks);
                res.send({ messages });
            });
        });
    }

    getNitterRSS = () => {
        this.app.get(APIService.getRssTwitterEndpoint, (req, res) => {
            const webNumberOfTuitsWithLinks: number = req.query.amount ? +req.query.amount : 0;
            this.commands.onCommandNitter().then(messagesToSend => {
                const messages = messagesToSend.slice(messagesToSend.length - webNumberOfTuitsWithLinks);
                res.send({ messages });
            });
        });
    }

    getBlogRSS = () => {
        this.app.get(APIService.getRssBlogEndpoint, (req, res) => {
            const webNumberOfPostsWithLinks: number = req.query.amount ? +req.query.amount : 0;
            this.commands.onCommandBlog().then(messagesToSend => {
                const messages = messagesToSend.slice(messagesToSend.length - webNumberOfPostsWithLinks);
                res.send({ messages });
            });
        });
    }
}
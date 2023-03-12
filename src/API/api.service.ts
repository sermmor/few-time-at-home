import express, {Express, Request, Response} from 'express';
import { ConfigurationService } from './configuration.service';
import { ChannelMediaRSSCollection, TelegramBotCommand } from './messagesRSS.service';

const cors = require('cors');

export class APIService {
    static getAllRssEndpoint  = "/rss/all"; // query: http://localhost:${port}/rss/all?amount=20
    static getRssMastoEndpoint  = "/rss/mastodon";
    static getRssTwitterEndpoint  = "/rss/twitter";
    static getRssBlogEndpoint  = "/rss/blog";
    static configurationEndpoint = "/rss/configuration";


    app: Express;

    constructor(
        private channelMediaCollection: ChannelMediaRSSCollection,
        private commands: TelegramBotCommand,
    ) {
        this.app = express();
        this.app.use(express.json())
        this.app.use(cors());

        this.getRSS(APIService.getAllRssEndpoint, this.commands.onCommandAll);
        this.getRSS(APIService.getRssMastoEndpoint, this.commands.onCommandMasto);
        this.getRSS(APIService.getRssTwitterEndpoint, this.commands.onCommandNitter);
        this.getRSS(APIService.getRssBlogEndpoint, this.commands.onCommandBlog);
        this.configurationService();
        
        this.app.listen(ConfigurationService.Instance.apiPort, () => {
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

    private configurationService() {
        this.app.post(APIService.configurationEndpoint, (req, res) => {
            if (!req.body) {
                console.error("Received NO body JSON");
            } else {
            //     if (req.body.twitter_beared) ConfigurationManager.Instance.twitter_beared = req.body.twitter_beared;
            //     if (req.body.is_academic_research_key !== undefined) ConfigurationManager.Instance.is_academic_research_key = req.body.is_academic_research_key;
            //     if (req.body.number_of_messages_in_profile) ConfigurationManager.Instance.number_of_messages_in_profile = req.body.number_of_messages_in_profile;
            //     if (req.body.database_url) ConfigurationManager.Instance.database_url = req.body.database_url;
            //     if (req.body.minutes_to_reflesh) ConfigurationManager.Instance.minutes_to_reflesh = req.body.minutes_to_reflesh;
            //     if (req.body.verificator_list) ConfigurationManager.Instance.verificator_list = req.body.verificator_list;
                
            //     ConfigurationManager.Instance.saveConfiguration();
                ConfigurationService.Instance.updateConfiguration(this.channelMediaCollection, req.body);
            }
            res.send(ConfigurationService.Instance.getConfigurationJson());
        });

        this.app.get(APIService.configurationEndpoint, (req, res) => {
            res.send(ConfigurationService.Instance.getConfigurationJson());
        });
    }
}
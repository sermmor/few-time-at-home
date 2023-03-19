import { saveInAFile } from "../utils";
import { ChannelMediaRSSCollection } from "./messagesRSS.service";

const pathConfigFile = 'configuration.json';

export class ConfigurationService {
    static Instance: ConfigurationService;

    nitterInstancesList: string[];
    nitterRssUsersList: string[];
    mastodonRssUsersList:
        {
        instance: string;
        user: string;
        }[];
    blogRssList: string[];
    listBotCommands: {
        bot_all_command: string;
        bot_masto_command: string;
        bot_nitter_command: string;
        bot_blog_command: string;
        bot_notes_command: string;
    };
    numberOfWorkers: number;
    apiPort: number;
    
    constructor(configurationData: any) {
        this.nitterInstancesList = configurationData.nitterInstancesList;
        this.nitterRssUsersList = configurationData.nitterRssUsersList;
        this.mastodonRssUsersList = configurationData.mastodonRssUsersList;
        this.blogRssList = configurationData.blogRssList;
        this.listBotCommands = configurationData.listBotCommands;
        this.numberOfWorkers = configurationData.numberOfWorkers;
        this.apiPort = configurationData.apiPort;

        ConfigurationService.Instance = this;
    }

    getConfigurationJson = () => ({
        nitterInstancesList: this.nitterInstancesList,
        nitterRssUsersList: this.nitterRssUsersList,
        mastodonRssUsersList: this.mastodonRssUsersList,
        blogRssList: this.blogRssList,
        listBotCommands: this.listBotCommands,
        numberOfWorkers: this.numberOfWorkers,
        apiPort: this.apiPort,
    })

    updateConfiguration = (channelMediaCollection: ChannelMediaRSSCollection, body: any) => {
        if (body.nitterInstancesList) this.nitterInstancesList = body.nitterInstancesList;
        if (body.nitterRssUsersList) this.nitterRssUsersList = body.nitterRssUsersList;
        if (body.mastodonRssUsersList) this.mastodonRssUsersList = body.mastodonRssUsersList;
        if (body.blogRssList) this.blogRssList = body.blogRssList;
        if (body.listBotCommands) this.listBotCommands = body.listBotCommands;
        if (body.numberOfWorkers) this.numberOfWorkers = body.numberOfWorkers;
        if (body.apiPort) this.apiPort = body.apiPort;

        this.saveConfiguration();

        channelMediaCollection.blogRSS.refleshChannelMediaConfiguration();
        channelMediaCollection.mastodonRSS.refleshChannelMediaConfiguration();
        channelMediaCollection.nitterRSS.refleshChannelMediaConfiguration();

        console.log("> Configuration changed!");
    }

    private saveConfiguration = () => {
        saveInAFile(JSON.stringify(this.getConfigurationJson(), null, 2), pathConfigFile);
    }
}
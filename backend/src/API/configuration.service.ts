import { Quote } from "../quote/quoteList";
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
    youtubeRssList: string[];
    listBotCommands: {
        bot_all_command: string;
        bot_masto_command: string;
        bot_nitter_command: string;
        bot_blog_command: string;
        bot_youtube_command: string;
        bot_notes_command: string;
        bot_add_notes_command: string;
        bot_add_bookmark_command: string;
        bot_search_bookmark_command: string;
        bot_add_alert: string;
    };
    quoteList: Quote[];
    backupUrls: string;
    showNitterRSSInAll: boolean;
    numberOfWorkers: number;
    apiPort: number;
    
    constructor(configurationData: any) {
        this.nitterInstancesList = configurationData.nitterInstancesList;
        this.nitterRssUsersList = configurationData.nitterRssUsersList;
        this.mastodonRssUsersList = configurationData.mastodonRssUsersList;
        this.blogRssList = configurationData.blogRssList;
        this.youtubeRssList = configurationData.youtubeRssList;
        this.listBotCommands = configurationData.listBotCommands;
        this.showNitterRSSInAll = configurationData.showNitterRSSInAll;
        this.numberOfWorkers = configurationData.numberOfWorkers;
        this.backupUrls = configurationData.backupUrls;
        this.apiPort = configurationData.apiPort;
        this.quoteList = configurationData.quoteList;

        ConfigurationService.Instance = this;
    }

    getConfigurationJson = () => ({
        nitterInstancesList: this.nitterInstancesList,
        nitterRssUsersList: this.nitterRssUsersList,
        mastodonRssUsersList: this.mastodonRssUsersList,
        blogRssList: this.blogRssList,
        youtubeRssList: this.youtubeRssList,
        listBotCommands: this.listBotCommands,
        quoteList: this.quoteList,
        backupUrls: this.backupUrls,
        showNitterRSSInAll: this.showNitterRSSInAll,
        numberOfWorkers: this.numberOfWorkers,
        apiPort: this.apiPort,
    })

    updateConfiguration = (channelMediaCollection: ChannelMediaRSSCollection, body: any): Promise<void> => new Promise<void>(resolve => {
        if (body.nitterInstancesList) this.nitterInstancesList = body.nitterInstancesList;
        if (body.nitterRssUsersList) this.nitterRssUsersList = body.nitterRssUsersList;
        if (body.mastodonRssUsersList) this.mastodonRssUsersList = body.mastodonRssUsersList;
        if (body.blogRssList) this.blogRssList = body.blogRssList;
        if (body.youtubeRssList) this.youtubeRssList = body.youtubeRssList;
        if (body.listBotCommands) this.listBotCommands = body.listBotCommands;
        if (body.quoteList) this.quoteList = body.quoteList;
        if (body.backupUrls) this.backupUrls = body.backupUrls;
        if (body.showNitterRSSInAll !== undefined) this.showNitterRSSInAll = body.showNitterRSSInAll;
        if (body.numberOfWorkers) this.numberOfWorkers = body.numberOfWorkers;
        if (body.apiPort) this.apiPort = body.apiPort;

        this.saveConfiguration();

        channelMediaCollection.blogRSS.refleshChannelMediaConfiguration();
        channelMediaCollection.mastodonRSS.refleshChannelMediaConfiguration();
        channelMediaCollection.nitterRSS.refleshChannelMediaConfiguration();
        channelMediaCollection.youtubeRSS.refleshChannelMediaConfiguration().then(() => {
          console.log("> Configuration changed!");
          resolve();
        });
    });

    private saveConfiguration = () => {
        saveInAFile(JSON.stringify(this.getConfigurationJson(), null, 2), pathConfigFile);
    }
}
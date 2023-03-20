import express, {Express, Request, Response} from 'express';
import { QuoteListUtilities } from '../quote/quoteList';
import { ConfigurationService } from './configuration.service';
import { ChannelMediaRSSCollection, TelegramBotCommand } from './messagesRSS.service';
import { NotesService } from './notes.service';

const cors = require('cors');

export class APIService {
  static getAllRssEndpoint  = "/rss/all"; // query: http://localhost:${port}/rss/all?amount=20
  static getRssMastoEndpoint  = "/rss/mastodon";
  static getRssTwitterEndpoint  = "/rss/twitter";
  static getRssBlogEndpoint  = "/rss/blog";
  static configurationEndpoint = "/configuration";
  static notesEndpoint = "/notes";
  static quoteEndpoint = "/random-quote";
  
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
    this.getRandomQuote();
    this.notesService();
    
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
            ConfigurationService.Instance.updateConfiguration(this.channelMediaCollection, req.body);
        }
        res.send(ConfigurationService.Instance.getConfigurationJson());
    });

    this.app.get(APIService.configurationEndpoint, (req, res) => {
        res.send(ConfigurationService.Instance.getConfigurationJson());
    });
  }

  private notesService() {
    const notes = new NotesService();
    notes.getNotes();
    this.app.post(APIService.notesEndpoint, (req, res) => {
        if (!req.body) {
            console.error("Received NO body text");
        } else {
            NotesService.Instance.updateNotes(req.body.data).then(data => res.send({data}));
        }
    });

    this.app.get(APIService.notesEndpoint, (req, res) => {
      NotesService.Instance.getNotes().then(data => res.send({data}));
    });
  }

  private getRandomQuote() {
    this.app.get(APIService.quoteEndpoint, (req, res) => {
      res.send(QuoteListUtilities.getAInspirationalQuote(ConfigurationService.Instance.quoteList));
    });
  }
}
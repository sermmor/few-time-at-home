# Rss Link To Telegram Bot
Telegram bot in NodeJS for get n number of links of a Nitter profile timeline.

# Install
For install the bot, use the following console command:
```shell
$ npm install
```

# Configuration
In root folder, create a video folder and put two videos: finished.mp4 and start.mp4.

In root folder, create a file `networks.json` and put the following content for your data:
```javascript
{
    "telegram_bot_token": "",
    "bot_tuit_command": "",
}
```

About Telegram *telegram_bot_token*, it is a token that you can have creating your Telegram bot app using the BotFather. You can see a tutorial about [create bot with BotFather in the official Telegram documentation](https://core.telegram.org/bots#6-botfather).

About *bot_tuit_command*, you can put the command that you want to send from Telegram client to your bot for getting the TL or list links.

So, the final folder structure will be the following:

![finalPathScript](https://raw.githubusercontent.com/sermmor/twitter-link-telegram-bot/master/images/finalPathScript.png)

# Start the bot
For start the bot, you have to to launch the following console command:
```shell
$ npm start
```

# Use the bot
For start the bot send `\start`.

For get links from rss, you have to send `\[*bot_tuit_command*][number ending in 10]`. For instance if our *bot_tuit_command* is *"MyTLIsGreat"*, and you want 400 links with links, the command to send from client will be `\MyTLIsGreat400`.

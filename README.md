# FewTime@Home
The main idea of this project is tools to connect with home when you spend a lot of time out of home. So the backend can be you PC at home, and the front or Telegram Bot are your mobile, tablet or latop. So you can be secure using the Telegram Bot to communicate with home or using the front to create a local copy that when you arrive to home will be syncronized.

## Prerequisites

Before you begin, ensure you have met the following requirements:

* You have installed [Node.js](https://nodejs.org/en/download/).
* You have installed [FFmpeg](https://ffmpeg.org/download.html).
* FFmpeg is added to the system PATH.

### Installing FFmpeg on Windows

1. Download FFmpeg from the [official site](https://ffmpeg.org/download.html). Choose the link that matches your system architecture (32 or 64 bit).
2. Extract the downloaded file. You will get a folder, which includes three sub-folders (bin, doc, presets).
3. Add FFmpeg to Windows PATH:
    * Right-click on Computer and choose Properties.
    * Choose Advanced system settings.
    * In the System Properties window, choose Environment Variables.
    * In the Environment Variables window, you will see a list of User variables and System variables. Under System variables, find and select the variable named Path, then click on Edit.
    * In the Edit Environment Variable window, move the cursor to the end of the Variable value line, add a semicolon (;) and then add the path to the 'bin' directory in the FFmpeg folder you downloaded earlier. For example, if you extracted FFmpeg to `C:\FFmpeg`, you would add `C:\FFmpeg\bin`.
    * Click OK to close each window.

### Installing FFmpeg on Linux (Ubuntu)

On Ubuntu, you can install FFmpeg from the official repositories by running the following command in your terminal:

```bash
sudo apt update
sudo apt install ffmpeg
```
## More prerequisites

Install Lame for mp3 converter.

### Install on Debian

```bash
$ sudo apt-get install lame
```

### Install on MacOS with brew

```bash
$ brew install lame
```

### Install on Windows

1. Go to the the [Lame Download Page](https://lame.buanzo.org/#lamewindl) and download the EXE or ZIP file.
2. Navigate to the directory Lame was installed in (most commonly `C:\Program Files (x86)\Lame For Audacity`).
3. Add the directory to your [Environment Variables](https://www.java.com/en/download/help/path.xml).

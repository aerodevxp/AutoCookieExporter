# Cookie Exporter

A simple Dockerized Playwright script that visits a list of websites, grabs the cookies, and exports them to a combined `cookies.txt` (Netscape format) and `cookies.json` file. 

I use this to keep cookies fresh for yt-dlp and MeTube without having to manually export cookies from my personal devices. It only spins up for a few seconds, grabs what it needs, and shuts down.

## Setup

1. Put your `Dockerfile`, `cookie-exporter.js`, and `sites.txt` in a folder, or clone the repo.
2. Add a list of URLs to `sites.txt`, one per line:
```text
https://www.youtube.com
https://www.abc.com
https://x.com
https://facebook.com
```

I use crontab on Linux to periodically start the container, but the Task Scheduler will also work on Windows machines.

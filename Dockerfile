FROM node:20-slim

# Install dependencies for Patchright/Chromium, Xvfb, and noVNC
RUN apt-get update && apt-get install -y \
    libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
    libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
    libgbm1 libpango-1.0-0 libcairo2 libasound2 \
    x11vnc xvfb \
    novnc websockify \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
RUN npm init -y && npm install patchright fs-extra path
RUN npx patchright install chromium

COPY cookie-exporter.js .

# Default command runs the automated headless script
CMD ["node", "cookie-exporter.js", "--auto"]

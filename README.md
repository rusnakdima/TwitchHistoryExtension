# Twitch History Extension

A Chrome extension to track and view your Twitch channel browsing history.

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in the top right corner)
3. Click "Load unpacked" and select this project folder (`/mnt/Other/Projects/Web/TwitchHistoryExtension`)
4. The extension should now be installed and visible in the toolbar

## Usage

- Visit Twitch channels (e.g., twitch.tv/channelname)
- The extension automatically tracks your visits
- Click the extension icon to view your history, sorted by most recently visited channels
- Each channel shows a list of visit timestamps

## Features

- Tracks visits to Twitch channels
- Stores history locally in your browser
- Displays history in a popup interface
- Limits storage to avoid bloat (keeps last 50 visits per channel)

## Development

To make changes, edit the files and reload the extension in `chrome://extensions/` by clicking the refresh icon.

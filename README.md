# JCIL Isolate

**Your private, offline AI assistant. No cloud. No tracking. No accounts.**

JCIL Isolate runs entirely on your device. Every conversation stays on your machine. No data is collected, transmitted, or stored in any cloud service.

## Features

- 100% offline AI — works without internet
- Zero data collection or telemetry
- Faith-grounded values (non-denominational, Scripture-based)
- Conversation history saved locally
- Beautiful dark theme UI
- Streaming responses
- Code syntax highlighting

## Requirements

- macOS 13+ or Windows 10+
- [Ollama](https://ollama.com) installed and running
- 4GB RAM minimum (8GB recommended)

## Quick Start

```bash
# 1. Install Ollama (if not already installed)
curl -fsSL https://ollama.com/install.sh | sh

# 2. Clone this repo
git clone https://github.com/themusashimaru/jcil-isolate.git
cd jcil-isolate

# 3. Build the JCIL Isolate model
ollama create jcil-isolate -f Modelfile

# 4. Install dependencies
npm install

# 5. Run the app
npm start
```

## Building for Distribution

```bash
# macOS .dmg
npm run build:mac

# Windows installer
npm run build:win
```

## Privacy

- All conversations stored locally in your user data folder
- No analytics, no telemetry, no tracking
- No accounts or sign-ups required
- No internet connection needed after initial setup
- Your data. Your device. Period.

## Created by

Matthew Moser

## License

Proprietary — All rights reserved

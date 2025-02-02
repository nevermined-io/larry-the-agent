# Eliza

## Edit the character files

Open `src/character.ts` to modify the default character. Uncomment and edit.

### Custom characters

To load custom characters instead:

- Use `pnpm start --characters="path/to/your/character.json"`
- Multiple character files can be loaded simultaneously

### Add clients

```
# in character.ts
clients: [Clients.TWITTER, Clients.DISCORD],

# in character.json
clients: ["twitter", "discord"]
```

## Duplicate the .env.example template

```bash
cp .env.example .env
```

\* Fill out the .env file with your own values.

### Add login credentials and keys to .env

```
DISCORD_APPLICATION_ID="discord-application-id"
DISCORD_API_TOKEN="discord-api-token"
...
OPENROUTER_API_KEY="sk-xx-xx-xxx"
...
TWITTER_USERNAME="username"
TWITTER_PASSWORD="password"
TWITTER_EMAIL="your@email.com"
```

## Install dependencies and start your agent

```bash
pnpm i && pnpm start
```

Note: this requires node to be at least version 22 when you install packages and run the agent.

## Run with Docker

### Build and run Docker Compose (For x86_64 architecture)

#### Edit the docker-compose.yaml file with your environment variables

```yaml
services:
  eliza:
    environment:
      - OPENROUTER_API_KEY=blahdeeblahblahblah
```

#### Run the image

```bash
docker compose up
```

### Build the image with Mac M-Series or aarch64

Make sure docker is running.

```bash
# The --load flag ensures the built image is available locally
docker buildx build --platform linux/amd64 -t eliza-starter:v1 --load .
```

#### Edit the docker-compose-image.yaml file with your environment variables

```yaml
services:
  eliza:
    environment:
      - OPENROUTER_API_KEY=blahdeeblahblahblah
```

#### Run the image

```bash
docker compose -f docker-compose-image.yaml up
```

# @elizaos/plugin-agentkit

AgentKit plugin for Eliza that enables interaction with CDP AgentKit tools for NFT and token management.

## Development

### Build the plugin

```bash
pnpm build
```

### Run in development mode

```bash
pnpm dev
```

## Dependencies

- `@elizaos/core`
- `@coinbase/cdp-agentkit-core`
- `@coinbase/cdp-langchain`
- `@langchain/core`

## Network Support

The plugin supports the following networks:

- Base Sepolia (default)
- Base Mainnet

Configure the network using the `CDP_AGENT_KIT_NETWORK` environment variable.

## Troubleshooting

If tools are not being triggered:

- Verify CDP API key configuration.
- Check network settings.
- Ensure character configuration includes the plugin.

Common errors:

- "Cannot find package": Make sure dependencies are installed.
- "API key not found": Check environment variables.
- "Network error": Verify network configuration.

## Integrating plugin-agentkit into Your Eliza Project

### Prerequisites

Ensure you have `pnpm` installed. If not, install it using:

```bash
npm install -g pnpm
```

### Steps to Integrate plugin-agentkit

#### Install Dependencies

Navigate to your project directory and install the dependencies:

```bash
pnpm install
```

#### Configure Environment Variables

Create a `.env` file in the root of your project if it doesn't exist. You can copy the `.env.example` file as a template. Add the following variables to your `.env` file:

```
CDP_API_KEY_NAME=your_key_name
CDP_API_KEY_PRIVATE_KEY=your_private_key
CDP_AGENT_KIT_NETWORK=base-sepolia # Optional: Defaults to base-sepolia
```

#### Add the Plugin to Character Configuration

Open your character configuration file (e.g., `eliza.character.json`) and add the `plugin-agentkit` to the `plugins` array. Also, add the necessary secrets to the `settings` object:

```json
{
  "plugins": ["plugin-agentkit"],
  "settings": {
    "cdpAgentKitApiKey": "your-cdp-agent-kit-api-key",
    "cdpAgentKitNetwork": "Base Sepolia"
  }
}
```

#### Update the Main Codebase

Open the main entry file (e.g., `index.ts`) and import the `plugin-agentkit`. Then, add it to the list of plugins when creating the agent runtime.

```typescript
import { createAgent } from "@elizaos/core";
import pluginAgentKit from "@elizaos/plugin-agentkit";

const agent = createAgent({
  plugins: [pluginAgentKit],
  // other configurations
});
```

#### Build and Run the Project

Build the project:

```bash
pnpm build
```

Start the project:

```bash
pnpm start
```

#### Verify the Plugin Integration

Ensure that the AgentKit plugin is initialized correctly by checking the console output for the initialization banner:

```bash
[plugin-agentkit] Initialized with network: Base Sepolia
```

## Usage Examples

### Get wallet details

`Can you show me my wallet details?`

### Deploy an NFT collection

`Deploy a new NFT collection called "Music NFTs" with symbol "MUSIC"`

### Create a token

`Create a new WOW token called "Artist Token" with symbol "ART"`

### Check balance

`What's my current balance?`

## Troubleshooting

If tools are not being triggered:

- Verify CDP API key configuration.
- Check network settings.
- Ensure character configuration includes the plugin.

Common errors:

- "Cannot find package": Make sure dependencies are installed.
- "API key not found": Check environment variables.
- "Network error": Verify network configuration.

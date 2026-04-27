# Setup Process

Follow these steps to set up your local NEST:

1. **Create the environment variable file**: Create a file named `.env`. Copy and paste the contents of `.env.example` into `.env`.

2. **Create the config file**: Create a file named `config.json`. Copy the contents of `config.json.example` and paste it into your newly created `config.json`.

3. **Configure the variables in `.env`**:

    - `TOKEN`: Set this to your default bot token.
    - `TOKEN_ADMIN`: Set this to your admin bot token.
    - `MONGO_URI`: Create a MongoDB cluster and paste the connection URL here. If you are unsure how to set this up, contact another bot developer.
    - `ERROR_WEBHOOK_URL` (optional): Set this to a webhook URL inside of a debugging channel.
    - `EVAL_EXPLICIT_ID`: Set this to your user ID.

4. **Configure the variables inside of `config.json`**:

    - `clientID`: Set this to your default bot's client ID found on the Discord Developer Portal.
    - `clientIDAdmin`: Set this to your admin bot's client ID.
    - `devs`: Set this to your user ID.

Your `config.json` and `.env` files should now look like this:

```json
{
    "clientID": "BOTCLIENTIDHERE",
    "devs": ["YOURUSERID"],
    "successEmoji": "✅",
    "failedEmoji": "❌",
    "arrowEmoji": "➡️",
    "bulletpointEmoji": "•",
    "loadingEmoji": "↻",
    "warnEmoji": "⚠️"
}
```
And your .env file:
```bash
TOKEN="BOT_TOKEN_HERE"
MONGO_URI="mongourlhere"
ERROR_WEBHOOK_URL="https://discord.com/api/webhooks/id/token"
EVAL_EXPLICIT_ID="1234567890123"
```
5. **Finally, you may run `npm install` to install all of the node_modules required to run NEST**

> Railway will build the project automatically and use `pm2-runtime ecosystem.config.js --env production` to start both the default and admin scopes.

# Starting NEST Locally
Very Short Guide as its a straight forward process
1. **Run `npm run dev`**

2. **(Only valid for first setup) Monitor the console for any errors for the first 10 seconds**
> [!NOTICE]
> This procedure is intended for emergencies. You are not required to follow this procedure verbatim if downtime is expected and acknowledged. It is assumed that the new host will be running `Ubuntu Server version 22.04 LTS (Jammy Jellyfish) 64-bit` or later.
# Predefined Data
You aren't required to read this section. Come back to it later when you need data.
`.env`:
```
TOKEN=""
MONGO_URI=""
ERROR_WEBHOOK_URL=""
EVAL_EXPLICIT_ID="012345678901234560"
STATUSPAGE_API_KEY="01234567-89ab-cdef-0123-456789abcdef"
```

`config.json`:
```json
{
    "clientID": "012345678901234560",
    "atlissan": "01234567-89ab-cdef-0123-456789abcdef",
    "devs": ["498984530968051713", "140163987500302336"],
    "successEmoji": "✅",
    "failedEmoji": "❌",
    "arrowEmoji": "➡️",
    "bulletpointEmoji": "•",
    "loadingEmoji": "↻",
    "warnEmoji": "⚠️"
}
```
# Start
Firstly, make sure you obtain a `GitHub Fine-grained Personal Access Token` which is valid, or get one from a developer who has access. **Assure you are in the home directory.**

## Install all dependencies
1) Make sure your `apt` is up to date. Run `sudo apt update`, then `sudo reboot`. Log back in.
2) Install Bun: `curl -fsSL https://bun.sh/install | bash`. If this does not work, you can self-inspect the error or go to https://www.bun.sh/ and attempt to find resources.
3) Install node: `sudo apt install nodejs`
4) Install pm2 *globally*: `npm install pm2@latest -g`
5) OPTIONAL: Install `neovim`: `sudo apt install neovim`. If this step is not followed, you will be required to use another text editor or the one Ubuntu has on-install. You may also use `vim`.
7) Reboot: `sudo reboot`

> [!NOTICE]
> The next section will ask you for your password each time you pull code from the repository. If you do not want this to occur, run `git config --global credential.helper store` to allow GitHub to store the username and PAT. After the next section, you should not need to input these fields again.

## Pull from codebase
To pull the codebase from the GitHub repo, run `git clone https://github.com/Roblox-Developers/NEST-JS-Production.git NEST`. This will create a new dir, `git`, in `./`. When the git cli asks you for your username, input the username of the account attached to the `PAT` (personal access token) obtained earlier. For the password, enter the PAT. You may right-click to paste from the clipboard in most SSH terminals.

# Configuration
The two files that you need here are `config.json` and `.env`. Find them in the **Predefined Data** section. It is assumed that you have `neovim` or `vim` installed; if not, use the text editor of your choice.

1) Run `nvim .env` and fill out the data.
2) Run `nvim config.json` and fill out the data.

# Run the bot
To test out the bot without the process manager, run `bun run Core.ts`. If nothing errors when attempting to run a command or query from the database, go ahead to the next section.

## Starting pm2 process
Start the pm2 process with the following command:
`pm2 start --name="core" "bun run Core.ts"`

You may view the logs with `pm2 logs` and stop the bot in an emergency with `pm2 stop core` or `pm2 stop all`.
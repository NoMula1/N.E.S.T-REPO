Often, when NEST has an active issue, tickets will be opened about it. When tickets are opened about issues with NEST and malformed user input has been ruled out, you should resort to the following procedure.

## 1) Create An Incident
NEST has a dedicated [statuspage](https://NEST.statuspage.io/). When NEST's performance is degraded, an incident or maintenance should be created to let users know about the issue.

## 2) Check The Logs
NEST has a built-in `/logs` command. This command will return a text file containing the last known process manager logs. If the active issue is severe enough, NEST may be down entirely, not responding, or if the `/logs` command does not work for any reason, please resort to [[#2.1) Manually Checking The Logs]]. If you do not have authorization to complete

### 2.1) Manually Checking The Logs
> [!warning]
> This step requires specific authorization. If you do not have such authorization, please contact an administrator with the **NEST Developer** role.

Manually checking the logs involves interfacing with the process manager, `pm2`. Refer to [this link](https://pm2.io/docs/plus/overview/) for help with more `pm2` commands.

Make sure you are in the main directory (`./`) of NEST-TS, and run `pm2 logs`. If this does not work, try running it via `npx pm2 logs`
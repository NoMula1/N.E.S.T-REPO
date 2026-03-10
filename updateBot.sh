    #!/bin/bash
echo "Received message to restart bot"
git pull
echo "Restarting all PM2 processes"
pm2 restart Core
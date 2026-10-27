3. How to View Live Logs
Both processes are streaming their output directly into log files in real-time.

Option A: Watch in Terminal (Live Stream)
Open a terminal in the codespace and run:

Backend API Logs (incoming requests, auth, MongoDB, errors):

bash
tail -f /workspaces/RACE/backend.log
Customer App Logs (Metro bundler, React Native errors, console logs):

bash
tail -f /workspaces/RACE/customer-app.log
Watch Both Logs Together:

bash
tail -f /workspaces/RACE/backend.log /workspaces/RACE/customer-app.log

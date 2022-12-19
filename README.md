# Discord Contact Request

This is a simple Discord OAuth2 based application built for CloudFlare Workers.

When a user authenticates with this application, the application will DM you with a 'contact request'.
You are then able to accept the request (Creating a group DM with you and the user), deny it (allowing them to resubmit) or ban the user from being able to make requests.
This application will only allow one request per user per week, meaning users are not able to spam you with requests provided you do not deny them.
Additionally, users who do not have MFA or a verified email address on their Discord account will not be able to generate a request.
Discord OAuth2 URLs are intimidating, you should make users aware of what the OAuth2 flow is for before prompting them to execute it.
All data on a user collected by this application will destruct when the relevant OAuth2 bearer token does. It is not reccomended you change this behaviour.

## Setup Guide

Before starting, you will need the following:
 - A CloudFlare Developers account
 - A Discord account

Follow the following steps to easily set up your application:
 1. Clone/download this repository
 2. Re-name [wrangler.example.toml](wrangler.example.toml) to wrangler.toml
 3. Create an application on the [Discord dev portal](https://discord.com/developers/applications)
 4. Create a bot for the application
 5. Fill in the following fields in your wrangler.toml based on your Discord application:
 ```toml
PUBLIC_KEY = "" #Your Discord application's Public Key
CLIENT_SECRET = "" #Your Discord application's secret
APP_ID = "" #Your Discord application's ID
AUTH_TOKEN = "" #Your Discord application's bot token
OWNER_ID = "" #Your own Discord account ID
```
 6. Next, go to the [CloudFlare dev portal](https://dash.cloudflare.com/) and create a KV instance for your application
 7. Now, you can fill in the following fields in your wrangler.toml:
 ```toml
kv_namespaces = [
  { binding = "USERS", id = "" } #Insert the ID of the KV Namespace you have just created
]

FAIL_URL = "" #This is the URL a user is sent to if they fail the OAuth2 flow for any reason
SUCCESS_URL = "" #This is the URL a user is sent to if they succeed the OAuth2 flow
REDIRECT_URL = "" #This is the URL for your worker. The format will be: https://contact.cf_username_here.workers.dev
```
 8. Next, set your redirect URL in the Discord dev portal as a redirect URL for your application
 9. Then, generate an OAuth2 URL using the generator in the Discord dev portal with the following scopes:
  - gdm.join
  - identify
  - email
  - connections
 10. Add the generated OAuth2 URL to your wrangler.toml:
```toml
OAUTH_URL = "" #The URL you just generated
```
 11. Now, navigate to the Discord developer portal and set your interactions endpoint to be your worker's URL (the same as your `REDIRECT_URL` in your wrangler.toml)
 12. Add the bot you've created to a server, you must stay in this server with the bot so it can DM you. You can use the OAuth2 URL generator with the `bot` scope to do this.
 13. Direct message the bot on Discord, send any message, right click to copy the link and take note of the middle ID `discord.com/channels/@me/THIS_ID/NOT_THIS`
 14. Edit your wrangler.toml to add the final entry:
```toml
DM_CHANNEL = "" #The ID you just obtained
```
 15. Now, run `npm install` in your project's directory (This will install any dependencies)
 16. Then, run `wrangler publish` to push your application into production
 17. Finally, you should authenticate with the bot so your own OAuth2 data can be saved

Now, anyone that navigates to your worker's URL will be directed to the correct OAuth2 URL and generate a contact request.

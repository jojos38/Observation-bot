# Observation-Bot

Observation bot is a Discord bot which scans for users messages and delete the bad messages.
Observation bot can detect avoidances such as putting # - * etc...
It can do the difference between insulting yourself or someone else
Detect racism, personnal attacks and much more!

A lot of functions are coming in the future, for now the bot has a blacklist and a whitelist system, you can set the bot to work only in specific channels or every channels it has access to.

- Most of the permissions are not required, they are here for future uses
- This bot is experimental and still under testing
- The bot does NOT store any message under any circumstance.
- The API calls ask for the API to NOT store the messages

Special thanks to Perspective API for their API.
Support server: contact jojos38#1337

+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

## Get started
Invite the bot on your Discord using this link:
https://discord.com/oauth2/authorize?client_id=772446137499385866&scope=bot&permissions=268823622

Use !olang to set the bot language (by default english)
Use !oprefix to set your preferred prefix (optionnal)
Use !oadd to enable the bot on any channel or use !oglobal true to moderate every channels
Enjoy!

+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

## User commands

- !ohelp or !oh
- - Show help"

- !oinfo
- - Show information about the bot"

- !oadmin
- - Show admin commands
- - Note: Require 'manage server' permission

+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

## Admin commands

An 'Authorized channel' is a channel where the bot is going to operate.

- !oprefix
- - Change the bot prefix

- !olang [language]
- - Change the global language of the bot (Use ISO 631-1, example: fr, es ,en)

- !oadd
- - Add the current channel in the authorized channels

- !oremove
- - Remove the current channel from the authorized channels

- !ochannellang
- - Set the default lang for a specific channel (Use ISO 631-1, example: fr, es ,en) (Default: auto)

- !oanalyze [text]
- - Analyze your message and give you a score

- !oreset
- - Delete all bot data from the server (Authorized channels etc...)
- - **Warning:** This command also delete all users stats! (Still not implemented)

- !ochannels
- - Show all authorized channels

- !odelay
- - Set the delay before the warning message is deleted (between 1000ms and 30000ms)

- !odelete
- - Define either the message should be deleted or not (true or false)

- !odebug
- - Show debbuging information (true or false)

- !owarn
- - Show warning messages (true or false)

- !oglobal
- - Set if the bot should moderate every channels of the server (true or false)

- !owhitelist / blacklist [add / remove] [a word]
- - If no parameter, shows the list, if add or remove followed by a word, adds or removes this word from the list.
- - Example: !owhitelist add I like train

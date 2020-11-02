// -------------------- SETTINGS -------------------- //
const DEFAULT_LANGUAGE = "en";
const DEFAULT_PREFIX = "!o"
const OWNER_ID = 137239068567142400;
const MIN_MSG_LEN = 3;
const MAX_MSG_LEN = 1000;
const ACTIVITY_MESSAGE = "!ohelp";
// -------------------- SETTINGS -------------------- //



// -------------------- SOME VARIABLES -------------------- //
const { token, topggtoken, apikey } = require('./config.json');
const Discord = require('discord.js');
const client = new Discord.Client();
//const DBL = require("dblapi.js");
//const dbl = new DBL(topggtoken, client);
const tools = require('./tools.js');
const db = require('./database.js');
const logger = require('./logger.js');
const perspectiveClient = require('perspective-api-client');
const perspective = new perspectiveClient({apiKey: apikey});
var eb; // Initialized in start()
var detections; // Initialized in start()
// -------------------- SOME VARIABLES -------------------- //



// ----------------------------------- SOME FUNCTIONS ----------------------------------- //
// Return a string of all the channels the bot is allowed to use
function getChannelsString(channels, lang) {
	var channelsString = "";
	// Loop trough each channe and add them to a string
	for (var i = 0; i < channels.length; i++) {
		channelsString = channelsString + "\n" + tools.mention(channels[i].channel, 'c');
	}
	// If the string is empty, mean there was no channel
	if (channelsString == "") channelsString = tools.getString("noChannel", lang);
	return channelsString;
}

async function channelAllowed(guildID, message) {
	// Channel perms
	const channels = await db.getGuildChannels(guildID);
	const channelID = message.channel.id;
	for (var i = 0; i < channels.length; i++) { // For each channel
		// If message is sent from allowed channel then return
		if (channels[i].channel == channelID) return true;
	}
	return false;
}

async function isAllowed(message, admin, lang) {
	if (!message) return false;
	const member = message.member || message.guild.member(message.author);
	if (!member) return false;

	// Owner perms
	if (message.author.id == OWNER_ID) return true;

	// Admin perms
	if (member.hasPermission("MANAGE_GUILD")) {
		return true;
	} else {
		if (admin) {
			tools.sendCatch(message.channel, tools.getString("noPermission", lang));
			return false;
		}
	}

	// Channel perm
	if (channelAllowed(message.guild.id)) return true;

	// If we went there is that the user is not allowed since previous for loop should return
	tools.sendCatch(message.channel, eb[lang].getNotAllowedEmbed(getChannelsString(channels, lang)));
	return false;
}

function initSettings(guild) {
	var guildID = guild.id;
	var guildName = guild.name;
	db.setSetting(guildID, "name", guildName);
	db.setSetting(guildID, "lang", DEFAULT_LANGUAGE);
	db.setSetting(guildID, "prefix", DEFAULT_PREFIX);
	db.setSetting(guildID, "debug", false);
	db.setSetting(guildID, "deleteMessage", true);
	db.setSetting(guildID, "warnMessage", true);
	db.setSetting(guildID, "deleteDelay", 5000);
	db.setSetting(guildID, "global", false);
	db.setSetting(guildID, "whitelist", []);
	db.setSetting(guildID, "blacklist", []);
	logger.info("Initialized server " + guildName);
}

async function exitHandler(options, exitCode) {
    if (options.cleanup) {
		logger.info("Stopping bot...");
		logger.info("Closing database...");
		await db.close();
	}
    if (exitCode || exitCode === 0) logger.info("Exit code: " + exitCode); process.exit();
    if (options.exit) process.exit();
}
process.on('exit', exitHandler.bind(null,{cleanup:true})); // do something when app is closing
process.on('SIGINT', exitHandler.bind(null,{exit:true})); // catches ctrl+c event
process.on('SIGUSR1', exitHandler.bind(null,{exit:true})); // catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR2', exitHandler.bind(null,{exit:true})); // catches "kill pid" (for example: nodemon restart)
process.on('uncaughtException', exitHandler.bind(null,{exit:true})); //catches uncaught exceptions
// ----------------------------------- SOME FUNCTIONS ----------------------------------- //





// ---------------------------------------------- LISTENERS ---------------------------------------------- //
client.once('ready', async function () {
    logger.success('Bot ready');
    client.user.setActivity(ACTIVITY_MESSAGE);
});

/*dbl.on('posted', () => {
	logger.info('Server count posted');
})

dbl.on('error', e => {
	logger.error(`Error while posting server count ${e}`);
})*/

client.on("channelDelete", function (channel) {
    db.removeGuildChannel(channel, DEFAULT_LANGUAGE);
});

client.on("guildCreate", guild => {
	logger.info("New server: " + guild.name);
	try { guild.owner.send(tools.getString("thanks", DEFAULT_LANGUAGE)); }
	catch (error) { logger.error("Error while sending a PM to the user"); logger.error(error); }
	initSettings(guild);
});

client.on("guildDelete", guild => {
   if (guild) {
   	db.resetGuildSettings(guild.id, guild.name, null, null);
   	logger.info("Bot removed from server: " + guild.name);
   }
});

async function checkMessage(lang, message) {	
	// Values
	const guildID = message.guild.id;
	const debug = await db.getSetting(guildID, "debug");
	var messageContent = message.content.toLowerCase();;
	
	// Remove emotes from the message
	var emotes = messageContent.match(/<:.+?:\d+>/g);
	if (emotes) {
		for (let emote of emotes) {
			messageContent = messageContent.replace(emote, "");
		}
	}
	
	// Remove white-list words
	const whitelist = await db.getSetting(guildID, "whitelist");
	for(let word of whitelist) {
		messageContent = messageContent.replace(word, '');
	}
	
	// Check black-list words
	var blacklistPass = true;
	const blacklist = await db.getSetting(guildID, "blacklist");
	for(let word of blacklist) {
		if (messageContent.includes(word)) blacklistPass = false;
	}

	// Check message
	var result;
	if (blacklistPass) {
		result = await detections[lang].analyze(messageContent, debug, perspective);
		if (!result.positive) return;
	} else {
		result = {values:{"Blacklist":"1000"}}
	}

	// React in consequence
	if (await db.getSetting(guildID, "deleteMessage") && !debug) tools.deleteCatch(message);	
	if (await db.getSetting(guildID, "warnMessage")) {
		const warnMessage = await tools.sendCatch(message.channel, eb[lang].getWarnEmbed(result, debug));
		await tools.delay(await db.getSetting(guildID, "deleteDelay"));
		warnMessage.delete();
	}
}

async function addList(message, lang, args, list) {
	// Get settings
	const channel = message.channel;
	const guildID = message.guild.id;
	var wordsList = await db.getSetting(guildID, list);
	logger.debug(wordsList);
	
	// Reconstruct the word
	var word = "";
	for (var i = 2; i < args.length; i++)
		word = word + args[i] + " ";
	word = word.slice(0, -1); // Remove the trailing space at the end

	// Interact with the word
	if (args[1] == "add") {
		// Check the word
		if (word.length < 3 || word.length > 32) {
			tools.sendCatch(channel, tools.getString("wordIncorrect", lang, {list:list}));
			return;
		}
		if (wordsList.includes(word)) {
			tools.sendCatch(channel, tools.getString("listContainsError", lang, {word:word, list:list}));
			return;
		}
		wordsList.push(word);
		db.setSetting(guildID, list, wordsList);
		tools.sendCatch(channel, tools.getString("listSet", lang, {word:word, list:list}));
	} else if (args[1] == "remove") {
		if (!wordsList.includes(word)) {
			tools.sendCatch(channel, tools.getString("listRemoveError", lang, {word:word, list:list}));
			return;
		}
		wordsList.splice(wordsList.indexOf(word), 1);
		db.setSetting(guildID, list, wordsList);
		tools.sendCatch(channel, tools.getString("listRemove", lang, {word:word, list:list}));
	} else {
		if (wordsList.length > 0) tools.sendCatch(channel, wordsList);
		else tools.sendCatch(channel, tools.getString("listEmpty", lang, {list:list}));
	}
}

client.on('message', async function (message) {
	

	
	// Check if the message is not a PM
	const guild = message.guild;
	if (!guild) return;
	
	// Get guilds settings
	const prefix = await db.getSetting(guild.id, "prefix") || DEFAULT_PREFIX;
	const lang = await db.getSetting(guild.id, "lang") || DEFAULT_LANGUAGE;
	
	// Analyze message
	var messageLength = message.content.length;
	if (messageLength >= MIN_MSG_LEN && messageLength <= MAX_MSG_LEN)
		if (await channelAllowed(guild.id, message))
			checkMessage(lang, message);
	
	// Check if it's a command
	// Check if the message starts with prefix
	const messageContent = message.content.toLowerCase(); // Get message to lower case
	if (!messageContent.startsWith(`${prefix}`)) return; // If message doesn't start with !o then return
    const args = messageContent.slice(prefix.length).trim().split(/ +/g); // Get message arguments
    const channel = message.channel;
	
    if (messageContent.startsWith(`${prefix}h`)) { // help
        if (await isAllowed(message, false, lang)) {
			const embeds = eb[lang];
			if (embeds == null) {
				logger.error("Error happened on help command, wrong language: " + lang);
				tools.sendCatch(channel, "An error happened, if the error persist, you can get help on the support server.");
				return;
			}
            await tools.sendCatch(channel, embeds.getHelpEmbed(prefix));
        }
    }

	else if (messageContent.startsWith(`${prefix}info`)) { // info
        if (await isAllowed(message, false, lang)) {
            var servers = client.guilds;
			var users = 0;
			client.guilds.forEach(g => {
			  users += g.memberCount;
			})
			var uptime = process.uptime();
            tools.sendCatch(channel, eb[lang].getInfoEmbed(users, servers.size, tools.format(uptime)));
        }
    }

    else if (messageContent.startsWith(`${prefix}add`)) { // add [ADMIN]
        if (await isAllowed(message, true, lang)) {
            db.addGuildChannel(channel, lang);
        }
    }

    else if (messageContent.startsWith(`${prefix}remove`)) { // remove [ADMIN]
        if (await isAllowed(message, true, lang)) {
            db.removeGuildChannel(channel, lang);
        }
    }
	
    else if (messageContent.startsWith(`${prefix}delay`)) { // delete delay [ADMIN]
        if (await isAllowed(message, true, lang)) {
            if (args[1] <= 30000 && args[1] >= 1000 && tools.isInt(args[1])) {
                db.setSetting(guild.id, "deleteDelay", args[1]);
                tools.sendCatch(channel, tools.getString("deleteDelaySet", lang, {delay:args[1]}));
            } else {
                tools.sendCatch(channel, tools.getString("deleteDelayError", lang));
            }
        }
    }
	
	else if (messageContent.startsWith(`${prefix}debug`)) { // delete delay [ADMIN]
        if (await isAllowed(message, true, lang)) {
            if (args[1] == "true" || args[1] == "false") {
				var finalValue = args[1] == "true";
                db.setSetting(guild.id, "debug", finalValue);
                tools.sendCatch(channel, tools.getString("debugSet", lang, {defined:args[1]}));
            } else {
                tools.sendCatch(channel, tools.getString("debugError", lang));
            }
        }
    }
	
	else if (messageContent.startsWith(`${prefix}global`)) { // global [ADMIN]
        if (await isAllowed(message, true, lang)) {
            if (args[1] == "true" || args[1] == "false") {
				var finalValue = args[1] == "true";
                db.setSetting(guild.id, "global", finalValue);
                tools.sendCatch(channel, tools.getString("globalSet", lang, {defined:args[1]}));
            } else {
                tools.sendCatch(channel, tools.getString("globalError", lang));
            }
        }
    }
	
	else if (messageContent.startsWith(`${prefix}whitelist`)) { // global [ADMIN]
        if (await isAllowed(message, true, lang)) {
            addList(message, lang, args, "whitelist"); 
        }
    }
	
	else if (messageContent.startsWith(`${prefix}blacklist`)) { // global [ADMIN]
        if (await isAllowed(message, true, lang)) {
            addList(message, lang, args, "blacklist"); 
        }
    }
	
	else if (messageContent.startsWith(`${prefix}warn`)) { // warn message [ADMIN]
        if (await isAllowed(message, true, lang)) {
            if (args[1] == "true" || args[1] == "false") {
				var finalValue = args[1] == "true";
                db.setSetting(guild.id, "warnMessage", finalValue);
                tools.sendCatch(channel, tools.getString("warnSet", lang, {defined:args[1]}));
            } else {
                tools.sendCatch(channel, tools.getString("warnError", lang));
            }
        }
    }
	
	else if (messageContent.startsWith(`${prefix}delete`)) { // delete message [ADMIN]
        if (await isAllowed(message, true, lang)) {
            if (args[1] == "true" || args[1] == "false") {
				var finalValue = args[1] == "true";
                db.setSetting(guild.id, "deleteMessage", finalValue);
                tools.sendCatch(channel, tools.getString("deleteSet", lang, {defined:args[1]}));
            } else {
                tools.sendCatch(channel, tools.getString("deleteError", lang));
            }
        }
    }
	
    else if (messageContent.startsWith(`${prefix}prefix`)) { // remove [ADMIN]
        if (await isAllowed(message, true, lang)) {
			// If not empty, less than 4 characters and ASCII only
            if ((args[1] || "").length < 4 && args[1] && /^[\x00-\x7F]*$/.test(args[1])) {
                db.setSetting(guild.id, "prefix", args[1]);
				tools.sendCatch(channel, tools.getString("prefixSet", lang, {delay:args[1]}));
            } else {
                tools.sendCatch(channel, tools.getString("prefixError", lang));
            }
        }
    }
	
    else if (messageContent.startsWith(`${prefix}reset`)) { // remove [ADMIN]
        if (await isAllowed(message, true, lang)) {
            await db.resetGuildSettings(guild.id, guild.name, channel, lang);
			initSettings(guild);
        }
    }

    else if (messageContent.startsWith(`${prefix}channels`)) { // remove [ADMIN]
        if (await isAllowed(message, true, lang)) {
            const channels = await db.getGuildChannels(guild.id)
			tools.sendCatch(channel, getChannelsString(channels, lang));
        }
    }

    else if (messageContent.startsWith(`${prefix}kill`)) { // kill [ADMIN]
        if (message.author.id == OWNER_ID) {
            exitHandler({cleanup:true}, null);
        }
    }

	else if (messageContent.startsWith(`${prefix}lang`)) { // lang [ADMIN]
        if (await isAllowed(message, true, lang)) {
			const langs = tools.getLocales();
			const commandLang = (args[1] || "").substring(0, 2);
            if (langs.includes(commandLang)) {
                db.setSetting(guild.id, "lang", commandLang);
				tools.sendCatch(channel, tools.getString("langSet", lang, {lang:commandLang}));
            } else {
				tools.sendCatch(channel, tools.getString("langError", lang, {lang:commandLang, langs:langs}));
            }
        }
    }

    else if (messageContent.startsWith(`${prefix}admin`)) { // admin [ADMIN]
        if (await isAllowed(message, true, lang)) {
            tools.sendCatch(channel, eb[lang].getAdminHelpEmbed(prefix));
        }
    }

    else if (messageContent.startsWith(`${prefix}ls`)) { // ls [OWNER]
        if (message.author.id == OWNER_ID) {
            var servers = client.guilds;
			var users = 0;
			var en = 0;
			for (var g of servers) {
				var templang = await db.getSetting(g[0], "lang");
				if (templang == "en") en++;
				var members = g[1].memberCount;
				users += members;
				logger.debug("[" + g[0] + "] (" + templang + ") (" + members + " users) " + g[1].name);
			}
			var ratioEN = (en / servers.size * 100).toFixed(2);
			var ratioFR = (100-ratioEN).toFixed(2);
			logger.debug("Total users: " + users);
			logger.debug("Total servers: " + servers.size);
			logger.debug("English:" + ratioEN + "% (" + en + ") French:" + ratioFR + "% (" + (servers.size-en) + ")"); 
        }
    }

	else if (messageContent.startsWith(`${prefix}clean`)) { // clean [OWNER]
        if (message.author.id == OWNER_ID) {
            const guilds = client.guilds;
			const dbguilds = await db.getAllServers();
			for (var entry of dbguilds) {
				var dbGuildID = entry.name;
				if (!guilds.get(dbGuildID))
					db.resetGuildSettings(dbGuildID, dbGuildID, null, null);
			}
			logger.success("Command clean OK");
        }
    }

	else if (messageContent.startsWith(`${prefix}update`)) { // restore [OWNER]
        if (message.author.id == OWNER_ID) {
            const guilds = client.guilds;
			const tempdbguilds = await db.getAllServers();
			var dbguilds = [];
			for (var entry of tempdbguilds) {
				dbguilds[entry.name] = true;
			}
			for (var id of guilds.keys()) {
				if (dbguilds[id]) { // If the guild exists in the database
					const tempGuild = guilds.get(id);
					var guildID = tempGuild.id;
					var guildName = tempGuild.name;
					db.setSetting(guildID, "name", guildName);
				}
			}
			logger.success("Command update OK");
		}
    }

	else if (messageContent.startsWith(`${prefix}restore`)) { // restore [OWNER]
        if (message.author.id == OWNER_ID) {
            const guilds = client.guilds;
			const tempdbguilds = await db.getAllServers();
			var dbguilds = [];
			for (var entry of tempdbguilds) {
				dbguilds[entry.name] = true;
			}
			for (var id of guilds.keys()) {
				if (!dbguilds[id]) {
					const tempGuild = guilds.get(id);
					initSettings(tempGuild);
				}
			}
			logger.success("Command restore OK");
		}
    }

	else if (messageContent.startsWith(`${prefix}status`)) { // status [OWNER]
        if (message.author.id == OWNER_ID) {
			var newStatus = messageContent.replace(`${prefix}status `, "");
			logger.success("Status changed to: " + newStatus);
			client.user.setActivity(newStatus);
		}
    }
})
// ---------------------------------------------- LISTENERS ---------------------------------------------- //



// ------- START ------- //
async function start() {
    await db.init();
	tools.loadLanguages();
	eb = tools.getEmbeds();
	detections = tools.getDetections();
	logger.info("Connecting to Discord...");
    client.login(token);
}
start();
// ------- START ------- //
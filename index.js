// -------------------- SETTINGS -------------------- //
const DEFAULT_LANGUAGE = "en";
const DEFAULT_PREFIX = "!o"
const OWNER_ID = 137239068567142400;
const MIN_MSG_LEN = 3;
const MAX_MSG_LEN = 1000;
const ACTIVITY_MESSAGE = "!ohelp";
// -------------------- SETTINGS -------------------- //



// -------------------- SOME VARIABLES -------------------- //
global.config = require('./config.json');
const Discord = require('discord.js');
const client = new Discord.Client();
const tools = require('./tools.js');
const db = require('./database.js');
const logger = require('./logger.js');
const lm = require('./languages-manager.js');
const dbl = require('./dbl.js');
// -------------------- SOME VARIABLES -------------------- //



// ----------------------------------- SOME FUNCTIONS ----------------------------------- //
// Return a string of all the channels the bot is allowed to use
async function getChannelsString(guildID, lang) {
	const channels = await db.getGuildChannels(guildID)
	var channelsString = "";
	// Loop trough each channel and add them to a string
	for (var i = 0; i < channels.length; i++) {
		channelsString = channelsString + "\n" + tools.mention(channels[i].channel, 'c') + " [" + channels[i].lang + "]";
	}
	// If the string is empty, mean there was no channel
	if (channelsString == "") channelsString = lm.getString("noChannel", lang);
	return channelsString;
}

async function channelAllowed(guildID, message) {
	const channels = await db.getGuildChannels(guildID);
	const channelID = message.channel.id;
	for (var i = 0; i < channels.length; i++) // For each channel
		if (channels[i].channel == channelID) return true; // If message is sent from allowed channel then return
	return false;
}

async function isAllowed(message, lang) {
	// Owner perms
	if (message.author.id == OWNER_ID) return true;

	// Moderator perms
	if (isModeratorAllowed(message)) return true;

	// Channel perm
	if (channelAllowed(message.guild.id)) return true;

	// If we went there is that the user is not allowed since previous for loop should return
	tools.sendCatch(message.channel, lm.getEb(lang).getNotAllowedEmbed(getChannelsString(channels, lang)));
	return false;
}

async function isModeratorAllowed(message) {
	// Checking
	if (!message) return false;
	const member = message.member || message.guild.member(message.author);
	if (!member) return false;

	// Admin perms
	return member.hasPermission("MANAGE_GUILD");
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

client.on("channelDelete", function (channel) {
    db.removeGuildChannel(channel, DEFAULT_LANGUAGE);
});

client.on("guildCreate", guild => {
	logger.info("New server: " + guild.name);
	try { guild.owner.send(lm.getString("thanks", DEFAULT_LANGUAGE)); }
	catch (error) { logger.error("Error while sending a PM to the user"); logger.error(error); }
	initSettings(guild);
});

client.on("guildDelete", guild => {
   if (guild) {
   	db.resetGuildSettings(guild.id, guild.name, null, null);
   	logger.info("Bot removed from server: " + guild.name);
   }
});

async function checkMessage(lang, message, debug) {
	// Values
	const guildID = message.guild.id;
	var messageContent = message.content.toLowerCase();;

	// Check channel lang
	const channelLang = await db.getChannelLang(message.guild.id, message.channel.id);
	if (channelLang != "auto")
		lang = channelLang;

	// Remove emotes from the message
	var emotes = messageContent.match(/<:.+?:\d+>/g);
	if (emotes) {
		for (let emote of emotes) {
			messageContent = messageContent.replace(emote, "");
		}
	}

	// Remove white-list words
	const whitelist = await db.getSetting(guildID, "whitelist");
	if (whitelist)
		for(let word of whitelist) {
			messageContent = messageContent.replace(word, '');
		}

	// Check black-list words
	var blacklistPass = true;
	const blacklist = await db.getSetting(guildID, "blacklist");
	if (blacklist)
		for(let word of blacklist) {
			if (messageContent.includes(word)) blacklistPass = false;
		}

	// Check message
	var result;
	var otherResult;
	var positive = false;
	var messageLength = messageContent.length;
	if (messageLength < MIN_MSG_LEN || messageLength > MAX_MSG_LEN) return;
	if (blacklistPass) {
		// Increment counter
		db.incrementCounter();

		// Send the message to the API
		result = await lm.analyze(lang, messageContent, debug);
		if (result.positive) positive = true;

		// If the API detected the message as another language, then we check for this language too
		if (!positive && result.detectedLanguages) {
			for(let language of result.detectedLanguages) {
				otherResult = await lm.analyze(language, messageContent, debug);
				if (otherResult.positive) {
					positive = true;
					result = otherResult;
				}
			}
		}
		if (!positive) return;
	} else {
		result = {values:{"Blacklist":"1000"}}
	}

	if (!debug) logger.info("Message '" + messageContent.replace(/\n/g, " ") + "' have been warned for " + JSON.stringify(result.values));

	// React in consequence
	if (await db.getSetting(guildID, "deleteMessage") && !debug) tools.deleteCatch(message);
	if (await db.getSetting(guildID, "warnMessage")) {
		const warnMessage = await tools.sendCatch(message.channel, lm.getEb(lang).getWarnEmbed(result, debug));
		await tools.delay(await db.getSetting(guildID, "deleteDelay"));
		tools.deleteCatch(warnMessage);
	}
}

async function addList(message, lang, args, list) {
	// Get settings
	const channel = message.channel;
	const guildID = message.guild.id;
	var wordsList = await db.getSetting(guildID, list);

	// Reconstruct the word
	var word = "";
	for (var i = 2; i < args.length; i++)
		word = word + args[i] + " ";
	word = word.slice(0, -1); // Remove the trailing space at the end

	// Interact with the word
	if (args[1] == "add") {
		// Check the word
		if (word.length < 3 || word.length > 32) {
			tools.sendCatch(channel, lm.getString("wordIncorrect", lang, {list:list}));
			return;
		}
		if (wordsList.includes(word)) {
			tools.sendCatch(channel, lm.getString("listContainsError", lang, {word:word, list:list}));
			return;
		}
		wordsList.push(word);
		db.setSetting(guildID, list, wordsList);
		tools.sendCatch(channel, lm.getString("listSet", lang, {word:word, list:list}));
	} else if (args[1] == "remove") {
		if (!wordsList.includes(word)) {
			tools.sendCatch(channel, lm.getString("listRemoveError", lang, {word:word, list:list}));
			return;
		}
		wordsList.splice(wordsList.indexOf(word), 1);
		db.setSetting(guildID, list, wordsList);
		tools.sendCatch(channel, lm.getString("listRemove", lang, {word:word, list:list}));
	} else {
		if (wordsList.length > 0) tools.sendCatch(channel, wordsList);
		else tools.sendCatch(channel, lm.getString("listEmpty", lang, {list:list}));
	}
}



client.on('messageUpdate', async function (oldMessage, newMessage) {
	// Check if the message is not a PM
	const guild = newMessage.guild;
	if (!guild) return;

	// Check if the message is not from a bot
	if(newMessage.author.bot) return;

	// Get guilds settings
	const prefix = await db.getSetting(guild.id, "prefix") || DEFAULT_PREFIX;
	const lang = await db.getSetting(guild.id, "lang") || DEFAULT_LANGUAGE;
	
	// Analyze message
	if (Math.abs(oldMessage.content.length - newMessage.content.length) > 3) {
		if (await channelAllowed(guild.id, newMessage) || await db.getSetting(guild.id, "global")) {
			const debug = await db.getSetting(guild.id, "debug");
			checkMessage(lang, newMessage, debug);
		}
	}
});



client.on('message', async function (message) {
	// Check if the message is not a PM
	const guild = message.guild;
	if (!guild) return;
	
	// Check if the message is not from a bot
	if(message.author.bot) return;
	
	// Get guilds settings
	const prefix = await db.getSetting(guild.id, "prefix") || DEFAULT_PREFIX;
	const lang = await db.getSetting(guild.id, "lang") || DEFAULT_LANGUAGE;

	// Analyze message
	if (await channelAllowed(guild.id, message) || await db.getSetting(guild.id, "global")) {
		const debug = await db.getSetting(guild.id, "debug");
		checkMessage(lang, message, debug);
	}
	
	// Check if it's a command
	// Check if the message starts with prefix
	const messageContent = message.content.toLowerCase(); // Get message to lower case
	if (!messageContent.startsWith(`${prefix}`)) return; // If message doesn't start with !o then return
    const args = messageContent.slice(prefix.length).trim().split(/ +/g); // Get message arguments
    const channel = message.channel;



	// #################################################### USER COMMANDS #################################################### //
	// If allowed to send the command
	if (!await isAllowed(message, lang)) return;
	// #################################################### USER COMMANDS #################################################### //



    if (messageContent.startsWith(`${prefix}h`)) { // help
		await tools.sendCatch(channel, lm.getEb(lang).getHelpEmbed(prefix));
		return;
	}

	else if (messageContent.startsWith(`${prefix}info`)) { // info
		var servers = client.guilds;
		var users = 0;
		client.guilds.forEach(g => {
		  users += g.memberCount;
		})
		var uptime = process.uptime();
		var counter = await db.getCounter();
		tools.sendCatch(channel, lm.getEb(lang).getInfoEmbed(users, servers.size, tools.format(uptime), counter));
		return;
    }
	
	else if (messageContent.startsWith(`${prefix}analyze`)) { // info
		var tempMsg = message;
		tempMsg.content = tempMsg.content.replace(prefix + "analyze ", "");
		checkMessage(lang, tempMsg, true);
		return;
    }



	// #################################################### MODERATOR COMMANDS #################################################### //
	// If moderator allowed to send the command
	if (!await isModeratorAllowed(message)) { tools.sendCatch(message.channel, lm.getString("noPermission", lang)); return; }
	// #################################################### MODERATOR COMMANDS #################################################### //
	
	
	
    if (messageContent.startsWith(`${prefix}add`)) { // add [ADMIN]
		db.addGuildChannel(channel, lang);
		return;
    }

    else if (messageContent.startsWith(`${prefix}remove`)) { // remove [ADMIN]
		db.removeGuildChannel(channel, lang);
		return;
    }
	
	else if (messageContent.startsWith(`${prefix}channellang`)) { // remove [ADMIN]
		const langs = lm.getLocales();
		const commandLang = (args[1] || "");
		if (langs.includes(commandLang) || commandLang == "auto") {
			db.setChannelLang(guild.id, channel.id, commandLang);
			tools.sendCatch(channel, lm.getString("langSet", lang, {lang:commandLang}));
		} else {
			tools.sendCatch(channel, lm.getString("langError", lang, {lang:commandLang, langs:langs}));
		}
		return;
    }
	
    else if (messageContent.startsWith(`${prefix}delay`)) { // delete delay [ADMIN]
		if (args[1] <= 30000 && args[1] >= 1000 && tools.isInt(args[1])) {
			db.setSetting(guild.id, "deleteDelay", args[1]);
			tools.sendCatch(channel, lm.getString("deleteDelaySet", lang, {delay:args[1]}));
		} else {
			tools.sendCatch(channel, lm.getString("deleteDelayError", lang));
		}
		return;
    }
	
	else if (messageContent.startsWith(`${prefix}debug`)) { // delete delay [ADMIN]
		if (args[1] == "true" || args[1] == "false") {
			var finalValue = args[1] == "true";
			db.setSetting(guild.id, "debug", finalValue);
			tools.sendCatch(channel, lm.getString("debugSet", lang, {defined:args[1]}));
		} else {
			tools.sendCatch(channel, lm.getString("debugError", lang));
		}
		return;
    }
	
	else if (messageContent.startsWith(`${prefix}global`)) { // global [ADMIN]
		if (args[1] == "true" || args[1] == "false") {
			var finalValue = args[1] == "true";
			db.setSetting(guild.id, "global", finalValue);
			tools.sendCatch(channel, lm.getString("globalSet", lang, {defined:args[1]}));
		} else {
			tools.sendCatch(channel, lm.getString("globalError", lang));
		}
		return;
    }
	
	else if (messageContent.startsWith(`${prefix}whitelist`)) { // global [ADMIN]
		addList(message, lang, args, "whitelist");
		return;
    }
	
	else if (messageContent.startsWith(`${prefix}blacklist`)) { // global [ADMIN]
		addList(message, lang, args, "blacklist");
		return;
    }
	
	else if (messageContent.startsWith(`${prefix}warn`)) { // warn message [ADMIN]
		if (args[1] == "true" || args[1] == "false") {
			var finalValue = args[1] == "true";
			db.setSetting(guild.id, "warnMessage", finalValue);
			tools.sendCatch(channel, lm.getString("warnSet", lang, {defined:args[1]}));
		} else {
			tools.sendCatch(channel, lm.getString("warnError", lang));
		}
		return;
    }
	
	else if (messageContent.startsWith(`${prefix}delete`)) { // delete message [ADMIN]
		if (args[1] == "true" || args[1] == "false") {
			var finalValue = args[1] == "true";
			db.setSetting(guild.id, "deleteMessage", finalValue);
			tools.sendCatch(channel, lm.getString("deleteSet", lang, {defined:args[1]}));
		} else {
			tools.sendCatch(channel, lm.getString("deleteError", lang));
		}
		return;
    }
	
    else if (messageContent.startsWith(`${prefix}prefix`)) { // remove [ADMIN]
		// If not empty, less than 4 characters and ASCII only
		if ((args[1] || "").length <= 4 && args[1] && /^[\x00-\x7F]*$/.test(args[1])) {
			db.setSetting(guild.id, "prefix", args[1]);
			tools.sendCatch(channel, lm.getString("prefixSet", lang, {delay:args[1]}));
		} else {
			tools.sendCatch(channel, lm.getString("prefixError", lang));
		}
		return;
    }
	
    else if (messageContent.startsWith(`${prefix}reset`)) { // remove [ADMIN]
		await db.resetGuildSettings(guild.id, guild.name, channel, lang);
		initSettings(guild);
		return;
    }

    else if (messageContent.startsWith(`${prefix}channels`)) { // remove [ADMIN]
		tools.sendCatch(channel, await getChannelsString(guild.id, lang));
		return;
    }

	else if (messageContent.startsWith(`${prefix}lang`)) { // lang [ADMIN]
		const langs = lm.getLocales();
		const commandLang = (args[1] || "");
		if (langs.includes(commandLang)) {
			db.setSetting(guild.id, "lang", commandLang);
			tools.sendCatch(channel, lm.getString("langSet", lang, {lang:commandLang}));
		} else {
			tools.sendCatch(channel, lm.getString("langError", lang, {lang:commandLang, langs:langs}));
		}
		return;
    }

    else if (messageContent.startsWith(`${prefix}admin`)) { // admin [ADMIN]
		tools.sendCatch(channel, lm.getEb(lang).getAdminHelpEmbed(prefix));
		return;
    }

	else if (messageContent.startsWith(`${prefix}config`)) { // admin [ADMIN]
		// If not empty, less than 4 characters and ASCII only
		if ((args[1] == "confirm")) {
			const token = await db.generateToken(guild.id, lang);
			if (token) {
				const link = "https://observation.ddns.net/?tok=" + token + "&sid=" + guild.id;
				tools.sendCatch(channel, lm.getString("configLink", lang));
				tools.sendCatch(channel, link);
			}
			//tools.sendCatch(channel, "link");
		} else {
			tools.sendCatch(channel, lm.getString("configConfirm", lang, {prefix:prefix}));
		}
		return;
    }

	// #################################################### OWNER COMMANDS #################################################### //
	// If owner allowed to send the command
	if (message.author.id != OWNER_ID) return;
	// #################################################### OWNER COMMANDS #################################################### //



    if (messageContent.startsWith(`${prefix}ls`)) { // ls [OWNER]
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

	else if (messageContent.startsWith(`${prefix}reload`)) { // kill [OWNER]
		lm.reloadLanguages();
    }

    else if (messageContent.startsWith(`${prefix}kill`)) { // kill [OWNER]
		exitHandler({cleanup:true}, null);
    }

	else if (messageContent.startsWith(`${prefix}clean`)) { // clean [OWNER]
		const guilds = client.guilds;
		const dbguilds = await db.getAllServers();
		for (var entry of dbguilds) {
			var dbGuildID = entry.name;
			if (!guilds.get(dbGuildID))
				db.resetGuildSettings(dbGuildID, dbGuildID, null, null);
		}
		logger.success("Command clean OK");
    }

	else if (messageContent.startsWith(`${prefix}update`)) { // restore [OWNER]
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

	else if (messageContent.startsWith(`${prefix}restore`)) { // restore [OWNER]
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

	else if (messageContent.startsWith(`${prefix}status`)) { // status [OWNER]
		var newStatus = messageContent.replace(`${prefix}status `, "");
		logger.success("Status changed to: " + newStatus);
		client.user.setActivity(newStatus);
    }
})
// ---------------------------------------------- LISTENERS ---------------------------------------------- //



// ------- START ------- //
async function start() {
    await db.init();
	lm.reloadLanguages(); // Load languages
	logger.info("Connecting to Discord...");
    client.login(config.token);
	//dbl.init(client);
}
start();
// ------- START ------- //

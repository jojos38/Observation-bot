
// -------------------- SOME VARIABLES -------------------- //
var MongoClient = require('mongodb').MongoClient
const config = require('./config.json');
const { database, username, password, ip, port } = require('./dbconfig.json');
const tools = require('./tools.js');
const logger = require('./logger.js');
const eb = tools.embeds;
var client;
var mainDB;
var col = {};
// -------------------- SOME VARIABLES -------------------- //



// -------------------- SOME FUNCTIONS -------------------- //
function removeSmallest(arr) {
  var min = Math.min.apply(null, arr);
  return arr.filter((e) => {return e != min});
}

async function dropCatch(collection) {
	try { return await collection.drop(); }
	catch (err) { logger.error(err); return null; }
}

async function findOneCatch(collection, toFind) {
	try { return await collection.findOne(toFind); }
	catch (err) { logger.error(err);  return null; }
}

async function findCatch(collection, toFind, filter) {
	try { return await collection.find(toFind, filter); }
	catch (err) { logger.error(err);  return null; }
}

async function insertOneCatch(collection, toInsert) {
	try { return await collection.insertOne(toInsert); }
	catch (err) { logger.error(err);  return null; }
}

async function deleteOneCatch(collection, toDelete) {
	try { return await collection.deleteOne(toDelete); }
	catch (err) { logger.error(err);  return null; }
}

async function deleteCatch(collection, toDelete) {
	try { return await collection.deleteMany(toDelete); }
	catch (err) { logger.error(err);  return null; }
}

async function updateOneCatch(collection, toUpdate, newValue) {
	try { return await collection.updateOne(toUpdate, newValue); }
	catch (err) { logger.error(err);  return null; }
}

async function listCatch(db) {
	try { return await mainDB.listCollections(); }
	catch (err) { logger.error(err);  return null; }
}
// -------------------- SOME FUNCTIONS -------------------- //



module.exports = {
    // ------------------------------------- INIT AND CLOSE ------------------------------------- //
    init: async function () {
		logger.info("Database connection...");
		const url = 'mongodb://' + username + ':' + password + '@' + ip + ':' + port + '/' + database + '?authSource=admin';
		try  {
			var err, tempClient = await MongoClient.connect(url, { useNewUrlParser: true, useUnifiedTopology: true, poolSize: 1 });
			client = tempClient;
			mainDB = client.db(database);
			col.channels = mainDB.collection('channels');
			col.settings = mainDB.collection('settings');
			col.usersGuild = mainDB.collection('users_guild');
			col.defaultSettings = mainDB.collection('default_settings');
			logger.success("Database ready");
		} catch (err) {
			logger.error(err);
			process.exit(1);
		}
    },

    close: function () {
        client.close();
		logger.success("Database closed");
    },
    // ------------------------------------- INIT AND CLOSE ------------------------------------- //



    // ------------------------------------- SOME FUNCTIONS ------------------------------------- //
    transfer: async function() {
		const collections = await secDB.listCollections().toArray();
		for (collInfos of collections) {
			var collection = secDB.collection(collInfos.name);
			var users = await (await findCatch(collection, {username: {$exists: true}})).toArray();
			for (user of users) {
				db.updateUserStats(collInfos.name, user.id, user.username, user.score, user.won);
			}
			
			var settings = await (await findCatch(collection, {setting: {$exists: true}})).toArray();
			for (setting of settings) {
				db.setSetting(collInfos.name, setting.setting, setting.value);
			}
			
			var channels = await (await findCatch(collection, {channel: {$exists: true}})).toArray();
			for (channel of channels) {
				db.addGuildChannel(collInfos.name, { id: channel.channel } );
			}
		};	
	},

    resetGuildSettings: async function (guildID, guildName, channel, lang) {
		await deleteCatch(col.channels, { guildID: guildID });
		logger.info("Channels deleted for " + guildName);
		await deleteCatch(col.usersGuild, { guildID: guildID });
		logger.info("Users deleted for " + guildName);
		await deleteCatch(col.settings, { guildID: guildID });
		logger.info("Settings deleted for " + guildName);
		if (channel && lang) await tools.sendCatch(channel, lm.getString("resetted", lang));
    },

    addGuildChannel: async function (guildID, channel, lang) {
		const channelID = channel.id;
        var result = await findOneCatch(col.channels, { guildID: guildID, channelID: channelID });
		if (result) { // If it already exist
			if (lang) await tools.sendCatch(channel, lm.getString("alreadyAuthorized", lang));
			return; // Return if channel already exist
		}
        var result = await insertOneCatch(col.channels, { guildID: guildID, channelID: channelID, lang: "auto" });
		if (result) {
			if (lang) await tools.sendCatch(channel, lm.getString("channelAdded", lang));
			logger.info("Channel " + channelID + " inserted successfully in guild " + guildID);
		} else {
			if (lang) await tools.sendCatch(channel, lm.getString("error", lang));
			logger.error("Error while inserting channel " + channelID + " in guild " + guildID);
		}
    },

    removeGuildChannel: async function (guildID, channel, lang) {
        const channelID = channel.id;
        var result = await findOneCatch(col.channels, { channelID: channelID });
		if (!result) { // If channel doesn't exist
			if (!channel.deleted && lang) tools.sendCatch(channel, lm.getString("channelNotInList", lang));
			return;
		}
        var result = await deleteOneCatch(col.channels, { guildID: guildID, channelID: channelID });
        if (result) {
			if (!channel.deleted && lang) await tools.sendCatch(channel, lm.getString("channelDeleted", lang));
			logger.info("Channel " + channelID + " deleted successfully");
		} else {
			tools.sendCatch(channel, lm.getString("error", lang));
			logger.error("Error while deleting channel " + channelID);
		}
    },

    getGuildChannels: async function (guildID) {
		var result = await (await findCatch(col.channels, { guildID: guildID }, { projection: { _id: 0} })).toArray();
		if (!result) logger.error("Error while getting guild channels for guild " + guildID);
		return result || []
    },

    getChannelLang: async function (guildID, channelID) {
		const global = await db.getSetting(guildID, "global");
		var result = await findOneCatch(col.channels, { channel: channelID });
		if (!result) {
			if (global == null) logger.error("Error while getting channel lang for channel " + channelID + " in " + guildID);
			return "auto";
		}
		return result.lang;
    },

    setChannelLang: async function (guildID, channelID, lang) {
		const channelToFind = { channelID: channelID };
		var result = await findOneCatch(col.channels, channelToFind);
		if (result) {
			var result = await updateOneCatch(col.channels, channelToFind, { $set: { lang: lang } });
			if (result) logger.info("Channel " + channelID + " lang successfully set to " + lang);
			else logger.error("Error while setting channel " + channelID + " lang to " + lang);
		}
    },

    setSetting: async function (guildID, settingName, value) {
		const settingToFind = { guildID: guildID, setting: settingName };
		var result = await findOneCatch(col.settings, settingToFind);
		if (result) {
			var result = await updateOneCatch(col.settings, settingToFind, { $set: { value: value } });
			if (result) logger.info("Setting " + settingName + " successfully updated to " + value);
			else logger.error("Error while updating " + settingName + " to " + value);
		} else {
			var result = await insertOneCatch(col.settings, { guildID: guildID, setting: settingName, value: value });
			if (result) logger.info("Setting " + settingName + " successfully inserted as " + value);
			else logger.error("Error while inserting " + settingName + " as " + value);
		}
    },

    getSetting: async function (guildID, settingName) {
		var result = await findOneCatch(col.settings, { guildID: guildID, setting: settingName });
		if (result) return result.value;
		else {
			var result = await findOneCatch(col.defaultSettings, { setting: settingName });
			if (result) {
				var ok = await insertOneCatch(col.settings, { guildID: guildID, setting: settingName, value: result.value });
				if (ok) logger.info("Setting " + settingName + " was missing in " + guildID + " and was added");
				else logger.error("Error while adding missing setting " + settingName + " in " + guildID);
				return result.value;
			}
		}
		return null;
    },

	incrementCounter: async function () {
		const settingToFind = { setting: "counter" };
		var result = await findOneCatch(col.defaultSettings, settingToFind);
		if (result) await updateOneCatch(col.defaultSettings, settingToFind, { $set: { value: result.value+1 } });
		else logger.error("Error while incrementing counter");
    },

	getCounter: async function () {
		var result = await findOneCatch(col.defaultSettings, { setting: "counter" });
		if (!result) logger.error("Error while getting counter");
		return result.value || -1;
    },

	warnUser: async function (guildID, userID) {
		var result = await findOneCatch(col.usersGuild, { guildID: guildID, user: userID });
		if (result) {
			result.warns.push(Date.now());
			if (result.warns.length > 96) result.warns = removeSmallest(result.warns);
			var ok = await updateOneCatch(col.usersGuild, { guildID: guildID, user: userID }, { $set: {user: userID, warns: result.warns} });
			if (ok) logger.info("User updated and warned successfully");
			else logger.error("Errir while updating and warning user");
		}
		else {
			var ok = await insertOneCatch(col.usersGuild, { guildID: guildID, user: userID, warns: [Date.now()] });
			if (ok) logger.info("User added and warned successfully");
			else logger.error("Error adding and warning user");
		}
	},

	generateToken: async function (guildID, lang) {
		const token = require('crypto').randomBytes(32).toString('hex');
		var result = await findOneCatch(col.settings, {setting: "token"});
		if (result) {
			const toUpdate = { token: result.token };
			var result = await updateOneCatch(col.settings, toUpdate, { $set: {value: token, date: Date.now()} });
			if (result) logger.info("Document token updated successfully");
			else logger.error("Error while updating token");
		}
		else {
			var result = await insertOneCatch(col.settings, { setting: "token", value: token, date: Date.now() });
			if (result) logger.info("Document token inserted successfully");
			else logger.error("Error while inserting token");
		}
		return token;
    }
    // ------------------------------------- SOME FUNCTIONS ------------------------------------- //
}


// -------------------- SOME VARIABLES -------------------- //
var MongoClient = require('mongodb').MongoClient
const config = require('./config.json');
const { database, username, password, ip, port } = require('./dbconfig.json');
const tools = require('./tools.js');
const logger = require('./logger.js');
const eb = tools.embeds;
var client;
var mainDB;
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
    resetGuildSettings: async function (guildID, guildName, channel, lang) {
		const guildCollection = mainDB.collection(guildID);
		var result = await dropCatch(guildCollection);
		if (result) {
			if (channel) tools.sendCatch(channel, lm.getString("resetted", lang));
			logger.info("Deleted collection from server " + guildName);
		} else {
			tools.sendCatch(channel, lm.getString("error", lang));
			logger.error("Error while deleting collection from server " + guildName);
		}
    },

    addGuildChannel: async function (channel, lang) {
		const channelID = channel.id;
        const guildCollection = mainDB.collection(channel.guild.id);
        var result = await findOneCatch(guildCollection, { channel: channelID });
		if (result) { // If it already exist
			await tools.sendCatch(channel, lm.getString("alreadyAuthorized", lang));
			return; // Return if channel already exist
		}
        var result = await insertOneCatch(guildCollection, { channel: channelID, lang: "auto" });
		if (result) {
			await tools.sendCatch(channel, lm.getString("channelAdded", lang));
			logger.info("Channel " + channelID + " inserted successfully");
		} else {
			tools.sendCatch(channel, lm.getString("error", lang));
			logger.error("Error while inserting channel " + channelID);
		}
    },

    removeGuildChannel: async function (channel, lang) {
        const channelID = channel.id;
        const guildCollection = mainDB.collection(channel.guild.id);
        var result = await findOneCatch(guildCollection, { channel: channelID });
		if (!result) { // If channel doesn't exist
			if (!channel.deleted) tools.sendCatch(channel, lm.getString("channelNotInList", lang));
			return;
		}
        var result = await deleteOneCatch(guildCollection, { channel: channelID });
        if (result) {
			if (!channel.deleted) await tools.sendCatch(channel, lm.getString("channelDeleted", lang));
			logger.info("Channel " + channelID + " deleted successfully");
		} else {
			tools.sendCatch(channel, lm.getString("error", lang));
			logger.error("Error while deleting channel " + channelID);
		}
    },

    getGuildChannels: async function (guildID) {
		const guildCollection = mainDB.collection(guildID);
		var result = (await findCatch(guildCollection, {channel: {$exists: true}}, { projection: { _id: 0} })).toArray();
		if (!result) logger.error("Error while getting guild channels for guild " + guildID);
		return result || []
    },

    getChannelLang: async function (guildID, channelID) {
		const guildCollection = mainDB.collection(guildID);
		var result = await findOneCatch(guildCollection, { channel: channelID });
		if (!result) logger.error("Error while getting channel lang for guild " + guildID + " and channel " + channelID);
		return result.lang || {};
    },

	setChannelLang: async function (guildID, channelID, lang) {
		const guildCollection = mainDB.collection(guildID);
		const channelToFind = { channel: channelID };
		var result = await findOneCatch(guildCollection, channelToFind);
		if (result) {
			var result = await updateOneCatch(guildCollection, channelToFind, { $set: { lang: lang } });
			if (result) logger.info("Channel " + channelID + " lang successfully set to " + lang);
			else logger.error("Error while setting channel " + channelID + " lang to " + lang);
		}
    },

    setSetting: async function (guildID, settingName, value) {
		const guildCollection = mainDB.collection(guildID);
		const settingToFind = { setting: settingName };
		var result = await findOneCatch(guildCollection, settingToFind);
		if (result) {
			var result = await updateOneCatch(guildCollection, settingToFind, { $set: { value: value } });
			if (result) logger.info("Setting " + settingName + " successfully updated to " + value);
			else logger.error("Error while updating " + settingName + " to " + value);
		} else {
			var result = await insertOneCatch(guildCollection, { setting: settingName, value: value });
			if (result) logger.info("Setting " + settingName + " successfully inserted as " + value);
			else logger.error("Error while inserting " + settingName + " as " + value);
		}
    },

    getSetting: async function (guildID, settingName) {
		const guildCollection = mainDB.collection(guildID);
		const settingToFind = { setting: settingName }
		var result = await findOneCatch(guildCollection, settingToFind);
		if (result) return result.value;
		else {
			const globalCollection = mainDB.collection("Global");
			var result = await findOneCatch(globalCollection, settingToFind);
			if (result) {
				var ok = await insertOneCatch(guildCollection, { setting: settingName, value: result.value });
				if (ok) logger.info("Setting " + settingName + " was missing in " + guildID + " and was added");
				else logger.error("Error while adding missing setting " + settingName + " in " + guildID);
				return result.value;
			}
		}
		return null;
    },

	getTriggerTable: async function (lang) {
		const guildCollection = mainDB.collection("Global");
		const settingToFind = { setting: "triggerTable-" + lang }
		var result = await findOneCatch(guildCollection, settingToFind);
		if (result) return result.value;
		else { logger.error("Error while finding trigger table " + settingToFind); }
    },

	getAllServers: async function () {
		var result = (await listCatch(mainDB)).toArray();
		if (!result) logger.error("Error while getting all servers from mainDB");
		return result || [];
    },

	incrementCounter: async function () {
		const guildCollection = mainDB.collection("Global");
		const settingToFind = { setting: "counter" };
		var result = await findOneCatch(guildCollection, settingToFind);
		if (result) await updateOneCatch(guildCollection, settingToFind, { $set: { value: result.value+1 } });
		else logger.error("Error while incrementing counter");
    },

	getCounter: async function () {
		const guildCollection = mainDB.collection("Global");
		var result = await findOneCatch(guildCollection, { setting: "counter" });
		if (!result) logger.error("Error while getting counter");
		return result.value || -1;
    },

	warnUser: async function (guildID, userID) {
		const guildCollection = mainDB.collection(guildID);
		var result = await findOneCatch(guildCollection, { user: userID });
		if (result) {
			const toUpdate = { user: userID };
			result.warns.push(Date.now());
			if (result.warns.length > 32) result.warns = removeSmallest(result.warns); 
			var ok = await updateOneCatch(guildCollection, toUpdate, { $set: {user: userID, warns: result.warns} });
			if (ok) logger.info("User updated and warned successfully");
			else logger.error("Errir while updating and warning user");
		}
		else {
			var ok = await insertOneCatch(guildCollection, { user: userID, warns: [Date.now()] });
			if (ok) logger.info("User added and warned successfully");
			else logger.error("Error adding and warning user");
		}
	},

	generateToken: async function (guildID, lang) {
		const token = require('crypto').randomBytes(32).toString('hex');
		const guildCollection = mainDB.collection(guildID);
		var result = await findOneCatch(guildCollection, {token: {$exists: true}}, { projection: { _id: 0} });
		if (result) {
			const toUpdate = { token: result.token };
			var result = await updateOneCatch(guildCollection, toUpdate, { $set: {token: token, date: Date.now()} });
			if (result) logger.info("Document token updated successfully");
			else logger.error("Error while updating token");
		}
		else {
			var result = await insertOneCatch(guildCollection, { token: token, date: Date.now() });
			if (result) logger.info("Document token inserted successfully");
			else logger.error("Error while inserting token");
		}
		return token;
    }
    // ------------------------------------- SOME FUNCTIONS ------------------------------------- //
}

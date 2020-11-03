
// -------------------- SOME VARIABLES -------------------- //
var MongoClient = require('mongodb').MongoClient
const config = require('./config.json');
const { database, username, password, ip, port } = require('./dbconfig.json');
const tools = require('./tools.js');
const logger = require('./logger.js');
const lm = require('./languages-manager.js');
const eb = tools.embeds;
var client;
var mainDB;
// -------------------- SOME VARIABLES -------------------- //



module.exports = {
    // ------------------------------------- INIT AND CLOSE ------------------------------------- //
    init: function () {
        return new Promise(function (resolve, reject) {
			logger.info("Database connection...");
            const url = 'mongodb://' + username + ':' + password + '@' + ip + ':' + port + '/' + database + '?authSource=admin';
            MongoClient.connect(url, { useNewUrlParser: true, useUnifiedTopology: true, poolSize: 1 }, function (err, tempClient) {
                if (!err) {
					 client = tempClient;
					mainDB = client.db(database);
					logger.success("Database ready");
					resolve();
				} else {
					logger.error(err);
					process.exit(1);
				}
            });
        });
    },
	
    close: function () {
        client.close();
		logger.success("Database closed");
    },
    // ------------------------------------- INIT AND CLOSE ------------------------------------- //



    // ------------------------------------- SOME FUNCTIONS ------------------------------------- //
    resetGuildSettings: function (guildID, guildName, channel, lang) {
		return new Promise(function (resolve, reject) {
			const guildCollection = mainDB.collection(guildID);
			guildCollection.drop(function (err, result) {
				if (!err) {
					if (channel) tools.sendCatch(channel, lm.getString("resetted", lang));
					logger.info("Deleted collection from server " + guildName);
					resolve();
				} else {
					if (channel) tools.sendCatch(channel, lm.getString("resettedError", lang));
					logger.error(err);
					resolve();
				}
			});
		});
    },

    addGuildChannel: function (channel, lang) {
		const channelID = channel.id;
        const guildCollection = mainDB.collection(channel.guild.id);
        guildCollection.findOne({ channel: channelID }, function (err, result) { // Try to find the channel to add
            if (!err) {
				if (result) { // If it already exist
					tools.sendCatch(channel, lm.getString("alreadyAuthorized", lang));
					return; // Return if channel already exist
				}
			} else {
				tools.sendCatch(channel, "channelAddedError");
				logger.error(err);
			}
            guildCollection.insertOne({ channel: channelID }, function (err, item) { // Insert channel:4891657867278524898
                if (!err) {
                    tools.sendCatch(channel, lm.getString("channelAdded", lang));
                    logger.info("Document { channel:" + channelID + " } inserted successfully");
                } else {
                    tools.sendCatch(channel, lm.getString("channelAddedError", lang));
                    logger.error(err);
                }
            });
        });
    },

    removeGuildChannel: function (channel, lang) {
        const channelID = channel.id;
        const guildCollection = mainDB.collection(channel.guild.id);
        guildCollection.findOne({ channel: channelID }, function (err, result) { // Try to find the channel to add
            if (!err) {
				if (!result) { // If channel doesn't exist
					if (!channel.deleted) tools.sendCatch(channel, lm.getString("channelNotInList", lang));
					return;
				}
			} else {
				tools.sendCatch(channel, lm.getString("channelDeletedError", lang));
                logger.error(err);
			}
            guildCollection.deleteOne({ channel: channelID }, function (err, item) { // Delete channel:4891654898
                if (!err) {
                    if (!channel.deleted) tools.sendCatch(channel, lm.getString("channelDeleted", lang));
                    logger.info("Document { channel:" + channelID + " } deleted successfully");
                } else {
                    if (!channel.deleted) tools.sendCatch(channel, lm.getString("channelDeletedError", lang));
                    logger.error(err);
                }
            });
        });
    },

    getGuildChannels: function (guildID) {
        return new Promise(function (resolve, reject) {
            const guildCollection = mainDB.collection(guildID);
            guildCollection.find({channel: {$exists: true}}, { projection: { _id: 0, channel: 1 } }).toArray(function (err, result) {
                if (err) logger.error(err);
                resolve(result);
            });
        });
    },

    setSetting: function (guildID, settingName, value) {
        return new Promise(async function (resolve) {
            const guildCollection = mainDB.collection(guildID);
            const settingToFind = { setting: settingName };
            guildCollection.findOne(settingToFind, function (err, result) {
				if (err) logger.error(err);
				if (result) {
					guildCollection.updateOne(settingToFind, { $set: { value: value } });
					resolve();
				} else {
					guildCollection.insertOne({ setting: settingName, value: value });
					resolve();
				}
            });
        });
    },

    getSetting: function (guildID, settingName) {
        return new Promise(async function (resolve, reject) {
            const guildCollection = mainDB.collection(guildID);
            guildCollection.findOne({ setting: settingName }, function (err, setting) {
                if (err) logger.error(err);
				if (setting) {
                    resolve(setting.value);
                } else {
                    resolve(setting);
                }
            });
        });
    },
	
	getAllServers: function () {
		return new Promise(async function (resolve, reject) {
			mainDB.listCollections().toArray(function(err, collInfos) {
				if (err) logger.error(err);
				resolve(collInfos);
			});
		});
    },
	
	incrementCounter: function () {
		const guildCollection = mainDB.collection("Global");
		const settingToFind = { setting: "counter" };
		guildCollection.findOne(settingToFind, function (err, result) {
			if (err) logger.error(err);
			if (result) {
				guildCollection.updateOne(settingToFind, { $set: { value: result.value+1 } });
			}
		});
    },
	
	getCounter: function () {
		return new Promise(async function (resolve, reject) {
			const guildCollection = mainDB.collection("Global");
			guildCollection.findOne({ setting: "counter" }, function (err, setting) {
				if (err) logger.error(err);
				if (setting) {
					resolve(setting.value);
				} else {
					resolve(setting);
				}
			});
		});
    }
    // ------------------------------------- SOME FUNCTIONS ------------------------------------- //
}

/**
 * @file Manages the database inputs / outputs
 * @author jojos38
 */



// ---------------------------- SOME VARIABLES ---------------------------- //
const {database, username, password, ip, port} = require('../dbconfig.json');
const MongoClient = require('mongodb').MongoClient;
const logger = require('../logger.js');
const NodeCache = require('node-cache');
// ---------------------------- SOME VARIABLES ---------------------------- //



class Database {
    #cache;
    #client;
    #col;
    #disabledCaches;

    /**
     * Those are just basic functions but that catches errors
     */
    static async #findOne(collection, toFind, filter) {
        try {return await collection.findOne(toFind, filter || {projection: {_id: 0}});}
        catch (err) {console.log(toFind); logger.error(err); return null;}
    }

    static async #findMany(collection, toFind, filter) {
        try {return await collection.find(toFind, filter || {projection: {_id: 0}});}
        catch (err) {console.log(toFind); logger.error(err); return null;}
    }

    static async #findOneAndUpdate(collection, toFindAndUpdate, update, filter) {
        try {return await collection.findOneAndUpdate(toFindAndUpdate, update || {projection: {_id: 0}}, filter || {returnOriginal: false});}
        catch (err) {console.log(toFindAndUpdate); logger.error(err); return null;}
    }

    static async #deleteOne(collection, toDelete, filter) {
        try {return await collection.deleteOne(toDelete, filter || {projection: {_id: 0}});}
        catch (err) {console.log(toDelete); logger.error(err); return null;}
    }

    static async #deleteMany(collection, toDelete, filter) {
        try {return await collection.deleteMany(toDelete, filter || {projection: {_id: 0}});}
        catch (err) {console.log(toDelete); logger.error(err); return null;}
    }

    static async #insertOne(collection, toInsert, filter) {
        try {return await collection.insertOne(toInsert, filter || {projection: {_id: 0}});}
        catch (err) {console.log(toInsert); logger.error(err); return null;}
    }

    static async #updateOne(collection, toUpdate, newValue, options) {
        try {return await collection.updateOne(toUpdate, newValue, options);}
        catch (err) {console.log(toUpdate); logger.error(err); return null;}
    }

    static async #exists(collection, item) {
        try {return await collection.findOne(item, {projection: {_id: 1}}) !== undefined;}
        catch (err) {console.log(item); logger.error(err); return null;}
    }

    static async #aggregate(collection, query) {
        try {return await collection.aggregate(query);}
        catch (err) {console.log(query); logger.error(err); return null;}
    }

    static async #count(collection, query, filter) {
        try {return await collection.countDocuments(query, filter);}
        catch (err) {console.log(query); logger.error(err); return null;}
    }

    static #removeSmallest(arr) {
        const min = Math.min.apply(null, arr);
        return arr.filter((e) => {return e != min});
    }

    /**
     * Open the connection to the database
     */
    async init() {
        logger.info('Database connecting...');
        this.#disabledCaches = [];
        this.#cache = new NodeCache({stdTTL: 900});
        const url = 'mongodb://' + username + ':' + password + '@' + ip + ':' + port + '/' + database;
        try {
            this.#client = await MongoClient.connect(url);
            const mainDB = this.#client.db(database);
            this.#col = {
                users: mainDB.collection('users'),
                channels: mainDB.collection('channels'),
                usersGuild: mainDB.collection('users_guild'),
                settings: mainDB.collection('settings_guild'),
                defaultSettings: mainDB.collection('settings_default')
            };
            logger.success('Database connected');
            return this;
        } catch (err) {
            logger.error(err);
            process.exit(1);
        }
    }

    /**
     * Closes the database connection
     */
    async close() {
        if (this.#client.close) {
            logger.info('Closing database...');
            await this.#client.close();
            logger.success('Database closed');
        } else logger.warn('Database not initialized');
    }

    /**
     * Add all the settings to a guild
     * @returns Success
     */
    async addGuildSettings(guildID) {
        // await this.setSetting(guildID, '', '');
    }

    /**
     * Deletes every setting and users data from a guild
     */
    async resetGuildSettings(guildID) {
        await Database.#deleteMany(this.#col.channels, {guildID: guildID});
        await Database.#deleteMany(this.#col.usersGuild, {guildID: guildID});
        await Database.#deleteMany(this.#col.settings, {guildID: guildID});
        logger.info('Settings resetted successfully for guild ' + guildID);
    }

    /**
     * Adds a guild channel inside the database (allow the bot to scan messages inside it)
     * @return {boolean} True if the channel was inserted, false it was existing
     */
    async addGuildChannel(guildID, channelID) {
        // Insert channel if it doesn't exists
        const query = {guildID: guildID, channelID: channelID, lang: 'auto'};
        const result = await Database.#updateOne(this.#col.channels, query, { '$set': query }, {upsert: true});
        logger.info('Channel ' + channelID + ' inserted successfully in guild ' + guildID);
        return result.upsertedCount === 1; // If upsert means the channel was inserted, else it already existed
    }

    /**
     * Removes a guild channel from the database (disallow the bot from scanning the messages inside it)
     * @return {boolean} True if the channel was deleted, false it was not existing
     */
    async removeGuildChannel(channelID) {
        // If channel exists, delete it
        const result = await Database.#deleteOne(this.#col.channels, {channelID: channelID});
        logger.info('Channel ' + channelID + ' deleted successfully');
        return result.deletedCount === 1;
    }

    /**
     * Used by the channels command to list the channels
     * @return {Array} All the added channels of a given guild
     */
    async getGuildChannels(guildID) {
        const channels = await (await Database.#findMany(this.#col.channels, {guildID: guildID}, {
            projection: {
                _id: 0,
                guildID: 0
            }
        })).toArray();
        return channels || []
    }

    /**
     * Insert a setting which is missing from a guild
     * @return The value of the setting
     */
    async #insertMissingSetting(guildID, settingName) {
        const projection = {projection: {_id: 0, guildID: 0}};
        const globalSetting = await Database.#findOne(this.#col.defaultSettings, {setting: settingName}, projection);
        if (globalSetting) {
            const success = await Database.#insertOne(this.#col.settings, {
                guildID: guildID,
                setting: settingName,
                value: globalSetting.value
            });
            if (success) logger.info('Setting ' + settingName + ' was missing in ' + guildID + ' and was added'); else logger.error('Error while adding missing setting ' + settingName + ' in ' + guildID);
            return globalSetting.value;
        } else logger.error('Setting ' + settingName + ' was not found in default_settings');
    }

    #cacheAllowed(guildID) {
        for(const guild of this.#disabledCaches) {
            if (guild.guildID === guildID) {
                if (Date.now() - guild.time < 900000)  return false
                else this.#disabledCaches = this.#disabledCaches.filter(function( obj ) { return obj.guildID !== guildID; });
            }
        }
        return true;
    }

    /**
     * Get a setting from a guild
     * @return The value of the setting
     * @param guildID The guild ID
     * @param settingName The name of the setting
     */
    async getSetting(guildID, settingName) {
        // Cache
        if (this.#cacheAllowed(guildID)) {
            const cachedSetting = this.#cache.get(guildID + settingName);
            if (cachedSetting) return cachedSetting;
        }

        // Query
        const projection = {projection: {_id: 0, guildID: 0, setting: 0}};
        const query = {guildID: guildID, setting: settingName};
        let setting = await Database.#findOne(this.#col.settings, query, projection);
        if (setting != null) setting = setting.value; else setting = await this.#insertMissingSetting(guildID, settingName);
        this.#cache.set(guildID + settingName, setting);
        return setting;
    }

    /**
     * Get multiple settings from a guild
     * @return A key value object or null
     * @param guildID The guild ID
     * @param settingsNames An array of the setting names
     */
    async getSettings(guildID, settingsNames) {
        let returnSettings = {};
        // Cache
        if (this.#cacheAllowed(guildID)) {
            const tmpCache = [...settingsNames]; // Make a copy of the array otherwise splice causes issues
            for (const [i, setting] of tmpCache.entries()) {
                const cacheSetting = this.#cache.get(guildID + setting);
                if (cacheSetting) {
                    returnSettings[setting] = cacheSetting;
                    settingsNames.splice(i, 1);
                }
            }
        }

        // Database query, get all the settings that were not cached
        const projection = {projection: {_id: 0, guildID: 0}};
        const query = {guildID: guildID, setting: {$in: []}};
        for (const setting of settingsNames) query.setting.$in.push(setting);
        const tmpSettings = await (await Database.#findMany(this.#col.settings, query, projection)).toArray();

        // Parse to a key value map
        // If setting already exists in database
        for (const tmpSetting of tmpSettings) {
            // Get the settings and cache them
            returnSettings[tmpSetting.setting] = tmpSetting.value;
            this.#cache.set(guildID + tmpSetting, returnSettings[tmpSetting]);
        }
        // If settings didn't exist in database
        for (const tmpSetting of settingsNames) {
            // Add the missing settings and cache them
            if (returnSettings[tmpSetting] === undefined) returnSettings[tmpSetting] = await this.#insertMissingSetting(guildID, tmpSetting);
            this.#cache.set(guildID + tmpSetting, returnSettings[tmpSetting]);
        }
        return returnSettings;
    }

    /**
     * Set a setting for a guild
     */
    async setSetting(guildID, settingName, value) {
        const settingToFind = { guildID: guildID, setting: settingName };
        if (await Database.#updateOne(this.#col.settings, settingToFind, { $set: { value: value } }, { upsert: true })) {
            logger.info('Setting ' + settingName + ' successfully updated to ' + value);
            this.#cache.set(guildID + settingName, value);
        }
        else logger.error('Error while updating ' + settingName + ' to ' + value);
    }

    /**
     *
     * @param lang
     * @returns {Promise<*>}
     */
    async getTriggerTable(lang) {
        return (await Database.#findOne(this.#col.defaultSettings, { setting: lang + 'TriggerTable' })).value;
    }

    /**
     * Get the default language for a specific channel
     * @param guildID The guild ID
     * @param channelID The channel ID
     * @returns {Promise<string|*>} The language of the channel (en, fr, auto...)
     */
    async getChannelLang(guildID, channelID) {
        const result = await Database.#findOne(this.#col.channels, { channelID: channelID });
        if (!result) {
            if (global == null) logger.error('Error while getting channel lang for channel ' + channelID + ' in ' + guildID);
            return 'auto';
        }
        return result.lang;
    }

    /**
     * Set the language of a channel
     * @param guildID The guild ID
     * @param channelID The channel ID
     * @param lang The new language
     * @returns {Promise<void>}
     */
    async setChannelLang(guildID, channelID, lang) {
        const channelToFind = { channelID: channelID };
        const result = await Database.#updateOne(this.#col.channels, channelToFind, { $set: { lang: lang}}, {upsert: true});
        if (result) logger.info('Channel ' + channelID + ' lang successfully set to ' + lang);
        else logger.error('Error while setting channel ' + channelID + ' lang to ' + lang);
    }

    /**
     * Increments the counter of analyzed messages by one
     * @returns {Promise<void>}
     */
    async incrementCounter() {
        await Database.#updateOne(this.#col.defaultSettings, {setting: 'counter'}, {'$inc': {value: 1}}, {upsert: true});
    }

    /**
     * Get the counter value
     * @returns {Promise<*|null|undefined>}
     */
    async getCounter() {
        return (await Database.#findOne(this.#col.defaultSettings, { setting: "counter" })).value;
    }

    /**
     * Warn a user
     * @param guildID The guild ID
     * @param userID The user ID
     * @returns {Promise<void>}
     */
    async warnUser(guildID, userID) {
        const result = await Database.#findOne(this.#col.usersGuild, { guildID: guildID, userID: userID });
        if (result) {
            result.warns.push(Date.now());
            if (result.warns.length > 256) result.warns = Database.#removeSmallest(result.warns);
            const ok = await Database.#updateOne(this.#col.usersGuild, { guildID: guildID, userID: userID }, { $set: {warns: result.warns} });
            if (ok) logger.info("User updated and warned successfully");
            else logger.error("Errir while updating and warning user");
        }
        else {
            const ok = await Database.#insertOne(this.#col.usersGuild, { guildID: guildID, userID: userID, warns: [Date.now()] });
            if (ok) logger.info("User added and warned successfully");
            else logger.error("Error adding and warning user");
        }
    }

    /**
     * Generate a token for the web interface and disable logging for 15 minutes
     */
    async generateToken(guildID) {
        const token = require('crypto').randomBytes(32).toString('hex');
        await this.setSetting(guildID, 'token', {token: token, date: Date.now()});
        this.#disabledCaches.push({guildID: guildID, time: Date.now()});
        logger.info("Cache disabled for 15 minutes for " + guildID)
        return token;
    }

    /**
     * [OWNER] Clear the cache
     */
    clearCache() {
        const totalKeys = this.#cache.getStats().keys;
        this.#cache.flushAll();
        logger.info('Database cache cleared (' + totalKeys + ' keys cleared)');
    }
}

module.exports = Database;

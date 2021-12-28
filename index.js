/**
 * @file Main bot file
 * @author jojos38
 * @invite https://discord.com/oauth2/authorize?client_id=772446137499385866&scope=applications.commands%20bot&permissions=277159685126
 */



const logger = require('./logger.js');
const tools = require('./tools');
const perspectiveManager = require('./managers/perspective-manager');
const databaseManager = require('./managers/database-manager');
const languageManager = require('./managers/language-manager');
const apiManager = require('./managers/api-manager');
const {Client, Intents} = require('discord.js');

class Observation {
    #config;
    #client;
    #db;
    #lm;
    #ap;
    #pm;

    constructor(config) {this.#config = config;}

    async init() {
        this.#client = new Client({intents: [Intents.FLAGS.DIRECT_MESSAGES, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILDS]});
        this.#db = await new databaseManager().init();
        this.#lm = await new languageManager().init();
        this.#pm = await new perspectiveManager(this.#db, this.#config.perspectiveApiKey, this.#lm.getLocales());
        this.#ap = new apiManager(this.#client, this.#config.id, this.#config.discordTokens).init();
        await this.#client.login(this.#config.token);
        this.#client.on('ready', this.#ready.bind(this));
        this.#client.on('disconnect', this.#onDisconnect.bind(this));
        this.#client.on('channelDelete', this.#onChannelDelete.bind(this));
        this.#client.on('guildDelete', this.#onGuildDelete.bind(this));
        this.#client.on('messageCreate', this.#onMessageCreate.bind(this));
        this.#client.on('messageUpdate', this.#onMessageUpdate.bind(this));
        this.#client.on('interactionCreate', this.#onInteractionCreate.bind(this));
	this.#client.user.setPresence({ activities: [{ name: 'New update slash commands' }] });
    }

    /**
     * Returns a string of channels mention for the /channels command
     * @param guildID The guildID
     * @param lang The language
     * @returns {Promise<string>}
     */
    async #getChannelsString(guildID, lang) {
        const channels = await this.#db.getGuildChannels(guildID)
        let channelsString = '';
        // Loop trough each channel and add them to a string
        for (let i = 0; i < channels.length; i++) {
            channelsString = channelsString + '\n<#' + channels[i].channelID + '> [' + channels[i].lang + ']';
        }
        // If the string is empty, mean there was no channel
        if (channelsString === '') channelsString = this.#lm.getString('noChannel', lang);
        return channelsString;
    }

    /**
     * Converts seconds into a dd:hh:mm:ss format for the /info command
     * @param seconds
     * @returns {string}
     */
    static #format(seconds) {
        function pad(s) { return (s < 10 ? '0' : '') + s; }
        let days = Math.floor(seconds / (24 * 3600));
        seconds = seconds % (24 * 3600);
        let hours = Math.floor(seconds / 3600);
        seconds %= 3600;
        let minutes = Math.floor(seconds / 60);
        seconds %= 60;
        seconds = Math.floor(seconds);
        return pad(days) + ':' + pad(hours) + ':' + pad(minutes) + ':' + pad(seconds);
    }

    /**
     * Add or remove a channel from the eyes of Observation
     * @param add Either the channel will be added or removed (true / false)
     * @param channel The channel to add or remove
     * @returns {Promise<string>}
     */
    async #updateChannelDB(add, channel) {
        if (channel.type === 'GUILD_TEXT') {
            const success = add ? await this.#db.addGuildChannel(channel.guild.id, channel.id) : await this.#db.removeGuildChannel(channel.id);
            return add ? (success ? 'channelAdded' : 'alreadyAdded') : (success ? 'channelRemoved' : 'alreadyRemoved');
        }
    }

    /**
     * Return true if the member is the creator of the bot or has the MANAGE_GUILD permission
     * @param member
     * @returns {boolean}
     */
    #hasPermission(member) {
        if (!member) return false;
        else if (member.permissions.has('MANAGE_GUILD')) return true; // Admin perms
        else return member.id === this.#config.owner; // Owner perm
    }

    /**
     * Returns true if the channel is allowed within the eyes of Observation
     * @param channel
     * @returns {Promise<boolean>}
     */
    async #channelAllowed(channel) {
        const channels = await this.#db.getGuildChannels(channel.guild.id);
        const channelID = channel.id;
        for (channel of channels) if (channel.channelID === channelID) return true; // If message is sent from allowed channel then return
        return false;
    }

    /**
     * Check and add / remove a word from / to the whitelist / blacklist
     * @param guildID The guild ID
     * @param listType whitelist or blacklist
     * @param choice add remove or list
     * @param word The word to add or remove
     * @returns {Promise<string>}
     */
    async #updateList(guildID, listType, choice, word) {
        let wordsList = await this.#db.getSetting(guildID, listType);
        if (choice !== 'list' && !word) return 'listEmptyWord';
        word = word.toLowerCase();

        // Check list length
        if (wordsList.length >= 64) return 'listFull';

        // Interact with the word
        if (choice === 'add') {
            // Check the word
            if (word.length < 1 || word.length > 32) return 'listWordLength';
            if (wordsList.includes(word)) return 'listContains';
            wordsList.push(word);
            await this.#db.setSetting(guildID, listType, wordsList);
            return 'listAdded';
        } else if (choice === 'remove') {
            if (!word) return 'listEmptyWord';
            if (!wordsList.includes(word)) return 'listDoesntContains';
            wordsList.splice(wordsList.indexOf(word), 1);
            await this.#db.setSetting(guildID, listType, wordsList);
            return 'listRemoved';
        }
    }

    /**
     * Check a message and display the warning message
     * @param message
     * @returns {Promise<void>}
     */
    async #checkMessage(message) {
        const guildID = message.guildId;
        if (!message.member || !message.guild || message.author.bot || (!await this.#channelAllowed(message.channel) && !await this.#db.getSetting(guildID, 'global'))) return; // Make all checks
        const lang = await this.#db.getSetting(guildID, 'lang');
        const result = await this.#pm.checkMessage(message.content, guildID, message.channel.id, lang);
        if (result && result.positive) {
            // Values
            logger.info('Message "' + message.content.replace(/\n/g, ' ') + '" have been warned for ' + JSON.stringify(result.values) + ' (' + message.guild.name + ')');
            const {showWarn, deleteMessage, deleteDelay, logChannel, logMessage} = await this.#db.getSettings(guildID, ['showWarn', 'deleteMessage', 'deleteDelay', 'logChannel', 'logMessage']);
            const nickname = message.member.nickname || message.author.username;
            await this.#db.warnUser(guildID, message.author.id);
            // If we display the warning message
            if (showWarn) {
                const warnMessage = await tools.sendCatch(message.channel, this.#lm.getEmbed('warn', lang, {result: result, nickname: nickname}), true);
                setTimeout(() => tools.deleteCatch(warnMessage), deleteDelay);
            }
            // If there is a log channel
	    const channel = logChannel === '0' ? undefined : this.#client.channels.cache.get(logChannel);
            if (channel) {
                let warnString = '';
                for(let type in result.values) warnString = warnString + '- ' + result.values[type].name + ' ' + (result.values[type].value / 10) + '%\n';
                warnString = warnString.slice(0, -1);
                const messageToSend = logMessage
                    .replace('{{warn}}', warnString)
                    .replace('{{userid}}', message.author.id)
                    .replace('{{username}}', nickname)
                    .replace('{{usermention}}', message.author.toString())
                    .replace('{{message}}', message.content)
                    .replace('{{messageurl}}', deleteMessage ? '[Message deleted by bot]' : message.url)
                    .replace('{{date}}', new Date(message.createdTimestamp).toISOString().replace(/T/, ' ').replace(/\..+/, ''))
                    .replace('{{channelid}}', message.channel.id)
                    .replace('{{channelmention}}', message.channel.toString());
                await tools.sendCatch(channel, {color: 15728640, title: 'Observation', description: messageToSend}, true);
            }
            // If the original message should be deleted
            if (deleteMessage) await tools.deleteCatch(message);
        }
    }

    #ready() {
        logger.success(`Bot ready (${this.#client.user.tag})`);
    }

    #onDisconnect() {
        logger.error('Connection to Discord lost');
    }

    #onMessageCreate(message) {
        this.#checkMessage(message);
    }

    #onMessageUpdate(oldMessage, newMessage) {
        if (Math.abs(oldMessage.content.length - newMessage.content.length) > 3) this.#checkMessage(newMessage);
    }

    #onChannelDelete(channel) {
        this.#db.removeGuildChannel(channel.id);
    }

    #onGuildDelete(guild) {
        this.#db.resetGuildSettings(guild.id, guild.name, null, null).then(() => logger.info('Bot removed from server: ' + guild.name));
    }

    async #onInteractionCreate(interaction) {
        if (!interaction.member || !interaction.guild || interaction.user.bot) return; // Make all checks
        if (interaction.isButton()) {
            const customID = interaction.customId;
            const lang = await this.#db.getSetting(interaction.guildId, 'lang');
            switch (customID) {
                case 'resetConfirm':
                    await this.#db.resetGuildSettings(interaction.guildId);
                    await tools.replyCatch(interaction, this.#lm.getString('resetted', lang), false, true);
                    break;
                case 'resetCancel':
                    await tools.replyCatch(interaction, this.#lm.getString('resetCancel', lang), false, true);
                    break;
                case 'configConfirm':
                    const token = await this.#db.generateToken(interaction.guildId);
                    const link = 'https://observation.ddns.net/?tok=' + token + '&sid=' + interaction.guildId;
                    await tools.replyCatch(interaction, this.#lm.getString('configLink', lang, {link: link}), false, true);
                    break;
                case 'configCancel':
                    await tools.replyCatch(interaction, this.#lm.getString('configCancel', lang), false, true);
                    break;
            }
        }

        if (interaction.isCommand()) {
            const cmd = interaction.commandName;
            const lang = await this.#db.getSetting(interaction.guildId, 'lang');

            // User commands
            switch (cmd) {
                case 'help':
                    await tools.replyCatch(interaction, this.#lm.getEmbed('help', lang, {}), true, true);
                    break;
                case 'admin':
                    await tools.replyCatch(interaction, this.#lm.getEmbed('admin', lang, {}), true, true);
                    break;
                case 'info':
                    const guilds = this.#client.guilds.cache;
                    const uptime = Observation.#format(process.uptime());
                    const counter = await this.#db.getCounter();
                    const guildsCount = guilds.size;
                    let usersCount = 0;
                    guilds.forEach(g => {usersCount += g.memberCount;});
                    await tools.replyCatch(interaction, this.#lm.getEmbed('info', lang, {usersCount, guildsCount, uptime, counter}), true, false);
                    break;
            }

            // Admin commands
            if (!this.#hasPermission(interaction.member)) {
                await tools.replyCatch(interaction, this.#lm.getString('noPermission', lang), false, true);
                return
            }
            switch(cmd) {
                case 'channels':
                    await tools.replyCatch(interaction, await this.#getChannelsString(interaction.guildId, lang), false, true);
                    break;
                case 'add':
                case 'remove':
                    const channel = interaction.options.getChannel('channel');
                    const result = await this.#updateChannelDB(interaction.commandName === 'add', channel);
                    interaction.reply(this.#lm.getString(result, lang, {channel: '<#' + channel.id + '>'}));
                    break;
                case 'whitelist':
                case 'blacklist': {
                    const listType = interaction.commandName;
                    const choice = interaction.options.getString('action') || 'list';
                    const word = interaction.options.getString('word');
                    if(choice === 'list') {
                        let wordsList = await this.#db.getSetting(interaction.guildId, listType);
                        if (wordsList.length > 0) await tools.replyCatch(interaction, wordsList.join(', '), false, true);
                        else await tools.replyCatch(interaction, this.#lm.getString('listEmpty', lang, {list: listType}), false, true);
                    }
                    else {
                        const result = await this.#updateList(interaction.guildId, listType, choice, word);
                        await tools.replyCatch(interaction, this.#lm.getString(result, lang, {word: word, list: listType}), false, true);
                    }
                    break;
                }
                case 'language': {
                    const botLang = interaction.options.getString('language');
                    await this.#db.setSetting(interaction.guildId, 'lang', botLang);
                    await tools.replyCatch(interaction, this.#lm.getString('langSet', botLang, {lang: botLang}), false, true);
                    break;
                }
                case 'log': {
                    const channel = interaction.options.getChannel('channel');
                    await this.#db.setSetting(interaction.guildId, 'logChannel', channel.id);
                    await tools.replyCatch(interaction, this.#lm.getString('logChannelAdded', lang, {channel: '<#' + channel.id + '>'}), false, true);
                    break;
                }
                case 'disablelogs': {
                    await this.#db.setSetting(interaction.guildId, 'logChannel', '0');
                    await tools.replyCatch(interaction, this.#lm.getString('logChannelRemoved', lang), false, true);
                    break;
                }
                case 'analyze': {
                    const messageContent = interaction.options.getString('message');
                    const result = await this.#pm.checkMessage(messageContent, interaction.guild.id, interaction.channel.id, lang, true);
                    const nickname = interaction.member.nickname || interaction.user.username;
                    await tools.replyCatch(interaction, this.#lm.getEmbed('warn', lang, {result: result, nickname: nickname, analyze: true}), true, false);
                    break;
                }
                case 'channellang': {
                    const channel = interaction.options.getChannel('channel');
                    const channelLang = interaction.options.getString('language');
                    if(await this.#channelAllowed(channel)) {
                        await this.#db.setChannelLang(interaction.guildId, channel.id, channelLang);
                        await tools.replyCatch(interaction, this.#lm.getString('channelLangSet', lang, {channel: '<#' + channel.id + '>', lang: channelLang}), false, true);
                    } else {
                        await tools.replyCatch(interaction, this.#lm.getString('channelNotAdded', lang, {channel: '<#' + channel.id + '>'}), false, true);
                    }
                    break;
                }
                case 'config':
                    await interaction.reply({
                        content: this.#lm.getString('configConfirm', lang),
                        components: [{
                            type: 1,
                            components: [
                                {type: 2, label: 'Confirm', style: 4, custom_id: 'configConfirm'},
                                {type: 2, label: 'Cancel', style: 2, custom_id: 'configCancel'}
                            ]
                        }]
                    });
                    break;
                case 'reset':
                    await interaction.reply({
                        content: this.#lm.getString('resetConfirm', lang),
                        components: [{
                            type: 1,
                            components: [
                                {type: 2, label: 'Confirm', style: 4, custom_id: 'resetConfirm'},
                                {type: 2, label: 'Cancel', style: 2, custom_id: 'resetCancel'}
                            ]
                        }]
                    });
                    break;
            }
        }
    }
}

/**
 * Entry point
 */
function start() {
    const config = require('./config.json');
    const bot = new Observation(config);
    bot.init();
}
start();

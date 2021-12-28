/**
 * @file Manages Perspective API interactions
 * @author jojos38
 */



// --------- SOME VARIABLES --------- //
const logger = require('../logger.js');
const https = require('https');
const NodeCache = require('node-cache');
const tools = require('../tools');

// --------- SOME VARIABLES --------- //


class PerspectiveManager {
    static MIN_MSG_LEN = 3;
    static MAX_MSG_LEN = 2000;
    #languages;
    #token;
    #cache;
    #db;

    constructor(db, token, languages) {
        this.#db = db;
        this.#token = token;
        this.#cache = new NodeCache({stdTTL: 900});
        this.#languages = languages;
    }

    async #request(data) {
        return new Promise(async (resolve) => {
            data = JSON.stringify(data);
            const options = {
                hostname: 'commentanalyzer.googleapis.com',
                path: '/v1alpha1/comments:analyze?key=' + this.#token,
                port: 443,
                method: 'POST',
                timeout: 3000,
                headers: {
                    'Content-Type': 'application/json', 'Content-Length': data.length,
                }
            };
            const req = https.request(options, res => {
                let body = '';
                if (res.statusCode !== 200) {
                    logger.warn('Status code ' + res.statusCode + ' was returned');
                    resolve();
                }
                res.on('data', function (chunk) {
                    body += chunk;
                });

                res.on('end', function () {
                    const json = JSON.parse(body);
                    resolve(json);
                });
            });
            req.on('error', error => {
                logger.error(error)
            });
            req.write(data)
            req.end()
        });
    }

    async analyzeApi(messageContent, guildID, lang, context, analyze) {
        // Get database values
        const triggerTable = await this.#db.getTriggerTable(lang);
        const offsetTable = await this.#db.getSetting(guildID, lang + 'OffsetTable');
        const severity = await this.#db.getSetting(guildID, 'severity');

        // Prepare the data for the request
        let data = triggerTable.scan;
        data.comment.text = messageContent;
        // delete data.comment.type;
        for (const attribute in offsetTable) if (offsetTable[attribute].enabled && attribute !== 'AVERAGE') data.requestedAttributes[attribute] = {};
        for (const message of context) data.context.entries.push({text: message, type: 'PLAIN_TEXT'})
        if (data.context.entries.length === 0) delete data.context;

        // Check if the message should be deleted
        let score = {values: {}};
        let average = 0;
        let multiple = 0;
        const result = await this.#request(data);
        if (!result) {
            logger.warn('Message caused error: "' + messageContent + '"');
            return;
        }

        // Check if the message should be deleted or not
        for (const attribute in result.attributeScores) {
            const attrScore = result.attributeScores[attribute];

            const value = Math.round(attrScore.summaryScore.value * 1000); // Change value range from 0 1 to 0 1000
            average += value; // Calculate the average

            let singleTrigger = triggerTable.single[attribute][severity];
            singleTrigger = singleTrigger + ((1000 - singleTrigger) / 100 * (offsetTable[attribute].offset));

            let multipleTrigger = triggerTable.multiple[attribute][severity];
            multipleTrigger = multipleTrigger + ((1000 - multipleTrigger) / 100 * (offsetTable[attribute].offset));

            // If one value exceed the score
            if (value > singleTrigger || analyze) {
                score.positive = true;
                score.values[attribute] = {
                    name: triggerTable.translationTable[attribute].name,
                    value: value
                };
            }
            // If multiple value exceed but lower values
            else if (value > multipleTrigger) {
                score.values[attribute] = {
                    name: triggerTable.translationTable[attribute].name,
                    value: value
                };
                multiple += 1;
            }

        }

        // Check if multiple triggers
        if (multiple >= triggerTable.minMultipleTrigger) score.positive = true;

        // Check message average score
        average = Math.round(average / Object.keys(result.attributeScores).length);
        let averageTrigger = triggerTable.averageTrigger;
        averageTrigger = averageTrigger + ((1000 - averageTrigger) / 100 * (offsetTable['AVERAGE'].offset));
        if ((average > averageTrigger && !score.positive)) {
            score.values['AVERAGE'] = {
                name: triggerTable.translationTable['AVERAGE'].name,
                value: average
            };
            score.positive = true;
        }

        // If the score is negative, check if the API detected another language than the one we are using
        if (!score.positive) for (const language of result.detectedLanguages) if (language !== lang && this.#languages.includes(language)) return this.analyzeApi(messageContent, guildID, language, context);

        return score;
    }

    async checkMessage(messageContent, guildID, channelID, lang, analyze) {
        // Increment counter
        await this.#db.incrementCounter();

        // Values
        const settings = await this.#db.getSettings(guildID, ['ignoreURL', 'whitelist', 'blacklist']);

        // Normalize message
        messageContent = messageContent
            .toLowerCase()
            .normalize('NFD') // Normalize
            .replace(/[\u0300-\u036f]/g, '') // Remove accents
            .replace(/[^\x00-\x7F]/g, ""); //.replace(/[^\p{L}\p{N}\p{P}\p{Z}{\^\$}]/gu, ''); // Remove emojis and special characters

        // Check channel lang
        const channelLang = await this.#db.getChannelLang(guildID, channelID);
        if (channelLang !== 'auto') lang = channelLang;

        // Remove emotes, mentions and emojis from the message
        const discordRegex = /<(@!|#|@)[0-9]{18}>|<a?:[a-zA-Z0-9_.]{2,32}:[0-9]{18}>/g;
        messageContent = messageContent.replace(discordRegex, '');

        // Remove urls from the message if it's ignored
        if (settings.ignoreURL) {
            const urlExpression = /https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,}/gi;
            messageContent = messageContent.replace(urlExpression, '');
        }

        // Remove white-list words
        if (settings.whitelist) {
            settings.whitelist.push('||'); // For some reason, || are causing some issues
            for (let word of settings.whitelist) if (word.length > 0) messageContent = messageContent.replaceAll(word, '');
        }

        // Check black-list words
        if (settings.blacklist)
            for (let word of settings.blacklist)
                if (word.length > 0 && messageContent.includes(word))
                    return {positive: true, values: {BLACKLIST: {name: 'Blacklist', value: 1000}}}

        // Check message length
        const messageLength = messageContent.length;
        if (messageLength < PerspectiveManager.MIN_MSG_LEN || messageLength > PerspectiveManager.MAX_MSG_LEN) return;

        // Context for Perspective API, last 5 messages
        const context = this.#cache.get(channelID) || [];

        // Check last messages so we don't check spams
        const resultsCache = this.#cache.get(guildID) || [];
        for (const result of resultsCache) if (result.message === messageContent) return result.result;

        // Check message
        const result = await this.analyzeApi(messageContent, guildID, lang, context, analyze);

        if (result) {
            // Add to context history
            const cacheContext = [...context];
            tools.pushMaxLength(cacheContext, messageContent, 5);
            this.#cache.set(channelID, cacheContext);

            // Cache this result for potential reuse
            tools.pushMaxLength(resultsCache, {message: messageContent, result: result}, 32);
            this.#cache.set(guildID, resultsCache);
        }

        return result;
    }
}

module.exports = PerspectiveManager;

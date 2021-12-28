/**
 * @file Manages the translations inputs / outputs
 * @author jojos38
 */



// --------- SOME VARIABLES --------- //
const fs = require('fs');
const util = require('util');
const { I18n } = require('i18n')
const logger = require('../logger.js');
const readdir = util.promisify(fs.readdir);
// --------- SOME VARIABLES --------- //



class LanguageManager {
    #i18n;
    #embeds;

    constructor() {
        this.#embeds = {};
        this.#i18n = new I18n();
        logger.success('Language Manager initialized');
    }

    /**
     * Initialize i18n
     */
    async init() {
        this.#i18n.configure({
            directory: './locales/strings',
            retryInDefaultLocale: true,
            objectNotation: true,
            defaultLocale: 'en',
            extension: '.json',
            autoReload: true,
            missingKeyFn: function (locale, value) {
                logger.error('Translation ' + value + ' does not exists in ' + locale);
            }
        });
        logger.success('Loaded i18n languages: ' + this.getLocales());

        const files = await readdir('./locales/embeds');
        for (const file of files) {
            if (file.endsWith('.js')) {
                const filePath = '../locales/embeds/' + file;
                const tmpFile = require(filePath);
                this.#embeds = Object.assign({}, this.#embeds, tmpFile.embeds);
                delete require.cache[require.resolve(filePath)] // Remove the file to clear memory
            }
        }
        logger.success('Embeds loaded successfully');
        return this;
    }

    /**
     * Get the embed object by a name
     * @param {string} name A string of the embed name to get
     * @param lang The iso language
     * @param {Object} parameters An object with custom variables to use for the embed
     * @return The Discord's embed object
     */
    getEmbed(name, lang, parameters) {
        const translation = this.getString('embeds.' + name, lang, {});
        const embed = this.#embeds[name](this, translation, lang, parameters);
        if (embed) return embed;
        else { logger.error('Embed ' + name + ' not found'); return {} }
    }

    /**
     * Get a translation object or sentence
     * @param {string} name A string of the translation to get in object (example: items.wooden_sword.title)
     * @param lang The iso language
     * @param {Object} parameters An object with custom variables to use for a string (Only for single string)
     * @return An object or a string of the translation
     */
    getString(name, lang, parameters) {
        return this.#i18n.__({phrase:name, locale:lang}, parameters);
    }

    /**
     * Get every existing translation
     * @return {Array} A list of all existing languages
     */
    getLocales() {
        return this.#i18n.getLocales();
    }
}

module.exports = LanguageManager;
const perspectiveClient = require('perspective-api-client');
const perspective = new perspectiveClient({apiKey: config.apikey});
const logger = require('./logger.js');
const i18n = require("i18n");
i18n.configure({
    //locales:['en', 'fr'],
    directory: __dirname + '/locales',
	extension: '.json',
});
const detections = loadDetections();
const embeds = loadEmbeds();

function loadEmbeds() {
	let embeds = {};
	let locales = i18n.getLocales();
	locales.forEach(language => {
		try {
			embeds[language] = require('./locales/embeds/' + language + '.js');
		} catch (error) {
			logger.error("Error while loading embed file for language " + language);
			process.exit(1);
		}
	});
	logger.success("Loaded embeds languages: " + locales);
	return embeds;
}

function loadDetections() {
	let detections = {};
	let locales = i18n.getLocales();
	locales.forEach(language => {
		try {
			detections[language] = require('./locales/detection/' + language + '.js');
		}
		catch (error) {
			logger.error("Error while loading detection file for language " + language);
			process.exit(1);
		}
	});
	logger.success("Loaded detection languages: " + locales);
	return detections;
}

module.exports = {
	getEb: function(lang) {
		return embeds[lang];
	},
	
	analyze: function(lang, message, debug) {
		var locales = i18n.getLocales();
		if (locales.includes(lang))
			return detections[lang].analyze(message, debug, perspective);
		else {
			logger.warn("Language " + lang + " does not exists");
			return {positive:false};
		}
	},
	
	getString: function(name, lang, variables) {
		if (variables)
			return i18n.__({phrase:name, locale:lang}, variables).replace(/&lt;/g, "<").replace(/&gt;/g, ">");
		else
			return i18n.__({phrase:name, locale:lang});
	},
	
	getLocales: function() {
		return i18n.getLocales();
	}
}
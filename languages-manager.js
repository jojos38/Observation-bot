const perspectiveClient = require('perspective-api-client');
const perspective = new perspectiveClient({apiKey: config.apikey});
const logger = require('./logger.js');
const i18n = require("i18n");
var detection;
var embeds;
var detections;

function loadEmbeds() {
	let embeds = {};
	let locales = i18n.getLocales();
	locales.forEach(language => {
		try {
			let path = './locales/embeds/' + language + '.js';
			if (embeds[language]) delete require.cache[require.resolve(path)];
			embeds[language] = require(path);
		} catch (error) {
			logger.error("Error while loading embed file for language " + language);
			logger.error(error);
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
			let path = './locales/detection/' + language + '.json';
			if (embeds[language]) delete require.cache[require.resolve(path)];
			detections[language] = require(path);
		}
		catch (error) {
			logger.error("Error while loading detection file for language " + language);
			logger.error(error);
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
			return detection.analyze(message, debug, perspective, detections[lang]);
		else {
			logger.warn("Language " + lang + " does not exists");
			return {positive:false};
		}
	},

	reloadLanguages: function() {
		if (detection) delete require.cache[require.resolve('./detection.js')];
		detection = require('./detection.js');
		i18n.configure({
			directory: __dirname + '/locales',
			extension: '.json',
		});
		logger.success("Loaded i18n languages: " + i18n.getLocales());
		embeds = loadEmbeds();
		detections = loadDetections();
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

const logger = require('./logger.js');
const tools = require('./tools.js');
const perspectiveClient = require('perspective-api-client');
const perspective = new perspectiveClient({apiKey: config.apikey});

module.exports = {
	analyze: async function (message, debug, config, severity) {
		try {
			// Send request
			config.scan.comment.text = message;
			const result = await perspective.analyze(config.scan);

			// Settings
			const attributesTotal = tools.objSize(config.scan.requestedAttributes);
			var total = 0
			var multiple = 0;
			var score = {positive:false, values:{}, detectedLanguages: result.detectedLanguages};

			// Check each score attribute
			for(let type in result.attributeScores) {
				let value = Math.round(result.attributeScores[type].summaryScore.value*1000);
				total += value;
				// If a single value exceed a high value
				if (value > config.single[type][severity]) {
					score.positive = true;
					score.values[config.translationTable[type]] = value;
				}
				// If multiple value exceed but lower values
				else if (value > config.multiple[type][severity] || debug) { // Max value is 100
					multiple += 1;
					score.values[config.translationTable[type]] = value;
				}
            }
            if (multiple >= config.minMultipleTrigger) score.positive = true;

			// Check message average score
			var average = Math.round(total/attributesTotal);
			if ((average > config.averageTrigger && !score.positive) || debug) { // Max value is 1000
				score.positive = true;
				score.values[config.translationTable["AVERAGE"]] = average;
			}

			return score;
		} catch (error) {
			logger.warn(error);
			return {positive:false, detectedLanguages:[]};
		}
	}
}

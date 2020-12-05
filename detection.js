const logger = require('./logger.js');
const tools = require('./tools.js');
const perspectiveClient = require('perspective-api-client');
const perspective = new perspectiveClient({apiKey: config.apikey});

module.exports = {
	analyze: async function (message, debug, triggerTable, config, severity) {
		try {
			// Remove unwanted values (those disabled by the user)
			for(let attribute in triggerTable.scan.requestedAttributes) {
				if (!config[attribute]) config[attribute] = {offset:0, enabled:true};
				if (!config[attribute].enabled) delete triggerTable.scan.requestedAttributes[attribute];
			}
			if (!config['AVERAGE']) config['AVERAGE'] = {offset:0};
			// Send request
			triggerTable.scan.comment.text = message;
			const result = await perspective.analyze(triggerTable.scan);

			// Settings
			const attributesTotal = tools.objSize(result.attributeScores);
			var total = 0
			var multiple = 0;
			var score = {positive:false, values:{}, detectedLanguages: result.detectedLanguages};

			// Check each score attribute
			for(let attribute in result.attributeScores) {
				let value = Math.round(result.attributeScores[attribute].summaryScore.value*1000);
				total += value;
				// If a single value exceed a high value

				var singleTrigger = triggerTable.single[attribute][severity];
				singleTrigger = singleTrigger + ((1000-singleTrigger) / 100 * (config[attribute].offset));
				var multipleTrigger = triggerTable.multiple[attribute][severity];
				multipleTrigger = multipleTrigger + ((1000-multipleTrigger) / 100 * (config[attribute].offset));

				if (value > singleTrigger) {
					score.positive = true;
					score.values[triggerTable.translationTable[attribute]] = value;
				}
				// If multiple value exceed but lower values
				else if (value > multipleTrigger || debug) { // Max value is 100
					multiple += 1;
					score.values[triggerTable.translationTable[attribute]] = value;
				}
            }
            if (multiple >= triggerTable.minMultipleTrigger) score.positive = true;
			// Check message average score
			var average = Math.round(total/attributesTotal);
			var averageTrigger = triggerTable.averageTrigger;
			averageTrigger = averageTrigger + ((1000-averageTrigger) / 100 * (config['AVERAGE'].offset));
			if ((average > averageTrigger && !score.positive) || debug) { // Max value is 1000
				score.positive = true;
				score.values[triggerTable.translationTable["AVERAGE"]] = average;
			}

			return score;
		} catch (error) {
			logger.warn(error + " for message " + message);
			return {positive:false, detectedLanguages:[]};
		}
	}
}

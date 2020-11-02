const logger = require('../../logger.js');

const AVERAGE_TRIGGER = 610;

const translationTable = {
	"SEVERE_TOXICITY": "Severe Toxicity",
	"TOXICITY": "Toxicity",
	"IDENTITY_ATTACK": "Identity Attack",
	"INSULT": "Insult",
	"PROFANITY": "Profanity",
	"THREAT": "Threat",
	"SEXUALLY_EXPLICIT": "Sexually Explicit",
	"INCOHERENT": "Incoherent",
	"FLIRTATION": "Flirtation"
}

const singlePercentageTable = {
        "SEVERE_TOXICITY": 750,
        "TOXICITY": 900,
        "IDENTITY_ATTACK": 810,
        "INSULT": 920,
        "PROFANITY": 900,
        "THREAT": 750,
        "SEXUALLY_EXPLICIT": 900,
        "INCOHERENT": 750,
        "FLIRTATION": 750
}

const multiplePercentageTable = {
        "SEVERE_TOXICITY": 750,
        "TOXICITY": 900,
        "IDENTITY_ATTACK": 700,
        "INSULT": 920,
        "PROFANITY": 850,
        "THREAT": 750,
        "SEXUALLY_EXPLICIT": 800,
        "INCOHERENT": 750,
        "FLIRTATION": 750
}

module.exports = {
	analyze: async function (message, debug, perspective) {
		try {
			// Send request
			const result = await perspective.analyze(message, {attributes: ['SEVERE_TOXICITY', 'INSULT', 'IDENTITY_ATTACK', 'PROFANITY', 'SEXUALLY_EXPLICIT']});

			var score = {positive:false,values:{}};
			var total = 0

			// Check each score attribute
			var multiple = 0;
			for(let type in result.attributeScores) {
				let value = Math.round(result.attributeScores[type].summaryScore.value*1000);
				total += value;
				// If a single value exceed a high value
				if (value > singlePercentageTable[type]) {
					score.positive = true;
					score.values[translationTable[type]] = value;
				}
				// If multiple value exceed but lower values
				else if (value > multiplePercentageTable[type] || debug) { // Max value is 100
					multiple += 1;
					score.values[translationTable[type]] = value;
				}
            }
            if (multiple >= 2) score.positive = true;

			// Check message average score
			var average = total/6;
			if (average > AVERAGE_TRIGGER && !score.positive || debug) { // Max value is 1000
				score.positive = true;
				score.values["AVERAGE"] = average;
			}

			return score;
		} catch (error) {
			logger.warn(error);
			return {positive:false};
		}
	}
}

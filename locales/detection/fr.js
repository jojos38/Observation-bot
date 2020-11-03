const logger = require('../../logger.js');
const tools = require('../../tools.js');

const TRANSLATION_TABLE = {
	"SEVERE_TOXICITY": "Toxicité sévère",
	"TOXICITY": "Toxicité",
	"IDENTITY_ATTACK_EXPERIMENTAL": "Attaque d'identité",
	"INSULT_EXPERIMENTAL": "Insulte",
	"PROFANITY_EXPERIMENTAL": "Profanation",
	"THREAT_EXPERIMENTAL": "Menaces",
	"AVERAGE": "Multiples"
}

const SINGLE_TRIGGER_TABLE = {
        "SEVERE_TOXICITY": 800,
        "TOXICITY": 900,
        "IDENTITY_ATTACK_EXPERIMENTAL": 810,
        "INSULT_EXPERIMENTAL": 920,
        "PROFANITY_EXPERIMENTAL": 921,
        "THREAT_EXPERIMENTAL": 750,
}

const MULTIPLE_TRIGGER_TABLE = {
        "SEVERE_TOXICITY": 750,
        "TOXICITY": 900,
        "IDENTITY_ATTACK_EXPERIMENTAL": 700,
        "INSULT_EXPERIMENTAL": 920,
        "PROFANITY_EXPERIMENTAL": 850,
        "THREAT_EXPERIMENTAL": 750,
}

const scan = {
	comment: {
		"text":""
	},
	requestedAttributes: {
		"SEVERE_TOXICITY": {},
		"TOXICITY": {},
		"IDENTITY_ATTACK_EXPERIMENTAL": {},
		"INSULT_EXPERIMENTAL": {},
		"PROFANITY_EXPERIMENTAL": {},
		"THREAT_EXPERIMENTAL": {}
	},
	languages: [
		"fr"
	]
}

const AVERAGE_TRIGGER = 610;
const MIN_MULTIPLE_TRIGGER = 2;
const ATTRIBUTES_TOT = tools.objSize(scan.requestedAttributes);

module.exports = {
	analyze: async function (message, debug, perspective) {
		try {
			// Send request
			scan.comment.text = message;
			const result = await perspective.analyze(scan);

			// Settings
			var total = 0
			var multiple = 0;
			var score = {positive:false, values:{}, detectedLanguages: result.detectedLanguages};
			
			// Check each score attribute
			for(let type in result.attributeScores) {
				let value = Math.round(result.attributeScores[type].summaryScore.value*1000);
				total += value;
				// If a single value exceed a high value
				if (value > SINGLE_TRIGGER_TABLE[type]) {
					score.positive = true;
					score.values[TRANSLATION_TABLE[type]] = value;
				}
				// If multiple value exceed but lower values
				else if (value > MULTIPLE_TRIGGER_TABLE[type] || debug) { // Max value is 100
					multiple += 1;
					score.values[TRANSLATION_TABLE[type]] = value;
				}
            }
            if (multiple >= MIN_MULTIPLE_TRIGGER) score.positive = true;

			// Check message average score
			var average = total/ATTRIBUTES_TOT;
			if ((average > AVERAGE_TRIGGER && !score.positive) || debug) { // Max value is 1000
				score.positive = true;
				score.values[TRANSLATION_TABLE["AVERAGE"]] = average;
			}

			return score;
		} catch (error) {
			logger.warn(error);
			return {positive:false, detectedLanguages:[]};
		}
	}
}

const logger = require('../../logger.js');

const AVERAGE_TRIGGER = 610;

const translationTable = {
	"SEVERE_TOXICITY": "Toxicité sévère",
	"TOXICITY": "Toxicité",
	"IDENTITY_ATTACK_EXPERIMENTAL": "Attaque d'identité",
	"INSULT_EXPERIMENTAL": "Insulte",
	"PROFANITY_EXPERIMENTAL": "Profanation",
	"THREAT_EXPERIMENTAL": "Menaces",
	"AVERAGE": "Multiples"
}


const singlePercentageTable = {
        "SEVERE_TOXICITY": 800,
        "TOXICITY": 900,
        "IDENTITY_ATTACK_EXPERIMENTAL": 810,
        "INSULT_EXPERIMENTAL": 920,
        "PROFANITY_EXPERIMENTAL": 900,
        "THREAT_EXPERIMENTAL": 750,
}

const multiplePercentageTable = {
        "SEVERE_TOXICITY": 750,
        "TOXICITY": 900,
        "IDENTITY_ATTACK_EXPERIMENTAL": 700,
        "INSULT_EXPERIMENTAL": 920,
        "PROFANITY_EXPERIMENTAL": 850,
        "THREAT_EXPERIMENTAL": 750,
}

module.exports = {
	analyze: async function (message, debug, perspective) {
		try {
			// Send request
			const result = await perspective.analyze(message, {attributes: ['SEVERE_TOXICITY', 'TOXICITY', 'IDENTITY_ATTACK_EXPERIMENTAL', 'INSULT_EXPERIMENTAL', 'PROFANITY_EXPERIMENTAL', 'THREAT_EXPERIMENTAL']});

			var score = {positive:false,values:{}};
			var total = 0

			// Check each score attribute
			var multiple = 0;
			for(let type in result.attributeScores) {
				let value = Math.round(result.attributeScores[type].spanScores[0].score.value*1000);
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
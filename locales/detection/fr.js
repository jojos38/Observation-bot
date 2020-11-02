const logger = require('../../logger.js');

const SINGLE_TRIGGER = 800;
const AVERAGE_TRIGGER = 650;

const TranslationTable = {
	"SEVERE_TOXICITY": "Toxicité sévère",
	"TOXICITY": "Toxicité",
	"IDENTITY_ATTACK_EXPERIMENTAL": "Attaque d'identité",
	"INSULT_EXPERIMENTAL": "Insulte",
	"PROFANITY_EXPERIMENTAL": "Profanation",
	"THREAT_EXPERIMENTAL": "Menaces",
	"AVERAGE": "Multiples"
}

module.exports = {
	analyze: async function (message, debug, perspective) {
		try {
			// Send request
			const result = await perspective.analyze(message, {attributes: ['SEVERE_TOXICITY', 'TOXICITY', 'IDENTITY_ATTACK_EXPERIMENTAL', 'INSULT_EXPERIMENTAL', 'PROFANITY_EXPERIMENTAL', 'THREAT_EXPERIMENTAL']});
			
			var score = {positive:false,values:{}};
			var total = 0
			
			// Check each score attribute
			var temp = 0;
			for(let type in result.attributeScores) {
				let value = Math.round(result.attributeScores[type].spanScores[0].score.value*1000);
				total += value;
				if (value > SINGLE_TRIGGER || debug) { // Max value is 100
					temp += 1;
					score.values[TranslationTable[type]] = value
				}
			}
			if (temp >= 2) score.positive = true;
			
			// Check message average score
			var average = total/6;
			if (average > AVERAGE_TRIGGER && !score.positive || debug) { // Max value is 1000
				score.positive = true;
				score.values[TranslationTable["AVERAGE"]] = average;
			}
			
			return score;
		} catch (error) {
			logger.warn(error);
			return {positive:false};
		}
	}
}

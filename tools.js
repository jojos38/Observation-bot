// -------------------- SOME VARIABLES -------------------- //
const logger = require('./logger.js');
// -------------------- SOME VARIABLES -------------------- //



module.exports = {
	sendCatch: async function(channel, message, embed) {
		const messageObj = embed ? { embeds: [message] } : { content: message };
		try { return await channel.send(messageObj) }
		catch (error) { logger.warn("Error while sending message"); logger.error(error); return null; }
	},

	replyCatch: async function(interaction, message, type, ephemeral) {
		if (type == 0) var messageObj = { content: message, ephemeral: ephemeral };
		else if (type == 1) var messageObj = { embeds: [message], ephemeral: ephemeral };
		else if (type == 2) { var messageObj = message; messageObj.ephemeral = ephemeral; }
		try { return await interaction.reply(messageObj) }
		catch (error) { logger.warn("Error while replying interaction"); logger.error(error); return null; }
	},

	editCatch: async function(message, newContent) {
		try { await message.edit(newContent); }
		catch (error) { logger.warn("Error while editing message"); logger.error(error); }
	},

	deleteCatch: async function(message) {
		try { await message.delete(); return true;}
		catch (error) { logger.warn("Error while deleting message"); logger.error(error); return false;}
	},

	pushMaxLength: function(array, item, length) {
		array.push(item);
		if (array.length > 5) array.shift();
	}
}

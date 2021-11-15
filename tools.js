// -------------------- SOME VARIABLES -------------------- //
const logger = require('./logger.js');
// -------------------- SOME VARIABLES -------------------- //



module.exports = {
	/*shuffle: function(a) {
		var j, x, i;
		for (i = a.length - 1; i > 0; i--) {
			j = Math.floor(Math.random() * (i + 1));
			x = a[i];
			a[i] = a[j];
			a[j] = x;
		}
		return a;
	},*/

	objSize: function(obj) {
        var size = 0, key;
        for (key in obj) {
            if (obj.hasOwnProperty(key)) size++;
        }
        return size;
    },

	mention: function(id, type) {
        if (type == 'u') {
            return "<@" + id + ">";
        } else if (type == 'c') {
            return "<#" + id + ">";
        }
	},

	isInt: function(value) {
		return !isNaN(value) && parseInt(Number(value)) == value && !isNaN(parseInt(value, 10));
	},

	format: function(seconds) {
		function pad(s){
			return (s < 10 ? '0' : '') + s;
		}
		var days = Math.floor(seconds / (24 * 3600));
		seconds = seconds % (24 * 3600);
		var hours = Math.floor(seconds / 3600);
		seconds %= 3600;
		var minutes = Math.floor(seconds / 60);
		seconds %= 60;
		var seconds = Math.floor(seconds);
		return pad(days) + ':' + pad(hours) + ':' + pad(minutes) + ':' + pad(seconds);
	},

	sendCatch: async function(channel, message) {
		try { return await channel.send(message); }
		catch (error) { logger.error("Error while sending message"); logger.error(error); return null; }
	},

	editCatch: async function(message, newContent) {
		try { await message.edit(newContent); }
		catch (error) { logger.error("Error while editing message"); logger.error(error); }
	},

	reactCatch: async function(message, reaction) {
		try { await message.react(reaction); return true;}
		catch (error) { logger.error("Error while reacting to message"); logger.error(error); return false;}
	},

	deleteCatch: async function(message) {
		try { await message.delete(); return true;}
		catch (error) { logger.error("Error while deleting message"); logger.error(error); return false;}
	},

	delay: async function(ms) {
		// return await for better async stack trace support in case of errors.
		return await new Promise(resolve => setTimeout(resolve, ms));
	}
}

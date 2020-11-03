const DBL = require("dblapi.js");

module.exports = {
	init: function(client) {
		const dbl = new DBL(config.topggtoken, client);	
		dbl.on('posted', () => {
			logger.info('Server count posted');
		})

		dbl.on('error', e => {
			logger.error(`Error while posting server count ${e}`);
		})
	}
}
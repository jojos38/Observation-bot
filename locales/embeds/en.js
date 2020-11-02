
// ------------------------------------------- SOME VARIABLES ------------------------------------------- //
const Discord = require('discord.js');
const logoURL = "https://cdn.discordapp.com/avatars/586183772136013824/60e91b15dec572463835bfb7cbd78ce7.webp?size=128";
const orange = 16750869;
const red = 15728640;
// ------------------------------------------- SOME VARIABLES ------------------------------------------- //

module.exports = {

    mention: function (id, type) {
        if (type == 'u') {
            return "<@" + id + ">";
        } else if (type == 'c') {
            return "<#" + id + ">";
        }
    },

    // ------------- COMMANDS ------------- //
    getHelpEmbed: function () {
        const embed = new Discord.RichEmbed({
            color: orange,
            author: {
                name: "Here is a list of all commands:",
                icon_url: logoURL
            },
            fields: [
                {
                    name: "**!ohelp** or !oh",
                    value: " - Show help"
                },
                {
                    name: "**!oinfo**",
                    value: " - Show informations about the bot"
                },
                {
                    name: "**!oadmin**",
                    value: " - Show admin commands\n**Note :** Require 'manage server' permission"
                }
            ]
        });
        return embed;
    },
	
    getInfoEmbed: function (users, servers, uptime) {
        const embed = new Discord.RichEmbed({
			author: {
				name: "Crédits:",
				icon_url: logoURL
			},
            color: orange,
            title: "Bot made by jojos38",
			description: "Link of the bot: Support server: https://discord.gg/DXpb9DN\nPatreon: https://www.patreon.com/jojos38\nTipeee: https://fr.tipeee.com/jojos38s-quizzar-bot",
			fields: [
			  {
				name: "Servers",
				value: servers,
				inline: true
			  },
			  {
				name: "Users",
				value: users,
				inline: true
			  },
			  {
				name: "Uptime",
				value: uptime,
				inline: true
			  }
			]
        });
        return embed;
    },

    getAdminHelpEmbed: function () {
        const embed = new Discord.RichEmbed({
            description: "An authorized channel is a channel where bot commands are allowed.",
            color: orange,
            author: {
                name: "Here is a list of admin commands:",
                icon_url: logoURL
            },
            fields: [
				{
					name: "!oprefix",
					value: "Change the bot prefix"
				},
				{
                    name: "!olang [language]",
                    value: " - Change the language of the bot (languages available: french / english)"
                },	
                {
                    name: "!oadd",
                    value: "Add the current channel in the authorized channels"
                },
                {
                    name: "!oremove",
                    value: "Remove the current channel from the authorized channels"
                },
                {
                    name: "!oreset",
                    value: "Delete all bot data from the server (Authorized channels etc...)\n**Warning :** This command also delete all players stats!"
                },
                {
                    name: "!ochannels",
                    value: "Show all authorized channels"
                },
				{
                    name: "!odelay",
                    value: "Set the delay before the warning message is deleted (between 1000ms and 10000ms)"
                },
				{
                    name: "!odelete",
                    value: "Define either the message should be deleted or not (true ou false)"
                },
				{
                    name: "!odebug",
                    value: "Show debbuging information (true ou false)"
                },
				{
                    name: "!owarn",
                    value: "Show warning messages (true ou false)"
                }
            ]
        });
        return embed;
    },
	
	getWarnEmbed: function (result, debug) {
		var finalString = "";
		for(let type in result.values) {
			//if (debug)
				finalString = finalString + "- " + type + " " + result.values[type]/10 + "%\n";
			//else
			//	finalString = finalString + "- " + type + "\n";
		}
		const embed = new Discord.RichEmbed({
            color: red,
            title: "Warning",
            description: "Your message have been warned for the following reasons:\n" + finalString
        });
        return embed;
	},
    // ------------- COMMANDS------------- //

    // ------------- COMMANDS ERRORS ------------- //
    getNotAllowedEmbed: function (channelsString) {
        const embed = new Discord.RichEmbed({
            author: {
                name: "Oops",
                icon_url: logoURL
            },
            color: red,
            title: "You are not allowed to use Obervation commands here",
            description: "If you are admin, use !jadd to add this channel.\nTake a look here: " + channelsString
        });
        return embed;
    },
	// ------------- COMMANDS ERRORS ------------- //
};

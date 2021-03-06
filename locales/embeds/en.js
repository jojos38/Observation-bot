
// ------------------------------------------- SOME VARIABLES ------------------------------------------- //
const Discord = require('discord.js');
const logoURL = "https://cdn.discordapp.com/avatars/772446137499385866/a5e90de09717b1edc0d00ca03716767b.webp?size=128";
const blue = 3447003;
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
    getHelpEmbed: function (prefix) {
        const embed = new Discord.MessageEmbed({
            color: blue,
            author: {
                name: "Here is a list of all commands:",
                icon_url: logoURL
            },
            fields: [
                {
                    name: prefix + "**help** or " + prefix +  "h",
                    value: " - Show help"
                },
				{
                    name: prefix + "analyze [text]",
                    value: "Analyze your message and give you a score"
                },
                {
                    name: prefix + "**info**",
                    value: " - Show informations about the bot"
                },
                {
                    name: prefix + "**admin**",
                    value: " - Show admin commands\n**Note :** Require 'manage server' permission"
                }
            ]
        });
        return embed;
    },

    getInfoEmbed: function (users, servers, uptime, counter) {
        const embed = new Discord.MessageEmbed({
			author: {
				name: "Credit:",
				icon_url: logoURL
			},
            color: blue,
            title: "Bot made by jojos38",
			description: "Special thanks to Perspective API for their API.\nSupport server: https://discord.gg/DXpb9DN\nDonate: https://paypal.me/wanzera",
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
			  },
			  {
				name: "Analyzed messages",
				value: counter,
				inline: true
			  }
			]
        });
        return embed;
    },

    getAdminHelpEmbed: function (prefix) {
        const embed = new Discord.MessageEmbed({
            description: "An authorized channel is a channel where bot commands are allowed.",
            color: blue,
            author: {
                name: "Here is a list of admin commands:",
                icon_url: logoURL
            },
            fields: [
				{
					name: prefix + "config",
					value: "Configure the bot trough a web interface"
				},
				{
					name: prefix + "log",
					value: "**new** Define the channel of the command as the log channel"
				},
				{
					name: prefix + "prefix",
					value: "Change the bot prefix"
				},
				{
					name: prefix + "severity [severity]",
					value: "Define bot severity (low, medium or high)"
				},
				{
                    name: prefix + "lang [language]",
                    value: "Change the global language of the bot (Use ISO 631-1, example: fr, es ,en)"
                },	
                {
                    name: prefix + "add",
                    value: "Add the channel of the command in the authorized channels"
                },
                {
                    name: prefix + "remove",
                    value: "Remove the channel of the command from the authorized channels"
                },
                {
                    name: prefix + "channellang",
                    value: "Set the default lang for a specific channel (Use ISO 631-1, example: fr, es ,en) (Default: auto)"
                },
                {
                    name: prefix + "reset",
                    value: "Delete all bot data from the server (Authorized channels etc...)\n**Warning :** This command also delete all users stats!"
                },
                {
                    name: prefix + "channels",
                    value: "Show all authorized channels"
                },
				{
                    name: prefix + "delay",
                    value: "Set the delay before the warning message is deleted (between 1000ms and 30000ms)"
                },
				{
                    name: prefix + "delete",
                    value: "Define either the message should be deleted or not (true or false)"
                },
				{
                    name: prefix + "warn",
                    value: "Show warning messages (true or false)"
                },
				{
                    name: prefix + "global",
                    value: "Set if the bot should moderate every channels of the server (true or false)"
                },
				{
                    name: prefix + "whitelist / blacklist [add / remove] [a word]",
                    value: "If no parameter, shows the list, if add or remove followed by a word, adds or removes this word from the list.\nExample: whitelist add I like train"
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
		const embed = new Discord.MessageEmbed({
            color: red,
            title: "Warning",
            description: "Your message have been warned for the following reasons:\n" + finalString
        });
        return embed;
	},
    // ------------- COMMANDS------------- //

    // ------------- COMMANDS ERRORS ------------- //
    getNotAllowedEmbed: function (channelsString) {
        const embed = new Discord.MessageEmbed({
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

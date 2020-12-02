
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
        const embed = new Discord.RichEmbed({
            color: blue,
            author: {
                name: "Voici la liste des commandes disponibles :",
                icon_url: logoURL
            },
            fields: [
                {
                    name: prefix + "**help** ou " + prefix + "h",
                    value: " - Affiche l\'aide"
                },
                {
                    name: prefix + "**info**",
                    value: " - Affiche les crédits"
                },
				{
                    name: prefix + "analyze [text]",
                    value: "Analyse le message et donne un score"
                },
                {
                    name: prefix + "**admin**",
                    value: " - Affiche la liste des commandes administrateur\n**Note :** Nécessite la permission de gérer le serveur"
                }
            ]
        });
        return embed;
    },

    getInfoEmbed: function (users, servers, uptime, counter) {
        const embed = new Discord.RichEmbed({
			author: {
				name: "Crédits :",
				icon_url: logoURL
			},
            color: blue,
            title: "Bot crée par jojos38",
			description: "Merci à Perspective API pour leur API.\nServeur de support: https://discord.gg/DXpb9DN\nPatreon: https://www.patreon.com/jojos38\nTipeee: https://fr.tipeee.com/jojos38s-quizzar-bot",
			fields: [
			  {
				name: "Serveurs",
				value: servers,
				inline: true
			  },
			  {
				name: "Utilisateurs",
				value: users,
				inline: true
			  },
			  {
				name: "Uptime",
				value: uptime,
				inline: true
			  },
			  {
				name: "Message analisés",
				value: counter,
				inline: true
			  }
			]
        });
        return embed;
    },
	
    getAdminHelpEmbed: function (prefix) {
        const embed = new Discord.RichEmbed({
            description: "Un 'channel autorisé' est un channel ou le bot modérera",
            color: blue,
            author: {
                name: "Voici la liste des commandes administrateur :",
                icon_url: logoURL
            },
            fields: [
				{
					name: prefix + "config",
					value: "**NEW** Configuez le bot à travers une interface web"
				},
				{
					name: prefix + "prefix",
					value: "Changer le préfix du bot"
				},
				{
					name: prefix + "severity [severity]",
					value: "Défini la sévérité du bot (low, medium ou high)"
				},
				{
                    name: prefix + "!jlang [langue]",
                    value: " - Change la langue du bot (Utilise la norme ISO 631-1, exemple: fr, es ,en)"
                },
                {
                    name: prefix + "add",
                    value: "Ajoute le channel où est lancé la commande dans la liste des channel autorisés\n**Note** : Si aucun channel n'est spécifié, tous les channels seront autorisés"
                },
                {
                    name: prefix + "remove",
                    value: "Retire le channel où est lancé la commande de la liste des channels autorisés"
                },
                {
                    name: prefix + "channellang",
                    value: "Défini la langue par défaut d'un channel (Utilise la norme ISO 631-1, exemple: fr, es ,en) (Par défaut: auto)"
                },
                {
                    name: prefix + "reset",
                    value: "Supprime toutes les données de configuration du serveur (la liste des channels autorisés etc...)\n**Attention :** Cette commande supprime également toutes les statistiques des utilisateurs !"
                },
                {
                    name: prefix + "channels",
                    value: "Affiche la liste des channels autorisés"
                },
				{
                    name: prefix + "delay",
                    value: "Défini le délai avant le suppression du message d'avertissement (entre 1000ms and 30000ms)"
                },
				{
                    name: prefix + "delete",
                    value: "Défini si les messages doivent être supprimés (true ou false)"
                },
				{
                    name: prefix + "debug",
                    value: "Affiche les informations de débogage (true ou false)"
                },
				{
                    name: prefix + "warn",
                    value: "Affiche les messages d'avertissement (true ou false)"
                },
				{
                    name: prefix + "global",
                    value: "Défini si le bot devrait modérer tous les channels du serveur ou non (true ou false)"
                },
				{
                    name: prefix + "whitelist / blacklist [add / remove] [a word]",
                    value: "Si aucun paramètre, affiche la liste, si add ou remove suivi par un mot, ajoute ou retire ce dernier de la liste.\nExemple: whitelist add I like train"
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
            title: "Avertissement",
            description: "Ton message a été avertit pour les raisons suivantes:\n" + finalString
        });
        return embed;
	},
    // ------------- COMMANDS------------- //

    // ------------- COMMANDS ERRORS ------------- //
    getNotAllowedEmbed: function (channelsString) {
        const embed = new Discord.RichEmbed({
            author: {
                name: "Mince",
                icon_url: logoURL
            },
            color: red,
            title: "Vous ne pouvez pas effectuer de commandes dans ce channel.",
            description: "Si vous êtes administrateur utilisez !jadd pour ajouter ce channel.\nJetez un coup d'oeil ici : " + channelsString
        });
        return embed;
    }
    // ------------- COMMANDS ERRORS ------------- //
};

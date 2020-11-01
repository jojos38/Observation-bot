
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
                name: "Voici la liste des commandes disponibles :",
                icon_url: logoURL
            },
            fields: [
                {
                    name: "**!ohelp** ou !jh",
                    value: " - Affiche l\'aide"
                },
                {
                    name: "**!oinfo**",
                    value: " - Affiche les crédits"
                },
                {
                    name: "**!oadmin**",
                    value: " - Affiche la liste des commandes administrateur\n**Note :** Nécessite la permission de gérer le serveur"
                }
            ]
        });
        return embed;
    },

    getInfoEmbed: function (users, servers, uptime) {
        const embed = new Discord.RichEmbed({
			author: {
				name: "Crédits :",
				icon_url: logoURL
			},
            color: orange,
            title: "Bot crée par jojos38",
			description: "Lien du bot : https://top.gg/bot/586183772136013824\nMerci à http://www.openquizzdb.org/ pour les questions.\nServeur de support: https://discord.gg/DXpb9DN\nPatreon: https://www.patreon.com/jojos38\nTipeee: https://fr.tipeee.com/jojos38s-quizzar-bot",
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
			  }
			]
        });
        return embed;
    },
	
    getAdminHelpEmbed: function () {
        const embed = new Discord.RichEmbed({
            description: "Un 'channel autorisé' est un channel ou le bot modérera",
            color: orange,
            author: {
                name: "Voici la liste des commandes administrateur :",
                icon_url: logoURL
            },
            fields: [
				{
					name: "!oprefix",
					value: "Changer le préfix du bot"
				},
				{
                    name: "!jlang [langue]",
                    value: " - Change la langue du bot (langues disponibles: french / english)"
                },
                {
                    name: "!oadd",
                    value: "Ajoute le channel où est lancé la commande dans la liste des channel autorisés\n**Note** : Si aucun channel n'est spécifié, tous les channels seront autorisés"
                },
                {
                    name: "!oremove",
                    value: "Retire le channel où est lancé la commande de la liste des channels autorisés"
                },
                {
                    name: "!oreset",
                    value: "Supprime toutes les données de configuration du serveur (la liste des channels autorisés etc...)\n**Attention :** Cette commande supprime également toutes les statistiques des utilisateurs !"
                },
                {
                    name: "!ochannels",
                    value: "Affiche la liste des channels autorisés"
                },
				{
                    name: "!odelay",
                    value: "Défini le délai avant le suppression du message d'avertissement (entre 1000ms and 10000ms)"
                },
				{
                    name: "!odelete",
                    value: "Défini si les messages doivent être supprimés (true ou false)"
                },
				{
                    name: "!odebug",
                    value: "Affiche les informations de débogage (true ou false)"
                },
				{
                    name: "!owarn",
                    value: "Affiche les messages d'avertissement (true ou false)"
                }
            ]
        });
        return embed;
    },
	
	getWarnEmbed: function (result, debug) {
		var finalString = "";
		for(let type in result.values) {
			if (debug) finalString = finalString + "- " + type + " " + result.values[type]/10 + "%\n";
			else finalString = finalString + "- " + type + "\n";
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

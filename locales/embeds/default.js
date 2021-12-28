/**
 * @file Contains all embeds for the bot
 * @author jojos38
 */



// ------------------------------------------- SOME VARIABLES ------------------------------------------- //
const logoURL = 'https://cdn.discordapp.com/avatars/772446137499385866/a5e90de09717b1edc0d00ca03716767b.webp?size=128';
const blue = 3447003;
const red = 15728640;
// ------------------------------------------- SOME VARIABLES ------------------------------------------- //



module.exports = {
    embeds: {
        help: function (lm, t, lang, params) {
            return {
                color: blue,
                author: {
                    name: t.name,
                    icon_url: logoURL
                },
                fields: t.fields
            };
        },

        info: function (lm, t, lang, params) {
            return {
                author: {
                    name: t.name,
                    icon_url: logoURL
                },
                color: blue,
                title: t.title,
                description: t.description,
                fields: [
                    {
                        name: t.servers,
                        value: params.guildsCount.toString(),
                        inline: true
                    },
                    {
                        name: t.users,
                        value: params.usersCount.toString(),
                        inline: true
                    },
                    {
                        name: t.uptime,
                        value: params.uptime,
                        inline: true
                    },
                    {
                        name: t.analyzedMessages,
                        value: params.counter.toString(),
                        inline: true
                    }
                ]
            };
        },

        admin: function (lm, t, lang, params) {
            return {
                color: blue,
                author: {
                    name: t.name,
                    icon_url: logoURL
                },
                fields: t.fields
            };
        },

        warn: function (lm, t, lang, params) {
            let warnString = '';
            const result = params.result;
            for(let type in result.values) warnString = warnString + '- ' + result.values[type].name + ' ' + result.values[type].value / 10 + '%\n';
            warnString = warnString.slice(0, -1);
            return {
                color: red,
                title: params.nickname,
                description: (params.analyze ? t.results : t.flagged + warnString)
            }
        },
    }
};

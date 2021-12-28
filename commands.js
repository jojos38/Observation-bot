/**
 * @file Register the commands of the bot for testing purposes
 * @author jojos38
 */



global.config = require('./config.json');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');



let commands = [
    {
        name: 'help',
        description: 'Display all the user commands',
    },
    {
        name: 'admin',
        description: 'Display all the admin commands',
    },
    {
        name: 'reset',
        description: 'Erase all data stored for this server (including all users data)',
    },
    {
        name: 'info',
        description: 'Display bot info'
    },
    {
        name: 'channels',
        description: 'Display all channels that Observation is monitoring'
    },
    {
        name: 'analyze',
        description: 'Analyze the given text',
        options: [
            {
                type: 3,
                name: 'message',
                description: 'The text',
                required: true,
            }
        ]
    },
    {
        name: 'language',
        description: 'Change the bot global language',
        options: [
            {
                type: 3,
                name: 'language',
                description: 'The language to use',
                required: true,
                choices: [
                    {
                        name: 'French',
                        value: 'fr'
                    },
                    {
                        name: 'English',
                        value: 'en'
                    }
                ]
            }
        ]
    },
    {
        name: 'blacklist',
        description: 'Interact with the blacklist',
        options: [
            {
                type: 1,
                name: 'edit',
                description: 'Add or a remove a word',
                options: [
                    {
                        type: 3,
                        name: 'action',
                        description: 'Add or a remove a word',
                        required: true,
                        choices: [
                            {
                                name: 'add',
                                value: 'add'
                            },
                            {
                                name: 'remove',
                                value: 'remove'
                            }
                        ]
                    },
                    {
                        type: 3,
                        name: 'word',
                        description: 'The word to add or remove',
                        required: true,
                    }
                ]
            },
            {
                type: 1,
                name: 'list',
                description: 'Show the blacklist'
            },
        ]
    },
    {
        name: 'whitelist',
        description: 'Interact with the whitelist',
        options: [
            {
                type: 1,
                name: 'edit',
                description: 'Add or a remove a word',
                options: [
                    {
                        type: 3,
                        name: 'action',
                        description: 'Add or a remove a word',
                        required: true,
                        choices: [
                            {
                                name: 'add',
                                value: 'add'
                            },
                            {
                                name: 'remove',
                                value: 'remove'
                            }
                        ]
                    },
                    {
                        type: 3,
                        name: 'word',
                        description: 'The word to add or remove',
                        required: true,
                    }
                ]
            },
            {
                type: 1,
                name: 'list',
                description: 'Show the whitelist'
            },



        ]
    },
    {
        name: 'channellang',
        description: 'Set the default language of a channel',
        options: [
            {
                type: 7,
                name: 'channel',
                description: 'The channel',
                channel_types: [0],
                required: true,
            },
            {
                type: 3,
                name: 'language',
                description: 'The language to use for that channel',
                required: true,
                choices: [
                    {
                        name: 'French',
                        value: 'fr'
                    },
                    {
                        name: 'English',
                        value: 'en'
                    },
                    {
                        name: 'Auto',
                        value: 'auto'
                    }
                ]
            }
        ]
    },
    {
        name: 'log',
        description: 'Set the log channel for Observation',
        options: [
            {
                type: 7,
                name: 'channel',
                description: 'The channel to send log messages to',
                channel_types: [0],
                required: true,
            }
        ]
    },
    {
        name: 'disablelogs',
        description: 'Disable logs'
    },
    {
        name: 'add',
        description: 'Add a channel to be scanned and monitored by Observation',
        options: [
            {
                type: 7,
                name: 'channel',
                description: 'The channel to monitor',
                channel_types: [0],
                required: true,

            }
        ]
    },
    {
        name: 'remove',
        description: 'Remove a channel from the eyes of Observation',
        options: [
            {
                type: 7,
                name: 'channel',
                description: 'The channel to remove',
                channel_types: [0],
                required: true,

            }
        ]
    },
    {
        name: 'config',
        description: 'Generate a link for the web interface'
    },
];

// commands = [];

const rest = new REST({ version: '9' }).setToken(config.token);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationCommands(config.id),
            { body: commands },
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();

return;
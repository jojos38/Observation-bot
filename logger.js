/**
 * @file Custom Logger (doesn't handle objects yet)
 * @author jojos38
 */



function colorize(color, output) {
    return ['\033[', color, 'm', output, '\033[0m'].join('');
}

function date() {
    const options = {month: 'numeric', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false};
    return new Intl.DateTimeFormat('default', options).format(new Date()).replace(',', '');
}

module.exports = {
    error: function (print) {
        process.stdout.write(date() + ' ' + colorize('31', '[ERRO] ') + print + '\n');
    },

    debug: function (print) {
        process.stdout.write(date() + ' ' + colorize('35', '[DBUG] ') + print + '\n');
    },

    warn: function (print) {
        process.stdout.write(date() + ' ' + colorize('33', '[WARN] ') + print + '\n');
    },

    info: function (print) {
        process.stdout.write(date() + ' ' + colorize('36', '[INFO] ') + print + '\n');
    },

    success: function (print) {
        process.stdout.write(date() + ' ' + colorize('92', '[ OK ] ') + print + '\n');
    }
}
var stdout = {};

stdout.write = function (msg) {
    if (process && process.stdout) {
        process.stdout.write(msg);
    }
    else {
        var termtext;
        msg = msg.replace(/\t/g, '&nbsp;&nbsp;');
        msg = msg.replace(/\n/g, '<br/>');
        termtext = $("#termtext");
        termtext.html(termtext.html() + msg);
    }
};
stdout.log = function (msg) {
    stdout.write(msg + "\n");
};

module.exports = stdout;
var Logger = {
    createNamedLogger: function (name) {
        return function () {
            var args = Array.prototype.slice.call(arguments, 0);
            args[0] = name + ': ' + args[0];
            console.log.apply(console, args);
        };
    }
};

module.exports = Logger;
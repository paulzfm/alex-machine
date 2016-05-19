'use strict';

require('buffer/');
var sim = require('./sim');

var osFile, dbgFile;
var oReq = new XMLHttpRequest();
oReq.open("GET", "/assets/bin/os", true);
oReq.responseType = "arraybuffer";
oReq.onload = function (oEvent) {
    var arrayBuffer = oReq.response; // Note: not oReq.responseText
    if (arrayBuffer) {
        osFile = new Buffer(arrayBuffer);
    }
};
oReq.send(null);

$.getJSON("/assets/bin/os.json", function(result){
    dbgFile = result;
});

global.initAlexMachine = function() {
    sim(osFile, dbgFile, {});
};


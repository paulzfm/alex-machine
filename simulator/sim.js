var cpu = require('./alex-cpu');
var elfy = require('elfy');
var fs = require('fs');

fs.readFile('/home/alexwang/dev/proj/os/alex-machine-tests/a.out', function (err, data) {
  if (err) {
    throw err;
  }
  var elf = elfy.parse(data);
  var sections = elf.body.sections;
  var text = (sections.filter(function (obj) {
    return obj.name == '.text';
  }))[0];
  var instructions = text.data;
  var total = instructions.length / 4;

  cpu.initializeStack();
  for (var i = 0; i < total; i++) {
    var ins = instructions.readUInt32LE(i * 4);
    console.log(ins.toString(16));
    try {
      cpu.runInstruction(ins);
    }
    catch(e) {
      cpu.printDebugInfo();
      throw e;
    }
  }
});

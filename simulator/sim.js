var cpu = require('./alex-cpu');
var elfy = require('elfy');
var fs = require('fs');

fs.readFile('/Users/paul/Workspace/alex-cpu-test/a.out', function (err, data) {
  if (err) {
    throw err;
  }
  var elf = elfy.parse(data);
  var sections = elf.body.sections;
  var text = (sections.filter(function (obj) {
    return obj.name == '.text';
  }))[0];
  var bss = (sections.filter(function (obj) {
    return obj.name == '.bss';
  }))[0];

  cpu.resetStatus();

  // load BSS
  cpu.initMemory(bss.data);

  // load instructions
  cpu.loadInstructions(text.data, bss.data.length);

  // run instructions
  while (true) {
    var ins = cpu.fetchInstruction();
    cpu.runInstruction(ins);
  }
});

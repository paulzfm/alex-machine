var cpu = require('./alex-cpu');
var dbg = require('./debugger');
var elfy = require('elfy');
var fs = require('fs');
var sprintf = require('sprintf');
var optparse = require('optparse');

var switches = [
  ['-h', '--help', 'Shows help sections'],
  ['-p', '--program PROGRAM_PATH', 'Specify Alex Machine elf executable']
];

var optionParser = new optparse.OptionParser(switches);

var usage = function () {
  var options = [optionParser.options(), dbg.commandLineOptions()];
  console.log("Usage: node sim.js OPTIONS");
  for (var i = 0; i < options.length; ++i) {
    for (var j = 0; j < options[i].length; ++j) {
      console.log(
        sprintf("\t%s %s\t%s",
          options[i][j].short,
          options[i][j].long,
          options[i][j].desc
        ))
    }
  }
  process.exit(0);
};

options = { debugger: {} };
optionParser.on('help', function() {
  usage();
});
optionParser.on('program', function (opt, value) {
  options.program = value;
});
optionParser.parse(process.argv);

if (!options.program) {
  usage();
}

var fileName = options.program;
fs.readFile(fileName, function (err, data) {
  if (err) {
    throw err;
  }
  var elf = elfy.parse(data);
  var sections = elf.body.sections;
  var text = (sections.filter(function (obj) {
    return obj.name == '.text';
  }))[0];

  // note that these data sections may not exist
  var dataSections = sections.filter(function (obj) {
    return ['.data', '.bss', '.rodata'].indexOf(obj.name) != -1;
  });

  dbg.initialize(sections, fileName + ".json", cpu, process.argv);

  cpu.resetStatus();

  // load all data sections
  cpu.initMemorySection(text.addr, text.data, text.size);
  for (var i = 0; i < dataSections.length; ++i) {
    if (dataSections[i].name === '.bss') {
      cpu.initMemorySection(dataSections[i].addr, null, dataSections[i].size, function () { return 0; });
    }
    else {
      cpu.initMemorySection(dataSections[i].addr, dataSections[i].data, dataSections[i].size);
    }

    //console.log("section " + dataSections[i].name + " loaded at " + dataSections[i].addr.toString(16));
  }

  // 初始化堆栈, 这个函数是临时用的, 开辟一段内存用于堆栈
  cpu.initializeStack(0x7c00000, 200 * 1024); // 128MiB - 1MiB, size: 200KiB
  cpu.startRunning(elf.entry, 100 * 1024 /* Execute this number of instructions and stop */, dbg);
});

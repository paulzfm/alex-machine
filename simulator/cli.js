var optparse = require('optparse');
var sim = require('./sim');
var fs = require('fs');
var switches = [
  ['-h', '--help', 'Shows help sections'],
  ['-p', '--program PROGRAM_PATH', 'Specify Alex Machine elf executable'],
  ['-s', '--step [STEP_MODE]', 'asm|src|no. Specify stepping mode, default to no step']
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
optionParser.on('step', function (opt, value) {
  options.debugger.stepMode = value;
});

if (!options.program) {
  usage();
}
else {
  fs.readFile(options.program, function (err, data) {
    if (err) {
      throw err;
    }
    sim(data, fs.readFileSync(options.program + ".json", 'utf8'));
  });
}
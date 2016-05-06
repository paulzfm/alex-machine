var elfy = require('elfy');
var fs = require('fs');
var sprintf = require('sprintf');
var readlineSync = require('readline-sync');
var disasm = require('./disassembler');
var optparse = require('optparse');

var
  AsmStep =     "asm",
  SourceStep =  "src",
  NoStep =      "no",

  config = {
    stepMode:           NoStep,
    asmPrecedingLines:  2,
    asmFollowingLines:  4,
    indentWidth:        2
  };

var
  switches = [
    ['-s', '--step [STEP_MODE]', 'Specify stepping mode, default to no step']
  ],
  optionParser = new optparse.OptionParser(switches);

optionParser.on('step', function (opt, value) {
  config.stepMode = value;
});

var
  cachedSourceFiles = {},
  symbols = {},
  lines = {},
  currentIndent = 2,
  breakpoints = {
    pc: []
  };

var readUInt32LE = function (data, start) {
  var sum = 0;
  for (var i = 0; i < 4; ++i) {
    sum += data[start + i] << 8 * i >>> 0;
  }
  return sum;
};
var readNullEndString = function (data, offset) {
  //offset++;
  var i = offset;
  while (true) {
    if (i < data.length && data[i] == 0) {
      var thisStrBuf = data.subarray(offset, i);
      return String.fromCharCode.apply(null, thisStrBuf);
    }
    i++;
  }
};
var indentPrint = function (str) {
  var ret = '';
  for (var i = 0; i < currentIndent * config.indentWidth; ++i) {
    ret += ' ';
  }
  ret += str;
  console.log(ret);
};
var increaseIndent = function () {
  currentIndent++;
};
var decreaseIndent = function () {
  currentIndent--;
};

var cpu = {};
var dbg = {};
dbg.optionParser = optionParser;

dbg.initialize = function (sections, lineSymbolFile, _cpu, argv) {
  optionParser.parse(argv);

  cpu = _cpu;
  var symtab = (sections.filter(function (obj) {
    return obj.name == '.symtab';
  }))[0];
  var strtab  = (sections.filter(function (obj) {
    return obj.name == '.strtab';
  }))[0];

  // load symbols
  for (var i = 0; i < symtab.size / 16; ++i) {
    var symNameIndex =  symtab.data.readUInt32LE(16 * i);
    var symValue =      symtab.data.readUInt32LE(16 * i + 4);
    var symSize =       symtab.data.readUInt32LE(16 * i + 8);
    // var symInfo =       symtab.data.readUInt8(16 * i + 12);
    // var symOther =      symtab.data.readUInt8(16 * i + 13);
    // var symSectionIndex = symtab.data.readUInt16LE(16 * i + 14);
    var name = readNullEndString(strtab.data, symNameIndex);
    symbols[name] = {
      "name": name,
      "value": symValue,
      "size": symSize
    };
  }

  // load debug line numbers
  lines = JSON.parse(fs.readFileSync(lineSymbolFile, 'utf8'));
};



dbg.getSymbolByAddress = function(address) {
  for (var i = 0; i < symbols.length; ++i) {
    if (symbols[i].value <= address && address < symbols[i].value + symbols[i].size) {
      return symbols[i];
    }
  }
  return null;
};
dbg.getSymbolAddress = function(name) {
  return symbols[name];
};

dbg.getAddressFileLine = function (address) {
  for (var fileName in lines) {
    if (lines.hasOwnProperty(fileName)) {
      for (var lineno in lines[fileName]) {
        if (lines[fileName].hasOwnProperty(lineno)) {
          if (lines[fileName][lineno] == address) {
            return {
              file: fileName,
              line: lineno,
              address: address
            }
          }
        }
      }
    }
  }
  return null;
};

dbg.printDebugInfo = function () {
  try {
    var pc = cpu.getPC(), sp = cpu.getRegister(cpu.Regs.SP);
    console.log("--------------- Alex Machine Debug Info -----------------");
    process.stdout.write(dbg.sprintRegs());
    console.log("instructions: ");
    for (var i = -2; i < 4; ++i) {
      var ins = cpu.readMemUInt32LE(pc + 4 * i);
      var str = '     ';
      if (i == 0) str = ' --> ';
      str += sprintf("0x%08x:  " + disasm.disassemble(ins), pc + 4 * i);
      console.log(str);
    }
    console.log("stack: ");
    console.log(dbg.sprintMem(sp, 4, 4));
  }
  catch (e) {
    // ignore unreadable memory exception
  }
};

dbg.sprintRegs = function () {
  var regNames = [
    'r0', 't0', 't1', 't2', 't3', 't4', 's0', 's1', 's2', 's3', 's4',
    'fp', 'sp'
  ];

  var ret = sprintf("pc =\t0x%08x\n", cpu.getPC());
  for (var i = 0; i < regNames.length; ++i) {
    ret += sprintf(regNames[i] + " =\t0x%08x", cpu.getRegister(i));
    if (i % 2 != 1)
      ret += "\n";
    else
      ret += "\t";
  }
  return ret;
};

dbg.sprintMem = function(start, count) {
  start = (start / 4).toFixed() * 4;
  var readMemChar = function (address) {
    return String.fromCharCode(cpu.readMemUInt8(address));
  };

  var ret = '';
  for (var i = 0; i < count; ++i, start += 4 * 4) {
    ret += sprintf("0x%08x:\t0x%08x 0x%08x 0x%08x 0x%08x\t", start,
      cpu.readMemUInt32LE(start),
      cpu.readMemUInt32LE(start + 4),
      cpu.readMemUInt32LE(start + 4 * 2),
      cpu.readMemUInt32LE(start + 4 * 3));
    for (var j = 0; j < 4 * 4; ++j) {
      ret += readMemChar(start + j);
    }
    ret += "\n";
  }

  return ret;
};

dbg.debugConsole = function (pc, inst, cpu, mode, fileLine) {

  console.log(sprintf("  PC: 0x%08x\tIns: 0x%08x", pc, inst));
  if (mode == AsmStep) {
    console.log(sprintf("    %s", disasm.disassemble(inst)));
  }
  else if (mode == SourceStep) {
    increaseIndent();
    indentPrint(sprintf("%s:%s", fileLine.file, fileLine.line));
    increaseIndent();
    indentPrint(sprintf("%s", readFileLine(fileLine.file, parseInt(fileLine.line))));
    decreaseIndent();
  }

  while (true) {
    var cmd = readlineSync.question('AlexDbg => ');
    var tokens = cmd.split(" ");
    if (cmd == "" || tokens[0] == "c") {
      break;
    }
    else if (tokens[0] == "p") {
      if (tokens.length == 1 || tokens[1] == "d") {
        dbg.printDebugInfo();
      }
    }
    else if (tokens[0] == "x") {
      var sym = dbg.getSymbolAddress(tokens[1]);
      if (sym) {
        var val = cpu.readMemUInt32LE(sym.value);
        console.log(sprintf("*((uint32_t*)%s) = 0x%08x", sym.name, val))
      }
      else {
        console.log(sprintf("symbol %s not found!", tokens[1]));
      }
    }
    else if (tokens[0] == 'b' && tokens[1]) {
      breakpoints.pc.push(parseInt(tokens[1]));
    }
    else if (tokens[0] == 'bps') {
      dbg.printBreakpoints();
    }
    else {
      console.log("unknown command");
    }
  }
};


var readFileLine = function (file, line) {
  if (!cachedSourceFiles[file])
    cachedSourceFiles[file] = fs.readFileSync(file, 'utf8').split("\n");

  return cachedSourceFiles[file][line];
};

dbg.onExecuteInstruction = function (c) {
  var pc = c.getPC();
  var inst = c.readMemUInt32LE(pc);
  var fileLine = dbg.getAddressFileLine(pc);

  for (var i = 0; i < breakpoints.pc.length; ++i) {
    if (breakpoints.pc[i] == pc) {
      console.log(sprintf("breakpoint hit! 0x%08x", pc));
      if (config.stepMode == SourceStep && fileLine) {
        dbg.debugConsole(pc, inst, c, config.stepMode, fileLine);
      }
      else {
        dbg.debugConsole(pc, inst, c, AsmStep);
      }
      return;
    }
  }

  if (config.stepMode != NoStep) {
    if (config.stepMode == SourceStep) {
      if (!fileLine)
        return;
      dbg.debugConsole(pc, inst, c, config.stepMode, fileLine);
    }
    else if (config.stepMode == AsmStep) {
      dbg.debugConsole(pc, inst, c, config.stepMode);
    }
  }
};

dbg.printBreakpoints = function () {
  increaseIndent();
  {
    indentPrint("PC breakpoints:");
    increaseIndent();
    for (var i = 0; i < breakpoints.pc.length; ++i) {
      indentPrint(sprintf("b 0x%08x", breakpoints.pc[i]));
    }
    decreaseIndent();
  }
  decreaseIndent();
};


module.exports = dbg;
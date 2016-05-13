var elfy = require('elfy');
var fs = require('fs');
var sprintf = require('sprintf');
var readlineSync = require('readline-sync');
var disasm = require('./disassembler');
var optparse = require('optparse');
var dwarf = require('./debugInfo');

/**
 * Alex-Machine debugger,
 * debug console
 *
 */

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
    ['-s', '--step [STEP_MODE]', 'asm|src|no. Specify stepping mode, default to no step']
  ],
  optionParser = new optparse.OptionParser(switches);

optionParser.on('step', function (opt, value) {
  config.stepMode = value;
});

var
  cachedSourceFiles = {},
  symbols = {},
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
dbg.initialize = function (sections, debugInfoFile, _cpu, argv) {
  optionParser.parse(argv);

  cpu = _cpu;
  var symtab = (sections.filter(function (obj) {
    return obj.name == '.symtab';
  }))[0];
  var strtab  = (sections.filter(function (obj) {
    return obj.name == '.strtab';
  }))[0];

  // load debug info
  dwarf.initialize(JSON.parse(fs.readFileSync(debugInfoFile, 'utf8')), cpu, dbg);

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
};

dbg.commandLineOptions = function () {
  return optionParser.options();
};

dbg.getSymbolByAddress = function(address) {
  for (var i = 0; i < symbols.length; ++i) {
    if (symbols[i].value <= address && address < symbols[i].value + symbols[i].size) {
      return symbols[i];
    }
  }
  return null;
};
dbg.getSymbol = function (name) {
  return symbols[name];
};
dbg.getSymbolAddress = function(name) {
  return symbols[name]['value'];
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
    console.log(dbg.sprintMem(sp, 4));
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

function debuggerConsoleHelpInfo() {
  return `
  Usage: COMMAND [parameters]...
    c             step in (or directly press Enter)
    p d           print current context
    p l           print local variables
    
    p m PHYSICAL_ADDRESS  
                  print *((int*)(*PHYSICAL_ADDRESS))
                  
    x SYMBOL      print *((uint32*)(*SYMBOL_ADDRESS))
    b PHYSICAL_ADDRESS
                  set PC breakpoint on PHYSICAL_ADDRESS
                  
    bps           print all breakpoints
    help          show this message
  `;
}

dbg.debugConsole = function (pc, inst, cpu, mode, fileLine) {
  dwarf.printLocalVariables(pc);

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
      else if (tokens[1] == 'l') {
        dwarf.printLocalVariables(pc);
      }
      else if (tokens[1] == 'm') {
        var addr = parseInt(tokens[2], 16);
        console.log(addr);
        console.log(dbg.sprintMem(addr, 4));
      }
      else if (tokens[1] == 't' && tokens.length == 3) {
        var varName = tokens[2];
        var address = dbg.getSymbolAddress(varName);
        var t = dwarf.getSymbolType(varName);
        var varType = t['name'];
        var typeOfType = t['type'];

        dwarf.printTypedVariable(address, varName, varType, typeOfType);
      }
    }
    else if (tokens[0] == "x") {
      var sym = dbg.getSymbol(tokens[1]);
      if (sym) {
        var val = cpu.readMemUInt32LE(sym.value);
        increaseIndent();
        {
          indentPrint(sprintf("%s = 0x%08x", sym.name, sym.value));
          indentPrint(sprintf("*((uint32_t*)%s) = 0x%08x", sym.name, val));
        }
        decreaseIndent();
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
    else if (tokens[0] == 'dis') {
      var memAddr = parseInt(tokens[1]);
      if (isNaN(memAddr)) {
        memAddr = cpu.getPC();
      }
      var str = '';
      for (var i = -3; i < 3; ++i) {
        var ins = cpu.readMemUInt32LE(memAddr + 4 * i);
        if (i == 0)
          str += ' --> ';
        else
          str += '     ';
        str += sprintf("0x%08x:  %s\n", memAddr + 4 * i, disasm.disassemble(ins));
      }
      console.log(str);
    }
    else if (tokens[0] == 'help') {
      console.log(debuggerConsoleHelpInfo());
    }
    else if (tokens[0] == 'dis' && tokens.length == 2) {

    }
    else {
      console.log("unknown command");
      console.log(debuggerConsoleHelpInfo());
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
  var fileLine = dwarf.getAddressFileLine(pc);

  for (var i = 0; i < breakpoints.pc.length; ++i) {
    if (breakpoints.pc[i] == pc) {
      console.log(sprintf("breakpoint hit! 0x%08x", pc));
      if (config.stepMode === SourceStep && fileLine) {
        dbg.debugConsole(pc, inst, c, config.stepMode, fileLine);
      }
      else {
        dbg.debugConsole(pc, inst, c, AsmStep);
      }
      return;
    }
  }

  if (config.stepMode !== NoStep) {
    if (config.stepMode === SourceStep) {
      if (!fileLine)
        return;
      dbg.debugConsole(pc, inst, c, config.stepMode, fileLine);
    }
    else if (config.stepMode === AsmStep) {
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
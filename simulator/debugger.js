var elfy = require('elfy');
var fs = require('fs');
var sprintf = require('sprintf');
var readlineSync = require('readline-sync');
var disasm = require('./disassembler');

var symbolTable = {};

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

var symbols = {};
var lines = {};
var dbg = {};
dbg.initialize = function (sections, lineSymbolFile) {
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
    var symInfo =       symtab.data.readUInt8(16 * i + 12);
    var symOther =      symtab.data.readUInt8(16 * i + 13);
    var symSectionIndex = symtab.data.readUInt16LE(16 * i + 14);
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

dbg.debugConsole = function (pc, inst, cpu, mode, fileLine) {

  console.log(sprintf("  PC: 0x%08x\tIns: 0x%08x", pc, inst));
  if (mode == AsmStep) {
    console.log(sprintf("    %s", disasm.disassemble(inst)));
  }
  else if (mode == SourceStep) {
    console.log(sprintf("  %s:%s", fileLine.file, fileLine.line));
    console.log(sprintf("    %s", readFileLine(fileLine.file, parseInt(fileLine.line))));
  }

  while (true) {
    var cmd = readlineSync.question('AlexDbg => ');
    var tokens = cmd.split(" ");
    if (cmd == "" || tokens[0] == "c") {
      break;
    }
    else if (tokens[0] == "p") {
      if (tokens.length == 1 || tokens[1] == "d") {
        cpu.printDebugInfo();
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
    else {
      console.log("unknown command");
    }
  }
};

var cachedFiles = {};

var readFileLine = function (file, line) {
  if (!cachedFiles[file])
    cachedFiles[file] = fs.readFileSync(file, 'utf8').split("\n");

  return cachedFiles[file][line];
};

var AsmStep = 1, SourceStep = 2, NoStep = 3;
var stepMode = AsmStep;

dbg.onExecuteInstruction = function (c) {
  var pc = c.getPC();
  var inst = c.readMemUInt32LE(pc);

  if (stepMode != NoStep) {
    var fileLine = dbg.getAddressFileLine(pc);
    if (stepMode == SourceStep) {
      if (!fileLine)
        return;
      dbg.debugConsole(pc, inst, c, stepMode, fileLine);
    }
    else if (stepMode == AsmStep) {
      dbg.debugConsole(pc, inst, c, stepMode);
    }
  }
};

dbg.printSymbols = function () {

};

module.exports = dbg;
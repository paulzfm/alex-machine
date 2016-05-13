var sprintf = require('sprintf');
/**
 * Alex-Machine debugger
 * dwarf debug info, including symbols, 
 * function pc range, local variables
 * 
 */

var dwarf = {};
var dbg;
var cpu;
var debugInfo = {};
debugInfo.initialize = function(dbgInfo, _cpu, _dbg) {
  dwarf = dbgInfo;
  dbg = _dbg;
  cpu = _cpu;
};

function sprintTypeVar(address, typeName) {
  var str = '';
  switch (typeName) {
    case "int":
      str = sprintf("%d", (new Int32Array([cpu.readMemUInt32LE(address)]))[0]);
      break;
    case "unsigned int":
      str = sprintf("0x%08x", cpu.readMemUInt32LE(address));
      break;
    case "char":
      str = sprintf("%c", cpu.readMemUInt8(address));
      break;
    case "unsigned char":
      str = sprintf("0x%02x", cpu.readMemUInt8(address));
      break;
    default:
      str = typeName + " " + address;
  }
  return str;
}

debugInfo.printTypedVariable = function (address, varName, typeName, typeOfType) {
  var str = sprintf("&%s = 0x%08x;\t", varName, address);
  switch(typeOfType) {
    case "pointer":{
      var ptr = cpu.readMemUInt32LE(address);
      str += sprintf("%s %s = 0x%08x;\t", typeName, varName, ptr);
      str += sprintf("*((%s)%s) = %s;\n", typeName, varName,
        sprintTypeVar(ptr, typeName.substr(0, typeName.length-1)));
      break;
    }
    case "basic":
      str += sprintf("%s %s = %s", typeName, varName, sprintTypeVar(address, typeName));
      break;
    case "struct":
      str += typeName;
      break;
    default:
      str += typeOfType + " " + typeName;
  }
  console.log(str);
};

debugInfo.getSymbolType = function (symbolName) {
  var sym = dwarf['variables'][symbolName];
  return dwarf['types'][sym['typeOffset']];
};

debugInfo.getAddressFileLine = function (address) {
  for (var fileName in dwarf['debugLines']) {
    if (dwarf['debugLines'].hasOwnProperty(fileName)) {
      for (var lineno in dwarf['debugLines'][fileName]) {
        if (dwarf['debugLines'][fileName].hasOwnProperty(lineno)) {
          if (dwarf['debugLines'][fileName][lineno] == address) {
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

debugInfo.printLocalVariables = function (address) {
  for (var funcName in dwarf['functions']) {
    if (dwarf['functions'].hasOwnProperty(funcName)) {
      var func = dwarf['functions'][funcName];
      var i = 0;
      if (func['startAddress'] <= address && address < func['startAddress'] + func['size']) {

        var name, location, typeOffset, t;
        var fp, memAddr;
        var args = func['arguments'];
        if (args) {
          for (i = 0; i < args.length; ++i) {
            name = args[i]['name'];
            location = args[i]['location'];
            typeOffset = args[i]['typeOffset'];
            t = dwarf['types'][typeOffset];
            fp = cpu.getRegister(cpu.Regs.FP);
            memAddr = fp - 4 - 4*5 - 4 * i;
            debugInfo.printTypedVariable(memAddr, name, t['name'], t['type']);
          }
        }
        var localVariables = func['localVariables'];
        if (localVariables) {
          for (i = 0; i < localVariables.length; ++i) {
            name = localVariables[i]['name'];
            location = localVariables[i]['location'];
            typeOffset = localVariables[i]['typeOffset'];
            t = dwarf['types'][typeOffset];
            fp = cpu.getRegister(cpu.Regs.FP);
            memAddr = fp - 4 - 4*5 - args.length * 4 - 4 * i;
            debugInfo.printTypedVariable(memAddr, name, t['name'], t['type']);
          }
        }
      }
    }
  }
};

module.exports = debugInfo;
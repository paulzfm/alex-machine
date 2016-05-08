var sprintf = require('sprintf');

var dwarf = {};
var dbg;
var cpu;
var debugInfo = {};
debugInfo.initialize = function(dbgInfo, _cpu, _dbg) {
  dwarf = dbgInfo;
  dbg = _dbg;
  cpu = _cpu;
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
      if (func['startAddress'] <= address && address < func['startAddress'] + func['size']) {

        var name, location, typeOffset, t;
        var args = func['arguments'];
        if (args) {
          for (var i = 0; i < args.length; ++i) {
            name = args[i]['name'];
            location = args[i]['location'];
            typeOffset = args[i]['typeOffset'];
            t = dwarf['types'][typeOffset];
            var fp = cpu.getRegister(cpu.Regs.FP);
            console.log(sprintf("%s %s = 0x%08x", t['name'], name, cpu.readMemUInt32LE(fp + 8 + i * 4)));
          }
        }
        // var localVariables = func['localVariables'];
        // for (var i = 0; i < localVariables.length; ++i) {
        //   name = localVariables[i]['name'];
        //   location = localVariables[i]['location'];
        //   typeOffset = localVariables[i]['typeOffset'];
        //   t = dwarf['types'][typeOffset];
        //   console.log(sprintf("%s %s %x", t, name, location['offset']))
        // }
      }
    }
  }
};

module.exports = debugInfo;
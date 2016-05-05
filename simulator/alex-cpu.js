var bin = require('./binary');
var sprintf = require('sprintf');
var dbg = require('./debugger');

var
  PC = new Buffer(4),
  regs = [],
  fregs = [],
  mem = {},
  IVEC = new Buffer(4),
  PTBR = new Buffer(4),
  FLGS = new Buffer(4),

  writeRegister = function (idx, buf) {
    if (idx == 0) {
      console.log('Warning: R0 is read-only.');
    } else {
      regs[idx] = buf;
    }
  },

  decodeRType = function (ins) {
    return {
      'code': ins >>> 24,
      'ra': (ins >>> 20) & 0xF,
      'rb': (ins >>> 16) & 0xF,
      'rc': (ins >>> 12) & 0xF
    };
  },

  decodeIType = function (extend) {
    return function (ins) {
      return {
        'code': ins >>> 24,
        'ra': (ins >>> 20) & 0xF,
        'rb': (ins >>> 16) & 0xF,
        'imm': extend(ins & 0xFFFF)
      };
    };
  },

  exeBinR = function (op) {
    return function (args) {
      writeRegister(args['ra'], op(regs[args['rb']], regs[args['rc']]));
    };
  },

  exeBinI = function (op) {
    return function (args) {
      writeRegister(args['ra'], op(regs[args['rb']], args['imm']));
    };
  },

  exeBranch = function (test) {
    return function (args) {
      var buf = test(regs[args['ra']], regs[args['rb']]);
      var value = buf.readInt32LE(0, 4);
      if (value == 1) {
        return bin.add32(PC, args['imm']);
      } else {
        return bin.add32(PC, bin.four32);
      }
    };
  },

  exeLoad = function (loader) {
    return function (args) {
      var addr = bin.add32(regs[args['rb']], args['imm']);
      writeRegister(args['ra'], loader(addr.readUInt32LE(0, 4), mem));
    };
  },

  exeStore = function (saver) {
    return function (args) {
      var addr = bin.add32(regs[args['rb']], args['imm']);
      saver(addr.readUInt32LE(0, 4), regs[args['ra']], mem);
    };
  },

  exePop = function (loader, bytes) {
    return function (args) {
      writeRegister(args['ra'], loader(cpu.getRegister(cpu.Regs.SP), mem));
      regs[cpu.Regs.SP] = bin.add32(regs[cpu.Regs.SP], bin.int32Buf(bytes));
    };
  },

  exePush = function (saver, bytes) {
    return function (args) {
      regs[cpu.Regs.SP] = bin.sub32(regs[cpu.Regs.SP], bin.int32Buf(bytes));
      saver(cpu.getRegister(cpu.Regs.SP), regs[args['ra']], mem);
    };
  },

  exeFloat = function (op) {
    return function (args) {
      fregs[args['ra']] = op(fregs[args['rb']], fregs[args['rc']]);
    };
  },

  exeFloatCmp = function (op) {
    return function (args) {
      writeRegister(args['ra'], op(fregs[args['rb']], fregs[args['rc']]));
    };
  },

  jmp = function (nextPC) {
    PC = nextPC;
  },

  cont = function () {
    PC = bin.add32(PC, bin.four32);
  },

  executor = function (decode, exe, next) {
    return function (ins) {
      next(exe(decode(ins)));
    };
  },

  kexecutor = executor, // TODO: execute only on kernel mode

  insTable = {
    0x00: executor(decodeRType, function () {
    }, cont),

    0x01: executor(decodeRType, exeBinR(bin.add32), cont),
    0x02: executor(decodeIType(bin.ext32), exeBinI(bin.add32), cont),
    0x03: executor(decodeIType(bin.uext32), exeBinI(bin.add32), cont),

    0x04: executor(decodeRType, exeBinR(bin.sub32), cont),
    0x05: executor(decodeIType(bin.ext32), exeBinI(bin.sub32), cont),
    0x06: executor(decodeIType(bin.uext32), exeBinI(bin.sub32), cont),

    0x07: executor(decodeRType, exeBinR(bin.mul32), cont),
    0x08: executor(decodeIType(bin.ext32), exeBinI(bin.mul32), cont),
    0x09: executor(decodeIType(bin.uext32), exeBinI(bin.mul32), cont),

    0x0A: executor(decodeRType, exeBinR(bin.div32), cont),
    0x0B: executor(decodeIType(bin.ext32), exeBinI(bin.div32), cont),
    0x0C: executor(decodeIType(bin.uext32), exeBinI(bin.div32), cont),
    0x43: executor(decodeRType, exeBinR(bin.divu32), cont),

    0x0D: executor(decodeRType, exeBinR(bin.mod32), cont),
    0x0E: executor(decodeIType(bin.ext32), exeBinI(bin.mod32), cont),
    0x0F: executor(decodeIType(bin.uext32), exeBinI(bin.mod32), cont),
    0x44: executor(decodeRType, exeBinR(bin.modu32), cont),

    0x10: executor(decodeRType, exeBinR(bin.shl32), cont),
    0x11: executor(decodeIType(bin.uext32), exeBinI(bin.shl32), cont),

    0x12: executor(decodeRType, exeBinR(bin.slr32), cont),
    0x13: executor(decodeIType(bin.uext32), exeBinI(bin.slr32), cont),

    0x14: executor(decodeRType, exeBinR(bin.sar32), cont),
    0x15: executor(decodeIType(bin.uext32), exeBinI(bin.sar32), cont),

    0x16: executor(decodeRType, exeBinR(bin.and32), cont),
    0x17: executor(decodeRType, exeBinR(bin.or32), cont),
    0x42: executor(decodeIType(bin.uext32), exeBinI(bin.or32), cont),
    0x18: executor(decodeRType, exeBinR(bin.xor32), cont),
    0x19: executor(decodeRType, exeBinR(bin.not32), cont),
    0x1A: executor(decodeRType, exeBinR(bin.eq32), cont),
    0x1B: executor(decodeRType, exeBinR(bin.ne32), cont),
    0x1C: executor(decodeRType, exeBinR(bin.lt32), cont),
    0x1D: executor(decodeRType, exeBinR(bin.ltu32), cont),
    0x1E: executor(decodeRType, exeBinR(bin.gt32), cont),
    0x1F: executor(decodeRType, exeBinR(bin.gtu32), cont),
    0x20: executor(decodeRType, exeBinR(bin.le32), cont),
    0x21: executor(decodeRType, exeBinR(bin.leu32), cont),
    0x22: executor(decodeRType, exeBinR(bin.ge32), cont),
    0x23: executor(decodeRType, exeBinR(bin.geu32), cont),

    0x24: executor(decodeIType(bin.oext32), exeBranch(bin.true32), jmp),
    0x25: executor(decodeIType(bin.oext32), exeBranch(bin.eq32), jmp),
    0x26: executor(decodeIType(bin.oext32), exeBranch(bin.ne32), jmp),
    0x27: executor(decodeIType(bin.oext32), exeBranch(bin.lt32), jmp),
    0x28: executor(decodeIType(bin.oext32), exeBranch(bin.gt32), jmp),

    0x2A: executor(decodeRType, function (args) {
      return regs[args['ra']];
    }, jmp),
    0x2B: executor(decodeRType, function (args) {
      var data = bin.add32(PC, bin.four32);
      regs[cpu.Regs.SP] = bin.sub32(regs[cpu.Regs.SP], bin.four32);
      bin.storeWord(cpu.getRegister(cpu.Regs.SP), data, mem);
      return regs[args['ra']];
    }, jmp),
    0x2C: executor(decodeRType, function (args) {
      var buf = bin.loadWord(cpu.getRegister(cpu.Regs.SP), mem);
      regs[cpu.Regs.SP] = bin.add32(regs[cpu.Regs.SP], bin.four32);
      return buf;
    }, jmp),

    0x2D: executor(decodeIType(bin.ext32), exeLoad(bin.loadWord), cont),
    0x2E: executor(decodeIType(bin.ext32), exeLoad(bin.loadHalf), cont),
    0x2F: executor(decodeIType(bin.ext32), exeLoad(bin.loadByte), cont),
    0x30: executor(decodeIType(bin.ext32), exeLoad(bin.loadFloat), cont),

    0x31: executor(decodeIType(bin.ext32), function (args) {
      writeRegister(args['ra'], args['imm']);
    }, cont),
    0x32: executor(decodeIType(bin.uext32), function (args) {
      writeRegister(args['ra'], args['imm']);
    }, cont),
    0x33: executor(decodeIType(bin.uext32), function (args) {
      writeRegister(args['ra'], bin.or32(bin.and32(regs[args['ra']], bin.int32Buf(0xFFFF)),
        bin.shl32(args['imm'], bin.int32Buf(16))));
    }, cont),

    0x34: executor(decodeIType(bin.ext32), exeStore(bin.storeWord), cont),
    0x35: executor(decodeIType(bin.ext32), exeStore(bin.storeHalf), cont),
    0x36: executor(decodeIType(bin.ext32), exeStore(bin.storeByte), cont),
    0x37: executor(decodeIType(bin.ext32), exeStore(bin.storeFloat), cont),

    0x38: executor(decodeRType, exePop(bin.loadWord, 4), cont),
    0x39: executor(decodeRType, exePop(bin.loadHalf, 2), cont),
    0x3A: executor(decodeRType, exePop(bin.loadByte, 1), cont),
    0x3B: executor(decodeRType, exePop(bin.loadFloat, 8), cont),
    0x3C: executor(decodeRType, exePop(bin.loadWord, 8), cont),

    0x3D: executor(decodeRType, exePush(bin.storeWord, 4), cont),
    0x3E: executor(decodeRType, exePush(bin.storeHalf, 2), cont),
    0x3F: executor(decodeRType, exePush(bin.storeByte, 1), cont),
    0x40: executor(decodeRType, exePush(bin.storeFloat, 8), cont),
    0x41: executor(decodeRType, exePush(bin.storeWord, 8), cont),

    0x45: executor(decodeRType, function (args) {
      var val = regs[args['rb']].readInt32LE(0, 4);
      fregs[args['ra']].writeDoubleLE(val);
    }, cont),
    0x46: executor(decodeRType, function (args) {
      var val = regs[args['rb']].readUInt32LE(0, 4);
      fregs[args['ra']].writeDoubleLE(val);
    }, cont),
    0x47: executor(decodeRType, function (args) {
      var val = fregs[args['rb']].readDoubleLE();
      var buf = new Buffer(4);
      buf.writeInt32LE(0, 4, Math.floor(val));
      writeRegister(args['ra'], buf);
    }, cont),

    0x48: executor(decodeRType, exeFloat(bin.addFloat), cont),
    0x49: executor(decodeRType, exeFloat(bin.subFloat), cont),
    0x4A: executor(decodeRType, exeFloat(bin.mulFloat), cont),
    0x4B: executor(decodeRType, exeFloat(bin.divFloat), cont),
    0x4C: executor(decodeRType, exeFloat(bin.modFloat), cont),

    0x4D: executor(decodeRType, exeFloatCmp(bin.eqFloat), cont),
    0x4E: executor(decodeRType, exeFloatCmp(bin.neFloat), cont),
    0x4F: executor(decodeRType, exeFloatCmp(bin.ltFloat), cont),
    0x50: executor(decodeRType, exeFloatCmp(bin.gtFloat), cont),
    0x51: executor(decodeRType, exeFloatCmp(bin.leFloat), cont),
    0x52: executor(decodeRType, exeFloatCmp(bin.geFloat), cont),

    0x53: executor(decodeRType, exeFloat(bin.floorFloat), cont),
    0x54: executor(decodeRType, exeFloat(bin.ceilFloat), cont),

    // system instructions
    0x80: kexecutor(decodeRType, function (args) {

    }, cont),
    0x81: kexecutor(decodeRType, function (args) {
      var code = regs[args['rb']].readUInt16LE(0, 1);
      process.stdout.write(String.fromCharCode(code));
    }, cont),
    0x82: kexecutor(decodeRType, function (args) {
      writeRegister(args['ra'], IVEC);
    }, cont),
    0x83: kexecutor(decodeRType, function (args) {
      IVEC = regs[args['ra']];
    }, cont),
    0x84: kexecutor(decodeRType, function (args) {
      writeRegister(args['ra'], PTBR);
    }, cont),
    0x85: kexecutor(decodeRType, function (args) {
      PTBR = regs[args['ra']];
    }, cont),
    0x86: kexecutor(decodeRType, function (args) {
      writeRegister(args['ra'], FLGS);
    }, cont),
    0x87: kexecutor(decodeRType, function (args) {
      var idx = regs[args['ra']].readInt32LE(0, 4);
      var factor = 1 << idx;
      var data = FLGS.readInt32LE(0, 4);
      if (regs[args['rb']].readInt32LE(0, 4) == 1) { // set bit
        data |= factor;
      } else { // clear bit
        data &= ~factor;
      }
      FLGS.writeInt32LE(data, 0, 4);
    }, cont),

    0xFF: function () {
      console.log('HALT');
    }
  }
  ;

var cpu = {};

cpu.Regs = {
  R0: 0,
  S0: 1,
  S1: 2,
  S2: 3,
  S3: 4,
  S4: 5,
  T0: 6,
  T1: 7,
  T2: 8,
  T3: 9,
  T4: 10,
  FP: 11,
  SP: 12,
  GP: 13,
  AT: 14,
  LR: 15
};

cpu.runInstruction = function (ins) {
  //console.log('running ' + ins);
  var opcode = ins >>> 24;
  (insTable[opcode])(ins);
};

cpu.initMemory = function (buf) {
  for (var i = 0; i < buf.length; i++) {
    mem[i] = buf.slice(i, i + 1);
  }
};
cpu.initMemorySection = function (start, data, size, dataFunction) {
  if (typeof dataFunction === 'undefined')
    dataFunction = function (d, i) {
      return d[i]
    };
  for (var i = 0; i < size; i++) {
    mem[start + i] = new Buffer(1);
    mem[start + i][0] = dataFunction(data, i);
  }
};

cpu.loadInstructions = function (buf, offset) {
  for (var i = 0; i < buf.length; i++) {
    mem[offset + i] = buf.slice(i, i + 1);
  }
  PC.writeUInt32LE(offset);
};

cpu.fetchInstruction = function () {
  var buf = bin.loadWord(cpu.getPC(), mem);
  return buf.readInt32LE(0, 4);
};

// for testing
cpu.resetStatus = function () {
  regs = [];
  for (var i = 0; i < 16; i++) {
    regs.push(new Buffer(4));
  }
  regs[0].writeInt32LE(0, 0);
  fregs = [];
  for (var i = 0; i < 16; i++) {
    fregs.push(new Buffer(8));
  }
  mem = {};
  PC.writeUInt32LE(0, 0, 4);
};

cpu.setRegisters = function (obj) {
  for (var i = 0; i < 16; i++) {
    if (obj[i] != null) {
      regs[i] = bin.loadInt32(obj[i]);
    }
  }
};

cpu.getRegister = function (key) {
  return regs[key].readInt32LE(0, 4);
};

cpu.getRegisters = function (keys) {
  var data = {};
  keys.forEach(function (key) {
    data[key] = regs[key].readInt32LE(0, 4);
  });
  return data;
};

cpu.setRegistersUnsigned = function (obj) {
  for (var i = 0; i < 16; i++) {
    if (obj[i] != null) {
      regs[i] = bin.loadUInt32(obj[i]);
    }
  }
};

cpu.getRegistersUnsigned = function (keys) {
  var data = {};
  keys.forEach(function (key) {
    data[key] = regs[key].readUInt32LE(0, 4);
  });
  return data;
};

cpu.setFRegisters = function (obj) {
  for (var i = 0; i < 16; i++) {
    if (obj[i]) {
      fregs[i] = obj[i];
    }
  }
};

cpu.getPC = function () {
  return PC.readUInt32LE(0, 4);
};
cpu.setPC = function (value) {
  return PC.writeUInt32LE(value, 0);
};

cpu.fetchStatus = function () {
  return {
    'regs': regs.slice(),
    'fregs': fregs.slice(),
    'mem': JSON.parse(JSON.stringify(mem)),
    'pc': PC
  }
};

cpu.readMemUInt8 = function (address) {
  return mem[address].readUInt8(0) >>> 0;
};

cpu.readMemUInt32LE = function (address) {
  var sum = 0;
  for (var i = 0; i < 4; ++i) {
    if (mem[address + i]) {
      sum += mem[address + i].readUInt8(0) << 8 * i >>> 0;
    }
  }
  return sum;
};

cpu.initializeStack = function (address, size) {
  var stackTop = address;
  for (var i = stackTop - size; i < stackTop + size; ++i) {
    mem[i] = new Buffer(1);
    mem[i][0] = 0;
  }
};

cpu.startRunning = function (address, countOfInstructions) {
  cpu.setPC(address);

  var instructionCounter = 0;
  while (true) {
    try {
      dbg.onExecuteInstruction(cpu);

      var pc = cpu.getPC();
      var instr = cpu.readMemUInt32LE(pc);

      //console.log(sprintf("0x%08x", instr));
      //cpu.printDebugInfo();

      if (instr == 0xFFFFFFFF)
        break;
      cpu.runInstruction(instr);
    }
    catch (e) {
      dbg.printDebugInfo();
      throw e;
    }
    instructionCounter++;
    if (countOfInstructions && instructionCounter >= countOfInstructions)
      break;
  }
  console.log();
  dbg.printDebugInfo();
  console.log("Alex Machine Shutdown Normally!");
};

module.exports = cpu;

//cpu.resetStatus();
//cpu.setRegisters({
//  2: 65
//});
//cpu.runInstruction(0x81120000);
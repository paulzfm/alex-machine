var bin = require('./binary');

var
  PC = new Buffer(4),
  regs = [],
  FP = 11,
  SP = 12,
  GP = 13,
  AT = 14,
  LR = 15,

  fregs = [],
  mem = {},

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
      regs[args['ra']] = op(regs[args['rb']], regs[args['rc']]);
    };
  },

  exeBinI = function (op) {
    return function (args) {
      regs[args['ra']] = op(regs[args['rb']], args['imm']);
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
      regs[args['ra']] = loader(addr.readUInt32LE(0, 4), mem);
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
      regs[args['ra']] = loader(cpu.getRegister(SP), mem);
      regs[SP] = bin.add32(regs[SP], bin.int32Buf(bytes));
    };
  },

  exePush = function (saver, bytes) {
    return function (args) {
      regs[SP] = bin.sub32(regs[SP], bin.int32Buf(bytes));
      saver(cpu.getRegister(SP), regs[args['ra']], mem);
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

    0x29: executor(function (ins) {
      return {
        'code': ins >> 24,
        'imm': ins & 0xFFFFFF
      };
    }, function (args) {
      var pc = cpu.getPC() << 0;
      pc &= 0xFC000000;
      pc |= (args['imm'] << 2);
      var buf = new Buffer(4);
      buf.writeInt32LE(pc);
      return buf;
    }, jmp),
    0x2A: executor(decodeRType, function (args) {
      return regs[args['ra']];
    }, jmp),
    0x2B: executor(decodeRType, function (args) {
      var data = bin.add32(PC, bin.four32);
      regs[SP] = bin.sub32(regs[SP], bin.four32);
      bin.storeWord(cpu.getRegister(SP), data, mem);
      return regs[args['ra']];
    }, jmp),
    0x2C: executor(decodeRType, function (args) {
      var buf = bin.loadWord(cpu.getRegister(SP), mem);
      regs[SP] = bin.add32(regs[SP], bin.four32);
      return buf;
    }, jmp),

    0x2D: executor(decodeIType(bin.ext32), exeLoad(bin.loadWord), cont),
    0x2E: executor(decodeIType(bin.ext32), exeLoad(bin.loadHalf), cont),
    0x2F: executor(decodeIType(bin.ext32), exeLoad(bin.loadByte), cont),

    0x31: executor(decodeIType(bin.ext32), function (args) {
      regs[args['ra']] = args['imm'];
    }, cont),
    0x32: executor(decodeIType(bin.uext32), function (args) {
      regs[args['ra']] = args['imm'];
    }, cont),
    0x33: executor(decodeIType(bin.uext32), function (args) {
      regs[args['ra']] = bin.shl32(args['imm'], bin.int32Buf(16));
    }, cont),

    0x34: executor(decodeIType(bin.ext32), exeStore(bin.storeWord), cont),
    0x35: executor(decodeIType(bin.ext32), exeStore(bin.storeHalf), cont),
    0x36: executor(decodeIType(bin.ext32), exeStore(bin.storeByte), cont),

    0x38: executor(decodeRType, exePop(bin.loadWord, 4), cont),
    0x39: executor(decodeRType, exePop(bin.loadHalf, 2), cont),
    0x3A: executor(decodeRType, exePop(bin.loadByte, 1), cont),
    0x3C: executor(decodeRType, exePop(bin.loadWord, 8), cont),

    0x3D: executor(decodeRType, exePush(bin.storeWord, 4), cont),
    0x3E: executor(decodeRType, exePush(bin.storeHalf, 2), cont),
    0x3F: executor(decodeRType, exePush(bin.storeByte, 1), cont),
    0x41: executor(decodeRType, exePush(bin.storeWord, 8), cont),

    0xFF: function () {
      console.log('HALT');
    }
  }
  ;

var cpu = {};

cpu.runInstruction = function (ins) {
  //console.log('running ' + ins);
  var opcode = ins >>> 24;
  (insTable[opcode])(ins);
};

// for testing
cpu.resetStatus = function () {
  regs = [];
  for (var i = 0; i < 16; i++) {
    regs.push(new Buffer(4));
  }
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

cpu.fetchStatus = function () {
  return {
    'regs': regs.slice(),
    'fregs': fregs.slice(),
    'mem': JSON.parse(JSON.stringify(mem)),
    'pc': PC
  }
};

module.exports = cpu;

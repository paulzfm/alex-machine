var
  PC = 0,
  regs = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  FP = 11,
  SP = 12,
  GP = 13,
  AT = 14,
  LR = 15,

  fregs = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  mem = {},

  signed_ext = function (imm) {
    if (imm >> 15 == 1) {
      return (0xFFFF0000 + imm) >> 0;
    }
    return imm;
  },

  unsigned_ext = function (imm) {
    return imm;
  },

  offset_ext = function (imm) {
    return imm >> 2;
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
        'imm': extend(ins & 0xFF)
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

  exeLogicR = function (op) {
    return function (args) {
      regs[args['ra']] = op(regs[args['rb']], regs[args['rc']]) ? 1 : 0;
    };
  },

  opAdd = function (a, b) {
    return ((a + b) & 0xFFFFFFFF) >> 0;
  },

  opSub = function (a, b) {
    return ((a - b) & 0xFFFFFFFF) >> 0;
  },

  opMul = function (a, b) {
    return ((a * b) & 0xFFFFFFFF) >> 0;
  },

  opDiv = function (a, b) {
    return;
  },

  opMod = function (a, b) {
    return ((a % b) & 0xFFFFFFFF) >> 0;
  },

  opShl = function (a, b) {
    // assert(0 <= b && b <= 32);
    return a << b;
  },

  opSar = function (a, b) {
    assert(0 <= b && b <= 32);
    return a >> b;
  },

  opSlr = function (a, b) {
    assert(0 <= b && b <= 32);
    return a >>> b;
  },

  opOr = function (a, b) {
    return a | b;
  },

  exeBranch = function (test) {
    return function (args) {
      if (test(regs[args['ra']], regs[args['rb']])) {
        return PC + args['imm'];
      } else {
        return PC + 4;
      }
    };
  },

  load = function (bytes) {
    return function (addr) {
      var data = 0;
      for (var i = 0; i < bytes; i++) {
        data += mem[addr + i] << (8 * i);
      }
    };
  },

  loadWord = load(4),
  loadHalf = load(2),
  loadByte = load(1),

  store = function (bytes) {
    return function (addr, data) {
      for (var i = 0; i < bytes; i++) {
        mem[addr + i] = data & 0xFF;
        data >>> 8;
      }
    };
  },

  storeWord = store(4),
  storeHalf = store(2),
  storeByte = store(1),

  exeLoad = function (loader) {
    return function (args) {
      regs[args['ra']] = loader(regs[args['rb']] + args['imm']);
    };
  },

  exeStore = function (saver) {
    return function (args) {
      saver(regs[args['rb']] + args['imm'], regs[args['ra']]);
    };
  },

  jmp = function (nextPC) {
    PC = nextPC;
  },

  cont = function () {
    PC += 4;
  },

  executor = function (decode, exe, next) {
    return function (ins) {
      next(exe(decode(ins)));
    };
  },

  unsignedLT = function (a, b) {
    if ((a >= 0 && b >= 0) || (a < 0 && b < 0)) {
      return a < b;
    } else {
      return a >= 0;
    }
  },

  insTable = {
    0x00: executor(decodeRType, function () {
    }, cont),

    0x01: executor(decodeRType, exeBinR(opAdd), cont),
    0x02: executor(decodeIType(signed_ext), exeBinI(opAdd), cont),
    0x03: executor(decodeIType(unsigned_ext), exeBinI(opAdd), cont),

    0x04: executor(decodeRType, exeBinR(opSub), cont),
    0x05: executor(decodeIType(signed_ext), exeBinI(opSub), cont),
    0x06: executor(decodeIType(unsigned_ext), exeBinI(opSub), cont),

    0x07: executor(decodeRType, exeBinR(opMul), cont),
    0x08: executor(decodeIType(signed_ext), exeBinI(opMul), cont),
    0x09: executor(decodeIType(unsigned_ext), exeBinI(opMul), cont),

    0x0A: executor(decodeRType, exeBinR(opDiv), cont),
    0x0B: executor(decodeIType(signed_ext), exeBinI(opDiv), cont),
    0x0C: executor(decodeIType(unsigned_ext), exeBinI(opDiv), cont),

    0x0D: executor(decodeRType, exeBinR(opMod), cont),
    0x0E: executor(decodeIType(signed_ext), exeBinI(opMod), cont),
    0x0F: executor(decodeIType(unsigned_ext), exeBinI(opMod), cont),

    0x10: executor(decodeRType, exeBinR(opShl), cont),
    0x11: executor(decodeIType(unsigned_ext), exeBinI(opShl), cont),

    0x12: executor(decodeRType, exeBinR(opSlr), cont),
    0x13: executor(decodeIType(unsigned_ext), exeBinI(opSlr), cont),

    0x14: executor(decodeRType, exeBinR(opSar), cont),
    0x15: executor(decodeIType(unsigned_ext), exeBinI(opSar), cont),

    0x16: executor(decodeRType, exeBinR(function (a, b) {
      return a & b;
    }), cont);
    0x17: executor(decodeRType, exeBinR(opOr), cont);
    0x42: executor(decodeIType(unsigned_ext), exeBinI(opOr), cont);
    0x18: executor(decodeRType, exeBinR(function (a, b) {
      return a ^ b;
    }), cont),
    0x19: executor(decodeRType, exeBinR(function (a, b) {
      return ~a;
    }), cont),
    0x1A: executor(decodeRType, exeLogicR(function (a, b) {
      return a == b;
    }), cont),
    0x1B: executor(decodeRType, exeLogicR(function (a, b) {
      return a != b;
    }), cont),
    0x1C: executor(decodeRType, exeLogicR(function (a, b) {
      return a < b;
    }), cont),
    0x1D: executor(decodeRType, exeLogicR(unsignedLT), cont),
    0x1E: executor(decodeRType, exeLogicR(function (a, b) {
      return a > b;
    }), cont),
    0x1F: executor(decodeRType, exeLogicR(function (a, b) {
      return a != b && !unsignedLT(a, b);
    }), cont),
    0x20: executor(decodeRType, exeLogicR(function (a, b) {
      return a <= b;
    }), cont),
    0x21: executor(decodeRType, exeLogicR(function (a, b) {
      return a == b || unsignedLT(a, b);
    }), cont),
    0x22: executor(decodeRType, exeLogicR(function (a, b) {
      return a >= b;
    }), cont),
    0x23: executor(decodeRType, exeLogicR(function (a, b) {
      return !unsignedLT(a, b);
    }), cont),

    0x24: executor(decodeIType(offset_ext), exeBranch(function (a, b) {
      return true;
    }), jmp),
    0x25: executor(decodeIType(offset_ext), exeBranch(function (a, b) {
      return a == b;
    }), jmp),
    0x26: executor(decodeIType(offset_ext), exeBranch(function (a, b) {
      return a != b;
    }), jmp),
    0x27: executor(decodeIType(offset_ext), exeBranch(function (a, b) {
      return a < b;
    }), jmp),
    0x28: executor(decodeIType(offset_ext), exeBranch(function (a, b) {
      return a > b;
    }), jmp),

    0x29: executor(function (ins) {
      return {
        'code': ins >> 24,
        'imm': unsigned_ext(ins << 8)
      };
    }, function (args) {
      return (PC & 0xFC000000) + args['imm'] << 2;
    }, jmp),
    0x2A: executor(decodeRType, function (args) {
      return regs[args['ra']];
    }, jmp),
    0x2B: executor(decodeRType, function (args) {
      var data = loadWord(PC + 4);
      regs[SP] -= 4;
      storeWord(regs[SP], data);
      return args['ra'];
    }, jmp),
    0x2C: executor(decodeRType, function (args) {
      var data = loadWord(regs[SP]);
      regs[SP] += 4;
      return data;
    }, jmp),

    0x2D: executor(decodeIType(signed_ext), exeLoad(loadWord), cont),
    0x2E: executor(decodeIType(signed_ext), exeLoad(loadHalf), cont),
    0x2F: executor(decodeIType(signed_ext), exeLoad(loadByte), cont),

    0x31: executor(decodeIType(signed_ext), function (args) {
      regs[args['ra']] = args['imm'];
    }, cont),
    0x32: executor(decodeIType(unsigned_ext), function (args) {
      regs[args['ra']] = args['imm'];
    }, cont),
    0x33: executor(decodeIType(unsigned_ext), function (args) {
      regs[args['ra']] = args['imm'] << 16;
    }, cont),

    0x34: executor(decodeIType(signed_ext), exeStore(storeWord), cont),
    0x35: executor(decodeIType(signed_ext), exeStore(storeHalf), cont),
    0x36: executor(decodeIType(signed_ext), exeStore(storeByte), cont),

    0xFF: function () {
      console.log('HALT');
    }
  },

  runInstruction = function (ins) {
    var opcode = ins >>> 24;
    (insTable[opcode])(ins);
  }
  ;

// demo
// runInstruction(0x31100007); // LI 1, 7
// console.log(regs);
// runInstruction(0x31200008); // LI 2, 8
// console.log(regs);
// runInstruction(0x01312000); // ADD 3, 1, 2
// console.log(regs);

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
  var instructions = text.data;
  var total = instructions.length / 4;
  for (var i = 0; i < total; i++) {
    var ins = instructions.readUInt32LE(i * 4);
    console.log(ins.toString(16));
    runInstruction(ins);
  }
});

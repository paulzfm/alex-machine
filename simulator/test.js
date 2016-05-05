var cpu = require('./alex-cpu');
var assert = require('chai').assert;

var checkArithR = function (op, ra, rb, rc) {
  return function () {
    cpu.setRegisters({
      2: rb,
      3: rc
    });
    cpu.runInstruction((op << 24) | 0x123000);
    var results = cpu.getRegisters([1]);
    assert.equal(results[1], ra);
  };
};

var checkArithI = function (op, ra, rb, imm) {
  return function () {
    cpu.setRegisters({
      2: rb
    });
    cpu.runInstruction((op << 24) | 0x120000 | imm);
    var results = cpu.getRegisters([1]);
    assert.equal(results[1], ra);
  };
};

var checkBranch = function (op, ra, rb, jump) {
  return function () {
    cpu.setRegisters({
      1: ra,
      2: rb
    });
    var oldPC = cpu.getPC();
    cpu.runInstruction((op << 24) | 0x12FFFF);
    var expectedPC = oldPC + (jump ? -4 : 4);
    assert.equal(cpu.getPC(), expectedPC);
  };
};

var checkJump = function (op, ra, check) {
  return function () {
    cpu.setRegisters({
      1: ra
    });
    cpu.runInstruction((op << 24) | 0x100000);
    check(cpu.getPC());
  };
};

var checkLoadStore = function (opS, opL, data, bytes) {
  return function () {
    cpu.setRegisters({
      1: data,
      2: 0xFF
    });
    cpu.runInstruction((opS << 24) | 0x120000); // STORE 1, 0(2)
    cpu.runInstruction((opL << 24) | 0x320000); // LOAD 3, 0(2)
    var lower = 0xFF;
    for (var i = 1; i < bytes; i++) {
      lower |= (lower << 8);
    }
    assert.equal(cpu.getRegister(3), cpu.getRegister(1) & lower);
  };
};

var checkLoadImm = function (op, ra, imm) {
  return function () {
    cpu.runInstruction((op << 24) | 0x100000 | imm);
    assert.equal(ra, cpu.getRegister(1));
  };
};

var SP = 12;

var checkPushPop = function (opS, opP, data) {
  return function () {
    cpu.setRegisters({
      1: data
    });
    var oldSP = cpu.getRegister(SP);
    cpu.runInstruction((opS << 24) | 0x100000); // PUSH 1
    cpu.runInstruction((opP << 24) | 0x200000); // POP 2
    assert.equal(cpu.getRegister(2), cpu.getRegister(1));
    assert.equal(cpu.getRegister(SP), oldSP);
  };
};

cpu.resetStatus();

describe('Alex CPU', function() {
  describe('Arithmetic', function () {
    it('check ADD', checkArithR(0x01, -1, 1, -2));
    it('check ADDI', checkArithI(0x02, 1, 2, 0xFFFF));
    it('check ADDIU', checkArithI(0x03, 0x10001, 2, 0xFFFF));

    it('check SUB', checkArithR(0x04, 3, 1, -2));
    it('check SUBI', checkArithI(0x05, 3, 2, 0xFFFF));
    it('check SUBIU', checkArithI(0x06, -65533, 2, 0xFFFF));

    it('check MUL', checkArithR(0x07, -2, 1, -2));
    it('check MULI', checkArithI(0x08, -2, 2, 0xFFFF));
    it('check MULIU', checkArithI(0x09, 131070, 2, 0xFFFF));

    it('check DIV', checkArithR(0x0A, -1, 1, -2));
    it('check DIVI', checkArithI(0x0B, -2, 2, 0xFFFF));
    it('check DIVIU', checkArithI(0x0C, 0, 2, 0xFFFF));
    it('check DIVU', checkArithR(0x43, 2147483647, -1, 2));

    it('check MOD', checkArithR(0x0D, 1, 5, 2));
    it('check MODI', checkArithI(0x0E, 0, 2, 0xFFFF));
    it('check MODIU', checkArithI(0x0F, 2, 2, 0xFFFF));
    it('check MODU', checkArithR(0x44, 0, -1, 3));

    it('check SHL', checkArithR(0x10, -16777216, 0xFF00, 16));
    it('check SHLI', checkArithI(0x11, -16777216, 0xFF00, 16));
    it('check SLR', checkArithR(0x12, 0xFFFFFF, -1, 8));
    it('check SLRI', checkArithI(0x13, 0xFFFFFF, -1, 8));
    it('check SAR', checkArithR(0x14, -1, -1, 8));
    it('check SARI', checkArithI(0x15, -1, -1, 8));

    it('check AND', checkArithR(0x16, 0xFFF, 0xFFFF, 0xFFF));
    it('check OR', checkArithR(0x17, 0xFFFFF, 0xF0FFF, 0xFF00));
    it('check ORI', checkArithI(0x42, -1, -65536, 0xFFFF));
    it('check XOR', checkArithR(0x18, 0xFF00, 0xF0F0, 0x0FF0));
    it('check NOT', checkArithR(0x19, -1, 0, 0));

    it('check EQ', checkArithR(0x1A, 1, -1, -1));
    it('check NE', checkArithR(0x1B, 0, -1, -1));
    it('check LT', checkArithR(0x1C, 1, -1, 1));
    it('check LTU', checkArithR(0x1D, 0, -1, 1));
    it('check GT', checkArithR(0x1E, 0, -1, 1));
    it('check GTU', checkArithR(0x1F, 1, -1, 1));
    it('check LE', checkArithR(0x20, 1, -1, 1));
    it('check LEU', checkArithR(0x21, 0, -1, 1));
    it('check GE', checkArithR(0x22, 0, -1, 1));
    it('check GEU', checkArithR(0x23, 1, -1, 1));
  });

  describe('Branch', function () {
    it('check B', checkBranch(0x24, 0, 0, true));
    it('check BEQ jump', checkBranch(0x25, 1, 1, true));
    it('check BEQ not jump', checkBranch(0x25, 1, 0, false));
    it('check BNE jump', checkBranch(0x26, 1, 0, true));
    it('check BNE not jump', checkBranch(0x26, 1, 1, false));
    it('check BLT jump', checkBranch(0x27, 0, 1, true));
    it('check BLT not jump', checkBranch(0x27, 0, 0, false));
    it('check BGT jump', checkBranch(0x28, 1, 0, true));
    it('check BGT not jump', checkBranch(0x28, 0, 0, false));
  });

  describe('Jump', function () {
    it('check JR', checkJump(0x2A, -1, function (pc) {
        assert.equal(pc, 0xFFFFFFFF);
    }));
    it('check CALL', checkJump(0x2B, -1, function (pc) {
      assert.equal(pc, 0xFFFFFFFF);
    }));
    it('check CALL and RET', function () {
      cpu.setRegisters({
        1: 0xF
      });
      var oldPC = cpu.getPC();
      cpu.runInstruction(0x2B100000); // CALL 1, store oldPC + 4
      assert.equal(cpu.getPC(), 0xF);
      cpu.runInstruction(0x2C000000); // RET, load oldPC + 4
      assert.equal(cpu.getPC() << 0, (oldPC + 4) << 0);
    });
  });

  describe('Load/Store', function () {
    it('check LW and SW', checkLoadStore(0x34, 0x2D, -1, 4));
    it('check LH and SH', checkLoadStore(0x35, 0x2E, -2, 2));
    it('check LB and SB', checkLoadStore(0x36, 0x2F, -3, 1));
  });

  describe('Load Imm', function () {
    it('check LI', checkLoadImm(0x31, -1, 0xFFFF));
    it('check LIU', checkLoadImm(0x32, 0xFFFF, 0xFFFF));
    it('check LIH', checkLoadImm(0x33, -1, 0xFFFF));
    it('check R0 is read-only', function () {
      cpu.runInstruction(0x3100FFFF); // LI 0, 0xFFFF
      assert.equal(0, cpu.getRegister(0));
    });
  });

  describe('Stack', function () {
    it('check PSHW and POPW', checkPushPop(0x3D, 0x38, 0xF));
    it('check PSHH and POPH', checkPushPop(0x3E, 0x39, 0xF));
    it('check PSHB and POPB', checkPushPop(0x3F, 0x3A, 0xF));
    it('check PSHA and POPA', checkPushPop(0x41, 0x3C, 0xF));
  });
});

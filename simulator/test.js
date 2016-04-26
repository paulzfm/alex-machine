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

    it('check MOD', checkArithR(0x0D, 1, 5, 2));
    it('check MODI', checkArithI(0x0E, 0, 2, 0xFFFF));
    it('check MODIU', checkArithI(0x0F, 2, 2, 0xFFFF));

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
});

var m = {};

// (Number -> Number -> Number) -> Function
var int32 = function (op) {
  // Buffer -> Buffer -> Buffer
  return function (a, b) {
    var num1 = a.readInt32LE(0, 4);
    var num2 = b.readInt32LE(0, 4);
    var num3 = op(num1, num2);
    var c = new Buffer(4);
    c.writeInt32LE(num3, 0, 4);
    return c;
  };
};

// (Number -> Number -> Number) -> Function
var uint32 = function (op) {
  // Buffer -> Buffer -> Buffer
  return function (a, b) {
    var num1 = a.readUInt32LE(0, 4);
    var num2 = b.readUInt32LE(0, 4);
    var num3 = op(num1, num2);
    var c = new Buffer(4);
    c.writeUInt32LE(num3, 0, 4);
    return c;
  };
};

// Number -> Buffer
m.ext32 = function (imm) {
  var a = new Buffer(2);
  a.writeUInt16LE(imm, 0, 2);
  var b = new Buffer(4);
  b.writeInt32LE(a.readInt16LE(0, 2), 0, 4);
  return b;
};

m.uext32 = function (imm) {
  var buf = new Buffer(4);
  buf.writeUInt32LE(imm, 0, 4);
  return buf;
};

m.oext32 = function (imm) {
  var a = m.ext32(imm);
  var b = a.readInt32LE(0, 4);
  a.writeInt32LE(b << 2, 0, 4);
  return a;
};

m.add32 = int32(function (a, b) {
  return (a + b) << 0;
});

m.sub32 = int32(function (a, b) {
  return (a - b) << 0;
});

m.mul32 = int32(function (a, b) {
  return (a * b) << 0;
});

m.div32 = int32(function (a, b) {
  return (Math.floor(a / b)) << 0;
});

m.mod32 = int32(function (a, b) {
  return (a % b) << 0;
});

m.and32 = int32(function (a, b) {
  return a & b;
});

m.or32 = int32(function (a, b) {
  return a | b;
});

m.not32 = int32(function (a) {
  return ~a;
});

m.xor32 = int32(function (a, b) {
  return a ^ b;
});

m.shl32 = int32(function (a, b) {
  return a << b;
});

m.sar32 = int32(function (a, b) {
  return a >> b;
});

m.slr32 = int32(function (a, b) {
  return a >>> b;
});

m.eq32 = int32(function (a, b) {
  return (a == b) ? 1 : 0;
});

m.ne32 = int32(function (a, b) {
  return (a != b) ? 1 : 0;
});

m.lt32 = int32(function (a, b) {
  return (a < b) ? 1 : 0;
});

m.ltu32 = uint32(function (a, b) {
  return (a < b) ? 1 : 0;
});

m.le32 = int32(function (a, b) {
  return (a <= b) ? 1 : 0;
});

m.leu32 = uint32(function (a, b) {
  return (a <= b) ? 1 : 0;
});

m.gt32 = int32(function (a, b) {
  return (a > b) ? 1 : 0;
});

m.gtu32 = uint32(function (a, b) {
  return (a > b) ? 1 : 0;
});

m.ge32 = int32(function (a, b) {
  return (a >= b) ? 1 : 0;
});

m.geu32 = uint32(function (a, b) {
  return (a >= b) ? 1 : 0;
});

// Number -> Number -> Function
var load = function (size, bytes) {
  // Number -> Object -> Buffer
  return function (addr, mem) {
    var buf = new Buffer(size);
    for (var i = 0; i < bytes; i++) {
      buf[i] = mem[addr + i][0];
    }
    return buf;
  };
};

m.loadWord = load(4, 4);
m.loadHalf = load(4, 2);
m.loadByte = load(4, 1);
m.loadFloat = load(8, 8);

// Number -> Function
var store = function (bytes) {
  // Number -> Buffer -> Object
  return function (addr, data, mem) {
    for (var i = 0; i < bytes; i++) {
      mem[addr + i][0] = data[i];
    }
  };
};

m.storeWord = store(4);
m.storeHalf = store(2);
m.storeByte = store(1);
m.storeFloat = store(8);

m.loadInt32 = function (val) {
  var buf = new Buffer(4);
  buf.writeInt32LE(val, 0, 4);
  return buf;
};

m.loadUInt32 = function (val) {
  var buf = new Buffer(4);
  buf.writeUInt32LE(val, 0, 4);
  return buf;
};

module.exports = m;

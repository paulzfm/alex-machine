# Instruction Set

## Registers

### Indexed Registers

| Name | Usage | Index |
| :---:| :-----| :----:|
| R0 | always be zero | 0000 |
| T0~T4 | general purpose (caller saved) | 0001 ~ 0101 |
| S0~S4 | general purpose (callee saved) | 0110 ~ 1010 |
| FP | frame pointer | 1011 |
| SP | stack pointer | 1100 |
| GP | global pointer | 1101 |
| AT | reserved for assembler | 1110 |
| LR | reserved for linker | 1111 |

All indexed registers have 32 bits. In the following instruction set, we use ra, rb and rc to represent these registers.

### Floating-point Registers

F0~F15. All floating-point registers have 64 bits, i.e, they are represented in type `double`. All `float` values will be represented in type `double`.  In the following instruction set, we use fa, fb and fc to represent these registers.

### Other Registers

...

## Axioms

- Memory must be accessed by **byte**, following **little** endian.
- Stack is 8-byte-aligned, and a 4-byte value is located at the lower four bytes.

## Instruction Format

### R-type (all operands are registers)

```
+----------+--------+--------+--------+-------+
|  31..24  | 23..20 | 19..16 | 15..12 | 11..0 |
+----------+--------+--------+--------+-------+
|  op_code |   ra   |   rb   |   rc   |  any  |
+----------+--------+--------+--------+-------+
```

### I-type (the last operand is immediate number)

```
+----------+--------+--------+-----------------+
|  31..24  | 23..20 | 19..16 |      15..0      |
+----------+--------+--------+-----------------+
|  op_code |   ra   |   rb   |       imm       |
+----------+--------+--------+-----------------+
```

## Notations

### Data Types

| Notation | Type |
| :------- | :--- |
| int32 | 32-bit signed integer |
| uint32 | 32-bit unsigned integer |
| float | 64-bit double floating-point number |
| int16 | 16-bit signed integer |
| bool | either true or false |
| bv | bit vector |

### Predefined Variables

| Notation | Type |
| :------- | :--- |
| ra, rb, rc or named registers | word |
| fa, fb, fc | float |
| imm | int16 |

### Assignment Operator

We use `r := e` to represent that the value of expression e is assigned to register r. Any register appears at the right hand side means the value of the register.

### Predefined Operators

| Notation | Infix? | Type Signature | Meaning |
| :------: | :----: | :------------- | ------- |
| + | Yes | int32 -> int32 -> int32 | add |
| - | Yes | int32 -> int32 -> int32 | subtract |
| * | Yes | int32 -> int32 -> int32 | multiply |
| / | Yes | int32 -> int32 -> int32 | divide |
| u/ | Yes | uint32 -> uint32 -> uint32 | divide for unsigned integers |
| % | Yes | int32 -> int32 -> int32 | mod |
| u% | Yes | uint32 -> uint32 -> uint32 | mod for unsigned integers |
| << | Yes | uint32 -> uint32 -> uint32 | shift left |
| >>> | Yes | uint32 -> uint32 -> uint32 | shift logically right |
| >> | Yes | int32 -> uint32 -> int32 | shift arithmetic right |
| and | Yes | uint32 -> uint32 -> uint32 | bitwise logical and |
| or | Yes | uint32 -> uint32 -> uint32 | bitwise logical or |
| xor | Yes | uint32 -> uint32 -> uint32 | bitwise logical xor |
| not | No | uint32 -> uint32 | bitwise logical not |
| = | Yes | int32 -> int32 -> bool | equal |
| != | Yes | int32 -> int32 -> bool | not equal |
| < | Yes | int32 -> int32 -> bool | less than |
| u< | Yes | int32 -> int32 -> bool | less than for unsigned integers |
| <= | Yes | int32 -> int32 -> bool | less than or equal |
| u<= | Yes | int32 -> int32 -> bool | less than or equal for unsigned integers |
| > | Yes | int32 -> int32 -> bool | greater than |
| u> | Yes | int32 -> int32 -> bool | greater than for unsigned integers |
| >= | Yes | int32 -> int32 -> bool | greater than or equal |
| u>= | Yes | int32 -> int32 -> bool | greater than or equal for unsigned integers |
| if _c_ then _t_ else _f_ | No | bool * a * a -> a | if _c_ is true, then the value is _t_, otherwise the value is _f_ |
| signed_ext(_x_) | No | int16 -> int32 | signed extend 16-bit immediate integer _x_ |
| unsigned_ext(_x_) | No | int16 -> uint32 | unsigned extend 16-bit immediate integer _x_ |
| offset(_x_) | No | int16 -> int32 | offset extend 16-bit immediate integer _x_, say offset(_x_) = signed_ext(_x_) << 2 |
| ++ | Yes | bv -> bv -> bv | concatenate bit vectors |
| _r_(_h_.._l_) | No | uint32 * uint32 -> bv | take bits indexed with range _l_ to _h_ from register _r_ |
| load(_addr_, _b_) | No | uint32 * uint32 -> uint32 | read _b_ bytes from memory starting at address _addr_, treat these _b_ bytes as the **lowest** _b_ bytes and remain the highest (4 - _b_) bytes **zero** |
| loadf(_addr_) | No | uint32 -> float | read 8 bytes as a float from memory starting at address _addr_ |
| store(_addr_, _b_, _data_) | No | uint32 * uint32 * uint32 -> () | write the **lowest** _b_ bytes of _data_ into memory starting at address _addr_ |
| storef(_addr_, _data_) | No | uint32 * float -> () | write the 8-byte _data_ into memory starting at address _addr_ |
| tofloat(_x_) | No | int32 -> float | convert a signed integer _x_ into float |
| utofloat(_x_) | No | uint32 -> float | convert an unsigned integer _x_ into float |
| toint(_x_) | No | float -> int32 | convert a float range from -2147483648 to 2147483647 into signed integer |
| .+ | Yes | float -> float -> float | add |
| .- | Yes | float -> float -> float | subtract |
| .* | Yes | float -> float -> float | multiply |
| ./ | Yes | float -> float -> float | divide |
| .% | Yes | float -> float -> float | mod |
| .= | Yes | float -> float -> bool | equal |
| .!= | Yes | float -> float -> bool | not equal |
| .< | Yes | float -> float -> bool | less than |
| .<= | Yes | float -> float -> bool | less than or equal |
| .> | Yes | float -> float -> bool | greater than |
| .>= | Yes | float -> float -> bool | greater than or equal |
| floor(_x_) | No | float -> float | the maximum integer value less or equal than _x_ |
| ceil(_x_) | No | float -> float | the minimal integer value greater or equal than _x_ |

## Instructions

### Instruction Control

| Name | Machine Code | Meaning |
| :----- | :----------- | :-------- |
| NOP | all zero | do nothing |

### Arithmetic/Logic

| Name | Machine Code | Meaning |
| :--- | :----------- | :------ |
| ADD  | 01 ra rb rc | ra := rb + rc |
| ADDI | 02 ra rb imm| ra := rb + signed_ext(imm) |
| ADDIU| 03 ra rb imm| ra := rb + unsigned_ext(imm) |
| SUB  | 04 ra rb rc | ra := rb - rc |
| SUBI | 05 ra rb imm| ra := rb - signed_ext(imm) |
| SUBIU| 06 ra rb imm | ra := rb - unsigned_ext(imm) |
| MUL  | 07 ra rb rc | ra := rb * rc |
| MULI | 08 ra rb imm| ra := rb * signed_ext(imm) |
| MULIU| 09 ra rb imm| ra := rb * unsigned_ext(imm) |
| DIV  | 0A ra rb rc | ra := rb / rc |
| DIVI | 0B ra rb imm| ra := rb / signed_ext(imm) |
| DIVIU| 0C ra rb imm| ra := rb / unsigned_ext(imm) |
| DIVU | 43 ra rb rc | ra := rb u/ rc |
| MOD  | 0D ra rb rc | ra := rb % rc |
| MODI | 0E ra rb imm| ra := rb % signed_ext(imm) |
| MODIU| 0F ra rb imm| ra := rb % unsigned_ext(imm) |
| MODU | 44 ra rb rc | ra := rb u% rc |
| SHL  | 10 ra rb rc | ra := rb << rc |
| SHLI | 11 ra rb imm| ra := rb << imm |
| SLR  | 12 ra rb rc | ra := rb >>> rc |
| SLRI | 13 ra rb imm| ra := rb >>> imm |
| SAR  | 14 ra rb rc | ra := rb >> rc |
| SARI | 15 ra rb imm| ra := rb >> imm |
| AND  | 16 ra rb rc | ra := rb and rc |
| OR   | 17 ra rb rc | ra := rb or rc |
| ORI  | 42 ra rb imm| ra := rb or unsigned_ext(imm) |
| XOR  | 18 ra rb rc | ra := rb xor rc |
| NOT  | 19 ra rb ...| ra := not(rb) |
| EQ   | 1A ra rb rc | ra := if rb = rc then 1 else 0 |
| NE   | 1B ra rb rc | ra := if rb != rc then 1 else 0 |
| LT   | 1C ra rb rc | ra := if rb < rc then 1 else 0 |
| LTU  | 1D ra rb rc | ra := if rb u< rc then 1 else 0 |
| GT   | 1E ra rb rc | ra := if rb > rc then 1 else 0 |
| GTU  | 1F ra rb rc | ra := if rb u> rc then 1 else 0 |
| LE   | 20 ra rb rc | ra := if rb <= rc then 1 else 0 |
| LEU  | 21 ra rb rc | ra := if rb u<= rc then 1 else 0 |
| GE   | 22 ra rb rc | ra := if rb >= rc then 1 else 0 |
| GEU  | 23 ra rb rc | ra := if rb u>= rc then 1 else 0 |

### Branch/Jump

| Name | Machine Code | Meaning |
| :--- | :----------- | :------ |
| B    | 24 ... ... imm | PC := PC + offset(imm) |
| BE   | 25 ra rb imm   | if ra = rb then PC := PC + offset(imm) |
| BNE  | 26 ra rb imm   | if ra != rb then PC := PC + offset(imm) |
| BNEZ | 26 ra R0 imm   | if ra != 0 then PC := PC + offset(imm) |
| BLT  | 27 ra rb imm   | if ra < rb then PC := PC + offset(imm) |
| BGT  | 28 ra rb imm   | if ra > rb then PC := PC + offset(imm) |
| J    | 29 imm(24 bits)| PC := PC(31..26) ++ imm ++ 00 |
| JR   | 2A ra ... ...  | PC := ra |
| CALL | 2B ra ... ...  | SP := SP - 4, store(SP, 4, PC + 4), PC := ra |
| RET  | 2C ... ... ... | x := load(SP, 4), SP := SP + 4, PC := x |

### Load/Store

| Name | Machine Code | Meaning |
| :--- | :----------- | :-------- |
| LW  | 2D ra rb imm | ra := load(rb + signed_ext(imm), 4) |
| LH  | 2E ra rb imm | ra := load(rb + signed_ext(imm), 2) |
| LB  | 2F ra rb imm | ra := load(rb + signed_ext(imm), 1) |
| LF  | 30 fa ra imm | fa := loadf(ra + signed_ext(imm)) |
| LI  | 31 ra ... imm| ra := signed_ext(imm) |
| LIU | 32 ra ... imm| ra := unsigned_ext(imm) |
| LIH | 33 ra ... imm| ra := ra or (unsigned_ext(imm) << 16) |
| SW  | 34 ra rb imm | store(rb + signed_ext(imm), 4, ra) |
| SH  | 35 ra rb imm | store(rb + signed_ext(imm), 2, ra) |
| SB  | 36 ra rb imm | store(rb + signed_ext(imm), 1, ra) |
| SF  | 37 ra fa imm | storef(ra + signed_ext(imm), fa) |

### Stack

| Name | Machine Code | Meaning |
| :--- | :----------- | :-------- |
| POPW | 38 ra ... ... | ra := load(SP, 4), SP := SP + 4 |
| POPH | 39 ra ... ... | ra := load(SP, 2), SP := SP + 2 |
| POPB | 3A ra ... ... | ra := load(SP, 1), SP := SP + 1 |
| POPF | 3B fa ... ... | fa := loadf(SP), SP := SP + 8 |
| POPA | 3C ra ... ... | ra := load(SP, 4), SP := SP + 8 |
| PSHW | 3D ra ... ... | SP := SP - 4, store(SP, 4, ra) |
| PSHH | 3E ra ... ... | SP := SP - 2, store(SP, 2, ra) |
| PSHB | 3F ra ... ... | SP := SP - 1, store(SP, 1, ra) |
| PSHF | 40 fa ... ... | SP := SP - 8, storef(SP, fa) |
| PSHA | 41 ra ... ... | SP := SP - 8, store(SP, 4, ra) |

### Conversion

| Name | Machine Code | Meaning |
| :--- | :----------- | :------ |
| CIF | 45 fa rb ... ... | fa := tofloat(rb) |
| CUF | 46 fa rb ... ... | fa := utofloat(rb) |
| CFI | 47 ra fb ... ... | ra := toint(floor(fb)) |

### Floating-point

| Name | Machine Code | Meaning |
| :----- | :----------- | :-------- |
| ADDF | 48 fa fb fc ... | fa := fb .+ fc |
| SUBF | 49 fa fb fc ... | fa := fb .- fc |
| MULF | 4A fa fb fc ... | fa := fb .* fc |
| DIVF | 4B fa fb fc ... | fa := fb ./ fc |
| MODF | 4C fa fb fc ... | fa := fb .% fc |
| EQF  | 4D ra fb fc ... | ra := if fb .= fc then 1 else 0 |
| NEF  | 4E ra fb fc ... | ra := if fb .!= fc then 1 else 0 |
| LTF  | 4F ra fb fc ... | ra := fb .< fc |
| GTF  | 50 ra fb fc ... | ra := fb .> fc |
| LEF  | 51 ra fb fc ... | ra := fb .<= fc |
| GTF  | 52 ra fb fc ... | ra := fb .>= fc |
| FLOR | 53 fa fb ... ... | fa := floor(fb) |
| CEIL | 54 fa fb ... ... | fa := ceil(fb) |

### System

| Name | Machine Code | Meaning |
| :----- | :----------- | :-------- |
| BIN  | 80 ra rb ... ... | rb := getchar(ra) |
| BOUT | 81 ra rb ... ... | putchar(ra, rb) |
| IDLE | 1111111 000 ... ... ... | response hardware interrupt (include timer) |
| CLI  | 1111111 001 001 rc ... | clear interrupt (rc := IENA, IENA := 0) |
| STI  | 1111111 001 010 ... ... | set interrupt (IENA := 1) |
| LUSP | 1111111 010 001 rc ... | rc := USP |
| SUSP | 1111111 010 010 rc ... | USP := rc |
| IRET | 1111111 011 ... ... ... | return from interrupt |
| TRAP | 1111111 110 ... ... ... | trap |
| STIV | 1111111 111 000 rc ... | IVEC := rc |
| STPD | 1111111 111 001 rc ... | PDIR := rc |
| STPG | 1111111 111 010 rc ... | PG := rc |
| STTO | 1111111 111 011 rc ... | TO := rc |
| LVAD | 1111111 111 100 rc ... | rc := VADR |
| HALT | 1111111 111 111 111 1111111111111111 | halt system |

### Memory

Notice that here we change the instruction format as

```
+--------------+--------+--------+--------+--------+------+
|    31..22    | 21..19 | 18..16 | 15..13 | 12..10 | 9..0 |
+--------------+--------+--------+--------+--------+------+
|  1111111 101 | op_code|   ra   |   rb   |   rc   |      |
+--------------+--------+--------+--------+--------+------+
```

| Name | Machine Code | Meaning |
| :----- | :----------- | :-------- |
| LMSZ | 1111111 101 001 ra ... | ra := MEMSZ |
| MCPY | 1111111 101 010 ra rb rc ... | memcpy(ra, rb, rc) |
| MCMP | 1111111 101 011 ra rb rc ... | memcmp(ra, rb, rc) |
| MCHR | 1111111 101 100 ra rb rc ... | memchr(ra, rb, rc) |
| MSET | 1111111 101 101 ra rb rc ... | memset(ra, rb, rc) |

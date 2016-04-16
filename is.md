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

## Instructions

### Notations
<!-- TODO: update -->

| Notation | Meaning |
| :------- | :-------- |
| \_ := \_ | assign value of the right operand to the left operand (a register or a memory space) |
| \_ + \_ | add signed integers |
| unsigned(\_) + unsigned(\_) | add unsigned integers |
| \_ - \_ | subtract signed integers |
| \_ * \_ | multiply signed integers |
| unsigned(\_) * unsigned(\_) | multiply unsigned integers |
| \_ / \_ | divide signed integers |
| unsigned(\_) / unsigned(\_) | divide unsigned integers |
| \_ % \_ | mod signed integers |
| unsigned(\_) % unsigned(\_) | mod unsigned integers |
| \_ and \_ | bitwise and unsigned integers |
| \_ or \_ | bitwise or unsigned integers |
| \_ xor \_ | bitwise xor unsigned integers |
| not \_ | bitwise negate unsigned integer |
| unsigned(\_) << unsigned(\_) | shift left unsigned integer, the second operand must be in range [0, 32] |
| unsigned(\_) << unsigned(\_) | logically shift right unsigned integer, the second operand must be in range [0, 32] |
| \_ >> \_ | arithmetically shift right signed integer, the second operand must be in range [0, 32] |
| \_ = \_ | whether two integers are equal |
| \_ != \_ | whether two integers are not equal |
| \_ < \_ | whether the first signed integer is less than the second signed integer |
| unsigned(\_) < unsigned(\_) | whether the first unsigned integer is less than the second unsigned integer |
| \_ > \_ | whether the first signed integer is greater than the second signed integer |
| unsigned(\_) > unsigned(\_) | whether the first unsigned integer is greater than the second unsigned integer |
| \_ <= \_ | whether the first signed integer is less or equal than the second signed integer |
| unsigned(\_) <= unsigned(\_) | whether the first unsigned integer is less or equal than the second unsigned integer |
| \_ >= \_ | whether the first signed integer is greater or equal than the second signed integer |
| unsigned(\_) >= unsigned(\_) | whether the first unsigned integer is greater or equal than the second unsigned integer |
| \_ .+ \_ | add floating-point numbers |
| \_ .- \_ | subtract floating-point numbers |
| \_ .* \_ | multiply floating-point numbers |
| \_ ./ \_ | divide floating-point numbers |
| \_ .= \_ | whether two floating-point numbers are equal |
| \_ .!= \_ | whether two floating-point numbers are not equal |
| \_ .< \_ | whether the first floating-point numbers is less than the second floating-point numbers |
| \_ .> \_ | whether the first floating-point numbers is greater than the second floating-point numbers |
| \_ .<= \_ | whether the first floating-point numbers is less or equal than the second floating-point numbers |
| \_ .>= \_ | whether the first floating-point numbers is greater or equal than the second floating-point numbers |
| \_ .% \_ | mod floating-point numbers |
| float(\_) | convert signed integer into floating-point number |
| float(unsigned(\_)) | convert unsigned integer into floating-point number |
| signed(\_) | convert floating-point number into signed number |
| word(\_) | 32 bits from the starting memory address |
| half(\_) | 16 bits from the starting memory address |
| byte(\_) | 8 bits from the starting memory address |
| offset(\_) | shift left the immediate integer and then do signed extension |
|

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
| MOD  | 0D ra rb rc | ra := rb % rc |
| MODI | 0E ra rb imm| ra := rb % signed_ext(imm) |
| MODIU| 0F ra rb imm| ra := rb % unsigned_ext(imm) |
| SHL  | 10 ra rb rc | ra := unsigned(rb) << unsigned(rc) |
| SHLI | 11 ra rb imm| ra := unsigned(rb) << unsigned(imm) |
| SLR  | 12 ra rb rc | ra := unsigned(rb) >> unsigned(rc) |
| SLRI | 13 ra rb imm| ra := unsigned(rb) >> unsigned(imm) |
| SAR  | 14 ra rb rc | ra := rb >> rc |
| SARI | 15 ra rb imm| ra := rb >> imm |
| AND  | 16 ra rb rc | ra := rb and rc |
| OR   | 17 ra rb rc | ra := rb or rc |
| XOR  | 18 ra rb rc | ra := rb xor rc |
| NOT  | 19 ra rb ...| ra := not rb |
| EQ   | 1A ra rb rc | ra := if rb = rc then 1 else 0 |
| NE   | 1B ra rb rc | ra := if rb != rc then 1 else 0 |
| LT   | 1C ra rb rc | ra := if rb < rc then 1 else 0 |
| LTU  | 1D ra rb rc | ra := if unsigned(rb) < unsigned(rc) then 1 else 0 |
| GT   | 1E ra rb rc | ra := if rb > rc then 1 else 0 |
| GTU  | 1F ra rb rc | ra := if unsigned(rb) > unsigned(rc) then 1 else 0 |
| LE   | 20 ra rb rc | ra := if rb <= rc then 1 else 0 |
| LEU  | 21 ra rb rc | ra := if unsigned(rb) <= unsigned(rc) then 1 else 0 |
| GE   | 22 ra rb rc | ra := if rb >= rc then 1 else 0 |
| GEU  | 23 ra rb rc | ra := if unsigned(rb) >= unsigned(rc) then 1 else 0 |

### Branch/Jump

| Name | Machine Code | Meaning |
| :--- | :----------- | :------ |
| B    | 24 ... ... imm | PC := PC + offset(imm) |
| BE   | 25 ra rb imm   | if ra = rb then PC := PC + offset(imm) |
| BNE  | 26 ra rb imm   | if ra != rb then PC := PC + offset(imm) |
| BNEZ | 26 ra R0 imm   | if ra != 0 then PC := PC + offset(imm) |
| BLT  | 27 ra rb imm   | if ra < rb then PC := PC + offset(imm) |
| BGT  | 28 ra rb imm   | if ra > rb then PC := PC + offset(imm) |
| J    | 29 imm(24 bits)| PC := PC(31..28) ++ imm ++ 00 |
| JR   | 2A ra ... ...  | PC := ra |
| CALL | 2B ra ... ...  | ? PC := ra |
| RET  | 2C ... ... ... | ? |

### Load/Store

| Name | Machine Code | Meaning |
| :--- | :----------- | :-------- |
| LW  | 2D ra rb imm | ra := word(rb + imm) |
| LH  | 2E ra rb imm | ra := half(rb + imm) |
| LB  | 2F ra rb imm | ra := byte(rb + imm) |
| LF  | 30 fa ra imm | fa := long(ra + imm) |
| LI  | 31 ra ... imm| ra := imm |
| LIU | 32 ra ... imm| ra := unsigned(imm) |
| LIH | 33 ra ... imm| ra := imm << 16 |
| SW  | 34 ra rb imm | word(rb + imm) := ra |
| SH  | 35 ra rb imm | half(rb + imm) := ra(15..0) |
| SB  | 36 ra rb imm | byte(rb + imm) := ra(7..0) |
| SF  | 37 ra fa imm | long(ra + imm) := fa |

### Stack

| Name | Machine Code | Meaning |
| :--- | :----------- | :-------- |
| POPW | 38 ra ... ... ||
| POPH | 39 ra ... ... ||
| POPB | 3A ra ... ... ||
| POPF | 3B fa ... ... ||
| POPA | 3C ra ... ... ||
| PSHW | 3D ra ... ... ||
| PSHH | 3E ra ... ... ||
| PSHB | 3F ra ... ... ||
| PSHF | 40 fa ... ... ||
| PSHA | 41 ra ... ... ||

### Floating-point

| Name | Machine Code | Meaning |
| :----- | :----------- | :-------- |
| ADDF | 0110011 fa fb fc ... | fa := fb .+ fc |
| SUBF | 0110100 fa fb fc ... | fa := fb .- fc |
| MULF | 0110101 fa fb fc ... | fa := fb .* fc |
| DIVF | 0110110 fa fb fc ... | fa := fb ./ fc |
| EQF  | 0110111 fa fb fc ... | fa := if fb .= fc then 1 else 0 |
| NEF  | 0111000 fa fb fc ... | fa := if fb .!= fc then 1 else 0 |
| LTF  | 0111001 fa fb fc ... | fa := fb .< fc |
| GTF  | 0111010 fa fb fc ... | fa := fb .> fc |
| LEF  | 0111011 fa fb fc ... | fa := fb .<= fc |
| GTF  | 0111100 fa fb fc ... | fa := fb .>= fc |
| POW  | 0111101 fa fb fc ... | fa := pow(fb, fc) |
| FABS | 0111110 fa fb ... ... | fa := fabs(fb) |
| LOG  | 0111111 fa fb ... ... | fa := log(fb) |
| LOGT | 1000000 fa fb ... ... | fa := log10(fb) |
| EXP  | 1000001 fa fb ... ... | fa := exp(fb) |
| FLOR | 1000010 fa fb ... ... | fa := floor(fb) |
| CEIL | 1000011 fa fb ... ... | fa := ceil(fb) |
| SIN  | 1000100 fa fb ... ... | fa := sin(fb) |
| COS  | 1000101 fa fb ... ... | fa := cos(fb) |
| TAN  | 1000110 fa fb ... ... | fa := tan(fb) |
| ASIN | 1000111 fa fb ... ... | fa := asin(fb) |
| ACOS | 1001000 fa fb ... ... | fa := acos(fb) |
| ATAN | 1001001 fa fb ... ... | fa := arctan(fb) |
| SQRT | 1001010 fa fb ... ... | fa := sqrt(fb) |
| FMOD | 1001011 fa fb fc ... | fa := fb .% fc |

### Conversion

| Name | Machine Code | Meaning |
| :----- | :----------- | :-------- |
| CIF | 1001100 fa ra ... ... | fa := float(ra) |
| CUF | 1001101 fa ra ... ... | fa := float(unsigned(ra)) |
| CFI | 1001110 ra fa ... ... | ra := signed(fa) |
| CFU | 1001111 ra fa ... ... | ra := signed(fabs(fa)) |

### System

| Name | Machine Code | Meaning |
| :----- | :----------- | :-------- |
| IDLE | 1111111 000 ... ... ... | response hardware interrupt (include timer) |
| CLI  | 1111111 001 001 rc ... | clear interrupt (rc := IENA, IENA := 0) |
| STI  | 1111111 001 010 ... ... | set interrupt (IENA := 1) |
| LUSP | 1111111 010 001 rc ... | rc := USP |
| SUSP | 1111111 010 010 rc ... | USP := rc |
| IRET | 1111111 011 ... ... ... | return from interrupt |
| BIN  | 1111111 100 001 rc ... | rc := getchar() |
| BOUT | 1111111 100 010 rc ... | putchar(rc) |
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

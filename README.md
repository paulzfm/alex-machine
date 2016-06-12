# alex-machine

## Document

- [Introduction (in Chinese)](https://github.com/paulzfm/alex-machine/blob/master/doc/doc.pdf).
- [Manual](https://github.com/paulzfm/alex-machine/blob/master/is.md).

## 工作
-朱俸民
    - Alex 指令集设计与Spec文档
    - Alex v1 版本模拟器 (本项目)
    - Alex v2 版本模拟器，基于 JianxinMa 的[v9.js](https://github.com/JianxinMa/v9.js)，完成 Alex 模拟器的移植
    - 调试 v9.js 上的 Alex [模拟器](https://github.com/paulzfm/v9.js/blob/master/assets/js/alex.js)，通过测例[test_link.c](https://github.com/paulzfm/v9.js/blob/master/labs/alex/src/test_link.c)
    - 调试时发现编译器对于 struct 嵌套生成的代码有错，该 bug 目前已经 fix

## Test TODOs
- 初步测试
    - ~~汇编版的hello world~~
    - ~~c语言版hello world~~
    - inline asm
        - register restrictions
    - ~~function call~~
        - function pointer
        - ~~variable argument function~~
            - cprintf from ucore works fine!
    - ~~global variable~~
        - static variable
    - ~~if/while/for~~
    - sign extend load 1/8/16
    - ~~switch/case~~
    - ~~pointer operator~~
    - ~~? : operator~~
    - ~~array~~
    - ~~bit field~~
    - ~~shl~~/slr/sar
    - ~~struct param~~
    - ~~struct return~~
    - cmp assign
    - ~~logic instructions~~
    - ~~signed arithmetic~~
    - ~~unsigned arithmetic~~
    - special/system operations
        - ~~bout~~
- spec测试
- 移植ucore
    - ~~printf~~
    - 时钟中断
    - 其他中断/异常处理
    - syscall
    - paging
    - process

---
title: "Chapter 5: Is your code still... your code?"
description: "Anti-Hooking: Checking if your functions have been swapped by a hacker."
order: 5
category: "mobile"
---


So, we've built a fortress. We've checked for jailbreaks, emulators, debuggers, man-in-the-middle proxies, and we've hidden our binary. But what if the hacker is already inside the building?

In **Chapter 2**, we introduced the three main hooking weapons that hackers use to rewrite our app's brain at runtime: **Frida (JS Interceptor)**, **Fishhook (C Hook)**, and **MSHook (MobileSubstrate)**. Today, we're going to dig deep into how these hooks operate under the hood, and how we can actively defend against them.

## 1. Frida (JS Interceptor Hook)

Frida is the absolute king of dynamic instrumentation. It works by attaching to our running process, injecting its own V8 JavaScript engine, and allowing the hacker to dynamically swap our functions using APIs like `Interceptor.attach`.

### Under the Hood

Frida's inline hooking dynamically writes trampoline instructions in memory, redirecting the flow from your original function to Frida's handler, executing the custom JavaScript logic, and returning custom data back to your app.

### How to Prevent It

Because Frida is a dynamic debugger at its core, the most robust defense is to stop it from attaching or running in the first place:

* **Debugger Blockers:** Use `ptrace(PT_DENY_ATTACH, ...)` and monitor the `P_TRACED` flag via `sysctl` to terminate the app if a debugger attaches. (Refer to **Chapter 3** for the implementation).
* **Port Scanning:** Scan for Frida’s default server port `27042`.
* **Library Scanning:** Inspect the list of loaded dynamic libraries (`_dyld_get_image_name`) for any name containing `frida-agent.dylib` or `FridaGadget`.

## 2. Fishhook (C Function Hooking)

Fishhook is a powerful utility (originally open-sourced by Facebook) that allows hackers to hook C functions (like `open`, `connect`, or `strcmp`) at runtime.

### Under the Hood

In a Mach-O executable, calls to external dynamic libraries are resolved lazily using symbol tables located in the `__DATA` segment:

* `__la_symbol_ptr` (lazy symbol pointers)
* `__nl_symbol_ptr` (non-lazy symbol pointers)

When your app calls a C standard function, it jumps to a stub that retrieves the actual function address from these pointer tables. **Fishhook works by finding these tables in memory and replacing the dynamic library addresses with pointers to the hacker's fake functions.**

### How to Prevent and Detect It

#### Direct Syscalls

If you call `open()` or `stat()`, Fishhook intercepts it by changing the symbol table. However, if we make **Direct Syscalls** via inline assembly, we talk directly to the iOS kernel. Since we bypass the symbol table and `dyld` entirely, Fishhook is completely blind to our calls!

Here is how you write a direct syscall for `open` on ARM64:

```c
#include <sys/syscall.h>
#include <fcntl.h>

// Direct syscall to open a file, bypassing dyld and fishhook completely
int direct_open(const char *path, int oflag, mode_t mode) {
#if defined(__arm64__)
    register const char *r0 __asm__("x0") = path;
    register int r1 __asm__("x1") = oflag;
    register mode_t r2 __asm__("x2") = mode;
    register int syscall_num __asm__("x16") = SYS_open; // Syscall number 5
    
    __asm__ __volatile__(
        "svc #0x80\n" // Make the supervisor call
        : "+r"(r0)
        : "r"(r1), "r"(r2), "r"(syscall_num)
        : "cc", "memory"
    );
    return (int)(long)r0;
#else
    // Fallback for Simulator / non-ARM64 environments
    return open(path, oflag, mode);
#endif
}
```

#### Symbol Destination Check

You can resolve a function pointer using `dlsym` and check its origin with `dladdr`. If the dynamic library path of the resolved symbol does not originate from an official system library (e.g., `/usr/lib/` or `/System/Library/`), a hook has likely intercepted it.

Here is how you can implement this in C:

```c
#include <dlfcn.h>
#include <string.h>
#include <stdbool.h>

bool isSymbolHooked(const char *symbolName) {
    // Resolve the symbol address dynamically
    void *symbolAddress = dlsym(RTLD_DEFAULT, symbolName);
    if (!symbolAddress) {
        return false; // Symbol doesn't exist
    }
    
    Dl_info info;
    if (dladdr(symbolAddress, &info)) {
        if (info.dli_fname != NULL) {
            // Check if the source library path points outside standard system directories
            if (strstr(info.dli_fname, "/usr/lib/") == NULL && 
                strstr(info.dli_fname, "/System/Library/") == NULL) {
                return true; // Suspicious external library origin detected!
            }
        }
    }
    return false;
}
```

## 3. MSHook (MobileSubstrate Inline Hooking)

MSHook (part of Cydia Substrate, and modern alternatives like ElleKit or Substitute) is the foundation of jailbreak tweaks. It is used to hook Swift, Objective-C, and C/C++ functions alike.

### Under the Hood

Unlike Fishhook, which modifies symbol pointer tables, MSHook does **Inline Hooking / Byte Patching**. It directly overwrites the machine code instructions at the target function's entry point in memory. 
Specifically, on ARM64, MSHook overwrites the first 16 bytes (4 instructions) of the target function with a jump/branch instruction (like `BR` or `B`) to point to the hook function. It saves the original instructions in a special memory buffer (trampoline) so it can call them back if needed.

### How to Prevent and Detect It

#### Byte Checking

Because MSHook overwrites the beginning of the function, we can check the first 4-8 bytes of our critical functions in RAM at runtime. 

On ARM64, the first instruction of a normal Swift/C function is typically the prologue, such as `stp x29, x30, [sp, #-16]!` (which compiles to hex `0xA9BF7BFD`). If the function has been hooked inline, the first instruction is replaced by a branch instruction. We can look for common branch opcodes:

```swift
import Foundation

func isFunctionHooked(atAddress address: UnsafeRawPointer) -> Bool {
    let ptr = address.assumingMemoryBound(to: UInt32.self)
    let firstInstruction = ptr.pointee
    
    // ARM64 Branch Instruction Opcodes Masks:
    // B (unconditional branch): 0x14000000 (mask 0xFC000000)
    // BL (branch with link): 0x94000000 (mask 0xFC000000)
    // BR/BLR (branch/branch with link to register): 0xD6000000 (mask 0xFFFFFC00)
    
    let opCodeBranch = firstInstruction & 0xFC000000
    let opCodeRegisterBranch = firstInstruction & 0xFFFFFC00
    
    if opCodeBranch == 0x14000000 || opCodeBranch == 0x94000000 || opCodeRegisterBranch == 0xD61F0000 {
        return true // Hook detected! Instruction replaced with a branch.
    }
    
    return false
}
```

#### IMP Check

For Objective-C and Swift methods, verify that the current `IMP` (Implementation pointer) matches the initial pointer resolved early in the application lifecycle. If the pointer has shifted outside your main binary image's address space (or points to a known jailbreak/hooking library directory), it's likely been swizzled or hooked.

Here is how you can implement this check in Swift:

```swift
import Foundation

func isMethodHooked(cls: AnyClass, selector: Selector) -> Bool {
    // 1. Retrieve the method's runtime implementation (IMP) pointer
    guard let method = class_getInstanceMethod(cls, selector) else {
        return false
    }
    let imp = method_getImplementation(method)
    
    // 2. Query dynamic linker info about this function pointer
    var info = Dl_info()
    if dladdr(UnsafeRawPointer(imp), &info) != 0 {
        if let dli_fname = info.dli_fname {
            let libraryPath = String(cString: dli_fname)
            
            // Check if the pointer belongs to a known hooking tool/dylib
            if libraryPath.contains("substrate") || 
               libraryPath.contains("ellekit") || 
               libraryPath.contains("frida") {
                return true // Hook detected!
            }
            
            // Ensure the implementation is strictly inside the main bundle or official framework
            let isSystemLib = libraryPath.contains("/System/Library/")
            let isAppBundle = libraryPath.hasPrefix(Bundle.main.bundlePath)
            
            if !isSystemLib && !isAppBundle {
                return true // Unauthorized third-party library source
            }
        }
    }
    return false
}
```

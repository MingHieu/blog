---
title: "Chapter 1: Your code is a naked public park"
description: "Reverse Engineering and why your code is not as secret as you think."
order: 1
category: "mobile"
---


I’ve always been addicted to gaming. When I was a kid, offline games were my life. But you know what was even more fun? **Game-mods.** Being able to change the rules, get infinite health, or unlock every level—that was pure magic.

So when I started looking into app security, a terrifying thought hit me: "Can hackers 'mod' our app the same way?"

Could someone just reverse our app, see our code, change the logic (like making `isPaid` always return `true`), and then package it into a brand-new "app-mod"? Hahaha, the thought was actually keeping me awake at night.

I started digging and found a tool that felt like a cheat code: **Hopper Disassembler**. It’s an X-ray machine for binaries. I decided to run a little experiment. I wrote a very simple, very "obvious" function in Xcode:

![Swift function in Xcode](/blog/images/practical-guide-to-ios-app-protection/Xcode.png)

I built the app, grabbed the binary, and dropped it into Hopper. What happened next blew my mind.

Everything was there. My code wasn't a "secret" anymore. I could clearly see the `isPaid()` function in the list of symbols. Hopper even turned the assembly back into something I could almost read.

![Binary reversed in Hopper](/blog/images/practical-guide-to-ios-app-protection/Hopper.png)

That was when it hit me: If they can see it, they can change it.

If a hacker can see exactly where my security checks are, they can just flip a single bit—changing a `false` to a `true`—and my entire security system collapses. And if they can do that, they can definitely build a "modded" version of our app that bypasses every check we have.

## Defensive Techniques

### 1. Hiding the naked code

#### Symbol Obfuscation

If you have a super-important function like `isPaid()`, stop giving them obvious names! Rename your functions and classes to something random like `a1b2c3d4()`. You can keep your sanity by adding a comment in your source code explaining what the function actually does. Comments are stripped out during the build process, so the hacker will only see the random gibberish. Hahaha!

```swift
// MARK: - Payment Check (Symbol Obfuscated)
// Real name: checkPaymentStatus()
func a1b2c3d4() -> Bool {
    // Your secret security logic here
    return false 
}
```

> [!WARNING]
> I’ve searched everywhere for tools that can automatically change names during the build, but honestly, none of them work perfectly. Most will cause your app to crash randomly as soon as Apple updates something. If you find or create a good tool for naming obfuscation, **make a PR to finish this!** Until then, manual renaming for critical stuff is the way to go.

If you want even more protection, you should move your critical logic down to C files. Swift and Objective-C methods are easy to find in Hopper because of their rich runtime metadata (even if renamed). C functions and inline assembly, on the other hand, are much harder to reverse because they leave no Swift runtime metadata footprint.

```c
// In a .c file — no Swift runtime metadata, harder to identify
static int __attribute__((noinline)) _chk(void) {
    // your sensitive check here
    return 1;
}
```

#### Variable Obfuscation

Instead of storing sensitive static keys as plain strings, convert them to binary arrays. This makes it significantly harder for hackers to extract and decode your secrets directly from the binary.

```swift
// ❌ BAD: Easy to find in the binary
let publicKey = "Meahaszxxxx..."

// ✅ GOOD: Obfuscated binary array
let publicKeyBytes: [UInt8] = [0x4D, 0x65, 0x61, 0x68, 0x61, 0x73, 0x7A, ...]
```

**Tool Recommendation:** Use [obfuskit](https://github.com/mgratzer/obfuskit) to automatically convert your sensitive strings into binary arrays during the build process.

### 2. Integrity Checks

When you push an app to the Apple Store, Apple signs it with your Bundle Identifier (`com.company.app`) and your TeamID (`ABC123456`). We can write a check inside our app to verify these identifiers at runtime. If someone tries to repackage the app, the identifiers won't match our original ones. The "modded" app will know it’s a fake and can refuse to run.

```swift
func isAppSignatureValid() -> Bool {
    var staticCode: SecStaticCode?
    let path = Bundle.main.bundleURL as CFURL

    guard SecStaticCodeCreateWithPath(path, [], &staticCode) == errSecSuccess,
          let code = staticCode else {
        return false
    }

    let requirementString = """
        anchor apple generic and \
        identifier "com.yourcompany.yourapp" and \
        certificate leaf[subject.OU] = "ABCDE12345"
    """

    var requirement: SecRequirement?
    guard SecRequirementCreateWithString(requirementString as CFString, [], &requirement) == errSecSuccess,
          let req = requirement else {
        return false
    }

    return SecStaticCodeCheckValidity(code, [], req) == errSecSuccess
}
```

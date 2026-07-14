---
title: "Chapter 2: The memory is a playground, and you are not invited"
description: "Runtime Tampering: The 4 ways hackers mess with your app brain."
order: 2
category: "mobile"
---


So, we’ve tried to protect our binary. Great. But what happens when the app is actually *running*?

A hacker doesn't always need to rebuild your app to break it. They can just reach into your app’s brain (the RAM) while it’s running and start moving things around. We call this **Runtime Tampering**, but I like to call it "Brain Surgery by a 5-year-old with a hammer."

Here are the 4 ways they’re going to mess with you:

### 1. The Playground

To do real damage, hackers need a "lawless" environment.

* **Jailbreak:** This is the big one. It unlocks all the doors of iOS, letting hackers run tools called **"Tweaks"** that can change how *any* app works.
* **Emulators:** Sometimes they don't even use a real phone. They use a virtual one where they can pause time, look at memory, and generally act like a god.

### 2. The Debugger

While jailbreaks and emulators provide the environment, **debuggers like LLDB or Frida** (Low Level Debugger) are the actual weapons. They pause your app and directly manipulate memory and function behavior.

Here's what a real LLDB attack looks like:

```bash
# Attach LLDB to the running app
lldb -p <process_id>

# Pause the app
(lldb) br set -n validateLicense  # Set breakpoint on function

# App hits the breakpoint, inspect memory
(lldb) po $x0  # Print the first argument
(lldb) p (bool)true  # Set the return value to true
(lldb) thread return YES  # Return from function with YES

# Continue execution
(lldb) c
```

### 3. Man-in-the-Middle (MITM)

Even if they can't touch the code, they can touch the data. They sit between your app and your server and read everything you're sending. It's like someone reading your mail before it gets to your house.

![Swift function in Xcode](/blog/images/practical-guide-to-ios-app-protection/Proxyman.webp)

### 4. Function Hooking

This is the ultimate magic trick. When your app tries to call some functions, the hook intercepts the call and points it to the hacker's own code instead.

Here's how different tools accomplish the same attack:

**Using Frida:**

```javascript
Interceptor.attach(ObjC.classes.LicenseValidator['- validateLicense:'].implementation, {
    onLeave: function(retval) {
        console.log('[+] Hooking validateLicense() - always returning true');
        return ObjC.classes.NSNumber.numberWithBool_(1);
    }
});
```

**Using Fishhook (C function hooking):**

```c
#import <fishhook/fishhook.h>

// Original function pointer
static bool (*original_validateLicense)(void) = NULL;

// Malicious replacement
static bool fake_validateLicense(void) {
    printf("[+] License validation bypassed!\n");
    return true;
}

// Hook it
rebind_symbols((struct rebinding[1]) {
    {"_validateLicense", fake_validateLicense, (void **)&original_validateLicense}
}, 1);
```

**Using MobileSubstrate (Tweak):**

```objc
%hook LicenseValidator
- (BOOL)validateLicense:(id)arg {
    NSLog(@"[+] License check intercepted!");
    return YES;  // Bypass the real check
}
%end
```

**What's happening?**

* **Frida:** Intercepts at runtime by attaching to the process
* **Fishhook:** Rebinds function pointers to malicious versions
* **MobileSubstrate:** Modifies the method at load time before your code runs

Feel like you're losing? Good. That means you're paying attention. In the next chapter, we're going to talk about the "Hostile Ground" and how to detect if your app is currently being bullied by these tools.

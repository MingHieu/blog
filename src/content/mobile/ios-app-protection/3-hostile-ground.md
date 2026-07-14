---
title: "Chapter 3: You are in a dangerous place"
description: "How to detect when your app is running on a compromised device."
order: 3
category: "mobile"
---


Like everyone else, I started by searching for "iOS security library" and scrolling through thousands of open-source projects. I spent a week—day and night, way too much coffee—researching every single one.

**The result? Total depression.**

I realized that 99% of the libraries out there are ancient. They haven't been updated since... I don't know, the iPhone 4? Or they're just lazy copies of the same five lines of code from StackOverflow.

After my research deep-dive, I found exactly two that are actually worth your time: [iOSSecuritySuite](https://github.com/securing/IOSSecuritySuite) and [FreeRASP (Talsec)](https://github.com/talsec/Free-RASP-iOS/). Almost everything else is a fork or a fake.

You don't need to reinvent the wheel, but you do need to understand the three big things we’re looking for to know if we’re on "Hostile Ground."

### 1. Jailbreak Detection

A jailbreak is basically a hacker's skeleton key. It breaks the iOS sandbox and lets them do whatever they want. To detect it, we look for the "mess" they leave behind.

* **Files:** We look for files that shouldn't exist, like `/Applications/Cydia.app`, `/bin/bash`, or folders related to **MobileSubstrate**.
* **Permissions:** On a clean iPhone, you can't just write files wherever you want. On a jailbroken one, the sandbox is gone. We try to create a dummy file in a restricted folder like `/private/`.
* **Symlinks:** Jailbreak tools move big folders around to save space and leave "shortcuts" (symbolic links) behind. We check if paths like `/Applications` are actual folders or just fake links.

### 2. Simulator Detection

Why do we care about simulators? Because hackers *love* them. It's much easier to run scripts, bypass checks, and spoof locations on a Mac than on a physical iPhone.

* **Architecture:** Simulators run on your Mac's architecture (x86_64 or ARM64-Apple Silicon), while real iPhones are always ARM. We check the system info for architecture mismatches.
* **Environment:** Apple adds specific tags to the environment when an app runs in a simulator, like `SIMULATOR_DEVICE_NAME`. If they're there, you're not on a real phone.

### 3. Debugging Detection

Debugging is like an X-ray machine. It lets a hacker pause your app, look at every variable, and change your logic while it's running. **Frida** is the king of this world. It attaches to your app and injects JavaScript to rewrite your functions on the fly. To stop them, we use a few low-level tricks:

* **ptrace:** We use a system call called `ptrace` with a flag that basically tells the kernel: "If anyone tries to attach a debugger to me, just crash." It’s simple, but it stops basic tools in their tracks.
* **sysctl:** We ask the system: "Is there a flag on my process that says I'm being traced?" If `P_TRACED` is active, we know someone is watching us.
* **The "Frida" Check:** We scan the app's memory for things like `Frida`, `Substrate`, or `Substitute`. If we see those libraries loaded, it's game over.

---

In this chapter, I recommend using established security libraries instead of dumping a large amount of hardcoded detection logic directly into the article.

Detection techniques evolve constantly. New jailbreak methods, bypass tricks, and runtime manipulation techniques appear almost every day. A detection method that works today may become outdated tomorrow.

Mature security libraries are maintained continuously by teams that update their detection logic over time, which makes them far more practical for real-world production apps — especially in finance, banking, healthcare, and other high-risk environments.

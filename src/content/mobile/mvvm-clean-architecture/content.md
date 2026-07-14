---
title: "Frontend project with MVVM & Clean Architecture"
description: "Stop coding on vibes. Build a structured, explainable frontend application with MVVM and Clean Architecture."
order: 0
category: "frontend"
---


> **Note:** If you want to follow along, here's the sample app I used for this post: [MVVMSampleApp](https://github.com/MingHieu/MVVMSampleApp)

I've heard it a hundred times. In code reviews. In stand-ups. In those annoying Slack threads where someone drops a PR comment that says *"this could be cleaner"* with zero follow-up.

**"My code is cleaner than yours."**

Cool. Why? What makes it cleaner? What's the measuring stick?

And this is the part where most people fall apart. They go:

*"Well, I use this pattern..."*
*"I separate my files like this..."*
*"I saw this on a Medium article..."*

But when you ask them **"What standard are you referencing? What principle tells you this is better?"** — they have nothing. They just feel like their way is better because they're used to it. They've been writing code the same way for years, and **familiarity feels like quality.** But it's not. It's just comfort.

Here's the thing they don't teach you enough in college but should've drilled into your skull: **if you can't cite your source, your opinion is just noise.** When you write an academic paper, every claim needs a reference. Every argument needs backing. Software architecture is no different. If you say your code is "clean," you'd better be able to point at a principle, a pattern, or a well-known architecture that backs you up — not just vibes.

So let's stop with the feelings and start with something concrete. We're going to build a project structure from scratch using **MVVM + Clean Architecture** — and by the end, you'll be able to actually explain *why* your code is clean.

## Three Layers Architecture

Forget the fancy jargon for a second. Every app — whether it's a banking app, a social media platform, or a simple to-do list — can be broken down into **three layers.** That's it. Three.

I'm not making this up. This comes from decades of software architecture principles — from Uncle Bob's Clean Architecture to Google's recommended app architecture. The names change, the diagrams look different, but the core idea is always the same.

![The three-layer cake](/blog/images/mvvm-clean-architecture/three-layers.png)

### Layer 1: UI (Presentation)

Exactly what it sounds like. **You draw things on the screen.**

A button. A text field. A checkbox — is it checked or not? An input field — what's the current value?

That's the UI layer's entire job. It **displays** things and **reacts** to user actions. When the user taps "Login," the UI layer says: *"Hey, someone pressed login. I'm passing this along."* It doesn't know what "login" means. It doesn't call the API. It doesn't validate the password. It just draws, holds some visual state, and sends events up.

**Note:** If you see a network request or a database query in your UI code, something has gone wrong.

### Layer 2: Business (Domain)

This is where the **brain** of your app lives. The business layer handles the *logic* — the rules, the decisions, the actual "what does this app do?"

- *How* do we log in? → Validate the input first, then send it to the server.
- *How* do we purchase a VIP membership? → Check the balance, verify eligibility, process the payment.
- *How* do we fetch user info? → Get it from the API, maybe cache it locally.

Some people call this the **Domain** layer. Think of it like a real-world domain — a field of expertise. **Finance Domain** handles transactions. **Healthcare Domain** handles appointments. **Auth Domain** handles login and tokens.

But don't overthink the naming. If you want to name your domain "GetUserInfo" because that's all it does? That's perfectly fine. The important thing is that this layer **contains the rules** and **nothing else.** No UI. No database queries. Just pure logic.

**Note:** If you see `UILabel` or `URLSession` in your business logic code, something has gone wrong.

### Layer 3: Data

This layer deals with the **real world** — the messy, unreliable, sometimes-offline world of data.

- Sending a login request to your REST API? → Data layer.
- Saving chat messages to a local SQLite database? → Data layer.
- Fetching config values from Firebase? → Data layer.
- Storing an auth token in the Keychain? → Data layer.

The data layer wraps all the ugly networking code, all the database queries, all the third-party SDK calls. It provides clean, simple interfaces to the business layer above it.

The beauty of this separation? If you ever need to swap Alamofire for URLSession, or Realm for CoreData — you only touch the data layer. The business logic doesn't care. The UI definitely doesn't care. **They never even knew.**

**Note:** If you see layout code in your repository class, you've lost the plot.

### How they talk

```
┌─────────┐      ┌──────────┐      ┌──────────┐
│   UI    │ ───▶ │ Business │ ───▶ │   Data   │
│  Layer  │ ◀─── │  Layer   │ ◀─── │  Layer   │
└─────────┘      └──────────┘      └──────────┘
```

The UI never talks to the Data layer directly. There's always a middleman — the Business layer — that decides what to do with the information.

## MVVM meets Clean Architecture

Before we go deeper, let's settle something first. What the hell does "clean" even mean?

Clean doesn't mean your code looks pretty. Clean doesn't mean you have nice folder names. **Clean means your code is easy to maintain, easy to update, and easy to debug.** It means when something breaks at 2 AM, the next person — or future you — can look at the project and immediately know *where* to look. Clean means you're making the next person's job easier, not harder.

More specifically: clean means **each layer has one responsibility and doesn't affect the others.** Sound familiar? That's exactly what our three layers do. But now we're going to make it more detailed — we're going to wire those three layers into a real architecture pattern called **MVVM (Model-View-ViewModel).**

Here's the architecture diagram:

![MVVM + Clean Architecture](/blog/images/mvvm-clean-architecture/architecture.png)

Three zones. Three colors. Three layers — but now with real structure inside each one. Let's map them to a real project.

### The folder structure

```text
MVVMSampleApp/
├── Features/           ← UI Layer (Presentation + MVVM)
│   ├── Splash/
│   │   ├── SplashViewController.swift     (View)
│   │   └── SplashViewModel.swift          (ViewModel)
│   ├── Login/
│   │   ├── LoginViewController.swift      (View)
│   │   └── LoginViewModel.swift           (ViewModel)
│   └── Home/
│       ├── HomeViewController.swift       (View)
│       └── HomeViewModel.swift            (ViewModel)
│
├── Domain/             ← Business Layer
│   ├── Models/
│   │   └── UserModel.swift
│   ├── UseCases/
│   │   ├── LoginUseCase.swift
│   │   ├── CheckAuthUseCase.swift
│   │   └── LogoutUseCase.swift
│   └── Validation/
│       ├── Rules.swift
│       └── ValidationError.swift
│
├── Data/               ← Data Layer
│   ├── Repositories/
│   │   ├── AuthRepository.swift
│   │   └── UserRepository.swift
│   ├── Remote/
│   │   ├── Api/
│   │   └── DTOs/
│   └── Local/
│       ├── Entities/
│       └── Keychain/
│
├── Common/             ← Shared utilities
└── Widgets/            ← Reusable UI components
```

Every file has a home. Every file belongs to exactly one layer. No exceptions.

### UI Layer

Each feature is a folder with a **ViewController** (the View) and a **ViewModel** (the bridge to business logic).

**The View — LoginViewController:**

```swift
class LoginViewController: BaseViewController {
    var loginViewModel = LoginViewModel()

    @IBAction func loginAction(_ sender: Any) {
        Task { [weak self] in
            do {
                let request = LoginRequestDTO(
                    username: "john_doe",
                    password: "12345678"
                )
                try await self?.loginViewModel.login(request)
                self?.goToHome()
            } catch {
                print(error)
            }
        }
    }
}
```

Only two things: capture the user action, tell the ViewModel to do the work. No validation. No API calls. No keychain access.

**The ViewModel — LoginViewModel:**

```swift
class LoginViewModel {
    private var loginUseCase = LoginUseCase()

    func login(_ request: LoginRequestDTO) async throws {
        try await loginUseCase.execute(request)
    }
}
```

Five lines. A thin bridge that holds a reference to a UseCase and delegates everything. It doesn't know *how* login works. It just knows *who* to ask.

**But here's the thing — you don't always need a UseCase.** Sometimes you just want to fetch some data and show it on screen. No validation. No complex business rules. Just get the data and display it. In that case, the ViewModel can talk directly to the Repository. No middleman needed.

Look at our `HomeViewModel`:

```swift
class HomeViewModel {
    private var userRepository = UserRepository()
    private var logoutUseCase = LogoutUseCase()

    private(set) var user: UserModel?

    func getUser() async {
        self.user = try? await self.userRepository.getUser()
    }

    func logout() {
        logoutUseCase.execute()
    }
}
```

See? `getUser()` calls the repository directly — no UseCase. Because there's nothing to validate, nothing to coordinate. It's just *"give me the user, I'll show it."* But `logout()` still goes through a UseCase, because logout has a specific job: clearing the token from the Keychain. That's a business decision.

### Business Layer

**Models** — the app's internal language:

```swift
struct UserModel {
    var username: String
    var name: String
}
```

**Use Cases** — one action, one class, one responsibility:

```swift
class LoginUseCase {
    var authRepository = AuthRepository()

    func execute(_ request: LoginRequestDTO) async throws {
        try Rules.notEmpty(request.username)
        try Rules.minLength(request.username, 6)
        try Rules.maxLength(request.username, 255)

        try Rules.notEmpty(request.password)
        try Rules.minLength(request.password, 8)
        try Rules.maxLength(request.password, 255)

        try await authRepository.login(request)
    }
}
```

Validates first, then delegates the API call to the repository. It doesn't know what HTTP method to use. It just says *"hey repository, log this person in."*

**Validation** — lives in Domain because input validation is a business rule, not a UI concern:

```swift
enum Rules {
    static func notEmpty(_ value: String) throws {
        guard !value.trimmingCharacters(in: .whitespaces).isEmpty else {
            throw ValidationError.empty
        }
    }

    static func minLength(_ value: String, _ min: Int) throws {
        guard value.count >= min else {
            throw ValidationError.tooShort(min: min)
        }
    }
}
```

### Data Layer

**Repositories** — the single point of entry into data:

```swift
class AuthRepository {
    var keychainWrapper = KeychainWrapper()
    var authApiService = AuthApiService()

    func login(_ request: LoginRequestDTO) async throws {
        let data = try await authApiService.mockLogin().unwrap()
        saveToken(AuthTokenEntity(token: data.token))
    }

    func saveToken(_ entity: AuthTokenEntity) {
        keychainWrapper.save(value: entity.token, forKey: "auth_token")
    }

    func getToken() -> AuthTokenEntity? {
        guard let token = keychainWrapper.readValue(forKey: "auth_token"),
              !token.isEmpty else { return nil }
        return AuthTokenEntity(token: token)
    }
}
```

The repository coordinates between **Remote** (API) and **Local** (Keychain). The Domain layer doesn't know or care about this coordination.

**Naming convention in Data:**

| Term | Location | Meaning |
|------|----------|---------|
| **DTO** | `Remote/DTOs/` | Data shape from/to the API |
| **Entity** | `Local/Entities/` | Data shape stored locally |
| **Model** | `Domain/Models/` | Data shape used by the app |

Why three types for "user data"? Because the API returns `user_name`, the database stores `userName`, and your app wants `username`. Each layer speaks its own language, and **mapping** happens at the boundary:

```swift
struct UserDTO: Decodable {
    var username: String
    var name: String

    func toModel() -> UserModel {
        UserModel(username: username, name: name)
    }
}
```

### The full login flow

```
User taps "Login"
    ▼
LoginViewController       ← UI: captures the tap
    ▼
LoginViewModel            ← UI: delegates to use case
    ▼
LoginUseCase              ← Domain: validates, then delegates
    ▼
AuthRepository            ← Data: calls API, saves token
    ▼
KeychainWrapper           ← Data: persists locally
    ▼
✅ Success bubbles back up → navigate to Home
```

Every arrow crosses **exactly one boundary.** No layer-skipping. No shortcuts.

## So, is your code clean now?

Here's the checklist. If you can answer "yes" to all of these, congratulations — your code is actually clean, and you can explain why:

- Can I change the UI framework without touching business logic?
- Can I swap the API library without touching the ViewModel?
- Can I test a use case without launching the app?
- Can a new developer know where to put a new feature just by looking at the folder structure?
- Does each file have exactly one reason to change?

Architecture is about **trade-offs.** Sometimes you're building a prototype. Sometimes you have 2 days to ship. That's fine — but you need to know *what* you're trading off. The difference between a junior and a senior isn't that the senior always writes perfect code. It's that **the senior knows when they're cutting corners** — and they know exactly what it'll cost them later.

So to all the developers out there who throw around *"clean code"* like a badge of honor but can't explain what principles they're following — **stop it.** If you want to say your code is clean, **earn it.** Learn the principles. Understand the trade-offs. Know why each layer exists.

Because *"it works"* is not the same as *"it's clean."*
And *"I'm used to it"* is not the same as *"it's good."*

Now go refactor something. And next time someone says *"my code is clean,"* ask them why. If they can't answer — send them this link. ✌️

### References

- [Clean Architecture — Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Guide to App Architecture — Android Developers](https://developer.android.com/topic/architecture)

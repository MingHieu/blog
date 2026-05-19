---
title: "Chapter 4: Stop people from reading your mail"
description: "Network Security: Proxyman, SSL Pinning, and protecting your API."
order: 4
category: "mobile"
---


I used to think that once my app sent a request to the server, it was "safe." I mean, it's HTTPS, right? It's encrypted! Nobody can see it!

**I was so wrong.**

One day, I saw a colleague using a tool called **Proxyman**. I watched him open our app, hit a button, and—*boom*—every single request, every API key, every JSON response was right there on his screen.

But it got worse. He didn't just *see* the data. He set a **breakpoint** on a response from our server. When the app asked, `"Is this user a VIP?"`, the server responded with `{"isVIP": false}`. My colleague paused the response on his computer, changed the `false` to `true` in real-time, and hit "Execute."

The app received the "fake" response, and suddenly, he had access to every premium feature in the app. No purchase, no subscription, just a quick edit in Proxyman.

I felt like my app was being lied to right in front of me. If someone can see and touch our requests or responses, our entire security model collapses.

## Defensive Techniques

### Level 1: Proxy Detection

My first thought was: *"If they have a proxy enabled, just kill the app!"*

It’s a bit aggressive, and yeah, you might lose some users who are on corporate Wi-Fi or using a VPN for privacy. But for high-security apps, it’s a solid first line of defense. Check the system's network settings to see if an HTTP or HTTPS proxy is active. If we find one, we can show a warning or just refuse to fetch sensitive data.

```swift
import Foundation

func isProxyEnabled() -> Bool {
    guard let proxySettings = CFNetworkCopySystemProxySettings()?.takeRetainedValue() as? [String: Any] else {
        return false
    }

    let httpProxy = proxySettings[kCFNetworkProxiesHTTPEnable as String] as? Int ?? 0
    let httpsProxy = proxySettings[kCFNetworkProxiesHTTPSEnable as String] as? Int ?? 0

    return (httpProxy == 1 || httpsProxy == 1)
}

if isProxyEnabled() {
    print("Spy detected! Blocking sensitive requests.")
    // terminateApp() or showWarning()
}
```

### Level 2: SSL Pinning

Proxyman works by installing a "trusted" certificate on the device. This lets it pretend to be your server, decrypt the traffic, show it to the hacker, and then re-encrypt it to send it to the real server. 

**SSL Pinning** is how we tell the app: *"I don't care if the system trusts this certificate. I ONLY trust THIS specific certificate (or public key) from my server."* We bundle our server's certificate (or its public key) inside the app. During the connection, we check if the server's certificate matches our "pinned" version. If Proxyman tries to sit in the middle, its certificate won't match our pin, and the app will immediately drop the connection.

```swift
class SecurityDelegate: NSObject, URLSessionDelegate {
    func urlSession(_ session: URLSession, didReceive challenge: URLAuthenticationChallenge, completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void) {
        
        guard let trust = challenge.protectionSpace.serverTrust else {
            completionHandler(.cancelAuthenticationChallenge, nil)
            return
        }

        guard let certPath = Bundle.main.path(forResource: "myserver", ofType: "cer"),
              let localCertData = try? Data(contentsOf: URL(fileURLWithPath: certPath)),
              let localCert = SecCertificateCreateWithData(nil, localCertData as CFData) else {
            completionHandler(.cancelAuthenticationChallenge, nil)
            return
        }

        SecTrustSetAnchorCertificates(trust, [localCert] as CFArray)
        SecTrustSetAnchorCertificatesOnly(trust, true)

        var error: CFError?
        if SecTrustEvaluateWithError(trust, &error) {
            completionHandler(.useCredential, URLCredential(trust: trust))
        } else {
            print("MITM Attack Detected!")
            completionHandler(.cancelAuthenticationChallenge, nil)
        }
    }
}
```

### Level 3: Request Signing

If a hacker is *really* good, they might find a way to bypass SSL Pinning (there are Frida scripts for that, which we’ll talk about later...). 

This is where **Request Signing** comes in. Even if they can *see* the request, we want to make sure they can't *change* it. We take the request body, add a secret "salt" (a key only the app and server know), and create a unique **HMAC-SHA256 signature**. If they change even one letter in the request body, the signature will no longer match. The server will see the mismatch and say: *"Nice try, but I’m not touching this."*

```swift
import CryptoKit

func signRequest(body: Data) -> (signature: String, timestamp: String) {
    let secretKey = SymmetricKey(data: "your-super-secret-key".data(using: .utf8)!)
    let timestamp = String(Int(Date().timeIntervalSince1970))
    
    var dataToSign = body
    dataToSign.append(timestamp.data(using: .utf8)!)
    
    let signature = HMAC<SHA256>.authenticationCode(for: dataToSign, using: secretKey)
    let signatureString = Data(signature).base64EncodedString()
    
    return (signatureString, timestamp)
}
```

### Level 4: Body Encryption

Signing stops them from *changing* the data, but they can still *read* it. If you're sending super sensitive stuff (like passwords or credit card info), you don't even want the proxy to see the JSON. We encrypt the entire request body using **AES-GCM**. In Proxyman, the hacker will just see a block of random gibberish. They can't read it, and they definitely can't edit it.

```swift
import CryptoKit

func encryptBody(data: Data) -> Data? {
    let key = SymmetricKey(data: "your-32-byte-encryption-key-here".data(using: .utf8)!)
    
    do {
        let sealedBox = try AES.GCM.seal(data, using: key)
        return sealedBox.combined 
    } catch {
        print("Encryption failed: \(error)")
        return nil
    }
}
```

### Overall
If you really want to sleep at night, don't just pick one. 
1. Use **Proxy Detection** to scare off the amateurs.
2. Use **SSL Pinning** to stop the tools from working.
3. Use **Encryption & Signing** as the ultimate backup. 

Next up: Checking if your code is still... your code.
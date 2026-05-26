---
name: mobile-security
version: 1.0.0
min_mindforge_version: 10.4.0
status: stable
triggers: mobile security architecture, certificate pinning, secure storage mobile, biometric authentication, root detection, jailbreak detection, mobile encryption, mobile API security, keychain keystore, mobile OWASP, secure communication mobile, mobile token storage
compose: auth-patterns
---

# Skill — Mobile Security Architecture

## When this skill activates
This skill activates when implementing security-sensitive mobile features, including certificate pinning, secure storage, biometric authentication, root/jailbreak detection, or protecting against mobile-specific attack vectors.

## Mandatory actions when this skill is active

### Before writing any code
1. Review OWASP Mobile Top 10 and identify applicable threats to the application
2. Determine data classification and storage requirements (keychain/keystore for sensitive data, never UserDefaults/SharedPreferences)
3. Establish certificate pinning strategy (pin leaf certificate, intermediate, or public key hash)
4. Plan authentication flow with biometric fallback, token refresh, and secure token storage

### During implementation
- Store sensitive data in platform secure storage (iOS Keychain with proper accessibility attributes, Android Keystore)
- Implement certificate pinning for API communications to prevent man-in-the-middle attacks
- Use biometric authentication (Face ID, Touch ID, Biometric Prompt) with proper fallback to passcode
- Implement root/jailbreak detection (check for common indicators, but never rely solely on client-side checks)
- Encrypt local databases and sensitive files using platform encryption APIs (SQLCipher, native encryption)
- Obfuscate code (ProGuard/R8 for Android, native code for critical logic) to deter reverse engineering
- Implement proper session management with token expiration, refresh tokens, and secure logout

### After implementation
- Test security implementation with security scanning tools (MobSF, QARK, or commercial tools)
- Verify certificate pinning works correctly and fails on MITM attempts
- Test biometric authentication edge cases: disabled biometrics, changed biometrics, hardware unavailability
- Validate secure storage: data persists securely across app restarts, inaccessible without authentication
- Test root/jailbreak detection on compromised devices, verify graceful degradation or blocking

## Self-check before task completion
- [ ] Sensitive data is never stored in plaintext (logs, UserDefaults, SharedPreferences, temp files)
- [ ] Certificate pinning is implemented for all API endpoints with sensitive data
- [ ] Biometric authentication follows platform best practices (keychain/keystore-backed, proper error handling)
- [ ] Root/jailbreak detection is implemented with appropriate response (warn, degrade functionality, or block)
- [ ] API tokens are stored securely (keychain/keystore) and transmitted securely (HTTPS only, proper headers)
- [ ] App handles security failures gracefully (logout on tampering detection, clear sensitive data on uninstall)

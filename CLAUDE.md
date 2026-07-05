# Building signed & notarized releases

This doc is for any Claude Code instance (or human) doing a release build of this app. Read this before touching `electron-builder` config or debugging a signing failure — the failure modes here are misleading and expensive to rediscover.

## TL;DR

```
export APPLE_TEAM_ID="<team id, e.g. D4YLNBMZ79>"
export APPLE_KEYCHAIN_PROFILE="<notarytool profile name, e.g. riso-notarize>"
npm run dist
```

Then copy the resulting `.dmg` files out of `/tmp/riso-at-home-build/` (see "Why `/tmp`" below) into `dist/` or straight to a GitHub release.

## One-time prerequisites (per machine)

1. **A paid Apple Developer Program membership** and a **"Developer ID Application" certificate** with its private key in the login keychain. Generate it correctly — do NOT import a `.p12` from elsewhere if you can avoid it:
   - Keychain Access → Certificate Assistant → Request a Certificate From a Certificate Authority → save the CSR to disk. This creates the matching private key *on this machine*, which matters (see "Certificate/key mismatch" below).
   - Upload the CSR at developer.apple.com → Certificates → **+** → Developer ID Application → download the `.cer` → double-click to import.
   - Verify: `security find-identity -v -p codesigning` should show exactly one valid identity. If Xcode/keychain access ever shows a duplicate with the same name, delete the broken one — see below.

2. **A notarization credential profile**, stored once, never touched again:
   ```
   xcrun notarytool store-credentials "riso-notarize" --apple-id "you@example.com" --team-id "YOUR_TEAM_ID"
   ```
   This prompts interactively for an **app-specific password** (generate one at appleid.apple.com → Sign-In and Security → App-Specific Passwords). Never put the raw password in a command, script, or chat — only the profile *name* (`riso-notarize`) gets referenced afterward, via `APPLE_KEYCHAIN_PROFILE`.

3. **Up-to-date Xcode Command Line Tools.** Check with `pkgutil --pkg-info=com.apple.pkg.CLTools_Executables` and `softwareupdate --list`. An outdated CLT version produced a *generic, misleading* codesign error here (see below) — updating to the latest fixed it and made errors specific/actionable again.

## Why `/tmp`, not the project directory

`package.json`'s `build.directories.output` points at `/tmp/riso-at-home-build`, not `dist/`. This is deliberate: if this project lives under `~/Documents` (or Desktop, or anywhere else iCloud Drive syncs), the sync daemon actively re-stamps freshly-written build output with extended attributes (`com.apple.FinderInfo`, `com.apple.provenance`) *while electron-builder is signing it* — a race `codesign` loses, rejecting the file with "resource fork, Finder information, or similar detritus not allowed." An `afterPack.js` hook that strips xattrs right after packing helps but can't win that race reliably, because the sync daemon keeps re-scanning the directory in the background. Building outside any syncing directory (`brctl status` shows syncing status if you want to confirm) sidesteps it entirely.

After a successful `npm run dist`, copy the `.dmg` files from `/tmp/riso-at-home-build/` into the repo's `dist/` (gitignored) or attach them directly to a GitHub release.

## Verifying a build

```
codesign --verify --deep --strict --verbose=2 "path/to/Riso at Home.app"
spctl --assess --type execute --verbose "path/to/Riso at Home.app"   # should say "accepted / source=Notarized Developer ID"
xcrun stapler validate "path/to/Riso at Home.app"                    # should say "The validate action worked!"
```

If `spctl` says `rejected / source=Unnotarized Developer ID`, the app is signed but notarization didn't happen or didn't get stapled — check that `APPLE_KEYCHAIN_PROFILE`/`APPLE_TEAM_ID` were actually set when `npm run dist` ran (the build log should say `notarization successful`, not `skipped macOS notarization`).

## Troubleshooting: "unable to build chain to self-signed root" / `errSecInternalComponent`

This exact error pair showed up for **three unrelated reasons** in this project's history, in order of how we found them. Check them in this order:

1. **Missing intermediate certificate.** `codesign --sign <hash> --force <file>` fails on a plain file (not just the app bundle). Fix: download and install Apple's intermediate cert:
   ```
   curl -O https://www.apple.com/certificateauthority/DeveloperIDG2CA.cer
   security add-certificates -k login.keychain-db DeveloperIDG2CA.cer
   ```
   Verify with `security verify-cert -c leaf.pem -c intermediate.pem`.

2. **A stale/locked keychain earlier in the search list.** `security list-keychains` may show a leftover cache keychain (e.g. from a previous `electron-builder` run at `~/Library/Caches/electron-builder/electron-builder-root-certs.keychain`) ahead of `login.keychain-db`. If it's locked and there's no interactive session to unlock it, codesign's chain-building silently fails. Fix:
   ```
   security list-keychains -d user -s login.keychain-db /Library/Keychains/System.keychain
   rm -f ~/Library/Caches/electron-builder/electron-builder-root-certs.keychain
   ```

3. **The certificate/private key pair itself is broken**, even though `security find-identity -v -p codesigning` lists it as "valid" and the public-key hashes of the cert and stored key match. We never fully root-caused this one — the fix was regenerating the certificate from scratch via the Keychain Access CSR flow in prerequisite #1 above, which produces a fresh, guaranteed-matching key pair. If you hit this, don't spend time diagnosing it further than a quick `security verify-cert` check — just regenerate.
   - If regenerating leaves two "Developer ID Application" identities with the same name in the keychain, `electron-builder`'s auto-discovery can pick the wrong (broken) one. Delete the old one: `security delete-certificate -Z <old-sha1-hash> login.keychain-db`.

If none of the above apply and the error persists, check the Xcode Command Line Tools version (see prerequisite #3) — an outdated version reproduced this exact generic error on every single file, even freshly downloaded/never-executed ones, and updating CLT turned it into a specific, actionable error (`Disallowed xattr com.apple.FinderInfo found on ...`), which is what led to discovery #2 (iCloud/`/tmp` fix) above.

## Other gotchas

- **DMG filenames must include the arch explicitly.** `electron-builder`'s default artifact naming omits the arch suffix for `x64` (but not `arm64`), producing an `.dmg` that looks architecture-neutral. Someone installed the x64 build on an Apple Silicon Mac, ran it under Rosetta, and it was miserably slow. `package.json` sets `dmg.artifactName` to `${productName}-${version}-${arch}.dmg` explicitly for both.
- **Building via a sandboxed/headless shell** (no GUI session attached) can *look* like a signing failure (private-key ACL prompts have nowhere to display) but usually isn't the real cause — this project's actual root causes were all reproducible from a normal interactive Terminal too. Don't assume "run it in a real Terminal" fixes things without checking further.

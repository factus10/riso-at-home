# Riso at Home

A native macOS desktop app that mimics a risograph print effect on a home color printer — layering CMYK halftone dots the way a risograph machine lays down ink. This wraps [p5.riso@home](https://github.com/adrawerofthings/p5.risoAtHome) by Jason Li in Electron so it runs as a normal double-clickable app instead of requiring a local web server.

## What's different from the original

- Runs as a signed, notarized macOS app — no dev server setup required
- Native "Choose Image" file picker instead of manually copying files into a `data/` folder and typing the filename
- Native "Save As" dialog for exporting the processed image
- Redesigned interface: native macOS layout (image preview + settings inspector), system fonts and controls, inset title bar — replacing the original's Windows 95-style skin
- Starts to an empty state instead of auto-processing a bundled sample image on every launch

## Development

```
npm install
npm start
```

## Building a release

Requires a paid Apple Developer account for code signing and notarization.

```
export APPLE_TEAM_ID="YOUR_TEAM_ID"
export APPLE_KEYCHAIN_PROFILE="your-notarytool-profile"  # see: xcrun notarytool store-credentials
npm run dist
```

Produces signed, notarized `.dmg` files for both Apple Silicon (`arm64`) and Intel (`x64`) under `/tmp/riso-at-home-build` (kept outside this project's directory since it lives under iCloud Drive sync, which otherwise races with `codesign`).

If signing or notarization fails, see [CLAUDE.md](CLAUDE.md) for one-time setup steps and a troubleshooting guide covering the specific (misleading) errors this project has hit before.

## Credits

Built on [p5.riso@home](https://github.com/adrawerofthings/p5.risoAtHome) by Jason Li, which in turn builds on [p5.Riso.js](https://antiboredom.github.io/p5.riso/) by Sam Lavigne and Tega Brain, and [riso@home](https://github.com/jywarren/risoAtHome/) by Jeffrey Warren.

## License

See [LICENSE.md](LICENSE.md) — this repo's code is MIT-licensed; bundled third-party code retains its original license.

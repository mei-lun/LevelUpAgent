# HeiGe Codex Glass

This is the LevelUpAgent-native port of the HeiGe Codex Skin Studio visual language.
It keeps the cyan/magenta glass surfaces, Codex-style three-column shell, readable
message panels, and real native window controls while avoiding the source project's
CDP injector, remote resources, and unverified third-party artwork.

The package uses a compatibility `standard` layout name plus a local
`codex.layout.json` companion. New hosts load the companion Codex structure, while
older hosts can still parse the package without trying to deserialize a layout map.

The distributable package is `heige-codex.levelup-theme` in this directory. The
source files under `levelup/` are kept here so the package can be rebuilt and tested.

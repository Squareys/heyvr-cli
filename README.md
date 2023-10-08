## heyVR CLI Tool

Easy to use CLI tool to publish WebXR games to
[heyVR](https://heyvr.io/) from CI/CD.

The command will check all arguments upfront to
reduce CI config iterations.

## Authentication

The command expects a `HEYVR_ACCESS_TOKEN` variable
in the environment. Make sure to keep it safe via
CI secrets.

Create an access token [in your developer accountsettings](https://heyvr.io/account/settings).

## Usage

The command can be used as follows:

```
heyvr --version <version> --gameId <gameId>

version  x.y.z, converted into 'minor'/'major'/'p
atch'
gameId   Game ID for heyVR.
path     Path to the game, index.html required at
 root.
         Default deploy/ or public/.

The command expects 'HEYVR_ACCESS_TOKEN' environm
ent
variable for authentication.
```

### version (required)

heyVR expects you to pass `major`, `minor`, `patch`
instead of an absolute version to enforce semantic
versioning.

Since this is really inconvenient for tagging from
CI, the tool will automatically convert the version
passed from `x.y.z` to the correct increment by
detecting `.0` suffixes:

- `x.0.0` => `major`
- `x.y.0` => `minor`
- `x.y.z` => `patch`

## gameId (required)

The game id of your game on heyVR.

### path

By default `deploy/` is uploaded. If not found,
`public/` is uploaded.

You can override this behavior by passing an explicit
`--path` argument.

The given path needs to contain an `index.html`.

### sdkVersion

Default `1`.

## License

MIT License, see `LICENSE` for more information.

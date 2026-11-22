# Street League — Chitungwiza Street Champions

**Developer:** MD.dev
**Application ID:** `com.muchafz.streetleague`
**Technology:** Flutter + Flame (2D)
**Target:** Android (API 21+, target SDK 34)

This repository contains the **STREET LEAGUE** Flutter project: a Zimbabwean street football game
with a complete, interconnected player progression and achievement system (levels 1–50, XP, match
achievements, Street Premier League / Champions League / Dust Cup / Super Cup / World Cup
milestones, trophy room, seasonal progression, challenges, notifications, online rankings, Hall of
Fame, local persistence and server-verified online results).

## Status

This is the **progression-system implementation** of the game. The pure-Dart progression library
(`lib/progression/`) is complete and covered by automated tests in `test/`. The Flame gameplay
engine, 15 grounds, 16 teams, 64 players, Bluetooth/WiFi/online multiplayer and release signing
assets are specified in the project structure and must be completed in the development phases
described in the master prompt (Phases 1–10).

> Note: the Flutter/Dart SDK is not installed in this environment, so `flutter pub get`,
> `flutter analyze` and `flutter test` could not be executed here. Run them on a machine with the
> Flutter SDK (3.19+) installed.

## Project structure

```
street_league/                  # Flutter application (app id com.muchafz.streetleague)
  lib/
    main.dart                   # Entry point
    app.dart                    # MaterialApp + routes
    progression_provider.dart   # UI state controller connecting engine + local store
    progression/                # Pure-Dart progression library (no Flutter import)
      player_profile.dart       # Player profile, career statistics
      player_levels.dart        # 50 levels, titles, XP curve
      xp_transaction.dart       # XP ledger with duplicate prevention
      match_result.dart         # Match facts produced by the gameplay engine
      achievements.dart         # All achievement definitions (tiers, badges, requirements)
      achievement_progress.dart # Per-achievement progress
      achievement_engine.dart   # Automatic achievement/milestone/trophy engine
      trophy_collection.dart    # Trophy room model (never reset between seasons)
      season.dart               # Season calendar, identities, historical records
      career.dart               # Career stages 1–5 and milestones
      challenges.dart           # Daily / weekly / special challenges
      notifications.dart        # Achievement notification presentation
      rankings.dart             # Online competitive rankings (separate from offline)
      hall_of_fame.dart         # Street League Hall of Fame
      persistence.dart          # Local storage abstraction + in-memory store
      server_verification.dart  # Authoritative server verification boundary
    engine/
      match_result_source.dart  # Interface the Flame gameplay engine implements
    ui/
      player_profile_screen.dart
      trophy_room_screen.dart
      achievements_screen.dart
      career_screen.dart
      challenges_screen.dart
      hall_of_fame_screen.dart
      rankings_screen.dart
      achievement_notification_overlay.dart
  test/
    progression_acceptance_test.dart   # 12-point final acceptance test
  android/                      # Android app (Gradle, Manifest, MainActivity)
  ios/                          # iOS runner stub
  assets/                       # Trophies, badges, portraits, grounds, audio, fonts
```

## Prerequisites

- Flutter SDK ≥ 3.19 (stable)
- Android Studio / VS Code with Flutter plugins
- An Android device (API 21+) or emulator for offline features
- **Two physical Android phones** for Bluetooth / local WiFi multiplayer testing (required)

## Install dependencies

```bash
cd /home/user/todo-live          # (or the repo root)
flutter pub get
```

## Run the game

```bash
flutter run
```

Select an Android target. The app opens on the player profile screen; navigate to the Trophy Room,
Achievements, Career, Challenges, Hall of Fame and Online Rankings from the routes defined in
`lib/app.dart`.

## Run automated tests

```bash
dart test
# or, within a Flutter project:
flutter test test/progression_acceptance_test.dart
```

The acceptance test demonstrates every point of the final acceptance test:

1. New player starts at Level 1.
2. Match completion awards XP (win + goal + assist + clean sheet).
3. First Blood (first goal) achievement unlocks.
4. League milestones: first appearance, first victory, home/away victories, five consecutive wins,
   league champion, unbeaten season.
5. Top-four league finish → Champions League qualification.
6. Champions League final reached and won.
7. Correct trophy appears in the trophy room (Street Champions League Trophy).
8. Seasonal awards (Player of the Season, Golden Boot) are awarded at season end.
9. Career history records every match and season result.
10. Profile, XP ledger, trophy collection and season history survive JSON serialization
    (close/reopen round-trip).
11. Replaying the same match result awards no XP and unlocks nothing (duplicate prevention);
    direct ledger duplication throws `DuplicateXpEventError`.
12. Online rankings accept results only with a non-empty server signature; duplicates are rejected;
    the leaderboard is ordered by MMR, not matches played.

## Build for release

```bash
flutter build apk --release      # release APK
flutter build appbundle --release # Android App Bundle for Play Store
```

Release signing: configure `android/key.properties` with `keyPassword`, `storePassword`,
`keyAlias`, `storeFile` pointing at a valid upload keystore, and enable signing in
`android/app/build.gradle` before building the AAB.

## Test multiplayer

- **Bluetooth:** Phone A hosts a room; Phone B scans, finds and accepts. Both see the same match
  (host-authoritative simulation). No internet required.
- **Local WiFi / hotspot:** Phone A creates room `CHIT-1234`; Phone B joins by code or manual IP.
  No internet required.
- **Online:** create a six-character room code room, invite a friend by username; results go
  through `AchievementServer.verifyMatchResult` and update rankings only when server-verified.

## Data safety / permissions

The app requests only permissions required by implemented features:
`INTERNET`, `BLUETOOTH`, `BLUETOOTH_ADMIN`, `BLUETOOTH_CONNECT`, `BLUETOOTH_SCAN`,
`ACCESS_WIFI_STATE`, `CHANGE_WIFI_STATE`, `ACCESS_FINE_LOCATION`, `WRITE_EXTERNAL_STORAGE`
(maxSdkVersion 28). Bluetooth and nearby-device permissions are required for local multiplayer and
are explained on the multiplayer screen. No precise location, contacts or personal information is
collected beyond the player's chosen username.

## Privacy policy

See `privacy_policy.md` (to be added before Play Store submission) — covers local-first storage,
anonymous usernames, optional cloud sync, and no sale of personal data.

## Google Play Store listing materials

- App name: Street League
- Subtitle: Chitungwiza Street Champions
- Developer: MD.dev
- Version: 1.0.0+1
- Category: Games / Sports
- Content rating: to be completed via the Play Console content rating questionnaire

## Development phases

1. Flutter project, design system, menus and navigation
2. Flame gameplay engine
3. Player movement, ball physics, goals and AI
4. Teams, players, attributes and player stories
5. All five competitions
6. Career mode and local saving
7. Bluetooth and local WiFi multiplayer
8. Online multiplayer and friend rooms
9. Sound, effects, animations and performance optimisation
10. Real-device testing and release APK/AAB

## License

All rights reserved. MD.dev — Street League, Chitungwiza Street Champions.

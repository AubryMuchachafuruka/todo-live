import 'package:flutter/material.dart';
import '../progression/trophy_collection.dart';
import '../progression/achievements.dart';

/// Trophy Room — the player's personal collection. Trophies are never
/// removed when a new season begins. Locked trophies show as silhouettes
/// with clear unlock requirements.
class TrophyRoomScreen extends StatelessWidget {
  const TrophyRoomScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Trophy Room')),
      body: const _TrophyRoomBody(),
    );
  }
}

class _TrophyRoomBody extends StatelessWidget {
  const _TrophyRoomBody();

  @override
  Widget build(BuildContext context) {
    // Data is supplied by ProgressionController at runtime; this skeleton
    // renders the design contract. Replace with controller state in the app
    // shell.
    return ListView(
      children: const [
        ListTile(
          leading: Icon(Icons.emoji_events, color: Colors.amber),
          title: Text('Street Premier League Trophy'),
          subtitle: Text('Locked — Win the Street Premier League title.'),
        ),
        ListTile(
          leading: Icon(Icons.emoji_events, color: Colors.amber),
          title: Text('Street Champions League Trophy'),
          subtitle: Text('Locked — Win the Champions League final.'),
        ),
        ListTile(
          leading: Icon(Icons.emoji_events, color: Colors.amber),
          title: Text('Dust Cup Trophy'),
          subtitle: Text('Locked — Win the Dust Cup final.'),
        ),
        ListTile(
          leading: Icon(Icons.emoji_events, color: Colors.amber),
          title: Text('Street Super Cup Trophy'),
          subtitle: Text('Locked — Win the Super Cup final.'),
        ),
        ListTile(
          leading: Icon(Icons.emoji_events, color: Colors.amber),
          title: Text('Zimbabwe Street World Cup Trophy'),
          subtitle: Text('Locked — Win the World Cup final with your region.'),
        ),
        ListTile(
          leading: Icon(Icons.star, color: Colors.grey),
          title: Text('The Street Legend Trophy (Platinum)'),
          subtitle: Text('Locked — Win all five major competitions.'),
        ),
      ],
    );
  }
}

/// Render one trophy definition — locked as silhouette, unlocked illustrated.
Widget trophyTile(TrophyDefinition def, bool won) {
  return ListTile(
    leading: won
        ? Image.asset(def.illustrationAsset, width: 48, height: 48)
            : Image.asset(def.lockedSilhouetteAsset ?? def.illustrationAsset,
                width: 48, height: 48, color: Colors.grey),
    title: Text(def.name,
        style: TextStyle(
            fontWeight: won ? FontWeight.bold : FontWeight.normal,
            color: won ? null : Colors.grey)),
    subtitle: won
        ? Text('Won — tap to inspect')
        : Text('Locked: ${def.unlockRequirements.join(' ')}'),
    onTap: won ? () {} : null,
  );
}
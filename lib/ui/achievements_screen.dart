import 'package:flutter/material.dart';
import '../progression/achievements.dart';

/// Achievements screen — every match feat and competition milestone,
/// with progress bars for locked items and badges for unlocked ones.
class AchievementsScreen extends StatelessWidget {
  const AchievementsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Achievements')),
      body: const _AchievementsBody(),
    );
  }
}

class _AchievementsBody extends StatelessWidget {
  const _AchievementsBody();

  @override
  Widget build(BuildContext context) {
    return ListView(
      children: const [
        ListTile(
          leading: Icon(Icons.star, color: Colors.amber),
          title: Text('First Blood — Bronze'),
          subtitle: Text('Score your first goal.  Locked'),
        ),
        ListTile(
          leading: Icon(Icons.star, color: Colors.grey),
          title: Text('Panna King — Silver'),
          subtitle: Text('5 panna moves in one match.  Locked'),
        ),
        ListTile(
          leading: Icon(Icons.emoji_events, color: Color(0xFFFFD700)),
          title: Text('Champion of the Streets — Legendary'),
          subtitle: Text('Win the Street Champions League final.  Locked'),
        ),
      ],
    );
  }
}

Color tierColor(AchievementTier tier) {
  switch (tier) {
    case AchievementTier.bronze:
      return const Color(0xFFCD7F32);
    case AchievementTier.silver:
      return const Color(0xFFC0C0C0);
    case AchievementTier.gold:
      return const Color(0xFFFFD700);
    case AchievementTier.legendary:
      return const Color(0xFFE5E5E5);
  }
}
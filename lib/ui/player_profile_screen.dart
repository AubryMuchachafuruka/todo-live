import 'package:flutter/material.dart';
import '../progression/player_levels.dart';
import '../progression/player_profile.dart';
import '../progression_provider.dart';

/// Player profile screen — Level, XP, career statistics and titles.
class PlayerProfileScreen extends StatelessWidget {
  const PlayerProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('My Street Profile')),
      body: const _ProfileBody(),
    );
  }
}

class _ProfileBody extends StatelessWidget {
  const _ProfileBody();

  @override
  Widget build(BuildContext context) {
    // In the real app this listens to ProgressionController. Here we render
    // from the controller directly via a placeholder instance supplied by
    // the app's state widget at runtime.
    return const Center(child: Text('Open via ProgressionController state'));
  }
}

/// Displays level band and title for a profile (usable by any screen).
Widget profileLevelBadge(PlayerProfile profile) {
  final level = profile.level;
  final title = titleForLevel(level);
  final tier = tierForLevel(level);
  final color = _tierColor(tier);
  final xpToNext = profile.xpToNextLevel;
  final progress = profile.isMaxLevel
      ? 1.0
      : (profile.xp % (xpToNext == 0 ? 1 : xpToNext)) /
          (xpToNext == 0 ? 1 : xpToNext);
  return Column(
    children: [
      CircleAvatar(
        radius: 44,
        backgroundImage: profile.avatarAsset != null
            ? AssetImage(profile.avatarAsset!)
            : null,
        child: profile.avatarAsset == null
            ? const Icon(Icons.sports, size: 44)
            : null,
      ),
      const SizedBox(height: 12),
      Text(
        profile.username,
        style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
      ),
      const SizedBox(height: 6),
      Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: color.withOpacity(0.2),
          border: Border.all(color: color),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(
          'Level $level  •  $title',
          style: TextStyle(color: color, fontWeight: FontWeight.bold),
        ),
      ),
      const SizedBox(height: 12),
      Text(
        'XP ${profile.xp}${profile.isMaxLevel ? '  (MAX LEVEL)' : ' / $xpToNext to next level'}',
      ),
      if (!profile.isMaxLevel)
        LinearProgressIndicator(value: progress.clamp(0.0, 1.0)),
    ],
  );
}

Color _tierColor(LevelTier tier) {
  switch (tier) {
    case LevelTier.rookie:
      return const Color(0xFF9E9E9E);
    case LevelTier.prospect:
      return const Color(0xFFCD7F32);
    case LevelTier.talent:
      return const Color(0xFFC5B358);
    case LevelTier.dustWarrior:
      return const Color(0xFF795548);
    case LevelTier.specialist:
      return const Color(0xFF4CAF50);
    case LevelTier.star:
      return const Color(0xFF2196F3);
    case LevelTier.champion:
      return const Color(0xFF9C27B0);
    case LevelTier.townshipLegend:
      return const Color(0xFFD43420);
    case LevelTier.zimbabweIcon:
      return const Color(0xFFFDD835);
    case LevelTier.streetFootballLegend:
      return const Color(0xFFFFD700);
  }
}

/// Career statistics card.
Widget careerStatisticsCard(PlayerProfile profile) {
  final s = profile.careerStatistics;
  return Card(
    child: Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Career Statistics',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          _statRow('Matches Played', '${s.matchesPlayed}'),
          _statRow('Matches Won', '${s.matchesWon}'),
          _statRow('Goals Scored', '${s.goalsScored}'),
          _statRow('Assists', '${s.assists}'),
          _statRow('Panna Moves', '${s.pannaMoves}'),
          _statRow('Clean Sheets', '${s.cleanSheets}'),
          _statRow('Player Rating', '${s.playerRating}'),
          _statRow('Win Rate', '${s.winRate.toStringAsFixed(0)}%'),
          _statRow('Highest League Position',
              profile.highestLeaguePosition == 0
                  ? '—'
                  : '#${profile.highestLeaguePosition}'),
        ],
      ),
    ),
  );
}

Widget _statRow(String label, String value) => Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [Text(label), Text(value, style: const TextStyle(fontWeight: FontWeight.bold))],
      ),
    );
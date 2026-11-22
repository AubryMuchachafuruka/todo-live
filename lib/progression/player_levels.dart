/// 50 player progression levels for STREET LEAGUE.
///
/// The player's journey runs from an unknown street footballer
/// (Level 1) to Street Football Legend (Level 50). Titles are awarded
/// in bands of five levels so every rank-up feels meaningful.

enum LevelTier {
  rookie,
  prospect,
  talent,
  dustWarrior,
  specialist,
  star,
  champion,
  townshipLegend,
  zimbabweIcon,
  streetFootballLegend,
}

/// The maximum attainable player level.
const int kMaxPlayerLevel = 50;

/// Cumulative XP required to reach [level].
///
/// Level 1 = 0 XP, level 2 = 150 XP, level 10 = 6,750 XP,
/// level 50 = 183,750 XP. The curve accelerates so high levels
/// represent genuine, long-term investment.
int cumulativeXpForLevel(int level) {
  level = level.clamp(1, kMaxPlayerLevel);
  return (150 * level * (level - 1) / 2).round();
}

/// XP required to advance from [level] to [level + 1].
int xpToNextLevel(int level) {
  final clamped = level.clamp(1, kMaxPlayerLevel - 1);
  return cumulativeXpForLevel(clamped + 1) - cumulativeXpForLevel(clamped);
}

/// Derive the player's level from total cumulative XP.
int levelForXp(int xp) {
  var level = 1;
  for (var l = 2; l <= kMaxPlayerLevel; l++) {
    if (xp >= cumulativeXpForLevel(l)) {
      level = l;
    } else {
      break;
    }
  }
  return level.clamp(1, kMaxPlayerLevel);
}

/// Display title for a level, following the spec's level bands.
String titleForLevel(int level) {
  final l = level.clamp(1, kMaxPlayerLevel);
  if (l <= 5) return 'Street Rookie';
  if (l <= 10) return 'Street Prospect';
  if (l <= 15) return 'Street Talent';
  if (l <= 20) return 'Dust Warrior';
  if (l <= 25) return 'Street Specialist';
  if (l <= 30) return 'Street Star';
  if (l <= 35) return 'Street Champion';
  if (l <= 40) return 'Township Legend';
  if (l <= 45) return 'Zimbabwe Icon';
  return 'Street Football Legend';
}

/// Progression tier for a level, used for badge styling.
LevelTier tierForLevel(int level) {
  final l = level.clamp(1, kMaxPlayerLevel);
  if (l <= 5) return LevelTier.rookie;
  if (l <= 10) return LevelTier.prospect;
  if (l <= 15) return LevelTier.talent;
  if (l <= 20) return LevelTier.dustWarrior;
  if (l <= 25) return LevelTier.specialist;
  if (l <= 30) return LevelTier.star;
  if (l <= 35) return LevelTier.champion;
  if (l <= 40) return LevelTier.townshipLegend;
  if (l <= 45) return LevelTier.zimbabweIcon;
  return LevelTier.streetFootballLegend;
}

/// One level definition.
class PlayerLevelDefinition {
  /// Level number, 1-50.
  final int level;
  /// Display title, e.g. "Street Champion".
  final String title;
  /// Short title for UI badges, e.g. "Champion".
  final String shortTitle;
  /// Cumulative XP required to reach this level.
  final int xpRequired;
  /// Visual tier for badge colouring.
  final LevelTier tier;
    /// Asset for the level badge illustration.
  final String badgeAsset;
  /// Flavour text shown on the profile screen.
  final String description;

  const PlayerLevelDefinition({
    required this.level,
    required this.title,
    required this.shortTitle,
    required this.xpRequired,
    required this.tier,
    required this.badgeAsset,
    this.description = '',
  });

  /// True when [xp] is sufficient to reach this level.
  bool isUnlockedBy(int xp) => xp >= xpRequired;

  int get xpToNext {
    if (level >= kMaxPlayerLevel) return 0;
    return cumulativeXpForLevel(level + 1) - xpRequired;
  }
}

/// All 50 level definitions, in order.
List<PlayerLevelDefinition> allPlayerLevels() {
  final levels = <PlayerLevelDefinition>[];
  for (var level = 1; level <= kMaxPlayerLevel; level++) {
    final title = titleForLevel(level);
    final short = switch (level) {
      <= 5 => 'Rookie',
      <= 10 => 'Prospect',
      <= 15 => 'Talent',
      <= 20 => 'Dust Warrior',
      <= 25 => 'Specialist',
      <= 30 => 'Street Star',
      <= 35 => 'Champion',
      <= 40 => 'Township Legend',
      <= 45 => 'Zimbabwe Icon',
      _ => 'Street Legend',
    };
    levels.add(PlayerLevelDefinition(
      level: level,
      title: title,
      shortTitle: short,
      xpRequired: cumulativeXpForLevel(level),
      tier: tierForLevel(level),
      badgeAsset: 'assets/badges/level_${level.toString().padLeft(2, '0')}_${short.toLowerCase().replaceAll(' ', '_')}.png',
      description: 'Reach level $title in your street football career.',
    ));
  }
  return levels;
}

/// The level definition for [level], or the closest valid level.
PlayerLevelDefinition levelDefinitionForLevel(int level) {
  return allPlayerLevels().firstWhere(
    (d) => d.level == level.clamp(1, kMaxPlayerLevel),
    orElse: () => allPlayerLevels().last,
  );
}

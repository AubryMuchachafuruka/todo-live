/// Achievement notification presentation data.
///
/// Screens observe this and render the presentation (darkened screen,
/// golden badge, short trophy animation). Screens never hardcode the
/// notification text themselves — it comes from the engine outcome.

enum NotificationImportance { normal, important }

class AchievementNotification {
  final AchievementUnlocked unlocked;
  final NotificationImportance importance;
  final String headline;
  final String body;
  final List<String> buttons;

  AchievementNotification({
    required this.unlocked,
    this.importance = NotificationImportance.normal,
    this.headline = 'ACHIEVEMENT UNLOCKED!',
    List<String>? buttons,
  })  : body = '${unlocked.definition.name}\n${unlocked.definition.description}',
        buttons = buttons ??
            const [
              'View Achievement',
              'Share Achievement',
              'Continue Playing',
            ];

  /// Unique sound effect / animation id for important achievements.
  String get sfxId {
    switch (unlocked.definition.id) {
      case 'sl_street_legend':
      case 'sl_undisputed_street_king':
        return 'sfx_street_legend';
      case 'ms_win_street_premier_league':
        return 'sfx_champion';
      case 'cl_win_final':
        return 'sfx_champions_league';
      case 'dc_win_dust_cup':
        return 'sfx_dust_cup';
      case 'wc_win_world_cup':
        return 'sfx_world_cup';
      case 'sc_winner':
        return 'sfx_super_cup';
      default:
        return 'sfx_achievement';
    }
  }

  String get animationId {
    switch (unlocked.definition.tier) {
      case AchievementTier.legendary:
        return 'anim_platinum_trophy';
      case AchievementTier.gold:
        return 'anim_gold_trophy';
      case AchievementTier.silver:
        return 'anim_silver_badge';
      case AchievementTier.bronze:
        return 'anim_bronze_badge';
    }
  }
}

/// Builds notification presentation data from an engine outcome.
List<AchievementNotification> notificationsFor(
        List<AchievementUnlocked> unlocked) =>
    unlocked
        .map((u) => AchievementNotification(
              unlocked: u,
              importance: u.definition.tier == AchievementTier.legendary
                  ? NotificationImportance.important
                  : NotificationImportance.normal,
            ))
        .toList();

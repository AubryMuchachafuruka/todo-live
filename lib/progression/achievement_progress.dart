/// Progress toward a single achievement, stored per player and persisted
/// so progress survives across sessions.
class AchievementProgress {
  /// The achievement definition id.
  final String achievementId;
  /// Current progress toward the [target].
  int currentProgress;
  /// Progress required to unlock.
  final int target;
  /// Whether the achievement has been unlocked.
  bool unlocked;
  /// When it was unlocked, null if still locked.
  DateTime? unlockedAt;
  /// Match in which it was unlocked (for duplicate prevention).
  String? unlockedInMatchId;

  AchievementProgress({
    required this.achievementId,
    this.currentProgress = 0,
    required this.target,
    this.unlocked = false,
    this.unlockedAt,
    this.unlockedInMatchId,
  });

  double get completionRatio =>
      target <= 0 ? 1.0 : (currentProgress / target).clamp(0.0, 1.0);

  bool get isUnlocked => unlocked;

  Map<String, dynamic> toJson() => {
        'achievementId': achievementId,
        'currentProgress': currentProgress,
        'target': target,
        'unlocked': unlocked,
        'unlockedAt': unlockedAt?.toIso8601String(),
        'unlockedInMatchId': unlockedInMatchId,
      };

  factory AchievementProgress.fromJson(Map<String, dynamic> json) =>
      AchievementProgress(
        achievementId: json['achievementId'] as String,
        currentProgress: json['currentProgress'] as int? ?? 0,
        target: json['target'] as int? ?? 0,
        unlocked: json['unlocked'] as bool? ?? false,
        unlockedAt: json['unlockedAt'] != null
            ? DateTime.parse(json['unlockedAt'] as String)
            : null,
        unlockedInMatchId: json['unlockedInMatchId'] as String?,
      );

  /// Create a fresh progress entry from a definition.
  factory AchievementProgress.fromDefinition(AchievementDefinition def) =>
      AchievementProgress(
        achievementId: def.id,
        target: def.target,
      );
}

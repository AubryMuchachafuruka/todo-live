/// Daily, weekly and special challenges. All achievable without purchases
/// and never requiring daily logins to protect a streak.

enum ChallengeFrequency { daily, weekly, special }

enum ChallengeStatus { active, completed, expired, claimed }

class ChallengeReward {
  final int xp;
  final List<String> cosmeticItems; // jersey, boots, celebration
  final List<String> badges;
  final List<String> titles;

  const ChallengeReward({
    this.xp = 0,
    this.cosmeticItems = const [],
    this.badges = const [],
    this.titles = const [],
  });
}

/// One challenge.
class Challenge {
  final String id;
  final String title;
  final String objective; // human-readable, shown on progress bar
  final ChallengeFrequency frequency;
  final int target;
  final ChallengeReward reward;
  final DateTime? expiry; // null for special challenges without expiry
  int progress = 0;
  ChallengeStatus status = ChallengeStatus.active;
  DateTime? completedAt;
  bool claimed = false;

  Challenge({
    required this.id,
    required this.title,
    required this.objective,
    required this.frequency,
    required this.target,
    required this.reward,
    this.expiry,
  });

  double get completionRatio =>
      target <= 0 ? 1.0 : (progress / target).clamp(0.0, 1.0);

  bool get isCompleted => status == ChallengeStatus.completed;

  bool get isExpired =>
      expiry != null && DateTime.now().isAfter(expiry!) &&
      status != ChallengeStatus.completed;

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'objective': objective,
        'frequency': frequency.index,
        'target': target,
        'progress': progress,
        'status': status.index,
        'completedAt': completedAt?.toIso8601String(),
        'claimed': claimed,
        'expiry': expiry?.toIso8601String(),
      };

  factory Challenge.fromJson(Map<String, dynamic> json) =>
      Challenge(
        id: json['id'] as String,
        title: json['title'] as String,
        objective: json['objective'] as String,
        frequency: ChallengeFrequency.values[json['frequency'] as int],
        target: json['target'] as int,
        reward: ChallengeReward(
          xp: json['rewardXp'] as int? ?? 0,
        ),
        expiry: json['expiry'] != null
            ? DateTime.parse(json['expiry'] as String)
            : null,
      )
      ..progress = json['progress'] as int? ?? 0
      ..status = ChallengeStatus.values[json['status'] as int? ?? 0]
      ..completedAt = json['completedAt'] != null
          ? DateTime.parse(json['completedAt'] as String)
          : null
      ..claimed = json['claimed'] as bool? ?? false;
}

/// The full challenge catalogue.
List<Challenge> allChallenges({DateTime? now}) {
  final d = now ?? DateTime.now();
  return [
    // ━ Daily ━
    Challenge(
      id: 'daily_score_three_goals',
      title: 'Three-Game Goals',
      objective: 'Score 3 goals in a match',
      frequency: ChallengeFrequency.daily,
      target: 3,
      reward: const ChallengeReward(xp: 150),
      expiry: DateTime(d.year, d.month, d.day, 23, 59),
    ),
    Challenge(
      id: 'daily_win_one_match',
      title: 'Street Winner',
      objective: 'Win 1 match',
      frequency: ChallengeFrequency.daily,
      target: 1,
      reward: const ChallengeReward(xp: 100),
      expiry: DateTime(d.year, d.month, d.day, 23, 59),
    ),
    Challenge(
      id: 'daily_five_pannas',
      title: 'Panna Practice',
      objective: 'Complete 5 panna moves',
      frequency: ChallengeFrequency.daily,
      target: 5,
      reward: const ChallengeReward(xp: 100, cosmeticItems: ['street_boots']),
      expiry: DateTime(d.year, d.month, d.day, 23, 59),
    ),
    Challenge(
      id: 'daily_two_assists',
      title: 'Provider',
      objective: 'Provide 2 assists',
      frequency: ChallengeFrequency.daily,
      target: 2,
      reward: const ChallengeReward(xp: 100),
      expiry: DateTime(d.year, d.month, d.day, 23, 59),
    ),
    // ━ Weekly ━
    Challenge(
      id: 'weekly_win_five_matches',
      title: 'Weekend Warrior',
      objective: 'Win 5 matches this week',
      frequency: ChallengeFrequency.weekly,
      target: 5,
      reward: const ChallengeReward(xp: 500, badges: ['weekly_winner']),
      expiry: DateTime(d.year, d.month, d.day + 7, 23, 59),
    ),
    Challenge(
      id: 'weekly_fifteen_goals',
      title: 'Goal Machine',
      objective: 'Score 15 goals this week',
      frequency: ChallengeFrequency.weekly,
      target: 15,
      reward: const ChallengeReward(xp: 750, cosmeticItems: ['gold_boots']),
      expiry: DateTime(d.year, d.month, d.day + 7, 23, 59),
    ),
    Challenge(
      id: 'weekly_three_away_wins',
      title: 'Away King',
      objective: 'Win 3 away matches',
      frequency: ChallengeFrequency.weekly,
      target: 3,
      reward: const ChallengeReward(xp: 600),
      expiry: DateTime(d.year, d.month, d.day + 7, 23, 59),
    ),
    Challenge(
      id: 'weekly_giant_killer',
      title: 'Giant Killer',
      objective: 'Defeat a higher-rated opponent',
      frequency: ChallengeFrequency.weekly,
      target: 1,
      reward: const ChallengeReward(xp: 500, badges: ['giant_killer']),
      expiry: DateTime(d.year, d.month, d.day + 7, 23, 59),
    ),
    // ━ Special ━
    Challenge(
      id: 'special_beat_champion',
      title: 'Beat the Champion',
      objective: 'Beat the current league champion',
      frequency: ChallengeFrequency.special,
      target: 1,
      reward: const ChallengeReward(xp: 1000, titles: ['Giant Slayer']),
    ),
    Challenge(
      id: 'special_underdog_win',
      title: 'Underdog',
      objective: 'Win a match with a lower-rated team',
      frequency: ChallengeFrequency.special,
      target: 1,
      reward: const ChallengeReward(xp: 800, cosmeticItems: ['underdog_jersey']),
    ),
    Challenge(
      id: 'special_final_minute_goal',
      title: 'Final Minute',
      objective: 'Score a goal in the final minute',
      frequency: ChallengeFrequency.special,
      target: 1,
      reward: const ChallengeReward(xp: 600),
    ),
    Challenge(
      id: 'special_unbeaten_tournament',
      title: 'Unbeaten Run',
      objective: 'Win a tournament without losing',
      frequency: ChallengeFrequency.special,
      target: 1,
      reward: const ChallengeReward(xp: 1500, badges: ['unbeaten']),
    ),
  ];
}

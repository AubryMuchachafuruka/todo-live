/// Story-based career mode milestones.
///
/// The player's journey begins as an unknown street footballer and grows
/// through five stages. Career decisions affect development, team
/// relationships and reputation.

enum CareerStage {
  unknown,        // Stage 1 – The Unknown
  risingStar,     // Stage 2 – The Rising Star
  streetStar,     // Stage 3 – The Street Star
  townshipIcon,   // Stage 4 – The Township Icon
  legend,         // Stage 5 – The Legend
}

extension CareerStageName on CareerStage {
  String get displayName {
    switch (this) {
      case CareerStage.unknown:
        return 'Stage 1 – The Unknown';
      case CareerStage.risingStar:
        return 'Stage 2 – The Rising Star';
      case CareerStage.streetStar:
        return 'Stage 3 – The Street Star';
      case CareerStage.townshipIcon:
        return 'Stage 4 – The Township Icon';
      case CareerStage.legend:
        return 'Stage 5 – The Legend';
    }
  }

  int get requiredRating {
    switch (this) {
      case CareerStage.unknown:
        return 0;
      case CareerStage.risingStar:
        return 70;
      case CareerStage.streetStar:
        return 80;
      case CareerStage.townshipIcon:
        return 90;
      case CareerStage.legend:
        return 95;
    }
  }
}

/// One career milestone within a stage.
class CareerMilestone {
  final String id;
  final String title;
  final String description;
  final CareerStage stage;
  final int target; // progress required
  int progress = 0;
  bool unlocked = false;
  DateTime? unlockedAt;

  CareerMilestone({
    required this.id,
    required this.title,
    required this.description,
    required this.stage,
    required this.target,
  });

  double get completionRatio =>
      target <= 0 ? 1.0 : (progress / target).clamp(0.0, 1.0);

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'description': description,
        'stage': stage.index,
        'target': target,
        'progress': progress,
        'unlocked': unlocked,
        'unlockedAt': unlockedAt?.toIso8601String(),
      };

  factory CareerMilestone.fromJson(Map<String, dynamic> json) =>
      CareerMilestone(
        id: json['id'] as String,
        title: json['title'] as String,
        description: json['description'] as String,
        stage: CareerStage.values[json['stage'] as int],
        target: json['target'] as int,
      )
      ..progress = json['progress'] as int? ?? 0
      ..unlocked = json['unlocked'] as bool? ?? false
      ..unlockedAt = json['unlockedAt'] != null
          ? DateTime.parse(json['unlockedAt'] as String)
          : null;
}

/// All career milestones, organised by stage.
List<CareerMilestone> allCareerMilestones() {
  return [
    // ━ Stage 1 – The Unknown ━
    CareerMilestone(
      id: 'car_join_team',
      title: 'Join a Local Street Team',
      description: 'Join your first local street football team.',
      stage: CareerStage.unknown,
      target: 1,
    ),
    CareerMilestone(
      id: 'car_first_five_matches',
      title: 'First Five Matches',
      description: 'Play your first five career matches.',
      stage: CareerStage.unknown,
      target: 5,
    ),
    CareerMilestone(
      id: 'car_first_goal',
      title: 'First Career Goal',
      description: 'Score your first career goal.',
      stage: CareerStage.unknown,
      target: 1,
    ),
    // ━ Stage 2 – The Rising Star ━
    CareerMilestone(
      id: 'car_rating_70',
      title: 'Reach Rating 70',
      description: 'Reach a player rating of 70.',
      stage: CareerStage.risingStar,
      target: 70,
    ),
    CareerMilestone(
      id: 'car_regular_starter',
      title: 'Become a Regular Starter',
      description: 'Become a regular starter for your team.',
      stage: CareerStage.risingStar,
      target: 1,
    ),
    CareerMilestone(
      id: 'car_first_local_tournament',
      title: 'Win the First Local Tournament',
      description: 'Win your first local street tournament.',
      stage: CareerStage.risingStar,
      target: 1,
    ),
    // ━ Stage 3 – The Street Star ━
    CareerMilestone(
      id: 'car_rating_80',
      title: 'Reach Rating 80',
      description: 'Reach a player rating of 80.',
      stage: CareerStage.streetStar,
      target: 80,
    ),
    CareerMilestone(
      id: 'car_recruited',
      title: 'Get Recruited',
      description: 'Get recruited by a stronger team.',
      stage: CareerStage.streetStar,
      target: 1,
    ),
    CareerMilestone(
      id: 'car_regional_win',
      title: 'Win a Regional Competition',
      description: 'Win a regional street competition.',
      stage: CareerStage.streetStar,
      target: 1,
    ),
    // ━ Stage 4 – The Township Icon ━
    CareerMilestone(
      id: 'car_rating_90',
      title: 'Reach Rating 90',
      description: 'Reach a player rating of 90.',
      stage: CareerStage.townshipIcon,
      target: 90,
    ),
    CareerMilestone(
      id: 'car_captain',
      title: 'Become Captain',
      description: 'Become captain of your team.',
      stage: CareerStage.townshipIcon,
      target: 1,
    ),
    CareerMilestone(
      id: 'car_major_championship',
      title: 'Win a Major Championship',
      description: 'Win a major street football championship.',
      stage: CareerStage.townshipIcon,
      target: 1,
    ),
    // ━ Stage 5 – The Legend ━
    CareerMilestone(
      id: 'car_rating_95',
      title: 'Reach Rating 95',
      description: 'Reach a player rating of 95 or higher.',
      stage: CareerStage.legend,
      target: 95,
    ),
    CareerMilestone(
      id: 'car_multiple_major_trophies',
      title: 'Win Multiple Major Trophies',
      description: 'Win multiple major trophies in your career.',
      stage: CareerStage.legend,
      target: 3,
    ),
    CareerMilestone(
      id: 'car_hall_of_fame',
      title: 'Hall of Fame Player',
      description: 'Become a Street League Hall of Fame player.',
      stage: CareerStage.legend,
      target: 1,
    ),
  ];
}

/// Career state for a player profile.
class Career {
  CareerStage stage = CareerStage.unknown;
  final List<String> teamsJoined = [];
  final List<String> tournamentsWon = [];
  final List<String> rivalries = [];
  int reputation = 0; // 0-100
  String? captainOfTeamId;
  DateTime? lastTransferDate;

  double get stageProgress {
    final milestones = allCareerMilestones()
        .where((m) => m.stage == stage)
        .toList();
    if (milestones.isEmpty) return 1.0;
    final unlocked = milestones.where((m) => m.unlocked).length;
    return unlocked / milestones.length;
  }

  bool get isLegend => stage == CareerStage.legend;

  Map<String, dynamic> toJson() => {
        'stage': stage.index,
        'teamsJoined': teamsJoined,
        'tournamentsWon': tournamentsWon,
        'rivalries': rivalries,
        'reputation': reputation,
        'captainOfTeamId': captainOfTeamId,
        'lastTransferDate': lastTransferDate?.toIso8601String(),
      };

  factory Career.fromJson(Map<String, dynamic> json) {
    final c = Career()
      ..stage = CareerStage.values[json['stage'] as int? ?? 0]
      ..teamsJoined = (json['teamsJoined'] as List? ?? []).cast<String>()
      ..tournamentsWon = (json['tournamentsWon'] as List? ?? []).cast<String>()
      ..rivalries = (json['rivalries'] as List? ?? []).cast<String>()
      ..reputation = json['reputation'] as int? ?? 0
      ..captainOfTeamId = json['captainOfTeamId'] as String?
      ..lastTransferDate = json['lastTransferDate'] != null
          ? DateTime.parse(json['lastTransferDate'] as String)
          : null;
    return c;
  }
}

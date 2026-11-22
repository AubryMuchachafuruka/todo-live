/// The player's persistent profile. One per user, survives across sessions,
/// and is the single source of truth for progression state.
import 'player_levels.dart';
import 'xp_transaction.dart';

/// Aggregated career statistics, updated from every match result.
class CareerStatistics {
  int matchesPlayed = 0;
  int matchesWon = 0;
  int matchesDrawn = 0;
  int matchesLost = 0;
  int goalsScored = 0;
  int goalsConceded = 0;
  int assists = 0;
  int pannaMoves = 0;
  int cleanSheets = 0;
  int trophiesWon = 0;
  int achievementsUnlocked = 0;
  int currentWinStreak = 0;
  int bestWinStreak = 0;
  int currentUnbeatenStreak = 0;
  int bestUnbeatenStreak = 0;
  int playerRating = 40; // every street footballer starts as an unknown
  int goalsInCurrentSeason = 0;
  int assistsInCurrentSeason = 0;
  int pannasInCurrentSeason = 0;

  int get matchesUnbeaten => matchesPlayed - matchesLost;
  double get winRate => matchesPlayed == 0 ? 0.0 : matchesWon / matchesPlayed * 100;

  Map<String, dynamic> toJson() => {
        'matchesPlayed': matchesPlayed,
        'matchesWon': matchesWon,
        'matchesDrawn': matchesDrawn,
        'matchesLost': matchesLost,
        'goalsScored': goalsScored,
        'goalsConceded': goalsConceded,
        'assists': assists,
        'pannaMoves': pannaMoves,
        'cleanSheets': cleanSheets,
        'trophiesWon': trophiesWon,
        'achievementsUnlocked': achievementsUnlocked,
        'currentWinStreak': currentWinStreak,
        'bestWinStreak': bestWinStreak,
        'currentUnbeatenStreak': currentUnbeatenStreak,
        'bestUnbeatenStreak': bestUnbeatenStreak,
        'playerRating': playerRating,
        'goalsInCurrentSeason': goalsInCurrentSeason,
        'assistsInCurrentSeason': assistsInCurrentSeason,
        'pannasInCurrentSeason': pannasInCurrentSeason,
      };

  factory CareerStatistics.fromJson(Map<String, dynamic> json) {
    final s = CareerStatistics()
      ..matchesPlayed = json['matchesPlayed'] as int? ?? 0
      ..matchesWon = json['matchesWon'] as int? ?? 0
      ..matchesDrawn = json['matchesDrawn'] as int? ?? 0
      ..matchesLost = json['matchesLost'] as int? ?? 0
      ..goalsScored = json['goalsScored'] as int? ?? 0
      ..goalsConceded = json['goalsConceded'] as int? ?? 0
      ..assists = json['assists'] as int? ?? 0
      ..pannaMoves = json['pannaMoves'] as int? ?? 0
      ..cleanSheets = json['cleanSheets'] as int? ?? 0
      ..trophiesWon = json['trophiesWon'] as int? ?? 0
      ..achievementsUnlocked = json['achievementsUnlocked'] as int? ?? 0
      ..currentWinStreak = json['currentWinStreak'] as int? ?? 0
      ..bestWinStreak = json['bestWinStreak'] as int? ?? 0
      ..currentUnbeatenStreak = json['currentUnbeatenStreak'] as int? ?? 0
      ..bestUnbeatenStreak = json['bestUnbeatenStreak'] as int? ?? 0
      ..playerRating = json['playerRating'] as int? ?? 40
      ..goalsInCurrentSeason = json['goalsInCurrentSeason'] as int? ?? 0
      ..assistsInCurrentSeason = json['assistsInCurrentSeason'] as int? ?? 0
      ..pannasInCurrentSeason = json['pannasInCurrentSeason'] as int? ?? 0;
    return s;
  }
}

/// The player profile.
class PlayerProfile {
  /// Device / account id.
  final String userId;
  String username;
  /// Local asset path for the avatar portrait.
  String? avatarAsset;
  int level;
  int xp;
  final CareerStatistics careerStatistics;
  /// Id of the team the player currently plays for.
  String? currentTeamId;
  /// Season-by-season career narrative (team, position, trophies).
  final List<String> careerHistory;
  /// Best league position ever achieved (1 = champion, 0 = none).
  int highestLeaguePosition;
  /// Achievement ids this player has unlocked.
  final List<String> unlockedAchievementIds;
  /// Trophy ids in the player's trophy room.
  final List<String> trophyIds;
  /// Titles earned, e.g. "King of the Streets", "Street Legend".
  final List<String> titles;
  /// Currently equipped title shown on the profile.
  String? activeTitle;
  final DateTime createdAt;
  DateTime updatedAt;

  PlayerProfile({
    required this.userId,
    required this.username,
    this.avatarAsset,
    this.level = 1,
    this.xp = 0,
    CareerStatistics? careerStatistics,
    this.currentTeamId,
    List<String>? careerHistory,
    this.highestLeaguePosition = 0,
    List<String>? unlockedAchievementIds,
    List<String>? trophyIds,
    List<String>? titles,
    this.activeTitle,
    DateTime? createdAt,
    DateTime? updatedAt,
  })  : careerStatistics = careerStatistics ?? CareerStatistics(),
        careerHistory = careerHistory ?? [],
        unlockedAchievementIds = unlockedAchievementIds ?? [],
        trophyIds = trophyIds ?? [],
        titles = titles ?? [],
        createdAt = createdAt ?? DateTime.now(),
        updatedAt = updatedAt ?? DateTime.now();

  /// Create a brand-new profile at Level 1 (acceptance test #1).
  factory PlayerProfile.createNew(String userId, String username) {
    return PlayerProfile(
      userId: userId,
      username: username,
      level: 1,
      xp: 0,
      careerStatistics: CareerStatistics(),
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
    );
  }

  int get levelForCurrentXp => levelForXp(xp);

  int get xpToNextLevel => xpToNextLevel(level);

  bool get isMaxLevel => level >= kMaxPlayerLevel;

  bool hasUnlocked(String achievementId) =>
      unlockedAchievementIds.contains(achievementId);

  bool hasTrophy(String trophyId) => trophyIds.contains(trophyId);

  Map<String, dynamic> toJson() => {
        'userId': userId,
        'username': username,
        'avatarAsset': avatarAsset,
        'level': level,
        'xp': xp,
        'careerStatistics': careerStatistics.toJson(),
        'currentTeamId': currentTeamId,
        'careerHistory': careerHistory,
        'highestLeaguePosition': highestLeaguePosition,
        'unlockedAchievementIds': unlockedAchievementIds,
        'trophyIds': trophyIds,
        'titles': titles,
        'activeTitle': activeTitle,
        'createdAt': createdAt.toIso8601String(),
        'updatedAt': updatedAt.toIso8601String(),
      };

  factory PlayerProfile.fromJson(Map<String, dynamic> json) {
    return PlayerProfile(
      userId: json['userId'] as String,
      username: json['username'] as String,
      avatarAsset: json['avatarAsset'] as String?,
      level: json['level'] as int? ?? 1,
      xp: json['xp'] as int? ?? 0,
      careerStatistics: CareerStatistics.fromJson(
        json['careerStatistics'] as Map? ?? {},
      ),
      currentTeamId: json['currentTeamId'] as String?,
      careerHistory: (json['careerHistory'] as List? ?? []).cast<String>(),
      highestLeaguePosition: json['highestLeaguePosition'] as int? ?? 0,
      unlockedAchievementIds: (json['unlockedAchievementIds'] as List? ?? []).cast<String>(),
      trophyIds: (json['trophyIds'] as List? ?? []).cast<String>(),
      titles: (json['titles'] as List? ?? []).cast<String>(),
      activeTitle: json['activeTitle'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
    );
  }
}

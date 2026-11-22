/// Local storage abstraction for offline progression.
///
/// All progress is saved locally for offline gameplay. When the player
/// reconnects, [syncWhenReconnected] uploads supported progress to the
/// server and merges server state.
///
/// The pure-Dart interface lives here; platform implementations
/// (shared_preferences / sqflite on mobile, in-memory for tests) implement
/// it without the UI knowing the difference.

abstract class ProgressionStore {
  Future<PlayerProfile?> loadProfile();
  Future<void> saveProfile(PlayerProfile profile);
  Future<XpLedger?> loadXpLedger();
  Future<void> saveXpLedger(XpLedger ledger);
  Future<Map<String, AchievementProgress>> loadAchievementProgress();
  Future<void> saveAchievementProgress(
      Map<String, AchievementProgress> progress);
  Future<TrophyCollection> loadTrophyCollection();
  Future<void> saveTrophyCollection(TrophyCollection collection);
  Future<SeasonHistory> loadSeasonHistory();
  Future<void> saveSeasonHistory(SeasonHistory history);
  Future<RankedService> loadRankedService();
  Future<void> saveRankedService(RankedService service);
  Future<void> saveMatchResult(MatchResult result);
  Future<List<MatchResult>> loadMatchResults();
  /// Synchronise supported progress when the player reconnects.
  Future<SyncResult> syncWhenReconnected();
}

/// Result of a sync operation.
class SyncResult {
  final bool success;
  final int uploadedMatches;
  final int downloadedAchievements;
  final String? error;
  SyncResult({
    required this.success,
    this.uploadedMatches = 0,
    this.downloadedAchievements = 0,
    this.error,
  });
}

/// In-memory store used by automated tests and by platforms without a
/// plugin available. Not persistent across process restarts.
class InMemoryProgressionStore implements ProgressionStore {
  PlayerProfile? _profile;
  XpLedger? _ledger;
  final Map<String, AchievementProgress> _progress = {};
  TrophyCollection _trophies = TrophyCollection();
  SeasonHistory _history = SeasonHistory();
  RankedService _ranked = RankedService();
  final List<MatchResult> _matches = [];

  @override
  Future<PlayerProfile?> loadProfile() async => _profile;

  @override
  Future<void> saveProfile(PlayerProfile profile) async => _profile = profile;

  @override
  Future<XpLedger?> loadXpLedger() async => _ledger;

  @override
  Future<void> saveXpLedger(XpLedger ledger) async => _ledger = ledger;

  @override
  Future<Map<String, AchievementProgress>> loadAchievementProgress() async =>
      Map.unmodifiable(_progress);

  @override
  Future<void> saveAchievementProgress(
          Map<String, AchievementProgress> progress) async {
    _progress.clear();
    _progress.addAll(progress);
  }

  @override
  Future<TrophyCollection> loadTrophyCollection() async => _trophies;

  @override
  Future<void> saveTrophyCollection(TrophyCollection collection) async =>
      _trophies = collection;

  @override
  Future<SeasonHistory> loadSeasonHistory() async => _history;

  @override
  Future<void> saveSeasonHistory(SeasonHistory history) async =>
      _history = history;

  @override
  Future<RankedService> loadRankedService() async => _ranked;

  @override
  Future<void> saveRankedService(RankedService service) async =>
      _ranked = service;

  @override
  Future<void> saveMatchResult(MatchResult result) async =>
      _matches.add(result);

  @override
  Future<List<MatchResult>> loadMatchResults() async => List.unmodifiable(_matches);

  @override
  Future<SyncResult> syncWhenReconnected() async =>
      const SyncResult(success: true);
}

/// JSON-file based store for testing persistence round-trips without Flutter.
class JsonProgressionStore {
  static PlayerProfile profileFromJson(Map<String, dynamic> json) =>
      PlayerProfile.fromJson(json);
  static Map<String, dynamic> profileToJson(PlayerProfile p) => p.toJson();
  static XpLedger ledgerFromJson(Map<String, dynamic> json) =>
      XpLedger.fromJson(json);
  static Map<String, dynamic> ledgerToJson(XpLedger l) => l.toJson();
}

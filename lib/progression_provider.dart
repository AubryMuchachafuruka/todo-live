/// Holds the live progression state and connects the gameplay engine to the
/// local store. This is the single object the UI layer talks to.
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'progression/achievement_engine.dart';
import 'progression/achievements.dart';
import 'progression/match_result.dart';
import 'progression/notifications.dart';
import 'progression/player_profile.dart';
import 'progression/persistence.dart';
import 'progression/season.dart';
import 'progression/server_verification.dart';
import 'progression/trophy_collection.dart';
import 'progression/xp_transaction.dart';

class ProgressionController extends ChangeNotifier {
  final ProgressionStore store;
  final AchievementServer server;

  PlayerProfile? _profile;
  XpLedger? _ledger;
  AchievementEngine? _engine;
  TrophyCollection _trophies = TrophyCollection();
  SeasonHistory _history = SeasonHistory();
  RankedService _ranked = RankedService();
  bool _isLoading = true;
  String? _error;

  PlayerProfile get profile => _profile!;
  XpLedger get ledger => _ledger!;
  AchievementEngine get engine => _engine!;
  TrophyCollection get trophies => _trophies;
  SeasonHistory get history => _history;
  RankedService get ranked => _ranked;
  bool get isLoading => _isLoading;
  String? get error => _error;

  ProgressionController({required this.store, required this.server});

  /// Load all progression data from local storage.
  Future<void> load() async {
    _isLoading = true;
    notifyListeners();
    try {
      _profile = await store.loadProfile() ??
          PlayerProfile.createNew('user_1', 'Street Rookie');
      _ledger = await store.loadXpLedger() ??
          XpLedger.restored(
            transactions: const [],
            creditedEventKeys: const {},
          );
      _engine = AchievementEngine(ledger: _ledger!, profile: _profile!);
      final progress = await store.loadAchievementProgress();
      // Hydrate progress into the engine.
      for (final entry in progress.entries) {
        final p = _engine!.progress[entry.key];
        if (p != null) {
          p.currentProgress = entry.value.currentProgress;
          p.unlocked = entry.value.unlocked;
          p.unlockedAt = entry.value.unlockedAt;
          p.unlockedInMatchId = entry.value.unlockedInMatchId;
        }
      }
      _trophies = await store.loadTrophyCollection();
      _history = await store.loadSeasonHistory();
      _ranked = await store.loadRankedService();
      _error = null;
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Persist everything to local storage.
  Future<void> save() async {
    if (_profile == null) return;
    await store.saveProfile(_profile!);
    await store.saveXpLedger(_ledger!);
    await store.saveAchievementProgress(Map.fromEntries(
        _engine!.progress.entries.map((e) => MapEntry(e.key, e.value))));
    await store.saveTrophyCollection(_trophies);
    await store.saveSeasonHistory(_history);
    await store.saveRankedService(_ranked);
    notifyListeners();
  }

  /// The gameplay engine (Flame) calls this when a match finishes.
  Future<EngineOutcome> onMatchFinished(MatchResult result) async {
    final outcome = _engine!.processMatchResult(result);
    await store.saveMatchResult(result);
    await save();
    return outcome;
  }

  /// End of season: evaluate milestones and awards.
  Future<SeasonOutcome> onSeasonEnd(SeasonSummary summary) async {
    final outcome = _engine!.processSeasonEnd(summary);
    _history.add(SeasonRecord(
      seasonNumber: int.tryParse(summary.seasonId.replaceAll(RegExp(r'\D'), '')) ??
          1,
      seasonName: summary.seasonName,
      startDate: DateTime.now(),
      endDate: DateTime.now(),
      identity: summary.seasonName,
      premierLeagueChampionTeam:
          summary.leagueChampion ? profile.username : 'TBD',
      premierLeagueRunnerUpTeam:
          summary.leagueRunnerUp ? profile.username : 'TBD',
      championsLeagueChampionTeam: 'TBD',
      dustCupChampionTeam: 'TBD',
      superCupChampionTeam: 'TBD',
      worldCupChampionRegion: 'TBD',
      goldenBootPlayer:
          summary.awards['goldenBoot'] == true ? profile.username : 'TBD',
      goldenGlovePlayer:
          summary.awards['goldenGlove'] == true ? profile.username : 'TBD',
      playerOfTheSeason:
          summary.awards['playerOfTheSeason'] == true ? profile.username : 'TBD',
    ));
    await save();
    return outcome;
  }

  /// Record a career event outside of matches (joined team, recruited, …).
  void recordCareerEvent(String eventId, {int? value}) {
    _engine!.recordCareerEvent(eventId, value: value);
    save();
    notifyListeners();
  }

  /// Synchronise when reconnecting: upload matches, merge verified results.
  Future<SyncResult> syncWhenReconnected() async {
    final result = await store.syncWhenReconnected();
    await save();
    notifyListeners();
    return result;
  }

  /// Submit an online result only after server verification.
  Future<bool> submitOnlineResult({
    required String matchId,
    required String winnerUserId,
    required String loserUserId,
    bool draw = false,
    required int winnerGoals,
    required int loserGoals,
    required String serverSignature,
  }) async {
    final verified = VerifiedOnlineResult(
      matchId: matchId,
      winnerUserId: winnerUserId,
      loserUserId: loserUserId,
      draw: draw,
      winnerGoals: winnerGoals,
      loserGoals: loserGoals,
      playedAt: DateTime.now(),
      serverSignature: serverSignature,
    );
    final ok = _ranked.submitVerifiedResult(verified);
    await store.saveRankedService(_ranked);
    notifyListeners();
    return ok;
  }

  List<AchievementNotification> latestNotifications(
          List<AchievementUnlocked> unlocked) =>
      notificationsFor(unlocked);
}

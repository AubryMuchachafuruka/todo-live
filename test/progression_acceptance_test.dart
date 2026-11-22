import 'package:test/test.dart';

import '../lib/progression/achievement_engine.dart';
import '../lib/progression/achievement_progress.dart';
import '../lib/progression/achievements.dart';
import '../lib/progression/match_result.dart';
import '../lib/progression/player_levels.dart';
import '../lib/progression/player_profile.dart';
import '../lib/progression/persistence.dart';
import '../lib/progression/rankings.dart';
import '../lib/progression/server_verification.dart';
import '../lib/progression/season.dart';
import '../lib/progression/trophy_collection.dart';
import '../lib/progression/xp_transaction.dart';

MatchResult leagueMatch({
  String matchId = 'm1',
  bool won = true,
  int goalsFor = 2,
  int goalsAgainst = 0,
  int playerGoals = 1,
  int playerAssists = 0,
  int playerPannas = 0,
  bool cleanSheet = true,
  bool isHome = true,
  int lastGoalMinute = 4,
  bool championsLeagueQualified = false,
  bool leagueChampion = false,
  bool leagueRunnerUp = false,
  bool promoted = false,
  bool divisionTwoChampion = false,
  bool cameFromTwoGoalsBehind = false,
  int consecutiveWins = 1,
  int consecutiveUnbeaten = 1,
  int? leaguePositionAfter,
  bool unbeatenSeason = false,
}) {
  return MatchResult(
    matchId: matchId,
    competitionId: 'premierLeague',
    seasonId: 'season_1',
    teamId: 'team_stmarys',
    teamName: 'St Mary\'s Dust Kings',
    isHome: isHome,
    won: won,
    drew: !won && goalsFor == goalsAgainst,
    lost: !won && goalsFor != goalsAgainst,
    goalsFor: goalsFor,
    goalsAgainst: goalsAgainst,
    playerGoals: playerGoals,
    playerAssists: playerAssists,
    playerPannas: playerPannas,
    cleanSheet: cleanSheet,
    lastGoalMinute: lastGoalMinute,
    matchDurationMinutes: 7,
    cameFromTwoGoalsBehind: cameFromTwoGoalsBehind,
    consecutiveWins: consecutiveWins,
    consecutiveUnbeaten: consecutiveUnbeaten,
    leaguePositionAfter: leaguePositionAfter,
    leagueChampion: leagueChampion,
    leagueRunnerUp: leagueRunnerUp,
    promoted: promoted,
    divisionTwoChampion: divisionTwoChampion,
    unbeatenSeason: unbeatenSeason,
  );
}

void main() {
  group('Level and XP system (items 1, 16)', () {
    test('acceptance #1: a new player starts at Level 1', () {
      final profile = PlayerProfile.createNew('user_1', 'Tafadzwa');
      expect(profile.level, 1);
      expect(profile.xp, 0);
      expect(titleForLevel(1), 'Street Rookie');
    });

    test('acceptance #2: completing a match awards XP', () {
      final ledger = XpLedger.restored(
          transactions: const [], creditedEventKeys: const {});
      final profile = PlayerProfile.createNew('user_1', 'Tafadzwa');
      final engine = AchievementEngine(ledger: ledger, profile: profile);
      final result = leagueMatch(playerGoals: 1, playerAssists: 1);
      final outcome = engine.processMatchResult(result);

      expect(outcome.xpTransactions.isNotEmpty, isTrue);
      expect(profile.xp, greaterThan(0));
      // win 100 + goal 25 + assist 15 + clean sheet 50 = 190
      expect(profile.xp, 190);
      expect(outcome.notifications.isNotEmpty, isTrue);
      expect(profile.unlockedAchievementIds.contains('ach_first_blood'), isTrue);
    });

    test('level titles follow the 50-level bands', () {
      expect(titleForLevel(1), 'Street Rookie');
      expect(titleForLevel(5), 'Street Rookie');
      expect(titleForLevel(6), 'Street Prospect');
      expect(titleForLevel(10), 'Street Prospect');
      expect(titleForLevel(11), 'Street Talent');
      expect(titleForLevel(20), 'Dust Warrior');
      expect(titleForLevel(30), 'Street Star');
      expect(titleForLevel(40), 'Township Legend');
      expect(titleForLevel(45), 'Zimbabwe Icon');
      expect(titleForLevel(50), 'Street Football Legend');
      expect(levelForXp(0), 1);
      expect(levelForXp(150), 2);
      expect(levelForXp(cumulativeXpForLevel(50)), 50);
    });
  });

  group('Match achievements and duplicate prevention (items 2, 11)', () {
    test('acceptance #3: first-goal achievement unlocks', () {
      final ledger = XpLedger.restored(
          transactions: const [], creditedEventKeys: const {});
      final profile = PlayerProfile.createNew('user_1', 'Tafadzwa');
      final engine = AchievementEngine(ledger: ledger, profile: profile);
      final result = leagueMatch(matchId: 'm_first_goal', playerGoals: 1);
      final outcome = engine.processMatchResult(result);

      expect(outcome.unlockedAchievements
              .any((u) => u.definition.id == 'ach_first_blood'),
          isTrue);
      expect(outcome.unlockedAchievements.first.xpAwarded, 100);
    });

    test('acceptance #11: the same match cannot award XP or achievements twice', () {
      final ledger = XpLedger.restored(
          transactions: const [], creditedEventKeys: const {});
      final profile = PlayerProfile.createNew('user_1', 'Tafadzwa');
      final engine = AchievementEngine(ledger: ledger, profile: profile);
      final result = leagueMatch(matchId: 'm_dup', playerGoals: 2);

      final first = engine.processMatchResult(result);
      final xpAfterFirst = profile.xp;
      final unlocksAfterFirst = profile.unlockedAchievementIds.length;

      // Replaying / duplicating the same match result must be a no-op.
      final second = engine.processMatchResult(result);
      expect(second.xpTransactions.isEmpty, isTrue);
      expect(second.unlockedAchievements.isEmpty, isTrue);
      expect(profile.xp, xpAfterFirst);
      expect(profile.unlockedAchievementIds.length, unlocksAfterFirst);
      expect(engine.processedMatchIds.contains('m_dup'), isTrue);

      // Direct ledger duplication is rejected too.
      expect(() => ledger.credit(
            matchId: 'm_dup',
            source: XpSource.matchGoal,
            amount: 25,
            description: 'Goal',
            eventKey: 'm_dup|goal|1',
          ), throwsA(isA<DuplicateXpEventError>()));
    });

    test('hat-trick, panna king, clean sheet and comeback unlock correctly', () {
      final ledger = XpLedger.restored(
          transactions: const [], creditedEventKeys: const {});
      final profile = PlayerProfile.createNew('user_1', 'Tafadzwa');
      final engine = AchievementEngine(ledger: ledger, profile: profile);

      final hatTrick = leagueMatch(
          matchId: 'm_ht', playerGoals: 3, cameFromTwoGoalsBehind: true);
      final o1 = engine.processMatchResult(hatTrick);
      expect(o1.unlockedAchievements.any((u) => u.definition.id == 'ach_hat_trick_hero'), isTrue);
      expect(o1.unlockedAchievements.any((u) => u.definition.id == 'ach_comeback_king'), isTrue);

      final panna = leagueMatch(matchId: 'm_p', playerPannas: 5);
      final o2 = engine.processMatchResult(panna);
      expect(o2.unlockedAchievements.any((u) => u.definition.id == 'ach_panna_king'), isTrue);

      final cs = leagueMatch(matchId: 'm_cs', playerGoals: 1, cleanSheet: true);
      final o3 = engine.processMatchResult(cs);
      expect(o3.unlockedAchievements.any((u) => u.definition.id == 'ach_clean_sheet'), isTrue);
    });
  });

  group('League milestones (item 3)', () {
    test('acceptance #4: league milestone progression', () {
      final ledger = XpLedger.restored(
          transactions: const [], creditedEventKeys: const {});
      final profile = PlayerProfile.createNew('user_1', 'Tafadzwa');
      final engine = AchievementEngine(ledger: ledger, profile: profile);

      var o = engine.processMatchResult(leagueMatch(matchId: 'l1', isHome: true, playerGoals: 1));
      expect(o.unlockedAchievements.any((u) => u.definition.id == 'ms_first_league_appearance'), isTrue);
      expect(o.unlockedAchievements.any((u) => u.definition.id == 'ms_first_league_victory'), isTrue);
      expect(o.unlockedAchievements.any((u) => u.definition.id == 'ms_first_home_victory'), isTrue);

      o = engine.processMatchResult(leagueMatch(matchId: 'l2', isHome: false));
      expect(o.unlockedAchievements.any((u) => u.definition.id == 'ms_first_away_victory'), isTrue);

      // Five consecutive wins
      for (var i = 3; i <= 6; i++) {
        o = engine.processMatchResult(leagueMatch(matchId: 'l$i'));
      }
      expect(o.unlockedAchievements.any((u) => u.definition.id == 'ms_five_consecutive_wins'), isTrue);

      // Season end: champion
      final season = engine.processSeasonEnd(const SeasonSummary(
        seasonId: 'season_1',
        seasonName: 'Season 1 – Rise of the Streets',
        leaguePosition: 1,
        leagueChampion: true,
        unbeatenSeason: true,
      ));
      expect(season.unlockedAchievements
              .any((u) => u.definition.id == 'ms_win_street_premier_league'),
          isTrue);
      expect(season.unlockedAchievements
              .any((u) => u.definition.id == 'ms_unbeaten_season'),
          isTrue);
      expect(profile.careerHistory.any((h) => h.contains('League Champions')), isTrue);
    });

    test('qualifying top four leads to Champions League qualification (acceptance #5)', () {
      final ledger = XpLedger.restored(
          transactions: const [], creditedEventKeys: const {});
      final profile = PlayerProfile.createNew('user_1', 'Tafadzwa');
      final engine = AchievementEngine(ledger: ledger, profile: profile);

      for (var i = 1; i <= 4; i++) {
        engine.processMatchResult(leagueMatch(matchId: 'q$i', won: true));
      }
      final clQual = engine.processMatchResult(leagueMatch(
        matchId: 'q_cl',
        championsLeagueQualified: true,
        won: true,
      ));
      expect(clQual.unlockedAchievements
              .any((u) => u.definition.id == 'cl_first_qualification'),
          isTrue);
    });
  });

  group('Champions League milestones and trophy (items 4, 7)', () {
    test('acceptance #6: reach and win a championship final; #7: trophy in trophy room', () {
      final ledger = XpLedger.restored(
          transactions: const [], creditedEventKeys: const {});
      final profile = PlayerProfile.createNew('user_1', 'Tafadzwa');
      final engine = AchievementEngine(ledger: ledger, profile: profile);
      final trophies = TrophyCollection();

      final clWin = MatchResult(
        matchId: 'cl_final',
        competitionId: 'championsLeague',
        seasonId: 'season_1',
        teamId: 'team_stmarys',
        teamName: 'St Mary\'s Dust Kings',
        won: true,
        wonChampionsLeagueFinal: true,
        championsLeagueTitlesTotal: 1,
      );
      final outcome = engine.processMatchResult(clWin);

      expect(outcome.unlockedAchievements
              .any((u) => u.definition.id == 'cl_win_final'),
          isTrue);
      expect(outcome.unlockedAchievements
              .any((u) => u.definition.id == 'cl_reach_final'),
          isTrue);
      expect(outcome.trophiesWon.any((t) =>
          t.competition == TrophyCompetition.championsLeague),
          isTrue);

      // Trophy appears in the player's collection.
      final trophy = outcome.trophiesWon.first;
      trophies.add(trophy);
      expect(trophies.countWon(TrophyCompetition.championsLeague), 1);
      expect(trophies.trophies.first.name, 'Street Champions League Trophy');
    });
  });

  group('Seasonal awards (item 3)', () {
    test('acceptance #8: correct seasonal award at end of season', () {
      final ledger = XpLedger.restored(
          transactions: const [], creditedEventKeys: const {});
      final profile = PlayerProfile.createNew('user_1', 'Tafadzwa');
      final engine = AchievementEngine(ledger: ledger, profile: profile);

      final season = engine.processSeasonEnd(const SeasonSummary(
        seasonId: 'season_1',
        seasonName: 'Season 1',
        leaguePosition: 1,
        leagueChampion: true,
        awards: {'playerOfTheSeason': true, 'goldenBoot': true},
      ));
      expect(season.awardsEarned.contains('playerOfTheSeason'), isTrue);
      expect(season.awardsEarned.contains('goldenBoot'), isTrue);
      expect(season.notifications.any((n) =>
          n == 'award_player_of_the_season'), isTrue);
      expect(profile.careerHistory.any((h) => h.contains('Season 1')), isTrue);
    });
  });

  group('Career history (item 9)', () {
    test('acceptance #9: career history records results', () {
      final ledger = XpLedger.restored(
          transactions: const [], creditedEventKeys: const {});
      final profile = PlayerProfile.createNew('user_1', 'Tafadzwa');
      final engine = AchievementEngine(ledger: ledger, profile: profile);
      engine.processMatchResult(leagueMatch(matchId: 'h1', playerGoals: 2));
      expect(profile.careerHistory.isNotEmpty, isTrue);
      expect(profile.careerHistory.first.contains('Won'), isTrue);
    });
  });

  group('Persistence round-trip (acceptance #10)', () {
    test('profile, ledger, trophies and season history survive close/reopen', () {
      // Profile round-trip
      final profile = PlayerProfile.createNew('user_1', 'Tafadzwa');
      profile.xp = 250;
      profile.level = levelForXp(profile.xp);
      profile.unlockedAchievementIds.add('ach_first_blood');
      profile.trophyIds.add('trophy_champions_league_season_1');
      profile.careerHistory
          .add('season_1 • Premier League • Won 2-0 vs Zengeza Kings');
      profile.highestLeaguePosition = 1;

      final restored = PlayerProfile.fromJson(profile.toJson());
      expect(restored.level, profile.level);
      expect(restored.xp, profile.xp);
      expect(restored.unlockedAchievementIds, profile.unlockedAchievementIds);
      expect(restored.trophyIds, profile.trophyIds);
      expect(restored.careerHistory, profile.careerHistory);
      expect(restored.highestLeaguePosition, 1);

      // Ledger round-trip
      final ledger = XpLedger.restored(
          transactions: const [], creditedEventKeys: const {});
      ledger.credit(matchId: 'm1', source: XpSource.matchGoal, amount: 25,
          description: 'Goal', eventKey: 'm1|goal|1');
      final ledger2 = XpLedger.fromJson(ledger.toJson());
      expect(ledger2.totalXp, 25);
      expect(ledger2.hasCredited('m1|goal|1'), isTrue);

      // Trophy collection round-trip
      final col = TrophyCollection();
      col.add(const Trophy(
        id: 'trophy_dust_cup_season_1',
        name: 'Dust Cup Trophy',
        competition: TrophyCompetition.dustCup,
        competitionName: 'Dust Cup',
        season: 'season_1',
        teamId: 't1',
        teamName: 'St Mary\'s Dust Kings',
        dateWon: DateTime(2026, 5, 30),
        illustrationAsset: 'assets/images/trophies/dust_cup.png',
      ));
      final col2 = TrophyCollection()..fromJson(col.toJson());
      expect(col2.countWon(TrophyCompetition.dustCup), 1);
      expect(col2.trophies.first.name, 'Dust Cup Trophy');

      // Season history round-trip
      final history = SeasonHistory();
      history.add(const SeasonRecord(
        seasonNumber: 1,
        seasonName: 'Season 1 – Rise of the Streets',
        startDate: DateTime(2026, 1, 15),
        endDate: DateTime(2026, 5, 30),
        identity: 'Season 1 – Rise of the Streets',
        premierLeagueChampionTeam: 'St Mary\'s Dust Kings',
        premierLeagueRunnerUpTeam: 'Zengeza Kings',
        championsLeagueChampionTeam: 'St Mary\'s Dust Kings',
        dustCupChampionTeam: 'Mbare MaGhetto',
        superCupChampionTeam: 'St Mary\'s Dust Kings',
        worldCupChampionRegion: 'Harare',
        goldenBootPlayer: 'Tafadzwa Moyo',
        goldenGlovePlayer: 'Tawanda Dube',
        playerOfTheSeason: 'Tafadzwa Moyo',
        streetLegendCount: 1,
      ));
      final history2 = SeasonHistory.fromJson(history.toJson());
      expect(history2.records.length, 1);
      expect(history2.latest?.premierLeagueChampionTeam,
          'St Mary\'s Dust Kings');
      expect(history2.championsBySeason.isNotEmpty, isTrue);
    });
  });

  group('Online rankings are server-verified (item 14, acceptance #12)', () {
    test('unverified offline results never affect online rankings', () {
      final service = RankedService();
      final p = service.getOrCreate('u1', 'Tafadzwa', region: 'Zimbabwe');
      final before = p.mmr;

      // Empty signature = unverified → rejected.
      expect(service.submitVerifiedResult(const VerifiedOnlineResult(
        matchId: 'om1',
        winnerUserId: 'u1',
        loserUserId: 'u2',
        winnerGoals: 2,
        loserGoals: 1,
        playedAt: DateTime.now(),
        serverSignature: '',
      )), isFalse);
      expect(service.players.first.mmr, before);

      // Duplicate verified result is rejected.
      expect(service.submitVerifiedResult(const VerifiedOnlineResult(
        matchId: 'om2',
        winnerUserId: 'u1',
        loserUserId: 'u2',
        winnerGoals: 3,
        loserGoals: 1,
        playedAt: DateTime.now(),
        serverSignature: 'sig_om2',
      )), isTrue);
      expect(service.submitVerifiedResult(const VerifiedOnlineResult(
        matchId: 'om2',
        winnerUserId: 'u1',
        loserUserId: 'u2',
        winnerGoals: 3,
        loserGoals: 1,
        playedAt: DateTime.now(),
        serverSignature: 'sig_om2',
      )), isFalse);

      // Leaderboard ordered by MMR, not matches played.
      final a = service.getOrCreate('a', 'A', region: 'Zimbabwe');
      final b = service.getOrCreate('b', 'B', region: 'Zimbabwe');
      a.mmr = 4000;
      b.mmr = 1000;
      final board = service.leaderboard(LeaderboardScope.zimbabwe);
      expect(board.first.player.userId, 'a');
    });

    test('stub server verifies and signs results', () async {
      final server = StubAchievementServer();
      final verification = await server.verifyMatchResult({
        'matchId': 'om9',
        'winner': 'u1',
      });
      expect(verification.accepted, isTrue);
      expect(verification.signature, 'sig_om9');
    });
  });

  group('Streak and cumulative progress', () {
    test('unbeatable progress tracks the unbeaten run', () {
      final ledger = XpLedger.restored(
          transactions: const [], creditedEventKeys: const {});
      final profile = PlayerProfile.createNew('user_1', 'Tafadzwa');
      final engine = AchievementEngine(ledger: ledger, profile: profile);

      // 9 unbeaten league matches -> not unlocked yet, progress = 9.
      for (var i = 1; i <= 9; i++) {
        engine.processMatchResult(leagueMatch(matchId: 'u$i', won: true));
      }
      final p = engine.progress['ach_unbeatable']!;
      expect(p.unlocked, isFalse);
      expect(p.currentProgress, 9);

      // 10th -> unlocked.
      final outcome = engine.processMatchResult(leagueMatch(matchId: 'u10'));
      expect(outcome.unlockedAchievements
              .any((u) => u.definition.id == 'ach_unbeatable'),
          isTrue);
    });
  });
}

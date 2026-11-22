/// The STREET LEAGUE achievement engine.
///
/// It consumes [MatchResult] facts from the gameplay engine (or the
/// multiplayer host), updates career statistics, awards XP with duplicate
/// prevention, evaluates every achievement/milestone condition, and returns
/// the list of newly unlocked achievements plus any trophies won.
///
/// Screens never hardcode notifications — they observe [EngineOutcome] and
/// present it through the achievement notification overlay.

import 'achievements.dart';
import 'match_result.dart';
import 'player_profile.dart';
import 'trophy_collection.dart';
import 'xp_transaction.dart';

/// Snapshot of running progression state handed to condition evaluation.
class ProgressionContext {
  final PlayerProfile profile;
  final CareerStatistics stats;
  /// Career goals before the current match was applied.
  final int careerGoalsBefore;
  /// Career matches before the current match was applied.
  final int careerMatchesBefore;
  /// This season's match results for the player's team.
  final List<MatchResult> seasonMatchResults;
  /// Running competition totals maintained by the engine.
  final CompetitionState competitionState;
  /// Current season, if any.
  final String? seasonId;
  /// Career events recorded outside match results (joined team, recruited, …).
  final Set<String> careerEvents;

  ProgressionContext({
    required this.profile,
    required this.stats,
    required this.careerGoalsBefore,
    required this.careerMatchesBefore,
    required this.seasonMatchResults,
    required this.competitionState,
    this.seasonId,
    Set<String>? careerEvents,
  }) : careerEvents = careerEvents ?? {};
}

/// Running competition totals maintained by the engine from match results.
class CompetitionState {
  int leagueTitles = 0;
  int consecutiveLeagueTitles = 0;
  int clTitles = 0;
  int consecutiveClTitles = 0;
  int dustCupTitles = 0;
  int superCupTitles = 0;
  int worldCupTitles = 0;
  int consecutiveWorldCupTitles = 0;
  int leagueAppearances = 0;
  int leagueWins = 0;
  int homeLeagueWins = 0;
  int awayLeagueWins = 0;
  int dustCupAppearances = 0;
  int superCupAppearances = 0;
  int worldCupAppearances = 0;
  int clAppearances = 0;
  int clQualifications = 0;
  int groupStageWins = 0;
  bool regionalSelected = false;

  bool allFiveWonCareer() =>
      leagueTitles > 0 &&
      clTitles > 0 &&
      dustCupTitles > 0 &&
      superCupTitles > 0 &&
      worldCupTitles > 0;

  int get majorTrophyCount =>
      leagueTitles + clTitles + dustCupTitles + superCupTitles + worldCupTitles;
}

/// Outcome of processing one match through the engine.
class EngineOutcome {
  final List<XpTransaction> xpTransactions;
  final List<AchievementUnlocked> unlockedAchievements;
  final List<AchievementProgress> updatedProgress;
  final List<Trophy> trophiesWon;
  final List<String> titlesEarned;
  final List<String> notifications;
  final CareerStatistics updatedStats;
  final CompetitionState updatedState;

  EngineOutcome({
    required this.xpTransactions,
    required this.unlockedAchievements,
    required this.updatedProgress,
    required this.trophiesWon,
    required this.titlesEarned,
    required this.notifications,
    required this.updatedStats,
    required this.updatedState,
  });

  bool get hasAnything =>
      xpTransactions.isNotEmpty ||
      unlockedAchievements.isNotEmpty ||
      trophiesWon.isNotEmpty ||
      titlesEarned.isNotEmpty;
}

/// Result of season-end evaluation.
class SeasonOutcome {
  final List<AchievementUnlocked> unlockedAchievements;
  final List<AchievementProgress> updatedProgress;
  final List<String> awardsEarned;
  final List<String> notifications;
  final List<Trophy> trophiesWon;
  SeasonOutcome({
    required this.unlockedAchievements,
    required this.updatedProgress,
    required this.awardsEarned,
    required this.notifications,
    required this.trophiesWon,
  });
}

/// Summary handed to [AchievementEngine.processSeasonEnd].
class SeasonSummary {
  final String seasonId;
  final String seasonName;
  final int leaguePosition; // 0 = not in league / N/A
  final bool leagueChampion;
  final bool leagueRunnerUp;
  final bool promoted;
  final bool relegated;
  final bool divisionTwoChampion;
  final bool unbeatenSeason;
  final Map<String, bool> awards; // 'goldenBoot', 'goldenGlove', …

  const SeasonSummary({
    required this.seasonId,
    required this.seasonName,
    this.leaguePosition = 0,
    this.leagueChampion = false,
    this.leagueRunnerUp = false,
    this.promoted = false,
    this.relegated = false,
    this.divisionTwoChampion = false,
    this.unbeatenSeason = false,
    this.awards = const {},
  });
}

class AchievementEngine {
  final XpLedger ledger;
  final PlayerProfile profile;
  final Map<String, AchievementDefinition> _definitionsById;
  final Map<String, AchievementProgress> _progress = {};
  final CompetitionState _state = CompetitionState();
  final Set<String> _processedMatchIds = {};
  final List<MatchResult> _recentResults = [];
  final Set<String> _careerEvents = {};
  bool _seasonSweep = false;

  /// Matches already processed this session (dedup across matches).
  Set<String> get processedMatchIds => Set.unmodifiable(_processedMatchIds);
  Map<String, AchievementProgress> get progress => Map.unmodifiable(_progress);
  CompetitionState get state => _state;

  AchievementEngine({
    required this.ledger,
    required this.profile,
    List<AchievementDefinition>? definitions,
  }) : _definitionsById = {
          for (final d in definitions ?? allAchievementDefinitions()) d.id: d
        } {
    _initProgress();
  }

  void _initProgress() {
    for (final def in _definitionsById.values) {
      _progress[def.id] = AchievementProgress.fromDefinition(def);
    }
    for (final id in profile.unlockedAchievementIds) {
      final p = _progress[id];
      if (p != null) {
        p.unlocked = true;
        p.currentProgress = p.target;
      }
    }
  }

  // ━━━━━━━━━━━━━━━━━━━ Match processing ━━━━━━━━━━━━━━━━━━━

  /// Process one match result. Returns everything the UI must react to.
  /// The same [matchId] processed twice yields an empty outcome — duplicate
  /// match results can never award XP or achievements twice.
  EngineOutcome processMatchResult(MatchResult result) {
    if (_processedMatchIds.contains(result.matchId)) {
      return EngineOutcome(
        xpTransactions: const [],
        unlockedAchievements: const [],
        updatedProgress: const [],
        trophiesWon: const [],
        titlesEarned: const [],
        notifications: const [],
        updatedStats: profile.careerStatistics,
        updatedState: _state,
      );
    }
    _processedMatchIds.add(result.matchId);
    _recentResults.add(result);
    if (_recentResults.length > 500) {
      _recentResults.removeRange(0, _recentResults.length - 500);
    }

    final xpTransactions = <XpTransaction>[];
    final unlocked = <AchievementUnlocked>[];
    final updatedProgress = <AchievementProgress>[];
    final trophies = <Trophy>[];
    final titles = <String>[];

    // ━ Apply career statistics once per match.
    _applyStats(result);

    final context = ProgressionContext(
      profile: profile,
      stats: profile.careerStatistics,
      careerGoalsBefore: profile.careerStatistics.goalsScored - result.playerGoals,
      careerMatchesBefore: profile.careerStatistics.matchesPlayed - 1,
      seasonMatchResults: _seasonResultsFor(result.seasonId),
      competitionState: _state,
      seasonId: result.seasonId,
      careerEvents: _careerEvents,
    );

    // ━ Award gameplay XP (each event keyed to prevent duplicates).
    if (result.won) {
      xpTransactions.add(ledger.credit(
        matchId: result.matchId,
        source: XpSource.matchWin,
        amount: XpRewards.matchWin,
        description: 'Match victory',
        eventKey: '${result.matchId}|win',
        metadata: {
          'competition': result.competitionId,
          'season': result.seasonId,
          'opponent': result.teamName,
        },
      ));
    }
    for (var i = 1; i <= result.playerGoals; i++) {
      xpTransactions.add(ledger.credit(
        matchId: result.matchId,
        source: XpSource.matchGoal,
        amount: XpRewards.matchGoal,
        description: 'Goal $i',
        eventKey: '${result.matchId}|goal|$i',
        metadata: {'sequence': i, 'competition': result.competitionId},
      ));
    }
    for (var i = 1; i <= result.playerAssists; i++) {
      xpTransactions.add(ledger.credit(
        matchId: result.matchId,
        source: XpSource.matchAssist,
        amount: XpRewards.matchAssist,
        description: 'Assist $i',
        eventKey: '${result.matchId}|assist|$i',
        metadata: {'sequence': i, 'competition': result.competitionId},
      ));
    }
    for (var i = 1; i <= result.playerPannas; i++) {
      xpTransactions.add(ledger.credit(
        matchId: result.matchId,
        source: XpSource.matchPanna,
        amount: XpRewards.matchPanna,
        description: 'Panna $i',
        eventKey: '${result.matchId}|panna|$i',
        metadata: {'sequence': i, 'competition': result.competitionId},
      ));
    }
    if (result.cleanSheet) {
      xpTransactions.add(ledger.credit(
        matchId: result.matchId,
        source: XpSource.cleanSheet,
        amount: XpRewards.cleanSheet,
        description: 'Clean sheet',
        eventKey: '${result.matchId}|cleansheet',
        metadata: {'competition': result.competitionId},
      ));
    }

    // Apply XP to the profile and level up.
    for (final tx in xpTransactions) {
      profile.xp += tx.amount;
    }
    profile.level = levelForXp(profile.xp).clamp(1, kMaxPlayerLevel);
    profile.updatedAt = DateTime.now();

    // ━ Update running competition state.
    _updateCompetitionState(result);

    // ━ Evaluate every locked achievement.
    for (final def in _definitionsById.values) {
      final p = _progress[def.id];
      if (p == null || p.unlocked) continue;
      final conditionMet = _conditionMet(def, result, context);
      if (conditionMet) {
        _unlock(def, result.matchId, unlocked, updatedProgress);
        titles.addAll(_awardTitles(def));
      } else {
        _setProgress(def, result, context, p, updatedProgress);
      }
    }

    // ━ Trophies for competition wins (deduplicated by season).
    if (result.leagueChampion && result.competitionId == 'premierLeague') {
      final t = _trophyForWin(
        TrophyCompetition.premierLeague,
        'Street Premier League Trophy',
        'Street Premier League',
        result.seasonId,
        result.teamId,
        result.teamName,
      );
      if (t != null) trophies.add(t);
    }
    if (result.wonChampionsLeagueFinal) {
      final t = _trophyForWin(
        TrophyCompetition.championsLeague,
        'Street Champions League Trophy',
        'Street Champions League',
        result.seasonId,
        result.teamId,
        result.teamName,
      );
      if (t != null) trophies.add(t);
    }
    if (result.wonDustCup) {
      final t = _trophyForWin(
        TrophyCompetition.dustCup,
        'Dust Cup Trophy',
        'Dust Cup',
        result.seasonId,
        result.teamId,
        result.teamName,
      );
      if (t != null) trophies.add(t);
    }
    if (result.wonSuperCup) {
      final t = _trophyForWin(
        TrophyCompetition.superCup,
        'Street Super Cup Trophy',
        'Street Super Cup',
        result.seasonId,
        result.teamId,
        result.teamName,
      );
      if (t != null) trophies.add(t);
    }
    if (result.wonWorldCup) {
      final t = _trophyForWin(
        TrophyCompetition.worldCup,
        'Zimbabwe Street World Cup Trophy',
        'Zimbabwe Street World Cup',
        result.seasonId,
        result.teamId,
        result.teamName,
      );
      if (t != null) trophies.add(t);
    }

    // ━ Street Legend / Undisputed Street King.
    _checkStreetLegend(unlocked, updatedProgress, titles);

    profile.careerHistory.add(_careerSummaryLine(result));

    return EngineOutcome(
      xpTransactions: xpTransactions,
      unlockedAchievements: unlocked,
      updatedProgress: updatedProgress,
      trophiesWon: trophies,
      titlesEarned: titles,
      notifications: unlocked.map((u) => u.definition.id).toList(),
      updatedStats: profile.careerStatistics,
      updatedState: _state,
    );
  }

  void _applyStats(MatchResult r) {
    final s = profile.careerStatistics;
    s.matchesPlayed++;
    if (r.won) {
      s.matchesWon++;
      s.currentWinStreak++;
      s.bestWinStreak = s.bestWinStreak < s.currentWinStreak
          ? s.currentWinStreak
          : s.bestWinStreak;
      s.currentUnbeatenStreak++;
    } else if (r.drew) {
      s.matchesDrawn++;
      s.currentWinStreak = 0;
      s.currentUnbeatenStreak++;
    } else {
      s.matchesLost++;
      s.currentWinStreak = 0;
      s.currentUnbeatenStreak = 0;
    }
    s.bestUnbeatenStreak = s.bestUnbeatenStreak < s.currentUnbeatenStreak
        ? s.currentUnbeatenStreak
        : s.bestUnbeatenStreak;
    s.goalsScored += r.playerGoals;
    s.goalsConceded += r.goalsAgainst;
    s.assists += r.playerAssists;
    s.pannaMoves += r.playerPannas;
    if (r.cleanSheet) s.cleanSheets++;
    if (r.playerRatingAfter > s.playerRating) {
      s.playerRating = r.playerRatingAfter;
    }
    s.goalsInCurrentSeason += r.playerGoals;
    s.assistsInCurrentSeason += r.playerAssists;
    s.pannasInCurrentSeason += r.playerPannas;
    s.trophiesWon = profile.trophyIds.length;
    s.achievementsUnlocked =
        _progress.values.where((p) => p.unlocked).length;
  }

  void _updateCompetitionState(MatchResult r) {
    switch (r.competitionId) {
      case 'premierLeague':
        _state.leagueAppearances++;
        if (r.won) _state.leagueWins++;
        if (r.won && r.isHome) _state.homeLeagueWins++;
        if (r.won && !r.isHome) _state.awayLeagueWins++;
        if (r.leagueChampion) {
          _state.leagueTitles++;
          _state.consecutiveLeagueTitles++;
        }
        break;
      case 'divisionTwo':
        if (r.divisionTwoChampion) {
          _state.leagueTitles++;
          _state.consecutiveLeagueTitles++;
        }
        break;
      case 'championsLeague':
        _state.clAppearances++;
        if (r.championsLeagueQualified) _state.clQualifications++;
        if (r.groupStageWin) _state.groupStageWins++;
        if (r.wonChampionsLeagueFinal) {
          _state.clTitles++;
          _state.consecutiveClTitles++;
        }
        break;
      case 'dustCup':
        _state.dustCupAppearances++;
        if (r.wonDustCup) _state.dustCupTitles++;
        break;
      case 'superCup':
        _state.superCupAppearances++;
        if (r.wonSuperCup) _state.superCupTitles++;
        break;
      case 'worldCup':
        _state.worldCupAppearances++;
        if (r.wonWorldCup) {
          _state.worldCupTitles++;
          _state.consecutiveWorldCupTitles++;
        }
        break;
    }
  }

  List<MatchResult> _seasonResultsFor(String? seasonId) {
    if (seasonId == null || seasonId.isEmpty) return [];
    return _recentResults.where((m) => m.seasonId == seasonId).toList();
  }

  bool _conditionMet(
      AchievementDefinition def, MatchResult result, ProgressionContext c) {
    switch (def.id) {
      // ━ Match achievements
      case 'ach_first_blood':
        return result.playerGoals >= 1 && c.careerGoalsBefore == 0;
      case 'ach_hat_trick_hero':
        return result.playerGoals >= 3;
      case 'ach_four_goal_night':
        return result.playerGoals >= 4;
      case 'ach_panna_king':
        return result.playerPannas >= 5;
      case 'ach_wall_master':
        return result.wallReboundGoal;
      case 'ach_last_second_hero':
        final threshold = result.matchDurationMinutes - 1;
        return result.lastGoalMinute >= threshold;
      case 'ach_clean_sheet':
        return result.cleanSheet;
      case 'ach_comeback_king':
        return result.cameFromTwoGoalsBehind;
      case 'ach_street_playmaker':
        return result.playerAssists >= 3;
      case 'ach_unbeatable':
        return _currentUnbeatenRun(c) >= def.target;

      // ━ League milestones
      case 'ms_first_league_appearance':
        return _isLeague(result) && _state.leagueAppearances >= 1;
      case 'ms_first_league_victory':
        return _isLeague(result) && result.won && _state.leagueWins >= 1;
      case 'ms_first_home_victory':
        return _isLeague(result) &&
            result.won &&
            result.isHome &&
            _state.homeLeagueWins >= 1;
      case 'ms_first_away_victory':
        return _isLeague(result) &&
            result.won &&
            !result.isHome &&
            _state.awayLeagueWins >= 1;
      case 'ms_five_consecutive_wins':
        return _isLeague(result) &&
            result.won &&
            _consecutiveLeagueWins >= 5;
      case 'ms_ten_consecutive_wins':
        return _isLeague(result) &&
            result.won &&
            _consecutiveLeagueWins >= 10;
      case 'ms_win_division_two':
        return result.divisionTwoChampion;
      case 'ms_earn_promotion':
        return result.promoted;
      case 'ms_win_street_premier_league':
        return result.leagueChampion &&
            result.competitionId == 'premierLeague';
      case 'ms_win_league_twice':
        return _state.leagueTitles >= 2;
      case 'ms_three_consecutive_titles':
        return _state.consecutiveLeagueTitles >= 3;
      case 'ms_unbeaten_season':
        return false; // evaluated at season end

      // ━ Champions League milestones
      case 'cl_first_qualification':
        return result.championsLeagueQualified &&
            _state.clQualifications >= 1;
      case 'cl_first_appearance':
        return _state.clAppearances >= 1;
      case 'cl_first_group_stage_victory':
        return result.groupStageWin && _state.groupStageWins >= 1;
      case 'cl_finish_top_of_group':
        return result.finishedTopOfGroup;
      case 'cl_qualify_quarter_finals':
        return result.qualifiedQuarterFinals;
      case 'cl_reach_semi_finals':
        return result.reachedSemiFinals;
      case 'cl_reach_final':
        return result.reachedFinal;
      case 'cl_win_final':
        return result.wonChampionsLeagueFinal;
      case 'cl_win_twice':
        return _state.clTitles >= 2;
      case 'cl_defend_championship':
        return _state.consecutiveClTitles >= 2;
      case 'cl_win_three':
        return _state.clTitles >= 3;
      case 'cl_unbeaten_campaign':
        return result.unbeatenChampionsCampaign;

      // ━ Dust Cup milestones
      case 'dc_first_appearance':
        return _state.dustCupAppearances >= 1;
      case 'dc_win_first_round':
        return result.dustCupFirstRoundWin;
      case 'dc_reach_round_of_16':
        return result.reachedRoundOf16;
      case 'dc_reach_quarter_finals':
        return result.reachedDustQuarterFinals;
      case 'dc_reach_semi_finals':
        return result.reachedDustSemiFinals;
      case 'dc_reach_final':
        return result.reachedDustFinal;
      case 'dc_win_dust_cup':
        return result.wonDustCup;
      case 'dc_giant_killer':
        return result.defeatedHigherRatedTeam &&
            result.opponentRatingDifference >= 15;
      case 'dc_win_three_times':
        return _state.dustCupTitles >= 3;
      case 'dc_unbeaten_campaign':
        return result.unbeatenDustCampaign;

      // ━ Super Cup milestones
      case 'sc_first_appearance':
        return _state.superCupAppearances >= 1;
      case 'sc_finalist':
        return result.superCupFinalist;
      case 'sc_winner':
        return result.wonSuperCup;
      case 'sc_win_three_times':
        return _state.superCupTitles >= 3;
      case 'sc_double_winner':
        return result.wonBothQualifyingCompetitions;

      // ━ World Cup milestones
      case 'wc_first_regional_selection':
        return _state.regionalSelected;
      case 'wc_first_appearance':
        return _state.worldCupAppearances >= 1;
      case 'wc_win_group':
        return result.worldCupGroupWin;
      case 'wc_reach_quarter_finals':
        return result.reachedWorldCupQuarterFinals;
      case 'wc_reach_semi_finals':
        return result.reachedWorldCupSemiFinals;
      case 'wc_reach_final':
        return result.reachedWorldCupFinal;
      case 'wc_win_world_cup':
        return result.wonWorldCup;
      case 'wc_top_scorer':
        return result.worldCupTopScorer;
      case 'wc_best_player':
        return result.worldCupBestPlayer;
      case 'wc_defend_title':
        return result.defendedWorldCup;

      // ━ Street Legend
      case 'sl_street_legend':
        return _state.allFiveWonCareer();
      case 'sl_undisputed_street_king':
        return _seasonSweep;

      // ━ Career milestones
      case 'car_join_team':
        return _careerEvents.contains('joined_team');
      case 'car_first_five_matches':
        return c.careerMatchesBefore + 1 >= 5;
      case 'car_first_goal':
        return result.playerGoals >= 1 && c.careerGoalsBefore == 0;
      case 'car_rating_70':
        return result.playerRatingAfter >= 70;
      case 'car_regular_starter':
        return _careerEvents.contains('regular_starter');
      case 'car_first_local_tournament':
        return _careerEvents.contains('first_local_tournament_win');
      case 'car_rating_80':
        return result.playerRatingAfter >= 80;
      case 'car_recruited':
        return _careerEvents.contains('recruited');
      case 'car_regional_win':
        return _careerEvents.contains('regional_win');
      case 'car_rating_90':
        return result.playerRatingAfter >= 90;
      case 'car_captain':
        return _careerEvents.contains('captain');
      case 'car_major_championship':
        return result.isCupFinal || result.leagueChampion;
      case 'car_rating_95':
        return result.playerRatingAfter >= 95;
      case 'car_multiple_major_trophies':
        return _state.majorTrophyCount >= 3;
      case 'car_hall_of_fame':
        return _careerEvents.contains('hall_of_fame');

      default:
        return false;
    }
  }

  int get _consecutiveLeagueWins {
    var run = 0;
    for (var i = _recentResults.length - 1; i >= 0; i--) {
      final m = _recentResults[i];
      if (_isLeague(m) && m.won) {
        run++;
      } else if (_isLeague(m)) {
        break;
      }
    }
    return run;
  }

  int _currentUnbeatenRun(ProgressionContext c) {
    var run = 0;
    for (var i = c.seasonMatchResults.length - 1; i >= 0; i--) {
      final m = c.seasonMatchResults[i];
      if (m.won || m.drew) {
        run++;
      } else {
        break;
      }
    }
    return run;
  }

  bool _isLeague(MatchResult r) =>
      r.competitionId == 'premierLeague' || r.competitionId == 'divisionTwo';

  void _setProgress(AchievementDefinition def, MatchResult result,
      ProgressionContext c, AchievementProgress p, List<AchievementProgress> out) {
    switch (def.id) {
      case 'ach_hat_trick_hero':
      case 'ach_four_goal_night':
      case 'ach_first_blood':
        p.currentProgress = result.playerGoals;
        break;
      case 'ach_panna_king':
        p.currentProgress = result.playerPannas;
        break;
      case 'ach_street_playmaker':
        p.currentProgress = result.playerAssists;
        break;
      case 'ach_unbeatable':
        p.currentProgress = _currentUnbeatenRun(c);
        break;
      case 'ms_win_league_twice':
        p.currentProgress = _state.leagueTitles;
        break;
      case 'ms_three_consecutive_titles':
        p.currentProgress = _state.consecutiveLeagueTitles;
        break;
      case 'cl_win_twice':
        p.currentProgress = _state.clTitles;
        break;
      case 'cl_win_three':
        p.currentProgress = _state.clTitles;
        break;
      case 'dc_win_three_times':
        p.currentProgress = _state.dustCupTitles;
        break;
      case 'sc_win_three_times':
        p.currentProgress = _state.superCupTitles;
        break;
      case 'car_multiple_major_trophies':
        p.currentProgress = _state.majorTrophyCount;
        break;
      case 'car_rating_70':
      case 'car_rating_80':
      case 'car_rating_90':
      case 'car_rating_95':
        p.currentProgress = result.playerRatingAfter;
        break;
      default:
        break;
    }
    if (!p.unlocked) out.add(p);
  }

  void _unlock(AchievementDefinition def, String? matchId,
      List<AchievementUnlocked> out, List<AchievementProgress> progressOut) {
    final p = _progress[def.id]!;
    p.unlocked = true;
    p.unlockedAt = DateTime.now();
    p.unlockedInMatchId = matchId;
    p.currentProgress = p.target;
    profile.unlockedAchievementIds.add(def.id);
    profile.xp += def.xpReward;
    profile.careerStatistics.achievementsUnlocked =
        _progress.values.where((x) => x.unlocked).length;
    out.add(AchievementUnlocked(
      definition: def,
      unlockedAt: p.unlockedAt!,
      matchId: matchId,
      xpAwarded: def.xpReward,
    ));
    progressOut.add(p);
  }

  List<String> _awardTitles(AchievementDefinition def) {
    switch (def.id) {
      case 'sc_winner':
        return ['King of the Streets'];
      case 'sl_street_legend':
        return ['Street Legend'];
      case 'sl_undisputed_street_king':
        return ['Undisputed Street King'];
      default:
        return const [];
    }
  }

  void _checkStreetLegend(
      List<AchievementUnlocked> out,
      List<AchievementProgress> progressOut,
      List<String> titles) {
    if (_state.allFiveWonCareer() &&
        !profile.unlockedAchievementIds.contains('sl_street_legend')) {
      final def = _definitionsById['sl_street_legend']!;
      _unlock(def, null, out, progressOut);
      titles.addAll(_awardTitles(def));
    }
    if (_seasonSweep &&
        !profile.unlockedAchievementIds.contains('sl_undisputed_street_king')) {
      final def = _definitionsById['sl_undisputed_street_king']!;
      _unlock(def, null, out, progressOut);
      titles.addAll(_awardTitles(def));
    }
  }

  String _careerSummaryLine(MatchResult r) {
    final competition =
        r.competitionId[0].toUpperCase() + r.competitionId.substring(1);
    final resultText = r.won ? 'Won' : r.drew ? 'Drew' : 'Lost';
    return '${r.seasonId} • $competition • $resultText ${r.goalsFor}-${r.goalsAgainst} vs ${r.teamName}';
  }

  // ━━━━━━━━━━━━━━━━━ Season end ━━━━━━━━━━━━━━━━━━━━

  /// Evaluate season-end milestones and seasonal awards.
  SeasonOutcome processSeasonEnd(SeasonSummary summary) {
    final unlocked = <AchievementUnlocked>[];
    final updatedProgress = <AchievementProgress>[];
    final awards = <String>[];
    final notifications = <String>[];
    final trophies = <Trophy>[];

    if (summary.leagueChampion) {
      _state.consecutiveLeagueTitles++;
    } else {
      _state.consecutiveLeagueTitles = 0;
    }

    final c = ProgressionContext(
      profile: profile,
      stats: profile.careerStatistics,
      careerGoalsBefore: profile.careerStatistics.goalsScored,
      careerMatchesBefore: profile.careerStatistics.matchesPlayed,
      seasonMatchResults: _seasonResultsFor(summary.seasonId),
      competitionState: _state,
      seasonId: summary.seasonId,
      careerEvents: _careerEvents,
    );

    final leagueMilestones = <String, bool>{
      'ms_reach_top_four':
          summary.leaguePosition > 0 && summary.leaguePosition <= 4,
      'ms_finish_top_three':
          summary.leaguePosition > 0 && summary.leaguePosition <= 3,
      'ms_finish_runner_up': summary.leagueRunnerUp,
      'ms_win_street_premier_league': summary.leagueChampion,
      'ms_unbeaten_season': summary.unbeatenSeason,
      'ms_win_division_two': summary.divisionTwoChampion,
      'ms_earn_promotion': summary.promoted,
    };
    for (final entry in leagueMilestones.entries) {
      if (!entry.value) continue;
      final def = _definitionsById[entry.key];
      if (def == null || _progress[def.id]!.unlocked) continue;
      _unlock(def, null, unlocked, updatedProgress);
      notifications.add(def.id);
    }

    if (_state.consecutiveLeagueTitles >= 3 &&
        !_progress['ms_three_consecutive_titles']!.unlocked) {
      final def = _definitionsById['ms_three_consecutive_titles']!;
      _unlock(def, null, unlocked, updatedProgress);
      notifications.add(def.id);
    }
    if (_state.leagueTitles >= 2 &&
        !_progress['ms_win_league_twice']!.unlocked) {
      final def = _definitionsById['ms_win_league_twice']!;
      _unlock(def, null, unlocked, updatedProgress);
      notifications.add(def.id);
    }

    if (summary.leagueChampion) {
      final t = _trophyForWin(
        TrophyCompetition.premierLeague,
        'Street Premier League Trophy',
        'Street Premier League',
        summary.seasonId,
        profile.currentTeamId ?? '',
        profile.username,
      );
      if (t != null) trophies.add(t);
    }

    final awardDefs = {
      'goldenBoot': 'award_golden_boot',
      'goldenGlove': 'award_golden_glove',
      'playerOfTheSeason': 'award_player_of_the_season',
      'youngPlayerOfTheSeason': 'award_young_player_of_the_season',
      'bestPannaPlayer': 'award_best_panna_player',
      'bestAssistProvider': 'award_best_assist_provider',
      'teamOfTheSeason': 'award_team_of_the_season',
      'fairPlay': 'award_fair_play',
    };
    for (final entry in awardDefs.entries) {
      if (summary.awards[entry.key] == true) {
        final def = _definitionsById[entry.value];
        if (def != null && !_progress[def.id]!.unlocked) {
          _unlock(def, null, unlocked, updatedProgress);
          awards.add(entry.key);
          notifications.add(def.id);
        }
      }
    }

    var seasonLine = '${summary.seasonName} — ${summary.seasonId}';
    if (summary.leagueChampion) seasonLine += ' – League Champions';
    if (summary.leagueRunnerUp) seasonLine += ' – Runner-up';
    profile.careerHistory.add(seasonLine);
    if (summary.leagueChampion) {
      profile.highestLeaguePosition = 1;
    } else if (summary.leagueRunnerUp &&
        profile.highestLeaguePosition > 2) {
      profile.highestLeaguePosition = 2;
    } else if (summary.leaguePosition > 0 &&
        (profile.highestLeaguePosition == 0 ||
            summary.leaguePosition < profile.highestLeaguePosition)) {
      profile.highestLeaguePosition = summary.leaguePosition;
    }
    profile.updatedAt = DateTime.now();

    return SeasonOutcome(
      unlockedAchievements: unlocked,
      updatedProgress: updatedProgress,
      awardsEarned: awards,
      notifications: notifications,
      trophiesWon: trophies,
    );
  }

  /// Record a non-match career event (e.g. joined team, recruited, captain).
  void recordCareerEvent(String eventId, {int? value}) {
    _careerEvents.add(eventId);
    if (value != null && eventId == 'rating') {
      profile.careerStatistics.playerRating = value;
    }
    final c = ProgressionContext(
      profile: profile,
      stats: profile.careerStatistics,
      careerGoalsBefore: profile.careerStatistics.goalsScored,
      careerMatchesBefore: profile.careerStatistics.matchesPlayed,
      seasonMatchResults: const [],
      competitionState: _state,
      careerEvents: _careerEvents,
    );
    final unlocked = <AchievementUnlocked>[];
    final updatedProgress = <AchievementProgress>[];
    for (final def in _definitionsById.values) {
      final p = _progress[def.id];
      if (p == null || p.unlocked) continue;
      if (def.category == AchievementCategory.career &&
          _conditionMet(
            def,
            MatchResult(
              matchId: 'career_$eventId',
              competitionId: 'career',
              seasonId: '',
              teamId: profile.currentTeamId ?? '',
              teamName: profile.username,
              playerRatingAfter: profile.careerStatistics.playerRating,
            ),
            c,
          )) {
        _unlock(def, null, unlocked, updatedProgress);
      }
    }
    profile.updatedAt = DateTime.now();
  }

  /// Mark that all five majors were won in a single season (Undisputed King).
  void markSeasonSweep() => _seasonSweep = true;

  Trophy? _trophyForWin(TrophyCompetition competition, String name,
      String competitionName, String season, String teamId, String teamName) {
    final trophyId = '${competition.name}_${season.replaceAll(' ', '_')}';
    if (profile.trophyIds.contains(trophyId)) return null;
    final trophy = Trophy(
      id: trophyId,
      name: name,
      competition: competition,
      competitionName: competitionName,
      season: season,
      teamId: teamId,
      teamName: teamName,
      dateWon: DateTime.now(),
      timesWon: 1,
      illustrationAsset: _trophyIllustration(competition),
    );
    profile.trophyIds.add(trophyId);
    profile.careerStatistics.trophiesWon = profile.trophyIds.length;
    return trophy;
  }

  String _trophyIllustration(TrophyCompetition c) {
    switch (c) {
      case TrophyCompetition.premierLeague:
        return 'assets/images/trophies/premier_league_trophy.png';
      case TrophyCompetition.championsLeague:
        return 'assets/images/trophies/champions_league_trophy.png';
      case TrophyCompetition.dustCup:
        return 'assets/images/trophies/dust_cup_trophy.png';
      case TrophyCompetition.superCup:
        return 'assets/images/trophies/super_cup_trophy.png';
      case TrophyCompetition.worldCup:
        return 'assets/images/trophies/world_cup_trophy.png';
    }
  }
}

/// The structured result of a match, produced by the Flame gameplay engine
/// (or the multiplayer host) and consumed by the achievement engine.
///
/// Every field is a fact about what happened — never a derived reward — so
/// the progression system stays deterministic and cheat-resistant.
class MatchResult {
  /// Unique id of the match. The same id must never be processed twice.
  final String matchId;
  /// Competition the match belongs to.
  final String competitionId; // 'premierLeague' | 'championsLeague' | 'dustCup' | 'superCup' | 'worldCup' | 'friendly' | 'divisionTwo'
  final String seasonId;
  final String teamId;
  final String teamName;
  /// True if the match was played at the team's home ground.
  final bool isHome;
  final bool won;
  final bool drew;
  final bool lost;
  final int goalsFor;
  final int goalsAgainst;
  /// Goals scored by the player profile in this match.
  final int playerGoals;
  final int playerAssists;
  final int playerPannas;
  /// Won without conceding.
  final bool cleanSheet;
  /// A goal scored directly from a wall/cage rebound.
  final bool wallReboundGoal;
  /// Minute (1-based) of the player's last goal, -1 if none.
  final int lastGoalMinute;
  final int matchDurationMinutes;
  /// Won after trailing by two or more goals at some point.
  final bool cameFromTwoGoalsBehind;
  /// Team's consecutive wins immediately after this match.
  final int consecutiveWins;
  /// Team's consecutive matches unbeaten immediately after this match.
  final int consecutiveUnbeaten;
  /// League position after this match (null outside league play).
  final int? leaguePositionAfter;
  final bool leagueChampion;
  final bool leagueRunnerUp;
  final bool divisionTwoChampion;
  final bool promoted;
  final bool relegated;
  /// Champions League
  final bool championsLeagueQualified;
  final bool groupStageWin;
  final bool finishedTopOfGroup;
  final bool qualifiedQuarterFinals;
  final bool reachedSemiFinals;
  final bool reachedFinal;
  final bool wonChampionsLeagueFinal;
  /// Total Champions League titles won by this team (including this one).
  final int championsLeagueTitlesTotal;
  final bool unbeatenChampionsCampaign;
  /// Dust Cup
  final bool dustCupFirstRoundWin;
  final bool reachedRoundOf16;
  final bool reachedDustQuarterFinals;
  final bool reachedDustSemiFinals;
  final bool reachedDustFinal;
  final bool wonDustCup;
  final int dustCupTitlesTotal;
  /// Opponent overall rating minus own team rating (positive = opponent stronger).
  final int opponentRatingDifference;
  final bool defeatedHigherRatedTeam;
  final bool unbeatenDustCampaign;
  /// Street Super Cup
  final bool superCupFinalist;
  final bool wonSuperCup;
  final int superCupTitlesTotal;
  final bool wonBothQualifyingCompetitions; // league + dust cup same season
  /// Zimbabwe Street World Cup
  final bool worldCupGroupWin;
  final bool reachedWorldCupQuarterFinals;
  final bool reachedWorldCupSemiFinals;
  final bool reachedWorldCupFinal;
  final bool wonWorldCup;
  final int worldCupTitlesTotal;
  final bool worldCupTopScorer;
  final bool worldCupBestPlayer;
  final bool defendedWorldCup;
  /// Player rating after this match.
  final int playerRatingAfter;

  const MatchResult({
    required this.matchId,
    required this.competitionId,
    required this.seasonId,
    required this.teamId,
    required this.teamName,
    this.isHome = false,
    this.won = false,
    this.drew = false,
    this.lost = false,
    this.goalsFor = 0,
    this.goalsAgainst = 0,
    this.playerGoals = 0,
    this.playerAssists = 0,
    this.playerPannas = 0,
    this.cleanSheet = false,
    this.wallReboundGoal = false,
    this.lastGoalMinute = -1,
    this.matchDurationMinutes = 7,
    this.cameFromTwoGoalsBehind = false,
    this.consecutiveWins = 0,
    this.consecutiveUnbeaten = 0,
    this.leaguePositionAfter,
    this.leagueChampion = false,
    this.leagueRunnerUp = false,
    this.divisionTwoChampion = false,
    this.promoted = false,
    this.relegated = false,
    this.championsLeagueQualified = false,
    this.groupStageWin = false,
    this.finishedTopOfGroup = false,
    this.qualifiedQuarterFinals = false,
    this.reachedSemiFinals = false,
    this.reachedFinal = false,
    this.wonChampionsLeagueFinal = false,
    this.championsLeagueTitlesTotal = 0,
    this.unbeatenChampionsCampaign = false,
    this.dustCupFirstRoundWin = false,
    this.reachedRoundOf16 = false,
    this.reachedDustQuarterFinals = false,
    this.reachedDustSemiFinals = false,
    this.reachedDustFinal = false,
    this.wonDustCup = false,
    this.dustCupTitlesTotal = 0,
    this.opponentRatingDifference = 0,
    this.defeatedHigherRatedTeam = false,
    this.unbeatenDustCampaign = false,
    this.superCupFinalist = false,
    this.wonSuperCup = false,
    this.superCupTitlesTotal = 0,
    this.wonBothQualifyingCompetitions = false,
    this.worldCupGroupWin = false,
    this.reachedWorldCupQuarterFinals = false,
    this.reachedWorldCupSemiFinals = false,
    this.reachedWorldCupFinal = false,
    this.wonWorldCup = false,
    this.worldCupTitlesTotal = 0,
    this.worldCupTopScorer = false,
    this.worldCupBestPlayer = false,
    this.defendedWorldCup = false,
    this.playerRatingAfter = 40,
  });

  bool get isLeague => competitionId == 'premierLeague' ||
      competitionId == 'divisionTwo';
  bool get isCupFinal =>
      wonChampionsLeagueFinal || wonDustCup || wonSuperCup || wonWorldCup;

  Map<String, dynamic> toJson() => {
        'matchId': matchId,
        'competitionId': competitionId,
        'seasonId': seasonId,
        'teamId': teamId,
        'teamName': teamName,
        'isHome': isHome,
        'won': won,
        'drew': drew,
        'lost': lost,
        'goalsFor': goalsFor,
        'goalsAgainst': goalsAgainst,
        'playerGoals': playerGoals,
        'playerAssists': playerAssists,
        'playerPannas': playerPannas,
        'cleanSheet': cleanSheet,
        'wallReboundGoal': wallReboundGoal,
        'lastGoalMinute': lastGoalMinute,
        'matchDurationMinutes': matchDurationMinutes,
        'cameFromTwoGoalsBehind': cameFromTwoGoalsBehind,
        'consecutiveWins': consecutiveWins,
        'consecutiveUnbeaten': consecutiveUnbeaten,
        'leaguePositionAfter': leaguePositionAfter,
        'leagueChampion': leagueChampion,
        'leagueRunnerUp': leagueRunnerUp,
        'divisionTwoChampion': divisionTwoChampion,
        'promoted': promoted,
        'relegated': relegated,
        'championsLeagueQualified': championsLeagueQualified,
        'groupStageWin': groupStageWin,
        'finishedTopOfGroup': finishedTopOfGroup,
        'qualifiedQuarterFinals': qualifiedQuarterFinals,
        'reachedSemiFinals': reachedSemiFinals,
        'reachedFinal': reachedFinal,
        'wonChampionsLeagueFinal': wonChampionsLeagueFinal,
        'championsLeagueTitlesTotal': championsLeagueTitlesTotal,
        'unbeatenChampionsCampaign': unbeatenChampionsCampaign,
        'dustCupFirstRoundWin': dustCupFirstRoundWin,
        'reachedRoundOf16': reachedRoundOf16,
        'reachedDustQuarterFinals': reachedDustQuarterFinals,
        'reachedDustSemiFinals': reachedDustSemiFinals,
        'reachedDustFinal': reachedDustFinal,
        'wonDustCup': wonDustCup,
        'dustCupTitlesTotal': dustCupTitlesTotal,
        'opponentRatingDifference': opponentRatingDifference,
        'defeatedHigherRatedTeam': defeatedHigherRatedTeam,
        'unbeatenDustCampaign': unbeatenDustCampaign,
        'superCupFinalist': superCupFinalist,
        'wonSuperCup': wonSuperCup,
        'superCupTitlesTotal': superCupTitlesTotal,
        'wonBothQualifyingCompetitions': wonBothQualifyingCompetitions,
        'worldCupGroupWin': worldCupGroupWin,
        'reachedWorldCupQuarterFinals': reachedWorldCupQuarterFinals,
        'reachedWorldCupSemiFinals': reachedWorldCupSemiFinals,
        'reachedWorldCupFinal': reachedWorldCupFinal,
        'wonWorldCup': wonWorldCup,
        'worldCupTitlesTotal': worldCupTitlesTotal,
        'worldCupTopScorer': worldCupTopScorer,
        'worldCupBestPlayer': worldCupBestPlayer,
        'defendedWorldCup': defendedWorldCup,
        'playerRatingAfter': playerRatingAfter,
      };

  factory MatchResult.fromJson(Map<String, dynamic> json) =>
      MatchResult(
        matchId: json['matchId'] as String,
        competitionId: json['competitionId'] as String,
        seasonId: json['seasonId'] as String,
        teamId: json['teamId'] as String,
        teamName: json['teamName'] as String,
        isHome: json['isHome'] as bool? ?? false,
        won: json['won'] as bool? ?? false,
        drew: json['drew'] as bool? ?? false,
        lost: json['lost'] as bool? ?? false,
        goalsFor: json['goalsFor'] as int? ?? 0,
        goalsAgainst: json['goalsAgainst'] as int? ?? 0,
        playerGoals: json['playerGoals'] as int? ?? 0,
        playerAssists: json['playerAssists'] as int? ?? 0,
        playerPannas: json['playerPannas'] as int? ?? 0,
        cleanSheet: json['cleanSheet'] as bool? ?? false,
        wallReboundGoal: json['wallReboundGoal'] as bool? ?? false,
        lastGoalMinute: json['lastGoalMinute'] as int? ?? -1,
        matchDurationMinutes: json['matchDurationMinutes'] as int? ?? 7,
        cameFromTwoGoalsBehind: json['cameFromTwoGoalsBehind'] as bool? ?? false,
        consecutiveWins: json['consecutiveWins'] as int? ?? 0,
        consecutiveUnbeaten: json['consecutiveUnbeaten'] as int? ?? 0,
        leaguePositionAfter: json['leaguePositionAfter'] as int?,
        leagueChampion: json['leagueChampion'] as bool? ?? false,
        leagueRunnerUp: json['leagueRunnerUp'] as bool? ?? false,
        divisionTwoChampion: json['divisionTwoChampion'] as bool? ?? false,
        promoted: json['promoted'] as bool? ?? false,
        relegated: json['relegated'] as bool? ?? false,
        championsLeagueQualified: json['championsLeagueQualified'] as bool? ?? false,
        groupStageWin: json['groupStageWin'] as bool? ?? false,
        finishedTopOfGroup: json['finishedTopOfGroup'] as bool? ?? false,
        qualifiedQuarterFinals: json['qualifiedQuarterFinals'] as bool? ?? false,
        reachedSemiFinals: json['reachedSemiFinals'] as bool? ?? false,
        reachedFinal: json['reachedFinal'] as bool? ?? false,
        wonChampionsLeagueFinal: json['wonChampionsLeagueFinal'] as bool? ?? false,
        championsLeagueTitlesTotal: json['championsLeagueTitlesTotal'] as int? ?? 0,
        unbeatenChampionsCampaign: json['unbeatenChampionsCampaign'] as bool? ?? false,
        dustCupFirstRoundWin: json['dustCupFirstRoundWin'] as bool? ?? false,
        reachedRoundOf16: json['reachedRoundOf16'] as bool? ?? false,
        reachedDustQuarterFinals: json['reachedDustQuarterFinals'] as bool? ?? false,
        reachedDustSemiFinals: json['reachedDustSemiFinals'] as bool? ?? false,
        reachedDustFinal: json['reachedDustFinal'] as bool? ?? false,
        wonDustCup: json['wonDustCup'] as bool? ?? false,
        dustCupTitlesTotal: json['dustCupTitlesTotal'] as int? ?? 0,
        opponentRatingDifference: json['opponentRatingDifference'] as int? ?? 0,
        defeatedHigherRatedTeam: json['defeatedHigherRatedTeam'] as bool? ?? false,
        unbeatenDustCampaign: json['unbeatenDustCampaign'] as bool? ?? false,
        superCupFinalist: json['superCupFinalist'] as bool? ?? false,
        wonSuperCup: json['wonSuperCup'] as bool? ?? false,
        superCupTitlesTotal: json['superCupTitlesTotal'] as int? ?? 0,
        wonBothQualifyingCompetitions: json['wonBothQualifyingCompetitions'] as bool? ?? false,
        worldCupGroupWin: json['worldCupGroupWin'] as bool? ?? false,
        reachedWorldCupQuarterFinals: json['reachedWorldCupQuarterFinals'] as bool? ?? false,
        reachedWorldCupSemiFinals: json['reachedWorldCupSemiFinals'] as bool? ?? false,
        reachedWorldCupFinal: json['reachedWorldCupFinal'] as bool? ?? false,
        wonWorldCup: json['wonWorldCup'] as bool? ?? false,
        worldCupTitlesTotal: json['worldCupTitlesTotal'] as int? ?? 0,
        worldCupTopScorer: json['worldCupTopScorer'] as bool? ?? false,
        worldCupBestPlayer: json['worldCupBestPlayer'] as bool? ?? false,
        defendedWorldCup: json['defendedWorldCup'] as bool? ?? false,
        playerRatingAfter: json['playerRatingAfter'] as int? ?? 40,
      );
}

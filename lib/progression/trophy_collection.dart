/// Trophy room data model. Every trophy won is permanently recorded and
/// never removed when a new season begins. Locked trophies display as
/// silhouettes with clear unlock requirements.

enum TrophyCompetition {
  premierLeague,
  championsLeague,
  dustCup,
  superCup,
  worldCup,
}

extension TrophyCompetitionName on TrophyCompetition {
  String get displayName {
    switch (this) {
      case TrophyCompetition.premierLeague:
        return 'Street Premier League';
      case TrophyCompetition.championsLeague:
        return 'Street Champions League';
      case TrophyCompetition.dustCup:
        return 'Dust Cup';
      case TrophyCompetition.superCup:
        return 'Street Super Cup';
      case TrophyCompetition.worldCup:
        return 'Zimbabwe Street World Cup';
    }
  }
}

/// One trophy (or medal/award) in the player's collection.
class Trophy {
  final String id;
  final String name;
  final TrophyCompetition competition;
  final String competitionName;
  final String season;
  final String teamId;
  final String teamName;
  final DateTime dateWon;
  /// How many times this competition has been won (aggregated display).
  final int timesWon;
  /// Illustrated / 3D-style appearance asset.
  final String illustrationAsset;
  /// True if this entry is a seasonal award/medal rather than a cup.
  final bool isAward;

  const Trophy({
    required this.id,
    required this.name,
    required this.competition,
    required this.competitionName,
    required this.season,
    required this.teamId,
    required this.teamName,
    required this.dateWon,
    this.timesWon = 1,
    required this.illustrationAsset,
    this.isAward = false,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'competition': competition.name,
        'competitionName': competitionName,
        'season': season,
        'teamId': teamId,
        'teamName': teamName,
        'dateWon': dateWon.toIso8601String(),
        'timesWon': timesWon,
        'illustrationAsset': illustrationAsset,
        'isAward': isAward,
      };

  factory Trophy.fromJson(Map<String, dynamic> json) => Trophy(
        id: json['id'] as String,
        name: json['name'] as String,
        competition: TrophyCompetition.values.firstWhere(
          (e) => e.name == json['competition'],
          orElse: () => TrophyCompetition.premierLeague,
        ),
        competitionName: json['competitionName'] as String,
        season: json['season'] as String,
        teamId: json['teamId'] as String,
        teamName: json['teamName'] as String,
        dateWon: DateTime.parse(json['dateWon'] as String),
        timesWon: json['timesWon'] as int? ?? 1,
        illustrationAsset: json['illustrationAsset'] as String,
        isAward: json['isAward'] as bool? ?? false,
      );
}

/// Definition of a trophy that can exist in the game, including ones not yet
/// won. Used to render locked silhouettes with requirements.
class TrophyDefinition {
  final String id;
  final String name;
  final TrophyCompetition competition;
  final String competitionName;
  final String illustrationAsset;
  final String lockedSilhouetteAsset;
  final List<String> unlockRequirements;

  const TrophyDefinition({
    required this.id,
    required this.name,
    required this.competition,
    required this.competitionName,
    required this.illustrationAsset,
    required this.lockedSilhouetteAsset,
    required this.unlockRequirements,
  });
}

String _trophy(String id) => 'assets/images/trophies/$id.png';

/// Every trophy in STREET LEAGUE, including the platinum Street Legend trophy.
List<TrophyDefinition> allTrophyDefinitions() {
  return [
    TrophyDefinition(
      id: 'trophy_premier_league',
      name: 'Street Premier League Trophy',
      competition: TrophyCompetition.premierLeague,
      competitionName: 'Street Premier League',
      illustrationAsset: _trophy('premier_league'),
      lockedSilhouetteAsset: _trophy('premier_league_locked'),
      unlockRequirements: const ['Win the Street Premier League title.'],
    ),
    TrophyDefinition(
      id: 'trophy_champions_league',
      name: 'Street Champions League Trophy',
      competition: TrophyCompetition.championsLeague,
      competitionName: 'Street Champions League',
      illustrationAsset: _trophy('champions_league'),
      lockedSilhouetteAsset: _trophy('champions_league_locked'),
      unlockRequirements: const [
        'Win the Street Champions League final at St Mary\'s Dust Bowl.',
      ],
    ),
    TrophyDefinition(
      id: 'trophy_dust_cup',
      name: 'Dust Cup Trophy',
      competition: TrophyCompetition.dustCup,
      competitionName: 'Dust Cup',
      illustrationAsset: _trophy('dust_cup'),
      lockedSilhouetteAsset: _trophy('dust_cup_locked'),
      unlockRequirements: const ['Win the Dust Cup final.'],
    ),
    TrophyDefinition(
      id: 'trophy_super_cup',
      name: 'Street Super Cup Trophy',
      competition: TrophyCompetition.superCup,
      competitionName: 'Street Super Cup',
      illustrationAsset: _trophy('super_cup'),
      lockedSilhouetteAsset: _trophy('super_cup_locked'),
      unlockRequirements: const [
        'Win the Street Super Cup final and claim the King of the Streets title.',
      ],
    ),
    TrophyDefinition(
      id: 'trophy_world_cup',
      name: 'Zimbabwe Street World Cup Trophy',
      competition: TrophyCompetition.worldCup,
      competitionName: 'Zimbabwe Street World Cup',
      illustrationAsset: _trophy('world_cup'),
      lockedSilhouetteAsset: _trophy('world_cup_locked'),
      unlockRequirements: const [
        'Win the Zimbabwe Street World Cup final with your region.',
      ],
    ),
    TrophyDefinition(
      id: 'trophy_street_legend',
      name: 'The Street Legend Trophy',
      competition: TrophyCompetition.worldCup,
      competitionName: 'Street Legend Challenge',
      illustrationAsset: _trophy('street_legend_platinum'),
      lockedSilhouetteAsset: _trophy('street_legend_platinum_locked'),
      unlockRequirements: const [
        'Win all five major competitions: Street Premier League,',
        'Street Champions League, Dust Cup, Street Super Cup,',
        'Zimbabwe Street World Cup.',
      ],
    ),
    TrophyDefinition(
      id: 'medal_golden_boot',
      name: 'Golden Boot Medal',
      competition: TrophyCompetition.premierLeague,
      competitionName: 'Season Awards',
      illustrationAsset: _trophy('golden_boot'),
      lockedSilhouetteAsset: _trophy('golden_boot_locked'),
      unlockRequirements: const [
        'Finish the league season as top scorer.',
      ],
      // isAward handled by collection
    ),
    TrophyDefinition(
      id: 'medal_golden_glove',
      name: 'Golden Glove Medal',
      competition: TrophyCompetition.premierLeague,
      competitionName: 'Season Awards',
      illustrationAsset: _trophy('golden_glove'),
      lockedSilhouetteAsset: _trophy('golden_glove_locked'),
      unlockRequirements: const [
        'Finish the league season as best goalkeeper.',
      ],
    ),
  ];
}

/// The player's personal trophy collection. Persisted and synced.
class TrophyCollection {
  final List<Trophy> _trophies = [];

  List<Trophy> get trophies => List.unmodifiable(_trophies);

  /// Trophies won, grouped by competition for display.
  Map<TrophyCompetition, List<Trophy>> get byCompetition {
    final map = <TrophyCompetition, List<Trophy>>{};
    for (final t in _trophies) {
      map.putIfAbsent(t.competition, () => []).add(t);
    }
    return map;
  }

  int get totalTrophies => _trophies.length;

  int countWon(TrophyCompetition competition) =>
      _trophies.where((t) => t.competition == competition).length;

  bool has(TrophyCompetition competition) =>
      _trophies.any((t) => t.competition == competition);

  /// Add a trophy won this season. Never removes existing trophies.
  void add(Trophy trophy) {
    _trophies.add(trophy);
    _trophies.sort((a, b) => b.dateWon.compareTo(a.dateWon));
  }

  /// Add from json (used when loading saved progress).
  void addFromJson(Map<String, dynamic> json) {
    add(Trophy.fromJson(json));
  }

  /// Returns the definition for [trophyId], or null.
  TrophyDefinition? definitionFor(String trophyId) {
    return allTrophyDefinitions().firstWhere(
      (d) => d.id == trophyId,
      orElse: () => throw ArgumentError('Unknown trophy: $trophyId'),
    );
  }

  List<Map<String, dynamic>> toJson() =>
      _trophies.map((t) => t.toJson()).toList();

  void fromJson(List<dynamic> json) {
    _trophies
      ..clear()
      ..addAll(json.cast<Map<String, dynamic>>().map(Trophy.fromJson));
  }
}

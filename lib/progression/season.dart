/// Seasonal progression. Each season has a unique identity, a calendar of
/// events, and a permanently saved historical record.

enum SeasonPhase {
  openingCeremony,
  registration,
  leagueFixtures,
  cupDraws,
  championshipFixtures,
  transferWindow,
  midSeasonAwards,
  endOfSeasonAwards,
  trophyCeremony,
  promotionRelegation,
  offSeason,
}

/// One dated event in a season's calendar.
class SeasonEvent {
  final String id;
  final String title;
  final String description;
  final SeasonPhase phase;
  final DateTime date;
  final bool completed;

  const SeasonEvent({
    required this.id,
    required this.title,
    required this.description,
    required this.phase,
    required this.date,
    this.completed = false,
  });
}

/// Permanently saved record of a completed season.
class SeasonRecord {
  final int seasonNumber;
  final String seasonName;
  final DateTime startDate;
  final DateTime endDate;
  /// 'Rise of the Streets', 'Battle for the Crown', …
  final String identity;
  final String premierLeagueChampionTeam;
  final String premierLeagueRunnerUpTeam;
  final String championsLeagueChampionTeam;
  final String dustCupChampionTeam;
  final String superCupChampionTeam;
  final String worldCupChampionRegion;
  final String goldenBootPlayer;
  final String goldenGlovePlayer;
  final String playerOfTheSeason;
  final int streetLegendCount; // players who completed the sweep this season
  final Map<String, dynamic> statistics;

  const SeasonRecord({
    required this.seasonNumber,
    required this.seasonName,
    required this.startDate,
    required this.endDate,
    required this.identity,
    required this.premierLeagueChampionTeam,
    required this.premierLeagueRunnerUpTeam,
    required this.championsLeagueChampionTeam,
    required this.dustCupChampionTeam,
    required this.superCupChampionTeam,
    required this.worldCupChampionRegion,
    required this.goldenBootPlayer,
    required this.goldenGlovePlayer,
    required this.playerOfTheSeason,
    this.streetLegendCount = 0,
    this.statistics = const {},
  });

  Map<String, dynamic> toJson() => {
        'seasonNumber': seasonNumber,
        'seasonName': seasonName,
        'startDate': startDate.toIso8601String(),
        'endDate': endDate.toIso8601String(),
        'identity': identity,
        'premierLeagueChampionTeam': premierLeagueChampionTeam,
        'premierLeagueRunnerUpTeam': premierLeagueRunnerUpTeam,
        'championsLeagueChampionTeam': championsLeagueChampionTeam,
        'dustCupChampionTeam': dustCupChampionTeam,
        'superCupChampionTeam': superCupChampionTeam,
        'worldCupChampionRegion': worldCupChampionRegion,
        'goldenBootPlayer': goldenBootPlayer,
        'goldenGlovePlayer': goldenGlovePlayer,
        'playerOfTheSeason': playerOfTheSeason,
        'streetLegendCount': streetLegendCount,
        'statistics': statistics,
      };

  factory SeasonRecord.fromJson(Map<String, dynamic> json) => SeasonRecord(
        seasonNumber: json['seasonNumber'] as int,
        seasonName: json['seasonName'] as String,
        startDate: DateTime.parse(json['startDate'] as String),
        endDate: DateTime.parse(json['endDate'] as String),
        identity: json['identity'] as String,
        premierLeagueChampionTeam: json['premierLeagueChampionTeam'] as String,
        premierLeagueRunnerUpTeam: json['premierLeagueRunnerUpTeam'] as String,
        championsLeagueChampionTeam: json['championsLeagueChampionTeam'] as String,
        dustCupChampionTeam: json['dustCupChampionTeam'] as String,
        superCupChampionTeam: json['superCupChampionTeam'] as String,
        worldCupChampionRegion: json['worldCupChampionRegion'] as String,
        goldenBootPlayer: json['goldenBootPlayer'] as String,
        goldenGlovePlayer: json['goldenGlovePlayer'] as String,
        playerOfTheSeason: json['playerOfTheSeason'] as String,
        streetLegendCount: json['streetLegendCount'] as int? ?? 0,
        statistics: Map<String, dynamic>.from(json['statistics'] ?? {}),
      );
}

/// The season calendar with all required phases.
class Season {
  final String id;
  final int number;
  final String name;
  final String identity; // e.g. 'Season 1 – Rise of the Streets'
  final DateTime startDate;
  final DateTime endDate;
  final List<SeasonEvent> events;
  SeasonRecord? record; // filled when the season completes

  Season({
    required this.id,
    required this.number,
    required this.name,
    required this.identity,
    required this.startDate,
    required this.endDate,
    required this.events,
  });

  SeasonPhase currentPhase(DateTime now) {
    if (now.isBefore(startDate)) return SeasonPhase.registration;
    if (now.isAfter(endDate)) return SeasonPhase.offSeason;
    // Simple phase progression by position in the season window.
    final span = endDate.difference(startDate).inDays;
    final elapsed = now.difference(startDate).inDays;
    final ratio = span == 0 ? 1.0 : elapsed / span;
    if (ratio < 0.05) return SeasonPhase.openingCeremony;
    if (ratio < 0.15) return SeasonPhase.registration;
    if (ratio < 0.30) return SeasonPhase.leagueFixtures;
    if (ratio < 0.45) return SeasonPhase.cupDraws;
    if (ratio < 0.70) return SeasonPhase.championshipFixtures;
    if (ratio < 0.78) return SeasonPhase.transferWindow;
    if (ratio < 0.82) return SeasonPhase.midSeasonAwards;
    if (ratio < 0.92) return SeasonPhase.endOfSeasonAwards;
    if (ratio < 0.98) return SeasonPhase.trophyCeremony;
    return SeasonPhase.promotionRelegation;
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'number': number,
        'name': name,
        'identity': identity,
        'startDate': startDate.toIso8601String(),
        'endDate': endDate.toIso8601String(),
        'events': events.map((e) => {
              'id': e.id,
              'title': e.title,
              'description': e.description,
              'phase': e.phase.index,
              'date': e.date.toIso8601String(),
              'completed': e.completed,
            }).toList(),
        'record': record?.toJson(),
      };

  factory Season.fromJson(Map<String, dynamic> json) {
    final s = Season(
      id: json['id'] as String,
      number: json['number'] as int,
      name: json['name'] as String,
      identity: json['identity'] as String,
      startDate: DateTime.parse(json['startDate'] as String),
      endDate: DateTime.parse(json['endDate'] as String),
      events: (json['events'] as List? ?? [])
          .cast<Map<String, dynamic>>()
          .map((e) => SeasonEvent(
                id: e['id'] as String,
                title: e['title'] as String,
                description: e['description'] as String,
                phase: SeasonPhase.values[e['phase'] as int],
                date: DateTime.parse(e['date'] as String),
                completed: e['completed'] as bool? ?? false,
              ))
          .toList(),
    );
    if (json['record'] != null) {
      s.record = SeasonRecord.fromJson(json['record'] as Map<String, dynamic>);
    }
    return s;
  }
}

/// The permanent record of every completed season — Hall of Fame source.
class SeasonHistory {
  final List<SeasonRecord> _records = [];

  List<SeasonRecord> get records => List.unmodifiable(_records);

  SeasonRecord? get latest => _records.isEmpty ? null : _records.last;

  SeasonRecord? recordForSeason(int number) =>
      _records.firstWhere((r) => r.seasonNumber == number, orElse: () => null);

  void add(SeasonRecord record) {
    _records.removeWhere((r) => r.seasonNumber == record.seasonNumber);
    _records.add(record);
    _records.sort((a, b) => a.seasonNumber.compareTo(b.seasonNumber));
  }

  List<String> get championsBySeason =>
      _records.map((r) => '${r.seasonName}: ${r.premierLeagueChampionTeam}').toList();

  Map<String, dynamic> toJson() => {
        'records': _records.map((r) => r.toJson()).toList(),
      };

  factory SeasonHistory.fromJson(Map<String, dynamic> json) {
    final h = SeasonHistory();
    h._records
      ..clear()
      ..addAll((json['records'] as List? ?? [])
          .cast<Map<String, dynamic>>()
          .map(SeasonRecord.fromJson));
    return h;
  }
}

/// Example season identities from the spec.
List<Season> exampleSeasons() {
  return [
    Season(
      id: 'season_1',
      number: 1,
      name: 'Season 1',
      identity: 'Season 1 – Rise of the Streets',
      startDate: DateTime(2026, 1, 15),
      endDate: DateTime(2026, 5, 30),
      events: [
        const SeasonEvent(
          id: 's1_opening',
          title: 'Opening Ceremony',
          description: 'The streets of Chitungwiza wake up for a new season.',
          phase: SeasonPhase.openingCeremony,
          date: DateTime(2026, 1, 15),
        ),
        const SeasonEvent(
          id: 's1_registration',
          title: 'Competition Registration',
          description: 'Teams register for the Premier League and cups.',
          phase: SeasonPhase.registration,
          date: DateTime(2026, 1, 22),
        ),
        const SeasonEvent(
          id: 's1_trophy',
          title: 'Trophy Ceremony',
          description: 'Champions are crowned and trophies unveiled.',
          phase: SeasonPhase.trophyCeremony,
          date: DateTime(2026, 5, 30),
        ),
      ],
    ),
    Season(
      id: 'season_2',
      number: 2,
      name: 'Season 2',
      identity: 'Season 2 – Battle for the Crown',
      startDate: DateTime(2026, 8, 1),
      endDate: DateTime(2026, 12, 15),
      events: [
        const SeasonEvent(
          id: 's2_opening',
          title: 'Opening Ceremony',
          description: 'The crown is up for grabs in Harare.',
          phase: SeasonPhase.openingCeremony,
          date: DateTime(2026, 8, 1),
        ),
        const SeasonEvent(
          id: 's2_trophy',
          title: 'Trophy Ceremony',
          description: 'End-of-season awards and trophies.',
          phase: SeasonPhase.trophyCeremony,
          date: DateTime(2026, 12, 15),
        ),
      ],
    ),
    Season(
      id: 'season_3',
      number: 3,
      name: 'Season 3',
      identity: 'Season 3 – Township Supremacy',
      startDate: DateTime(2027, 2, 1),
      endDate: DateTime(2027, 6, 30),
      events: [
        const SeasonEvent(
          id: 's3_opening',
          title: 'Opening Ceremony',
          description: 'Townships across Zimbabwe battle for supremacy.',
          phase: SeasonPhase.openingCeremony,
          date: DateTime(2027, 2, 1),
        ),
        const SeasonEvent(
          id: 's3_trophy',
          title: 'Trophy Ceremony',
          description: 'Champions crowned at St Mary\'s Dust Bowl.',
          phase: SeasonPhase.trophyCeremony,
          date: DateTime(2027, 6, 30),
        ),
      ],
    ),
  ];
}

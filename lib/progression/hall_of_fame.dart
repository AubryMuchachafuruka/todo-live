/// Permanent STREET LEAGUE Hall of Fame.

enum HallOfFameCategory {
  greatestPlayers,
  greatestTeams,
  mostSuccessfulCaptains,
  highestRatedPlayers,
  allTimeTopScorers,
  mostSuccessfulClubs,
  longestUnbeatenStreaks,
  mostDecoratedPlayers,
  historicChampionshipWinners,
}

/// One Hall of Fame entry.
class HallOfFameEntry {
  final HallOfFameCategory category;
  final String name;
  final String? teamId;
  final String? teamName;
  final int season;
  final int value; // goals, titles, streak length, rating, …
  final String reason;

  const HallOfFameEntry({
    required this.category,
    required this.name,
    this.teamId,
    this.teamName,
    required this.season,
    required this.value,
    required this.reason,
  });

  Map<String, dynamic> toJson() => {
        'category': category.index,
        'name': name,
        'teamId': teamId,
        'teamName': teamName,
        'season': season,
        'value': value,
        'reason': reason,
      };

  factory HallOfFameEntry.fromJson(Map<String, dynamic> json) =>
      HallOfFameEntry(
        category: HallOfFameCategory.values[json['category'] as int],
        name: json['name'] as String,
        teamId: json['teamId'] as String?,
        teamName: json['teamName'] as String?,
        season: json['season'] as int,
        value: json['value'] as int,
        reason: json['reason'] as String,
      );
}

/// The Hall of Fame, built from season history and career records.
class HallOfFame {
  final List<HallOfFameEntry> _entries = [];

  List<HallOfFameEntry> get entries => List.unmodifiable(_entries);

  List<HallOfFameEntry> byCategory(HallOfFameCategory category) =>
      _entries.where((e) => e.category == category).toList();

  void add(HallOfFameEntry entry) => _entries.add(entry);

  void sortByValueDesc() => _entries.sort((a, b) => b.value.compareTo(a.value));

  Map<String, dynamic> toJson() => {
        'entries': _entries.map((e) => e.toJson()).toList(),
      };

  factory HallOfFame.fromJson(Map<String, dynamic> json) {
    final h = HallOfFame();
    h._entries
      ..clear()
      ..addAll((json['entries'] as List? ?? [])
          .cast<Map<String, dynamic>>()
          .map(HallOfFameEntry.fromJson));
    return h;
  }
}

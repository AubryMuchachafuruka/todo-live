/// Online multiplayer rankings — a SEPARATE competitive ranking system from
/// offline progression. Players are ranked by actual competitive performance
/// (win/loss record, MMR), never solely by number of matches played.
///
/// Offline results must never automatically count toward online rankings;
/// online results require server verification.

enum OnlineRankTier {
  streetBeginner,
  bronzeStreetPlayer,
  silverStreetPlayer,
  goldStreetPlayer,
  platinumStreetPlayer,
  diamondStreetPlayer,
  eliteStreetPlayer,
  streetLegend,
}

extension OnlineRankTierName on OnlineRankTier {
  String get displayName {
    switch (this) {
      case OnlineRankTier.streetBeginner:
        return 'Street Beginner';
      case OnlineRankTier.bronzeStreetPlayer:
        return 'Bronze Street Player';
      case OnlineRankTier.silverStreetPlayer:
        return 'Silver Street Player';
      case OnlineRankTier.goldStreetPlayer:
        return 'Gold Street Player';
      case OnlineRankTier.platinumStreetPlayer:
        return 'Platinum Street Player';
      case OnlineRankTier.diamondStreetPlayer:
        return 'Diamond Street Player';
      case OnlineRankTier.eliteStreetPlayer:
        return 'Elite Street Player';
      case OnlineRankTier.streetLegend:
        return 'Street Legend';
    }
  }

  int get minimumMmr {
    switch (this) {
      case OnlineRankTier.streetBeginner:
        return 0;
      case OnlineRankTier.bronzeStreetPlayer:
        return 1000;
      case OnlineRankTier.silverStreetPlayer:
        return 1500;
      case OnlineRankTier.goldStreetPlayer:
        return 2000;
      case OnlineRankTier.platinumStreetPlayer:
        return 2500;
      case OnlineRankTier.diamondStreetPlayer:
        return 3000;
      case OnlineRankTier.eliteStreetPlayer:
        return 3500;
      case OnlineRankTier.streetLegend:
        return 4000;
    }
  }
}

/// One ranked player's competitive statistics.
class RankedPlayer {
  final String userId;
  final String username;
  final String? region; // e.g. 'Zimbabwe'
  int mmr;
  int wins;
  int losses;
  int draws;
  final int season;
  DateTime lastMatchAt;

  RankedPlayer({
    required this.userId,
    required this.username,
    this.region,
    this.mmr = 1000,
    this.wins = 0,
    this.losses = 0,
    this.draws = 0,
    this.season = 1,
    DateTime? lastMatchAt,
  }) : lastMatchAt = lastMatchAt ?? DateTime.now();

  int get matchesPlayed => wins + losses + draws;
  double get winRate => matchesPlayed == 0
      ? 0.0
      : wins / matchesPlayed * 100;

  OnlineRankTier get tier {
    var tier = OnlineRankTier.streetBeginner;
    for (final t in OnlineRankTier.values) {
      if (mmr >= t.minimumMmr) tier = t;
    }
    return tier;
  }

  Map<String, dynamic> toJson() => {
        'userId': userId,
        'username': username,
        'region': region,
        'mmr': mmr,
        'wins': wins,
        'losses': losses,
        'draws': draws,
        'season': season,
        'lastMatchAt': lastMatchAt.toIso8601String(),
      };

  factory RankedPlayer.fromJson(Map<String, dynamic> json) => RankedPlayer(
        userId: json['userId'] as String,
        username: json['username'] as String,
        region: json['region'] as String?,
        mmr: json['mmr'] as int? ?? 1000,
        wins: json['wins'] as int? ?? 0,
        losses: json['losses'] as int? ?? 0,
        draws: json['draws'] as int? ?? 0,
        season: json['season'] as int? ?? 1,
        lastMatchAt: json['lastMatchAt'] != null
            ? DateTime.parse(json['lastMatchAt'] as String)
            : DateTime.now(),
      );
}

/// Leaderboard scope.
enum LeaderboardScope { global, zimbabwe, friends, regional }

/// One leaderboard entry.
class LeaderboardEntry {
  final int rank;
  final RankedPlayer player;

  LeaderboardEntry({required this.rank, required this.player});

  Map<String, dynamic> toJson() => {
        'rank': rank,
        'player': player.toJson(),
      };
}

/// Server-verified online match result before it affects rankings.
class VerifiedOnlineResult {
  final String matchId;
  final String winnerUserId;
  final String loserUserId;
  final bool draw;
  final int winnerGoals;
  final int loserGoals;
  final DateTime playedAt;
  final String serverSignature; // proof the server authorised the result

  const VerifiedOnlineResult({
    required this.matchId,
    required this.winnerUserId,
    required this.loserUserId,
    this.draw = false,
    required this.winnerGoals,
    required this.loserGoals,
    required this.playedAt,
    required this.serverSignature,
  });
}

/// In-memory ranked service. Production replaces this with Firebase/backend.
class RankedService {
  final Map<String, RankedPlayer> _players = {};
  final List<VerifiedOnlineResult> _verifiedResults = [];
  final Set<String> _processedOnlineMatchIds = {};
  int _currentSeason = 1;

  List<RankedPlayer> get players => List.unmodifiable(_players.values);
  int get currentSeason => _currentSeason;

  RankedPlayer getOrCreate(String userId, String username, {String? region}) {
    return _players.putIfAbsent(
        userId, () => RankedPlayer(userId: userId, username: username, region: region));
  }

  /// Submit a match result. Returns true only if the result was
  /// server-verified and not a duplicate. Offline/local results must not
  /// call this.
  bool submitVerifiedResult(VerifiedOnlineResult result) {
    if (_processedOnlineMatchIds.contains(result.matchId)) return false;
    if (result.serverSignature.isEmpty) return false; // unverified → reject
    _processedOnlineMatchIds.add(result.matchId);
    _verifiedResults.add(result);

    final winner = getOrCreate(result.winnerUserId, '');
    final loser = getOrCreate(result.loserUserId, '');
    if (result.draw) {
      winner.draws++;
      loser.draws++;
    } else {
      winner.wins++;
      winner.mmr += 25;
      loser.losses++;
      loser.mmr = (loser.mmr - 25).clamp(0, 5000);
    }
    winner.lastMatchAt = result.playedAt;
    loser.lastMatchAt = result.playedAt;
    return true;
  }

  List<LeaderboardEntry> leaderboard(LeaderboardScope scope,
      {List<String>? friendIds, String? region}) {
    var list = _players.values.toList();
    if (scope == LeaderboardScope.friends && friendIds != null) {
      list = list.where((p) => friendIds.contains(p.userId)).toList();
    }
    if (scope == LeaderboardScope.zimbabwe || region != null) {
      list = list.where((p) => p.region == (region ?? 'Zimbabwe')).toList();
    }
    list.sort((a, b) => b.mmr.compareTo(a.mmr));
    return list
        .asMap()
        .entries
        .map((e) => LeaderboardEntry(rank: e.key + 1, player: e.value))
        .toList();
  }

  Map<String, dynamic> toJson() => {
        'players': _players.values.map((p) => p.toJson()).toList(),
        'currentSeason': _currentSeason,
        'processedMatchIds': _processedOnlineMatchIds.toList(),
      };

  factory RankedService.fromJson(Map<String, dynamic> json) {
    final s = RankedService().._currentSeason =
        json['currentSeason'] as int? ?? 1;
    s._processedMatchIds.addAll(
        (json['processedMatchIds'] as List? ?? []).cast<String>());
    for (final p in (json['players'] as List? ?? []).cast<Map>()) {
      final player = RankedPlayer.fromJson(p);
      s._players[player.userId] = player;
    }
    return s;
  }
}

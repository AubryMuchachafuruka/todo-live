/// XP sources — every XP grant is tagged so the same match event can never
/// be credited twice (anti-exploit / duplicate prevention).
enum XpSource {
  matchWin,
  matchGoal,
  matchAssist,
  matchPanna,
  cleanSheet,
  tournamentWin,
  milestoneUnlock,
  skillImprovement,
  challengeComplete,
}

/// Default XP rewards for gameplay actions. Balanced so winning matters,
/// but no single action dominates progression.
class XpRewards {
  static const int matchWin = 100;
  static const int matchGoal = 25;
  static const int matchAssist = 15;
  static const int matchPanna = 10;
  static const int cleanSheet = 50;
  static const int tournamentWin = 500;
  static const int milestoneUnlock = 250;
  static const int skillImprovement = 100;
  static const int challengeComplete = 75;
}

/// One XP credit entry in the player's permanent ledger.
class XpTransaction {
  /// Unique id for this transaction.
  final String id;
  /// Match that generated this XP, null for non-match sources.
  final String? matchId;
  final XpSource source;
  final int amount;
  final String description;
  final DateTime occurredAt;
  /// Extra context (opponent, competition, season, etc.).
  final Map<String, dynamic> metadata;

  const XpTransaction({
    required this.id,
    this.matchId,
    required this.source,
    required this.amount,
    required this.description,
    required this.occurredAt,
    this.metadata = const {},
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'matchId': matchId,
        'source': source.name,
        'amount': amount,
        'description': description,
        'occurredAt': occurredAt.toIso8601String(),
        'metadata': metadata,
      };

  factory XpTransaction.fromJson(Map<String, dynamic> json) => XpTransaction(
        id: json['id'] as String,
        matchId: json['matchId'] as String?,
        source: XpSource.values.firstWhere(
          (e) => e.name == json['source'],
          orElse: () => XpSource.skillImprovement,
        ),
        amount: json['amount'] as int,
        description: json['description'] as String,
        occurredAt: DateTime.parse(json['occurredAt'] as String),
        metadata: Map<String, dynamic>.from(json['metadata'] ?? {}),
      );
}

/// Thrown when the ledger is asked to credit an event that was already credited.
class DuplicateXpEventError implements Exception {
  final String eventKey;
  DuplicateXpEventError(this.eventKey);
  @override
  String toString() => 'XP already credited for event: $eventKey';
}

/// Append-only XP ledger. Duplicate event keys are rejected so replays or
/// duplicated match results cannot inflate a player's XP.
class XpLedger {
  final List<XpTransaction> _transactions = [];
  final Set<String> _creditedEventKeys = {};

  List<XpTransaction> get transactions => List.unmodifiable(_transactions);

  int get totalXp => _transactions.fold(0, (sum, t) => sum + t.amount);

  bool hasCredited(String eventKey) => _creditedEventKeys.contains(eventKey);

  /// Restore a ledger from persisted data (used by tests and storage).
  XpLedger.restored({
    required List<XpTransaction> transactions,
    required Set<String> creditedEventKeys,
  }) {
    _transactions.addAll(transactions);
    _creditedEventKeys.addAll(creditedEventKeys);
  }

  /// Record that an event has been credited without creating a transaction
  /// (used when replaying history to rebuild state).
  void markCredited(String eventKey) => _creditedEventKeys.add(eventKey);

  /// Credit XP. [eventKey] uniquely identifies the source event, e.g.
  /// `"<matchId>|goal|3"`. If [eventKey] was already credited, throws
  /// [DuplicateXpEventError] and no XP is awarded.
  XpTransaction credit({
    required String? matchId,
    required XpSource source,
    required int amount,
    required String description,
    String? eventKey,
    Map<String, dynamic> metadata = const {},
  }) {
    if (eventKey != null && _creditedEventKeys.contains(eventKey)) {
      throw DuplicateXpEventError(eventKey);
    }
    if (eventKey != null) _creditedEventKeys.add(eventKey);
    final tx = XpTransaction(
      id: _generateId(),
      matchId: matchId,
      source: source,
      amount: amount,
      description: description,
      occurredAt: DateTime.now(),
      metadata: metadata,
    );
    _transactions.add(tx);
    return tx;
  }

  String _generateId() =>
      'tx_${DateTime.now().millisecondsSinceEpoch}_${_transactions.length}';

  Map<String, dynamic> toJson() => {
        'transactions': _transactions.map((t) => t.toJson()).toList(),
        'creditedEventKeys': _creditedEventKeys.toList(),
      };

  factory XpLedger.fromJson(Map<String, dynamic> json) {
    final ledger = XpLedger.restored(
      transactions: (json['transactions'] as List? ?? [])
          .cast<Map<String, dynamic>>()
          .map(XpTransaction.fromJson)
          .toList(),
      creditedEventKeys: (json['creditedEventKeys'] as List? ?? [])
          .cast<String>()
          .toSet(),
    );
    return ledger;
  }
}

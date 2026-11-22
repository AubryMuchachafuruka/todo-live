/// The gameplay engine (Flame) produces MatchResult facts. The progression
/// system depends only on this interface — screens never hardcode awards,
/// and the engine never knows about the gameplay loop.
import '../progression/match_result.dart';

abstract class MatchResultSource {
  /// Produce the next match's verified facts. Returns null while no match
  /// is in progress.
  Future<MatchResult?> nextMatchResult();
}

/// A stub source used before the Flame gameplay engine is wired up.
class StubMatchResultSource implements MatchResultSource {
  @override
  Future<MatchResult?> nextMatchResult() async => null;
}

/// Boundary between the client and the authoritative online backend.
///
/// Online competitive achievements and ranking updates must be verified by
/// the server before they affect online progression. Offline results never
/// reach this boundary.

abstract class AchievementServer {
  /// Submit a match result to the authoritative server. Returns a signed
  /// verification token the client stores with the result.
  Future<ServerVerification> verifyMatchResult(Map<String, dynamic> matchPayload);

  /// Sync offline progress to the server when the player reconnects.
  Future<SyncResponse> syncProgress(Map<String, dynamic> progressPayload);

  /// Fetch the player's verified online achievements.
  Future<List<Map<String, dynamic>>> fetchVerifiedAchievements(String userId);
}

/// Signed verification returned by the server.
class ServerVerification {
  final String matchId;
  final bool accepted;
  final String signature; // server signature proving authoritative origin
  final int mmrDeltaWinner;
  final int mmrDeltaLoser;
  final DateTime verifiedAt;

  const ServerVerification({
    required this.matchId,
    required this.accepted,
    required this.signature,
    this.mmrDeltaWinner = 0,
    this.mmrDeltaLoser = 0,
    required this.verifiedAt,
  });
}

/// Response from a progress sync.
class SyncResponse {
  final bool success;
  final List<Map<String, dynamic>> newAchievements;
  final String? error;
  const SyncResponse({
    required this.success,
    this.newAchievements = const [],
    this.error,
  });
}

/// Stub server used in tests and offline-first development. Production
/// replaces this with a Firebase Functions / authoritative backend that
/// never exposes credentials in the Flutter app.
class StubAchievementServer implements AchievementServer {
  @override
  Future<ServerVerification> verifyMatchResult(
          Map<String, dynamic> matchPayload) async {
    // Simulate network latency.
    await Future.delayed(const Duration(milliseconds: 100));
    final matchId = matchPayload['matchId'] as String? ?? 'unknown';
    return ServerVerification(
      matchId: matchId,
      accepted: true,
      signature: 'sig_$matchId',
      mmrDeltaWinner: 25,
      mmrDeltaLoser: -25,
      verifiedAt: DateTime.now(),
    );
  }

  @override
  Future<SyncResponse> syncProgress(
          Map<String, dynamic> progressPayload) async {
    await Future.delayed(const Duration(milliseconds: 100));
    return const SyncResponse(success: true);
  }

  @override
  Future<List<Map<String, dynamic>>> fetchVerifiedAchievements(
          String userId) async {
    await Future.delayed(const Duration(milliseconds: 100));
    return const [];
  }
}

import 'package:flutter/material.dart';
import '../progression/rankings.dart';

/// Online multiplayer rankings — separate from offline progression.
/// Players are ranked by competitive performance (MMR, win/loss record),
/// never by number of matches played.
class RankingsScreen extends StatelessWidget {
  const RankingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Online Rankings')),
      body: const _RankingsBody(),
    );
  }
}

class _RankingsBody extends StatelessWidget {
  const _RankingsBody();

  @override
  Widget build(BuildContext context) {
    return ListView(
      children: const [
        ListTile(
          title: Text('Global Leaderboard'),
          subtitle: Text('Ranked by verified competitive performance'),
        ),
        ListTile(
          title: Text('Zimbabwe Leaderboard'),
          subtitle: Text('Players from Zimbabwe'),
        ),
        ListTile(
          title: Text('Friends Leaderboard'),
          subtitle: Text('Your friends'),
        ),
        ListTile(
          title: Text('Regional Leaderboard'),
          subtitle: Text('Your region'),
        ),
      ],
    );
  }
}

/// Render one ranked player row with tier badge.
Widget rankedPlayerRow(RankedPlayer player, int rank) {
  return ListTile(
    leading: CircleAvatar(child: Text('$rank')),
    title: Text(player.username),
    subtitle: Text('${player.tier.displayName}  •  MMR ${player.mmr}'),
    trailing: Text('${player.winRate.toStringAsFixed(0)}%'),
  );
}
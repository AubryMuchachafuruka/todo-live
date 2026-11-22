import 'package:flutter/material.dart';
import '../progression/hall_of_fame.dart';

/// STREET LEAGUE Hall of Fame — greatest players, teams, captains,
/// scorers and historic championship winners.
class HallOfFameScreen extends StatelessWidget {
  const HallOfFameScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Hall of Fame')),
      body: const _HallOfFameBody(),
    );
  }
}

class _HallOfFameBody extends StatelessWidget {
  const _HallOfFameBody();

  @override
  Widget build(BuildContext context) {
    return ListView(
      children: HallOfFameCategory.values.map((cat) {
        return ListTile(
          title: Text(_catName(cat)),
          subtitle: const Text('Hall of Fame entries'),
        );
      }).toList(),
    );
  }

  String _catName(HallOfFameCategory c) {
    switch (c) {
      case HallOfFameCategory.greatestPlayers:
        return 'Greatest Players';
      case HallOfFameCategory.greatestTeams:
        return 'Greatest Teams';
      case HallOfFameCategory.mostSuccessfulCaptains:
        return 'Most Successful Captains';
      case HallOfFameCategory.highestRatedPlayers:
        return 'Highest-rated Players';
      case HallOfFameCategory.allTimeTopScorers:
        return 'All-time Top Scorers';
      case HallOfFameCategory.mostSuccessfulClubs:
        return 'Most Successful Clubs';
      case HallOfFameCategory.longestUnbeatenStreaks:
        return 'Longest Unbeaten Streaks';
      case HallOfFameCategory.mostDecoratedPlayers:
        return 'Most Decorated Players';
      case HallOfFameCategory.historicChampionshipWinners:
        return 'Historic Championship Winners';
    }
  }
}
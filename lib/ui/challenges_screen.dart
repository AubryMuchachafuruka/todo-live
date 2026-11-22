import 'package:flutter/material.dart';
import '../progression/challenges.dart';

/// Daily, weekly and special challenges with progress bars and rewards.
class ChallengesScreen extends StatelessWidget {
  const ChallengesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Challenges')),
      body: const _ChallengesBody(),
    );
  }
}

class _ChallengesBody extends StatelessWidget {
  const _ChallengesBody();

  @override
  Widget build(BuildContext context) {
    return ListView(
      children: allChallenges().map((c) => _ChallengeTile(challenge: c)).toList(),
    );
  }
}

class _ChallengeTile extends StatelessWidget {
  final Challenge challenge;
  const _ChallengeTile({required this.challenge});

  @override
  Widget build(BuildContext context) {
    return ListTile(
      title: Text(challenge.title),
      subtitle: Text(challenge.objective),
      trailing: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text('+${challenge.reward.xp} XP'),
          LinearProgressIndicator(value: challenge.completionRatio),
          Text(challenge.status == ChallengeStatus.completed
              ? 'Completed'
              : challenge.isExpired
                  ? 'Expired'
                  : 'Active'),
        ],
      ),
    );
  }
}
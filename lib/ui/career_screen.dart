import 'package:flutter/material.dart';
import '../progression/career.dart';

/// Career Mode screen — the story-based journey from unknown street
/// footballer to Hall of Fame legend.
class CareerScreen extends StatelessWidget {
  const CareerScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Career Mode')),
      body: const _CareerBody(),
    );
  }
}

class _CareerBody extends StatelessWidget {
  const _CareerBody();

  @override
  Widget build(BuildContext context) {
    return ListView(
      children: [
        for (final stage in CareerStage.values)
          _StageCard(stage: stage),
      ],
    );
  }
}

class _StageCard extends StatelessWidget {
  final CareerStage stage;
  const _StageCard({required this.stage});

  @override
  Widget build(BuildContext context) {
    final milestones = allCareerMilestones()
        .where((m) => m.stage == stage)
        .toList();
    return Card(
      margin: const EdgeInsets.all(8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ListTile(
            title: Text(stage.displayName,
                style: const TextStyle(fontWeight: FontWeight.bold)),
            subtitle: LinearProgressIndicator(
                value: milestones.isEmpty ? 1.0 : 0.0),
          ),
          ...milestones.map((m) => ListTile(
                leading: Icon(m.unlocked ? Icons.check_circle : Icons.radio_button_unchecked,
                    color: m.unlocked ? Colors.green : null),
                title: Text(m.title),
                subtitle: Text(m.description),
              )),
        ],
      ),
    );
  }
}
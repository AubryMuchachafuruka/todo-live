import 'package:flutter/material.dart';
import '../progression/notifications.dart';

/// Achievement notification overlay presentation.
///
/// Shows a darkened screen, a golden badge, a short trophy animation, and
/// the ACHIEVEMENT UNLOCKED! text with View / Share / Continue buttons.
/// Important achievements get unique sound effects and animations. This
/// overlay is triggered by the engine outcome, never by individual screens.
class AchievementNotificationOverlay extends StatelessWidget {
  final List<AchievementNotification> notifications;
  final VoidCallback onContinue;

  const AchievementNotificationOverlay({
    super.key,
    required this.notifications,
    required this.onContinue,
  });

  @override
  Widget build(BuildContext context) {
    final n = notifications.isEmpty ? null : notifications.first;
    if (n == null) return const SizedBox.shrink();

    return Stack(
      children: [
        // Darkened screen
        ModalBarrier(color: Colors.black.withOpacity(0.75), dismissible: false),
        Center(
          child: Card(
            elevation: 24,
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Golden badge / trophy animation placeholder
                  Container(
                    width: 96,
                    height: 96,
                    decoration: BoxDecoration(
                      color: n.importance == NotificationImportance.important
                          ? const Color(0xFFFFD700)
                          : const Color(0xFFC0C0C0),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.emoji_events, size: 48),
                  ),
                  const SizedBox(height: 16),
                  Text('ACHIEVEMENT UNLOCKED!',
                      style: const TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 2)),
                  const SizedBox(height: 8),
                  Text(
                    n.unlocked.definition.name,
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    n.unlocked.definition.description,
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 8),
                  Text('+${n.unlocked.xpAwarded} XP',
                      style: const TextStyle(color: Colors.green)),
                  const SizedBox(height: 16),
                  Wrap(
                    spacing: 8,
                    children: n.buttons
                        .map((b) => TextButton(onPressed: onContinue, child: Text(b)))
                        .toList(),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}

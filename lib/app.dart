import 'package:flutter/material.dart';
import 'progression_provider.dart';
import 'ui/player_profile_screen.dart';
import 'ui/trophy_room_screen.dart';
import 'ui/achievements_screen.dart';
import 'ui/career_screen.dart';
import 'ui/challenges_screen.dart';
import 'ui/hall_of_fame_screen.dart';
import 'ui/rankings_screen.dart';

/// STREET LEAGUE — Chitungwiza Street Champions.
/// Developer: MD.dev  •  Application ID: com.muchafz.streetleague
class StreetLeagueApp extends StatelessWidget {
  const StreetLeagueApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Street League',
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFFD43420), // street red / Zimbabwean soil
          brightness: Brightness.dark,
        ),
        textTheme: const TextTheme(
          displayLarge: TextStyle(fontFamily: 'StreetDisplay', fontSize: 32),
          titleLarge: TextStyle(fontFamily: 'StreetDisplay', fontSize: 24),
          bodyMedium: TextStyle(fontFamily: 'StreetDisplay'),
        ),
      ),
      home: const PlayerProfileScreen(),
      routes: {
        '/profile': (_) => const PlayerProfileScreen(),
        '/trophy-room': (_) => const TrophyRoomScreen(),
        '/achievements': (_) => const AchievementsScreen(),
        '/career': (_) => const CareerScreen(),
        '/challenges': (_) => const ChallengesScreen(),
        '/hall-of-fame': (_) => const HallOfFameScreen(),
        '/rankings': (_) => const RankingsScreen(),
      },
    );
  }
}

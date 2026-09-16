update planned_sessions
set session_name = 'Entraînement flag'
where activity_type = 'flag_football'
  and session_name = 'Entraînement habituel';

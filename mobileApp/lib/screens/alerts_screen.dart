import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/alert_model.dart';
import '../services/notification_service.dart';

class AlertsScreen extends StatefulWidget {
  const AlertsScreen({super.key});

  @override
  State<AlertsScreen> createState() => _AlertsScreenState();
}

class _AlertsScreenState extends State<AlertsScreen> {
  // ── Palette ────────────────────────────────────────────────────────────────
  static const _cyan      = Color(0xFF00FFE7);
  static const _cyanDim   = Color(0x9900FFE7);
  static const _cyanFaint = Color(0x0A00FFE7);
  static const _cyanBord  = Color(0x2800FFE7);
  static const _magenta   = Color(0xFFFF00CC);
  static const _bg        = Color(0xFF020C18);
  static const _bgPanel   = Color(0xFF071526);

  final _supabase = Supabase.instance.client;

  List<AlertModel>         _alerts         = [];
  bool                     _loading        = true;
  RealtimeChannel?         _channel;
  RealtimeSubscribeStatus? _realtimeStatus;

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  @override
  void initState() {
    super.initState();
    _loadAlerts();
    _subscribeRealtime();
    _listenFcmForeground();
  }

  @override
  void dispose() {
    _channel?.unsubscribe();
    super.dispose();
  }

  // ── FCM foreground ─────────────────────────────────────────────────────────
  // When the app is OPEN, Android does not show the FCM notification
  // automatically. We show it via flutter_local_notifications.
  // The list update is handled by Supabase Realtime — no duplication.
  void _listenFcmForeground() {
    FirebaseMessaging.onMessage.listen((message) async {
      final body = message.notification?.body ?? message.data['message'];
      if (body == null || body.isEmpty) return;
      await NotificationService.instance.showAlertNotification(
        id:      DateTime.now().millisecondsSinceEpoch & 0x7FFFFFFF,
        message: body,
      );
    });
  }

  // ── Supabase Realtime ──────────────────────────────────────────────────────
  void _subscribeRealtime() {
    _channel?.unsubscribe();

    _channel = _supabase
        .channel('public:alerts')
        .onPostgresChanges(
          event:    PostgresChangeEvent.insert,
          schema:   'public',
          table:    'alerts',
          callback: (payload) {
            try {
              final record = payload.newRecord;
              if (record.isEmpty) return;
              final alert = AlertModel.fromJson(record);
              if (!mounted) return;
              setState(() => _alerts.insert(0, alert));
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(
                    '⚡ ${alert.message}',
                    style: const TextStyle(
                      fontFamily: 'monospace',
                      color:      Color(0xFF020C18),
                      fontSize:   13,
                    ),
                  ),
                  backgroundColor: _cyan,
                  duration:        const Duration(seconds: 4),
                ),
              );
            } catch (e) {
              print('[Realtime] INSERT error: $e');
            }
          },
        )
        .onPostgresChanges(
          event:    PostgresChangeEvent.update,
          schema:   'public',
          table:    'alerts',
          callback: (payload) {
            try {
              final record = payload.newRecord;
              if (record.isEmpty) return;
              final updated = AlertModel.fromJson(record);
              if (!mounted) return;
              setState(() {
                final idx = _alerts.indexWhere((a) => a.id == updated.id);
                if (idx != -1) _alerts[idx] = updated;
              });
            } catch (e) {
              print('[Realtime] UPDATE error: $e');
            }
          },
        )
        .onPostgresChanges(
          event:    PostgresChangeEvent.delete,
          schema:   'public',
          table:    'alerts',
          callback: (payload) {
            try {
              final deletedId = payload.oldRecord['id'] as String?;
              if (deletedId == null) return;
              if (!mounted) return;
              setState(() => _alerts.removeWhere((a) => a.id == deletedId));
            } catch (e) {
              print('[Realtime] DELETE error: $e');
            }
          },
        )
        .subscribe((status, error) {
          print('[Realtime] $status  $error');
          if (!mounted) return;
          setState(() => _realtimeStatus = status);
          if (status == RealtimeSubscribeStatus.timedOut ||
              status == RealtimeSubscribeStatus.channelError) {
            Future.delayed(const Duration(seconds: 5), () {
              if (mounted) _subscribeRealtime();
            });
          }
        });
  }

  // ── Data ───────────────────────────────────────────────────────────────────
  Future<void> _loadAlerts() async {
    setState(() => _loading = true);
    try {
      final data = await _supabase
          .from('alerts')
          .select()
          .order('created_at', ascending: false);
      if (!mounted) return;
      setState(() {
        _alerts  = (data as List<dynamic>)
            .map((e) => AlertModel.fromJson(e as Map<String, dynamic>))
            .toList();
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _loading = false);
    }
  }

  Future<void> _markAsRead(AlertModel alert) async {
    if (alert.isRead) return;
    setState(() => alert.isRead = true);
    try {
      await _supabase.from('alerts').update({'is_read': true}).eq('id', alert.id);
    } catch (_) {
      setState(() => alert.isRead = false);
    }
  }

  Future<void> _markAllAsRead() async {
    final unread = _alerts.where((a) => !a.isRead).toList();
    if (unread.isEmpty) return;
    setState(() { for (final a in unread) a.isRead = true; });
    try {
      await _supabase.from('alerts').update({'is_read': true}).eq('is_read', false);
    } catch (_) {
      setState(() { for (final a in unread) a.isRead = false; });
    }
  }

  Future<void> _deleteAlert(AlertModel alert) async {
    setState(() => _alerts.removeWhere((a) => a.id == alert.id));
    try {
      await _supabase.from('alerts').delete().eq('id', alert.id);
    } catch (_) {
      setState(() => _alerts.insert(0, alert));
    }
  }

  int get _unreadCount => _alerts.where((a) => !a.isRead).length;

  // ── Realtime status dot ────────────────────────────────────────────────────
  Color get _statusColor {
    switch (_realtimeStatus) {
      case RealtimeSubscribeStatus.subscribed:   return const Color(0xFF00FF88);
      case null:                                 return const Color(0xFFFFAA00);
      default:                                   return _magenta;
    }
  }

  String get _statusLabel {
    switch (_realtimeStatus) {
      case RealtimeSubscribeStatus.subscribed:   return 'CONNECTED';
      case RealtimeSubscribeStatus.timedOut:     return 'TIMED_OUT';
      case RealtimeSubscribeStatus.channelError: return 'ERROR';
      case RealtimeSubscribeStatus.closed:       return 'CLOSED';
      case null:                                 return 'CONNECTING';
    }
  }

  // ── Build ──────────────────────────────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _bg,
      appBar: _buildAppBar(),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: _cyan))
          : _alerts.isEmpty
              ? _buildEmpty()
              : RefreshIndicator(
                  color:           _cyan,
                  backgroundColor: _bgPanel,
                  onRefresh:       _loadAlerts,
                  child: ListView.separated(
                    padding:          const EdgeInsets.symmetric(vertical: 6),
                    itemCount:        _alerts.length,
                    separatorBuilder: (_, __) =>
                        const Divider(height: 1, color: _cyanBord),
                    itemBuilder: (_, i) => _buildAlertTile(_alerts[i]),
                  ),
                ),
    );
  }

  PreferredSizeWidget _buildAppBar() => AppBar(
        backgroundColor: _bg,
        elevation:       0,
        titleSpacing:    16,
        title: Row(
          children: [
            const Text(
              'FEW_TIME@HOME',
              style: TextStyle(
                fontFamily:    'monospace',
                fontSize:      12,
                fontWeight:    FontWeight.bold,
                color:         _cyan,
                letterSpacing: 2.5,
              ),
            ),
            const SizedBox(width: 8),
            Tooltip(
              message: 'Realtime: $_statusLabel',
              child: Container(
                width:  8,
                height: 8,
                decoration: BoxDecoration(
                  shape:     BoxShape.circle,
                  color:     _statusColor,
                  boxShadow: [BoxShadow(
                      color:      _statusColor.withOpacity(0.7),
                      blurRadius: 5)],
                ),
              ),
            ),
            if (_unreadCount > 0) ...[
              const SizedBox(width: 10),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color:        _magenta.withOpacity(0.12),
                  border:       Border.all(color: _magenta),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  '$_unreadCount',
                  style: const TextStyle(
                    color:      _magenta,
                    fontSize:   11,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ],
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(height: 1, color: _cyan.withOpacity(0.28)),
        ),
        actions: [
          if (_unreadCount > 0)
            IconButton(
              icon:      const Icon(Icons.done_all, size: 20, color: _cyanDim),
              tooltip:   'Marcar todo como leído',
              onPressed: _markAllAsRead,
            ),
          IconButton(
            icon:      const Icon(Icons.refresh, size: 20, color: _cyanDim),
            tooltip:   'Recargar',
            onPressed: _loadAlerts,
          ),
        ],
      );

  Widget _buildEmpty() => Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.notifications_none, size: 54, color: _cyan.withOpacity(0.2)),
            const SizedBox(height: 16),
            const Text(
              '// SIN ALERTAS //',
              style: TextStyle(
                fontFamily:    'monospace',
                color:         _cyanDim,
                fontSize:      12,
                letterSpacing: 2,
              ),
            ),
          ],
        ),
      );

  Widget _buildAlertTile(AlertModel alert) {
    final date = DateFormat('dd/MM/yy  HH:mm').format(alert.createdAt);

    return Dismissible(
      key:       Key(alert.id),
      direction: DismissDirection.endToStart,
      background: Container(
        alignment: Alignment.centerRight,
        padding:   const EdgeInsets.only(right: 20),
        color:     _magenta.withOpacity(0.12),
        child:     const Icon(Icons.delete_outline, color: _magenta, size: 22),
      ),
      onDismissed: (_) => _deleteAlert(alert),
      child: InkWell(
        onTap:       () => _markAsRead(alert),
        splashColor: _cyan.withOpacity(0.05),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            color:  alert.isRead ? Colors.transparent : _cyanFaint,
            border: alert.isRead
                ? null
                : const Border(left: BorderSide(color: _cyan, width: 2.5)),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.only(top: 5, right: 10),
                child: Container(
                  width:  7,
                  height: 7,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: alert.isRead ? Colors.transparent : _cyan,
                    boxShadow: alert.isRead
                        ? null
                        : [BoxShadow(color: _cyan.withOpacity(0.6), blurRadius: 4)],
                  ),
                ),
              ),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      alert.message,
                      style: TextStyle(
                        fontFamily: 'monospace',
                        fontSize:   13.5,
                        color:      alert.isRead ? _cyanDim : _cyan,
                        height:     1.4,
                      ),
                    ),
                    const SizedBox(height: 5),
                    Row(
                      children: [
                        Text(
                          date,
                          style: TextStyle(
                            fontFamily: 'monospace',
                            fontSize:   10,
                            color:      _cyan.withOpacity(0.3),
                          ),
                        ),
                        if (alert.isRecurring) ...[
                          const SizedBox(width: 8),
                          Icon(Icons.repeat, size: 11, color: _cyan.withOpacity(0.3)),
                          const SizedBox(width: 3),
                          Text(
                            'recurrente',
                            style: TextStyle(
                              fontFamily: 'monospace',
                              fontSize:   10,
                              color:      _cyan.withOpacity(0.3),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

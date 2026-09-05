package in.catchabit.time.widget;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.widget.RemoteViews;
import android.widget.Toast;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import in.catchabit.time.MainActivity;
import in.catchabit.time.R;

public class FloorAdherenceWidget extends AppWidgetProvider {

    private static final String TAG = "FloorAdherenceWidget";
    public static final String ACTION_CHECK_IN = "in.catchabit.time.widget.ACTION_CHECK_IN";
    public static final String ACTION_BREAK = "in.catchabit.time.widget.ACTION_BREAK";
    public static final String ACTION_CHECK_OUT = "in.catchabit.time.widget.ACTION_CHECK_OUT";
    public static final String ACTION_REFRESH = "in.catchabit.time.widget.ACTION_REFRESH";

    // Official production domain
    private static final String API_BASE = "https://time.catchabit.in";
    private static final ExecutorService executor = Executors.newSingleThreadExecutor();
    private static final Handler mainHandler = new Handler(Looper.getMainLooper());

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
        // Background refresh from server
        refreshWidgetData(context);
    }

    private static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_floor_adherence);

        // Read cached values from CapacitorStorage SharedPreferences
        SharedPreferences prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
        String status = prefs.getString("today_status", "not_checked_in");
        String floorHours = prefs.getString("today_floor_hours", "0.00");
        String breakHours = prefs.getString("today_break_hours", "0.00");
        String shortfallHours = prefs.getString("today_shortfall_hours", "7.00");
        String subtext = prefs.getString("widget_subtext", "Tap action below to update");
        String syncTime = prefs.getString("last_sync_time", "--:--");

        // Check if today is Saturday or Sunday in IST
        Calendar cal = Calendar.getInstance(TimeZone.getTimeZone("Asia/Kolkata"));
        int dayOfWeek = cal.get(Calendar.DAY_OF_WEEK);
        boolean isWeekendToday = (dayOfWeek == Calendar.SATURDAY || dayOfWeek == Calendar.SUNDAY);

        // Dynamic status badge styling
        String displayStatus = "⚡ READY";
        int badgeBg = R.drawable.widget_badge_ready;
        int statusColor = Color.parseColor("#A78BFA");
        String breakButtonText = "☕ Break";
        String targetText = "Target: 7.0h floor quota";

        if ("active".equals(status)) {
            displayStatus = "● ON FLOOR";
            badgeBg = R.drawable.widget_badge_green;
            statusColor = Color.parseColor("#10B981");
            breakButtonText = "☕ Break";
            targetText = isWeekendToday ? "Target: 0.0h (Bonus Adherence)" : "Target: 7.0h floor quota";
        } else if ("on_break".equals(status)) {
            displayStatus = "☕ ON BREAK";
            badgeBg = R.drawable.widget_badge_amber;
            statusColor = Color.parseColor("#F59E0B");
            breakButtonText = "▶️ Resume";
            targetText = isWeekendToday ? "Target: 0.0h (Bonus Adherence)" : "Target: 7.0h floor quota";
        } else if ("completed".equals(status)) {
            displayStatus = "✓ CHECKED OUT";
            badgeBg = R.drawable.widget_badge_indigo;
            statusColor = Color.parseColor("#818CF8");
            targetText = isWeekendToday ? "Target: 0.0h (Bonus Adherence)" : "Target: 7.0h floor quota";
        } else if ("wfh".equals(status)) {
            displayStatus = "🏠 WFH";
            badgeBg = R.drawable.widget_badge_cyan;
            statusColor = Color.parseColor("#38BDF8");
            targetText = "Target: 0.0h (WFH Exempted)";
            subtext = "Remote — Quota Exempted";
            shortfallHours = "0.00";
        } else if ("leave".equals(status)) {
            displayStatus = "🏖️ LEAVE";
            badgeBg = R.drawable.widget_badge_amber;
            statusColor = Color.parseColor("#F59E0B");
            targetText = "Target: 0.0h (Leave Exempted)";
            subtext = "Leave — Quota Exempted";
            shortfallHours = "0.00";
        } else if ("weekend".equals(status) || isWeekendToday) {
            displayStatus = "🌴 WEEKEND";
            badgeBg = R.drawable.widget_badge_green;
            statusColor = Color.parseColor("#34D399");
            targetText = "Target: 0.0h (Weekend Off)";
            subtext = "Weekend — Quota Exempted";
            shortfallHours = "0.00";
        }

        views.setTextViewText(R.id.tv_widget_status, displayStatus);
        views.setTextColor(R.id.tv_widget_status, statusColor);
        views.setInt(R.id.tv_widget_status, "setBackgroundResource", badgeBg);

        views.setTextViewText(R.id.tv_floor_time, floorHours);
        views.setTextViewText(R.id.tv_target_subtext, targetText);
        views.setTextViewText(R.id.tv_widget_subtext, subtext);
        views.setTextViewText(R.id.tv_widget_breaks, "☕ Break: " + breakHours + "h");

        double shortfallVal = 0.0;
        try {
            shortfallVal = Double.parseDouble(shortfallHours);
        } catch (Exception ignored) {}

        boolean isExemptedState = isWeekendToday || "weekend".equals(status) || "wfh".equals(status) || "leave".equals(status);
        if (shortfallVal <= 0.0 || isExemptedState) {
            views.setTextViewText(R.id.tv_widget_shortfall, "✓ Quota Met!");
            views.setTextColor(R.id.tv_widget_shortfall, Color.parseColor("#34D399"));
        } else {
            views.setTextViewText(R.id.tv_widget_shortfall, "⚡ Left: " + shortfallHours + "h");
            views.setTextColor(R.id.tv_widget_shortfall, Color.parseColor("#F87171"));
        }

        views.setTextViewText(R.id.tv_widget_synced, "Synced: " + syncTime);

        // Buttons styling: Disable completely when Weekend, WFH, or Leave
        if (isExemptedState) {
            views.setInt(R.id.btn_check_in, "setBackgroundResource", R.drawable.widget_btn_disabled);
            views.setInt(R.id.btn_break, "setBackgroundResource", R.drawable.widget_btn_disabled);
            views.setInt(R.id.btn_check_out, "setBackgroundResource", R.drawable.widget_btn_disabled);

            views.setTextColor(R.id.btn_check_in, Color.parseColor("#64748B"));
            views.setTextColor(R.id.btn_break, Color.parseColor("#64748B"));
            views.setTextColor(R.id.btn_check_out, Color.parseColor("#64748B"));

            views.setTextViewText(R.id.btn_check_in, "⚡ Off");
            views.setTextViewText(R.id.btn_break, "☕ Off");
            views.setTextViewText(R.id.btn_check_out, "🚪 Off");
        } else {
            views.setInt(R.id.btn_check_in, "setBackgroundResource", R.drawable.widget_btn_primary);
            views.setTextColor(R.id.btn_check_in, Color.parseColor("#FFFFFF"));
            views.setTextViewText(R.id.btn_check_in, "⚡ Check In");

            views.setInt(R.id.btn_break, "setBackgroundResource", R.drawable.widget_btn_amber);
            views.setTextColor(R.id.btn_break, Color.parseColor("#FBBF24"));
            views.setTextViewText(R.id.btn_break, breakButtonText);

            views.setInt(R.id.btn_check_out, "setBackgroundResource", R.drawable.widget_btn_slate);
            views.setTextColor(R.id.btn_check_out, Color.parseColor("#F1F5F9"));
            views.setTextViewText(R.id.btn_check_out, "🚪 Check Out");
        }

        // Click on Header / Root opens the main app
        Intent openAppIntent = new Intent(context, MainActivity.class);
        PendingIntent openAppPending = PendingIntent.getActivity(
                context, 0, openAppIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_root, openAppPending);

        // Refresh Button
        Intent refreshIntent = new Intent(context, FloorAdherenceWidget.class);
        refreshIntent.setAction(ACTION_REFRESH);
        views.setOnClickPendingIntent(R.id.btn_widget_refresh, PendingIntent.getBroadcast(
                context, 100, refreshIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));

        // Button 1: Check In
        Intent inIntent = new Intent(context, FloorAdherenceWidget.class);
        inIntent.setAction(ACTION_CHECK_IN);
        views.setOnClickPendingIntent(R.id.btn_check_in, PendingIntent.getBroadcast(
                context, 101, inIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));

        // Button 2: Break
        Intent breakIntent = new Intent(context, FloorAdherenceWidget.class);
        breakIntent.setAction(ACTION_BREAK);
        views.setOnClickPendingIntent(R.id.btn_break, PendingIntent.getBroadcast(
                context, 102, breakIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));

        // Button 3: Check Out
        Intent outIntent = new Intent(context, FloorAdherenceWidget.class);
        outIntent.setAction(ACTION_CHECK_OUT);
        views.setOnClickPendingIntent(R.id.btn_check_out, PendingIntent.getBroadcast(
                context, 103, outIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);

        String action = intent.getAction();
        if (action == null) return;

        if (ACTION_CHECK_IN.equals(action) || ACTION_BREAK.equals(action) ||
            ACTION_CHECK_OUT.equals(action)) {
            
            final PendingResult pendingResult = goAsync();
            executor.execute(() -> {
                try {
                    handleWidgetAction(context, action);
                } finally {
                    pendingResult.finish();
                }
            });

        } else if (ACTION_REFRESH.equals(action)) {
            final PendingResult pendingResult = goAsync();
            executor.execute(() -> {
                try {
                    refreshWidgetData(context);
                } finally {
                    pendingResult.finish();
                }
            });
        }
    }

    private void handleWidgetAction(Context context, String action) {
        SharedPreferences prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
        String token = prefs.getString("ca_time_token", null);

        if (token == null || token.trim().isEmpty()) {
            mainHandler.post(() -> Toast.makeText(context, "Please open Floor Adherence and log in first", Toast.LENGTH_LONG).show());
            Intent launch = new Intent(context, MainActivity.class);
            launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(launch);
            return;
        }

        // Guard against actions when on Weekend, WFH, or Leave
        Calendar cal = Calendar.getInstance(TimeZone.getTimeZone("Asia/Kolkata"));
        int dayOfWeek = cal.get(Calendar.DAY_OF_WEEK);
        boolean isWeekendToday = (dayOfWeek == Calendar.SATURDAY || dayOfWeek == Calendar.SUNDAY);
        String currentStatus = prefs.getString("today_status", "not_checked_in");

        if (isWeekendToday || "weekend".equals(currentStatus)) {
            mainHandler.post(() -> Toast.makeText(context, "🌴 Actions disabled on Weekend (Quota Exempted)", Toast.LENGTH_SHORT).show());
            return;
        }
        if ("wfh".equals(currentStatus)) {
            mainHandler.post(() -> Toast.makeText(context, "🏠 Actions disabled for WFH. Manage via Calendar in App.", Toast.LENGTH_SHORT).show());
            return;
        }
        if ("leave".equals(currentStatus)) {
            mainHandler.post(() -> Toast.makeText(context, "🏖️ Actions disabled for Leave. Manage via Calendar in App.", Toast.LENGTH_SHORT).show());
            return;
        }

        try {
            String endpoint = "";
            String jsonBody = "{}";
            String successMsg = "Updated!";

            if (ACTION_CHECK_IN.equals(action)) {
                endpoint = "/api/attendance/check-in";
                jsonBody = "{\"work_mode\":\"office\"}";
                successMsg = "⚡ Checked in to Office Floor!";
            } else if (ACTION_BREAK.equals(action)) {
                if ("on_break".equals(currentStatus)) {
                    endpoint = "/api/attendance/break/resume";
                    successMsg = "▶️ Resumed work (Break ended)";
                } else {
                    endpoint = "/api/attendance/break/start";
                    successMsg = "☕ Break started";
                }
            } else if (ACTION_CHECK_OUT.equals(action)) {
                endpoint = "/api/attendance/check-out";
                successMsg = "🚪 Checked out for today";
            }

            String response = makeApiPost(API_BASE + endpoint, jsonBody, token);
            Log.d(TAG, "Action " + action + " result: " + response);

            final String toastText = successMsg;
            mainHandler.post(() -> Toast.makeText(context, toastText, Toast.LENGTH_SHORT).show());

            // Refresh widget with updated server stats
            refreshWidgetData(context);

        } catch (Exception e) {
            Log.e(TAG, "Widget action error", e);
            String errMsg = e.getMessage() != null ? e.getMessage() : "Unknown error";
            if (errMsg.contains("already checked in")) {
                errMsg = "Already checked in!";
            } else if (errMsg.contains("No active check-in")) {
                errMsg = "Not checked in yet!";
            }
            final String finalMsg = errMsg;
            mainHandler.post(() -> Toast.makeText(context, finalMsg, Toast.LENGTH_SHORT).show());
            refreshWidgetData(context);
        }
    }

    private static void refreshWidgetData(Context context) {
        SharedPreferences prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
        String token = prefs.getString("ca_time_token", null);
        if (token == null || token.trim().isEmpty()) return;

        try {
            String response = makeApiGet(API_BASE + "/api/attendance/today", token);
            JSONObject obj = new JSONObject(response);

            String workMode = obj.optString("workMode", "office");
            boolean isLeave = obj.optBoolean("isLeave", false);
            boolean isWeekend = obj.optBoolean("isWeekend", false);
            boolean isExempted = obj.optBoolean("isExempted", false);

            JSONObject session = obj.optJSONObject("session");
            String status = isLeave ? "leave" : (session != null ? session.optString("status", "not_checked_in") : (isWeekend ? "weekend" : "not_checked_in"));
            if ("wfh".equals(workMode)) status = "wfh";

            JSONObject stats = obj.optJSONObject("stats");
            int floorSeconds = stats != null ? stats.optInt("floorSeconds", 0) : 0;
            int breakSeconds = stats != null ? stats.optInt("breakSeconds", 0) : 0;
            int targetSeconds = stats != null ? stats.optInt("targetSeconds", 7 * 3600) : 7 * 3600;

            double floorHours = floorSeconds / 3600.0;
            double breakHours = breakSeconds / 3600.0;
            double shortfallHours = Math.max(0, (targetSeconds - floorSeconds) / 3600.0);

            if (isWeekend || isExempted || "wfh".equals(workMode) || isLeave) {
                shortfallHours = 0.0;
            }

            String floorFormatted = String.format(Locale.US, "%.2f", floorHours);
            String breakFormatted = String.format(Locale.US, "%.2f", breakHours);
            String shortfallFormatted = String.format(Locale.US, "%.2f", shortfallHours);
            String syncFormatted = new SimpleDateFormat("hh:mm a", Locale.US).format(new Date());

            String subtext = isWeekend ? "Weekend — Quota Exempted" : ("wfh".equals(workMode) ? "WFH — Quota Exempted" : (isLeave ? "Leave — Quota Exempted" : "Target: 7.0h daily quota"));

            SharedPreferences.Editor editor = prefs.edit();
            editor.putString("today_status", status);
            editor.putString("today_floor_hours", floorFormatted);
            editor.putString("today_break_hours", breakFormatted);
            editor.putString("today_shortfall_hours", shortfallFormatted);
            editor.putString("last_sync_time", syncFormatted);
            editor.putString("widget_subtext", subtext);
            editor.apply();

            // Notify all widgets to update
            AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
            ComponentName thisWidget = new ComponentName(context, FloorAdherenceWidget.class);
            int[] allIds = appWidgetManager.getAppWidgetIds(thisWidget);
            for (int id : allIds) {
                updateAppWidget(context, appWidgetManager, id);
            }

        } catch (Exception e) {
            Log.e(TAG, "Failed to fetch today data for widget", e);
        }
    }

    private static String makeApiPost(String urlStr, String jsonBody, String token) throws Exception {
        URL url = new URL(urlStr);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("POST");
        conn.setRequestProperty("Content-Type", "application/json");
        conn.setRequestProperty("Authorization", "Bearer " + token);
        conn.setConnectTimeout(8000);
        conn.setReadTimeout(8000);
        conn.setDoOutput(true);

        try (OutputStream os = conn.getOutputStream()) {
            os.write(jsonBody.getBytes("utf-8"));
        }

        int code = conn.getResponseCode();
        InputStream is = (code >= 200 && code < 300) ? conn.getInputStream() : conn.getErrorStream();
        BufferedReader reader = new BufferedReader(new InputStreamReader(is, "utf-8"));
        StringBuilder sb = new StringBuilder();
        String line;
        while ((line = reader.readLine()) != null) {
            sb.append(line);
        }
        reader.close();
        conn.disconnect();

        if (code >= 400) {
            try {
                JSONObject errObj = new JSONObject(sb.toString());
                String msg = errObj.optString("error", "Error " + code);
                throw new Exception(msg);
            } catch (Exception jsonErr) {
                if (jsonErr.getMessage() != null && !jsonErr.getMessage().startsWith("Value")) {
                    throw jsonErr;
                }
                throw new Exception("Server error " + code + ": " + sb.toString());
            }
        }
        return sb.toString();
    }

    private static String makeApiGet(String urlStr, String token) throws Exception {
        URL url = new URL(urlStr);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("GET");
        conn.setRequestProperty("Content-Type", "application/json");
        conn.setRequestProperty("Authorization", "Bearer " + token);
        conn.setConnectTimeout(8000);
        conn.setReadTimeout(8000);

        int code = conn.getResponseCode();
        InputStream is = (code >= 200 && code < 300) ? conn.getInputStream() : conn.getErrorStream();
        BufferedReader reader = new BufferedReader(new InputStreamReader(is, "utf-8"));
        StringBuilder sb = new StringBuilder();
        String line;
        while ((line = reader.readLine()) != null) {
            sb.append(line);
        }
        reader.close();
        conn.disconnect();

        if (code >= 400) {
            try {
                JSONObject errObj = new JSONObject(sb.toString());
                String msg = errObj.optString("error", "Error " + code);
                throw new Exception(msg);
            } catch (Exception jsonErr) {
                if (jsonErr.getMessage() != null && !jsonErr.getMessage().startsWith("Value")) {
                    throw jsonErr;
                }
                throw new Exception("Server error " + code);
            }
        }
        return sb.toString();
    }
}

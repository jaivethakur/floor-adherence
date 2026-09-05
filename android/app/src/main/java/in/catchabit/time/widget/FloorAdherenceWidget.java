package in.catchabit.time.widget;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
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
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import in.catchabit.time.MainActivity;
import in.catchabit.time.R;

public class FloorAdherenceWidget extends AppWidgetProvider {

    private static final String TAG = "FloorAdherenceWidget";
    public static final String ACTION_CHECK_IN = "in.catchabit.time.widget.ACTION_CHECK_IN";
    public static final String ACTION_BREAK = "in.catchabit.time.widget.ACTION_BREAK";
    public static final String ACTION_CHECK_OUT = "in.catchabit.time.widget.ACTION_CHECK_OUT";
    public static final String ACTION_WFH = "in.catchabit.time.widget.ACTION_WFH";
    public static final String ACTION_REFRESH = "in.catchabit.time.widget.ACTION_REFRESH";

    private static final String API_BASE = "https://catchabit-time.pages.dev";
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
        String subtext = prefs.getString("widget_subtext", "Tap action below to update");

        // Format status badge
        String displayStatus = "Ready";
        if ("active".equals(status)) displayStatus = "● On Floor";
        else if ("on_break".equals(status)) displayStatus = "☕ On Break";
        else if ("completed".equals(status)) displayStatus = "✓ Checked Out";
        else if ("wfh".equals(status)) displayStatus = "🏠 WFH";
        else if ("leave".equals(status)) displayStatus = "🏖️ Leave";

        views.setTextViewText(R.id.tv_widget_status, displayStatus);
        views.setTextViewText(R.id.tv_floor_time, floorHours + "h");
        views.setTextViewText(R.id.tv_widget_subtext, subtext);

        // Click on Header / Root opens the main app
        Intent openAppIntent = new Intent(context, MainActivity.class);
        PendingIntent openAppPending = PendingIntent.getActivity(
                context, 0, openAppIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_root, openAppPending);

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

        // Button 4: WFH
        Intent wfhIntent = new Intent(context, FloorAdherenceWidget.class);
        wfhIntent.setAction(ACTION_WFH);
        views.setOnClickPendingIntent(R.id.btn_wfh, PendingIntent.getBroadcast(
                context, 104, wfhIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);

        String action = intent.getAction();
        if (action == null) return;

        if (ACTION_CHECK_IN.equals(action) || ACTION_BREAK.equals(action) ||
            ACTION_CHECK_OUT.equals(action) || ACTION_WFH.equals(action)) {
            handleWidgetAction(context, action);
        } else if (ACTION_REFRESH.equals(action)) {
            refreshWidgetData(context);
        }
    }

    private void handleWidgetAction(Context context, String action) {
        SharedPreferences prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
        String token = prefs.getString("ca_time_token", null);

        if (token == null || token.trim().isEmpty()) {
            Toast.makeText(context, "Please open Floor Adherence and log in first", Toast.LENGTH_LONG).show();
            Intent launch = new Intent(context, MainActivity.class);
            launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(launch);
            return;
        }

        executor.execute(() -> {
            try {
                String endpoint = "";
                String jsonBody = "{}";
                String successMsg = "Updated!";

                if (ACTION_CHECK_IN.equals(action)) {
                    endpoint = "/api/attendance/check-in";
                    jsonBody = "{\"work_mode\":\"office\"}";
                    successMsg = "⚡ Checked in to Office Floor!";
                } else if (ACTION_BREAK.equals(action)) {
                    String currentStatus = prefs.getString("today_status", "not_checked_in");
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
                } else if (ACTION_WFH.equals(action)) {
                    endpoint = "/api/attendance/mark-wfh";
                    successMsg = "🏠 Marked as Work From Home";
                }

                String response = makeApiPost(API_BASE + endpoint, jsonBody, token);
                Log.d(TAG, "Action " + action + " result: " + response);

                final String toastText = successMsg;
                mainHandler.post(() -> Toast.makeText(context, toastText, Toast.LENGTH_SHORT).show());

                // Refresh after action
                refreshWidgetData(context);

            } catch (Exception e) {
                Log.e(TAG, "Widget action error", e);
                mainHandler.post(() -> Toast.makeText(context, "Action failed: " + e.getMessage(), Toast.LENGTH_SHORT).show());
            }
        });
    }

    private static void refreshWidgetData(Context context) {
        SharedPreferences prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
        String token = prefs.getString("ca_time_token", null);
        if (token == null || token.trim().isEmpty()) return;

        executor.execute(() -> {
            try {
                String response = makeApiGet(API_BASE + "/api/attendance/today", token);
                JSONObject obj = new JSONObject(response);

                String workMode = obj.optString("workMode", "office");
                boolean isLeave = obj.optBoolean("isLeave", false);
                JSONObject session = obj.optJSONObject("session");
                String status = isLeave ? "leave" : (session != null ? session.optString("status", "not_checked_in") : "not_checked_in");
                if ("wfh".equals(workMode)) status = "wfh";

                int floorSeconds = obj.optInt("floorSeconds", 0);
                double floorHours = floorSeconds / 3600.0;
                String floorFormatted = String.format(java.util.Locale.US, "%.2f", floorHours);

                SharedPreferences.Editor editor = prefs.edit();
                editor.putString("today_status", status);
                editor.putString("today_floor_hours", floorFormatted);
                editor.putString("widget_subtext", "Updated: " + new java.text.SimpleDateFormat("hh:mm a", java.util.Locale.US).format(new java.util.Date()));
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
        });
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
            throw new Exception("HTTP " + code + ": " + sb.toString());
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
            throw new Exception("HTTP " + code + ": " + sb.toString());
        }
        return sb.toString();
    }
}

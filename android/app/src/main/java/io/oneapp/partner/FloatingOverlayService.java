package io.oneapp.partner;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.IBinder;
import android.provider.Settings;
import android.util.DisplayMetrics;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

public class FloatingOverlayService extends Service {

    public static final String ACTION_START_OVERLAY = "io.oneapp.partner.START_OVERLAY";
    public static final String ACTION_STOP_OVERLAY = "io.oneapp.partner.STOP_OVERLAY";
    public static final String ACTION_UPDATE_DATA = "io.oneapp.partner.UPDATE_DATA";

    public static final String EXTRA_EARNINGS = "extra_earnings";
    public static final String EXTRA_STATUS = "extra_status";

    private static final String CHANNEL_ID = "pintu_captain_overlay_channel";
    private static final int NOTIF_ID = 4040;

    private WindowManager windowManager;
    private View overlayView;
    private WindowManager.LayoutParams params;
    private TextView earningsTextView;
    private TextView statusTextView;

    private boolean isOverlayAdded = false;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null) {
            String action = intent.getAction();
            if (ACTION_STOP_OVERLAY.equals(action)) {
                removeFloatingOverlay();
                stopForeground(true);
                stopSelf();
                return START_NOT_STICKY;
            } else if (ACTION_UPDATE_DATA.equals(action)) {
                String earnings = intent.getStringExtra(EXTRA_EARNINGS);
                String status = intent.getStringExtra(EXTRA_STATUS);
                updateOverlayContent(earnings, status);
                return START_STICKY;
            }
        }

        // Default: Start Overlay as Foreground Service
        startForeground(NOTIF_ID, createForegroundNotification());
        showFloatingOverlay();

        if (intent != null) {
            String earnings = intent.getStringExtra(EXTRA_EARNINGS);
            String status = intent.getStringExtra(EXTRA_STATUS);
            updateOverlayContent(earnings, status);
        }

        return START_STICKY;
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Pintu Captain Floating Assist",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Shows floating duty shortcut over navigation & other apps");
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private Notification createForegroundNotification() {
        Intent notificationIntent = new Intent(this, MainActivity.class);
        notificationIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this,
            0,
            notificationIntent,
            PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Pintu Captain Online")
            .setContentText("Floating shortcut active over other apps")
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentIntent(pendingIntent)
            .setOngoing(true);

        return builder.build();
    }

    private void showFloatingOverlay() {
        if (isOverlayAdded || overlayView != null) {
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(this)) {
            return;
        }

        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
        if (windowManager == null) return;

        int layoutType;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            layoutType = WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY;
        } else {
            layoutType = WindowManager.LayoutParams.TYPE_PHONE;
        }

        params = new WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            layoutType,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT
        );

        params.gravity = Gravity.TOP | Gravity.START;
        params.x = 20;
        params.y = 200;

        overlayView = buildNativeBubbleView();
        setupTouchListener(overlayView);

        try {
            windowManager.addView(overlayView, params);
            isOverlayAdded = true;
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private View buildNativeBubbleView() {
        Context ctx = this;
        DisplayMetrics dm = getResources().getDisplayMetrics();
        int paddingDp8 = (int) TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, 8, dm);
        int paddingDp6 = (int) TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, 6, dm);
        int sizeDp56 = (int) TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, 56, dm);

        // Root container (Pill shape)
        LinearLayout root = new LinearLayout(ctx);
        root.setOrientation(LinearLayout.HORIZONTAL);
        root.setGravity(Gravity.CENTER_VERTICAL);
        root.setPadding(paddingDp6, paddingDp6, paddingDp8 * 2, paddingDp6);

        GradientDrawable rootBg = new GradientDrawable();
        rootBg.setColor(Color.parseColor("#EE0B1120")); // Dark frosted background
        rootBg.setCornerRadius(999);
        rootBg.setStroke(3, Color.parseColor("#34D399")); // Emerald green border
        root.setBackground(rootBg);

        // Circular Icon Badge
        FrameLayout iconCircle = new FrameLayout(ctx);
        LinearLayout.LayoutParams circleLp = new LinearLayout.LayoutParams(sizeDp56, sizeDp56);
        iconCircle.setLayoutParams(circleLp);

        GradientDrawable circleBg = new GradientDrawable();
        circleBg.setShape(GradientDrawable.OVAL);
        circleBg.setColor(Color.parseColor("#059669"));
        iconCircle.setBackground(circleBg);

        TextView iconText = new TextView(ctx);
        iconText.setText("⚡");
        iconText.setTextSize(TypedValue.COMPLEX_UNIT_SP, 22);
        iconText.setGravity(Gravity.CENTER);
        FrameLayout.LayoutParams textLp = new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        );
        iconCircle.addView(iconText, textLp);

        root.addView(iconCircle);

        // Text labels container
        LinearLayout labels = new LinearLayout(ctx);
        labels.setOrientation(LinearLayout.VERTICAL);
        labels.setPadding(paddingDp8, 0, 0, 0);

        statusTextView = new TextView(ctx);
        statusTextView.setText("ONLINE");
        statusTextView.setTextColor(Color.parseColor("#34D399"));
        statusTextView.setTextSize(TypedValue.COMPLEX_UNIT_SP, 10);
        statusTextView.setTypeface(null, android.graphics.Typeface.BOLD);
        labels.addView(statusTextView);

        earningsTextView = new TextView(ctx);
        earningsTextView.setText("₹580");
        earningsTextView.setTextColor(Color.WHITE);
        earningsTextView.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14);
        earningsTextView.setTypeface(null, android.graphics.Typeface.BOLD);
        labels.addView(earningsTextView);

        root.addView(labels);

        return root;
    }

    private void setupTouchListener(View view) {
        view.setOnTouchListener(new View.OnTouchListener() {
            private int initialX;
            private int initialY;
            private float initialTouchX;
            private float initialTouchY;
            private long touchStartTime;

            @Override
            public boolean onTouch(View v, MotionEvent event) {
                switch (event.getAction()) {
                    case MotionEvent.ACTION_DOWN:
                        touchStartTime = System.currentTimeMillis();
                        initialX = params.x;
                        initialY = params.y;
                        initialTouchX = event.getRawX();
                        initialTouchY = event.getRawY();
                        return true;

                    case MotionEvent.ACTION_MOVE:
                        params.x = initialX + (int) (event.getRawX() - initialTouchX);
                        params.y = initialY + (int) (event.getRawY() - initialTouchY);
                        if (windowManager != null && overlayView != null) {
                            windowManager.updateViewLayout(overlayView, params);
                        }
                        return true;

                    case MotionEvent.ACTION_UP:
                        long duration = System.currentTimeMillis() - touchStartTime;
                        float diffX = Math.abs(event.getRawX() - initialTouchX);
                        float diffY = Math.abs(event.getRawY() - initialTouchY);

                        // If user tapped without dragging, bring Captain App to foreground!
                        if (duration < 300 && diffX < 20 && diffY < 20) {
                            openAppForeground();
                        }
                        return true;
                }
                return false;
            }
        });
    }

    private void openAppForeground() {
        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
        startActivity(intent);
    }

    public void updateOverlayContent(String earnings, String status) {
        if (earningsTextView != null && earnings != null && !earnings.isEmpty()) {
            earningsTextView.setText(earnings.startsWith("₹") ? earnings : "₹" + earnings);
        }
        if (statusTextView != null && status != null && !status.isEmpty()) {
            statusTextView.setText(status.toUpperCase());
            if ("ON_TRIP".equalsIgnoreCase(status) || "BUSY".equalsIgnoreCase(status)) {
                statusTextView.setTextColor(Color.parseColor("#FBBF24"));
            } else if ("ONLINE".equalsIgnoreCase(status)) {
                statusTextView.setTextColor(Color.parseColor("#34D399"));
            } else {
                statusTextView.setTextColor(Color.parseColor("#94A3B8"));
            }
        }
    }

    private void removeFloatingOverlay() {
        if (isOverlayAdded && windowManager != null && overlayView != null) {
            try {
                windowManager.removeView(overlayView);
            } catch (Exception e) {
                e.printStackTrace();
            }
            overlayView = null;
            isOverlayAdded = false;
        }
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        removeFloatingOverlay();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}


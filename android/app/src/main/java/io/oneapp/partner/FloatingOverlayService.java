package io.oneapp.partner;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Outline;
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
import android.view.ViewGroup;
import android.view.ViewOutlineProvider;
import android.view.WindowManager;
import android.widget.FrameLayout;
import android.widget.ImageView;
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

        DisplayMetrics dm = getResources().getDisplayMetrics();
        int bubbleSize = (int) TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, 64, dm);

        params = new WindowManager.LayoutParams(
            bubbleSize,
            bubbleSize,
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
        int size = (int) TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, 64, dm);

        // Circular FrameLayout container
        FrameLayout root = new FrameLayout(ctx);
        ViewGroup.LayoutParams rootLp = new ViewGroup.LayoutParams(size, size);
        root.setLayoutParams(rootLp);

        // Circular outline clipping
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            root.setOutlineProvider(new ViewOutlineProvider() {
                @Override
                public void getOutline(View view, Outline outline) {
                    outline.setOval(0, 0, view.getWidth(), view.getHeight());
                }
            });
            root.setClipToOutline(true);
            root.setElevation(TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, 8, dm));
        }

        // Circular background
        GradientDrawable rootBg = new GradientDrawable();
        rootBg.setShape(GradientDrawable.OVAL);
        rootBg.setColor(Color.WHITE);
        rootBg.setStroke((int) TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, 2.5f, dm), Color.parseColor("#a000e2"));
        root.setBackground(rootBg);

        // ImageView completely filled with our login logo
        ImageView logoView = new ImageView(ctx);
        logoView.setImageResource(R.drawable.bubble_logo);
        logoView.setScaleType(ImageView.ScaleType.CENTER_CROP);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            logoView.setOutlineProvider(new ViewOutlineProvider() {
                @Override
                public void getOutline(View view, Outline outline) {
                    outline.setOval(0, 0, view.getWidth(), view.getHeight());
                }
            });
            logoView.setClipToOutline(true);
        }

        FrameLayout.LayoutParams logoLp = new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        );
        root.addView(logoView, logoLp);

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
        // Floating bubble is a complete circular logo shortcut; no earnings or status text displayed
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


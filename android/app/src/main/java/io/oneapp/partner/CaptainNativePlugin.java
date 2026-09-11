package io.oneapp.partner;

import android.app.Activity;
import android.app.Dialog;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.graphics.Color;
import android.graphics.Typeface;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import android.util.Log;
import android.view.Gravity;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.LinearLayout;
import android.widget.TextView;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.List;

@CapacitorPlugin(name = "CaptainNative")
public class CaptainNativePlugin extends Plugin {

    private static final String TAG = "CaptainNative";

    /**
     * Intercepts deep-links and UPI payment URLs from WebViews (e.g. Razorpay Standard Checkout)
     * so that the Android OS can launch native UPI apps instead of failing in the WebView.
     */
    @Override
    public Boolean shouldOverrideLoad(Uri url) {
        if (url == null) return null;
        if (isPaymentCompleteUrl(url.toString())) {
            handlePaymentCompletedUrl(url);
            return true;
        }

        String scheme = url.getScheme();
        if (scheme == null) return null;
        scheme = scheme.toLowerCase();

        if (scheme.equals("upi") ||
            scheme.equals("tez") ||
            scheme.equals("phonepe") ||
            scheme.equals("paytmmp") ||
            (scheme.startsWith("intent") && url.toString().contains("scheme=upi"))) {
            try {
                Intent intent;
                if (scheme.startsWith("intent")) {
                    intent = Intent.parseUri(url.toString(), Intent.URI_INTENT_SCHEME);
                } else {
                    intent = new Intent(Intent.ACTION_VIEW, url);
                }
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);
                return true;
            } catch (Exception e) {
                try {
                    Intent fallback = new Intent(Intent.ACTION_VIEW, url);
                    fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    getContext().startActivity(fallback);
                    return true;
                } catch (Exception ex) {
                    Log.e(TAG, "Could not launch native UPI app for URL: " + url, ex);
                    return true;
                }
            }
        }
        return null;
    }

    private boolean isPaymentCompleteUrl(String url) {
        if (url == null) return false;
        String lower = url.toLowerCase();
        return lower.contains("/wallet/razorpay/callback") ||
               lower.contains("payment-completed") ||
               lower.contains("payment_success=true") ||
               lower.contains("razorpay_payment_id=") ||
               lower.contains("status=paid") ||
               lower.startsWith("pintu://") ||
               lower.startsWith("oneapp://");
    }

    private void handlePaymentCompletedUrl(Uri uri) {
        Activity activity = getActivity();
        if (activity != null) {
            activity.runOnUiThread(() -> {
                if (inAppBrowserDialog != null && inAppBrowserDialog.isShowing()) {
                    try {
                        inAppBrowserDialog.dismiss();
                    } catch (Exception ignored) {}
                    inAppBrowserDialog = null;
                }
            });
        }
        JSObject data = new JSObject();
        data.put("url", uri != null ? uri.toString() : "");
        if (uri != null) {
            try {
                String paymentId = uri.getQueryParameter("razorpay_payment_id");
                if (paymentId != null) data.put("razorpay_payment_id", paymentId);
                String orderId = uri.getQueryParameter("razorpay_order_id");
                if (orderId != null) data.put("razorpay_order_id", orderId);
                String signature = uri.getQueryParameter("razorpay_signature");
                if (signature != null) data.put("razorpay_signature", signature);
            } catch (Exception e) {
                Log.w(TAG, "Error parsing payment query params: " + e.getMessage());
            }
        }
        notifyListeners("inAppBrowserPaymentCompleted", data);
    }

    @PluginMethod
    public void canDrawOverlays(PluginCall call) {
        JSObject ret = new JSObject();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            ret.put("hasPermission", Settings.canDrawOverlays(getContext()));
        } else {
            ret.put("hasPermission", true);
        }
        call.resolve(ret);
    }

    @PluginMethod
    public void requestDrawOverlays(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (!Settings.canDrawOverlays(getContext())) {
                Intent intent = new Intent(
                    Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:" + getContext().getPackageName())
                );
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);
            }
        }
        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void isIgnoringBatteryOptimizations(PluginCall call) {
        JSObject ret = new JSObject();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PowerManager pm = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
            boolean isIgnoring = pm != null && pm.isIgnoringBatteryOptimizations(getContext().getPackageName());
            ret.put("isIgnoring", isIgnoring);
        } else {
            ret.put("isIgnoring", true);
        }
        call.resolve(ret);
    }

    @PluginMethod
    public void requestIgnoreBatteryOptimizations(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            try {
                Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                intent.setData(Uri.parse("package:" + getContext().getPackageName()));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);
            } catch (Exception e) {
                // Fallback to battery optimization settings list
                Intent intent = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);
            }
        }
        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void openAppSettings(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
        intent.setData(Uri.parse("package:" + getContext().getPackageName()));
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        
        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void openLocationSettings(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);

        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void launchNavigation(PluginCall call) {
        Double lat = call.getDouble("lat");
        Double lng = call.getDouble("lng");
        String label = call.getString("label", "Destination");

        if (lat == null || lng == null) {
            call.reject("Missing latitude or longitude");
            return;
        }

        try {
            // Try Google Navigation intent first for turn-by-turn navigation
            Uri navUri = Uri.parse("google.navigation:q=" + lat + "," + lng + "&mode=d");
            Intent mapIntent = new Intent(Intent.ACTION_VIEW, navUri);
            mapIntent.setPackage("com.google.android.apps.maps");
            mapIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(mapIntent);
        } catch (Exception e) {
            // Fallback to generic geo intent
            Uri geoUri = Uri.parse("geo:" + lat + "," + lng + "?q=" + lat + "," + lng + "(" + Uri.encode(label) + ")");
            Intent fallbackIntent = new Intent(Intent.ACTION_VIEW, geoUri);
            fallbackIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(fallbackIntent);
        }

        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void setKeepScreenOn(PluginCall call) {
        Boolean enable = call.getBoolean("enable", true);
        Activity activity = getActivity();
        if (activity != null) {
            activity.runOnUiThread(() -> {
                if (Boolean.TRUE.equals(enable)) {
                    activity.getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                } else {
                    activity.getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                }
            });
        }
        JSObject ret = new JSObject();
        ret.put("keepScreenOn", enable);
        call.resolve(ret);
    }

    @PluginMethod
    public void bringAppToForeground(PluginCall call) {
        Intent intent = new Intent(getContext(), MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
        getContext().startActivity(intent);

        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void showSystemOverlay(PluginCall call) {
        String earnings = call.getString("earnings", "₹580");
        String status = call.getString("status", "ONLINE");

        Intent intent = new Intent(getContext(), FloatingOverlayService.class);
        intent.setAction(FloatingOverlayService.ACTION_START_OVERLAY);
        intent.putExtra(FloatingOverlayService.EXTRA_EARNINGS, earnings);
        intent.putExtra(FloatingOverlayService.EXTRA_STATUS, status);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            getContext().startForegroundService(intent);
        } else {
            getContext().startService(intent);
        }

        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void hideSystemOverlay(PluginCall call) {
        Intent intent = new Intent(getContext(), FloatingOverlayService.class);
        intent.setAction(FloatingOverlayService.ACTION_STOP_OVERLAY);
        getContext().startService(intent);

        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void updateSystemOverlay(PluginCall call) {
        String earnings = call.getString("earnings", "₹580");
        String status = call.getString("status", "ONLINE");

        Intent intent = new Intent(getContext(), FloatingOverlayService.class);
        intent.setAction(FloatingOverlayService.ACTION_UPDATE_DATA);
        intent.putExtra(FloatingOverlayService.EXTRA_EARNINGS, earnings);
        intent.putExtra(FloatingOverlayService.EXTRA_STATUS, status);
        getContext().startService(intent);

        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void getInstalledUpiApps(PluginCall call) {
        JSObject response = new JSObject();
        JSArray appsArray = new JSArray();
        try {
            PackageManager pm = getContext().getPackageManager();
            Intent upiIntent = new Intent(Intent.ACTION_VIEW);
            upiIntent.setData(Uri.parse("upi://pay"));

            List<ResolveInfo> resolveInfoList = pm.queryIntentActivities(upiIntent, PackageManager.MATCH_DEFAULT_ONLY);

            for (ResolveInfo info : resolveInfoList) {
                JSObject app = new JSObject();
                String packageName = info.activityInfo.packageName;
                String appName = info.loadLabel(pm).toString();
                app.put("packageName", packageName);
                app.put("name", appName);

                // Identify standard popular apps for UI badge/icons
                String iconKey = "generic";
                if (packageName.contains("google.android.apps.nbu.paisa")) {
                    iconKey = "gpay";
                } else if (packageName.contains("phonepe")) {
                    iconKey = "phonepe";
                } else if (packageName.contains("paytm")) {
                    iconKey = "paytm";
                } else if (packageName.contains("npci.upiapp")) {
                    iconKey = "bhim";
                } else if (packageName.contains("dreamplug")) {
                    iconKey = "cred";
                } else if (packageName.contains("amazon")) {
                    iconKey = "amazonpay";
                } else if (packageName.contains("whatsapp")) {
                    iconKey = "whatsapp";
                }
                app.put("iconKey", iconKey);

                appsArray.put(app);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error querying installed UPI apps", e);
        }

        response.put("apps", appsArray);
        response.put("total", appsArray.length());
        call.resolve(response);
    }

    @PluginMethod
    public void launchUpiIntent(PluginCall call) {
        String upiUrl = call.getString("url");
        String packageName = call.getString("packageName");

        if (upiUrl == null || upiUrl.isEmpty()) {
            call.reject("Missing UPI URL");
            return;
        }

        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(upiUrl));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            if (packageName != null && !packageName.isEmpty()) {
                intent.setPackage(packageName);
            }
            getContext().startActivity(intent);
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Error launching UPI application", e);
            call.reject("Failed to launch UPI application: " + e.getMessage());
        }
    }

    @PluginMethod
    public void openInBrowser(PluginCall call) {
        String url = call.getString("url");
        if (url == null || url.isEmpty()) {
            call.reject("Missing URL parameter");
            return;
        }

        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            // Prefer Google Chrome if available so full UPI intent support is guaranteed
            intent.setPackage("com.android.chrome");
            getContext().startActivity(intent);
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            // Fallback to default browser
            try {
                Intent fallback = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(fallback);
                JSObject ret = new JSObject();
                ret.put("success", true);
                call.resolve(ret);
            } catch (Exception ex) {
                Log.e(TAG, "Error opening URL in browser: " + url, ex);
                call.reject("Failed to open browser: " + ex.getMessage());
            }
        }
    }

    private Dialog inAppBrowserDialog = null;

    private int dpToPx(Context context, int dp) {
        return (int) (dp * context.getResources().getDisplayMetrics().density + 0.5f);
    }

    @PluginMethod
    public void openInAppBrowser(PluginCall call) {
        String url = call.getString("url");
        if (url == null || url.isEmpty()) {
            call.reject("Missing URL parameter");
            return;
        }

        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activity is null");
            return;
        }

        activity.runOnUiThread(() -> {
            try {
                if (inAppBrowserDialog != null && inAppBrowserDialog.isShowing()) {
                    inAppBrowserDialog.dismiss();
                    inAppBrowserDialog = null;
                }

                inAppBrowserDialog = new Dialog(activity, android.R.style.Theme_DeviceDefault_Light_NoActionBar_Fullscreen);
                inAppBrowserDialog.requestWindowFeature(Window.FEATURE_NO_TITLE);

                // Root vertical layout
                LinearLayout root = new LinearLayout(activity);
                root.setOrientation(LinearLayout.VERTICAL);
                root.setLayoutParams(new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.MATCH_PARENT
                ));
                root.setBackgroundColor(Color.WHITE);

                // Header toolbar
                LinearLayout toolbar = new LinearLayout(activity);
                toolbar.setOrientation(LinearLayout.HORIZONTAL);
                toolbar.setLayoutParams(new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    dpToPx(activity, 56)
                ));
                toolbar.setBackgroundColor(Color.parseColor("#a000e2"));
                toolbar.setGravity(Gravity.CENTER_VERTICAL);
                toolbar.setPadding(dpToPx(activity, 16), 0, dpToPx(activity, 16), 0);

                // Title
                TextView title = new TextView(activity);
                title.setText("Platform Commission Payment");
                title.setTextColor(Color.WHITE);
                title.setTextSize(16);
                title.setTypeface(Typeface.DEFAULT_BOLD);
                LinearLayout.LayoutParams titleParams = new LinearLayout.LayoutParams(
                    0, LinearLayout.LayoutParams.WRAP_CONTENT, 1.0f
                );
                title.setLayoutParams(titleParams);
                toolbar.addView(title);

                // Close button (X)
                TextView closeBtn = new TextView(activity);
                closeBtn.setText("✕");
                closeBtn.setTextColor(Color.WHITE);
                closeBtn.setTextSize(22);
                closeBtn.setPadding(dpToPx(activity, 12), dpToPx(activity, 8), dpToPx(activity, 8), dpToPx(activity, 8));
                closeBtn.setOnClickListener(v -> {
                    if (inAppBrowserDialog != null && inAppBrowserDialog.isShowing()) {
                        inAppBrowserDialog.dismiss();
                    }
                    notifyListeners("inAppBrowserClosed", new JSObject());
                });
                toolbar.addView(closeBtn);

                root.addView(toolbar);

                // WebView
                WebView webView = new WebView(activity);
                webView.setLayoutParams(new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.MATCH_PARENT
                ));

                WebSettings settings = webView.getSettings();
                settings.setJavaScriptEnabled(true);
                settings.setDomStorageEnabled(true);
                settings.setDatabaseEnabled(true);
                settings.setSupportMultipleWindows(false);
                settings.setJavaScriptCanOpenWindowsAutomatically(true);

                // Sanitize User-Agent to standard Mobile Chrome
                String defaultUa = settings.getUserAgentString();
                if (defaultUa != null) {
                    String cleanUa = defaultUa.replace("; wv", "").replace("Version/4.0 ", "");
                    settings.setUserAgentString(cleanUa);
                }

                webView.setWebViewClient(new WebViewClient() {
                    @Override
                    public void onPageStarted(WebView view, String urlString, android.graphics.Bitmap favicon) {
                        super.onPageStarted(view, urlString, favicon);
                        if (urlString != null && isPaymentCompleteUrl(urlString)) {
                            Log.i(TAG, "Payment complete URL detected in onPageStarted: " + urlString);
                            try {
                                view.stopLoading();
                            } catch (Exception ignored) {}
                            handlePaymentCompletedUrl(Uri.parse(urlString));
                        }
                    }

                    @Override
                    public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                        return handlePaymentUri(request.getUrl(), view);
                    }

                    @Override
                    public boolean shouldOverrideUrlLoading(WebView view, String urlString) {
                        return handlePaymentUri(Uri.parse(urlString), view);
                    }

                    private boolean handlePaymentUri(Uri uri, WebView view) {
                        if (uri == null) return false;
                        String uriStr = uri.toString();

                        // 1. Payment callback completed
                        if (isPaymentCompleteUrl(uriStr)) {
                            Log.i(TAG, "Payment callback detected in in-app browser: " + uriStr);
                            if (view != null) {
                                try {
                                    view.stopLoading();
                                } catch (Exception ignored) {}
                            }
                            handlePaymentCompletedUrl(uri);
                            return true;
                        }

                        // 2. Intercept UPI Intents to launch GPay, PhonePe, Paytm, BHIM, etc.
                        String scheme = uri.getScheme();
                        if (scheme != null) {
                            scheme = scheme.toLowerCase();
                            if (scheme.equals("upi") ||
                                scheme.equals("tez") ||
                                scheme.equals("phonepe") ||
                                scheme.equals("paytmmp") ||
                                (scheme.startsWith("intent") && uriStr.contains("scheme=upi"))) {
                                try {
                                    Intent intent;
                                    if (scheme.startsWith("intent")) {
                                        intent = Intent.parseUri(uriStr, Intent.URI_INTENT_SCHEME);
                                    } else {
                                        intent = new Intent(Intent.ACTION_VIEW, uri);
                                    }
                                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                                    activity.startActivity(intent);
                                    return true;
                                } catch (Exception e) {
                                    Log.e(TAG, "Error launching UPI app from in-app browser: " + uriStr, e);
                                    return true;
                                }
                            }
                        }

                        return false;
                    }
                });

                webView.loadUrl(url);
                root.addView(webView);

                inAppBrowserDialog.setContentView(root);
                inAppBrowserDialog.setOnDismissListener(dialog -> {
                    notifyListeners("inAppBrowserClosed", new JSObject());
                });
                inAppBrowserDialog.show();

                JSObject ret = new JSObject();
                ret.put("success", true);
                call.resolve(ret);
            } catch (Exception e) {
                Log.e(TAG, "Failed to open in-app browser dialog", e);
                call.reject("Failed to open in-app browser: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void closeInAppBrowser(PluginCall call) {
        Activity activity = getActivity();
        if (activity != null) {
            activity.runOnUiThread(() -> {
                if (inAppBrowserDialog != null && inAppBrowserDialog.isShowing()) {
                    inAppBrowserDialog.dismiss();
                    inAppBrowserDialog = null;
                }
            });
        }
        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }
}


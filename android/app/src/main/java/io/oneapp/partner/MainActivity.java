package io.oneapp.partner;

import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import com.getcapacitor.BridgeActivity;
import java.io.File;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "MainActivity";
    private static final String APP_VERSION_PREFS = "pintu_partner_version_tracker";
    private static final String KEY_LAST_VERSION_CODE = "last_installed_version_code";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        checkAndPurgeStaleCachesOnUpdate();
        registerPlugin(CaptainNativePlugin.class);
        super.onCreate(savedInstanceState);
        configureWebViewForPayments();
    }

    private void configureWebViewForPayments() {
        try {
            if (this.bridge != null && this.bridge.getWebView() != null) {
                android.webkit.WebSettings settings = this.bridge.getWebView().getSettings();
                String defaultUa = settings.getUserAgentString();
                // Strip "Version/4.0 " and "; wv" from user agent so payment SDKs (like Razorpay)
                // recognize this as standard mobile Chrome and display UPI app options
                if (defaultUa != null) {
                    String cleanUa = defaultUa.replace("; wv", "").replace("Version/4.0 ", "");
                    settings.setUserAgentString(cleanUa);
                    Log.i(TAG, "Configured WebView User-Agent for payments: " + cleanUa);
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "Error configuring WebView User-Agent:", e);
        }
    }

    private void checkAndPurgeStaleCachesOnUpdate() {
        try {
            PackageInfo pInfo = getPackageManager().getPackageInfo(getPackageName(), 0);
            long currentVersionCode = Build.VERSION.SDK_INT >= Build.VERSION_CODES.P 
                ? pInfo.getLongVersionCode() 
                : pInfo.versionCode;

            SharedPreferences prefs = getSharedPreferences(APP_VERSION_PREFS, Context.MODE_PRIVATE);
            long lastVersionCode = prefs.getLong(KEY_LAST_VERSION_CODE, -1);

            if (lastVersionCode != currentVersionCode) {
                Log.i(TAG, "🚀 New APK version detected (" + lastVersionCode + " -> " + currentVersionCode + "). Purging stale OTA bundle caches to force fresh assets.");

                // 1. Clear OtaKit / Capacitor Updater state
                SharedPreferences otaPrefs = getSharedPreferences("otakit_updater_state", Context.MODE_PRIVATE);
                otaPrefs.edit().clear().apply();

                // 2. Clear Capgo updater state if any
                SharedPreferences capgoPrefs = getSharedPreferences("CapacitorUpdater", Context.MODE_PRIVATE);
                capgoPrefs.edit().clear().apply();

                // 3. Delete disk bundle directories and webview cache
                deleteDir(new File(getFilesDir(), "otakit_bundles"));
                deleteDir(new File(getFilesDir(), "otakit_files"));
                deleteDir(new File(getFilesDir(), "bundles"));
                deleteDir(new File(getFilesDir(), "ota"));
                deleteDir(getCacheDir());
                deleteDir(getCodeCacheDir());
                deleteDir(new File(getApplicationInfo().dataDir, "app_webview/Cache"));
                deleteDir(new File(getApplicationInfo().dataDir, "app_webview/Default/Cache"));
                deleteDir(new File(getApplicationInfo().dataDir, "app_webview/Default/Code Cache"));

                // 4. Save new version code
                prefs.edit().putLong(KEY_LAST_VERSION_CODE, currentVersionCode).apply();
                Log.i(TAG, "✅ Stale bundle & WebView cache purged successfully. Loading fresh APK assets.");
            }
        } catch (Exception e) {
            Log.w(TAG, "Error checking version update:", e);
        }
    }

    private boolean deleteDir(File dir) {
        if (dir != null && dir.isDirectory()) {
            String[] children = dir.list();
            if (children != null) {
                for (String child : children) {
                    boolean success = deleteDir(new File(dir, child));
                    if (!success) return false;
                }
            }
            return dir.delete();
        } else if (dir != null && dir.isFile()) {
            return dir.delete();
        }
        return false;
    }
}


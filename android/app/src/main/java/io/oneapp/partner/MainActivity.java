package io.oneapp.partner;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(CaptainNativePlugin.class);
        super.onCreate(savedInstanceState);
    }
}

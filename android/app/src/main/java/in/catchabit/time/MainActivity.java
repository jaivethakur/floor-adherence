package in.catchabit.time;

import android.content.Intent;
import com.getcapacitor.BridgeActivity;
import in.catchabit.time.widget.FloorAdherenceWidget;

public class MainActivity extends BridgeActivity {

    @Override
    public void onResume() {
        super.onResume();
        syncWidgets();
    }

    @Override
    public void onPause() {
        super.onPause();
        syncWidgets();
    }

    private void syncWidgets() {
        try {
            Intent intent = new Intent(this, FloorAdherenceWidget.class);
            intent.setAction(FloorAdherenceWidget.ACTION_REFRESH);
            sendBroadcast(intent);
        } catch (Exception ignored) {}
    }
}

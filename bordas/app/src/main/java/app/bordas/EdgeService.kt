package app.bordas

import android.accessibilityservice.AccessibilityService
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.content.res.Configuration
import android.graphics.PixelFormat
import android.hardware.display.DisplayManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.util.DisplayMetrics
import android.view.Display
import android.view.Gravity
import android.view.WindowManager
import android.view.accessibility.AccessibilityEvent
import android.widget.Toast

/**
 * Serviço de acessibilidade: desenha as alças nas bordas por cima de qualquer app
 * e executa as ações globais (voltar, início, recentes...).
 */
class EdgeService : AccessibilityService(), SharedPreferences.OnSharedPreferenceChangeListener {

    private lateinit var wm: WindowManager
    private lateinit var prefs: Prefs
    private lateinit var runner: ActionRunner
    private val handles = mutableMapOf<Side, EdgeHandleView>()
    private val main = Handler(Looper.getMainLooper())
    private val refreshTask = Runnable { refresh() }
    private var connected = false

    override fun onServiceConnected() {
        super.onServiceConnected()
        wm = getSystemService(WINDOW_SERVICE) as WindowManager
        prefs = Prefs(this)
        runner = ActionRunner(this)
        prefs.sp.registerOnSharedPreferenceChangeListener(this)
        connected = true
        refresh()
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) = Unit
    override fun onInterrupt() = Unit

    override fun onConfigurationChanged(newConfig: Configuration) {
        super.onConfigurationChanged(newConfig)
        scheduleRefresh()
    }

    override fun onSharedPreferenceChanged(sp: SharedPreferences?, key: String?) = scheduleRefresh()

    override fun onUnbind(intent: Intent?): Boolean {
        teardown()
        return super.onUnbind(intent)
    }

    override fun onDestroy() {
        teardown()
        super.onDestroy()
    }

    private fun teardown() {
        if (!connected) return
        connected = false
        main.removeCallbacks(refreshTask)
        prefs.sp.unregisterOnSharedPreferenceChangeListener(this)
        handles.values.forEach { runCatching { wm.removeView(it) } }
        handles.clear()
        runner.release()
    }

    private fun scheduleRefresh() {
        if (!connected) return
        main.removeCallbacks(refreshTask)
        main.post(refreshTask)
    }

    private fun refresh() {
        if (!connected) return
        val cfg = prefs.config()
        val (w, h) = screenSize()
        val landscape = w > h
        for (side in Side.entries) {
            val want = cfg.enabled && cfg.sideOn(side) && (!landscape || cfg.landscape)
            val view = handles[side]
            if (!want) {
                if (view != null) {
                    runCatching { wm.removeView(view) }
                    handles.remove(side)
                }
                continue
            }
            val lp = layoutParams(side, cfg, h)
            if (view == null) {
                val v = EdgeHandleView(this, side, ::onGesture)
                v.update(cfg, minOf(w, h))
                runCatching { wm.addView(v, lp) }.onSuccess { handles[side] = v }
            } else {
                view.update(cfg, minOf(w, h))
                runCatching { wm.updateViewLayout(view, lp) }
            }
        }
    }

    private fun layoutParams(side: Side, cfg: Config, screenH: Int): WindowManager.LayoutParams {
        val d = resources.displayMetrics.density
        val height = (cfg.heightDp * d).toInt().coerceAtMost(screenH)
        val width = (cfg.widthDp * d).toInt().coerceAtLeast(1)
        val y = (screenH * cfg.position / 100f - height / 2f).toInt().coerceIn(0, maxOf(0, screenH - height))
        return WindowManager.LayoutParams(
            width,
            height,
            WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT,
        ).apply {
            gravity = Gravity.TOP or (if (side == Side.LEFT) Gravity.LEFT else Gravity.RIGHT)
            x = 0
            this.y = y
            if (Build.VERSION.SDK_INT >= 30) {
                layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_ALWAYS
            } else if (Build.VERSION.SDK_INT >= 28) {
                layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
            }
            title = "Bordas ${side.name}"
        }
    }

    private fun screenSize(): Pair<Int, Int> {
        if (Build.VERSION.SDK_INT >= 30) {
            runCatching { wm.currentWindowMetrics.bounds }.getOrNull()?.let {
                if (it.width() > 0 && it.height() > 0) return it.width() to it.height()
            }
        }
        val m = DisplayMetrics()
        val display = getSystemService(DisplayManager::class.java)?.getDisplay(Display.DEFAULT_DISPLAY)
        @Suppress("DEPRECATION")
        display?.getRealMetrics(m)
        if (m.widthPixels > 0) return m.widthPixels to m.heightPixels
        val r = resources.displayMetrics
        return r.widthPixels to r.heightPixels
    }

    private fun onGesture(side: Side, gesture: Gesture) {
        val action = prefs.action(side, gesture)
        if (prefs.config().showToast) {
            Toast.makeText(this, "${gesture.arrow(side)} ${gesture.label}: ${action.label}", Toast.LENGTH_SHORT).show()
        }
        val ok = runner.run(action)
        if (!ok) Toast.makeText(this, "Não deu para executar: ${action.label}", Toast.LENGTH_SHORT).show()
    }

    companion object {
        fun isEnabled(context: Context): Boolean {
            val list = Settings.Secure.getString(
                context.contentResolver,
                Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES,
            ) ?: return false
            val me = ComponentName(context, EdgeService::class.java)
            return list.split(':').any { ComponentName.unflattenFromString(it) == me }
        }
    }
}

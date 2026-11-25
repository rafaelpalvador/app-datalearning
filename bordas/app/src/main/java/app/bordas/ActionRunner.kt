package app.bordas

import android.accessibilityservice.AccessibilityService
import android.content.ComponentName
import android.content.Intent
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CameraManager
import android.media.AudioManager
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.provider.MediaStore
import android.view.KeyEvent

/** Executa as ações. Devolve false quando a ação não pôde ser feita. */
class ActionRunner(private val svc: AccessibilityService) {

    private val main = Handler(Looper.getMainLooper())
    private val audio = svc.getSystemService(AudioManager::class.java)
    private val cameras = svc.getSystemService(CameraManager::class.java)

    private var torchId: String? = null
    private var torchOn = false
    private val torchCallback = object : CameraManager.TorchCallback() {
        override fun onTorchModeChanged(cameraId: String, enabled: Boolean) {
            if (cameraId == torchId) torchOn = enabled
        }
    }

    init {
        torchId = runCatching {
            val cm = cameras ?: return@runCatching null
            cm.cameraIdList.firstOrNull { id ->
                cm.getCameraCharacteristics(id).get(CameraCharacteristics.FLASH_INFO_AVAILABLE) == true
            }
        }.getOrNull()
        if (torchId != null) runCatching { cameras?.registerTorchCallback(torchCallback, main) }
    }

    fun release() {
        runCatching { cameras?.unregisterTorchCallback(torchCallback) }
        main.removeCallbacksAndMessages(null)
    }

    fun run(a: Action): Boolean = runCatching { exec(a) }.getOrDefault(false)

    private fun exec(a: Action): Boolean = if (Build.VERSION.SDK_INT < a.type.minSdk) false else when (a.type) {
        ActionType.NONE -> true
        ActionType.BACK -> global(AccessibilityService.GLOBAL_ACTION_BACK)
        ActionType.HOME -> global(AccessibilityService.GLOBAL_ACTION_HOME)
        ActionType.RECENTS -> global(AccessibilityService.GLOBAL_ACTION_RECENTS)
        ActionType.LAST_APP -> {
            // Tocar "recentes" duas vezes alterna para o app anterior
            val ok = global(AccessibilityService.GLOBAL_ACTION_RECENTS)
            main.postDelayed({ global(AccessibilityService.GLOBAL_ACTION_RECENTS) }, 350)
            ok
        }
        ActionType.NOTIFICATIONS -> global(AccessibilityService.GLOBAL_ACTION_NOTIFICATIONS)
        ActionType.QUICK_SETTINGS -> global(AccessibilityService.GLOBAL_ACTION_QUICK_SETTINGS)
        ActionType.SCREENSHOT -> global(AccessibilityService.GLOBAL_ACTION_TAKE_SCREENSHOT)
        ActionType.LOCK -> global(AccessibilityService.GLOBAL_ACTION_LOCK_SCREEN)
        ActionType.POWER -> global(AccessibilityService.GLOBAL_ACTION_POWER_DIALOG)
        ActionType.SPLIT_SCREEN -> global(AccessibilityService.GLOBAL_ACTION_TOGGLE_SPLIT_SCREEN)
        ActionType.FLASHLIGHT -> toggleTorch()
        ActionType.PLAY_PAUSE -> mediaKey(KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE)
        ActionType.NEXT_TRACK -> mediaKey(KeyEvent.KEYCODE_MEDIA_NEXT)
        ActionType.PREV_TRACK -> mediaKey(KeyEvent.KEYCODE_MEDIA_PREVIOUS)
        ActionType.VOLUME_UP -> volume(AudioManager.ADJUST_RAISE)
        ActionType.VOLUME_DOWN -> volume(AudioManager.ADJUST_LOWER)
        ActionType.VOLUME_PANEL -> volume(AudioManager.ADJUST_SAME)
        ActionType.CAMERA -> start(Intent(MediaStore.INTENT_ACTION_STILL_IMAGE_CAMERA))
        ActionType.QR_SCANNER -> scanQr()
        ActionType.ASSISTANT -> start(Intent(Intent.ACTION_VOICE_COMMAND))
        ActionType.OPEN_APP -> svc.packageManager.getLaunchIntentForPackage(a.param)?.let { start(it) } ?: false
        ActionType.OPEN_ACTIVITY ->
            ComponentName.unflattenFromString(a.param)?.let { start(Intent(Intent.ACTION_MAIN).setComponent(it)) } ?: false
        ActionType.OPEN_URL -> a.param.isNotBlank() && start(Intent(Intent.ACTION_VIEW, Uri.parse(a.param.trim())))
    }

    private fun global(action: Int) = svc.performGlobalAction(action)

    private fun start(intent: Intent): Boolean {
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED)
        svc.startActivity(intent)
        return true
    }

    /**
     * Leitor de QR: o do Google Play Services (o mesmo do atalho do Android 13+),
     * depois Google Lens e, por fim, a câmera (a câmera do Honor lê QR no modo foto).
     */
    private fun scanQr(): Boolean {
        val candidates = listOf(
            Intent().setComponent(
                ComponentName("com.google.android.gms", "com.google.android.gms.mlkit.barcode.ui.PlatformBarcodeScanningActivityProxy"),
            ),
            svc.packageManager.getLaunchIntentForPackage("com.google.ar.lens"),
            Intent(MediaStore.INTENT_ACTION_STILL_IMAGE_CAMERA),
        )
        return candidates.filterNotNull().any { runCatching { start(it) }.isSuccess }
    }

    private fun toggleTorch(): Boolean {
        val id = torchId ?: return false
        cameras?.setTorchMode(id, !torchOn) ?: return false
        return true
    }

    private fun mediaKey(code: Int): Boolean {
        val am = audio ?: return false
        val now = SystemClock.uptimeMillis()
        am.dispatchMediaKeyEvent(KeyEvent(now, now, KeyEvent.ACTION_DOWN, code, 0))
        am.dispatchMediaKeyEvent(KeyEvent(now, now, KeyEvent.ACTION_UP, code, 0))
        return true
    }

    private fun volume(direction: Int): Boolean {
        val am = audio ?: return false
        am.adjustSuggestedStreamVolume(direction, AudioManager.USE_DEFAULT_STREAM_TYPE, AudioManager.FLAG_SHOW_UI)
        return true
    }
}

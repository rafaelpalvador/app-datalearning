package app.bordas

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Rect
import android.graphics.RectF
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.view.MotionEvent
import android.view.View

/**
 * Faixa fina e (quase) invisível colada na borda da tela. Recebe o toque inteiro
 * (mesmo depois que o dedo sai da faixa) e devolve o gesto reconhecido.
 */
@SuppressLint("ViewConstructor")
class EdgeHandleView(
    context: Context,
    private val side: Side,
    private val listener: Listener,
) : View(context) {

    interface Listener {
        fun onGestureStart(side: Side, rawY: Float, shortPx: Float)
        fun onGestureMove(side: Side, inward: Float, dy: Float, gesture: Gesture?)
        fun onGestureEnd(side: Side, gesture: Gesture?)
    }

    private val density = resources.displayMetrics.density
    private val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.rgb(150, 150, 150) }
    private val pill = RectF()

    private var handleAlpha = 0
    private var haptic = true
    private var shortPx = 40f * density
    private var longPx = 300f * density

    private var x0 = 0f
    private var y0 = 0f
    private var tracking = false
    private var shortHit = false
    private var longHit = false

    private val vibrator: Vibrator? =
        if (Build.VERSION.SDK_INT >= 31) {
            context.getSystemService(VibratorManager::class.java)?.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            context.getSystemService(Vibrator::class.java)
        }

    fun update(cfg: Config, screenShortSide: Int) {
        handleAlpha = (cfg.handleAlpha.coerceIn(0, 100) * 255 / 100)
        paint.alpha = handleAlpha
        haptic = cfg.haptic
        shortPx = cfg.shortDp * density
        longPx = maxOf(shortPx * 1.5f, screenShortSide * cfg.longPct / 100f)
        invalidate()
    }

    override fun onLayout(changed: Boolean, left: Int, top: Int, right: Int, bottom: Int) {
        super.onLayout(changed, left, top, right, bottom)
        // Pede ao Android para não usar esta área para o "voltar" da navegação por gestos.
        // O sistema aceita no máximo ~200 dp de altura por borda.
        if (Build.VERSION.SDK_INT >= 29) {
            systemGestureExclusionRects = listOf(Rect(0, 0, width, height))
        }
    }

    override fun onDraw(canvas: Canvas) {
        if (handleAlpha == 0) return
        val w = 4f * density
        val inset = 2f * density
        val left = if (side == Side.LEFT) inset else width - inset - w
        pill.set(left, 0f, left + w, height.toFloat())
        canvas.drawRoundRect(pill, w / 2, w / 2, paint)
    }

    @SuppressLint("ClickableViewAccessibility")
    override fun onTouchEvent(e: MotionEvent): Boolean {
        when (e.actionMasked) {
            MotionEvent.ACTION_DOWN -> {
                x0 = e.rawX
                y0 = e.rawY
                tracking = true
                shortHit = false
                longHit = false
                listener.onGestureStart(side, y0, shortPx)
            }
            MotionEvent.ACTION_MOVE -> if (tracking) {
                val g = current(e)
                listener.onGestureMove(side, inward(e), e.rawY - y0, g)
                if (g != null && !shortHit) {
                    shortHit = true
                    tick(false)
                }
                if (g != null && g.isLong && !longHit) {
                    longHit = true
                    tick(true)
                }
            }
            MotionEvent.ACTION_UP -> if (tracking) {
                tracking = false
                listener.onGestureEnd(side, current(e))
            }
            MotionEvent.ACTION_CANCEL -> if (tracking) {
                tracking = false
                listener.onGestureEnd(side, null)
            }
        }
        return true
    }

    private fun inward(e: MotionEvent): Float {
        val dx = e.rawX - x0
        return if (side == Side.LEFT) dx else -dx
    }

    private fun current(e: MotionEvent): Gesture? =
        GestureClassifier.classify(inward(e), e.rawY - y0, shortPx, longPx)

    private fun tick(strong: Boolean) {
        if (!haptic) return
        val v = vibrator ?: return
        if (!v.hasVibrator()) return
        val effect = if (Build.VERSION.SDK_INT >= 29) {
            VibrationEffect.createPredefined(
                if (strong) VibrationEffect.EFFECT_HEAVY_CLICK else VibrationEffect.EFFECT_TICK
            )
        } else {
            VibrationEffect.createOneShot(if (strong) 30L else 12L, VibrationEffect.DEFAULT_AMPLITUDE)
        }
        v.vibrate(effect)
    }
}

package app.bordas

import android.content.Context
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.util.TypedValue
import android.view.View
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.hypot
import kotlin.math.min
import kotlin.math.sin

/**
 * Camada de tela cheia que não recebe toques: desenha a bolha na borda e a seta
 * que cresce na direção do gesto, com o nome da ação que vai ser executada.
 */
class GestureFeedbackView(context: Context) : View(context) {

    private val d = resources.displayMetrics.density

    private val idleColor = 0xB3505860.toInt()
    private val shortColor = 0xF02F80ED.toInt()
    private val longColor = 0xF0F59E0B.toInt()

    private val bubble = Paint(Paint.ANTI_ALIAS_FLAG)
    private val arrow = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = 0xFFFFFFFF.toInt()
        style = Paint.Style.STROKE
        strokeCap = Paint.Cap.ROUND
        strokeJoin = Paint.Join.ROUND
    }
    private val pillBg = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = 0xE6202124.toInt() }
    private val text = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = 0xFFFFFFFF.toInt()
        textSize = TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_SP, 15f, resources.displayMetrics)
        textAlign = Paint.Align.CENTER
        isFakeBoldText = true
    }
    private val path = Path()
    private val pill = RectF()
    private val loc = IntArray(2)

    private var side = Side.LEFT
    private var startY = 0f
    private var shortPx = 40f
    private var inward = 0f
    private var dy = 0f
    private var gesture: Gesture? = null
    private var label: String? = null

    init {
        visibility = GONE
    }

    fun start(side: Side, rawY: Float, shortPx: Float) {
        animate().cancel()
        this.side = side
        startY = rawY
        this.shortPx = shortPx
        inward = 0f
        dy = 0f
        gesture = null
        label = null
        alpha = 1f
        visibility = VISIBLE
        invalidate()
    }

    fun move(inward: Float, dy: Float, gesture: Gesture?, label: String?) {
        this.inward = inward
        this.dy = dy
        this.gesture = gesture
        this.label = label
        invalidate()
    }

    fun end() {
        animate().alpha(0f).setDuration(180).withEndAction { visibility = GONE }.start()
    }

    override fun onDraw(canvas: Canvas) {
        val dist = hypot(inward, dy)
        if (dist < 4 * d) return
        getLocationOnScreen(loc)
        val dir = if (side == Side.LEFT) 1f else -1f
        val ox = if (side == Side.LEFT) 0f else width.toFloat()
        val oy = startY - loc[1]

        val g = gesture
        val progress = min(1f, dist / shortPx)
        val recognized = g != null && label != null
        bubble.color = when {
            !recognized -> idleColor
            g!!.isLong -> longColor
            else -> shortColor
        }

        // bolha (meio círculo) colada na borda
        val r = (20 + 16 * progress) * d
        canvas.drawCircle(ox, oy, r, bubble)

        // ângulo: encaixa no gesto reconhecido, senão segue o dedo
        val deg = when (g) {
            Gesture.STRAIGHT_SHORT, Gesture.STRAIGHT_LONG -> 0.0
            Gesture.DIAG_UP_SHORT, Gesture.DIAG_UP_LONG -> 40.0
            Gesture.DIAG_DOWN_SHORT, Gesture.DIAG_DOWN_LONG -> -40.0
            Gesture.ALONG_UP -> 90.0
            Gesture.ALONG_DOWN -> -90.0
            null -> Math.toDegrees(atan2(-dy.toDouble(), inward.toDouble()))
        }
        val a = Math.toRadians(deg)
        val ux = (cos(a) * dir).toFloat()
        val uy = (-sin(a)).toFloat()

        // a seta nasce um pouco para dentro da borda (nos gestos verticais fica ao lado da bolha)
        val bx = ox + dir * (if (g == Gesture.ALONG_UP || g == Gesture.ALONG_DOWN) r + 8 * d else 10 * d)
        val by = oy
        val len = (18 * d + min(dist * 0.55f, 110 * d)) * (0.5f + 0.5f * progress)
        val tx = bx + ux * len
        val ty = by + uy * len

        val long = g?.isLong == true
        arrow.strokeWidth = (if (long) 6f else 4.5f) * d
        arrow.alpha = if (recognized || g == null) 255 else 140
        canvas.drawLine(bx, by, tx, ty, arrow)
        drawHead(canvas, tx, ty, ux, uy)
        if (long) drawHead(canvas, tx - ux * 11 * d, ty - uy * 11 * d, ux, uy)

        // nome da ação
        val name = label ?: return
        if (g == null) return
        val tw = text.measureText(name)
        val padH = 12 * d
        val h = 32 * d
        var cx = tx + ux * (tw / 2 + 28 * d)
        var cy = ty + uy * (h + 8 * d)
        cx = cx.coerceIn(tw / 2 + padH + 8 * d, width - tw / 2 - padH - 8 * d)
        cy = cy.coerceIn(h, height - h)
        pill.set(cx - tw / 2 - padH, cy - h / 2, cx + tw / 2 + padH, cy + h / 2)
        canvas.drawRoundRect(pill, h / 2, h / 2, pillBg)
        canvas.drawText(name, cx, cy - (text.descent() + text.ascent()) / 2, text)
    }

    private fun drawHead(canvas: Canvas, x: Float, y: Float, ux: Float, uy: Float) {
        val s = 12 * d
        // duas "asas" a ±35° da direção, para trás
        val c = 0.819f
        val sn = 0.574f
        val bx = -ux
        val by = -uy
        val l1x = x + s * (bx * c - by * sn)
        val l1y = y + s * (bx * sn + by * c)
        val l2x = x + s * (bx * c + by * sn)
        val l2y = y + s * (-bx * sn + by * c)
        path.reset()
        path.moveTo(l1x, l1y)
        path.lineTo(x, y)
        path.lineTo(l2x, l2y)
        canvas.drawPath(path, arrow)
    }
}

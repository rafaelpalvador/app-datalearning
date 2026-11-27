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
 * Camada de tela cheia que não recebe toques. Desenha, no estilo do "voltar" do Android,
 * uma ondulação translúcida saindo da borda com uma setinha dentro apontando para a
 * direção do gesto, e o nome da ação ao lado.
 */
class GestureFeedbackView(context: Context) : View(context) {

    private val d = resources.displayMetrics.density

    private val fill = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.FILL
        color = 0xB3202124.toInt()
    }
    private val outline = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = 1.2f * d
    }
    private val arrow = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = 0xFFFFFFFF.toInt()
        style = Paint.Style.STROKE
        strokeWidth = 2.6f * d
        strokeCap = Paint.Cap.ROUND
        strokeJoin = Paint.Join.ROUND
    }
    private val pillBg = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = 0xCC202124.toInt() }
    private val text = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = 0xFFFFFFFF.toInt()
        textSize = TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_SP, 14f, resources.displayMetrics)
        textAlign = Paint.Align.CENTER
    }
    private val bump = Path()
    private val head = Path()
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
        animate().alpha(0f).setDuration(160).withEndAction { visibility = GONE }.start()
    }

    override fun onDraw(canvas: Canvas) {
        val dist = hypot(inward, dy)
        if (dist < 4 * d) return
        getLocationOnScreen(loc)
        val dir = if (side == Side.LEFT) 1f else -1f
        val ox = if (side == Side.LEFT) 0f else width.toFloat()

        val g = gesture
        val recognized = g != null && label != null
        val progress = min(1f, dist / shortPx)

        // a ondulação acompanha um pouco o dedo na vertical
        val cy = (startY - loc[1] + dy * 0.35f).coerceIn(0f, height.toFloat())
        val half = 100 * d // meia altura da ondulação
        val bulge = (14 * d + min(dist, 160 * d) * 0.3f).coerceAtMost(62 * d) // quanto ela sai da borda
        val px = ox + dir * bulge

        bump.reset()
        bump.moveTo(ox, cy - half)
        bump.cubicTo(ox, cy - half * 0.45f, px, cy - half * 0.42f, px, cy)
        bump.cubicTo(px, cy + half * 0.42f, ox, cy + half * 0.45f, ox, cy + half)
        bump.close()
        canvas.drawPath(bump, fill)
        outline.color = if (g?.isLong == true && recognized) 0xCCF59E0B.toInt() else 0x59FFFFFF
        canvas.drawPath(bump, outline)

        // setinha dentro da ondulação, na direção do gesto
        val deg = when (g) {
            Gesture.STRAIGHT_SHORT, Gesture.STRAIGHT_LONG -> 0.0
            Gesture.DIAG_UP_SHORT, Gesture.DIAG_UP_LONG -> 45.0
            Gesture.DIAG_DOWN_SHORT, Gesture.DIAG_DOWN_LONG -> -45.0
            Gesture.ALONG_UP -> 90.0
            Gesture.ALONG_DOWN -> -90.0
            null -> Math.toDegrees(atan2(-dy.toDouble(), inward.toDouble()))
        }
        val a = Math.toRadians(deg)
        val ux = (cos(a) * dir).toFloat()
        val uy = (-sin(a)).toFloat()
        val ax = ox + dir * bulge * 0.55f
        val len = 9 * d * (0.6f + 0.4f * progress) // meio comprimento
        val tx = ax + ux * len
        val ty = cy + uy * len
        arrow.alpha = if (recognized) 255 else 130
        canvas.drawLine(ax - ux * len, cy - uy * len, tx, ty, arrow)
        drawHead(canvas, tx, ty, ux, uy)

        // nome da ação, discreto, ao lado da ondulação
        val name = label ?: return
        if (g == null) return
        val tw = text.measureText(name)
        val padH = 10 * d
        val h = 28 * d
        var cx = ox + dir * (bulge + 14 * d + tw / 2 + padH)
        cx = cx.coerceIn(tw / 2 + padH + 4 * d, width - tw / 2 - padH - 4 * d)
        val py = cy.coerceIn(h, height - h)
        pill.set(cx - tw / 2 - padH, py - h / 2, cx + tw / 2 + padH, py + h / 2)
        canvas.drawRoundRect(pill, h / 2, h / 2, pillBg)
        canvas.drawText(name, cx, py - (text.descent() + text.ascent()) / 2, text)
    }

    private fun drawHead(canvas: Canvas, x: Float, y: Float, ux: Float, uy: Float) {
        val s = 7.5f * d
        // duas "asas" a ±45° da direção, para trás
        val c = 0.7071f
        val bx = -ux
        val by = -uy
        head.reset()
        head.moveTo(x + s * (bx * c - by * c), y + s * (bx * c + by * c))
        head.lineTo(x, y)
        head.lineTo(x + s * (bx * c + by * c), y + s * (-bx * c + by * c))
        canvas.drawPath(head, arrow)
    }
}

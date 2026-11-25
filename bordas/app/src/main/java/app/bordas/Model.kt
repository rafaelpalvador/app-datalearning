package app.bordas

import kotlin.math.abs
import kotlin.math.atan2
import kotlin.math.hypot

enum class Side(val label: String) {
    LEFT("Esquerda"),
    RIGHT("Direita"),
}

enum class Gesture(val label: String, val isLong: Boolean) {
    STRAIGHT_SHORT("Reto", false),
    STRAIGHT_LONG("Reto, longo", true),
    DIAG_UP_SHORT("Diagonal para cima", false),
    DIAG_UP_LONG("Diagonal para cima, longo", true),
    DIAG_DOWN_SHORT("Diagonal para baixo", false),
    DIAG_DOWN_LONG("Diagonal para baixo, longo", true),
    ALONG_UP("Para cima", false),
    ALONG_DOWN("Para baixo", false);

    fun arrow(side: Side): String {
        val left = side == Side.LEFT
        return when (this) {
            STRAIGHT_SHORT -> if (left) "→" else "←"
            STRAIGHT_LONG -> if (left) "⇒" else "⇐"
            DIAG_UP_SHORT, DIAG_UP_LONG -> if (left) "↗" else "↖"
            DIAG_DOWN_SHORT, DIAG_DOWN_LONG -> if (left) "↘" else "↙"
            ALONG_UP -> "↑"
            ALONG_DOWN -> "↓"
        }
    }
}

/**
 * Transforma o deslocamento do dedo em um gesto.
 *
 * @param inward quanto o dedo andou para dentro da tela (px, positivo = para dentro)
 * @param dy deslocamento vertical (px, positivo = para baixo)
 * @param shortPx distância mínima para contar como gesto
 * @param longPx distância a partir da qual o gesto é "longo"
 */
object GestureClassifier {
    /** Acima deste ângulo (em relação à horizontal) o gesto vira diagonal. */
    const val DIAGONAL_DEG = 22.5
    /** Acima deste ângulo o gesto é "pela borda" (vertical). */
    const val ALONG_DEG = 62.0
    /** Acima deste ângulo o dedo voltou para fora da tela: cancela. */
    const val OUTWARD_DEG = 150.0

    fun classify(inward: Float, dy: Float, shortPx: Float, longPx: Float): Gesture? {
        val dist = hypot(inward, dy)
        if (dist < shortPx) return null
        // 0° = reto para dentro, +90° = para cima, -90° = para baixo
        val angle = Math.toDegrees(atan2(-dy.toDouble(), inward.toDouble()))
        val long = dist >= longPx
        return when {
            abs(angle) > OUTWARD_DEG -> null
            angle > ALONG_DEG -> Gesture.ALONG_UP
            angle < -ALONG_DEG -> Gesture.ALONG_DOWN
            angle > DIAGONAL_DEG -> if (long) Gesture.DIAG_UP_LONG else Gesture.DIAG_UP_SHORT
            angle < -DIAGONAL_DEG -> if (long) Gesture.DIAG_DOWN_LONG else Gesture.DIAG_DOWN_SHORT
            else -> if (long) Gesture.STRAIGHT_LONG else Gesture.STRAIGHT_SHORT
        }
    }
}

enum class ActionType(val label: String, val minSdk: Int = 0) {
    NONE("Nada"),
    BACK("Voltar"),
    HOME("Tela inicial"),
    RECENTS("Apps recentes"),
    LAST_APP("Voltar ao último app"),
    NOTIFICATIONS("Abrir notificações"),
    QUICK_SETTINGS("Configurações rápidas"),
    SCREENSHOT("Captura de tela", 28),
    LOCK("Bloquear a tela", 28),
    POWER("Menu de energia"),
    SPLIT_SCREEN("Tela dividida"),
    FLASHLIGHT("Lanterna (liga/desliga)"),
    PLAY_PAUSE("Tocar/pausar música"),
    NEXT_TRACK("Próxima faixa"),
    PREV_TRACK("Faixa anterior"),
    VOLUME_UP("Aumentar volume"),
    VOLUME_DOWN("Diminuir volume"),
    VOLUME_PANEL("Mostrar volume"),
    CAMERA("Abrir câmera"),
    QR_SCANNER("Escanear QR code"),
    ASSISTANT("Assistente de voz"),
    OPEN_APP("Abrir um app…"),
    OPEN_ACTIVITY("Abrir uma tela de um app…"),
    OPEN_URL("Abrir link ou atalho…"),
}

data class Action(val type: ActionType, val param: String = "", val name: String = "") {
    val label: String
        get() = when (type) {
            ActionType.OPEN_APP -> "Abrir ${name.ifBlank { param }}"
            ActionType.OPEN_URL, ActionType.OPEN_ACTIVITY -> "Abrir ${name.ifBlank { param }}"
            else -> type.label
        }

    fun encode(): String = listOf(type.name, param, name).joinToString(SEP)

    companion object {
        private const val SEP = "\u001F"
        val NONE = Action(ActionType.NONE)

        fun decode(s: String?): Action? {
            if (s.isNullOrEmpty()) return null
            val p = s.split(SEP)
            val type = ActionType.entries.firstOrNull { it.name == p[0] } ?: return null
            return Action(type, p.getOrElse(1) { "" }, p.getOrElse(2) { "" })
        }
    }
}

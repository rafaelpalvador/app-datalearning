package app.bordas

import android.content.Context
import android.content.SharedPreferences

data class Config(
    val enabled: Boolean = true,
    val leftOn: Boolean = true,
    val rightOn: Boolean = true,
    /** centro da alça, em % da altura da tela */
    val position: Int = 55,
    val heightDp: Int = 200,
    /** largura da área de toque */
    val widthDp: Int = 14,
    /** distância mínima para o gesto contar */
    val shortDp: Int = 40,
    /** gesto longo: % da largura da tela */
    val longPct: Int = 35,
    val showHandle: Boolean = true,
    val haptic: Boolean = true,
    val showToast: Boolean = false,
    val landscape: Boolean = false,
) {
    fun sideOn(side: Side) = if (side == Side.LEFT) leftOn else rightOn
}

class Prefs(context: Context) {
    val sp: SharedPreferences =
        context.applicationContext.getSharedPreferences("bordas", Context.MODE_PRIVATE)

    fun config(): Config {
        val d = Config()
        return Config(
            enabled = sp.getBoolean("enabled", d.enabled),
            leftOn = sp.getBoolean("left_on", d.leftOn),
            rightOn = sp.getBoolean("right_on", d.rightOn),
            position = sp.getInt("position", d.position),
            heightDp = sp.getInt("height_dp", d.heightDp),
            widthDp = sp.getInt("width_dp", d.widthDp),
            shortDp = sp.getInt("short_dp", d.shortDp),
            longPct = sp.getInt("long_pct", d.longPct),
            showHandle = sp.getBoolean("show_handle", d.showHandle),
            haptic = sp.getBoolean("haptic", d.haptic),
            showToast = sp.getBoolean("show_toast", d.showToast),
            landscape = sp.getBoolean("landscape", d.landscape),
        )
    }

    fun save(c: Config) {
        sp.edit()
            .putBoolean("enabled", c.enabled)
            .putBoolean("left_on", c.leftOn)
            .putBoolean("right_on", c.rightOn)
            .putInt("position", c.position)
            .putInt("height_dp", c.heightDp)
            .putInt("width_dp", c.widthDp)
            .putInt("short_dp", c.shortDp)
            .putInt("long_pct", c.longPct)
            .putBoolean("show_handle", c.showHandle)
            .putBoolean("haptic", c.haptic)
            .putBoolean("show_toast", c.showToast)
            .putBoolean("landscape", c.landscape)
            .apply()
    }

    fun action(side: Side, g: Gesture): Action =
        Action.decode(sp.getString(key(side, g), null)) ?: defaultAction(side, g)

    fun setAction(side: Side, g: Gesture, a: Action) {
        sp.edit().putString(key(side, g), a.encode()).apply()
    }

    fun allActions(): Map<Pair<Side, Gesture>, Action> =
        Side.entries.flatMap { s -> Gesture.entries.map { g -> (s to g) to action(s, g) } }.toMap()

    companion object {
        fun key(side: Side, g: Gesture) = "act_${side.name}_${g.name}"

        fun defaultAction(side: Side, g: Gesture): Action = Action(
            when (g) {
                Gesture.STRAIGHT_SHORT -> ActionType.BACK
                Gesture.STRAIGHT_LONG -> ActionType.LAST_APP
                Gesture.DIAG_UP_SHORT -> ActionType.HOME
                Gesture.DIAG_UP_LONG -> ActionType.RECENTS
                Gesture.DIAG_DOWN_SHORT -> ActionType.NOTIFICATIONS
                Gesture.DIAG_DOWN_LONG ->
                    if (side == Side.LEFT) ActionType.QUICK_SETTINGS else ActionType.FLASHLIGHT
                Gesture.ALONG_UP, Gesture.ALONG_DOWN -> ActionType.NONE
            }
        )
    }
}

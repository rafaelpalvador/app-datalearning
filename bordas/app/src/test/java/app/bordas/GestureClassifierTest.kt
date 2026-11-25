package app.bordas

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class GestureClassifierTest {
    private val short = 40f
    private val long = 300f
    private fun c(inward: Float, dy: Float) = GestureClassifier.classify(inward, dy, short, long)

    @Test fun pequenoDemaisNaoConta() = assertNull(c(20f, 10f))
    @Test fun retoCurto() = assertEquals(Gesture.STRAIGHT_SHORT, c(100f, 10f))
    @Test fun retoLongo() = assertEquals(Gesture.STRAIGHT_LONG, c(400f, -30f))
    @Test fun diagonalCimaCurto() = assertEquals(Gesture.DIAG_UP_SHORT, c(100f, -100f))
    @Test fun diagonalCimaLongo() = assertEquals(Gesture.DIAG_UP_LONG, c(250f, -250f))
    @Test fun diagonalBaixoCurto() = assertEquals(Gesture.DIAG_DOWN_SHORT, c(100f, 100f))
    @Test fun diagonalBaixoLongo() = assertEquals(Gesture.DIAG_DOWN_LONG, c(250f, 250f))
    @Test fun pelaBordaParaCima() = assertEquals(Gesture.ALONG_UP, c(10f, -150f))
    @Test fun pelaBordaParaBaixo() = assertEquals(Gesture.ALONG_DOWN, c(-5f, 150f))
    @Test fun voltarParaForaCancela() = assertNull(c(-150f, 5f))

    @Test fun acaoIdaEVolta() {
        val a = Action(ActionType.OPEN_APP, "com.whatsapp", "WhatsApp")
        assertEquals(a, Action.decode(a.encode()))
        assertNull(Action.decode("NAO_EXISTE"))
    }
}

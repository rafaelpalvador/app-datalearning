package app.bordas

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.provider.Settings
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Slider
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.graphics.drawable.toBitmap
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlin.math.roundToInt

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent { BordasTheme { MainScreen() } }
    }
}

@Composable
fun BordasTheme(content: @Composable () -> Unit) {
    val dark = isSystemInDarkTheme()
    val ctx = LocalContext.current
    val scheme = when {
        Build.VERSION.SDK_INT >= 31 -> if (dark) dynamicDarkColorScheme(ctx) else dynamicLightColorScheme(ctx)
        dark -> darkColorScheme()
        else -> lightColorScheme()
    }
    MaterialTheme(colorScheme = scheme, content = content)
}

private sealed interface Picker {
    data class PickAction(val side: Side, val gesture: Gesture) : Picker
    data class PickApp(val side: Side, val gesture: Gesture, val forActivity: Boolean) : Picker
    data class PickActivity(val side: Side, val gesture: Gesture, val pkg: String, val appLabel: String) : Picker
    data class PickUrl(val side: Side, val gesture: Gesture) : Picker
}

private fun Context.open(intent: Intent) {
    runCatching { startActivity(intent) }
}

private fun isIgnoringBattery(ctx: Context): Boolean =
    ctx.getSystemService(PowerManager::class.java)?.isIgnoringBatteryOptimizations(ctx.packageName) ?: true

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainScreen() {
    val ctx = LocalContext.current
    val prefs = remember { Prefs(ctx) }
    var cfg by remember { mutableStateOf(prefs.config()) }
    var actions by remember { mutableStateOf(prefs.allActions()) }
    var side by rememberSaveable { mutableStateOf(Side.LEFT) }
    var picker by remember { mutableStateOf<Picker?>(null) }
    var serviceOn by remember { mutableStateOf(EdgeService.isEnabled(ctx)) }
    var batteryOk by remember { mutableStateOf(isIgnoringBattery(ctx)) }

    val lifecycle = LocalLifecycleOwner.current.lifecycle
    DisposableEffect(lifecycle) {
        val obs = LifecycleEventObserver { _, e ->
            if (e == Lifecycle.Event.ON_RESUME) {
                serviceOn = EdgeService.isEnabled(ctx)
                batteryOk = isIgnoringBattery(ctx)
            }
        }
        lifecycle.addObserver(obs)
        onDispose { lifecycle.removeObserver(obs) }
    }

    fun update(c: Config) {
        cfg = c
        prefs.save(c)
    }

    fun setAction(s: Side, g: Gesture, a: Action) {
        prefs.setAction(s, g, a)
        actions = prefs.allActions()
    }

    Scaffold(topBar = { TopAppBar(title = { Text("Bordas") }) }) { pad ->
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(pad),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            item {
                StatusCards(
                    serviceOn = serviceOn,
                    enabled = cfg.enabled,
                    onToggle = { update(cfg.copy(enabled = it)) },
                    batteryOk = batteryOk,
                )
            }
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                    Side.entries.forEach { s ->
                        FilterChip(selected = side == s, onClick = { side = s }, label = { Text("Borda ${s.label.lowercase()}") })
                    }
                }
            }
            item {
                Card {
                    SwitchSetting(
                        title = "Usar a borda ${side.label.lowercase()}",
                        checked = cfg.sideOn(side),
                        onChange = {
                            update(if (side == Side.LEFT) cfg.copy(leftOn = it) else cfg.copy(rightOn = it))
                        },
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp),
                    )
                    HorizontalDivider()
                    Gesture.entries.forEach { g ->
                        GestureRow(side, g, actions[side to g] ?: Action.NONE) {
                            picker = Picker.PickAction(side, g)
                        }
                    }
                }
            }
            item { HandleSettings(cfg, ::update) }
            item { TipsCard() }
        }
    }

    when (val p = picker) {
        is Picker.PickAction -> ActionPickerDialog(
            title = "${p.gesture.arrow(p.side)} ${p.gesture.label}",
            current = actions[p.side to p.gesture]?.type,
            onDismiss = { picker = null },
            onPick = { t ->
                picker = when (t) {
                    ActionType.OPEN_APP -> Picker.PickApp(p.side, p.gesture, forActivity = false)
                    ActionType.OPEN_ACTIVITY -> Picker.PickApp(p.side, p.gesture, forActivity = true)
                    ActionType.OPEN_URL -> Picker.PickUrl(p.side, p.gesture)
                    else -> {
                        setAction(p.side, p.gesture, Action(t))
                        null
                    }
                }
            },
        )
        is Picker.PickApp -> AppPickerDialog(
            allApps = p.forActivity,
            onDismiss = { picker = null },
            onPick = { app ->
                picker = if (p.forActivity) {
                    Picker.PickActivity(p.side, p.gesture, app.pkg, app.label)
                } else {
                    setAction(p.side, p.gesture, Action(ActionType.OPEN_APP, app.pkg, app.label))
                    null
                }
            },
        )
        is Picker.PickActivity -> ActivityPickerDialog(
            pkg = p.pkg,
            appLabel = p.appLabel,
            onDismiss = { picker = null },
            onPick = { act ->
                val name = if (act.label.isBlank() || act.label == p.appLabel) "${p.appLabel} (${act.shortName})"
                else "${p.appLabel}: ${act.label}"
                setAction(p.side, p.gesture, Action(ActionType.OPEN_ACTIVITY, "${p.pkg}/${act.cls}", name))
                picker = null
            },
        )
        is Picker.PickUrl -> UrlDialog(
            onDismiss = { picker = null },
            onSave = { url, name ->
                setAction(p.side, p.gesture, Action(ActionType.OPEN_URL, url, name))
                picker = null
            },
        )
        null -> Unit
    }
}

@Composable
private fun StatusCards(serviceOn: Boolean, enabled: Boolean, onToggle: (Boolean) -> Unit, batteryOk: Boolean) {
    val ctx = LocalContext.current
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        if (!serviceOn) {
            Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer)) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Falta ligar o serviço", style = MaterialTheme.typography.titleMedium)
                    Text(
                        "Os gestos funcionam por cima de qualquer app através de um serviço de acessibilidade. " +
                            "Ele só recebe os toques feitos na alça da borda; não lê nada da tela.",
                    )
                    Text(
                        "Em Acessibilidade, procure \"Bordas\" (às vezes dentro de \"Apps instalados\" ou \"Serviços baixados\") e ligue.",
                        style = MaterialTheme.typography.bodySmall,
                    )
                    Button(onClick = { ctx.open(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)) }) {
                        Text("Abrir Acessibilidade")
                    }
                    Text(
                        "Se aparecer \"configuração restrita\" e não deixar ligar: abra as informações do app, toque em ⋮ " +
                            "(canto superior) e em \"Permitir configurações restritas\". Depois tente de novo.",
                        style = MaterialTheme.typography.bodySmall,
                    )
                    OutlinedButton(onClick = {
                        ctx.open(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:${ctx.packageName}")))
                    }) { Text("Informações do app") }
                }
            }
        } else {
            Card {
                Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text(if (enabled) "Gestos ligados" else "Gestos pausados", style = MaterialTheme.typography.titleMedium)
                        Text("Serviço de acessibilidade ativo", style = MaterialTheme.typography.bodySmall)
                    }
                    Switch(checked = enabled, onCheckedChange = onToggle)
                }
            }
        }
        if (!batteryOk) {
            Card {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Evite que o sistema desligue os gestos", style = MaterialTheme.typography.titleMedium)
                    Text(
                        "A economia de bateria pode fechar o serviço em segundo plano. Libere o Bordas da otimização.",
                        style = MaterialTheme.typography.bodySmall,
                    )
                    OutlinedButton(onClick = {
                        ctx.open(
                            Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:${ctx.packageName}")),
                        )
                    }) { Text("Liberar bateria") }
                }
            }
        }
    }
}

@Composable
private fun GestureRow(side: Side, g: Gesture, action: Action, onClick: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().clickable(onClick = onClick).padding(horizontal = 16.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            g.arrow(side),
            fontSize = 26.sp,
            fontWeight = if (g.isLong) FontWeight.Bold else FontWeight.Normal,
            textAlign = TextAlign.Center,
            modifier = Modifier.width(40.dp),
        )
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(g.label, style = MaterialTheme.typography.bodyLarge)
            Text(
                action.label,
                style = MaterialTheme.typography.bodyMedium,
                color = if (action.type == ActionType.NONE) MaterialTheme.colorScheme.outline else MaterialTheme.colorScheme.primary,
            )
        }
    }
}

@Composable
private fun HandleSettings(cfg: Config, update: (Config) -> Unit) {
    Card {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text("Alça e sensibilidade", style = MaterialTheme.typography.titleMedium)
            Text(
                "As mudanças aparecem na hora na borda da tela.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.outline,
            )
            SliderSetting("Posição vertical", cfg.position, 5..95, "%") { update(cfg.copy(position = it)) }
            SliderSetting("Altura da alça", cfg.heightDp, 60..600, " dp") { update(cfg.copy(heightDp = it)) }
            SliderSetting("Largura da área de toque", cfg.widthDp, 4..40, " dp") { update(cfg.copy(widthDp = it)) }
            SliderSetting("Distância mínima do gesto", cfg.shortDp, 16..120, " dp") { update(cfg.copy(shortDp = it)) }
            SliderSetting("Gesto longo a partir de", cfg.longPct, 15..80, "% da tela") { update(cfg.copy(longPct = it)) }
            SliderSetting("Visibilidade da alça", cfg.handleAlpha, 0..100, "%") { update(cfg.copy(handleAlpha = it)) }
            Text(
                if (cfg.handleAlpha == 0) "Transparente: a alça continua funcionando, só não aparece."
                else "0% = totalmente transparente (continua funcionando).",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.outline,
            )
            SwitchSetting("Mostrar a seta do gesto", cfg.showFeedback, { update(cfg.copy(showFeedback = it)) }, subtitle = "Seta saindo da borda com o nome da ação, como na Samsung")
            SwitchSetting("Vibrar", cfg.haptic, { update(cfg.copy(haptic = it)) }, subtitle = "1 toque = gesto curto, 2º toque mais forte = gesto longo")
            SwitchSetting("Mostrar o nome do gesto", cfg.showToast, { update(cfg.copy(showToast = it)) }, subtitle = "Bom para aprender e testar")
            SwitchSetting("Funcionar na horizontal", cfg.landscape, { update(cfg.copy(landscape = it)) }, subtitle = "Desligado = não atrapalha vídeos e jogos")
        }
    }
}

@Composable
private fun SliderSetting(title: String, value: Int, range: IntRange, unit: String, onChange: (Int) -> Unit) {
    Column {
        Row(Modifier.padding(top = 8.dp)) {
            Text(title, Modifier.weight(1f), style = MaterialTheme.typography.bodyLarge)
            Text("$value$unit", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.primary)
        }
        Slider(
            value = value.toFloat(),
            onValueChange = { onChange(it.roundToInt()) },
            valueRange = range.first.toFloat()..range.last.toFloat(),
        )
    }
}

@Composable
private fun SwitchSetting(
    title: String,
    checked: Boolean,
    onChange: (Boolean) -> Unit,
    modifier: Modifier = Modifier,
    subtitle: String? = null,
) {
    Row(
        modifier.fillMaxWidth().clickable { onChange(!checked) }.padding(vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.weight(1f)) {
            Text(title, style = MaterialTheme.typography.bodyLarge)
            if (subtitle != null) {
                Text(subtitle, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.outline)
            }
        }
        Switch(checked = checked, onCheckedChange = onChange)
    }
}

@Composable
private fun TipsCard() {
    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.secondaryContainer)) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("Dicas", style = MaterialTheme.typography.titleMedium)
            Text(
                "• Comece o gesto em cima da alça e arraste para dentro. Reto, na diagonal para cima ou para baixo; " +
                    "curto ou longo (arraste até sentir a 2ª vibração). Também dá para deslizar pela borda, para cima ou para baixo.",
            )
            Text(
                "• Navegação por gestos do Android: a borda também é o \"voltar\" do sistema. O Bordas reserva a área da alça, " +
                    "mas o Android só aceita até ~200 dp de altura por lado. Se o voltar do sistema disparar no lugar do seu gesto, " +
                    "deixe a alça com até 200 dp ou reduza a sensibilidade do gesto de voltar nas configurações de navegação.",
            )
            Text(
                "• Honor/MagicOS: em Configurações > Bateria > Inicialização de apps, coloque o Bordas em \"Gerenciar manualmente\" " +
                    "com tudo ligado. Assim o sistema não desliga os gestos.",
            )
        }
    }
}

@Composable
private fun ActionPickerDialog(
    title: String,
    current: ActionType?,
    onDismiss: () -> Unit,
    onPick: (ActionType) -> Unit,
) {
    val types = remember { ActionType.entries.filter { Build.VERSION.SDK_INT >= it.minSdk } }
    AlertDialog(
        onDismissRequest = onDismiss,
        confirmButton = {},
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancelar") } },
        title = { Text(title) },
        text = {
            LazyColumn {
                items(types) { t ->
                    Row(
                        Modifier.fillMaxWidth().clickable { onPick(t) }.padding(vertical = 10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        RadioButton(selected = t == current, onClick = null)
                        Spacer(Modifier.width(12.dp))
                        Text(t.label)
                    }
                }
            }
        },
    )
}

private data class AppEntry(val label: String, val pkg: String, val icon: ImageBitmap?)

private fun loadApps(ctx: Context, all: Boolean): List<AppEntry> =
    if (all) loadAllApps(ctx) else loadLauncherApps(ctx)

/** Todos os pacotes instalados, inclusive os de sistema sem ícone na gaveta (ex.: leitor de QR). */
private fun loadAllApps(ctx: Context): List<AppEntry> {
    val pm = ctx.packageManager
    val list = if (Build.VERSION.SDK_INT >= 33) {
        pm.getInstalledApplications(PackageManager.ApplicationInfoFlags.of(0))
    } else {
        @Suppress("DEPRECATION")
        pm.getInstalledApplications(0)
    }
    val px = (40 * ctx.resources.displayMetrics.density).toInt()
    return list
        .filter { it.packageName != ctx.packageName }
        .map { ai ->
            AppEntry(
                label = ai.loadLabel(pm).toString(),
                pkg = ai.packageName,
                icon = runCatching { ai.loadIcon(pm).toBitmap(px, px).asImageBitmap() }.getOrNull(),
            )
        }
        .sortedBy { it.label.lowercase() }
}

private fun loadLauncherApps(ctx: Context): List<AppEntry> {
    val pm = ctx.packageManager
    val intent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
    val list = if (Build.VERSION.SDK_INT >= 33) {
        pm.queryIntentActivities(intent, PackageManager.ResolveInfoFlags.of(0))
    } else {
        @Suppress("DEPRECATION")
        pm.queryIntentActivities(intent, 0)
    }
    val density = ctx.resources.displayMetrics.density
    val px = (40 * density).toInt()
    return list
        .distinctBy { it.activityInfo.packageName }
        .filter { it.activityInfo.packageName != ctx.packageName }
        .map { ri ->
            AppEntry(
                label = ri.loadLabel(pm).toString(),
                pkg = ri.activityInfo.packageName,
                icon = runCatching { ri.loadIcon(pm).toBitmap(px, px).asImageBitmap() }.getOrNull(),
            )
        }
        .sortedBy { it.label.lowercase() }
}

@Composable
private fun AppPickerDialog(allApps: Boolean, onDismiss: () -> Unit, onPick: (AppEntry) -> Unit) {
    val ctx = LocalContext.current
    val apps by produceState<List<AppEntry>?>(initialValue = null) {
        value = withContext(Dispatchers.IO) { loadApps(ctx, allApps) }
    }
    var query by remember { mutableStateOf("") }
    AlertDialog(
        onDismissRequest = onDismiss,
        confirmButton = {},
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancelar") } },
        title = { Text(if (allApps) "De qual app é a tela?" else "Escolha o app") },
        text = {
            Column {
                OutlinedTextField(
                    value = query,
                    onValueChange = { query = it },
                    placeholder = { Text("Buscar") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                Spacer(Modifier.height(8.dp))
                val list = apps
                if (list == null) {
                    Box(Modifier.fillMaxWidth().height(120.dp), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator()
                    }
                } else {
                    val q = query.trim()
                    val shown = list.filter {
                        q.isEmpty() || it.label.contains(q, ignoreCase = true) || (allApps && it.pkg.contains(q, ignoreCase = true))
                    }
                    LazyColumn(Modifier.heightIn(max = 420.dp)) {
                        items(shown, key = { it.pkg }) { app ->
                            Row(
                                Modifier.fillMaxWidth().clickable { onPick(app) }.padding(vertical = 8.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                val icon = app.icon
                                if (icon != null) {
                                    Image(bitmap = icon, contentDescription = null, modifier = Modifier.size(36.dp))
                                } else {
                                    Spacer(Modifier.size(36.dp))
                                }
                                Spacer(Modifier.width(12.dp))
                                Column {
                                    Text(app.label)
                                    if (allApps) {
                                        Text(app.pkg, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.outline)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
    )
}

private data class ActEntry(val cls: String, val label: String) {
    val shortName: String get() = cls.substringAfterLast('.')
}

/** Telas (activities) que o app deixa outros apps abrirem. */
private fun loadActivities(ctx: Context, pkg: String): List<ActEntry> {
    val pm = ctx.packageManager
    val info = runCatching {
        if (Build.VERSION.SDK_INT >= 33) {
            pm.getPackageInfo(pkg, PackageManager.PackageInfoFlags.of(PackageManager.GET_ACTIVITIES.toLong()))
        } else {
            @Suppress("DEPRECATION")
            pm.getPackageInfo(pkg, PackageManager.GET_ACTIVITIES)
        }
    }.getOrNull() ?: return emptyList()
    return info.activities.orEmpty()
        .filter { it.exported && it.enabled && it.permission == null }
        .map { ActEntry(it.name, it.loadLabel(pm).toString()) }
        .sortedBy { it.shortName.lowercase() }
}

@Composable
private fun ActivityPickerDialog(pkg: String, appLabel: String, onDismiss: () -> Unit, onPick: (ActEntry) -> Unit) {
    val ctx = LocalContext.current
    val acts by produceState<List<ActEntry>?>(initialValue = null, pkg) {
        value = withContext(Dispatchers.IO) { loadActivities(ctx, pkg) }
    }
    var query by remember { mutableStateOf("") }
    AlertDialog(
        onDismissRequest = onDismiss,
        confirmButton = {},
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancelar") } },
        title = { Text("Telas de $appLabel") },
        text = {
            Column {
                OutlinedTextField(
                    value = query,
                    onValueChange = { query = it },
                    placeholder = { Text("Buscar (ex.: scan, qr, code)") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                Spacer(Modifier.height(8.dp))
                val list = acts
                when {
                    list == null -> Box(Modifier.fillMaxWidth().height(120.dp), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator()
                    }
                    list.isEmpty() -> Text("Este app não tem telas que possam ser abertas por outros apps.")
                    else -> {
                        val q = query.trim()
                        val shown = list.filter {
                            q.isEmpty() || it.cls.contains(q, ignoreCase = true) || it.label.contains(q, ignoreCase = true)
                        }
                        LazyColumn(Modifier.heightIn(max = 420.dp)) {
                            items(shown, key = { it.cls }) { act ->
                                Column(Modifier.fillMaxWidth().clickable { onPick(act) }.padding(vertical = 8.dp)) {
                                    Text(act.shortName, style = MaterialTheme.typography.bodyLarge)
                                    Text(
                                        "${act.label} · ${act.cls}",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.outline,
                                    )
                                }
                            }
                        }
                    }
                }
                Text(
                    "Dica: nem toda tela abre sozinha; se não funcionar, teste outra da lista.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.outline,
                    modifier = Modifier.padding(top = 8.dp),
                )
            }
        },
    )
}

@Composable
private fun UrlDialog(onDismiss: () -> Unit, onSave: (String, String) -> Unit) {
    var url by remember { mutableStateOf("") }
    var name by remember { mutableStateOf("") }
    AlertDialog(
        onDismissRequest = onDismiss,
        confirmButton = {
            TextButton(onClick = { onSave(url.trim(), name.trim()) }, enabled = url.isNotBlank()) { Text("Salvar") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancelar") } },
        title = { Text("Abrir link ou atalho") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(
                    value = url,
                    onValueChange = { url = it },
                    label = { Text("Link") },
                    placeholder = { Text("https://...") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Nome (opcional)") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                Text(
                    "Exemplos: um site (https://...), ligar para alguém (tel:11999999999), " +
                        "conversa do WhatsApp (https://wa.me/5511999999999), e-mail (mailto:voce@exemplo.com).",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.outline,
                )
            }
        },
    )
}

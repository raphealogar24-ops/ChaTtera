package com.example.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color

// Exact Chattera & CipherGrid color palette from index.css
val ChatteraPrimary = Color(0xFF5B4BDB)
val ChatteraPrimaryDark = Color(0xFF4436B8)
val ChatteraOnlineGreen = Color(0xFF21C47B)

data class ChatteraSemanticColors(
    val isDark: Boolean,
    val primary: Color = ChatteraPrimary,
    val primaryDark: Color = ChatteraPrimaryDark,
    val online: Color = ChatteraOnlineGreen,
    val bg: Color,
    val card: Color,
    val text: Color,
    val muted: Color,
    val border: Color,
    val softTint: Color,
    val iconBg: Color
)

val LightChatteraColors = ChatteraSemanticColors(
    isDark = false,
    bg = Color(0xFFF6F7FB),
    card = Color(0xFFFFFFFF),
    text = Color(0xFF17172B),
    muted = Color(0xFF85879A),
    border = Color(0xFFECECF3),
    softTint = Color(0xFFEEEAFF),
    iconBg = Color(0xFFF1F1F8)
)

val DarkChatteraColors = ChatteraSemanticColors(
    isDark = true,
    bg = Color(0xFF11111B),
    card = Color(0xFF191925),
    text = Color(0xFFF4F4FA),
    muted = Color(0xFF9293A7),
    border = Color(0xFF29293A),
    softTint = Color(0xFF262346),
    iconBg = Color(0xFF272738)
)

val LocalChatteraColors = staticCompositionLocalOf { LightChatteraColors }

private val LightColorScheme = lightColorScheme(
    primary = ChatteraPrimary,
    onPrimary = Color.White,
    primaryContainer = Color(0xFFEEEAFF),
    onPrimaryContainer = ChatteraPrimaryDark,
    secondary = ChatteraOnlineGreen,
    onSecondary = Color.White,
    background = Color(0xFFF6F7FB),
    onBackground = Color(0xFF17172B),
    surface = Color(0xFFFFFFFF),
    onSurface = Color(0xFF17172B),
    surfaceVariant = Color(0xFFF1F1F8),
    onSurfaceVariant = Color(0xFF85879A),
    outline = Color(0xFFECECF3)
)

private val DarkColorScheme = darkColorScheme(
    primary = ChatteraPrimary,
    onPrimary = Color.White,
    primaryContainer = Color(0xFF262346),
    onPrimaryContainer = Color(0xFFE0DAFF),
    secondary = ChatteraOnlineGreen,
    onSecondary = Color.White,
    background = Color(0xFF11111B),
    onBackground = Color(0xFFF4F4FA),
    surface = Color(0xFF191925),
    onSurface = Color(0xFFF4F4FA),
    surfaceVariant = Color(0xFF272738),
    onSurfaceVariant = Color(0xFF9293A7),
    outline = Color(0xFF29293A)
)

@Composable
fun ChatteraTheme(
    darkTheme: Boolean,
    content: @Composable () -> Unit
) {
    val chatteraColors = if (darkTheme) DarkChatteraColors else LightChatteraColors
    val m3Scheme = if (darkTheme) DarkColorScheme else LightColorScheme

    CompositionLocalProvider(LocalChatteraColors provides chatteraColors) {
        MaterialTheme(
            colorScheme = m3Scheme,
            content = content
        )
    }
}

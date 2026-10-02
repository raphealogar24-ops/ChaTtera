package com.example.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ui.theme.ChatteraOnlineGreen
import com.example.ui.theme.ChatteraPrimary
import com.example.ui.theme.LocalChatteraColors

@Composable
fun ChatteraLogo(
    size: Dp = 44.dp,
    modifier: Modifier = Modifier
) {
    Canvas(modifier = modifier.size(size)) {
        val w = this.size.width
        val h = this.size.height
        val scale = w / 64f

        // Background rounded square (#5B4BDB -> #4436B8)
        drawRoundRect(
            brush = Brush.linearGradient(
                colors = listOf(Color(0xFF6756E7), Color(0xFF4434BD)),
                start = Offset.Zero,
                end = Offset(w, h)
            ),
            topLeft = Offset(2f * scale, 2f * scale),
            size = Size(60f * scale, 60f * scale),
            cornerRadius = CornerRadius(18f * scale, 18f * scale)
        )

        // Speech bubble ring
        drawArc(
            color = Color.White,
            startAngle = -35f,
            sweepAngle = 310f,
            useCenter = false,
            topLeft = Offset(14f * scale, 16f * scale),
            size = Size(34f * scale, 32f * scale),
            style = Stroke(width = 4.6f * scale, cap = StrokeCap.Round)
        )

        // Left soundwave bar (white)
        drawRoundRect(
            color = Color.White,
            topLeft = Offset(24.5f * scale, 28.5f * scale),
            size = Size(3.4f * scale, 9f * scale),
            cornerRadius = CornerRadius(1.7f * scale, 1.7f * scale)
        )

        // Center soundwave bar (emerald #21C47B)
        drawRoundRect(
            color = ChatteraOnlineGreen,
            topLeft = Offset(30f * scale, 24.5f * scale),
            size = Size(3.4f * scale, 17f * scale),
            cornerRadius = CornerRadius(1.7f * scale, 1.7f * scale)
        )

        // Right soundwave bar (white)
        drawRoundRect(
            color = Color.White,
            topLeft = Offset(35.5f * scale, 27.5f * scale),
            size = Size(3.4f * scale, 11f * scale),
            cornerRadius = CornerRadius(1.7f * scale, 1.7f * scale)
        )
    }
}

@Composable
fun ChatteraAvatar(
    name: String,
    colorHex: Long = 0xFF5B4BDB,
    size: Dp = 44.dp,
    online: Boolean = false,
    storyRing: Boolean = false,
    modifier: Modifier = Modifier
) {
    val colors = LocalChatteraColors.current
    val initials = name
        .trim()
        .split(" ")
        .filter { it.isNotBlank() }
        .take(2)
        .joinToString("") { it.first().uppercase() }
        .ifBlank { "C" }

    val baseColor = Color(colorHex)

    Box(modifier = modifier.size(size), contentAlignment = Alignment.Center) {
        val innerSize = if (storyRing) size - 6.dp else size
        Box(
            modifier = Modifier
                .size(size)
                .then(
                    if (storyRing) {
                        Modifier
                            .border(
                                width = 2.5.dp,
                                brush = Brush.linearGradient(
                                    colors = listOf(ChatteraPrimary, ChatteraOnlineGreen)
                                ),
                                shape = CircleShape
                            )
                            .padding(3.dp)
                    } else {
                        Modifier
                    }
                )
                .clip(CircleShape)
                .background(
                    Brush.linearGradient(
                        colors = listOf(
                            baseColor,
                            baseColor.copy(alpha = 0.78f)
                        )
                    )
                ),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = initials,
                color = Color.White,
                fontSize = (innerSize.value * 0.36f).sp,
                fontWeight = FontWeight.Bold
            )
        }

        if (online) {
            val dotSize = (size.value * 0.28f).coerceIn(10f, 15f).dp
            Box(
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .size(dotSize)
                    .clip(CircleShape)
                    .background(ChatteraOnlineGreen)
                    .border(2.dp, colors.card, CircleShape)
            )
        }
    }
}

@Composable
fun GoogleLogoIcon(
    size: Dp = 18.dp,
    modifier: Modifier = Modifier
) {
    Canvas(modifier = modifier.size(size)) {
        val w = this.size.width
        val h = this.size.height
        val stroke = w * 0.20f
        val arcSize = Size(w - stroke, h - stroke)
        val arcOffset = Offset(stroke / 2f, stroke / 2f)

        // 1. Blue horizontal crossbar
        drawLine(
            color = Color(0xFF4285F4),
            start = Offset(w * 0.44f, h * 0.5f),
            end = Offset(w - stroke / 2f, h * 0.5f),
            strokeWidth = stroke,
            cap = StrokeCap.Square
        )

        // 2. Blue arc (right-bottom section: from -20 deg to 45 deg)
        drawArc(
            color = Color(0xFF4285F4),
            startAngle = -20f,
            sweepAngle = 65f,
            useCenter = false,
            topLeft = arcOffset,
            size = arcSize,
            style = Stroke(width = stroke, cap = StrokeCap.Butt)
        )

        // 3. Green arc (bottom section: 45 to 135 deg)
        drawArc(
            color = Color(0xFF34A853),
            startAngle = 45f,
            sweepAngle = 90f,
            useCenter = false,
            topLeft = arcOffset,
            size = arcSize,
            style = Stroke(width = stroke, cap = StrokeCap.Butt)
        )

        // 4. Yellow arc (left section: 135 to 225 deg)
        drawArc(
            color = Color(0xFFFBBC05),
            startAngle = 135f,
            sweepAngle = 90f,
            useCenter = false,
            topLeft = arcOffset,
            size = arcSize,
            style = Stroke(width = stroke, cap = StrokeCap.Butt)
        )

        // 5. Red arc (top section: 225 to 340 deg)
        drawArc(
            color = Color(0xFFEA4335),
            startAngle = 225f,
            sweepAngle = 115f,
            useCenter = false,
            topLeft = arcOffset,
            size = arcSize,
            style = Stroke(width = stroke, cap = StrokeCap.Butt)
        )
    }
}

fun launchGoogleSearch(context: android.content.Context, query: String) {
    val clean = query.trim()
    val url = if (clean.isEmpty()) {
        "https://www.google.com"
    } else {
        "https://www.google.com/search?q=" + java.net.URLEncoder.encode(clean, "UTF-8")
    }
    val intent = android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse(url)).apply {
        addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
    }
    try {
        context.startActivity(intent)
    } catch (_: Exception) {}
}


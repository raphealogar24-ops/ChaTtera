package com.example.ui.components

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Reply
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.AccountBalanceWallet
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Call
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Code
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.DoneAll
import androidx.compose.material.icons.filled.EmojiEmotions
import androidx.compose.material.icons.filled.Image
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Key
import androidx.compose.material.icons.filled.LocalFireDepartment
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Timer
import androidx.compose.material.icons.filled.VerifiedUser
import androidx.compose.material.icons.filled.Videocam
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import com.example.crypto.E2eeEngine
import com.example.crypto.VoiceAudioEngine
import com.example.data.ContactEntity
import com.example.data.MessageEntity
import com.example.data.MessageKind
import com.example.data.ReplyQuote
import com.example.data.parseSpecialPayload
import com.example.ui.theme.ChatteraOnlineGreen
import com.example.ui.theme.ChatteraPrimary
import com.example.ui.theme.LocalChatteraColors
import kotlinx.coroutines.delay
import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

private val QUICK_EMOJIS = listOf("😀", "😂", "❤️", "🔥", "🎉", "👏", "🙌", "✨", "👍", "🙏", "💯", "🚀")
private val REACTION_EMOJIS = listOf("❤️", "🔥", "😂", "👍", "🎉")
private val SAMPLE_SHARED_PHOTOS = listOf(
    "Workspace Setup" to "photo_workspace",
    "Design Mockup" to "photo_design",
    "City Sunset" to "photo_sunset"
)

private fun formatAudioSeconds(sec: Int): String {
    val s = sec.coerceAtLeast(0)
    val mins = s / 60
    val rem = (s % 60).toString().padStart(2, '0')
    return "$mins:$rem"
}

@Composable
fun VoiceNoteBubblePlayer(
    durationSec: Int,
    peaks: List<Int>,
    isMine: Boolean,
    modifier: Modifier = Modifier
) {
    val colors = LocalChatteraColors.current
    val scope = rememberCoroutineScope()
    var playing by remember { mutableStateOf(false) }
    var currentTime by remember { mutableFloatStateOf(0f) }
    var playbackRate by remember { mutableFloatStateOf(1f) }

    DisposableEffect(Unit) {
        onDispose {
            if (playing) {
                VoiceAudioEngine.stopPlayback()
            }
        }
    }

    val safePeaks = if (peaks.isEmpty()) listOf(35, 65, 80, 45, 90, 70, 50, 85, 60, 40) else peaks
    val progressRatio = if (durationSec > 0) (currentTime / durationSec).coerceIn(0f, 1f) else 0f

    Row(
        modifier = modifier
            .widthIn(min = 210.dp, max = 270.dp)
            .padding(vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        Box(
            modifier = Modifier
                .size(38.dp)
                .clip(CircleShape)
                .background(if (isMine) Color.White else ChatteraPrimary)
                .clickable {
                    if (playing) {
                        VoiceAudioEngine.stopPlayback()
                        playing = false
                    } else {
                        playing = true
                        VoiceAudioEngine.startSynthesizedVoiceNote(
                            scope = scope,
                            durationSec = durationSec,
                            peaks = safePeaks,
                            playbackRate = playbackRate,
                            startProgressRatio = if (currentTime >= durationSec) 0f else progressRatio,
                            onProgress = { sec -> currentTime = sec },
                            onCompleted = {
                                playing = false
                                currentTime = 0f
                            }
                        )
                    }
                }
                .testTag("voice_note_play_button"),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = if (playing) Icons.Default.Pause else Icons.Default.PlayArrow,
                contentDescription = if (playing) "Pause voice message" else "Play voice message",
                tint = if (isMine) ChatteraPrimary else Color.White,
                modifier = Modifier.size(20.dp)
            )
        }

        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(26.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(2.dp)
            ) {
                safePeaks.take(24).forEachIndexed { idx, peak ->
                    val barRatio = idx.toFloat() / safePeaks.size.coerceAtLeast(1)
                    val isPlayed = (playing || currentTime > 0f) && barRatio <= progressRatio
                    val heightPct = (peak.coerceIn(22, 100) / 100f)
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxHeight()
                            .clickable {
                                val seekRatio = idx.toFloat() / safePeaks.size.coerceAtLeast(1)
                                currentTime = seekRatio * durationSec
                                playing = true
                                VoiceAudioEngine.startSynthesizedVoiceNote(
                                    scope = scope,
                                    durationSec = durationSec,
                                    peaks = safePeaks,
                                    playbackRate = playbackRate,
                                    startProgressRatio = seekRatio,
                                    onProgress = { sec -> currentTime = sec },
                                    onCompleted = {
                                        playing = false
                                        currentTime = 0f
                                    }
                                )
                            },
                        contentAlignment = Alignment.Center
                    ) {
                        Box(
                            modifier = Modifier
                                .width(3.dp)
                                .fillMaxHeight(heightPct)
                                .clip(RoundedCornerShape(99.dp))
                                .background(
                                    when {
                                        isMine && isPlayed -> Color.White
                                        isMine -> Color.White.copy(alpha = 0.42f)
                                        isPlayed -> ChatteraPrimary
                                        else -> colors.muted.copy(alpha = 0.45f)
                                    }
                                )
                        )
                    }
                }
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = if (playing || currentTime > 0f) {
                        "${formatAudioSeconds(currentTime.toInt())} / ${formatAudioSeconds(durationSec)}"
                    } else {
                        "${formatAudioSeconds(durationSec)} · Voice Note"
                    },
                    fontSize = 10.sp,
                    fontFamily = FontFamily.Monospace,
                    color = if (isMine) Color.White.copy(alpha = 0.85f) else colors.muted
                )

                Surface(
                    shape = RoundedCornerShape(6.dp),
                    color = if (isMine) Color.White.copy(alpha = 0.2f) else colors.iconBg,
                    modifier = Modifier.clickable {
                        playbackRate = when (playbackRate) {
                            1f -> 1.5f
                            1.5f -> 2f
                            else -> 1f
                        }
                    }
                ) {
                    val rateLabel = if (playbackRate == 1.5f) "1.5x" else "${playbackRate.toInt()}x"
                    Text(
                        text = rateLabel,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (isMine) Color.White else colors.text,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                    )
                }
            }
        }
    }
}

@Composable
fun ChatteraChatThreadScreen(
    target: ContactEntity,
    myUid: String,
    messages: List<MessageEntity>,
    contacts: List<ContactEntity>,
    peerActivity: String,
    peerActivitiesMap: Map<String, String>,
    onSelectContact: (ContactEntity) -> Unit,
    onOpenNewChatModal: () -> Unit,
    onBackMobile: () -> Unit,
    onSendMessage: (String) -> Unit,
    onRevokeMessage: (String) -> Unit,
    onAcknowledgeMessage: (String, String) -> Unit,
    onToggleReaction: (String, String) -> Unit,
    onStartCall: (String) -> Unit,
    onOpenSafetyNumber: () -> Unit,
    onQuickSendCashInChat: (Long, String) -> Unit,
    showBackButton: Boolean = true,
    modifier: Modifier = Modifier
) {
    val colors = LocalChatteraColors.current
    val context = LocalContext.current
    val listState = rememberLazyListState()

    var draft by remember { mutableStateOf("") }
    var stealthSeconds by remember { mutableStateOf<Int?>(null) }
    var xrayMode by remember { mutableStateOf(false) }
    val expandedFrames = remember { mutableStateMapOf<String, Boolean>() }

    var showCashBar by remember { mutableStateOf(false) }
    var cashAmount by remember { mutableStateOf("5000") }
    var cashNote by remember { mutableStateOf("Lunch & coffee") }

    var showEmojiPicker by remember { mutableStateOf(false) }
    var showPhotoPicker by remember { mutableStateOf(false) }
    var replyingTo by remember { mutableStateOf<ReplyQuote?>(null) }

    var inChatSearchOpen by remember { mutableStateOf(false) }
    var inChatSearchQuery by remember { mutableStateOf("") }
    var contactInfoOpen by remember { mutableStateOf(false) }

    // Voice recording state
    var isRecordingVoice by remember { mutableStateOf(false) }
    var recordingSeconds by remember { mutableIntStateOf(0) }
    var liveWavePeaks by remember { mutableStateOf(List(18) { 35 }) }
    val collectedPeaks = remember { mutableListOf<Int>() }

    val audioPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { _ ->
        // Start voice recording whether mic granted or acoustic synth fallback in emulator
        collectedPeaks.clear()
        recordingSeconds = 0
        isRecordingVoice = true
    }

    val photoPickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickVisualMedia()
    ) { uri ->
        if (uri != null) {
            onSendMessage("[IMG:$uri] Shared a photo from gallery")
            showPhotoPicker = false
        }
    }

    LaunchedEffect(isRecordingVoice) {
        if (isRecordingVoice) {
            val startMs = System.currentTimeMillis()
            while (isRecordingVoice) {
                delay(200)
                recordingSeconds = ((System.currentTimeMillis() - startMs) / 1000L).toInt()
                val nextPeak = (32..94).random()
                collectedPeaks.add(nextPeak)
                liveWavePeaks = (liveWavePeaks.drop(1) + nextPeak)
            }
        }
    }

    val displayedMessages = remember(messages, inChatSearchQuery) {
        if (inChatSearchQuery.isBlank()) {
            messages
        } else {
            messages.filter { it.plaintext.contains(inChatSearchQuery.trim(), ignoreCase = true) }
        }
    }

    LaunchedEffect(displayedMessages.size, target.id) {
        if (displayedMessages.isNotEmpty()) {
            listState.animateScrollToItem(displayedMessages.lastIndex)
        }
    }

    Surface(
        shape = RoundedCornerShape(24.dp),
        color = colors.card,
        modifier = modifier
            .fillMaxSize()
            .border(1.dp, colors.border, RoundedCornerShape(24.dp))
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            // 1. Quick Contact Switcher Strip
            if (contacts.isNotEmpty()) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(colors.bg)
                        .horizontalScroll(rememberScrollState())
                        .padding(horizontal = 12.dp, vertical = 8.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    contacts.forEach { c ->
                        val isCurrent = target.id == c.id
                        val act = peerActivitiesMap[c.id]
                        Surface(
                            shape = RoundedCornerShape(16.dp),
                            color = if (isCurrent) colors.primary else colors.card,
                            modifier = Modifier
                                .border(
                                    1.dp,
                                    if (isCurrent) colors.primary else colors.border,
                                    RoundedCornerShape(16.dp)
                                )
                                .clickable { onSelectContact(c) }
                                .testTag("quick_switch_${c.id}")
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                ChatteraAvatar(
                                    name = c.name,
                                    colorHex = c.avatarColorHex,
                                    size = 22.dp,
                                    online = c.online
                                )
                                Text(
                                    text = c.name.substringBefore(" "),
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (isCurrent) Color.White else colors.text
                                )
                                if (act != null && act != "idle") {
                                    Box(
                                        modifier = Modifier
                                            .size(7.dp)
                                            .clip(CircleShape)
                                            .background(ChatteraOnlineGreen)
                                    )
                                }
                                if (c.unreadCount > 0 && !isCurrent) {
                                    Box(
                                        modifier = Modifier
                                            .clip(CircleShape)
                                            .background(ChatteraPrimary)
                                            .padding(horizontal = 5.dp, vertical = 1.dp)
                                    ) {
                                        Text(
                                            text = c.unreadCount.toString(),
                                            fontSize = 9.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = Color.White
                                        )
                                    }
                                }
                            }
                        }
                    }

                    Surface(
                        shape = RoundedCornerShape(16.dp),
                        color = colors.card,
                        modifier = Modifier
                            .border(1.dp, colors.border, RoundedCornerShape(16.dp))
                            .clickable { onOpenNewChatModal() }
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Icon(Icons.Default.Add, contentDescription = null, tint = colors.primary, modifier = Modifier.size(14.dp))
                            Text("More", color = colors.primary, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                        }
                    }
                }
            }

            // 2. Conversation Header
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(colors.card)
                    .padding(horizontal = 12.dp, vertical = 10.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    modifier = Modifier.weight(1f),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    if (showBackButton) {
                        IconButton(
                            onClick = onBackMobile,
                            modifier = Modifier
                                .size(36.dp)
                                .clip(RoundedCornerShape(10.dp))
                                .background(colors.iconBg)
                                .testTag("chat_back_button")
                        ) {
                            Icon(
                                Icons.AutoMirrored.Filled.ArrowBack,
                                contentDescription = "Back to chats list",
                                tint = colors.text,
                                modifier = Modifier.size(18.dp)
                            )
                        }
                    }

                    Row(
                        modifier = Modifier
                            .weight(1f)
                            .clickable { contactInfoOpen = !contactInfoOpen },
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        ChatteraAvatar(
                            name = target.name,
                            colorHex = target.avatarColorHex,
                            size = 42.dp,
                            online = target.online
                        )
                        Column(modifier = Modifier.weight(1f)) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                Text(
                                    text = target.name,
                                    color = colors.text,
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Bold,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                                Icon(
                                    Icons.Default.VerifiedUser,
                                    contentDescription = "E2EE Verified",
                                    tint = ChatteraOnlineGreen,
                                    modifier = Modifier.size(14.dp)
                                )
                            }
                            val subText = when (peerActivity) {
                                "typing" -> "typing a message…"
                                "recording" -> "🎤 recording a voice message…"
                                else -> "@${target.handle} · ${if (target.online) "Active now" else "Offline"}"
                            }
                            Text(
                                text = subText,
                                color = when {
                                    peerActivity != "idle" -> colors.primary
                                    target.online -> ChatteraOnlineGreen
                                    else -> colors.muted
                                },
                                fontSize = 11.sp,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                    }
                }

                // Header Action Buttons
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    IconButton(
                        onClick = { inChatSearchOpen = !inChatSearchOpen },
                        modifier = Modifier
                            .size(36.dp)
                            .clip(RoundedCornerShape(10.dp))
                            .background(if (inChatSearchOpen) colors.softTint else colors.iconBg)
                    ) {
                        Icon(
                            Icons.Default.Search,
                            contentDescription = "Search in conversation",
                            tint = if (inChatSearchOpen) colors.primary else colors.text,
                            modifier = Modifier.size(18.dp)
                        )
                    }

                    IconButton(
                        onClick = { onStartCall("audio") },
                        modifier = Modifier
                            .size(36.dp)
                            .clip(RoundedCornerShape(10.dp))
                            .background(colors.iconBg)
                            .testTag("start_audio_call_button")
                    ) {
                        Icon(
                            Icons.Default.Call,
                            contentDescription = "Start Voice Call",
                            tint = colors.text,
                            modifier = Modifier.size(18.dp)
                        )
                    }

                    IconButton(
                        onClick = { onStartCall("video") },
                        modifier = Modifier
                            .size(36.dp)
                            .clip(RoundedCornerShape(10.dp))
                            .background(colors.iconBg)
                            .testTag("start_video_call_button")
                    ) {
                        Icon(
                            Icons.Default.Videocam,
                            contentDescription = "Start Video Call",
                            tint = colors.text,
                            modifier = Modifier.size(18.dp)
                        )
                    }

                    IconButton(
                        onClick = { contactInfoOpen = !contactInfoOpen },
                        modifier = Modifier
                            .size(36.dp)
                            .clip(RoundedCornerShape(10.dp))
                            .background(if (contactInfoOpen) colors.softTint else colors.iconBg)
                    ) {
                        Icon(
                            Icons.Default.Info,
                            contentDescription = "Contact Info",
                            tint = if (contactInfoOpen) colors.primary else colors.text,
                            modifier = Modifier.size(18.dp)
                        )
                    }

                    IconButton(
                        onClick = { xrayMode = !xrayMode },
                        modifier = Modifier
                            .size(36.dp)
                            .clip(RoundedCornerShape(10.dp))
                            .background(if (xrayMode) colors.primary else colors.iconBg)
                            .testTag("toggle_xray_button")
                    ) {
                        Icon(
                            Icons.Default.Code,
                            contentDescription = "Inspect Packet Details",
                            tint = if (xrayMode) Color.White else colors.text,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                }
            }

            // In-Chat Search Bar
            if (inChatSearchOpen) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(colors.bg)
                        .padding(horizontal = 12.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OutlinedTextField(
                        value = inChatSearchQuery,
                        onValueChange = { inChatSearchQuery = it },
                        placeholder = { Text("Search messages with ${target.name}…", fontSize = 12.sp) },
                        singleLine = true,
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.weight(1f)
                    )
                    if (inChatSearchQuery.isNotBlank()) {
                        Text(
                            text = "Clear",
                            color = colors.primary,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.clickable { inChatSearchQuery = "" }
                        )
                    }
                }
            }

            // Optional Contact Info Banner
            if (contactInfoOpen) {
                Surface(
                    color = colors.bg,
                    modifier = Modifier
                        .fillMaxWidth()
                        .border(1.dp, colors.border)
                ) {
                    Column(
                        modifier = Modifier.padding(14.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text(
                                    text = "${target.name} (@${target.handle})",
                                    color = colors.text,
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Bold
                                )
                                Text(
                                    text = "${target.phoneDisplay} · ${target.statusStoryText}",
                                    color = colors.muted,
                                    fontSize = 11.sp
                                )
                            }
                            IconButton(onClick = { contactInfoOpen = false }, modifier = Modifier.size(28.dp)) {
                                Icon(Icons.Default.Close, contentDescription = "Close info", tint = colors.muted)
                            }
                        }

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "Key: ${target.keyFingerprint.take(24)}…",
                                color = colors.muted,
                                fontSize = 10.sp,
                                fontFamily = FontFamily.Monospace
                            )
                            Surface(
                                shape = RoundedCornerShape(10.dp),
                                color = colors.softTint,
                                modifier = Modifier
                                    .clickable { onOpenSafetyNumber() }
                                    .testTag("verify_safety_number_button")
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    Icon(Icons.Default.Key, contentDescription = null, tint = colors.primary, modifier = Modifier.size(13.dp))
                                    Text("Safety Number", color = colors.primary, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }
                }
            }

            // 3. Message Stream
            LazyColumn(
                state = listState,
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth()
                    .background(colors.bg),
                contentPadding = PaddingValues(14.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                item {
                    Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                        Surface(
                            shape = RoundedCornerShape(99.dp),
                            color = colors.card,
                            modifier = Modifier.border(1.dp, colors.border, RoundedCornerShape(99.dp))
                        ) {
                            Text(
                                text = "Today · Real-Time E2EE Chat with ${target.name}",
                                color = colors.muted,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Medium,
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp)
                            )
                        }
                    }
                }

                items(displayedMessages, key = { it.id }) { msg ->
                    val isMine = msg.senderId == myUid
                    val isRevoked = msg.deliveryStatus == "revoked"
                    val parsed = parseSpecialPayload(msg.plaintext)
                    val showPacket = xrayMode || (expandedFrames[msg.id] == true)
                    val reactions = msg.reactionsCsv.split(",").filter { it.isNotBlank() }
                    val timeLabel = remember(msg.createdAtMs) {
                        SimpleDateFormat("h:mm a", Locale.getDefault()).format(Date(msg.createdAtMs))
                    }

                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalAlignment = if (isMine) Alignment.End else Alignment.Start
                    ) {
                        Row(
                            verticalAlignment = Alignment.Bottom,
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            modifier = Modifier.widthIn(max = 320.dp)
                        ) {
                            if (!isMine) {
                                ChatteraAvatar(
                                    name = target.name,
                                    colorHex = target.avatarColorHex,
                                    size = 28.dp
                                )
                            }

                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(18.dp))
                                    .background(
                                        if (isMine) {
                                            Brush.linearGradient(
                                                colors = listOf(Color(0xFF5B4BDB), Color(0xFF4737C6))
                                            )
                                        } else {
                                            Brush.linearGradient(
                                                colors = listOf(colors.card, colors.card)
                                            )
                                        }
                                    )
                                    .border(
                                        width = if (isMine) 0.dp else 1.dp,
                                        color = if (isMine) Color.Transparent else colors.border,
                                        shape = RoundedCornerShape(18.dp)
                                    )
                                    .padding(12.dp)
                            ) {
                                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                    // Reply Quote Header
                                    if (parsed.replyQuote != null && !isRevoked) {
                                        Box(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .clip(RoundedCornerShape(10.dp))
                                                .background(
                                                    if (isMine) Color.Black.copy(alpha = 0.2f)
                                                    else colors.bg
                                                )
                                                .padding(8.dp)
                                        ) {
                                            Column {
                                                Text(
                                                    text = parsed.replyQuote.senderName,
                                                    fontSize = 10.sp,
                                                    fontWeight = FontWeight.Bold,
                                                    color = if (isMine) Color.White else colors.primary
                                                )
                                                Text(
                                                    text = parsed.replyQuote.snippet,
                                                    fontSize = 11.sp,
                                                    maxLines = 1,
                                                    overflow = TextOverflow.Ellipsis,
                                                    color = if (isMine) Color.White.copy(alpha = 0.85f) else colors.muted
                                                )
                                            }
                                        }
                                    }

                                    // Disappearing Header
                                    if (parsed.kind == MessageKind.STEALTH && !isRevoked) {
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Row(
                                                verticalAlignment = Alignment.CenterVertically,
                                                horizontalArrangement = Arrangement.spacedBy(4.dp)
                                            ) {
                                                Icon(
                                                    Icons.Default.LocalFireDepartment,
                                                    contentDescription = null,
                                                    tint = Color(0xFFFBBF24),
                                                    modifier = Modifier.size(14.dp)
                                                )
                                                Text(
                                                    text = "Disappearing (${parsed.burnSeconds}s timer)",
                                                    fontSize = 11.sp,
                                                    fontWeight = FontWeight.SemiBold,
                                                    color = Color(0xFFFBBF24)
                                                )
                                            }
                                            if (isMine) {
                                                Text(
                                                    text = "Unsend",
                                                    fontSize = 11.sp,
                                                    fontWeight = FontWeight.Bold,
                                                    color = Color.White,
                                                    modifier = Modifier.clickable { onRevokeMessage(msg.id) }
                                                )
                                            }
                                        }
                                    }

                                    // Main Bubble Body
                                    when {
                                        parsed.kind == MessageKind.VOICE && !isRevoked -> {
                                            VoiceNoteBubblePlayer(
                                                durationSec = parsed.voiceDurationSec ?: 4,
                                                peaks = parsed.voicePeaks ?: emptyList(),
                                                isMine = isMine
                                            )
                                        }

                                        parsed.kind == MessageKind.IMAGE && !isRevoked -> {
                                            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                                Box(
                                                    modifier = Modifier
                                                        .fillMaxWidth()
                                                        .height(140.dp)
                                                        .clip(RoundedCornerShape(14.dp))
                                                        .background(
                                                            Brush.linearGradient(
                                                                colors = listOf(Color(0xFF3B28A8), Color(0xFF00B894))
                                                            )
                                                        ),
                                                    contentAlignment = Alignment.Center
                                                ) {
                                                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                                        Icon(
                                                            Icons.Default.Image,
                                                            contentDescription = parsed.body,
                                                            tint = Color.White,
                                                            modifier = Modifier.size(36.dp)
                                                        )
                                                        Text(
                                                            text = parsed.body,
                                                            color = Color.White,
                                                            fontSize = 12.sp,
                                                            fontWeight = FontWeight.Bold
                                                        )
                                                    }
                                                }
                                                Text(
                                                    text = "📷 ${parsed.body}",
                                                    fontSize = 12.sp,
                                                    color = if (isMine) Color.White else colors.text
                                                )
                                            }
                                        }

                                        parsed.kind == MessageKind.PAYMENT && !isRevoked -> {
                                            Box(
                                                modifier = Modifier
                                                    .fillMaxWidth()
                                                    .clip(RoundedCornerShape(12.dp))
                                                    .background(Color.Black.copy(alpha = 0.22f))
                                                    .padding(10.dp)
                                            ) {
                                                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                                    Row(
                                                        modifier = Modifier.fillMaxWidth(),
                                                        horizontalArrangement = Arrangement.SpaceBetween,
                                                        verticalAlignment = Alignment.CenterVertically
                                                    ) {
                                                        Row(
                                                            verticalAlignment = Alignment.CenterVertically,
                                                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                                                        ) {
                                                            Icon(
                                                                Icons.Default.AccountBalanceWallet,
                                                                contentDescription = null,
                                                                tint = ChatteraOnlineGreen,
                                                                modifier = Modifier.size(14.dp)
                                                            )
                                                            Text(
                                                                text = "Chattera Instant Transfer",
                                                                fontSize = 10.sp,
                                                                fontWeight = FontWeight.SemiBold,
                                                                color = Color.White.copy(alpha = 0.9f)
                                                            )
                                                        }
                                                        Text(
                                                            text = parsed.paymentRef ?: "",
                                                            fontSize = 10.sp,
                                                            fontFamily = FontFamily.Monospace,
                                                            color = Color.White.copy(alpha = 0.75f)
                                                        )
                                                    }
                                                    val formattedAmt = NumberFormat.getNumberInstance(Locale.US)
                                                        .format(parsed.amountNaira ?: 0L)
                                                    Text(
                                                        text = "₦$formattedAmt.00",
                                                        fontSize = 18.sp,
                                                        fontWeight = FontWeight.Bold,
                                                        fontFamily = FontFamily.Monospace,
                                                        color = Color.White
                                                    )
                                                    Text(
                                                        text = parsed.body,
                                                        fontSize = 12.sp,
                                                        color = Color.White.copy(alpha = 0.9f)
                                                    )
                                                }
                                            }
                                        }

                                        else -> {
                                            Text(
                                                text = parsed.body,
                                                fontSize = if (isRevoked) 12.sp else 14.sp,
                                                fontStyle = if (isRevoked) FontStyle.Italic else FontStyle.Normal,
                                                color = if (isMine) {
                                                    Color.White.copy(alpha = if (isRevoked) 0.7f else 1f)
                                                } else {
                                                    colors.text.copy(alpha = if (isRevoked) 0.65f else 1f)
                                                }
                                            )
                                        }
                                    }

                                    // Quick Reaction Bar + Reply Action
                                    if (!isRevoked) {
                                        Row(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .padding(top = 2.dp),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                                REACTION_EMOJIS.forEach { emoji ->
                                                    val active = reactions.contains(emoji)
                                                    Text(
                                                        text = emoji,
                                                        fontSize = 12.sp,
                                                        modifier = Modifier
                                                            .clip(RoundedCornerShape(6.dp))
                                                            .background(
                                                                if (active) Color.White.copy(alpha = 0.25f)
                                                                else Color.Transparent
                                                            )
                                                            .clickable { onToggleReaction(msg.id, emoji) }
                                                            .padding(horizontal = 4.dp, vertical = 2.dp)
                                                    )
                                                }
                                            }

                                            Row(
                                                verticalAlignment = Alignment.CenterVertically,
                                                horizontalArrangement = Arrangement.spacedBy(3.dp),
                                                modifier = Modifier.clickable {
                                                    replyingTo = ReplyQuote(
                                                        senderName = if (isMine) "You" else target.name,
                                                        snippet = when (parsed.kind) {
                                                            MessageKind.VOICE -> "🎤 Voice message"
                                                            MessageKind.IMAGE -> "📷 Photo"
                                                            else -> parsed.body
                                                        }
                                                    )
                                                }
                                            ) {
                                                Icon(
                                                    Icons.AutoMirrored.Filled.Reply,
                                                    contentDescription = "Reply",
                                                    tint = if (isMine) Color.White.copy(alpha = 0.8f) else colors.muted,
                                                    modifier = Modifier.size(13.dp)
                                                )
                                                Text(
                                                    text = "Reply",
                                                    fontSize = 10.sp,
                                                    fontWeight = FontWeight.SemiBold,
                                                    color = if (isMine) Color.White.copy(alpha = 0.8f) else colors.muted
                                                )
                                            }
                                        }
                                    }

                                    // Selected Reactions Display
                                    if (reactions.isNotEmpty()) {
                                        Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                            reactions.forEach { em ->
                                                Surface(
                                                    shape = RoundedCornerShape(99.dp),
                                                    color = Color.Black.copy(alpha = 0.2f)
                                                ) {
                                                    Text(
                                                        text = "$em 1",
                                                        fontSize = 11.sp,
                                                        color = if (isMine) Color.White else colors.text,
                                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                                                    )
                                                }
                                            }
                                        }
                                    }

                                    // Message Metadata Footer
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text(
                                            text = "$timeLabel · ${if (msg.deliveryStatus == "verified") "Read" else msg.deliveryStatus}",
                                            fontSize = 10.sp,
                                            color = if (isMine) Color.White.copy(alpha = 0.75f) else colors.muted
                                        )

                                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                            if (xrayMode) {
                                                Text(
                                                    text = if (showPacket) "Hide Info" else "Info",
                                                    fontSize = 10.sp,
                                                    fontWeight = FontWeight.SemiBold,
                                                    color = if (isMine) Color.White else colors.primary,
                                                    modifier = Modifier.clickable {
                                                        expandedFrames[msg.id] = !(expandedFrames[msg.id] ?: false)
                                                    }
                                                )
                                            }
                                            if (!isMine && !isRevoked && msg.deliveryStatus != "verified") {
                                                Row(
                                                    verticalAlignment = Alignment.CenterVertically,
                                                    modifier = Modifier.clickable {
                                                        onAcknowledgeMessage(msg.id, "verified")
                                                    }
                                                ) {
                                                    Icon(
                                                        Icons.Default.DoneAll,
                                                        contentDescription = null,
                                                        tint = colors.primary,
                                                        modifier = Modifier.size(12.dp)
                                                    )
                                                    Text("Mark Read", fontSize = 10.sp, color = colors.primary)
                                                }
                                            }
                                            if (isMine && !isRevoked) {
                                                Row(
                                                    verticalAlignment = Alignment.CenterVertically,
                                                    horizontalArrangement = Arrangement.spacedBy(2.dp),
                                                    modifier = Modifier
                                                        .clickable { onRevokeMessage(msg.id) }
                                                        .testTag("unsend_${msg.id}")
                                                ) {
                                                    Icon(
                                                        Icons.Default.Delete,
                                                        contentDescription = "Unsend",
                                                        tint = Color.White.copy(alpha = 0.8f),
                                                        modifier = Modifier.size(12.dp)
                                                    )
                                                    Text(
                                                        text = "Unsend",
                                                        fontSize = 10.sp,
                                                        color = Color.White.copy(alpha = 0.8f)
                                                    )
                                                }
                                            }
                                        }
                                    }

                                    // Packet Inspector Drawer
                                    if (showPacket) {
                                        Box(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .clip(RoundedCornerShape(10.dp))
                                                .background(Color.Black.copy(alpha = 0.32f))
                                                .padding(8.dp)
                                        ) {
                                            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                                Text(
                                                    text = "Suite: ${msg.algorithm} · IV: ${E2eeEngine.base64ToHex(msg.iv)}",
                                                    fontSize = 9.sp,
                                                    fontFamily = FontFamily.Monospace,
                                                    color = Color(0xFF6EE7B7)
                                                )
                                                Text(
                                                    text = "Ciphertext: ${msg.ciphertext}",
                                                    fontSize = 9.sp,
                                                    fontFamily = FontFamily.Monospace,
                                                    color = Color.White.copy(alpha = 0.85f)
                                                )
                                                Text(
                                                    text = "Sender Key: ${msg.senderKeyFingerprint}",
                                                    fontSize = 9.sp,
                                                    fontFamily = FontFamily.Monospace,
                                                    color = Color.White.copy(alpha = 0.65f)
                                                )
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // 4. Optional Cash Bar, Emoji Picker, Photo Picker, Reply Banner
            if (replyingTo != null) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(colors.softTint)
                        .padding(horizontal = 14.dp, vertical = 8.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "Replying to ${replyingTo?.senderName}",
                            color = colors.primary,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = replyingTo?.snippet ?: "",
                            color = colors.muted,
                            fontSize = 11.sp,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                    IconButton(onClick = { replyingTo = null }, modifier = Modifier.size(28.dp)) {
                        Icon(Icons.Default.Close, contentDescription = "Cancel reply", tint = colors.muted)
                    }
                }
            }

            if (showCashBar) {
                Surface(
                    color = colors.bg,
                    modifier = Modifier
                        .fillMaxWidth()
                        .border(1.dp, colors.border)
                ) {
                    Column(
                        modifier = Modifier.padding(12.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "Send Instant ₦ Transfer to ${target.name}",
                                color = colors.text,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold
                            )
                            IconButton(onClick = { showCashBar = false }, modifier = Modifier.size(24.dp)) {
                                Icon(Icons.Default.Close, contentDescription = "Close", tint = colors.muted)
                            }
                        }
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedTextField(
                                value = cashAmount,
                                onValueChange = { cashAmount = it.filter { ch -> ch.isDigit() } },
                                label = { Text("₦ Amount", fontSize = 11.sp) },
                                singleLine = true,
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier.weight(1f)
                            )
                            OutlinedTextField(
                                value = cashNote,
                                onValueChange = { cashNote = it },
                                label = { Text("Note", fontSize = 11.sp) },
                                singleLine = true,
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier.weight(1.4f)
                            )
                        }
                        Button(
                            onClick = {
                                val amt = cashAmount.toLongOrNull() ?: 0L
                                if (amt > 0) {
                                    onQuickSendCashInChat(amt, cashNote.trim().ifBlank { "Transfer" })
                                    showCashBar = false
                                }
                            },
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = ChatteraOnlineGreen),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text("Send ₦$cashAmount with E2EE Receipt", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                        }
                    }
                }
            }

            if (showEmojiPicker) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(colors.bg)
                        .horizontalScroll(rememberScrollState())
                        .padding(horizontal = 12.dp, vertical = 8.dp),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    QUICK_EMOJIS.forEach { emoji ->
                        Text(
                            text = emoji,
                            fontSize = 20.sp,
                            modifier = Modifier
                                .clickable { draft += emoji }
                                .padding(4.dp)
                        )
                    }
                }
            }

            if (showPhotoPicker) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(colors.bg)
                        .horizontalScroll(rememberScrollState())
                        .padding(horizontal = 12.dp, vertical = 8.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = colors.primary,
                        modifier = Modifier.clickable {
                            photoPickerLauncher.launch(
                                PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)
                            )
                        }
                    ) {
                        Text(
                            text = "📷 Device Gallery",
                            color = Color.White,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp)
                        )
                    }

                    SAMPLE_SHARED_PHOTOS.forEach { (label, tag) ->
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = colors.card,
                            modifier = Modifier
                                .border(1.dp, colors.border, RoundedCornerShape(12.dp))
                                .clickable {
                                    onSendMessage("[IMG:$tag] $label")
                                    showPhotoPicker = false
                                }
                        ) {
                            Text(
                                text = "🖼️ $label",
                                color = colors.text,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.SemiBold,
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp)
                            )
                        }
                    }
                }
            }

            // 5. Composer / Voice Recording Footer
            if (isRecordingVoice) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(colors.card)
                        .padding(horizontal = 12.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(10.dp)
                            .clip(CircleShape)
                            .background(Color.Red)
                    )
                    Text(
                        text = formatAudioSeconds(recordingSeconds),
                        color = Color.Red,
                        fontSize = 12.sp,
                        fontFamily = FontFamily.Monospace,
                        fontWeight = FontWeight.Bold
                    )

                    Row(
                        modifier = Modifier
                            .weight(1f)
                            .height(26.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(3.dp)
                    ) {
                        liveWavePeaks.forEach { p ->
                            Box(
                                modifier = Modifier
                                    .width(3.dp)
                                    .fillMaxHeight((p / 100f).coerceIn(0.2f, 1f))
                                    .clip(RoundedCornerShape(99.dp))
                                    .background(ChatteraPrimary)
                            )
                        }
                    }

                    Text(
                        text = "Cancel",
                        color = colors.muted,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier
                            .clickable { isRecordingVoice = false }
                            .padding(horizontal = 6.dp, vertical = 4.dp)
                    )

                    Button(
                        onClick = {
                            val finalDur = recordingSeconds.coerceAtLeast(2)
                            val peaks = if (collectedPeaks.size >= 6) collectedPeaks.take(24)
                            else listOf(38, 68, 84, 52, 90, 76, 62, 88, 55, 72, 48, 66)
                            isRecordingVoice = false
                            val voiceId = "vn_${System.currentTimeMillis()}"
                            val peaksCsv = peaks.joinToString(",")
                            onSendMessage("[VOICE:$voiceId:$finalDur:$peaksCsv] Voice message (${formatAudioSeconds(finalDur)})")
                        },
                        shape = RoundedCornerShape(14.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = ChatteraOnlineGreen),
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                    ) {
                        Icon(Icons.AutoMirrored.Filled.Send, contentDescription = "Send Voice Note", modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(4.dp))
                        Text("Send", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                }
            } else {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(colors.card)
                        .padding(horizontal = 10.dp, vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    // Quick Composer Action Strip (Emoji, Photo, Disappearing Timer, Cash Transfer)
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            Surface(
                                shape = RoundedCornerShape(10.dp),
                                color = if (showEmojiPicker) colors.softTint else colors.iconBg,
                                modifier = Modifier.clickable { showEmojiPicker = !showEmojiPicker }
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 5.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    Icon(Icons.Default.EmojiEmotions, contentDescription = "Emoji", tint = colors.primary, modifier = Modifier.size(14.dp))
                                    Text("Emoji", fontSize = 10.sp, fontWeight = FontWeight.SemiBold, color = colors.text)
                                }
                            }

                            Surface(
                                shape = RoundedCornerShape(10.dp),
                                color = if (showPhotoPicker) colors.softTint else colors.iconBg,
                                modifier = Modifier.clickable { showPhotoPicker = !showPhotoPicker }
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 5.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    Icon(Icons.Default.Image, contentDescription = "Photo", tint = colors.primary, modifier = Modifier.size(14.dp))
                                    Text("Photo", fontSize = 10.sp, fontWeight = FontWeight.SemiBold, color = colors.text)
                                }
                            }

                            Surface(
                                shape = RoundedCornerShape(10.dp),
                                color = if (stealthSeconds != null) Color(0xFFF59E0B).copy(alpha = 0.2f) else colors.iconBg,
                                modifier = Modifier.clickable {
                                    stealthSeconds = when (stealthSeconds) {
                                        null -> 15
                                        15 -> 60
                                        else -> null
                                    }
                                }
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 5.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    Icon(
                                        Icons.Default.Timer,
                                        contentDescription = "Stealth Timer",
                                        tint = if (stealthSeconds != null) Color(0xFFD97706) else colors.muted,
                                        modifier = Modifier.size(14.dp)
                                    )
                                    Text(
                                        text = if (stealthSeconds != null) "${stealthSeconds}s" else "Timer",
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.SemiBold,
                                        color = if (stealthSeconds != null) Color(0xFFD97706) else colors.text
                                    )
                                }
                            }

                            Surface(
                                shape = RoundedCornerShape(10.dp),
                                color = if (showCashBar) colors.softTint else colors.iconBg,
                                modifier = Modifier
                                    .clickable { showCashBar = !showCashBar }
                                    .testTag("in_chat_cash_button")
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 5.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    Icon(Icons.Default.AccountBalanceWallet, contentDescription = "Send Naira", tint = ChatteraOnlineGreen, modifier = Modifier.size(14.dp))
                                    Text("₦ Pay", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = colors.text)
                                }
                            }
                        }

                        Text(
                            text = "AES-256-GCM",
                            color = colors.muted,
                            fontSize = 9.sp,
                            fontFamily = FontFamily.Monospace
                        )
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        OutlinedTextField(
                            value = draft,
                            onValueChange = { draft = it },
                            placeholder = { Text("Message ${target.name}…", fontSize = 13.sp) },
                            singleLine = true,
                            shape = RoundedCornerShape(18.dp),
                            modifier = Modifier
                                .weight(1f)
                                .testTag("chat_message_input")
                        )

                        IconButton(
                            onClick = {
                                val hasPerm = ContextCompat.checkSelfPermission(
                                    context,
                                    Manifest.permission.RECORD_AUDIO
                                ) == PackageManager.PERMISSION_GRANTED
                                if (hasPerm) {
                                    collectedPeaks.clear()
                                    recordingSeconds = 0
                                    isRecordingVoice = true
                                } else {
                                    audioPermissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
                                }
                            },
                            modifier = Modifier
                                .size(44.dp)
                                .clip(RoundedCornerShape(14.dp))
                                .background(colors.softTint)
                                .testTag("record_voice_button")
                        ) {
                            Icon(
                                Icons.Default.Mic,
                                contentDescription = "Record Voice Note",
                                tint = colors.primary
                            )
                        }

                        IconButton(
                            onClick = {
                                val trimmed = draft.trim()
                                if (trimmed.isNotEmpty()) {
                                    var payload = if (stealthSeconds != null) {
                                        "[STEALTH:${stealthSeconds}s] $trimmed"
                                    } else {
                                        trimmed
                                    }
                                    if (replyingTo != null) {
                                        val cleanSender = replyingTo!!.senderName.replace(Regex("[:\\[\\]]"), "")
                                        val cleanSnippet = replyingTo!!.snippet.take(50).replace(Regex("[:\\[\\]]"), "")
                                        payload = "[REPLY:$cleanSender:$cleanSnippet] $payload"
                                    }
                                    onSendMessage(payload)
                                    draft = ""
                                    replyingTo = null
                                    showEmojiPicker = false
                                }
                            },
                            modifier = Modifier
                                .size(44.dp)
                                .clip(RoundedCornerShape(14.dp))
                                .background(ChatteraPrimary)
                                .testTag("send_message_button")
                        ) {
                            Icon(
                                Icons.AutoMirrored.Filled.Send,
                                contentDescription = "Send Message",
                                tint = Color.White,
                                modifier = Modifier.size(18.dp)
                            )
                        }
                    }
                }
            }
        }
    }
}

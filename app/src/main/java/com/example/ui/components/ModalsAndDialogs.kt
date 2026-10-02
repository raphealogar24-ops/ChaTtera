package com.example.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.CallEnd
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.Key
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.MicOff
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Save
import androidx.compose.material.icons.filled.Upload
import androidx.compose.material.icons.filled.VerifiedUser
import androidx.compose.material.icons.filled.Videocam
import androidx.compose.material.icons.filled.VideocamOff
import androidx.compose.material.icons.filled.VolumeUp
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.example.crypto.E2eeEngine
import com.example.crypto.StoredIdentityKeyVault
import com.example.data.ActiveCallSession
import com.example.data.ContactEntity
import com.example.data.LocalSessionUser
import com.example.data.StoryEntity
import com.example.ui.theme.ChatteraOnlineGreen
import com.example.ui.theme.ChatteraPrimary
import com.example.ui.theme.LocalChatteraColors
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@Composable
fun StoryViewerModal(
    story: StoryEntity,
    onClose: () -> Unit,
    onReplyToStory: (StoryEntity, String) -> Unit
) {
    var progress by remember { mutableFloatStateOf(0.05f) }
    var replyText by remember { mutableStateOf("") }

    LaunchedEffect(story.id) {
        while (progress < 1f) {
            delay(120)
            progress = (progress + 0.025f).coerceAtMost(1f)
        }
    }

    Dialog(
        onDismissRequest = onClose,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth(0.92f)
                .heightIn(min = 480.dp)
                .clip(RoundedCornerShape(28.dp))
                .background(
                    Brush.linearGradient(
                        colors = listOf(Color(story.bgStartHex), Color(story.bgEndHex))
                    )
                )
                .border(1.dp, Color.White.copy(alpha = 0.2f), RoundedCornerShape(28.dp))
                .padding(22.dp)
        ) {
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.SpaceBetween
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                    LinearProgressIndicator(
                        progress = { progress },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(4.dp)
                            .clip(RoundedCornerShape(99.dp)),
                        color = Color.White,
                        trackColor = Color.White.copy(alpha = 0.25f)
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            ChatteraAvatar(
                                name = story.name,
                                colorHex = story.avatarColorHex,
                                size = 44.dp,
                                online = true
                            )
                            Column {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    Text(
                                        text = story.name,
                                        color = Color.White,
                                        fontSize = 14.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                    Icon(
                                        Icons.Default.VerifiedUser,
                                        contentDescription = null,
                                        tint = Color(0xFF6EE7B7),
                                        modifier = Modifier.size(15.dp)
                                    )
                                }
                                Text(
                                    text = "@${story.handle} · ${story.timeAgo}",
                                    color = Color.White.copy(alpha = 0.78f),
                                    fontSize = 11.sp
                                )
                            }
                        }

                        IconButton(
                            onClick = onClose,
                            modifier = Modifier
                                .size(36.dp)
                                .clip(RoundedCornerShape(99.dp))
                                .background(Color.Black.copy(alpha = 0.25f))
                        ) {
                            Icon(Icons.Default.Close, contentDescription = "Close status", tint = Color.White)
                        }
                    }
                }

                Spacer(Modifier.height(48.dp))

                Column(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Text(
                        text = "“${story.text}”",
                        color = Color.White,
                        fontSize = 22.sp,
                        fontWeight = FontWeight.Bold,
                        textAlign = TextAlign.Center
                    )
                    Text(
                        text = "Signed E2EE Status · Key ${story.keyFingerprint.take(19)}…",
                        color = Color.White.copy(alpha = 0.72f),
                        fontSize = 11.sp,
                        fontFamily = FontFamily.Monospace
                    )
                }

                Spacer(Modifier.height(48.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OutlinedTextField(
                        value = replyText,
                        onValueChange = { replyText = it },
                        placeholder = {
                            Text(
                                text = "Reply to ${story.name} with E2EE…",
                                color = Color.White.copy(alpha = 0.7f),
                                fontSize = 12.sp
                            )
                        },
                        singleLine = true,
                        shape = RoundedCornerShape(16.dp),
                        modifier = Modifier.weight(1f)
                    )
                    Button(
                        onClick = {
                            if (replyText.isNotBlank()) {
                                onReplyToStory(story, replyText.trim())
                            }
                        },
                        shape = RoundedCornerShape(16.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color.White,
                            contentColor = Color(0xFF0F172A)
                        )
                    ) {
                        Icon(Icons.AutoMirrored.Filled.Send, contentDescription = null, modifier = Modifier.size(15.dp))
                        Spacer(Modifier.width(4.dp))
                        Text("Send", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                    }
                }
            }
        }
    }
}

@Composable
fun PostStatusModal(
    currentStatus: String,
    onClose: () -> Unit,
    onPublishStatus: (String) -> Unit
) {
    val colors = LocalChatteraColors.current
    var text by remember { mutableStateOf(currentStatus) }

    Dialog(onDismissRequest = onClose) {
        Surface(
            shape = RoundedCornerShape(24.dp),
            color = colors.card,
            modifier = Modifier
                .fillMaxWidth()
                .border(1.dp, colors.border, RoundedCornerShape(24.dp))
        ) {
            Column(
                modifier = Modifier.padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "Publish Cryptographic Status",
                            color = colors.text,
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "Broadcasts in real time to your verified Chattera contacts.",
                            color = colors.muted,
                            fontSize = 11.sp
                        )
                    }
                    IconButton(onClick = onClose, modifier = Modifier.size(32.dp)) {
                        Icon(Icons.Default.Close, contentDescription = "Close", tint = colors.text)
                    }
                }

                OutlinedTextField(
                    value = text,
                    onValueChange = { if (it.length <= 160) text = it },
                    placeholder = { Text("What's happening right now?", fontSize = 13.sp) },
                    minLines = 3,
                    maxLines = 4,
                    shape = RoundedCornerShape(16.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("status_input_field")
                )

                Text(
                    text = "${text.length} / 160",
                    color = colors.muted,
                    fontSize = 11.sp,
                    fontFamily = FontFamily.Monospace,
                    modifier = Modifier.align(Alignment.End)
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = colors.iconBg,
                        modifier = Modifier.clickable { onClose() }
                    ) {
                        Text(
                            text = "Cancel",
                            color = colors.text,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold,
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp)
                        )
                    }
                    Spacer(Modifier.width(8.dp))
                    Button(
                        onClick = {
                            if (text.isNotBlank()) {
                                onPublishStatus(text.trim())
                                onClose()
                            }
                        },
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = ChatteraPrimary),
                        modifier = Modifier.testTag("publish_status_button")
                    ) {
                        Text("Share Status", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                    }
                }
            }
        }
    }
}

@Composable
fun EncryptedCallModal(
    session: ActiveCallSession,
    onEndCall: (String) -> Unit
) {
    var seconds by remember { mutableIntStateOf(0) }
    var muted by remember { mutableStateOf(false) }
    var videoEnabled by remember { mutableStateOf(session.callType == "video") }
    var speakerOn by remember { mutableStateOf(true) }

    LaunchedEffect(Unit) {
        while (true) {
            delay(1000)
            seconds += 1
        }
    }

    val mins = (seconds / 60).toString().padStart(2, '0')
    val secs = (seconds % 60).toString().padStart(2, '0')
    val formattedDuration = "${mins}m ${secs}s"

    Dialog(
        onDismissRequest = { onEndCall(formattedDuration) },
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Surface(
            shape = RoundedCornerShape(28.dp),
            color = Color(0xFF161626),
            modifier = Modifier
                .fillMaxWidth(0.92f)
                .border(1.dp, Color.White.copy(alpha = 0.12f), RoundedCornerShape(28.dp))
        ) {
            Column(
                modifier = Modifier.padding(22.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(20.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Icon(Icons.Default.Lock, contentDescription = null, tint = Color(0xFF34D399), modifier = Modifier.size(15.dp))
                        Text(
                            text = "SRTP / E2EE Call Verified",
                            color = Color(0xFF34D399),
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }
                    Text(
                        text = "$mins:$secs",
                        color = Color.White.copy(alpha = 0.75f),
                        fontSize = 12.sp,
                        fontFamily = FontFamily.Monospace
                    )
                }

                Spacer(Modifier.height(8.dp))

                ChatteraAvatar(
                    name = session.contactName,
                    colorHex = session.avatarColorHex,
                    size = 92.dp,
                    online = true,
                    storyRing = true
                )

                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        text = session.contactName,
                        color = Color.White,
                        fontSize = 22.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "@${session.contactHandle} · ${if (videoEnabled) "Encrypted HD Video Stream" else "Encrypted Voice Stream"}",
                        color = Color.White.copy(alpha = 0.65f),
                        fontSize = 12.sp
                    )
                }

                // Acoustic Waveform
                Row(
                    modifier = Modifier.height(32.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(5.dp)
                ) {
                    listOf(40, 75, 55, 95, 65, 85, 45, 90, 60, 35).forEach { h ->
                        val pct = if (muted) 0.15f else (((h + seconds * 13) % 100).coerceAtLeast(22) / 100f)
                        Box(
                            modifier = Modifier
                                .width(5.dp)
                                .fillMaxHeight(pct)
                                .clip(RoundedCornerShape(99.dp))
                                .background(Color(0xFF6C5CE7))
                        )
                    }
                }

                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(16.dp))
                        .background(Color.Black.copy(alpha = 0.35f))
                        .border(1.dp, Color.White.copy(alpha = 0.1f), RoundedCornerShape(16.dp))
                        .padding(12.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            text = "Short Authentication String (Key Match Verification)",
                            color = Color.White.copy(alpha = 0.6f),
                            fontSize = 11.sp
                        )
                        Text(
                            text = "${session.keyFingerprint.take(19)} · P-256",
                            color = Color(0xFF6EE7B7),
                            fontSize = 12.sp,
                            fontFamily = FontFamily.Monospace,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Surface(
                        shape = RoundedCornerShape(16.dp),
                        color = if (muted) Color(0xFFF59E0B).copy(alpha = 0.25f) else Color.White.copy(alpha = 0.1f),
                        modifier = Modifier
                            .weight(1f)
                            .clickable { muted = !muted }
                    ) {
                        Column(
                            modifier = Modifier.padding(vertical = 10.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Icon(
                                imageVector = if (muted) Icons.Default.MicOff else Icons.Default.Mic,
                                contentDescription = "Mute",
                                tint = Color.White,
                                modifier = Modifier.size(18.dp)
                            )
                            Text(if (muted) "Muted" else "Mute", color = Color.White, fontSize = 11.sp)
                        }
                    }

                    Surface(
                        shape = RoundedCornerShape(16.dp),
                        color = if (videoEnabled) ChatteraPrimary else Color.White.copy(alpha = 0.1f),
                        modifier = Modifier
                            .weight(1f)
                            .clickable { videoEnabled = !videoEnabled }
                    ) {
                        Column(
                            modifier = Modifier.padding(vertical = 10.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Icon(
                                imageVector = if (videoEnabled) Icons.Default.Videocam else Icons.Default.VideocamOff,
                                contentDescription = "Video",
                                tint = Color.White,
                                modifier = Modifier.size(18.dp)
                            )
                            Text("Video", color = Color.White, fontSize = 11.sp)
                        }
                    }

                    Surface(
                        shape = RoundedCornerShape(16.dp),
                        color = if (speakerOn) Color.White.copy(alpha = 0.22f) else Color.White.copy(alpha = 0.1f),
                        modifier = Modifier
                            .weight(1f)
                            .clickable { speakerOn = !speakerOn }
                    ) {
                        Column(
                            modifier = Modifier.padding(vertical = 10.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Icon(
                                imageVector = Icons.Default.VolumeUp,
                                contentDescription = "Speaker",
                                tint = Color.White,
                                modifier = Modifier.size(18.dp)
                            )
                            Text("Speaker", color = Color.White, fontSize = 11.sp)
                        }
                    }

                    Surface(
                        shape = RoundedCornerShape(16.dp),
                        color = Color(0xFFDC2626),
                        modifier = Modifier
                            .weight(1f)
                            .clickable { onEndCall(formattedDuration) }
                            .testTag("end_call_button")
                    ) {
                        Column(
                            modifier = Modifier.padding(vertical = 10.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Icon(
                                imageVector = Icons.Default.CallEnd,
                                contentDescription = "End Call",
                                tint = Color.White,
                                modifier = Modifier.size(18.dp)
                            )
                            Text("End", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun ProfileKeyVaultModal(
    user: LocalSessionUser,
    discoverable: Boolean,
    keyVault: StoredIdentityKeyVault?,
    onClose: () -> Unit,
    onUpdateProfile: (String, String, String, Boolean) -> Unit,
    onRotateKeyPair: () -> Unit,
    onImportKeyVaultJson: suspend (String) -> Result<Unit>,
    onSignOut: () -> Unit
) {
    val colors = LocalChatteraColors.current
    val clipboard = LocalClipboardManager.current
    val scope = rememberCoroutineScope()

    var displayName by remember { mutableStateOf(user.displayName) }
    var handle by remember { mutableStateOf(user.handle) }
    var statusText by remember { mutableStateOf(user.statusText) }
    var isDiscoverable by remember { mutableStateOf(discoverable) }
    var copiedKey by remember { mutableStateOf(false) }
    var showImport by remember { mutableStateOf(false) }
    var importJson by remember { mutableStateOf("") }
    var feedback by remember { mutableStateOf<String?>(null) }

    Dialog(
        onDismissRequest = onClose,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Surface(
            shape = RoundedCornerShape(24.dp),
            color = colors.card,
            modifier = Modifier
                .fillMaxWidth(0.94f)
                .border(1.dp, colors.border, RoundedCornerShape(24.dp))
        ) {
            Column(
                modifier = Modifier
                    .verticalScroll(rememberScrollState())
                    .padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        ChatteraAvatar(
                            name = displayName,
                            colorHex = user.avatarColorHex,
                            size = 46.dp,
                            online = true
                        )
                        Column {
                            Text(
                                text = "Chattera Identity & Key Vault",
                                color = colors.text,
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                text = "Verified Account · ${user.email}",
                                color = colors.muted,
                                fontSize = 11.sp
                            )
                        }
                    }
                    IconButton(onClick = onClose, modifier = Modifier.size(32.dp)) {
                        Icon(Icons.Default.Close, contentDescription = "Close", tint = colors.text)
                    }
                }

                if (feedback != null) {
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = ChatteraOnlineGreen.copy(alpha = 0.15f),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = feedback ?: "",
                            color = ChatteraOnlineGreen,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium,
                            modifier = Modifier.padding(12.dp)
                        )
                    }
                }

                OutlinedTextField(
                    value = displayName,
                    onValueChange = { displayName = it },
                    label = { Text("Display Name", fontSize = 12.sp) },
                    singleLine = true,
                    shape = RoundedCornerShape(14.dp),
                    modifier = Modifier.fillMaxWidth()
                )

                OutlinedTextField(
                    value = handle,
                    onValueChange = { handle = it },
                    label = { Text("Chattera Handle (@username)", fontSize = 12.sp) },
                    singleLine = true,
                    shape = RoundedCornerShape(14.dp),
                    modifier = Modifier.fillMaxWidth()
                )

                OutlinedTextField(
                    value = statusText,
                    onValueChange = { statusText = it },
                    label = { Text("Status Story Text", fontSize = 12.sp) },
                    singleLine = true,
                    shape = RoundedCornerShape(14.dp),
                    modifier = Modifier.fillMaxWidth()
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "Public Key Directory Discovery",
                            color = colors.text,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                        Text(
                            text = "Allow verified contacts to look up your ECDH P-256 public key",
                            color = colors.muted,
                            fontSize = 11.sp
                        )
                    }
                    Surface(
                        shape = RoundedCornerShape(10.dp),
                        color = if (isDiscoverable) colors.softTint else colors.bg,
                        modifier = Modifier
                            .border(1.dp, colors.border, RoundedCornerShape(10.dp))
                            .clickable { isDiscoverable = !isDiscoverable }
                    ) {
                        Text(
                            text = if (isDiscoverable) "Visible" else "Hidden",
                            color = if (isDiscoverable) colors.primary else colors.muted,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                        )
                    }
                }

                Button(
                    onClick = {
                        onUpdateProfile(displayName, handle, statusText, isDiscoverable)
                        feedback = "Your profile settings have been updated."
                    },
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = ChatteraPrimary),
                    modifier = Modifier.align(Alignment.End)
                ) {
                    Icon(Icons.Default.Save, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(6.dp))
                    Text("Save Profile", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                }

                // Active WebCrypto Key Vault Section
                Surface(
                    shape = RoundedCornerShape(18.dp),
                    color = colors.bg,
                    modifier = Modifier
                        .fillMaxWidth()
                        .border(1.dp, colors.border, RoundedCornerShape(18.dp))
                ) {
                    Column(
                        modifier = Modifier.padding(14.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Icon(Icons.Default.Key, contentDescription = null, tint = ChatteraPrimary, modifier = Modifier.size(15.dp))
                                Text(
                                    text = "Active ECDH P-256 Identity Key",
                                    color = colors.text,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                            Text(
                                text = "AES-256-GCM",
                                color = colors.muted,
                                fontSize = 10.sp,
                                fontFamily = FontFamily.Monospace
                            )
                        }

                        Surface(
                            shape = RoundedCornerShape(10.dp),
                            color = colors.card,
                            modifier = Modifier
                                .fillMaxWidth()
                                .border(1.dp, colors.border, RoundedCornerShape(10.dp))
                        ) {
                            Text(
                                text = keyVault?.keyFingerprint ?: "A4F9:19C0:8B2E:771D:3C8A:90E2:55B4:12D8",
                                color = colors.text,
                                fontSize = 11.sp,
                                fontFamily = FontFamily.Monospace,
                                modifier = Modifier.padding(10.dp)
                            )
                        }

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Surface(
                                shape = RoundedCornerShape(10.dp),
                                color = colors.card,
                                modifier = Modifier
                                    .border(1.dp, colors.border, RoundedCornerShape(10.dp))
                                    .clickable {
                                        onRotateKeyPair()
                                        feedback = "New ECDH P-256 keypair generated and published."
                                    }
                                    .testTag("rotate_keypair_button")
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 8.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    Icon(Icons.Default.Refresh, contentDescription = null, tint = colors.text, modifier = Modifier.size(14.dp))
                                    Text("Rotate Key", color = colors.text, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                                }
                            }

                            Surface(
                                shape = RoundedCornerShape(10.dp),
                                color = colors.card,
                                modifier = Modifier
                                    .border(1.dp, colors.border, RoundedCornerShape(10.dp))
                                    .clickable {
                                        keyVault?.let {
                                            clipboard.setText(AnnotatedString(it.toJsonString()))
                                            copiedKey = true
                                            feedback = "Exported ECDH P-256 Key Vault JSON to clipboard."
                                        }
                                    }
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 8.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    Icon(
                                        imageVector = if (copiedKey) Icons.Default.Check else Icons.Default.Download,
                                        contentDescription = null,
                                        tint = if (copiedKey) ChatteraOnlineGreen else colors.text,
                                        modifier = Modifier.size(14.dp)
                                    )
                                    Text(
                                        text = if (copiedKey) "Copied JSON" else "Export JSON",
                                        color = colors.text,
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.SemiBold
                                    )
                                }
                            }

                            Surface(
                                shape = RoundedCornerShape(10.dp),
                                color = colors.card,
                                modifier = Modifier
                                    .border(1.dp, colors.border, RoundedCornerShape(10.dp))
                                    .clickable { showImport = !showImport }
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 8.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    Icon(Icons.Default.Upload, contentDescription = null, tint = colors.text, modifier = Modifier.size(14.dp))
                                    Text("Import", color = colors.text, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                                }
                            }
                        }

                        if (showImport) {
                            OutlinedTextField(
                                value = importJson,
                                onValueChange = { importJson = it },
                                placeholder = { Text("Paste exported key vault JSON…", fontSize = 11.sp) },
                                minLines = 2,
                                maxLines = 4,
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier.fillMaxWidth()
                            )
                            Button(
                                onClick = {
                                    scope.launch {
                                        val res = onImportKeyVaultJson(importJson.trim())
                                        if (res.isSuccess) {
                                            importJson = ""
                                            showImport = false
                                            feedback = "Restored ECDH P-256 key vault from backup."
                                        } else {
                                            feedback = res.exceptionOrNull()?.message ?: "Invalid Key Vault JSON."
                                        }
                                    }
                                },
                                shape = RoundedCornerShape(10.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = ChatteraPrimary)
                            ) {
                                Text("Restore Key Vault", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "UID: ${user.uid}",
                        color = colors.muted,
                        fontSize = 11.sp,
                        fontFamily = FontFamily.Monospace
                    )
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = Color(0xFFEF4444).copy(alpha = 0.1f),
                        modifier = Modifier
                            .border(1.dp, Color(0xFFEF4444).copy(alpha = 0.3f), RoundedCornerShape(12.dp))
                            .clickable { onSignOut() }
                            .testTag("modal_sign_out_button")
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Icon(Icons.AutoMirrored.Filled.Logout, contentDescription = null, tint = Color(0xFFEF4444), modifier = Modifier.size(15.dp))
                            Text("Sign Out", color = Color(0xFFEF4444), fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun SafetyNumberModal(
    myUser: LocalSessionUser,
    myKeyVault: StoredIdentityKeyVault?,
    peerContact: ContactEntity,
    onClose: () -> Unit
) {
    val clipboard = LocalClipboardManager.current
    var copied by remember { mutableStateOf(false) }

    val myFp = myKeyVault?.keyFingerprint ?: "A4F9:19C0:8B2E:771D:3C8A:90E2:55B4:12D8"
    val safetyNumber = remember(myFp, peerContact.keyFingerprint) {
        E2eeEngine.computeSafetyNumber(myFp, peerContact.keyFingerprint)
    }
    val groups = remember(safetyNumber) { safetyNumber.split(" ") }

    Dialog(
        onDismissRequest = onClose,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Surface(
            shape = RoundedCornerShape(20.dp),
            color = Color(0xFF111827),
            modifier = Modifier
                .fillMaxWidth(0.94f)
                .border(1.dp, Color(0xFF1E293B), RoundedCornerShape(20.dp))
        ) {
            Column(
                modifier = Modifier
                    .verticalScroll(rememberScrollState())
                    .padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.Top
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Icon(Icons.Default.VerifiedUser, contentDescription = null, tint = Color(0xFF34D399), modifier = Modifier.size(18.dp))
                            Text(
                                text = "Cryptographic Safety Number",
                                color = Color(0xFFF1F5F9),
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                        Text(
                            text = "Compare these 60 digits out-of-band with ${peerContact.name} to verify zero man-in-the-middle key substitution.",
                            color = Color(0xFF94A3B8),
                            fontSize = 11.sp,
                            modifier = Modifier.padding(top = 4.dp)
                        )
                    }
                    IconButton(onClick = onClose, modifier = Modifier.size(28.dp)) {
                        Icon(Icons.Default.Close, contentDescription = "Close", tint = Color(0xFF94A3B8))
                    }
                }

                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(14.dp))
                        .background(Color(0xFF0B0F17))
                        .border(1.dp, Color(0xFF1E293B), RoundedCornerShape(14.dp))
                        .padding(14.dp)
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "Pairwise SHA-256 Safety Number · ECDH P-256",
                                color = Color(0xFF94A3B8),
                                fontSize = 11.sp
                            )
                            Surface(
                                shape = RoundedCornerShape(8.dp),
                                color = Color(0xFF1E293B),
                                modifier = Modifier.clickable {
                                    clipboard.setText(AnnotatedString(safetyNumber))
                                    copied = true
                                }
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    Icon(
                                        imageVector = if (copied) Icons.Default.Check else Icons.Default.ContentCopy,
                                        contentDescription = null,
                                        tint = if (copied) Color(0xFF34D399) else Color.White,
                                        modifier = Modifier.size(12.dp)
                                    )
                                    Text(
                                        text = if (copied) "Copied" else "Copy",
                                        color = Color.White,
                                        fontSize = 11.sp
                                    )
                                }
                            }
                        }

                        // 3 rows of 4 groups = 12 groups of 5 digits
                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            groups.chunked(4).forEach { rowGroups ->
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    rowGroups.forEach { grp ->
                                        Box(
                                            modifier = Modifier
                                                .weight(1f)
                                                .clip(RoundedCornerShape(8.dp))
                                                .background(Color(0xFF111827))
                                                .border(1.dp, Color(0xFF1E293B), RoundedCornerShape(8.dp))
                                                .padding(vertical = 6.dp),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            Text(
                                                text = grp,
                                                color = Color(0xFF6EE7B7),
                                                fontSize = 13.sp,
                                                fontFamily = FontFamily.Monospace,
                                                fontWeight = FontWeight.Bold
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                // Local & Peer Identity Keys
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(Color(0xFF0B0F17))
                        .border(1.dp, Color(0xFF1E293B), RoundedCornerShape(12.dp))
                        .padding(12.dp)
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text(
                            text = "Local Identity Key (${myUser.displayName} · @${myUser.handle})",
                            color = Color(0xFFE2E8F0),
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                        Text(
                            text = myFp,
                            color = Color(0xFFCBD5E1),
                            fontSize = 11.sp,
                            fontFamily = FontFamily.Monospace
                        )
                    }
                }

                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(Color(0xFF0B0F17))
                        .border(1.dp, Color(0xFF1E293B), RoundedCornerShape(12.dp))
                        .padding(12.dp)
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text(
                            text = "Peer Identity Key (${peerContact.name} · @${peerContact.handle})",
                            color = Color(0xFFE2E8F0),
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                        Text(
                            text = peerContact.keyFingerprint,
                            color = Color(0xFFCBD5E1),
                            fontSize = 11.sp,
                            fontFamily = FontFamily.Monospace
                        )
                    }
                }

                Button(
                    onClick = onClose,
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color(0xFF34D399),
                        contentColor = Color(0xFF020617)
                    ),
                    modifier = Modifier.align(Alignment.End)
                ) {
                    Text("Done Verifying", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                }
            }
        }
    }
}

@Composable
fun NewChatPickerModal(
    contacts: List<ContactEntity>,
    onSelectContact: (ContactEntity) -> Unit,
    onClose: () -> Unit
) {
    val colors = LocalChatteraColors.current
    Dialog(onDismissRequest = onClose) {
        Surface(
            shape = RoundedCornerShape(24.dp),
            color = colors.card,
            modifier = Modifier
                .fillMaxWidth()
                .border(1.dp, colors.border, RoundedCornerShape(24.dp))
        ) {
            Column(
                modifier = Modifier.padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "Start a Conversation",
                            color = colors.text,
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "Choose a contact to message in real time.",
                            color = colors.muted,
                            fontSize = 11.sp
                        )
                    }
                    Surface(
                        shape = RoundedCornerShape(10.dp),
                        color = colors.iconBg,
                        modifier = Modifier.clickable { onClose() }
                    ) {
                        Text(
                            text = "Close",
                            color = colors.text,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold,
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                        )
                    }
                }

                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    contacts.forEach { c ->
                        Surface(
                            shape = RoundedCornerShape(16.dp),
                            color = colors.bg,
                            modifier = Modifier
                                .fillMaxWidth()
                                .border(1.dp, colors.border, RoundedCornerShape(16.dp))
                                .clickable {
                                    onSelectContact(c)
                                    onClose()
                                }
                        ) {
                            Row(
                                modifier = Modifier.padding(12.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                ChatteraAvatar(
                                    name = c.name,
                                    colorHex = c.avatarColorHex,
                                    size = 42.dp,
                                    online = c.online
                                )
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = c.name,
                                        color = colors.text,
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                    Text(
                                        text = "@${c.handle} · ${if (c.online) "Active now" else "Offline"}",
                                        color = colors.muted,
                                        fontSize = 11.sp
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

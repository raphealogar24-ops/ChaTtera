package com.example.ui.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.DarkMode
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.LightMode
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.PersonAdd
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CheckboxDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.LocalSessionUser
import com.example.ui.AuthStage
import com.example.ui.theme.ChatteraOnlineGreen
import com.example.ui.theme.ChatteraPrimary
import com.example.ui.theme.LocalChatteraColors
import kotlinx.coroutines.delay

private val AVATAR_COLOR_OPTIONS = listOf(
    0xFF5B4BDBL,
    0xFFE17055L,
    0xFF00B894L,
    0xFFFD79A8L,
    0xFF0984E3L,
    0xFF6C5CE7L
)

@Composable
fun ChatteraAuthView(
    stage: AuthStage,
    onStageChange: (AuthStage) -> Unit,
    recentAccounts: List<LocalSessionUser>,
    onQuickSignIn: (LocalSessionUser) -> Unit,
    darkMode: Boolean,
    onToggleDarkMode: () -> Unit,
    modifier: Modifier = Modifier
) {
    val colors = LocalChatteraColors.current

    // Login state
    var loginIdentifier by remember { mutableStateOf("rapheal@chattera.app") }
    var loginPassword by remember { mutableStateOf("••••••••••••") }
    var showLoginPassword by remember { mutableStateOf(false) }
    var rememberMe by remember { mutableStateOf(true) }
    var formFeedback by remember { mutableStateOf<String?>(null) }

    // Signup state
    var firstName by remember { mutableStateOf("") }
    var lastName by remember { mutableStateOf("") }
    var signupHandle by remember { mutableStateOf("") }
    var signupEmail by remember { mutableStateOf("") }
    var signupPassword by remember { mutableStateOf("") }
    var showSignupPassword by remember { mutableStateOf(false) }
    var signupBio by remember { mutableStateOf("Hey there! I am using Chattera.") }
    var selectedAvatarColor by remember { mutableLongStateOf(AVATAR_COLOR_OPTIONS.first()) }

    // Forgot password state
    var recoveryEmail by remember { mutableStateOf("") }
    var recoverySent by remember { mutableStateOf(false) }

    if (stage == AuthStage.INTRO) {
        var progress by remember { mutableFloatStateOf(0.15f) }
        val animatedProgress by animateFloatAsState(targetValue = progress, label = "intro_progress")

        LaunchedEffect(Unit) {
            repeat(5) {
                delay(280)
                progress = (progress + 0.18f).coerceAtMost(1f)
            }
            delay(400)
            onStageChange(AuthStage.LOGIN)
        }

        Column(
            modifier = modifier
                .fillMaxSize()
                .background(colors.bg)
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.End
            ) {
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = colors.card,
                    modifier = Modifier
                        .border(1.dp, colors.border, RoundedCornerShape(12.dp))
                        .clickable { onStageChange(AuthStage.LOGIN) }
                        .testTag("skip_intro_button")
                ) {
                    Text(
                        text = "Skip Intro →",
                        color = colors.muted,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp)
                    )
                }
            }

            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(18.dp)
            ) {
                ChatteraLogo(size = 104.dp)

                Text(
                    text = "Chattera",
                    color = colors.text,
                    fontSize = 38.sp,
                    fontWeight = FontWeight.ExtraBold
                )

                Text(
                    text = "Connect · Voice Notes · Real-Time Chat · Instant Wallet",
                    color = colors.muted,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Medium,
                    textAlign = TextAlign.Center
                )

                LinearProgressIndicator(
                    progress = { animatedProgress },
                    modifier = Modifier
                        .width(220.dp)
                        .height(6.dp)
                        .clip(RoundedCornerShape(99.dp)),
                    color = ChatteraPrimary,
                    trackColor = colors.border
                )

                Row(
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier.padding(top = 8.dp)
                ) {
                    Button(
                        onClick = { onStageChange(AuthStage.LOGIN) },
                        shape = RoundedCornerShape(16.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = ChatteraPrimary),
                        modifier = Modifier.testTag("intro_login_button")
                    ) {
                        Text("Log In", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                        Spacer(Modifier.width(6.dp))
                        Icon(Icons.AutoMirrored.Filled.ArrowForward, contentDescription = null, modifier = Modifier.size(16.dp))
                    }

                    Surface(
                        shape = RoundedCornerShape(16.dp),
                        color = colors.card,
                        modifier = Modifier
                            .border(1.dp, colors.border, RoundedCornerShape(16.dp))
                            .clickable { onStageChange(AuthStage.SIGNUP) }
                            .testTag("intro_signup_button")
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 20.dp, vertical = 10.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Icon(
                                Icons.Default.PersonAdd,
                                contentDescription = null,
                                tint = ChatteraOnlineGreen,
                                modifier = Modifier.size(16.dp)
                            )
                            Text(
                                text = "Sign Up",
                                color = colors.text,
                                fontWeight = FontWeight.Bold,
                                fontSize = 13.sp
                            )
                        }
                    }
                }
            }

            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    text = "FROM",
                    color = colors.muted,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.SemiBold,
                    letterSpacing = 1.5.sp
                )
                Text(
                    text = "Chattera Social · E2EE",
                    color = colors.text,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold
                )
            }
        }
        return
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(colors.bg)
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // Top Header Bar
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .widthIn(max = 600.dp)
                .padding(vertical = 8.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                modifier = Modifier.clickable { onStageChange(AuthStage.INTRO) }
            ) {
                ChatteraLogo(size = 40.dp)
                Column {
                    Text(
                        text = "Chattera",
                        color = colors.text,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.ExtraBold
                    )
                    Text(
                        text = "Connect & Chat in Real Time",
                        color = colors.muted,
                        fontSize = 11.sp
                    )
                }
            }

            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = colors.card,
                    modifier = Modifier
                        .border(1.dp, colors.border, RoundedCornerShape(12.dp))
                        .clickable { onStageChange(AuthStage.INTRO) }
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Icon(
                            Icons.Default.PlayArrow,
                            contentDescription = "Intro Logo",
                            tint = ChatteraPrimary,
                            modifier = Modifier.size(16.dp)
                        )
                        Text("Intro", color = colors.muted, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                    }
                }

                IconButton(
                    onClick = onToggleDarkMode,
                    modifier = Modifier
                        .size(40.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(colors.card)
                        .border(1.dp, colors.border, RoundedCornerShape(12.dp))
                        .testTag("auth_theme_toggle")
                ) {
                    Icon(
                        imageVector = if (darkMode) Icons.Default.LightMode else Icons.Default.DarkMode,
                        contentDescription = "Toggle theme",
                        tint = colors.text,
                        modifier = Modifier.size(18.dp)
                    )
                }
            }
        }

        Spacer(Modifier.height(12.dp))

        // Recent Logins Section
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .widthIn(max = 600.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Text(
                text = "Recent logins",
                color = colors.text,
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = "Tap your profile to go straight to your Home Page, or create a new account.",
                color = colors.muted,
                fontSize = 12.sp
            )

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                recentAccounts.take(3).forEach { acc ->
                    Surface(
                        shape = RoundedCornerShape(20.dp),
                        color = colors.card,
                        modifier = Modifier
                            .width(126.dp)
                            .border(1.dp, colors.border, RoundedCornerShape(20.dp))
                            .clickable { onQuickSignIn(acc) }
                            .testTag("recent_account_${acc.handle}")
                    ) {
                        Column(
                            modifier = Modifier.padding(12.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            ChatteraAvatar(
                                name = acc.displayName,
                                colorHex = acc.avatarColorHex,
                                size = 50.dp,
                                online = true
                            )
                            Text(
                                text = acc.displayName,
                                color = colors.text,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                            Text(
                                text = "@${acc.handle}",
                                color = colors.muted,
                                fontSize = 10.sp,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(10.dp))
                                    .background(colors.softTint)
                                    .padding(vertical = 4.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = "Open Home",
                                    color = colors.primary,
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                    }
                }

                // Add Account Card
                Surface(
                    shape = RoundedCornerShape(20.dp),
                    color = colors.card,
                    modifier = Modifier
                        .width(120.dp)
                        .border(1.dp, colors.border, RoundedCornerShape(20.dp))
                        .clickable {
                            formFeedback = null
                            onStageChange(AuthStage.SIGNUP)
                        }
                        .testTag("add_account_card")
                ) {
                    Column(
                        modifier = Modifier.padding(12.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(50.dp)
                                .clip(CircleShape)
                                .background(colors.softTint),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(Icons.Default.Add, contentDescription = "Add Account", tint = colors.primary)
                        }
                        Text(
                            text = "Add Account",
                            color = colors.primary,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "Create profile",
                            color = colors.muted,
                            fontSize = 10.sp
                        )
                    }
                }
            }
        }

        Spacer(Modifier.height(18.dp))

        // Main Auth Form Card
        Surface(
            shape = RoundedCornerShape(24.dp),
            color = colors.card,
            modifier = Modifier
                .fillMaxWidth()
                .widthIn(max = 600.dp)
                .border(1.dp, colors.border, RoundedCornerShape(24.dp))
        ) {
            Column(
                modifier = Modifier.padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                // Switcher Tabs: Log In | Sign Up
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(14.dp))
                        .background(colors.bg)
                        .border(1.dp, colors.border, RoundedCornerShape(14.dp))
                        .padding(4.dp)
                ) {
                    val isLogin = stage == AuthStage.LOGIN
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(10.dp))
                            .background(if (isLogin) colors.card else Color.Transparent)
                            .clickable {
                                formFeedback = null
                                onStageChange(AuthStage.LOGIN)
                            }
                            .padding(vertical = 10.dp)
                            .testTag("tab_login"),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "Log In",
                            color = if (isLogin) colors.primary else colors.muted,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }

                    val isSignup = stage == AuthStage.SIGNUP
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(10.dp))
                            .background(if (isSignup) colors.card else Color.Transparent)
                            .clickable {
                                formFeedback = null
                                onStageChange(AuthStage.SIGNUP)
                            }
                            .padding(vertical = 10.dp)
                            .testTag("tab_signup"),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "Sign Up",
                            color = if (isSignup) colors.primary else colors.muted,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }

                if (formFeedback != null) {
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = Color(0xFFF59E0B).copy(alpha = 0.15f),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = formFeedback ?: "",
                            color = Color(0xFFD97706),
                            fontSize = 12.sp,
                            modifier = Modifier.padding(12.dp)
                        )
                    }
                }

                when (stage) {
                    AuthStage.LOGIN, AuthStage.INTRO -> {
                        Text(
                            text = "Log in to Chattera",
                            color = colors.text,
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Bold
                        )
                        OutlinedTextField(
                            value = loginIdentifier,
                            onValueChange = { loginIdentifier = it },
                            label = { Text("Email address, phone, or @username", fontSize = 12.sp) },
                            leadingIcon = { Icon(Icons.Default.Email, contentDescription = null) },
                            singleLine = true,
                            shape = RoundedCornerShape(16.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .testTag("login_identifier_input")
                        )

                        OutlinedTextField(
                            value = loginPassword,
                            onValueChange = { loginPassword = it },
                            label = { Text("Password", fontSize = 12.sp) },
                            leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null) },
                            trailingIcon = {
                                IconButton(onClick = { showLoginPassword = !showLoginPassword }) {
                                    Icon(
                                        imageVector = if (showLoginPassword) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                                        contentDescription = "Toggle password visibility"
                                    )
                                }
                            },
                            visualTransformation = if (showLoginPassword) VisualTransformation.None else PasswordVisualTransformation(),
                            singleLine = true,
                            shape = RoundedCornerShape(16.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .testTag("login_password_input")
                        )

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Checkbox(
                                    checked = rememberMe,
                                    onCheckedChange = { rememberMe = it },
                                    colors = CheckboxDefaults.colors(checkedColor = ChatteraPrimary)
                                )
                                Text("Keep me logged in", color = colors.muted, fontSize = 12.sp)
                            }
                            TextButton(onClick = {
                                recoverySent = false
                                onStageChange(AuthStage.FORGOT)
                            }) {
                                Text("Forgotten password?", color = colors.primary, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                            }
                        }

                        Button(
                            onClick = {
                                val rawId = loginIdentifier.trim().lowercase()
                                if (rawId.isBlank()) {
                                    formFeedback = "Please enter your email, phone number, or @username."
                                    return@Button
                                }
                                val matched = recentAccounts.find {
                                    it.email.lowercase() == rawId ||
                                        it.handle.lowercase() == rawId.removePrefix("@") ||
                                        it.displayName.lowercase() == rawId
                                }
                                if (matched != null) {
                                    onQuickSignIn(matched)
                                } else {
                                    val baseHandle = rawId.substringBefore("@")
                                        .replace(Regex("[^a-z0-9_]"), "_")
                                        .trim('_')
                                        .ifBlank { "chattera_user" }
                                    val formattedName = baseHandle.split("_")
                                        .joinToString(" ") { part -> part.replaceFirstChar { it.uppercase() } }
                                    onQuickSignIn(
                                        LocalSessionUser(
                                            uid = "user_$baseHandle",
                                            displayName = formattedName,
                                            handle = baseHandle,
                                            email = if (rawId.contains("@")) rawId else "$baseHandle@chattera.app",
                                            avatarColorHex = AVATAR_COLOR_OPTIONS.first()
                                        )
                                    )
                                }
                            },
                            shape = RoundedCornerShape(16.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = ChatteraPrimary),
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(48.dp)
                                .testTag("login_submit_button")
                        ) {
                            Text("Log In", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                            Spacer(Modifier.width(8.dp))
                            Icon(Icons.AutoMirrored.Filled.ArrowForward, contentDescription = null, modifier = Modifier.size(16.dp))
                        }
                    }

                    AuthStage.SIGNUP -> {
                        Text(
                            text = "Create a new account",
                            color = colors.text,
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            OutlinedTextField(
                                value = firstName,
                                onValueChange = { firstName = it },
                                label = { Text("First name", fontSize = 12.sp) },
                                singleLine = true,
                                shape = RoundedCornerShape(14.dp),
                                modifier = Modifier.weight(1f)
                            )
                            OutlinedTextField(
                                value = lastName,
                                onValueChange = { lastName = it },
                                label = { Text("Surname", fontSize = 12.sp) },
                                singleLine = true,
                                shape = RoundedCornerShape(14.dp),
                                modifier = Modifier.weight(1f)
                            )
                        }

                        OutlinedTextField(
                            value = signupHandle,
                            onValueChange = { signupHandle = it },
                            label = { Text("Username (@handle)", fontSize = 12.sp) },
                            singleLine = true,
                            shape = RoundedCornerShape(14.dp),
                            modifier = Modifier.fillMaxWidth()
                        )

                        OutlinedTextField(
                            value = signupEmail,
                            onValueChange = { signupEmail = it },
                            label = { Text("Mobile number or email", fontSize = 12.sp) },
                            singleLine = true,
                            shape = RoundedCornerShape(14.dp),
                            modifier = Modifier.fillMaxWidth()
                        )

                        OutlinedTextField(
                            value = signupPassword,
                            onValueChange = { signupPassword = it },
                            label = { Text("New password", fontSize = 12.sp) },
                            trailingIcon = {
                                IconButton(onClick = { showSignupPassword = !showSignupPassword }) {
                                    Icon(
                                        imageVector = if (showSignupPassword) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                                        contentDescription = "Toggle password"
                                    )
                                }
                            },
                            visualTransformation = if (showSignupPassword) VisualTransformation.None else PasswordVisualTransformation(),
                            singleLine = true,
                            shape = RoundedCornerShape(14.dp),
                            modifier = Modifier.fillMaxWidth()
                        )

                        Text("Choose your profile badge color", color = colors.muted, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            AVATAR_COLOR_OPTIONS.forEach { hex ->
                                val isSel = selectedAvatarColor == hex
                                Box(
                                    modifier = Modifier
                                        .size(36.dp)
                                        .clip(CircleShape)
                                        .background(Color(hex))
                                        .border(
                                            width = if (isSel) 3.dp else 0.dp,
                                            color = if (isSel) ChatteraOnlineGreen else Color.Transparent,
                                            shape = CircleShape
                                        )
                                        .clickable { selectedAvatarColor = hex }
                                )
                            }
                        }

                        OutlinedTextField(
                            value = signupBio,
                            onValueChange = { signupBio = it },
                            label = { Text("Status / Bio", fontSize = 12.sp) },
                            singleLine = true,
                            shape = RoundedCornerShape(14.dp),
                            modifier = Modifier.fillMaxWidth()
                        )

                        Button(
                            onClick = {
                                val fullName = "${firstName.trim()} ${lastName.trim()}".trim()
                                if (fullName.isBlank()) {
                                    formFeedback = "Please enter your first and last name."
                                    return@Button
                                }
                                val rawHandle = signupHandle.trim().ifBlank {
                                    "${firstName.trim()}_${lastName.trim()}".lowercase()
                                }
                                val cleanHandle = rawHandle.lowercase()
                                    .removePrefix("@")
                                    .replace(Regex("[^a-z0-9_]"), "_")
                                    .trim('_')
                                    .ifBlank { "user_${System.currentTimeMillis() % 10000}" }
                                val cleanEmail = signupEmail.trim().ifBlank { "$cleanHandle@chattera.app" }

                                onQuickSignIn(
                                    LocalSessionUser(
                                        uid = "user_$cleanHandle",
                                        displayName = fullName,
                                        handle = cleanHandle,
                                        email = cleanEmail,
                                        avatarColorHex = selectedAvatarColor,
                                        statusText = signupBio.trim().ifBlank { "Hey there! I am using Chattera." }
                                    )
                                )
                            },
                            shape = RoundedCornerShape(16.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = ChatteraOnlineGreen),
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(48.dp)
                                .testTag("signup_submit_button")
                        ) {
                            Icon(Icons.Default.PersonAdd, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(Modifier.width(8.dp))
                            Text("Sign Up & Go to Home", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        }
                    }

                    AuthStage.FORGOT -> {
                        Text(
                            text = "Find Your Account",
                            color = colors.text,
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "Enter your email address or mobile number to reset your password.",
                            color = colors.muted,
                            fontSize = 12.sp
                        )
                        if (recoverySent) {
                            Surface(
                                shape = RoundedCornerShape(16.dp),
                                color = ChatteraOnlineGreen.copy(alpha = 0.15f),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Row(
                                    modifier = Modifier.padding(14.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    Icon(Icons.Default.CheckCircle, contentDescription = null, tint = ChatteraOnlineGreen)
                                    Text(
                                        text = "Password recovery link sent to ${recoveryEmail.ifBlank { loginIdentifier }}!",
                                        color = colors.text,
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Medium
                                    )
                                }
                            }
                        } else {
                            OutlinedTextField(
                                value = recoveryEmail,
                                onValueChange = { recoveryEmail = it },
                                label = { Text("Email address or mobile number", fontSize = 12.sp) },
                                singleLine = true,
                                shape = RoundedCornerShape(14.dp),
                                modifier = Modifier.fillMaxWidth()
                            )
                            Button(
                                onClick = { recoverySent = true },
                                shape = RoundedCornerShape(14.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = ChatteraPrimary),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text("Send Reset Link", fontWeight = FontWeight.Bold)
                            }
                        }

                        TextButton(
                            onClick = { onStageChange(AuthStage.LOGIN) },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text("Back to Log In", color = colors.primary, fontWeight = FontWeight.SemiBold)
                        }
                    }
                }
            }
        }
    }
}

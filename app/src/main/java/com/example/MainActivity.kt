package com.example

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.CallMade
import androidx.compose.material.icons.automirrored.filled.CallMissed
import androidx.compose.material.icons.automirrored.filled.CallReceived
import androidx.compose.material.icons.automirrored.filled.Chat
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.AccountBalanceWallet
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Call
import androidx.compose.material.icons.filled.DarkMode
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Key
import androidx.compose.material.icons.filled.LightMode
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.People
import androidx.compose.material.icons.filled.RadioButtonChecked
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material.icons.filled.Videocam
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.data.SeedData
import com.example.ui.AuthStage
import com.example.ui.ChatteraNavTab
import com.example.ui.ChatteraViewModel
import com.example.ui.components.ChatteraAuthView
import com.example.ui.components.ChatteraAvatar
import com.example.ui.components.ChatteraChatThreadScreen
import com.example.ui.components.ChatteraLogo
import com.example.ui.components.ChatteraWalletView
import com.example.ui.components.EncryptedCallModal
import com.example.ui.components.NewChatPickerModal
import com.example.ui.components.PostStatusModal
import com.example.ui.components.ProfileKeyVaultModal
import com.example.ui.components.SafetyNumberModal
import com.example.ui.components.SecurityAuditView
import com.example.ui.components.StoryViewerModal
import com.example.ui.theme.ChatteraOnlineGreen
import com.example.ui.theme.ChatteraPrimary
import com.example.ui.theme.ChatteraTheme
import com.example.ui.theme.LocalChatteraColors

class MainActivity : ComponentActivity() {
    private val viewModel: ChatteraViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            val darkMode by viewModel.darkMode.collectAsStateWithLifecycle()
            ChatteraTheme(darkTheme = darkMode) {
                MainChatteraApp(viewModel = viewModel)
            }
        }
    }
}

@Composable
fun MainChatteraApp(viewModel: ChatteraViewModel) {
    val colors = LocalChatteraColors.current
    val darkMode by viewModel.darkMode.collectAsStateWithLifecycle()
    val isLoggedOut by viewModel.isLoggedOut.collectAsStateWithLifecycle()
    val authStage by viewModel.authStage.collectAsStateWithLifecycle()
    val localUser by viewModel.localUser.collectAsStateWithLifecycle()
    val recentAccounts by viewModel.recentAccounts.collectAsStateWithLifecycle()
    val discoverable by viewModel.discoverable.collectAsStateWithLifecycle()
    val navTab by viewModel.navTab.collectAsStateWithLifecycle()
    val searchQuery by viewModel.searchQuery.collectAsStateWithLifecycle()
    val mobileChatOpen by viewModel.mobileChatOpen.collectAsStateWithLifecycle()
    val selectedContactId by viewModel.selectedContactId.collectAsStateWithLifecycle()

    val contacts by viewModel.contacts.collectAsStateWithLifecycle()
    val allMessages by viewModel.allMessages.collectAsStateWithLifecycle()
    val callLogs by viewModel.callLogs.collectAsStateWithLifecycle()
    val walletBalance by viewModel.walletBalance.collectAsStateWithLifecycle()
    val walletTransactions by viewModel.walletTransactions.collectAsStateWithLifecycle()
    val stories by viewModel.stories.collectAsStateWithLifecycle()
    val peerActivities by viewModel.peerActivities.collectAsStateWithLifecycle()
    val keyVault by viewModel.keyVault.collectAsStateWithLifecycle()
    val benchResult by viewModel.benchResult.collectAsStateWithLifecycle()

    val activeStory by viewModel.activeStory.collectAsStateWithLifecycle()
    val postStatusOpen by viewModel.postStatusOpen.collectAsStateWithLifecycle()
    val activeCall by viewModel.activeCall.collectAsStateWithLifecycle()
    val profileModalOpen by viewModel.profileModalOpen.collectAsStateWithLifecycle()
    val safetyModalOpen by viewModel.safetyModalOpen.collectAsStateWithLifecycle()
    val newChatPickerOpen by viewModel.newChatPickerOpen.collectAsStateWithLifecycle()
    val notificationsOpen by viewModel.notificationsOpen.collectAsStateWithLifecycle()

    // Handle system Back navigation on secondary tabs or mobile chat view
    BackHandler(enabled = !isLoggedOut && (mobileChatOpen || navTab != ChatteraNavTab.HOME)) {
        if (mobileChatOpen) {
            viewModel.setMobileChatOpen(false)
            if (navTab == ChatteraNavTab.CHATS) {
                viewModel.setNavTab(ChatteraNavTab.HOME)
            }
        } else {
            viewModel.setNavTab(ChatteraNavTab.HOME)
        }
    }

    if (isLoggedOut) {
        Scaffold(
            modifier = Modifier.fillMaxSize(),
            contentWindowInsets = WindowInsets.safeDrawing,
            containerColor = colors.bg
        ) { innerPadding ->
            ChatteraAuthView(
                stage = authStage,
                onStageChange = viewModel::setAuthStage,
                recentAccounts = recentAccounts,
                onQuickSignIn = viewModel::signInWithAccount,
                darkMode = darkMode,
                onToggleDarkMode = viewModel::toggleDarkMode,
                modifier = Modifier.padding(innerPadding)
            )
        }
        return
    }

    val selectedTarget = remember(contacts, selectedContactId) {
        contacts.find { it.id == selectedContactId }
            ?: contacts.firstOrNull()
            ?: SeedData.SEED_CONTACTS.first()
    }

    val activeMessages = remember(allMessages, selectedTarget.id) {
        allMessages.filter { it.conversationId == selectedTarget.id }
    }

    val filteredContacts = remember(contacts, searchQuery) {
        val q = searchQuery.trim().lowercase()
        if (q.isEmpty()) contacts
        else contacts.filter {
            it.name.lowercase().contains(q) ||
                it.handle.lowercase().contains(q) ||
                it.initialMessage.lowercase().contains(q)
        }
    }

    val totalUnread = remember(contacts) {
        contacts.sumOf { it.unreadCount }
    }

    val displayFirstName = remember(localUser.displayName) {
        localUser.displayName.substringBefore(" ").ifBlank { "Rapheal" }
    }

    Scaffold(
        modifier = Modifier.fillMaxSize(),
        contentWindowInsets = WindowInsets.safeDrawing,
        containerColor = colors.bg,
        topBar = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(colors.card)
                    .border(1.dp, colors.border)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 14.dp, vertical = 10.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Brand Identity
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                        modifier = Modifier.clickable {
                            viewModel.setNavTab(ChatteraNavTab.HOME)
                            viewModel.setMobileChatOpen(false)
                        }
                    ) {
                        ChatteraLogo(size = 38.dp)
                        Column {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Text(
                                    text = "Chattera",
                                    color = colors.text,
                                    fontSize = 17.sp,
                                    fontWeight = FontWeight.ExtraBold
                                )
                                Surface(
                                    shape = RoundedCornerShape(99.dp),
                                    color = ChatteraOnlineGreen.copy(alpha = 0.15f)
                                ) {
                                    Row(
                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                                    ) {
                                        Box(
                                            modifier = Modifier
                                                .size(6.dp)
                                                .clip(CircleShape)
                                                .background(ChatteraOnlineGreen)
                                        )
                                        Text(
                                            text = "Live",
                                            color = ChatteraOnlineGreen,
                                            fontSize = 10.sp,
                                            fontWeight = FontWeight.Bold
                                        )
                                    }
                                }
                            }
                            Text(
                                text = "E2EE Messenger & Voice Chat",
                                color = colors.muted,
                                fontSize = 10.sp
                            )
                        }
                    }

                    // Right Actions: Safety Number, Theme, Notifications, Profile, Log Out
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        IconButton(
                            onClick = { viewModel.setSafetyModalOpen(true) },
                            modifier = Modifier
                                .size(38.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .background(colors.iconBg)
                                .testTag("header_safety_button")
                        ) {
                            Icon(
                                Icons.Default.Key,
                                contentDescription = "Verify Safety Number",
                                tint = colors.primary,
                                modifier = Modifier.size(18.dp)
                            )
                        }

                        IconButton(
                            onClick = viewModel::toggleDarkMode,
                            modifier = Modifier
                                .size(38.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .background(colors.iconBg)
                                .testTag("header_theme_button")
                        ) {
                            Icon(
                                imageVector = if (darkMode) Icons.Default.LightMode else Icons.Default.DarkMode,
                                contentDescription = "Toggle theme",
                                tint = colors.text,
                                modifier = Modifier.size(18.dp)
                            )
                        }

                        Box {
                            IconButton(
                                onClick = { viewModel.setNotificationsOpen(!notificationsOpen) },
                                modifier = Modifier
                                    .size(38.dp)
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(colors.iconBg)
                                    .testTag("header_notifications_button")
                            ) {
                                Icon(
                                    Icons.Default.Notifications,
                                    contentDescription = "Notifications",
                                    tint = colors.text,
                                    modifier = Modifier.size(18.dp)
                                )
                            }
                            if (totalUnread > 0) {
                                Box(
                                    modifier = Modifier
                                        .align(Alignment.TopEnd)
                                        .size(9.dp)
                                        .clip(CircleShape)
                                        .background(ChatteraOnlineGreen)
                                )
                            }
                        }

                        Box(
                            modifier = Modifier
                                .clip(CircleShape)
                                .clickable { viewModel.setProfileModalOpen(true) }
                                .testTag("header_profile_button")
                        ) {
                            ChatteraAvatar(
                                name = displayFirstName,
                                colorHex = localUser.avatarColorHex,
                                size = 36.dp,
                                online = true
                            )
                        }

                        IconButton(
                            onClick = { viewModel.signOut(AuthStage.INTRO) },
                            modifier = Modifier
                                .size(38.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .background(colors.iconBg)
                                .testTag("header_logout_button")
                        ) {
                            Icon(
                                Icons.AutoMirrored.Filled.Logout,
                                contentDescription = "Log out",
                                tint = colors.text,
                                modifier = Modifier.size(18.dp)
                            )
                        }
                    }
                }

                if (notificationsOpen) {
                    Surface(
                        color = colors.bg,
                        modifier = Modifier
                            .fillMaxWidth()
                            .border(1.dp, colors.border)
                    ) {
                        Column(
                            modifier = Modifier.padding(12.dp),
                            verticalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Text(
                                text = "Chattera Activity Center",
                                color = colors.text,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                text = "• Encryption Engine: Connected (ECDH P-256 + AES-256-GCM)",
                                color = ChatteraOnlineGreen,
                                fontSize = 11.sp
                            )
                            Text(
                                text = "• Signed in as ${localUser.displayName} (@${localUser.handle})",
                                color = colors.muted,
                                fontSize = 11.sp
                            )
                        }
                    }
                }
            }
        },
        floatingActionButton = {
            if (!mobileChatOpen && navTab != ChatteraNavTab.CHATS) {
                FloatingActionButton(
                    onClick = { viewModel.setNewChatPickerOpen(true) },
                    containerColor = ChatteraPrimary,
                    contentColor = Color.White,
                    shape = RoundedCornerShape(18.dp),
                    modifier = Modifier.testTag("fab_new_chat")
                ) {
                    Icon(Icons.Default.Add, contentDescription = "Start New Chat")
                }
            }
        },
        bottomBar = {
            NavigationBar(
                containerColor = colors.card,
                tonalElevation = 0.dp,
                modifier = Modifier
                    .border(1.dp, colors.border)
                    .windowInsetsPadding(WindowInsets.navigationBars)
            ) {
                val navItems = listOf(
                    Triple(ChatteraNavTab.HOME, "Home", Icons.Default.Home),
                    Triple(ChatteraNavTab.CHATS, "Chats", Icons.AutoMirrored.Filled.Chat),
                    Triple(ChatteraNavTab.STATUS, "Status", Icons.Default.RadioButtonChecked),
                    Triple(ChatteraNavTab.CALLS, "Calls", Icons.Default.Call),
                    Triple(ChatteraNavTab.WALLET, "Wallet", Icons.Default.AccountBalanceWallet),
                    Triple(ChatteraNavTab.BENCH, "Security", Icons.Default.Shield)
                )

                navItems.forEach { (tab, label, icon) ->
                    val selected = navTab == tab
                    NavigationBarItem(
                        selected = selected,
                        onClick = { viewModel.setNavTab(tab) },
                        icon = {
                            Icon(
                                imageVector = icon,
                                contentDescription = label,
                                modifier = Modifier.size(20.dp)
                            )
                        },
                        label = {
                            Text(
                                text = label,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.SemiBold,
                                maxLines = 1
                            )
                        },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = colors.primary,
                            selectedTextColor = colors.primary,
                            indicatorColor = colors.softTint,
                            unselectedIconColor = colors.muted,
                            unselectedTextColor = colors.muted
                        ),
                        modifier = Modifier.testTag("nav_tab_${tab.name.lowercase()}")
                    )
                }
            }
        }
    ) { innerPadding ->
        BoxWithConstraints(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            val isExpandedScreen = maxWidth >= 760.dp

            if (navTab == ChatteraNavTab.BENCH) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(Color(0xFF0B0F17))
                        .verticalScroll(rememberScrollState())
                ) {
                    SecurityAuditView(
                        benchResult = benchResult,
                        onRunLiveTest = viewModel::runLiveBenchTest
                    )
                }
            } else if (isExpandedScreen) {
                // Canonical Dual-Pane Layout for Tablets / Foldables
                Row(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(12.dp),
                    horizontalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    FeedColumnContent(
                        viewModel = viewModel,
                        navTab = navTab,
                        displayFirstName = displayFirstName,
                        activeHandle = localUser.handle,
                        myCustomStatus = localUser.statusText,
                        searchQuery = searchQuery,
                        filteredContacts = filteredContacts,
                        selectedTargetId = selectedTarget.id,
                        peerActivities = peerActivities,
                        stories = stories,
                        callLogs = callLogs,
                        walletBalance = walletBalance,
                        walletTransactions = walletTransactions,
                        contacts = contacts,
                        modifier = Modifier
                            .weight(0.44f)
                            .fillMaxHeight()
                    )

                    ChatteraChatThreadScreen(
                        target = selectedTarget,
                        myUid = localUser.uid,
                        messages = activeMessages,
                        contacts = contacts,
                        peerActivity = peerActivities[selectedTarget.id] ?: "idle",
                        peerActivitiesMap = peerActivities,
                        onSelectContact = viewModel::selectContact,
                        onOpenNewChatModal = { viewModel.setNewChatPickerOpen(true) },
                        onBackMobile = { viewModel.setMobileChatOpen(false) },
                        onSendMessage = { text -> viewModel.sendMessage(text, selectedTarget.id) },
                        onRevokeMessage = viewModel::revokeMessage,
                        onAcknowledgeMessage = viewModel::acknowledgeMessage,
                        onToggleReaction = viewModel::toggleMessageReaction,
                        onStartCall = { type ->
                            viewModel.startCall(
                                selectedTarget.name,
                                selectedTarget.handle,
                                selectedTarget.avatarColorHex,
                                type,
                                selectedTarget.keyFingerprint
                            )
                        },
                        onOpenSafetyNumber = { viewModel.setSafetyModalOpen(true) },
                        onQuickSendCashInChat = { amt, note ->
                            viewModel.sendEncryptedCash(
                                selectedTarget.name,
                                selectedTarget.handle,
                                amt,
                                note
                            )
                        },
                        showBackButton = false,
                        modifier = Modifier
                            .weight(0.56f)
                            .fillMaxHeight()
                    )
                }
            } else {
                // Compact Handheld Layout
                if (mobileChatOpen || navTab == ChatteraNavTab.CHATS) {
                    ChatteraChatThreadScreen(
                        target = selectedTarget,
                        myUid = localUser.uid,
                        messages = activeMessages,
                        contacts = contacts,
                        peerActivity = peerActivities[selectedTarget.id] ?: "idle",
                        peerActivitiesMap = peerActivities,
                        onSelectContact = viewModel::selectContact,
                        onOpenNewChatModal = { viewModel.setNewChatPickerOpen(true) },
                        onBackMobile = {
                            viewModel.setMobileChatOpen(false)
                            if (navTab == ChatteraNavTab.CHATS) {
                                viewModel.setNavTab(ChatteraNavTab.HOME)
                            }
                        },
                        onSendMessage = { text -> viewModel.sendMessage(text, selectedTarget.id) },
                        onRevokeMessage = viewModel::revokeMessage,
                        onAcknowledgeMessage = viewModel::acknowledgeMessage,
                        onToggleReaction = viewModel::toggleMessageReaction,
                        onStartCall = { type ->
                            viewModel.startCall(
                                selectedTarget.name,
                                selectedTarget.handle,
                                selectedTarget.avatarColorHex,
                                type,
                                selectedTarget.keyFingerprint
                            )
                        },
                        onOpenSafetyNumber = { viewModel.setSafetyModalOpen(true) },
                        onQuickSendCashInChat = { amt, note ->
                            viewModel.sendEncryptedCash(
                                selectedTarget.name,
                                selectedTarget.handle,
                                amt,
                                note
                            )
                        },
                        showBackButton = true,
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(8.dp)
                    )
                } else {
                    FeedColumnContent(
                        viewModel = viewModel,
                        navTab = navTab,
                        displayFirstName = displayFirstName,
                        activeHandle = localUser.handle,
                        myCustomStatus = localUser.statusText,
                        searchQuery = searchQuery,
                        filteredContacts = filteredContacts,
                        selectedTargetId = selectedTarget.id,
                        peerActivities = peerActivities,
                        stories = stories,
                        callLogs = callLogs,
                        walletBalance = walletBalance,
                        walletTransactions = walletTransactions,
                        contacts = contacts,
                        modifier = Modifier.fillMaxSize()
                    )
                }
            }
        }
    }

    // Modals
    if (activeStory != null) {
        StoryViewerModal(
            story = activeStory!!,
            onClose = { viewModel.setActiveStory(null) },
            onReplyToStory = viewModel::replyToStory
        )
    }

    if (postStatusOpen) {
        PostStatusModal(
            currentStatus = localUser.statusText,
            onClose = { viewModel.setPostStatusOpen(false) },
            onPublishStatus = viewModel::publishStatus
        )
    }

    if (activeCall != null) {
        EncryptedCallModal(
            session = activeCall!!,
            onEndCall = viewModel::endCall
        )
    }

    if (profileModalOpen) {
        ProfileKeyVaultModal(
            user = localUser,
            discoverable = discoverable,
            keyVault = keyVault,
            onClose = { viewModel.setProfileModalOpen(false) },
            onUpdateProfile = viewModel::updateProfileMetadata,
            onRotateKeyPair = viewModel::rotateKeyPair,
            onImportKeyVaultJson = viewModel::importKeyVaultJson,
            onSignOut = { viewModel.signOut(AuthStage.INTRO) }
        )
    }

    if (safetyModalOpen) {
        SafetyNumberModal(
            myUser = localUser,
            myKeyVault = keyVault,
            peerContact = selectedTarget,
            onClose = { viewModel.setSafetyModalOpen(false) }
        )
    }

    if (newChatPickerOpen) {
        NewChatPickerModal(
            contacts = contacts,
            onSelectContact = viewModel::selectContact,
            onClose = { viewModel.setNewChatPickerOpen(false) }
        )
    }
}

@Composable
private fun FeedColumnContent(
    viewModel: ChatteraViewModel,
    navTab: ChatteraNavTab,
    displayFirstName: String,
    activeHandle: String,
    myCustomStatus: String,
    searchQuery: String,
    filteredContacts: List<com.example.data.ContactEntity>,
    selectedTargetId: String,
    peerActivities: Map<String, String>,
    stories: List<com.example.data.StoryEntity>,
    callLogs: List<com.example.data.CallLogEntity>,
    walletBalance: Long,
    walletTransactions: List<com.example.data.WalletTransactionEntity>,
    contacts: List<com.example.data.ContactEntity>,
    modifier: Modifier = Modifier
) {
    val colors = LocalChatteraColors.current

    Column(
        modifier = modifier
            .verticalScroll(rememberScrollState())
            .padding(bottom = 80.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // 1. Welcome Banner
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 14.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(8.dp)
                            .clip(CircleShape)
                            .background(ChatteraOnlineGreen)
                    )
                    Text(
                        text = "Online · @$activeHandle",
                        color = colors.muted,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium
                    )
                }
                Text(
                    text = "Hello, $displayFirstName 👋",
                    color = colors.text,
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Bold
                )
            }

            Surface(
                shape = RoundedCornerShape(14.dp),
                color = colors.card,
                modifier = Modifier
                    .border(1.dp, colors.border, RoundedCornerShape(14.dp))
                    .clickable { viewModel.setProfileModalOpen(true) }
                    .testTag("key_vault_banner_button")
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Icon(Icons.Default.Key, contentDescription = null, tint = ChatteraPrimary, modifier = Modifier.size(14.dp))
                    Text("Key Vault", color = colors.primary, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            }
        }

        // 2. Search Box
        OutlinedTextField(
            value = searchQuery,
            onValueChange = viewModel::setSearchQuery,
            placeholder = { Text("Search chats, friends, or messages...", fontSize = 13.sp) },
            leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = colors.muted) },
            singleLine = true,
            shape = RoundedCornerShape(18.dp),
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 14.dp)
                .testTag("main_search_input")
        )

        // 3. Quick Actions Grid (Home Tab)
        if (navTab == ChatteraNavTab.HOME) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 14.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                val actions = listOf(
                    Triple("New Chat", Icons.Default.Add) { viewModel.setNewChatPickerOpen(true) },
                    Triple("People", Icons.Default.People) { viewModel.setNewChatPickerOpen(true) },
                    Triple("Status", Icons.Default.RadioButtonChecked) { viewModel.setNavTab(ChatteraNavTab.STATUS) },
                    Triple("Calls", Icons.Default.Call) { viewModel.setNavTab(ChatteraNavTab.CALLS) }
                )

                actions.forEach { (label, icon, onClick) ->
                    Surface(
                        shape = RoundedCornerShape(18.dp),
                        color = colors.card,
                        modifier = Modifier
                            .weight(1f)
                            .border(1.dp, colors.border, RoundedCornerShape(18.dp))
                            .clickable { onClick() }
                    ) {
                        Column(
                            modifier = Modifier.padding(vertical = 12.dp, horizontal = 6.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(36.dp)
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(colors.softTint),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(icon, contentDescription = label, tint = colors.primary, modifier = Modifier.size(18.dp))
                            }
                            Text(
                                text = label,
                                color = colors.text,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.SemiBold,
                                maxLines = 1
                            )
                        }
                    }
                }
            }
        }

        // 4. Status / Stories Carousel
        if (navTab == ChatteraNavTab.HOME || navTab == ChatteraNavTab.STATUS) {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 14.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Status Stories", color = colors.text, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                    Text(
                        text = "+ Post Status",
                        color = colors.primary,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier
                            .clickable { viewModel.setPostStatusOpen(true) }
                            .testTag("post_status_trigger")
                    )
                }

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState())
                        .padding(horizontal = 14.dp),
                    horizontalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    // My Status Button
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        modifier = Modifier
                            .width(64.dp)
                            .clickable { viewModel.setPostStatusOpen(true) }
                    ) {
                        Box(
                            modifier = Modifier
                                .size(58.dp)
                                .clip(CircleShape)
                                .background(colors.card)
                                .border(2.dp, colors.primary, CircleShape),
                            contentAlignment = Alignment.Center
                        ) {
                            Text("＋", color = colors.primary, fontSize = 20.sp, fontWeight = FontWeight.Bold)
                        }
                        Spacer(Modifier.height(4.dp))
                        Text(
                            text = "My Status",
                            color = colors.muted,
                            fontSize = 11.sp,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }

                    stories.forEach { st ->
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            modifier = Modifier
                                .width(64.dp)
                                .clickable { viewModel.setActiveStory(st) }
                                .testTag("story_item_${st.handle}")
                        ) {
                            ChatteraAvatar(
                                name = st.name,
                                colorHex = st.avatarColorHex,
                                size = 58.dp,
                                storyRing = true
                            )
                            Spacer(Modifier.height(4.dp))
                            Text(
                                text = st.name.substringBefore(" "),
                                color = colors.text,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Medium,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                                textAlign = TextAlign.Center
                            )
                        }
                    }
                }

                if (navTab == ChatteraNavTab.STATUS) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 14.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Surface(
                            shape = RoundedCornerShape(18.dp),
                            color = colors.card,
                            modifier = Modifier
                                .fillMaxWidth()
                                .border(1.dp, colors.border, RoundedCornerShape(18.dp))
                        ) {
                            Row(
                                modifier = Modifier.padding(14.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text("Your Current Status", color = colors.text, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                    Text(
                                        text = "“$myCustomStatus”",
                                        color = colors.muted,
                                        fontSize = 12.sp,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                }
                                Surface(
                                    shape = RoundedCornerShape(10.dp),
                                    color = colors.primary,
                                    modifier = Modifier.clickable { viewModel.setPostStatusOpen(true) }
                                ) {
                                    Text(
                                        text = "Update",
                                        color = Color.White,
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                                    )
                                }
                            }
                        }

                        stories.forEach { st ->
                            Surface(
                                shape = RoundedCornerShape(18.dp),
                                color = colors.card,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .border(1.dp, colors.border, RoundedCornerShape(18.dp))
                                    .clickable { viewModel.setActiveStory(st) }
                            ) {
                                Row(
                                    modifier = Modifier.padding(14.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                                ) {
                                    ChatteraAvatar(
                                        name = st.name,
                                        colorHex = st.avatarColorHex,
                                        size = 46.dp,
                                        storyRing = true
                                    )
                                    Column(modifier = Modifier.weight(1f)) {
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween
                                        ) {
                                            Text(st.name, color = colors.text, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                                            Text(st.timeAgo, color = colors.muted, fontSize = 11.sp)
                                        }
                                        Text(
                                            text = st.text,
                                            color = colors.muted,
                                            fontSize = 12.sp,
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // 5. Recent Chats Section
        if (navTab == ChatteraNavTab.HOME || navTab == ChatteraNavTab.CHATS) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 14.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Messages", color = colors.text, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                    Text(
                        text = "+ New Chat",
                        color = colors.primary,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.clickable { viewModel.setNewChatPickerOpen(true) }
                    )
                }

                filteredContacts.forEach { chat ->
                    val isSelected = selectedTargetId == chat.id
                    val activity = peerActivities[chat.id]

                    Surface(
                        shape = RoundedCornerShape(18.dp),
                        color = if (isSelected) colors.card else Color.Transparent,
                        modifier = Modifier
                            .fillMaxWidth()
                            .border(
                                width = 1.dp,
                                color = if (isSelected) colors.border else Color.Transparent,
                                shape = RoundedCornerShape(18.dp)
                            )
                            .clickable { viewModel.selectContact(chat) }
                            .testTag("contact_row_${chat.id}")
                    ) {
                        Row(
                            modifier = Modifier.padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            ChatteraAvatar(
                                name = chat.name,
                                colorHex = chat.avatarColorHex,
                                size = 52.dp,
                                online = chat.online
                            )

                            Column(modifier = Modifier.weight(1f)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        text = chat.name,
                                        color = colors.text,
                                        fontSize = 14.sp,
                                        fontWeight = FontWeight.Bold,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                    Text(
                                        text = chat.timeLabel,
                                        color = colors.muted,
                                        fontSize = 11.sp,
                                        fontFamily = FontFamily.Monospace
                                    )
                                }

                                val previewText = when (activity) {
                                    "recording" -> "🎤 recording voice message…"
                                    "typing" -> "typing…"
                                    else -> chat.initialMessage
                                }
                                Text(
                                    text = previewText,
                                    color = if (activity != null && activity != "idle") colors.primary else colors.muted,
                                    fontSize = 12.sp,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                    modifier = Modifier.padding(top = 2.dp)
                                )
                            }

                            if (chat.unreadCount > 0) {
                                Box(
                                    modifier = Modifier
                                        .clip(CircleShape)
                                        .background(colors.primary)
                                        .padding(horizontal = 7.dp, vertical = 2.dp),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text(
                                        text = chat.unreadCount.toString(),
                                        color = Color.White,
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }

        // 6. Calls Tab View
        if (navTab == ChatteraNavTab.CALLS) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 14.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Voice & Video Calls", color = colors.text, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                    val firstContact = contacts.firstOrNull() ?: SeedData.SEED_CONTACTS.first()
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = colors.primary,
                        modifier = Modifier
                            .clickable {
                                viewModel.startCall(
                                    firstContact.name,
                                    firstContact.handle,
                                    firstContact.avatarColorHex,
                                    "audio",
                                    firstContact.keyFingerprint
                                )
                            }
                            .testTag("start_call_tab_button")
                    ) {
                        Text(
                            text = "+ Start Call",
                            color = Color.White,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                        )
                    }
                }

                callLogs.forEach { log ->
                    Surface(
                        shape = RoundedCornerShape(18.dp),
                        color = colors.card,
                        modifier = Modifier
                            .fillMaxWidth()
                            .border(1.dp, colors.border, RoundedCornerShape(18.dp))
                    ) {
                        Row(
                            modifier = Modifier.padding(14.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(
                                modifier = Modifier.weight(1f),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                ChatteraAvatar(
                                    name = log.contactName,
                                    colorHex = log.avatarColorHex,
                                    size = 44.dp
                                )
                                Column {
                                    Text(
                                        text = log.contactName,
                                        color = colors.text,
                                        fontSize = 14.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                                    ) {
                                        val dirIcon = when (log.direction) {
                                            "incoming" -> Icons.AutoMirrored.Filled.CallReceived
                                            "missed" -> Icons.AutoMirrored.Filled.CallMissed
                                            else -> Icons.AutoMirrored.Filled.CallMade
                                        }
                                        val dirColor = when (log.direction) {
                                            "incoming" -> ChatteraOnlineGreen
                                            "missed" -> Color(0xFFEF4444)
                                            else -> ChatteraPrimary
                                        }
                                        Icon(dirIcon, contentDescription = null, tint = dirColor, modifier = Modifier.size(14.dp))
                                        Text(
                                            text = "${log.timestamp} · ${log.duration}",
                                            color = colors.muted,
                                            fontSize = 11.sp
                                        )
                                    }
                                }
                            }

                            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                IconButton(
                                    onClick = {
                                        viewModel.startCall(
                                            log.contactName,
                                            log.contactHandle,
                                            log.avatarColorHex,
                                            "audio",
                                            "A4F9:19C0:8B2E:771D:3C8A:90E2:55B4:12D8"
                                        )
                                    },
                                    modifier = Modifier
                                        .size(36.dp)
                                        .clip(RoundedCornerShape(10.dp))
                                        .background(colors.softTint)
                                ) {
                                    Icon(Icons.Default.Call, contentDescription = "Audio Call", tint = colors.primary, modifier = Modifier.size(18.dp))
                                }

                                IconButton(
                                    onClick = {
                                        viewModel.startCall(
                                            log.contactName,
                                            log.contactHandle,
                                            log.avatarColorHex,
                                            "video",
                                            "A4F9:19C0:8B2E:771D:3C8A:90E2:55B4:12D8"
                                        )
                                    },
                                    modifier = Modifier
                                        .size(36.dp)
                                        .clip(RoundedCornerShape(10.dp))
                                        .background(colors.softTint)
                                ) {
                                    Icon(Icons.Default.Videocam, contentDescription = "Video Call", tint = colors.primary, modifier = Modifier.size(18.dp))
                                }
                            }
                        }
                    }
                }
            }
        }

        // 7. Wallet Tab View
        if (navTab == ChatteraNavTab.WALLET) {
            ChatteraWalletView(
                balanceNaira = walletBalance,
                transactions = walletTransactions,
                contacts = contacts,
                onTopUpWallet = viewModel::topUpWallet,
                onSendEncryptedCash = viewModel::sendEncryptedCash
            )
        }
    }
}

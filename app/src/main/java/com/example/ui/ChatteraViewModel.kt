package com.example.ui

import android.app.Application
import android.content.Context
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.crypto.E2eeEngine
import com.example.crypto.StoredIdentityKeyVault
import com.example.data.ActiveCallSession
import com.example.data.CallLogEntity
import com.example.data.ChatteraDatabase
import com.example.data.ChatteraRepository
import com.example.data.ContactEntity
import com.example.data.LocalSessionUser
import com.example.data.MessageEntity
import com.example.data.SeedData
import com.example.data.StoryEntity
import com.example.data.WalletTransactionEntity
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.crypto.SecretKey

enum class ChatteraNavTab {
    HOME, CHATS, STATUS, CALLS, WALLET, BENCH
}

enum class AuthStage {
    INTRO, LOGIN, SIGNUP, FORGOT
}

data class LiveBenchResult(
    val ciphertext: String,
    val ivBase64: String,
    val ivHex: String,
    val decrypted: String,
    val byteLength: Int
)

class ChatteraViewModel(application: Application) : AndroidViewModel(application) {
    private val appContext = application.applicationContext
    private val prefs = appContext.getSharedPreferences("chattera_ui_prefs", Context.MODE_PRIVATE)
    private val repository = ChatteraRepository(ChatteraDatabase.getInstance(appContext).chatteraDao())

    // Theme
    private val _darkMode = MutableStateFlow(prefs.getBoolean("darkMode", false))
    val darkMode: StateFlow<Boolean> = _darkMode.asStateFlow()

    // Session & Auth
    private val _isLoggedOut = MutableStateFlow(false)
    val isLoggedOut: StateFlow<Boolean> = _isLoggedOut.asStateFlow()

    private val _authStage = MutableStateFlow(AuthStage.INTRO)
    val authStage: StateFlow<AuthStage> = _authStage.asStateFlow()

    private val _localUser = MutableStateFlow(SeedData.DEFAULT_RECENT_ACCOUNTS.first())
    val localUser: StateFlow<LocalSessionUser> = _localUser.asStateFlow()

    private val _recentAccounts = MutableStateFlow(SeedData.DEFAULT_RECENT_ACCOUNTS)
    val recentAccounts: StateFlow<List<LocalSessionUser>> = _recentAccounts.asStateFlow()

    private val _discoverable = MutableStateFlow(true)
    val discoverable: StateFlow<Boolean> = _discoverable.asStateFlow()

    // Navigation & Screens
    private val _navTab = MutableStateFlow(ChatteraNavTab.HOME)
    val navTab: StateFlow<ChatteraNavTab> = _navTab.asStateFlow()

    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()

    private val _mobileChatOpen = MutableStateFlow(false)
    val mobileChatOpen: StateFlow<Boolean> = _mobileChatOpen.asStateFlow()

    private val _selectedContactId = MutableStateFlow(SeedData.SEED_CONTACTS.first().id)
    val selectedContactId: StateFlow<String> = _selectedContactId.asStateFlow()

    // Modals
    private val _activeStory = MutableStateFlow<StoryEntity?>(null)
    val activeStory: StateFlow<StoryEntity?> = _activeStory.asStateFlow()

    private val _postStatusOpen = MutableStateFlow(false)
    val postStatusOpen: StateFlow<Boolean> = _postStatusOpen.asStateFlow()

    private val _activeCall = MutableStateFlow<ActiveCallSession?>(null)
    val activeCall: StateFlow<ActiveCallSession?> = _activeCall.asStateFlow()

    private val _profileModalOpen = MutableStateFlow(false)
    val profileModalOpen: StateFlow<Boolean> = _profileModalOpen.asStateFlow()

    private val _safetyModalOpen = MutableStateFlow(false)
    val safetyModalOpen: StateFlow<Boolean> = _safetyModalOpen.asStateFlow()

    private val _newChatPickerOpen = MutableStateFlow(false)
    val newChatPickerOpen: StateFlow<Boolean> = _newChatPickerOpen.asStateFlow()

    private val _notificationsOpen = MutableStateFlow(false)
    val notificationsOpen: StateFlow<Boolean> = _notificationsOpen.asStateFlow()

    // Wallet balance
    private val _walletBalance = MutableStateFlow(prefs.getLong("walletBalance", 285000L))
    val walletBalance: StateFlow<Long> = _walletBalance.asStateFlow()

    // Peer typing/recording indicators
    private val _peerActivities = MutableStateFlow<Map<String, String>>(emptyMap())
    val peerActivities: StateFlow<Map<String, String>> = _peerActivities.asStateFlow()

    // Crypto Vault & Bench
    private val _keyVault = MutableStateFlow<StoredIdentityKeyVault?>(null)
    val keyVault: StateFlow<StoredIdentityKeyVault?> = _keyVault.asStateFlow()

    private var sharedAesKey: SecretKey? = null

    private val _benchResult = MutableStateFlow<LiveBenchResult?>(null)
    val benchResult: StateFlow<LiveBenchResult?> = _benchResult.asStateFlow()

    // Room Flows
    val contacts: StateFlow<List<ContactEntity>> = repository.contacts.stateIn(
        viewModelScope,
        SharingStarted.WhileSubscribed(5000),
        SeedData.SEED_CONTACTS
    )

    val allMessages: StateFlow<List<MessageEntity>> = repository.allMessages.stateIn(
        viewModelScope,
        SharingStarted.WhileSubscribed(5000),
        emptyList()
    )

    val callLogs: StateFlow<List<CallLogEntity>> = repository.callLogs.stateIn(
        viewModelScope,
        SharingStarted.WhileSubscribed(5000),
        SeedData.INITIAL_CALL_LOGS
    )

    val walletTransactions: StateFlow<List<WalletTransactionEntity>> = repository.walletTransactions.stateIn(
        viewModelScope,
        SharingStarted.WhileSubscribed(5000),
        SeedData.INITIAL_WALLET_TRANSACTIONS
    )

    val stories: StateFlow<List<StoryEntity>> = repository.stories.stateIn(
        viewModelScope,
        SharingStarted.WhileSubscribed(5000),
        emptyList()
    )

    init {
        viewModelScope.launch {
            val vault = E2eeEngine.loadOrCreateIdentityKeyVault(appContext, _localUser.value.uid)
            _keyVault.value = vault
            val aesKey = E2eeEngine.deriveSharedAesGcmKey(vault)
            sharedAesKey = aesKey
            runLiveBenchTest("Zero-trust verification payload: Coordinates 37.7749 N, 122.4194 W")

            if (repository.getContactCount() == 0) {
                repository.insertContacts(SeedData.SEED_CONTACTS)
                repository.insertCallLogs(SeedData.INITIAL_CALL_LOGS)
                repository.insertWalletTransactions(SeedData.INITIAL_WALLET_TRANSACTIONS)

                val seedStories = SeedData.SEED_CONTACTS.mapIndexed { idx, c ->
                    StoryEntity(
                        id = "story_${c.id}",
                        name = c.name,
                        handle = c.handle,
                        avatarColorHex = c.avatarColorHex,
                        text = c.statusStoryText,
                        timeAgo = c.statusTimeAgo,
                        bgStartHex = c.statusBgStartHex,
                        bgEndHex = c.statusBgEndHex,
                        keyFingerprint = c.keyFingerprint,
                        isOwn = false,
                        createdAtMs = System.currentTimeMillis() - (idx * 600_000L)
                    )
                }
                repository.insertStories(seedStories)

                val seedMessages = mutableListOf<MessageEntity>()
                val now = System.currentTimeMillis()
                SeedData.SEED_CONTACTS.forEachIndexed { index, c ->
                    val enc = E2eeEngine.encryptMessagePlaintext(aesKey, c.initialMessage)
                    seedMessages.add(
                        MessageEntity(
                            id = "seed_msg_${c.id}",
                            conversationId = c.id,
                            senderId = c.id,
                            recipientId = _localUser.value.uid,
                            senderKeyFingerprint = c.keyFingerprint,
                            ciphertext = enc.ciphertext,
                            iv = enc.iv,
                            algorithm = enc.algorithm,
                            deliveryStatus = "verified",
                            plaintext = c.initialMessage,
                            decryptionOk = true,
                            createdAtMs = now - ((SeedData.SEED_CONTACTS.size - index) * 300_000L)
                        )
                    )
                    if (c.id == "contact_amara") {
                        val voicePayload =
                            "[VOICE:seed_amara_voice:5:35,68,85,52,90,74,60,88,94,70,48,78,82,64,50,86,72,58,42,66,75,54,40,32] Voice message (0:05)"
                        val encVoice = E2eeEngine.encryptMessagePlaintext(aesKey, voicePayload)
                        seedMessages.add(
                            MessageEntity(
                                id = "seed_voice_amara",
                                conversationId = c.id,
                                senderId = c.id,
                                recipientId = _localUser.value.uid,
                                senderKeyFingerprint = c.keyFingerprint,
                                ciphertext = encVoice.ciphertext,
                                iv = encVoice.iv,
                                algorithm = encVoice.algorithm,
                                deliveryStatus = "verified",
                                plaintext = voicePayload,
                                decryptionOk = true,
                                createdAtMs = now - 60_000L
                            )
                        )
                    }
                }
                repository.insertMessages(seedMessages)
            }
        }
    }

    fun toggleDarkMode() {
        val next = !_darkMode.value
        _darkMode.value = next
        prefs.edit().putBoolean("darkMode", next).apply()
    }

    fun setNavTab(tab: ChatteraNavTab) {
        _navTab.value = tab
        _mobileChatOpen.value = (tab == ChatteraNavTab.CHATS)
    }

    fun setSearchQuery(q: String) {
        _searchQuery.value = q
    }

    fun setMobileChatOpen(open: Boolean) {
        _mobileChatOpen.value = open
    }

    fun setActiveStory(story: StoryEntity?) {
        _activeStory.value = story
    }

    fun setPostStatusOpen(open: Boolean) {
        _postStatusOpen.value = open
    }

    fun setProfileModalOpen(open: Boolean) {
        _profileModalOpen.value = open
    }

    fun setSafetyModalOpen(open: Boolean) {
        _safetyModalOpen.value = open
    }

    fun setNewChatPickerOpen(open: Boolean) {
        _newChatPickerOpen.value = open
    }

    fun setNotificationsOpen(open: Boolean) {
        _notificationsOpen.value = open
    }

    fun selectContact(contact: ContactEntity) {
        _selectedContactId.value = contact.id
        _navTab.value = ChatteraNavTab.CHATS
        _mobileChatOpen.value = true
        if (contact.unreadCount > 0) {
            viewModelScope.launch {
                repository.updateContact(contact.copy(unreadCount = 0))
            }
        }
    }

    fun signInWithAccount(user: LocalSessionUser) {
        _localUser.value = user
        val updated = listOf(user) + _recentAccounts.value.filter { it.uid != user.uid }
        _recentAccounts.value = updated.take(6)
        _isLoggedOut.value = false
        _navTab.value = ChatteraNavTab.HOME
        _mobileChatOpen.value = false
        viewModelScope.launch {
            val vault = E2eeEngine.loadOrCreateIdentityKeyVault(appContext, user.uid)
            _keyVault.value = vault
            sharedAesKey = E2eeEngine.deriveSharedAesGcmKey(vault)
        }
    }

    fun setAuthStage(stage: AuthStage) {
        _authStage.value = stage
    }

    fun signOut(targetStage: AuthStage = AuthStage.INTRO) {
        _authStage.value = targetStage
        _isLoggedOut.value = true
        _profileModalOpen.value = false
        _notificationsOpen.value = false
        _mobileChatOpen.value = false
    }

    fun updateProfileMetadata(
        displayName: String,
        handle: String,
        statusText: String,
        discoverable: Boolean
    ) {
        val cleanHandle = handle.lowercase().replace(Regex("[^a-z0-9_\\-]"), "_").trim('_').ifBlank { "rapheal_ogar" }
        val cleanName = displayName.trim().ifBlank { "Rapheal Ogar" }
        val cleanStatus = statusText.trim().ifBlank { "Available on Chattera" }
        _discoverable.value = discoverable
        val updatedUser = _localUser.value.copy(
            displayName = cleanName,
            handle = cleanHandle,
            statusText = cleanStatus
        )
        _localUser.value = updatedUser
        _recentAccounts.value = listOf(updatedUser) + _recentAccounts.value.filter { it.uid != updatedUser.uid }
    }

    fun rotateKeyPair() {
        viewModelScope.launch {
            val fresh = E2eeEngine.generateIdentityKeyVault(appContext, _localUser.value.uid)
            _keyVault.value = fresh
            sharedAesKey = E2eeEngine.deriveSharedAesGcmKey(fresh)
            runLiveBenchTest("Rotated ECDH P-256 keypair verification payload")
        }
    }

    suspend fun importKeyVaultJson(jsonStr: String): Result<Unit> {
        return try {
            val vault = E2eeEngine.importIdentityKeyVault(appContext, _localUser.value.uid, jsonStr)
            _keyVault.value = vault
            sharedAesKey = E2eeEngine.deriveSharedAesGcmKey(vault)
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    fun runLiveBenchTest(text: String) {
        val vault = _keyVault.value ?: return
        val key = sharedAesKey ?: E2eeEngine.deriveSharedAesGcmKey(vault).also { sharedAesKey = it }
        val input = text.ifBlank { "Empty test frame" }
        val encrypted = E2eeEngine.encryptMessagePlaintext(key, input)
        val decrypted = E2eeEngine.decryptMessageCiphertext(key, encrypted.ciphertext, encrypted.iv)
        _benchResult.value = LiveBenchResult(
            ciphertext = encrypted.ciphertext,
            ivBase64 = encrypted.iv,
            ivHex = E2eeEngine.base64ToHex(encrypted.iv),
            decrypted = decrypted.plaintext,
            byteLength = input.toByteArray(Charsets.UTF_8).size
        )
    }

    fun sendMessage(plaintext: String, targetContactId: String = _selectedContactId.value) {
        val trimmed = plaintext.trim()
        if (trimmed.isEmpty()) return
        viewModelScope.launch {
            val vault = _keyVault.value ?: E2eeEngine.loadOrCreateIdentityKeyVault(appContext, _localUser.value.uid)
            val key = sharedAesKey ?: E2eeEngine.deriveSharedAesGcmKey(vault).also { sharedAesKey = it }
            val enc = E2eeEngine.encryptMessagePlaintext(key, trimmed)
            val now = System.currentTimeMillis()
            val msgId = "pkt_${now}_${(1000..9999).random()}"

            val msg = MessageEntity(
                id = msgId,
                conversationId = targetContactId,
                senderId = _localUser.value.uid,
                recipientId = targetContactId,
                senderKeyFingerprint = vault.keyFingerprint,
                ciphertext = enc.ciphertext,
                iv = enc.iv,
                algorithm = enc.algorithm,
                deliveryStatus = "verified",
                plaintext = trimmed,
                decryptionOk = true,
                createdAtMs = now
            )
            repository.insertMessage(msg)

            val preview = formatPreview(trimmed)
            val contact = contacts.value.find { it.id == targetContactId }
            if (contact != null) {
                repository.updateContact(
                    contact.copy(
                        initialMessage = preview,
                        timeLabel = "Just now",
                        unreadCount = 0
                    )
                )
            }

            // Trigger realistic real-time typing/recording indicator & contextual reply
            val isIncomingVoice = trimmed.startsWith("[VOICE:")
            delay(450)
            _peerActivities.value = _peerActivities.value + (targetContactId to if (isIncomingVoice) "recording" else "typing")
            delay(1650)
            _peerActivities.value = _peerActivities.value + (targetContactId to "idle")

            val replyText = when {
                isIncomingVoice -> {
                    val replyVoiceId = "vn_reply_${System.currentTimeMillis()}"
                    "[VOICE:$replyVoiceId:4:42,74,88,60,92,78,54,84,90,68,46,72,80,62,48,82,70,56,44,64,76,52,38,34] Voice message (0:04)"
                }
                trimmed.startsWith("[CHT-PAY:") -> "Thank you so much! I just received the transfer alert 🎉🙏"
                trimmed.startsWith("[IMG:") -> "This photo looks awesome! Thanks for sharing 🔥✨"
                else -> {
                    val pool = when (targetContactId) {
                        "contact_amara" -> listOf(
                            "Love how smooth the new Chattera chatting page feels! 🚀✨",
                            "Got your message loud and clear! Should we hop on a quick voice call?",
                            "That sounds great! Send me a voice note when you have a moment 🎤"
                        )
                        "contact_daniel" -> listOf(
                            "Awesome! Everything is syncing in real time on my end 👍",
                            "Just checked it out — super clean and fast!",
                            "Let’s catch up later today, I’ll send over the details."
                        )
                        "contact_sophia" -> listOf(
                            "Yay! Thanks for the update 😊✨",
                            "Let me know when you’re free for a quick call!"
                        )
                        "contact_devs" -> listOf(
                            "100% agreed! Real-time E2EE delivery is super snappy ⚡",
                            "Confirmed! AES-256-GCM packets verified."
                        )
                        else -> listOf(
                            "Got your message! Great chatting with you on Chattera ✨"
                        )
                    }
                    pool.random()
                }
            }

            val encReply = E2eeEngine.encryptMessagePlaintext(key, replyText)
            val replyNow = System.currentTimeMillis()
            val replyMsg = MessageEntity(
                id = "pkt_${replyNow}_${(1000..9999).random()}",
                conversationId = targetContactId,
                senderId = targetContactId,
                recipientId = _localUser.value.uid,
                senderKeyFingerprint = contact?.keyFingerprint ?: vault.keyFingerprint,
                ciphertext = encReply.ciphertext,
                iv = encReply.iv,
                algorithm = encReply.algorithm,
                deliveryStatus = "verified",
                plaintext = replyText,
                decryptionOk = true,
                createdAtMs = replyNow
            )
            repository.insertMessage(replyMsg)

            val updatedContact = contacts.value.find { it.id == targetContactId }
            if (updatedContact != null) {
                repository.updateContact(
                    updatedContact.copy(
                        initialMessage = formatPreview(replyText),
                        timeLabel = "Just now"
                    )
                )
            }
        }
    }

    private fun formatPreview(plaintext: String): String {
        return when {
            plaintext.startsWith("[VOICE:") -> "🎤 Voice message"
            plaintext.startsWith("[IMG:") -> "📷 Shared a photo"
            plaintext.startsWith("[CHT-PAY:") -> "💸 Sent ₦ Transfer"
            plaintext.startsWith("[STEALTH:") -> "⏱️ Disappearing message"
            plaintext.startsWith("[REPLY:") -> {
                val stripped = plaintext.replace(Regex("^\\[REPLY:[^\\]]+\\]\\s*"), "")
                formatPreview(stripped)
            }
            else -> plaintext
        }
    }

    fun revokeMessage(messageId: String) {
        viewModelScope.launch {
            val existing = repository.getMessageById(messageId) ?: return@launch
            repository.updateMessage(
                existing.copy(
                    ciphertext = "[REVOKED_CIPHERTEXT]",
                    deliveryStatus = "revoked",
                    plaintext = "This message was unsent",
                    decryptionOk = false
                )
            )
        }
    }

    fun acknowledgeMessage(messageId: String, status: String) {
        viewModelScope.launch {
            val existing = repository.getMessageById(messageId) ?: return@launch
            repository.updateMessage(existing.copy(deliveryStatus = status))
        }
    }

    fun toggleMessageReaction(messageId: String, emoji: String) {
        viewModelScope.launch {
            val existing = repository.getMessageById(messageId) ?: return@launch
            val currentList = existing.reactionsCsv.split(",").filter { it.isNotBlank() }.toMutableList()
            if (currentList.contains(emoji)) {
                currentList.remove(emoji)
            } else {
                currentList.add(emoji)
            }
            repository.updateMessage(existing.copy(reactionsCsv = currentList.joinToString(",")))
        }
    }

    fun topUpWallet(amount: Long) {
        val next = _walletBalance.value + amount
        _walletBalance.value = next
        prefs.edit().putLong("walletBalance", next).apply()
        viewModelScope.launch {
            val now = System.currentTimeMillis()
            repository.insertWalletTransaction(
                WalletTransactionEntity(
                    id = "tx_$now",
                    title = "Instant Wallet Top-Up",
                    counterparty = "Chattera Reserve",
                    amountNaira = amount,
                    type = "credit",
                    timestamp = "Just now",
                    reference = "CHT-TOP-${(1000..9999).random()}",
                    createdAtMs = now
                )
            )
        }
    }

    fun sendEncryptedCash(
        recipientName: String,
        recipientHandle: String,
        amount: Long,
        note: String
    ) {
        if (amount <= 0 || amount > _walletBalance.value) return
        val refCode = "CHT-${(10000..99999).random()}"
        val nextBalance = (_walletBalance.value - amount).coerceAtLeast(0L)
        _walletBalance.value = nextBalance
        prefs.edit().putLong("walletBalance", nextBalance).apply()

        viewModelScope.launch {
            val now = System.currentTimeMillis()
            repository.insertWalletTransaction(
                WalletTransactionEntity(
                    id = "tx_$now",
                    title = "Transfer to $recipientName",
                    counterparty = "@$recipientHandle",
                    amountNaira = amount,
                    type = "debit",
                    timestamp = "Just now",
                    reference = refCode,
                    createdAtMs = now
                )
            )
            val matching = contacts.value.find { it.handle == recipientHandle } ?: contacts.value.firstOrNull()
            if (matching != null) {
                selectContact(matching)
                sendMessage("[CHT-PAY:$amount:$refCode:$note] $note", matching.id)
            }
        }
    }

    fun publishStatus(newStatusText: String) {
        val clean = newStatusText.trim().take(160).ifBlank { "Available on Chattera" }
        _localUser.value = _localUser.value.copy(statusText = clean)
        viewModelScope.launch {
            val now = System.currentTimeMillis()
            val fp = _keyVault.value?.keyFingerprint ?: "A4F9:19C0:8B2E:771D:3C8A:90E2:55B4:12D8"
            repository.insertStory(
                StoryEntity(
                    id = "st_$now",
                    name = _localUser.value.displayName,
                    handle = _localUser.value.handle,
                    avatarColorHex = _localUser.value.avatarColorHex,
                    text = clean,
                    timeAgo = "Just now",
                    bgStartHex = 0xFF6C5CE7,
                    bgEndHex = 0xFF00B894,
                    keyFingerprint = fp,
                    isOwn = true,
                    createdAtMs = now
                )
            )
        }
    }

    fun replyToStory(story: StoryEntity, replyText: String) {
        val matching = contacts.value.find { it.handle == story.handle || it.id == story.id.removePrefix("story_") }
            ?: contacts.value.firstOrNull()
        if (matching != null) {
            selectContact(matching)
            sendMessage("Replying to status \"${story.text}\": $replyText", matching.id)
        }
        _activeStory.value = null
    }

    fun startCall(
        contactName: String,
        contactHandle: String,
        avatarColorHex: Long,
        callType: String,
        keyFingerprint: String
    ) {
        _activeCall.value = ActiveCallSession(
            contactName = contactName,
            contactHandle = contactHandle,
            avatarColorHex = avatarColorHex,
            callType = callType,
            keyFingerprint = keyFingerprint
        )
    }

    fun endCall(durationFormatted: String) {
        val current = _activeCall.value ?: return
        _activeCall.value = null
        viewModelScope.launch {
            val now = System.currentTimeMillis()
            repository.insertCallLog(
                CallLogEntity(
                    id = "call_$now",
                    contactName = current.contactName,
                    contactHandle = current.contactHandle,
                    avatarColorHex = current.avatarColorHex,
                    type = current.callType,
                    direction = "outgoing",
                    timestamp = "Just now",
                    duration = durationFormatted,
                    encrypted = true,
                    createdAtMs = now
                )
            )
        }
    }
}

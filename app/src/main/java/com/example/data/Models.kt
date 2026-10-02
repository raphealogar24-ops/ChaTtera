package com.example.data

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "contacts")
data class ContactEntity(
    @PrimaryKey val id: String,
    val name: String,
    val handle: String,
    val avatarColorHex: Long,
    val online: Boolean,
    val timeLabel: String,
    val initialMessage: String,
    val unreadCount: Int,
    val statusStoryText: String,
    val statusTimeAgo: String,
    val statusBgStartHex: Long,
    val statusBgEndHex: Long,
    val phoneDisplay: String,
    val keyFingerprint: String
)

@Entity(tableName = "messages")
data class MessageEntity(
    @PrimaryKey val id: String,
    val conversationId: String,
    val senderId: String,
    val recipientId: String,
    val senderKeyFingerprint: String,
    val ciphertext: String,
    val iv: String,
    val algorithm: String = "ECDH-P256-AES256GCM",
    val deliveryStatus: String, // "sent", "delivered", "verified", "revoked"
    val plaintext: String,
    val decryptionOk: Boolean = true,
    val reactionsCsv: String = "",
    val createdAtMs: Long = System.currentTimeMillis()
)

@Entity(tableName = "call_logs")
data class CallLogEntity(
    @PrimaryKey val id: String,
    val contactName: String,
    val contactHandle: String,
    val avatarColorHex: Long,
    val type: String, // "audio" | "video"
    val direction: String, // "incoming" | "outgoing" | "missed"
    val timestamp: String,
    val duration: String,
    val encrypted: Boolean = true,
    val createdAtMs: Long = System.currentTimeMillis()
)

@Entity(tableName = "wallet_transactions")
data class WalletTransactionEntity(
    @PrimaryKey val id: String,
    val title: String,
    val counterparty: String,
    val amountNaira: Long,
    val type: String, // "credit" | "debit"
    val timestamp: String,
    val reference: String,
    val createdAtMs: Long = System.currentTimeMillis()
)

@Entity(tableName = "stories")
data class StoryEntity(
    @PrimaryKey val id: String,
    val name: String,
    val handle: String,
    val avatarColorHex: Long,
    val text: String,
    val timeAgo: String,
    val bgStartHex: Long,
    val bgEndHex: Long,
    val keyFingerprint: String,
    val isOwn: Boolean = false,
    val createdAtMs: Long = System.currentTimeMillis()
)

data class LocalSessionUser(
    val uid: String,
    val displayName: String,
    val handle: String,
    val email: String,
    val avatarColorHex: Long,
    val statusText: String = "Available on Chattera — send a message or voice note!"
)

data class ActiveCallSession(
    val contactName: String,
    val contactHandle: String,
    val avatarColorHex: Long,
    val callType: String, // "audio" | "video"
    val keyFingerprint: String
)

data class ReplyQuote(
    val senderName: String,
    val snippet: String
)

enum class MessageKind {
    STANDARD, STEALTH, PAYMENT, VOICE, IMAGE
}

data class ParsedMessagePayload(
    val kind: MessageKind,
    val burnSeconds: Int? = null,
    val amountNaira: Long? = null,
    val paymentRef: String? = null,
    val voiceId: String? = null,
    val voiceDurationSec: Int? = null,
    val voicePeaks: List<Int>? = null,
    val imageLabel: String? = null,
    val imageUri: String? = null,
    val replyQuote: ReplyQuote? = null,
    val body: String
)

fun parseSpecialPayload(plaintext: String): ParsedMessagePayload {
    var working = plaintext
    var replyQuote: ReplyQuote? = null

    if (working.startsWith("[REPLY:")) {
        val replyRegex = Regex("^\\[REPLY:([^:]+):([^\\]]+)\\]\\s*([\\s\\S]*)$")
        val match = replyRegex.find(working)
        if (match != null) {
            replyQuote = ReplyQuote(
                senderName = match.groupValues[1],
                snippet = match.groupValues[2]
            )
            working = match.groupValues[3]
        }
    }

    if (working.startsWith("[VOICE:")) {
        val voiceRegex = Regex("^\\[VOICE:([^:]+):(\\d+):([0-9,]+)\\]([\\s\\S]*)$")
        val match = voiceRegex.find(working)
        if (match != null) {
            val peaks = match.groupValues[3]
                .split(",")
                .mapNotNull { it.trim().toIntOrNull() }
                .ifEmpty { listOf(35, 65, 80, 45, 90, 70, 50, 85, 60, 40) }
            return ParsedMessagePayload(
                kind = MessageKind.VOICE,
                voiceId = match.groupValues[1],
                voiceDurationSec = (match.groupValues[2].toIntOrNull() ?: 4).coerceAtLeast(1),
                voicePeaks = peaks,
                body = match.groupValues[4].trim().ifBlank { "Voice message" },
                replyQuote = replyQuote
            )
        }
    }

    if (working.startsWith("[IMG:")) {
        val imgRegex = Regex("^\\[IMG:([^\\]]+)\\]([\\s\\S]*)$")
        val match = imgRegex.find(working)
        if (match != null) {
            return ParsedMessagePayload(
                kind = MessageKind.IMAGE,
                imageUri = match.groupValues[1].trim(),
                imageLabel = match.groupValues[2].trim().ifBlank { "Shared a photo" },
                body = match.groupValues[2].trim().ifBlank { "Shared a photo" },
                replyQuote = replyQuote
            )
        }
    }

    if (working.startsWith("[STEALTH:")) {
        val stealthRegex = Regex("^\\[STEALTH:(\\d+)s\\]([\\s\\S]*)$")
        val match = stealthRegex.find(working)
        if (match != null) {
            return ParsedMessagePayload(
                kind = MessageKind.STEALTH,
                burnSeconds = match.groupValues[1].toIntOrNull() ?: 15,
                body = match.groupValues[2].trim(),
                replyQuote = replyQuote
            )
        }
    }

    if (working.startsWith("[CHT-PAY:")) {
        val payRegex = Regex("^\\[CHT-PAY:(\\d+):([^:]+):([^\\]]+)\\]([\\s\\S]*)$")
        val match = payRegex.find(working)
        if (match != null) {
            return ParsedMessagePayload(
                kind = MessageKind.PAYMENT,
                amountNaira = match.groupValues[1].toLongOrNull() ?: 0L,
                paymentRef = match.groupValues[2],
                body = match.groupValues[3].trim().ifBlank { match.groupValues[4].trim() },
                replyQuote = replyQuote
            )
        }
    }

    return ParsedMessagePayload(
        kind = MessageKind.STANDARD,
        body = working,
        replyQuote = replyQuote
    )
}

data class DirtyDozenTestCase(
    val id: Int,
    val name: String,
    val collectionPath: String,
    val operation: String,
    val expectedResult: String = "PERMISSION_DENIED"
)

object SeedData {
    val DEFAULT_RECENT_ACCOUNTS = listOf(
        LocalSessionUser(
            uid = "user_rapheal",
            displayName = "Rapheal Ogar",
            handle = "rapheal_ogar",
            email = "rapheal@chattera.app",
            avatarColorHex = 0xFF5B4BDB,
            statusText = "Available on Chattera — send a message or voice note!"
        ),
        LocalSessionUser(
            uid = "contact_amara",
            displayName = "Amara Okafor",
            handle = "amara_okafor",
            email = "amara@chattera.app",
            avatarColorHex = 0xFFE17055,
            statusText = "Shipping the new design system 🚀✨"
        ),
        LocalSessionUser(
            uid = "contact_daniel",
            displayName = "Daniel Adeyemi",
            handle = "daniel_adeyemi",
            email = "daniel@chattera.app",
            avatarColorHex = 0xFF00B894,
            statusText = "Online and ready for voice calls 🎧"
        )
    )

    val SEED_CONTACTS = listOf(
        ContactEntity(
            id = "contact_amara",
            name = "Amara",
            handle = "amara_okafor",
            avatarColorHex = 0xFFE17055,
            online = true,
            timeLabel = "2:45 PM",
            initialMessage = "Hey, how are you doing today?",
            unreadCount = 2,
            statusStoryText = "Shipping the new Chattera E2EE release today 🚀🔒",
            statusTimeAgo = "18 mins ago",
            statusBgStartHex = 0xFF5B4BDB,
            statusBgEndHex = 0xFF3B28A8,
            phoneDisplay = "+234 803 419 8821",
            keyFingerprint = "A4F9:19C0:8B2E:771D:3C8A:90E2:55B4:12D8"
        ),
        ContactEntity(
            id = "contact_daniel",
            name = "Daniel",
            handle = "daniel_adeyemi",
            avatarColorHex = 0xFF00B894,
            online = false,
            timeLabel = "1:20 PM",
            initialMessage = "The meeting has been moved to tomorrow.",
            unreadCount = 0,
            statusStoryText = "Design review in 30 minutes — coffee first ☕",
            statusTimeAgo = "1 hour ago",
            statusBgStartHex = 0xFF00B894,
            statusBgEndHex = 0xFF0984E3,
            phoneDisplay = "+234 809 221 5402",
            keyFingerprint = "B8E1:44D2:9C0F:33A1:77E4:12B9:60C3:88F1"
        ),
        ContactEntity(
            id = "contact_sophia",
            name = "Sophia",
            handle = "sophia_mensah",
            avatarColorHex = 0xFFFD79A8,
            online = true,
            timeLabel = "12:48 PM",
            initialMessage = "📷 Photo",
            unreadCount = 5,
            statusStoryText = "Golden hour views from Victoria Island 🌅✨",
            statusTimeAgo = "2 hours ago",
            statusBgStartHex = 0xFFE17055,
            statusBgEndHex = 0xFF6C5CE7,
            phoneDisplay = "+234 812 908 3310",
            keyFingerprint = "C2D7:89A3:51E6:04B2:99F0:38C1:72D5:41A9"
        ),
        ContactEntity(
            id = "contact_devs",
            name = "Chattera Developers",
            handle = "chattera_devs",
            avatarColorHex = 0xFF0984E3,
            online = true,
            timeLabel = "Yesterday",
            initialMessage = "Michael: The new update is ready.",
            unreadCount = 8,
            statusStoryText = "ECDH P-256 + AES-256-GCM zero-trust audit passed ✅",
            statusTimeAgo = "3 hours ago",
            statusBgStartHex = 0xFF2D3436,
            statusBgEndHex = 0xFF5B4BDB,
            phoneDisplay = "Encrypted Group Channel",
            keyFingerprint = "D9A4:62C8:17F3:80E5:43B1:29D7:64A0:95E2"
        ),
        ContactEntity(
            id = "contact_grace",
            name = "Grace",
            handle = "grace_nwosu",
            avatarColorHex = 0xFF6C5CE7,
            online = false,
            timeLabel = "Yesterday",
            initialMessage = "Thank you 😊",
            unreadCount = 0,
            statusStoryText = "Grateful for a productive week 💜",
            statusTimeAgo = "5 hours ago",
            statusBgStartHex = 0xFF6C5CE7,
            statusBgEndHex = 0xFFA29BFE,
            phoneDisplay = "+234 706 554 1920",
            keyFingerprint = "F1C5:30B8:74D9:22E1:86A4:53C0:19F7:68B3"
        )
    )

    val INITIAL_CALL_LOGS = listOf(
        CallLogEntity(
            id = "call_1",
            contactName = "Amara",
            contactHandle = "amara_okafor",
            avatarColorHex = 0xFFE17055,
            type = "video",
            direction = "incoming",
            timestamp = "Today, 2:15 PM",
            duration = "14m 22s",
            encrypted = true,
            createdAtMs = System.currentTimeMillis() - 3600_000L
        ),
        CallLogEntity(
            id = "call_2",
            contactName = "Daniel",
            contactHandle = "daniel_adeyemi",
            avatarColorHex = 0xFF00B894,
            type = "audio",
            direction = "outgoing",
            timestamp = "Today, 11:40 AM",
            duration = "06m 10s",
            encrypted = true,
            createdAtMs = System.currentTimeMillis() - 7200_000L
        ),
        CallLogEntity(
            id = "call_3",
            contactName = "Sophia",
            contactHandle = "sophia_mensah",
            avatarColorHex = 0xFFFD79A8,
            type = "audio",
            direction = "missed",
            timestamp = "Yesterday, 6:05 PM",
            duration = "Missed Call",
            encrypted = true,
            createdAtMs = System.currentTimeMillis() - 14400_000L
        ),
        CallLogEntity(
            id = "call_4",
            contactName = "Grace",
            contactHandle = "grace_nwosu",
            avatarColorHex = 0xFF6C5CE7,
            type = "video",
            direction = "outgoing",
            timestamp = "Yesterday, 3:30 PM",
            duration = "21m 08s",
            encrypted = true,
            createdAtMs = System.currentTimeMillis() - 28800_000L
        )
    )

    val INITIAL_WALLET_TRANSACTIONS = listOf(
        WalletTransactionEntity(
            id = "tx_101",
            title = "Received from Amara",
            counterparty = "@amara_okafor",
            amountNaira = 45000L,
            type = "credit",
            timestamp = "Today, 1:50 PM",
            reference = "CHT-E2EE-90821",
            createdAtMs = System.currentTimeMillis() - 3000_000L
        ),
        WalletTransactionEntity(
            id = "tx_102",
            title = "Transfer to Daniel",
            counterparty = "@daniel_adeyemi",
            amountNaira = 12500L,
            type = "debit",
            timestamp = "Yesterday, 4:15 PM",
            reference = "CHT-E2EE-88410",
            createdAtMs = System.currentTimeMillis() - 10000_000L
        ),
        WalletTransactionEntity(
            id = "tx_103",
            title = "Wallet Top-Up",
            counterparty = "Instant Bank Deposit",
            amountNaira = 150000L,
            type = "credit",
            timestamp = "Sep 24, 10:12 AM",
            reference = "CHT-TOPUP-77219",
            createdAtMs = System.currentTimeMillis() - 25000_000L
        )
    )

    val DIRTY_DOZEN_VECTORS = listOf(
        DirtyDozenTestCase(1, "Shadow Field Injection on Profile Creation (isAdmin: true)", "/profiles/user_alice", "create"),
        DirtyDozenTestCase(2, "Identity Spoofing on Message Creation (senderId mismatch)", "/conversations/conv_01/messages/msg_spoof_01", "create"),
        DirtyDozenTestCase(3, "Unverified Email Write Attempt on /users/user_alice", "/users/user_alice", "create"),
        DirtyDozenTestCase(4, "Cross-User PII Scrape on /users/user_bob", "/users/user_bob", "get"),
        DirtyDozenTestCase(5, "Blanket List Attempt on /users PII Collection", "/users", "list"),
        DirtyDozenTestCase(6, "Orphaned Message Creation Without Parent Conversation Batch Update", "/conversations/conv_01/messages/msg_orphan_01", "create"),
        DirtyDozenTestCase(7, "Terminal State Bypass on Locked Conversation", "/conversations/conv_locked", "update"),
        DirtyDozenTestCase(8, "Terminal State Bypass on Revoked Message", "/conversations/conv_01/messages/msg_revoked", "update"),
        DirtyDozenTestCase(9, "Tier 2 Recipient Tampering With Ciphertext", "/conversations/conv_01/messages/msg_01", "update"),
        DirtyDozenTestCase(10, "Immortal Field Mutation (participantB changed on update)", "/conversations/conv_01", "update"),
        DirtyDozenTestCase(11, "Resource Exhaustion Poisoning (oversized ciphertext > 8192 chars)", "/conversations/conv_01/messages/msg_huge", "create"),
        DirtyDozenTestCase(12, "Unauthorized List Query on Messages by Non-Participant", "/conversations/conv_01/messages", "list")
    )
}

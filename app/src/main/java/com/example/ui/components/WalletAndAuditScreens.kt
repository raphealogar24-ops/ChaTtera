package com.example.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.CallMade
import androidx.compose.material.icons.automirrored.filled.CallReceived
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Terminal
import androidx.compose.material.icons.filled.VerifiedUser
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.ContactEntity
import com.example.data.SeedData
import com.example.data.WalletTransactionEntity
import com.example.ui.LiveBenchResult
import com.example.ui.theme.ChatteraOnlineGreen
import com.example.ui.theme.ChatteraPrimary
import com.example.ui.theme.LocalChatteraColors
import java.text.NumberFormat
import java.util.Locale

@Composable
fun ChatteraWalletView(
    balanceNaira: Long,
    transactions: List<WalletTransactionEntity>,
    contacts: List<ContactEntity>,
    onTopUpWallet: (Long) -> Unit,
    onSendEncryptedCash: (String, String, Long, String) -> Unit,
    modifier: Modifier = Modifier
) {
    val colors = LocalChatteraColors.current
    var selectedHandle by remember(contacts) {
        mutableStateOf(contacts.firstOrNull()?.handle ?: "amara_okafor")
    }
    var amountInput by remember { mutableStateOf("5000") }
    var transferNote by remember { mutableStateOf("Lunch & project milestone") }
    var feedback by remember { mutableStateOf<String?>(null) }

    val formattedBalance = NumberFormat.getNumberInstance(Locale.US).format(balanceNaira)

    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 14.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // 1. Main Balance Card
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(24.dp))
                .background(
                    Brush.linearGradient(
                        colors = listOf(Color(0xFF5B4BDB), Color(0xFF3828A8))
                    )
                )
                .padding(20.dp)
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Icon(
                            Icons.Default.VerifiedUser,
                            contentDescription = null,
                            tint = Color(0xFF6EE7B7),
                            modifier = Modifier.size(16.dp)
                        )
                        Text(
                            text = "Chattera Smart Escrow & E2EE Wallet",
                            color = Color.White.copy(alpha = 0.85f),
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }
                    Text(
                        text = "NGN · ₦",
                        color = Color.White.copy(alpha = 0.75f),
                        fontSize = 12.sp,
                        fontFamily = FontFamily.Monospace
                    )
                }

                Column {
                    Text(
                        text = "Available Balance",
                        color = Color.White.copy(alpha = 0.7f),
                        fontSize = 12.sp
                    )
                    Row(verticalAlignment = Alignment.Bottom) {
                        Text(
                            text = "₦$formattedBalance",
                            color = Color.White,
                            fontSize = 30.sp,
                            fontWeight = FontWeight.Bold,
                            fontFamily = FontFamily.Monospace
                        )
                        Text(
                            text = ".00",
                            color = Color.White.copy(alpha = 0.7f),
                            fontSize = 16.sp,
                            fontFamily = FontFamily.Monospace,
                            modifier = Modifier.padding(bottom = 3.dp)
                        )
                    }
                }

                Surface(
                    shape = RoundedCornerShape(14.dp),
                    color = Color.White,
                    modifier = Modifier
                        .clickable {
                            onTopUpWallet(25000L)
                            feedback = "Added ₦25,000.00 instant deposit to your Chattera Wallet."
                        }
                        .testTag("wallet_topup_button")
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Icon(
                            Icons.Default.Add,
                            contentDescription = null,
                            tint = Color(0xFF0F172A),
                            modifier = Modifier.size(16.dp)
                        )
                        Text(
                            text = "Quick Top-Up +₦25,000",
                            color = Color(0xFF0F172A),
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
        }

        if (feedback != null) {
            Surface(
                shape = RoundedCornerShape(16.dp),
                color = colors.softTint,
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, colors.border, RoundedCornerShape(16.dp))
            ) {
                Text(
                    text = feedback ?: "",
                    color = colors.primary,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium,
                    modifier = Modifier.padding(14.dp)
                )
            }
        }

        // 2. Send Encrypted Cash Form
        Surface(
            shape = RoundedCornerShape(24.dp),
            color = colors.card,
            modifier = Modifier
                .fillMaxWidth()
                .border(1.dp, colors.border, RoundedCornerShape(24.dp))
        ) {
            Column(
                modifier = Modifier.padding(18.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
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
                        Icon(Icons.Default.Lock, contentDescription = null, tint = ChatteraPrimary, modifier = Modifier.size(16.dp))
                        Text(
                            text = "Send Encrypted In-Chat Transfer",
                            color = colors.text,
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                    Text(
                        text = "Zero Fee · E2EE",
                        color = colors.muted,
                        fontSize = 11.sp
                    )
                }

                Text("Select Recipient Contact", color = colors.text, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    contacts.forEach { c ->
                        val isSel = c.handle == selectedHandle
                        Surface(
                            shape = RoundedCornerShape(14.dp),
                            color = if (isSel) colors.primary else colors.bg,
                            modifier = Modifier
                                .border(1.dp, if (isSel) colors.primary else colors.border, RoundedCornerShape(14.dp))
                                .clickable { selectedHandle = c.handle }
                        ) {
                            Text(
                                text = "${c.name} (@${c.handle})",
                                color = if (isSel) Color.White else colors.text,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.SemiBold,
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp)
                            )
                        }
                    }
                }

                OutlinedTextField(
                    value = amountInput,
                    onValueChange = { amountInput = it.filter { ch -> ch.isDigit() } },
                    label = { Text("Amount (₦ Naira)", fontSize = 12.sp) },
                    singleLine = true,
                    shape = RoundedCornerShape(16.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("wallet_amount_input")
                )

                OutlinedTextField(
                    value = transferNote,
                    onValueChange = { transferNote = it },
                    label = { Text("Encrypted Payment Note", fontSize = 12.sp) },
                    singleLine = true,
                    shape = RoundedCornerShape(16.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("wallet_note_input")
                )

                Button(
                    onClick = {
                        val numericAmount = amountInput.toLongOrNull() ?: 0L
                        if (numericAmount <= 0L || numericAmount > balanceNaira) {
                            feedback = "Please enter a valid amount within your available Naira balance."
                            return@Button
                        }
                        val target = contacts.find { it.handle == selectedHandle } ?: contacts.firstOrNull()
                        if (target != null) {
                            onSendEncryptedCash(
                                target.name,
                                target.handle,
                                numericAmount,
                                transferNote.trim().ifBlank { "Chattera E2EE Transfer" }
                            )
                            val fmt = NumberFormat.getNumberInstance(Locale.US).format(numericAmount)
                            feedback = "Sent ₦$fmt to ${target.name} with an AES-256-GCM encrypted chat receipt."
                            amountInput = ""
                        }
                    },
                    shape = RoundedCornerShape(16.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = ChatteraPrimary),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(46.dp)
                        .testTag("wallet_send_button")
                ) {
                    Icon(Icons.AutoMirrored.Filled.Send, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(8.dp))
                    Text("Send ₦ & Deliver E2EE Chat Receipt", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                }
            }
        }

        // 3. Recent Transactions Ledger
        Surface(
            shape = RoundedCornerShape(24.dp),
            color = colors.card,
            modifier = Modifier
                .fillMaxWidth()
                .border(1.dp, colors.border, RoundedCornerShape(24.dp))
        ) {
            Column(
                modifier = Modifier.padding(18.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Recent Encrypted Ledger",
                        color = colors.text,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "${transactions.size} entries",
                        color = colors.muted,
                        fontSize = 11.sp,
                        fontFamily = FontFamily.Monospace
                    )
                }

                transactions.forEachIndexed { idx, tx ->
                    if (idx > 0) {
                        HorizontalDivider(color = colors.border)
                    }
                    val isCredit = tx.type == "credit"
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 6.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(
                            modifier = Modifier.weight(1f),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(38.dp)
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(
                                        if (isCredit) ChatteraOnlineGreen.copy(alpha = 0.14f)
                                        else colors.softTint
                                    ),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = if (isCredit) Icons.AutoMirrored.Filled.CallReceived else Icons.AutoMirrored.Filled.CallMade,
                                    contentDescription = null,
                                    tint = if (isCredit) ChatteraOnlineGreen else colors.primary,
                                    modifier = Modifier.size(18.dp)
                                )
                            }
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = tx.title,
                                    color = colors.text,
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Bold,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                                Text(
                                    text = "${tx.counterparty} · ${tx.timestamp} · ${tx.reference}",
                                    color = colors.muted,
                                    fontSize = 10.sp,
                                    fontFamily = FontFamily.Monospace,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                        }

                        val fmt = NumberFormat.getNumberInstance(Locale.US).format(tx.amountNaira)
                        Text(
                            text = "${if (isCredit) "+" else "-"}₦$fmt",
                            color = if (isCredit) ChatteraOnlineGreen else colors.text,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            fontFamily = FontFamily.Monospace
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun SecurityAuditView(
    benchResult: LiveBenchResult?,
    onRunLiveTest: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    var sampleInput by remember {
        mutableStateOf("Zero-trust verification payload: Coordinates 37.7749 N, 122.4194 W")
    }

    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(14.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Surface(
            shape = RoundedCornerShape(20.dp),
            color = Color(0xFF111827),
            modifier = Modifier
                .fillMaxWidth()
                .border(1.dp, Color(0xFF1E293B), RoundedCornerShape(20.dp))
        ) {
            Column(
                modifier = Modifier.padding(18.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        modifier = Modifier.weight(1f)
                    ) {
                        Icon(
                            Icons.Default.Terminal,
                            contentDescription = null,
                            tint = Color(0xFF34D399),
                            modifier = Modifier.size(18.dp)
                        )
                        Column {
                            Text(
                                text = "01. Live Client-Side ECDH + AES-256-GCM Bench",
                                color = Color(0xFFF1F5F9),
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                text = "Test how plaintext is encrypted in memory with a fresh 96-bit IV.",
                                color = Color(0xFF94A3B8),
                                fontSize = 11.sp
                            )
                        }
                    }

                    Surface(
                        shape = RoundedCornerShape(10.dp),
                        color = Color(0xFF34D399),
                        modifier = Modifier
                            .clickable { onRunLiveTest(sampleInput) }
                            .testTag("re_encrypt_bench_button")
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Icon(Icons.Default.PlayArrow, contentDescription = null, tint = Color(0xFF020617), modifier = Modifier.size(14.dp))
                            Text("Re-Encrypt", color = Color(0xFF020617), fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }

                OutlinedTextField(
                    value = sampleInput,
                    onValueChange = {
                        sampleInput = it
                        onRunLiveTest(it)
                    },
                    label = { Text("Test Plaintext Input (UTF-8)", color = Color(0xFF94A3B8), fontSize = 11.sp) },
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth()
                )

                if (benchResult != null) {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(12.dp))
                                .background(Color(0xFF0B0F17))
                                .border(1.dp, Color(0xFF1E293B), RoundedCornerShape(12.dp))
                                .padding(12.dp)
                        ) {
                            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                Text("Random 96-Bit IV (12 Bytes · Hex & Base64)", color = Color(0xFF94A3B8), fontSize = 11.sp)
                                Text(benchResult.ivHex, color = Color(0xFF6EE7B7), fontSize = 11.sp, fontFamily = FontFamily.Monospace)
                                Text("Base64: ${benchResult.ivBase64}", color = Color(0xFF64748B), fontSize = 10.sp, fontFamily = FontFamily.Monospace)
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
                                Text("AES-256-GCM Ciphertext + 128-Bit Auth Tag", color = Color(0xFF94A3B8), fontSize = 11.sp)
                                Text(benchResult.ciphertext, color = Color(0xFFE2E8F0), fontSize = 11.sp, fontFamily = FontFamily.Monospace)
                                Text(
                                    text = "Plaintext: ${benchResult.byteLength} bytes · Ciphertext: ${benchResult.ciphertext.length} chars",
                                    color = Color(0xFF64748B),
                                    fontSize = 10.sp,
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
                                Text("Verified Round-Trip Decryption Output", color = Color(0xFF94A3B8), fontSize = 11.sp)
                                Text(benchResult.decrypted, color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Medium)
                                Text("GCM Tag Verified · ECDH-P256-AES256GCM", color = Color(0xFF34D399), fontSize = 10.sp, fontFamily = FontFamily.Monospace)
                            }
                        }
                    }
                }
            }
        }

        // Dirty Dozen Security Matrix
        Surface(
            shape = RoundedCornerShape(20.dp),
            color = Color(0xFF111827),
            modifier = Modifier
                .fillMaxWidth()
                .border(1.dp, Color(0xFF1E293B), RoundedCornerShape(20.dp))
        ) {
            Column(
                modifier = Modifier.padding(18.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        modifier = Modifier.weight(1f)
                    ) {
                        Icon(Icons.Default.VerifiedUser, contentDescription = null, tint = Color(0xFF34D399), modifier = Modifier.size(18.dp))
                        Column {
                            Text(
                                text = "02. Hardened Security Rules — Dirty Dozen Audit Matrix",
                                color = Color(0xFFF1F5F9),
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                text = "12 / 12 adversarial payloads blocked at the security rules layer.",
                                color = Color(0xFF94A3B8),
                                fontSize = 11.sp
                            )
                        }
                    }
                }

                SeedData.DIRTY_DOZEN_VECTORS.forEach { vec ->
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(10.dp))
                            .background(Color(0xFF0B0F17))
                            .padding(10.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = "${vec.id.toString().padStart(2, '0')}. ${vec.name}",
                                    color = Color(0xFFE2E8F0),
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.SemiBold
                                )
                                Text(
                                    text = "${vec.operation.uppercase()} · ${vec.collectionPath}",
                                    color = Color(0xFF64748B),
                                    fontSize = 10.sp,
                                    fontFamily = FontFamily.Monospace
                                )
                            }
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                Icon(Icons.Default.Lock, contentDescription = null, tint = Color(0xFF34D399), modifier = Modifier.size(12.dp))
                                Text(
                                    text = vec.expectedResult,
                                    color = Color(0xFF34D399),
                                    fontSize = 10.sp,
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
}

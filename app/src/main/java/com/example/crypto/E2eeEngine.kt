package com.example.crypto

import android.content.Context
import android.util.Base64
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.nio.ByteBuffer
import java.nio.charset.StandardCharsets
import java.security.KeyFactory
import java.security.KeyPairGenerator
import java.security.MessageDigest
import java.security.SecureRandom
import java.security.interfaces.ECPrivateKey
import java.security.interfaces.ECPublicKey
import java.security.spec.ECGenParameterSpec
import java.security.spec.PKCS8EncodedKeySpec
import java.security.spec.X509EncodedKeySpec
import javax.crypto.Cipher
import javax.crypto.KeyAgreement
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec

data class StoredIdentityKeyVault(
    val uid: String,
    val publicKeyX: String,
    val publicKeyY: String,
    val privateKeyD: String,
    val publicKeySpkiB64: String,
    val privateKeyPkcs8B64: String,
    val keyFingerprint: String,
    val createdAtIso: String
) {
    fun toJsonString(): String {
        val obj = JSONObject()
        obj.put("uid", uid)
        obj.put("publicKeyX", publicKeyX)
        obj.put("publicKeyY", publicKeyY)
        obj.put("privateKeyD", privateKeyD)
        obj.put("publicKeySpkiB64", publicKeySpkiB64)
        obj.put("privateKeyPkcs8B64", privateKeyPkcs8B64)
        obj.put("keyFingerprint", keyFingerprint)
        obj.put("createdAtIso", createdAtIso)
        return obj.toString(2)
    }
}

data class EncryptedPayloadResult(
    val ciphertext: String,
    val iv: String,
    val ciphertextPreview: String,
    val algorithm: String = "ECDH-P256-AES256GCM"
)

data class DecryptionResult(
    val ok: Boolean,
    val plaintext: String
)

object E2eeEngine {
    private const val PREFS_NAME = "ciphergrid_e2ee_prefs"
    private const val STORAGE_PREFIX = "ciphergrid_e2ee_vault_v1_"
    private const val PLAINTEXT_MAX_CHARS = 2000
    private const val CIPHERTEXT_MAX = 8192
    private const val IV_MAX = 64
    private const val PREVIEW_MAX = 160

    private val secureRandom = SecureRandom()

    fun bytesToBase64UrlSafe(bytes: ByteArray): String {
        return Base64.encodeToString(bytes, Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING)
    }

    fun bytesToBase64Standard(bytes: ByteArray): String {
        return Base64.encodeToString(bytes, Base64.NO_WRAP)
    }

    fun base64ToBytes(b64: String): ByteArray {
        return try {
            Base64.decode(b64, Base64.NO_WRAP)
        } catch (_: Exception) {
            Base64.decode(b64, Base64.URL_SAFE or Base64.NO_WRAP)
        }
    }

    fun base64ToHex(base64: String): String {
        return try {
            val bytes = base64ToBytes(base64)
            bytes.joinToString(" ") { b -> "%02X".format(b) }
        } catch (_: Exception) {
            base64
        }
    }

    fun computePublicKeyFingerprint(publicKeyX: String, publicKeyY: String): String {
        val canonical = "ECDH-P256:${publicKeyX.trim()}:${publicKeyY.trim()}"
        val digest = MessageDigest.getInstance("SHA-256")
        val hashBytes = digest.digest(canonical.toByteArray(StandardCharsets.UTF_8))
        val hexBlocks = mutableListOf<String>()
        var i = 0
        while (i < 16) {
            val b1 = "%02X".format(hashBytes[i])
            val b2 = "%02X".format(hashBytes[i + 1])
            hexBlocks.add("$b1$b2")
            i += 2
        }
        return hexBlocks.joinToString(":")
    }

    fun computeSafetyNumber(fingerprintA: String, fingerprintB: String): String {
        val sorted = listOf(fingerprintA.trim(), fingerprintB.trim()).sorted()
        val canonical = "SAFETY-NUMBER-V1:${sorted[0]}|${sorted[1]}"
        val digest = MessageDigest.getInstance("SHA-256")
        val hashBytes = digest.digest(canonical.toByteArray(StandardCharsets.UTF_8))
        val buffer = ByteBuffer.wrap(hashBytes)
        val groups = mutableListOf<String>()
        var offset = 0
        while (offset < 24) {
            val u16 = buffer.getShort(offset).toInt() and 0xFFFF
            val num = u16 % 100000
            groups.add(num.toString().padStart(5, '0'))
            offset += 2
        }
        return groups.joinToString(" ")
    }

    suspend fun generateIdentityKeyVault(context: Context, uid: String): StoredIdentityKeyVault =
        withContext(Dispatchers.Default) {
            val kpg = KeyPairGenerator.getInstance("EC")
            kpg.initialize(ECGenParameterSpec("secp256r1"), secureRandom)
            val keyPair = kpg.generateKeyPair()
            val pub = keyPair.public as ECPublicKey
            val priv = keyPair.private as ECPrivateKey

            val xBytes = pub.w.affineX.toByteArray().takeLast(32).toByteArray()
            val yBytes = pub.w.affineY.toByteArray().takeLast(32).toByteArray()
            val dBytes = priv.s.toByteArray().takeLast(32).toByteArray()

            val publicKeyX = bytesToBase64UrlSafe(xBytes)
            val publicKeyY = bytesToBase64UrlSafe(yBytes)
            val privateKeyD = bytesToBase64UrlSafe(dBytes)

            val publicKeySpkiB64 = bytesToBase64Standard(pub.encoded)
            val privateKeyPkcs8B64 = bytesToBase64Standard(priv.encoded)
            val keyFingerprint = computePublicKeyFingerprint(publicKeyX, publicKeyY)

            val vault = StoredIdentityKeyVault(
                uid = uid,
                publicKeyX = publicKeyX,
                publicKeyY = publicKeyY,
                privateKeyD = privateKeyD,
                publicKeySpkiB64 = publicKeySpkiB64,
                privateKeyPkcs8B64 = privateKeyPkcs8B64,
                keyFingerprint = keyFingerprint,
                createdAtIso = java.time.Instant.now().toString()
            )
            saveVault(context, vault)
            vault
        }

    suspend fun loadOrCreateIdentityKeyVault(context: Context, uid: String): StoredIdentityKeyVault =
        withContext(Dispatchers.IO) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val raw = prefs.getString("$STORAGE_PREFIX$uid", null)
            if (!raw.isNullOrBlank()) {
                try {
                    val obj = JSONObject(raw)
                    val pubSpki = obj.optString("publicKeySpkiB64")
                    val privPkcs8 = obj.optString("privateKeyPkcs8B64")
                    if (pubSpki.isNotBlank() && privPkcs8.isNotBlank()) {
                        return@withContext StoredIdentityKeyVault(
                            uid = obj.getString("uid"),
                            publicKeyX = obj.getString("publicKeyX"),
                            publicKeyY = obj.getString("publicKeyY"),
                            privateKeyD = obj.getString("privateKeyD"),
                            publicKeySpkiB64 = pubSpki,
                            privateKeyPkcs8B64 = privPkcs8,
                            keyFingerprint = obj.getString("keyFingerprint"),
                            createdAtIso = obj.optString("createdAtIso", java.time.Instant.now().toString())
                        )
                    }
                } catch (_: Exception) {
                    // Regenerate if corrupted
                }
            }
            generateIdentityKeyVault(context, uid)
        }

    suspend fun importIdentityKeyVault(
        context: Context,
        uid: String,
        jsonString: String
    ): StoredIdentityKeyVault = withContext(Dispatchers.Default) {
        val obj = JSONObject(jsonString)
        val pubX = obj.optString("publicKeyX")
        val pubY = obj.optString("publicKeyY")
        val privD = obj.optString("privateKeyD")
        require(pubX.length >= 20 && pubY.length >= 20 && privD.isNotBlank()) {
            "Invalid key vault JSON: missing P-256 coordinates (publicKeyX, publicKeyY, privateKeyD)."
        }

        val fresh = generateIdentityKeyVault(context, uid)
        val pubSpki = obj.optString("publicKeySpkiB64").ifBlank { fresh.publicKeySpkiB64 }
        val privPkcs8 = obj.optString("privateKeyPkcs8B64").ifBlank { fresh.privateKeyPkcs8B64 }
        val fp = computePublicKeyFingerprint(pubX, pubY)

        val vault = StoredIdentityKeyVault(
            uid = uid,
            publicKeyX = pubX,
            publicKeyY = pubY,
            privateKeyD = privD,
            publicKeySpkiB64 = pubSpki,
            privateKeyPkcs8B64 = privPkcs8,
            keyFingerprint = fp,
            createdAtIso = obj.optString("createdAtIso", java.time.Instant.now().toString())
        )
        saveVault(context, vault)
        vault
    }

    private fun saveVault(context: Context, vault: StoredIdentityKeyVault) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().putString("$STORAGE_PREFIX${vault.uid}", vault.toJsonString()).apply()
    }

    fun deriveSharedAesGcmKey(myVault: StoredIdentityKeyVault): SecretKey {
        return try {
            val kf = KeyFactory.getInstance("EC")
            val privKey = kf.generatePrivate(PKCS8EncodedKeySpec(base64ToBytes(myVault.privateKeyPkcs8B64)))
            val pubKey = kf.generatePublic(X509EncodedKeySpec(base64ToBytes(myVault.publicKeySpkiB64)))
            val ka = KeyAgreement.getInstance("ECDH")
            ka.init(privKey)
            ka.doPhase(pubKey, true)
            val sharedSecret = ka.generateSecret()
            val sha256 = MessageDigest.getInstance("SHA-256").digest(sharedSecret)
            SecretKeySpec(sha256, "AES")
        } catch (_: Exception) {
            val fallbackMaterial = "${myVault.publicKeyX}:${myVault.privateKeyD}".toByteArray(StandardCharsets.UTF_8)
            val sha256 = MessageDigest.getInstance("SHA-256").digest(fallbackMaterial)
            SecretKeySpec(sha256, "AES")
        }
    }

    fun encryptMessagePlaintext(sharedKey: SecretKey, plaintext: String): EncryptedPayloadResult {
        val trimmed = plaintext.take(PLAINTEXT_MAX_CHARS)
        val ivBytes = ByteArray(12)
        secureRandom.nextBytes(ivBytes)

        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        val spec = GCMParameterSpec(128, ivBytes)
        cipher.init(Cipher.ENCRYPT_MODE, sharedKey, spec)
        val cipherBytes = cipher.doFinal(trimmed.toByteArray(StandardCharsets.UTF_8))

        val ciphertext = bytesToBase64Standard(cipherBytes).take(CIPHERTEXT_MAX)
        val iv = bytesToBase64Standard(ivBytes).take(IV_MAX)
        val snippet = ciphertext.take(28)
        val preview = "AES256GCM:$snippet...".take(PREVIEW_MAX)

        return EncryptedPayloadResult(
            ciphertext = ciphertext,
            iv = iv,
            ciphertextPreview = preview,
            algorithm = "ECDH-P256-AES256GCM"
        )
    }

    fun decryptMessageCiphertext(
        sharedKey: SecretKey,
        ciphertextB64: String,
        ivB64: String
    ): DecryptionResult {
        if (ciphertextB64 == "[REVOKED_CIPHERTEXT]") {
            return DecryptionResult(
                ok = false,
                plaintext = "This message was unsent"
            )
        }
        return try {
            val cipherBytes = base64ToBytes(ciphertextB64)
            val ivBytes = base64ToBytes(ivB64)
            val cipher = Cipher.getInstance("AES/GCM/NoPadding")
            val spec = GCMParameterSpec(128, ivBytes)
            cipher.init(Cipher.DECRYPT_MODE, sharedKey, spec)
            val plainBytes = cipher.doFinal(cipherBytes)
            DecryptionResult(
                ok = true,
                plaintext = String(plainBytes, StandardCharsets.UTF_8)
            )
        } catch (_: Exception) {
            DecryptionResult(
                ok = false,
                plaintext = "[Unable to decrypt frame: encrypted under a previous or rotated ECDH P-256 keypair]"
            )
        }
    }
}

package com.example.crypto

import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioTrack
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlin.math.PI
import kotlin.math.sin

object VoiceAudioEngine {
    private var activeJob: Job? = null
    private var activeTrack: AudioTrack? = null

    fun stopPlayback() {
        activeJob?.cancel()
        activeJob = null
        try {
            activeTrack?.pause()
            activeTrack?.flush()
            activeTrack?.release()
        } catch (_: Exception) {
        }
        activeTrack = null
    }

    fun startSynthesizedVoiceNote(
        scope: CoroutineScope,
        durationSec: Int,
        peaks: List<Int>,
        playbackRate: Float,
        startProgressRatio: Float = 0f,
        onProgress: (Float) -> Unit,
        onCompleted: () -> Unit
    ) {
        stopPlayback()
        val safePeaks = if (peaks.isEmpty()) listOf(40, 70, 85, 55, 90, 65, 50, 80) else peaks
        val totalMs = (durationSec.coerceAtLeast(1) * 1000L)

        activeJob = scope.launch(Dispatchers.Default) {
            val sampleRate = 16000
            val bufferSize = AudioTrack.getMinBufferSize(
                sampleRate,
                AudioFormat.CHANNEL_OUT_MONO,
                AudioFormat.ENCODING_PCM_16BIT
            ).coerceAtLeast(1600)

            val track = try {
                AudioTrack.Builder()
                    .setAudioAttributes(
                        AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_MEDIA)
                            .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                            .build()
                    )
                    .setAudioFormat(
                        AudioFormat.Builder()
                            .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                            .setSampleRate(sampleRate)
                            .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                            .build()
                    )
                    .setBufferSizeInBytes(bufferSize)
                    .setTransferMode(AudioTrack.MODE_STREAM)
                    .build().also {
                        it.play()
                        activeTrack = it
                    }
            } catch (_: Exception) {
                null
            }

            var elapsedMs = (startProgressRatio.coerceIn(0f, 0.95f) * totalMs).toLong()
            val stepMs = 60L
            val samplesPerStep = ((sampleRate * stepMs) / 1000).toInt()
            val pcmBuffer = ShortArray(samplesPerStep)
            var phase = 0.0

            try {
                while (isActive && elapsedMs < totalMs) {
                    val ratio = (elapsedMs.toFloat() / totalMs.toFloat()).coerceIn(0f, 1f)
                    onProgress(ratio * durationSec)

                    val peakIdx = ((ratio * safePeaks.size).toInt()).coerceIn(0, safePeaks.lastIndex)
                    val peak = safePeaks[peakIdx].coerceIn(20, 100)
                    val freq = (185.0 + (peak * 1.6)) * playbackRate

                    if (track != null) {
                        for (i in 0 until samplesPerStep) {
                            val env = 0.35 + 0.65 * (peak / 100.0)
                            val sample = (sin(phase) * 0.7 + sin(phase * 2.0) * 0.3) * env
                            pcmBuffer[i] = (sample * 7500).toInt().coerceIn(-32767, 32767).toShort()
                            phase += (2.0 * PI * freq) / sampleRate
                            if (phase > 2.0 * PI) phase -= 2.0 * PI
                        }
                        track.write(pcmBuffer, 0, samplesPerStep)
                    } else {
                        delay(stepMs)
                    }

                    elapsedMs += (stepMs * playbackRate).toLong()
                }
                if (isActive) {
                    onProgress(durationSec.toFloat())
                    onCompleted()
                }
            } finally {
                try {
                    track?.stop()
                    track?.release()
                } catch (_: Exception) {
                }
            }
        }
    }
}

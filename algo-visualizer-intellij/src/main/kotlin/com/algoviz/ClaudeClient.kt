package com.algoviz

import com.intellij.openapi.diagnostic.Logger
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.time.Duration
import org.json.JSONArray
import org.json.JSONObject

/**
 * Thin wrapper around Anthropic's Messages API. One-shot call, no streaming.
 *
 * @throws ClaudeException for HTTP errors, API errors, or empty completions.
 */
object ClaudeClient {
    private val log = Logger.getInstance(ClaudeClient::class.java)
    private const val ENDPOINT = "https://api.anthropic.com/v1/messages"
    private const val ANTHROPIC_VERSION = "2023-06-01"

    private val client: HttpClient = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(15))
        .build()

    fun generateVisualization(
        code: String,
        hint: String,
        apiKey: String,
        model: String
    ): String {
        val prompt = PromptBuilder.build(code, hint)

        val body = JSONObject().apply {
            put("model", model)
            put("max_tokens", 8192)
            put("messages", JSONArray().put(JSONObject().apply {
                put("role", "user")
                put("content", prompt)
            }))
        }.toString()

        val request = HttpRequest.newBuilder()
            .uri(URI.create(ENDPOINT))
            .header("Content-Type", "application/json")
            .header("x-api-key", apiKey)
            .header("anthropic-version", ANTHROPIC_VERSION)
            .timeout(Duration.ofSeconds(120))
            .POST(HttpRequest.BodyPublishers.ofString(body))
            .build()

        val response: HttpResponse<String> = try {
            client.send(request, HttpResponse.BodyHandlers.ofString())
        } catch (e: Exception) {
            log.warn("Claude request failed", e)
            throw ClaudeException("Network error: ${e.message}", e)
        }

        val parsed = try {
            JSONObject(response.body())
        } catch (e: Exception) {
            throw ClaudeException("Invalid JSON from API: ${response.body().take(200)}", e)
        }

        if (parsed.has("error")) {
            val msg = parsed.getJSONObject("error").optString("message", "unknown error")
            throw ClaudeException(msg)
        }

        val text = parsed.optJSONArray("content")
            ?.optJSONObject(0)
            ?.optString("text")
            ?.trim()
            .orEmpty()

        if (text.isEmpty()) {
            throw ClaudeException("Empty response from Claude")
        }

        // Strip optional markdown fences (mirrors VS Code extension behavior)
        val fenced = Regex("""^```(?:html)?\s*\n([\s\S]*?)```\s*$""").find(text)
        return fenced?.groupValues?.get(1)?.trim() ?: text
    }
}

class ClaudeException(message: String, cause: Throwable? = null) : RuntimeException(message, cause)

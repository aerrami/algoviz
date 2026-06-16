package com.algoviz

import com.intellij.ide.util.PropertiesComponent

object AlgoVizSettings {
    private const val KEY_API = "algoviz.apiKey"
    private const val KEY_MODEL = "algoviz.model"
    private const val KEY_SYNC = "algoviz.syncEditorCursor"

    const val DEFAULT_MODEL = "claude-sonnet-4-6"

    val AVAILABLE_MODELS = listOf(
        "claude-opus-4-8",
        "claude-sonnet-4-6",
        "claude-haiku-4-5-20251001"
    )

    private val props get() = PropertiesComponent.getInstance()

    var apiKey: String
        get() = props.getValue(KEY_API, "").trim()
        set(value) = props.setValue(KEY_API, value.trim(), "")

    var model: String
        get() = props.getValue(KEY_MODEL, DEFAULT_MODEL)
        set(value) = props.setValue(KEY_MODEL, value, DEFAULT_MODEL)

    var syncEditorCursor: Boolean
        get() = props.getBoolean(KEY_SYNC, true)
        set(value) = props.setValue(KEY_SYNC, value, true)
}

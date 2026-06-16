package com.algoviz

import com.intellij.openapi.options.Configurable
import com.intellij.ui.components.JBCheckBox
import com.intellij.ui.components.JBLabel
import com.intellij.ui.components.JBPasswordField
import com.intellij.util.ui.FormBuilder
import javax.swing.JComboBox
import javax.swing.JComponent
import javax.swing.JPanel

class AlgoVizConfigurable : Configurable {

    private var apiKeyField: JBPasswordField? = null
    private var modelCombo: JComboBox<String>? = null
    private var syncCheck: JBCheckBox? = null
    private var rootPanel: JPanel? = null

    override fun getDisplayName(): String = "Algorithm Visualizer"

    override fun createComponent(): JComponent {
        val apiKey = JBPasswordField().apply {
            text = AlgoVizSettings.apiKey
            columns = 40
        }
        val model = JComboBox(AlgoVizSettings.AVAILABLE_MODELS.toTypedArray()).apply {
            selectedItem = AlgoVizSettings.model
        }
        val sync = JBCheckBox("Highlight the current step's line in the editor").apply {
            isSelected = AlgoVizSettings.syncEditorCursor
        }

        apiKeyField = apiKey
        modelCombo = model
        syncCheck = sync

        val panel = FormBuilder.createFormBuilder()
            .addLabeledComponent(JBLabel("Anthropic API key:"), apiKey, 1, false)
            .addComponent(JBLabel("Get one at https://console.anthropic.com"))
            .addLabeledComponent(JBLabel("Model:"), model, 1, false)
            .addComponent(sync)
            .addComponentFillVertically(JPanel(), 0)
            .panel

        rootPanel = panel
        return panel
    }

    override fun isModified(): Boolean {
        val apiKey = apiKeyField?.password?.concatToString().orEmpty()
        val model = modelCombo?.selectedItem as? String ?: AlgoVizSettings.DEFAULT_MODEL
        val sync = syncCheck?.isSelected ?: true
        return apiKey != AlgoVizSettings.apiKey ||
                model != AlgoVizSettings.model ||
                sync != AlgoVizSettings.syncEditorCursor
    }

    override fun apply() {
        AlgoVizSettings.apiKey = apiKeyField?.password?.concatToString().orEmpty()
        AlgoVizSettings.model =
            modelCombo?.selectedItem as? String ?: AlgoVizSettings.DEFAULT_MODEL
        AlgoVizSettings.syncEditorCursor = syncCheck?.isSelected ?: true
    }

    override fun reset() {
        apiKeyField?.text = AlgoVizSettings.apiKey
        modelCombo?.selectedItem = AlgoVizSettings.model
        syncCheck?.isSelected = AlgoVizSettings.syncEditorCursor
    }

    override fun disposeUIResources() {
        apiKeyField = null
        modelCombo = null
        syncCheck = null
        rootPanel = null
    }
}

package com.algoviz

import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.actionSystem.CommonDataKeys
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.ui.Messages
import com.intellij.openapi.wm.ToolWindowManager

class VisualizeAction : AnAction() {

    private val log = Logger.getInstance(VisualizeAction::class.java)

    override fun update(e: AnActionEvent) {
        val editor = e.getData(CommonDataKeys.EDITOR)
        val file = e.getData(CommonDataKeys.PSI_FILE)
        val isPython = file?.language?.id.equals("Python", ignoreCase = true)
        e.presentation.isEnabledAndVisible = editor != null && isPython == true
    }

    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return
        val editor = e.getData(CommonDataKeys.EDITOR) ?: return

        val selectionModel = editor.selectionModel
        val code = if (selectionModel.hasSelection()) {
            selectionModel.selectedText ?: ""
        } else {
            editor.document.text
        }

        if (code.isBlank()) {
            Messages.showWarningDialog(project, "No code found in the editor.", "Algorithm Visualizer")
            return
        }

        val apiKey = AlgoVizSettings.apiKey
        if (apiKey.isEmpty()) {
            val choice = Messages.showYesNoDialog(
                project,
                "Anthropic API key is not set. Open Settings now?",
                "Algorithm Visualizer",
                Messages.getQuestionIcon()
            )
            if (choice == Messages.YES) {
                com.intellij.openapi.options.ShowSettingsUtil.getInstance()
                    .showSettingsDialog(project, "Algorithm Visualizer")
            }
            return
        }

        val toolWindow = ToolWindowManager.getInstance(project)
            .getToolWindow("Algorithm Visualizer")
        toolWindow?.show {
            val panel = AlgoVizPanelHolder.get(project) ?: return@show
            panel.showLoading()

            ApplicationManager.getApplication().executeOnPooledThread {
                val result = runCatching {
                    ClaudeClient.generateVisualization(
                        code = code,
                        hint = "",
                        apiKey = apiKey,
                        model = AlgoVizSettings.model
                    )
                }

                ApplicationManager.getApplication().invokeLater {
                    result
                        .onSuccess { html -> panel.showVisualization(html) }
                        .onFailure { err ->
                            log.warn("Visualization failed", err)
                            panel.showError(err.message ?: "Unknown error")
                        }
                }
            }
        }
    }
}

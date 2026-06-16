package com.algoviz

import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.editor.Editor
import com.intellij.openapi.editor.markup.HighlighterLayer
import com.intellij.openapi.editor.markup.HighlighterTargetArea
import com.intellij.openapi.editor.markup.RangeHighlighter
import com.intellij.openapi.editor.markup.TextAttributes
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.project.Project
import com.intellij.ui.JBColor
import com.intellij.ui.jcef.JBCefBrowser
import com.intellij.ui.jcef.JBCefJSQuery
import javax.swing.JComponent

/**
 * The actual UI inside the tool window: a JCEF browser plus an editor-sync
 * bridge. The browser shows loading / generated visualization / error pages.
 *
 * Bridge: every generated page calls `window.__algoVizNotify(lineNumber)`
 * after `render()`. We inject a tiny <script> that forwards each call through
 * a JBCefJSQuery into Kotlin, where we move the editor highlighter.
 */
class AlgoVizPanel(private val project: Project) {

    private val browser: JBCefBrowser = JBCefBrowser()
    private val notifyQuery: JBCefJSQuery = JBCefJSQuery.create(browser as JBCefBrowser)
    private var currentHighlighter: RangeHighlighter? = null
    private var lastSyncedEditor: Editor? = null

    init {
        notifyQuery.addHandler { payload ->
            val line = payload.trim().toIntOrNull()
            if (line != null) {
                ApplicationManager.getApplication().invokeLater { syncEditorLine(line) }
            }
            null
        }
    }

    val component: JComponent get() = browser.component

    // ── Public entry points ──────────────────────────────────────────────────

    fun showIdle() {
        browser.loadHTML(idleHtml())
    }

    fun showLoading() {
        clearHighlight()
        browser.loadHTML(loadingHtml())
    }

    fun showVisualization(html: String) {
        browser.loadHTML(injectBridge(html))
    }

    fun showError(message: String) {
        browser.loadHTML(errorHtml(message))
    }

    fun dispose() {
        clearHighlight()
        notifyQuery.dispose()
        browser.dispose()
    }

    // ── Bridge injection ─────────────────────────────────────────────────────

    private fun injectBridge(html: String): String {
        val jsCall = notifyQuery.inject("String(line)")
        val bridge = """
            <script>
            (function () {
              window.__algoVizNotify = function (line) {
                if (typeof line === 'number') { $jsCall }
              };
            })();
            </script>
        """.trimIndent()

        return if (html.contains("</body>")) {
            html.replace("</body>", "$bridge\n</body>")
        } else {
            html + bridge
        }
    }

    // ── Editor sync ──────────────────────────────────────────────────────────

    private fun syncEditorLine(line: Int) {
        if (!AlgoVizSettings.syncEditorCursor) return
        val editor = FileEditorManager.getInstance(project).selectedTextEditor ?: return
        if (line < 1 || line > editor.document.lineCount) return

        // Move existing highlighter to the new line (cheaper than recreate).
        clearHighlight()
        val attrs = TextAttributes().apply {
            backgroundColor = JBColor(JBColor.LIGHT_GRAY.brighter(), JBColor.DARK_GRAY)
        }
        currentHighlighter = editor.markupModel.addLineHighlighter(
            line - 1,
            HighlighterLayer.SELECTION - 1,
            attrs
        ).apply {
            isGreedyToLeft = true
            isGreedyToRight = true
            // Show as whole-line highlight
            targetArea
        }
        lastSyncedEditor = editor

        // Scroll the line into view without stealing focus.
        val offset = editor.document.getLineStartOffset(line - 1)
        editor.scrollingModel.scrollTo(
            editor.offsetToLogicalPosition(offset),
            com.intellij.openapi.editor.ScrollType.MAKE_VISIBLE
        )
    }

    private fun clearHighlight() {
        val editor = lastSyncedEditor ?: return
        val hl = currentHighlighter ?: return
        editor.markupModel.removeHighlighter(hl)
        currentHighlighter = null
    }

    @Suppress("unused")
    private val targetArea = HighlighterTargetArea.LINES_IN_RANGE

    // ── HTML helpers ─────────────────────────────────────────────────────────

    private fun idleHtml(): String = """
        <!DOCTYPE html><html><head><meta charset="UTF-8"><style>
        body{margin:0;height:100vh;display:flex;flex-direction:column;align-items:center;
             justify-content:center;font-family:-apple-system,'Segoe UI',sans-serif;
             background:#1e1e1e;color:#aaa;gap:8px;}
        .title{font-size:14px;font-weight:600;color:#ddd;}
        .sub{font-size:12px;}
        </style></head><body>
        <div class="title">Algorithm Visualizer</div>
        <div class="sub">Select Python code in the editor, then run <b>Visualize Algorithm</b>.</div>
        </body></html>
    """.trimIndent()

    private fun loadingHtml(): String = """
        <!DOCTYPE html><html><head><meta charset="UTF-8"><style>
        body{margin:0;height:100vh;display:flex;flex-direction:column;align-items:center;
             justify-content:center;font-family:-apple-system,'Segoe UI',sans-serif;
             background:#1e1e1e;color:#ddd;gap:16px;}
        .spinner{width:36px;height:36px;border:3px solid rgba(255,255,255,0.12);
                 border-top-color:#6366f1;border-radius:50%;animation:spin .75s linear infinite;}
        @keyframes spin{to{transform:rotate(360deg)}}
        .title{font-size:14px;font-weight:600;}
        .sub{font-size:12px;opacity:.55;}
        </style></head><body>
        <div class="spinner"></div>
        <div class="title">Generating visualization…</div>
        <div class="sub">Claude is analyzing your algorithm</div>
        </body></html>
    """.trimIndent()

    private fun errorHtml(message: String): String {
        val safe = message
            .replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        return """
            <!DOCTYPE html><html><head><meta charset="UTF-8"><style>
            body{margin:0;height:100vh;padding:32px;display:flex;flex-direction:column;
                 align-items:center;justify-content:center;gap:10px;text-align:center;
                 font-family:-apple-system,'Segoe UI',sans-serif;background:#1e1e1e;color:#ddd;}
            .icon{font-size:38px;}
            .title{font-size:15px;font-weight:600;color:#f87171;}
            .msg{font-size:12.5px;opacity:.65;max-width:380px;line-height:1.55;}
            </style></head><body>
            <div class="icon">⚠️</div>
            <div class="title">Generation failed</div>
            <div class="msg">$safe</div>
            <div class="msg">Check your API key in <b>Settings → Tools → Algorithm Visualizer</b>.</div>
            </body></html>
        """.trimIndent()
    }
}

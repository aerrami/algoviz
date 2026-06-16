package com.algoviz

import com.intellij.openapi.project.Project
import com.intellij.openapi.wm.ToolWindow
import com.intellij.openapi.wm.ToolWindowFactory
import com.intellij.ui.content.ContentFactory
import com.intellij.ui.jcef.JBCefApp

class AlgoVizToolWindowFactory : ToolWindowFactory {

    override fun isApplicable(project: Project): Boolean = JBCefApp.isSupported()

    override fun createToolWindowContent(project: Project, toolWindow: ToolWindow) {
        val panel = AlgoVizPanel(project)
        AlgoVizPanelHolder.register(project, panel)

        val content = ContentFactory.getInstance().createContent(panel.component, "", false)
        toolWindow.contentManager.addContent(content)

        panel.showIdle()
    }
}

/** Lets actions reach the per-project panel without a service definition. */
object AlgoVizPanelHolder {
    private val panels = mutableMapOf<Project, AlgoVizPanel>()

    fun register(project: Project, panel: AlgoVizPanel) {
        panels[project] = panel
    }

    fun get(project: Project): AlgoVizPanel? = panels[project]

    fun unregister(project: Project) {
        panels.remove(project)
    }
}

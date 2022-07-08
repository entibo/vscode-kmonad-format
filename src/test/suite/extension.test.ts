import * as assert from "assert"
import * as vscode from "vscode"
import * as myExtension from "../../extension"

suite("Extension Test Suite", () => {
  vscode.window.showInformationMessage("Start all tests.")

  const workspaceFolder = vscode.workspace.workspaceFolders![0]

  test("Format tutorial.kbd", async () => {
    const tutorialFile = vscode.Uri.joinPath(
      workspaceFolder.uri,
      "tutorial.kbd"
    ).path
    const doc = await vscode.workspace.openTextDocument(tutorialFile)
    const original = doc.getText()
    await vscode.window.showTextDocument(doc)

    await wait(500)
    console.log(
      await vscode.commands.executeCommand("editor.action.formatDocument")
    )
    await wait(500)
    const formatted = doc.getText()
    assert.strictEqual(
      formatted,
      original.replace("@@wrong   _    _", "@@wrong _ _")
    )
  })
})

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

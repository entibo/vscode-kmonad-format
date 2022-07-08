import * as vscode from "vscode"
import parse, { Node } from "./parse"
import { quickPick } from "./util"

type CommandResults<T> =
  | {
      error: string
    }
  | {
      info?: string
      value: T
    }

export function activate(context: vscode.ExtensionContext) {
  const outputChannel = vscode.window.createOutputChannel("Kmonad", "kmonad")
  context.subscriptions.push(outputChannel)

  function handleCommandResults<T>(commandResults: CommandResults<T>) {
    if ("error" in commandResults) {
      outputChannel.appendLine(commandResults.error!)
      vscode.window
        .showWarningMessage("Couldn't format Kmonad config", "View logs")
        .then((v) => {
          if (!v) {
            return
          }
          outputChannel.show(true)
        })
      return
    }
    if (commandResults.info) {
      outputChannel.appendLine(commandResults.info)
    }
    return commandResults.value
  }

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "vscode-kmonad-format.setSrcColumnWidth",
      async () => {
        const result = await quickPick(
          ["2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"],
          ["6"],
          [],
          {
            title: "Select a column width (spaces)",
            placeHolder: "Column width",
          }
        )
        try {
          const width = parseInt(result)
          if (isNaN(width)) {
            return
          }
          const doc = vscode.window.activeTextEditor?.document
          if (!doc) {
            return
          }
          outputChannel.appendLine(
            `Setting (defsrc) column width to ${width}: ` + doc.fileName
          )
          const edits = handleCommandResults(setSrcColumnWidth(doc, width))
          if (!edits) {
            return
          }
          const workspaceEdit = new vscode.WorkspaceEdit()
          workspaceEdit.set(doc.uri, [edits])
          await vscode.workspace.applyEdit(workspaceEdit)
        } catch (e) {
          return
        }
      }
    )
  )

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "vscode-kmonad-format.newLayer",
      async () => {
        const result = await quickPick(
          [
            { label: " ", description: "Copy keys from (defsrc)" },
            { label: "_", description: "Passthrough" },
            { label: "XX", description: "Blocked" },
          ],
          ["_"],
          [],
          {
            title: "Select a placeholder for the layer's buttons",
            placeHolder: "Column width",
          }
        )
        if (!result) {
          return
        }

        const editor = vscode.window.activeTextEditor
        if (!editor) {
          return
        }
        const doc = editor.document

        outputChannel.appendLine(
          `Creating a new layer (${result}): ` + doc.fileName
        )

        const buttons = handleCommandResults(newLayerKeys(doc, result))
        if (!buttons) {
          return
        }
        
        editor.insertSnippet(
          new vscode.SnippetString("(deflayer ${0:name}\n" + buttons + "\n)")
        )

        vscode.commands.executeCommand("editor.action.formatDocument")
      }
    )
  )

  context.subscriptions.push(
    vscode.languages.registerDocumentFormattingEditProvider("kmonad", {
      provideDocumentFormattingEdits(doc, provider) {
        outputChannel.appendLine("Formatting: " + doc.fileName)
        const edits = handleCommandResults(format(doc))
        return edits
      },
    })
  )
}

export function deactivate() {}

export function newLayerKeys(doc: vscode.TextDocument, content: string) {
  const parseResult = parse(doc.getText())
  if ("error" in parseResult) {
    return parseResult
  }
  const { defsrc } = parseResult
  const items = defsrc.slice(1)
  const indent = positionForNode(doc, items[0]).position.character
  return {
    value:
      " ".repeat(indent) +
      (content === " "
        ? items.map((x) => x.contents)
        : items.map(() => content)
      ).join(" "),
  }
}

export function setSrcColumnWidth(doc: vscode.TextDocument, width: number) {
  const parseResult = parse(doc.getText())
  if ("error" in parseResult) {
    return parseResult
  }
  const { defsrc } = parseResult

  const srcPositions = defsrc.slice(1).map((e) => positionForNode(doc, e))

  const tooBig = srcPositions.filter(({ contents }) => contents.length >= width)
  if (tooBig.length) {
    return {
      error: `Failed: these keys don't fit in a column of size ${width}:\n  ${tooBig
        .map((x) => x.contents)
        .join(" ")}`,
    }
  }

  const srcLineColumns = Object.values(
    srcPositions.reduce((m, { position, contents }) => {
      if (!m[position.line]) {
        m[position.line] = { startPosition: position, items: [] }
      }
      m[position.line].items.push(contents)
      return m
    }, {} as Record<number, { startPosition: vscode.Position; items: string[] }>)
  )
  return {
    info: "Ok",
    value: vscode.TextEdit.replace(
      getContentPositionsRange(srcPositions),
      srcLineColumns
        .map(
          ({ startPosition, items }, idx) =>
            (idx === 0 ? "" : " ".repeat(startPosition.character)) +
            items.map((x) => x.padEnd(width, " ")).join("")
        )
        .join("\n")
    ),
  }
}

export function format(doc: vscode.TextDocument) {
  const parseResult = parse(doc.getText())
  if ("error" in parseResult) {
    return parseResult
  }
  const { defsrc, deflayers } = parseResult

  const srcPositions = defsrc.slice(1).map((e) => positionForNode(doc, e))
  const srcLineColumns = Object.values(
    srcPositions.reduce((m, { position }) => {
      if (!m[position.line]) {
        m[position.line] = []
      }
      m[position.line].push(
        position.character - srcPositions[0].position.character
      )
      return m
    }, {} as Record<number, number[]>)
  )

  const layersPositions = deflayers.map((deflayer) =>
    deflayer.slice(2).map((e) => positionForNode(doc, e))
  )

  const validLayersPositions = layersPositions.filter(
    (layerPositions) => layerPositions.length === srcPositions.length
  )

  return {
    info: `Formatted ${validLayersPositions.length}/${layersPositions.length} layers`,
    value: validLayersPositions.map((layerPositions) => {
      // todo: preserve trailing comments

      const replaceRange = getContentPositionsRange(layerPositions)

      const layerIndent = layerPositions[0].position.character

      let formatted = srcLineColumns
        .map((line) => {
          let i = 0
          return line
            .map((col) => {
              const { contents } = layerPositions.shift()!
              let padding = Math.max(0, col - i)
              if (padding === 0 && i > 0) {
                padding++
              }
              i += padding + contents.length
              return " ".repeat(padding) + contents
            })
            .join("")
        })
        .join("\n" + " ".repeat(layerIndent))
      return vscode.TextEdit.replace(replaceRange, formatted)
    }),
  }
}

function positionForNode(
  doc: vscode.TextDocument,
  { startIdx, contents }: Node
) {
  return { position: doc.positionAt(startIdx), contents }
}

function getContentPositionsRange(
  contentPositions: { contents: string; position: vscode.Position }[]
) {
  const last = contentPositions.at(-1)!
  return new vscode.Range(
    contentPositions[0].position,
    new vscode.Position(
      last.position.line,
      last.position.character + last.contents.length
    )
  )
}

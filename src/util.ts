import * as vscode from "vscode"

let quickPickActive: Promise<void> | undefined

// Taken from the Calva extension
export function quickPick(
  itemsToPick: string[],
  active: string[],
  selected: string[],
  options: vscode.QuickPickOptions & { canPickMany: true }
): Promise<string[]>
export function quickPick(
  itemsToPick: string[],
  active: string[],
  selected: string[],
  options: vscode.QuickPickOptions
): Promise<string>

export async function quickPick(
  itemsToPick: string[],
  active: string[],
  selected: string[],
  options: vscode.QuickPickOptions
): Promise<string[] | string | undefined> {
  const items = itemsToPick.map((x) => ({ label: x }))

  const qp = vscode.window.createQuickPick()
  quickPickActive = new Promise<void>((resolve) =>
    qp.onDidChangeActive((e) => resolve())
  )
  qp.canSelectMany = !!options.canPickMany
  qp.title = options.title
  qp.placeholder = options.placeHolder
  qp.ignoreFocusOut = !!options.ignoreFocusOut
  qp.matchOnDescription = !!options.matchOnDescription
  qp.matchOnDetail = !!options.matchOnDetail
  qp.items = items
  qp.activeItems = items.filter((x) => active.indexOf(x.label) !== -1)
  qp.selectedItems = items.filter((x) => selected.indexOf(x.label) !== -1)
  return new Promise<string[] | string | undefined>((resolve, reject) => {
    qp.show()
    qp.onDidAccept(() => {
      if (qp.canSelectMany) {
        resolve(qp.selectedItems.map((x) => x.label))
      } else if (qp.selectedItems.length) {
        resolve(qp.selectedItems[0].label)
      } else {
        resolve(undefined)
      }
      qp.hide()
      quickPickActive = undefined
    })
    qp.onDidHide(() => {
      resolve([])
      qp.hide()
      quickPickActive = undefined
    })
  })
}

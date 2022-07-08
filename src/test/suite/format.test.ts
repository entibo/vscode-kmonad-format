import * as assert from "assert"
import * as vscode from "vscode"
import * as myExtension from "../../main"

async function testConfig(cfg: { original: string; formatted: string }) {
  const doc = await vscode.workspace.openTextDocument({
    content: cfg.original,
    language: "kmonad",
  })
  const formatResult = myExtension.format(doc)
  if ("error" in formatResult) {
    return assert.strictEqual(formatResult.error, undefined)
  }
  const edit = new vscode.WorkspaceEdit()
  edit.set(doc.uri, formatResult.value)
  await vscode.workspace.applyEdit(edit)
  const resultText = doc.getText()
  assert.strictEqual(resultText, cfg.formatted)
}

suite("Format Test Suite", () => {
  test("Simple", () =>
    testConfig({
      original: `
        (defsrc a b c) (deflayer foo a  b  c)`,
      formatted: `
        (defsrc a b c) (deflayer foo a b c)`,
    }))

  test("Escape characters", () =>
    testConfig({
      original: String.raw`
        (defcfg foo "C:\\bar\\baz 1)" a(a)
        (defsrc        1   2   3   4   5   6   7) 
        (deflayer foo  \ \\ \) \" \( ")" @foo)`,
      formatted: String.raw`
        (defcfg foo "C:\\bar\\baz 1)" a(a)
        (defsrc        1   2   3   4   5   6   7) 
        (deflayer foo  \   \\  \)  \"  \(  ")" @foo)`,
    }))

  test("Bigger, multiple layers", () =>
    testConfig({
      original: `
        (defsrc
          _    _    _    _    _    _    _    _    _    _    _    _    _    _
          _    _    _    _    _    _    _    _    _    _    _    _    _    _
          _    _    _    _    _    _    _    _    _    _    _    _    _
          _    _    _    _    _    _    _    _    _    _    _    _
          _    _    _              _              _    _    _    _
        )
        (deflayer foo
          _ _ _ _ _ _ _ _ _ _ _ _ _    _
          _    _     _        _         _               _    
          _    
          _    ;; whitespace between the first and last keys
          _    ;; is ignored, so this comment will not be kept
          _      _    _      _    _
          _    _    _    _    _    _    _    
          _    _        _    _    _    _
          _     _    _        _    _    _    _    
          _    _    _    _    _
          _     _    _              _              _    _    _    _
        )
        (deflayer bar ;; start
          _ _ _ _ _ _ _ _ _ _ _ _ _ _
          _  _  _  _  _  _  _  _  _  _  _  _
          _  _  _  _  _  _  _  _  _  _  _  _
          _  _  _  _  _  _  _  _  _  _  _  _
          _  _  _        _        _  _  _  _
          _ _ _ #| end |# )
        `,
      formatted: `
        (defsrc
          _    _    _    _    _    _    _    _    _    _    _    _    _    _
          _    _    _    _    _    _    _    _    _    _    _    _    _    _
          _    _    _    _    _    _    _    _    _    _    _    _    _
          _    _    _    _    _    _    _    _    _    _    _    _
          _    _    _              _              _    _    _    _
        )
        (deflayer foo
          _    _    _    _    _    _    _    _    _    _    _    _    _    _
          _    _    _    _    _    _    _    _    _    _    _    _    _    _
          _    _    _    _    _    _    _    _    _    _    _    _    _
          _    _    _    _    _    _    _    _    _    _    _    _
          _    _    _              _              _    _    _    _
        )
        (deflayer bar ;; start
          _    _    _    _    _    _    _    _    _    _    _    _    _    _
          _    _    _    _    _    _    _    _    _    _    _    _    _    _
          _    _    _    _    _    _    _    _    _    _    _    _    _
          _    _    _    _    _    _    _    _    _    _    _    _
          _    _    _              _              _    _    _    _ #| end |# )
        `,
    }))

  test("Indentation is preserved", () =>
    testConfig({
      original: `
        (defsrc 
          a b c
          d e f
        )       (deflayer weird  a  b  c  d  e  f)`,
      formatted: `
        (defsrc 
          a b c
          d e f
        )       (deflayer weird  a b c
                                 d e f)`,
    }))

  test("Longer expressions", () =>
    testConfig({
      original: String.raw`
        (defsrc 
          a   b   c   d   e   f   g   h
          i   j   k   l   m   n   o   p
        )
        (deflayer foo
          _ _ #(c \ c) _ _ _ _ _
          @iiiiii _ _ _ _ _ _ 
          @ppppp
        )`,
      formatted: String.raw`
        (defsrc 
          a   b   c   d   e   f   g   h
          i   j   k   l   m   n   o   p
        )
        (deflayer foo
          _   _   #(c \ c) _ _ _  _   _
          @iiiiii _ _ _   _   _   _   @ppppp
        )`,
    }))
})

/* eslint-disable @typescript-eslint/naming-convention */
import * as ohm from "ohm-js"

export const grammar = ohm.grammar(`
Kmonad {
  KmonadConfig = TopLevelSexpr*

  Sexpr = "(" ListOf<(Sexpr | Token), space*> ")"
  TopLevelSexpr = Sexpr
  
  Token = TapMacro
    | string
    | escaped
    | word
  
  TapMacro = "#" Sexpr
  escaped = "\\\\" (~space any)*
  word = (~(space | ")") any)+
  string = "\\"" (~"\\"" any)* "\\""

  space := whitespace | newline | comment

  comment = multiLineComment | singleLineComment

  multiLineComment = "#|" (~"|#" any)* "|#"
  singleLineComment = ";;" (~newline any)*

  whitespace = "\\t"
  | "\\x0B"    -- verticalTab
  | "\\x0C"    -- formFeed
  | " "
  | "\\u00A0"  -- noBreakSpace
  | "\\uFEFF"  -- byteOrderMark

  newline = "\\n" | "\\r" | "\\u2028" | "\\u2029" | "\\r\\n"
}
`)

export type Node = { contents: string; startIdx: number; endIdx: number }
export type AST = Node[][]

export const semantics = grammar.createSemantics()
semantics.addOperation<any>("ast", {
  KmonadConfig(args) {
    return args.children.map((c) => c.ast())
  },

  TopLevelSexpr(arg) {
    return arg
      .child(1)
      .asIteration()
      .children.map((c: any) => c.ast())
  },
  Sexpr(_1, { source: { contents, startIdx, endIdx } }, _2): Node {
    return { contents, startIdx, endIdx }
  },
  Token({ source: { contents, startIdx, endIdx } }): Node {
    return { contents, startIdx, endIdx }
  },
})

export default function parse(
  text: string
): { error: string } | { defsrc: Node[]; deflayers: Node[][] } {
  const match = grammar.match(text)
  if (match.failed()) {
    return {
      error: match.message || match.shortMessage || "",
    }
  }
  const topLevel = semantics(match).ast() as AST
  const defsrc = topLevel.find((sexpr) => sexpr[0]?.contents === "defsrc")
  if (!defsrc) {
    return {
      error: "Kmonad config must contain exactly one (defsrc) block",
    }
  }
  const deflayers = topLevel.filter(
    (sexpr) => sexpr[0]?.contents === "deflayer"
  )
  return {
    defsrc,
    deflayers,
  }
}

import { grammar, semantics } from "./parse"

let cfg = `

(defsrc ;; Source
  a 
  (b bb)
  ;; close )
  #| close2 ) 
  |#
  c)

(deflayer jkl ;; test
  j
  k
  @nl
)

()

(defalias
  select-current-line (tap-macro end rght (around lsft up))
  nl #((press-only alt) S-tab (layer-add na))
)
`
/*
 */
// cfg = readFileSync('./test/custom.kbd').toString()

const match = grammar.match(cfg)
console.log(semantics(match).ast())

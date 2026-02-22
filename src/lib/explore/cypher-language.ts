import { StreamLanguage, type StringStream } from "@codemirror/language";

const cypherKeywords = new Set([
  "match", "optional", "where", "return", "with", "unwind", "order", "by",
  "limit", "skip", "as", "distinct", "and", "or", "not", "in", "is", "null",
  "true", "false", "case", "when", "then", "else", "end", "exists",
  "contains", "starts", "ends", "create", "merge", "delete", "detach",
  "set", "remove", "call", "yield", "union", "all",
]);

const cypherBuiltins = new Set([
  "shortestpath", "allshortestpaths", "count", "collect", "sum", "avg",
  "min", "max", "nodes", "relationships", "type", "labels", "length",
  "size", "properties", "toupper", "tolower", "tostring", "tointeger",
  "tofloat", "id", "coalesce", "head", "last", "tail", "range",
  "timestamp", "startnode", "endnode", "keys", "abs", "ceil", "floor",
  "round", "sign", "rand", "log", "log10", "exp", "sqrt", "trim",
  "ltrim", "rtrim", "replace", "substring", "left", "right", "split",
  "reverse", "any", "none", "single", "filter", "extract", "reduce",
]);

interface CypherState {
  inString: false | '"' | "'";
  inComment: boolean;
}

const cypherMode = {
  startState(): CypherState {
    return { inString: false, inComment: false };
  },

  token(stream: StringStream, state: CypherState): string | null {
    // Continue string
    if (state.inString) {
      const quote = state.inString;
      while (!stream.eol()) {
        const ch = stream.next();
        if (ch === "\\") {
          stream.next(); // skip escaped char
        } else if (ch === quote) {
          state.inString = false;
          return "string";
        }
      }
      return "string";
    }

    // Line comment
    if (stream.match("//")) {
      stream.skipToEnd();
      return "comment";
    }

    // Whitespace
    if (stream.eatSpace()) return null;

    // Strings
    const ch = stream.peek() ?? "";
    if (ch === '"' || ch === "'") {
      state.inString = ch as '"' | "'";
      stream.next();
      return "string";
    }

    // Numbers
    if (stream.match(/^-?\d+(\.\d+)?/)) {
      return "number";
    }

    // Operators
    if (stream.match(/^(<>|<=|>=|=~|[=<>!])/)) {
      return "operator";
    }

    // Relationship patterns: -[:TYPE]-> or -[r:TYPE*1..5]->
    if (stream.match(/^-\[/)) {
      return "bracket";
    }
    if (stream.match(/^\]->/)) {
      return "bracket";
    }
    if (stream.match(/^\]-/)) {
      return "bracket";
    }
    if (stream.match(/^->/)) {
      return "operator";
    }
    if (stream.match(/^<-/)) {
      return "operator";
    }

    // Brackets and parens
    if (stream.match(/^[()[\]{}]/)) {
      return "bracket";
    }

    // Label after colon (inside node/rel patterns): :Label or :TYPE
    if (ch === ":") {
      stream.next();
      if (stream.match(/^[A-Z][A-Za-z0-9_]*/)) {
        return "typeName";
      }
      return "punctuation";
    }

    // Property dot access: .property
    if (ch === ".") {
      stream.next();
      if (stream.match(/^[a-z_][a-z0-9_]*/i)) {
        return "propertyName";
      }
      return "punctuation";
    }

    // Variable range: *1..5
    if (ch === "*") {
      stream.next();
      stream.match(/^\d+(\.\.\d+)?/);
      return "number";
    }

    // Punctuation
    if (stream.match(/^[,;|]/)) {
      return "punctuation";
    }

    // Words (keywords, builtins, identifiers)
    if (stream.match(/^[a-z_][a-z0-9_]*/i)) {
      const word = stream.current().toLowerCase();
      if (cypherKeywords.has(word)) return "keyword";
      if (cypherBuiltins.has(word)) return "variableName.special";
      return "variableName";
    }

    // Dollar-prefixed parameters: $param
    if (ch === "$") {
      stream.next();
      stream.match(/^[a-z_][a-z0-9_]*/i);
      return "variableName.special";
    }

    // Skip unknown
    stream.next();
    return null;
  },
};

export const cypherLanguage = StreamLanguage.define(cypherMode);

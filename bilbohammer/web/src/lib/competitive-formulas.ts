export const DEFAULT_PALADIN_FORMULA =
  "if(played == 0, 1000, 1000 + round(100 * winRate * pointsPerGame * (ifr / max(elo, 1)) * (1 / (1 + exp(-0.4 * (played - floor(medianPlayed)))))) + log(played + 1) * 12.5)";

export type PaladinFormulaContext = {
  classificationPoints: number;
  pointsPerGame: number;
  played: number;
  won: number;
  drawn: number;
  winRate: number;
  ifr: number;
  elo: number;
  adjustedElo: number;
  medianPlayed: number;
};

type Token =
  | { type: "number"; value: number }
  | { type: "identifier"; value: string }
  | { type: "operator"; value: string }
  | { type: "paren"; value: "(" | ")" }
  | { type: "comma"; value: "," };

type AstNode =
  | { type: "number"; value: number }
  | { type: "variable"; name: string }
  | { type: "unary"; operator: "-"; argument: AstNode }
  | { type: "binary"; operator: string; left: AstNode; right: AstNode }
  | { type: "call"; name: string; args: AstNode[] };

const ALLOWED_VARIABLES = new Set<keyof PaladinFormulaContext>([
  "classificationPoints",
  "pointsPerGame",
  "played",
  "won",
  "drawn",
  "winRate",
  "ifr",
  "elo",
  "adjustedElo",
  "medianPlayed",
]);

const ALLOWED_FUNCTIONS = new Set(["if", "round", "floor", "ceil", "log", "exp", "min", "max", "abs"]);

function tokenize(expression: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;

  while (index < expression.length) {
    const char = expression[index];
    const next = expression[index + 1];

    if (/\s/.test(char)) {
      index += 1;
      continue;
    }

    if (/\d|\./.test(char)) {
      let raw = "";
      while (index < expression.length && /[\d.]/.test(expression[index])) {
        raw += expression[index];
        index += 1;
      }
      const value = Number(raw);
      if (!Number.isFinite(value)) {
        throw new Error(`Número inválido en fórmula: ${raw}`);
      }
      tokens.push({ type: "number", value });
      continue;
    }

    if (/[a-zA-Z_]/.test(char)) {
      let raw = "";
      while (index < expression.length && /[a-zA-Z0-9_]/.test(expression[index])) {
        raw += expression[index];
        index += 1;
      }
      tokens.push({ type: "identifier", value: raw });
      continue;
    }

    if (char === "(" || char === ")") {
      tokens.push({ type: "paren", value: char });
      index += 1;
      continue;
    }

    if (char === ",") {
      tokens.push({ type: "comma", value: "," });
      index += 1;
      continue;
    }

    const twoCharOperator = `${char}${next}`;
    if ([">=", "<=", "==", "!="].includes(twoCharOperator)) {
      tokens.push({ type: "operator", value: twoCharOperator });
      index += 2;
      continue;
    }

    if (["+", "-", "*", "/", "^", ">", "<"].includes(char)) {
      tokens.push({ type: "operator", value: char });
      index += 1;
      continue;
    }

    throw new Error(`Carácter no permitido en fórmula: ${char}`);
  }

  return tokens;
}

class Parser {
  private position = 0;

  constructor(private readonly tokens: Token[]) {}

  parse() {
    const expression = this.parseComparison();
    if (this.peek()) {
      throw new Error("La fórmula contiene tokens extra al final.");
    }
    return expression;
  }

  private parseComparison(): AstNode {
    let node = this.parseAdditive();
    while (this.matchOperator([">=", "<=", "==", "!=", ">", "<"])) {
      const operator = this.previous().value;
      const right = this.parseAdditive();
      node = { type: "binary", operator, left: node, right };
    }
    return node;
  }

  private parseAdditive(): AstNode {
    let node = this.parseMultiplicative();
    while (this.matchOperator(["+", "-"])) {
      const operator = this.previous().value;
      const right = this.parseMultiplicative();
      node = { type: "binary", operator, left: node, right };
    }
    return node;
  }

  private parseMultiplicative(): AstNode {
    let node = this.parsePower();
    while (this.matchOperator(["*", "/"])) {
      const operator = this.previous().value;
      const right = this.parsePower();
      node = { type: "binary", operator, left: node, right };
    }
    return node;
  }

  private parsePower(): AstNode {
    let node = this.parseUnary();
    while (this.matchOperator(["^"])) {
      const operator = this.previous().value;
      const right = this.parseUnary();
      node = { type: "binary", operator, left: node, right };
    }
    return node;
  }

  private parseUnary(): AstNode {
    if (this.matchOperator(["-"])) {
      return { type: "unary", operator: "-", argument: this.parseUnary() };
    }
    return this.parsePrimary();
  }

  private parsePrimary(): AstNode {
    const token = this.advance();
    if (!token) {
      throw new Error("Fórmula incompleta.");
    }

    if (token.type === "number") {
      return { type: "number", value: token.value };
    }

    if (token.type === "identifier") {
      if (this.matchParen("(")) {
        const args: AstNode[] = [];
        if (!this.checkParen(")")) {
          do {
            args.push(this.parseComparison());
          } while (this.matchComma());
        }
        this.consumeParen(")", "Falta cerrar paréntesis de función.");
        if (!ALLOWED_FUNCTIONS.has(token.value)) {
          throw new Error(`Función no permitida: ${token.value}`);
        }
        return { type: "call", name: token.value, args };
      }

      if (!ALLOWED_VARIABLES.has(token.value as keyof PaladinFormulaContext)) {
        throw new Error(`Variable no permitida: ${token.value}`);
      }
      return { type: "variable", name: token.value };
    }

    if (token.type === "paren" && token.value === "(") {
      const expression = this.parseComparison();
      this.consumeParen(")", "Falta cerrar paréntesis.");
      return expression;
    }

    throw new Error("Token inesperado en fórmula.");
  }

  private matchOperator(values: string[]) {
    const token = this.peek();
    if (token?.type === "operator" && values.includes(token.value)) {
      this.position += 1;
      return true;
    }
    return false;
  }

  private matchParen(value: "(" | ")") {
    if (this.checkParen(value)) {
      this.position += 1;
      return true;
    }
    return false;
  }

  private checkParen(value: "(" | ")") {
    const token = this.peek();
    return token?.type === "paren" && token.value === value;
  }

  private consumeParen(value: "(" | ")", message: string) {
    if (!this.matchParen(value)) {
      throw new Error(message);
    }
  }

  private matchComma() {
    const token = this.peek();
    if (token?.type === "comma") {
      this.position += 1;
      return true;
    }
    return false;
  }

  private advance() {
    const token = this.peek();
    if (token) {
      this.position += 1;
    }
    return token;
  }

  private previous() {
    return this.tokens[this.position - 1] as Token & { type: "operator" };
  }

  private peek() {
    return this.tokens[this.position];
  }
}

function evaluate(node: AstNode, context: PaladinFormulaContext): number {
  switch (node.type) {
    case "number":
      return node.value;
    case "variable":
      return context[node.name as keyof PaladinFormulaContext];
    case "unary":
      return -evaluate(node.argument, context);
    case "binary": {
      const left = evaluate(node.left, context);
      const right = evaluate(node.right, context);
      if (node.operator === "+") return left + right;
      if (node.operator === "-") return left - right;
      if (node.operator === "*") return left * right;
      if (node.operator === "/") return right === 0 ? 0 : left / right;
      if (node.operator === "^") return left ** right;
      if (node.operator === ">") return left > right ? 1 : 0;
      if (node.operator === "<") return left < right ? 1 : 0;
      if (node.operator === ">=") return left >= right ? 1 : 0;
      if (node.operator === "<=") return left <= right ? 1 : 0;
      if (node.operator === "==") return left === right ? 1 : 0;
      if (node.operator === "!=") return left !== right ? 1 : 0;
      throw new Error(`Operador no soportado: ${node.operator}`);
    }
    case "call": {
      if (node.name === "if") {
        if (node.args.length !== 3) {
          throw new Error("if necesita 3 argumentos: condición, valor si verdadero y valor si falso.");
        }
        return evaluate(node.args[0], context) ? evaluate(node.args[1], context) : evaluate(node.args[2], context);
      }

      const args = node.args.map((arg) => evaluate(arg, context));
      if (node.name === "round") {
        const decimals = args[1] ?? 0;
        const factor = 10 ** decimals;
        return Math.round(args[0] * factor) / factor;
      }
      if (node.name === "floor") return Math.floor(args[0]);
      if (node.name === "ceil") return Math.ceil(args[0]);
      if (node.name === "log") return Math.log(args[0]);
      if (node.name === "exp") return Math.exp(args[0]);
      if (node.name === "min") return Math.min(...args);
      if (node.name === "max") return Math.max(...args);
      if (node.name === "abs") return Math.abs(args[0]);
      throw new Error(`Función no soportada: ${node.name}`);
    }
  }
}

export function normalizePaladinFormula(value: string | null | undefined) {
  const normalized = value?.trim() ?? "";
  return normalized.length ? normalized : DEFAULT_PALADIN_FORMULA;
}

export function evaluatePaladinFormula(formula: string, context: PaladinFormulaContext) {
  const ast = new Parser(tokenize(normalizePaladinFormula(formula))).parse();
  const result = evaluate(ast, context);
  if (!Number.isFinite(result)) {
    throw new Error("La fórmula no devuelve un número válido.");
  }
  return Math.round(result);
}

export function validatePaladinFormula(formula: string) {
  const sample: PaladinFormulaContext = {
    classificationPoints: 200,
    pointsPerGame: 12.5,
    played: 16,
    won: 8,
    drawn: 2,
    winRate: 0.5,
    ifr: 1500,
    elo: 1500,
    adjustedElo: 1500,
    medianPlayed: 12,
  };
  evaluatePaladinFormula(formula, sample);
}

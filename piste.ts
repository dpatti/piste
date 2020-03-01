const split = (arr, n) => [arr.slice(0, n), arr.slice(n)]

type Computation = { alias: string, f: (...Expr) => Expr }
const Computation = (alias, f) => ({ alias, f });
Computation.equal = (x, y) => x.alias === y.alias;
Computation.toString = (x) => x.alias;

type Expr = { comp: Computation, args: Expr[] }
const Expr = (comp, args=[]) => ({ comp, args })
Expr.equal = (x, y) =>
  x.comp == y.comp
    && x.args.length === y.args.length
    && x.args.every((a, i) => Expr.equal(a, y.args[i]));

const apply = (x, ...ys) => {
  let { comp, args } = x;
  return Expr(comp, args.concat(ys));
}

const S = Computation('S', (x, y, z) => apply(apply(x, z), apply(y, z)));
const K = Computation('K', (x, y) => x);
const I = Computation('I', (x) => x);

Expr.eval = (expr) => {
  let { comp, args } = expr;
  if (args.length >= comp.f.length) {
    let [used, rest] = split(args, comp.f.length);
    return apply(comp.f(...used), ...rest);
  } else {
    return expr;
  }
}

const fixScan = (expr, gas=100) => {
  if (gas <= 0) {
    console.error("gas exhausted");
    return []
  }
  let next = Expr.eval(expr);
  if (Expr.equal(expr, next)) {
    return [expr];
  } else {
    return [expr, ...fixScan(next, gas - 1)];
  }
}

const squash = (exprs) => {
  if (exprs.length == 0) throw Error("squash: empty list");
  let { comp, args } = exprs[0];
  return Expr(comp, args.concat(exprs.slice(1)));
}

const symbols = (expr) =>
  [expr.comp.alias, ...expr.args.map(symbols)];

Expr.toString = (expr) => {
  const chain = (syms) => syms.map(format).join('');
  const format = (syms) => {
    if (Array.isArray(syms)) {
      if (syms.length == 1) {
        return format(syms[0]);
      } else {
        return `(${chain(syms)})`
      }
    } else {
      return syms;
    }
  };
  return chain(symbols(expr));
};

Expr.parse = (str) => {
  // Obviously first we write a parser combinator library
  type Parser<a> = (_ : string) => [a, string][];
  // Tuple constructor
  const _ = <a>(a: a, str: string): [a, string] => [a, str];
  const pure = <a>(a: a): Parser<a> => (str) => [_(a, str)];
  const fail: Parser<any> = (str: string) => [];
  const map = <a, b>(t: Parser<a>, f: (a: a) => b): Parser<b> =>
    (str) => t(str).map(([a, str]) => _(f(a), str));
  const bind = <a, b>(t: Parser<a>, f: (a: a) => Parser<b>): Parser<b> =>
    (str) => t(str).flatMap(([a, str]) => f(a)(str));
  const ignore = <a>(t: Parser<a>): Parser<any> => map(t, _ => undefined);
  const alt = <a>(...ts: Parser<a>[]): Parser<a> =>
    (str) => ts.flatMap(t => t(str));
  const seq = <a>(...ts: Parser<a>[]): Parser<a[]> =>
    (ts.length === 0)
      ? pure([])
      : bind(ts[0], x => map(seq(...ts.slice(1)), rest => [x, ...rest]));
  const many = <a>(t: Parser<a>): Parser<a[]> => {
    const more: Parser<a[]> = bind(t, a => map(many(t), rest => [a, ...rest]));
    const done: Parser<a[]> = pure([]);

    return alt(more, done);
  };
  const fix = <a>(f: (_: Parser<a>) => Parser<a>) => {
    let t = (str) => f(t)(str);
    return t
  };
  const char = (c: string): Parser<string> =>
    (str) => str[0] == c ? [_(str[0], str.slice(1))] : [];
  const run = <a>(t: Parser<a>, str: string): a => {
    for (let [a, unconsumed] of t(str)) {
      if (unconsumed === '') return a;
    }

    console.error(t(str));
    throw Error("parse failed");
  }

  // Okay. There. That wasn't so hard now was it
  const symbol: Parser<Expr> =
    alt(
      map(char('S'), _ => Expr(S)),
      map(char('K'), _ => Expr(K)),
      map(char('I'), _ => Expr(I))
    );

  const group = (p: Parser<Expr>): Parser<Expr> =>
    map(
      seq(
        ignore(char('(')),
        p,
        ignore(char(')'))
      ),
      ([_l, ps, _r]) => ps);

  const expr: Parser<Expr> =
    fix(expr =>
      bind(many(alt(symbol, group(expr))), exprs =>
        (exprs.length > 0) ? pure(squash(exprs)) : fail));

  return run(expr, str);
};

console.log(
`Expr.parse : string -> t
Expr.toString : t -> string
Expr.eval : t -> t
Expr.fixScan : t -> t list`);

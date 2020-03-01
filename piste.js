const split = (arr, n) => [arr.slice(0, n), arr.slice(n)]

const Computation = (alias, f) => ({ alias, f });
Computation.equal = (x, y) => x.alias === y.alias;
Computation.toString = (x) => x.alias;

const Expr = (comp, args=[]) => ({ comp, args })
Expr.equal = (x, y) =>
  x.comp == y.comp
    && x.args.length === y.args.length
    && x.args.every((a, i) => Expr.equal(a, y.args[i]));
Expr.toString = (x) => print(x);

const apply = (x, ...ys) => {
  let { comp, args } = x;
  return Expr(comp, args.concat(ys));
}

const S = Computation('S', (x, y, z) => apply(apply(x, z), apply(y, z)));
const K = Computation('K', (x, y) => x);
const I = Computation('I', (x) => x);

const eval = (expr) => {
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
  let next = eval(expr);
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

const print = (expr) => {
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

const parse = (str) => {
  // Obviously first we write a parser combinator library
  const _ = (a, str) => [a, str];
  const pure = (a) => (str) => [_(a, str)];
  const fail = [];
  const map = (t, f) => (str) => t(str).map(([a, str]) => _(f(a), str));
  const bind = (t, f) => (str) => t(str).flatMap(([a, str]) => f(a)(str));
  const alt = (...ts) => (str) => ts.flatMap(t => t(str));
  const char = (c) => (str) => str[0] == c ? [_(str[0], str.slice(1))] : fail;
  const seq = (...ts) =>
    (ts.length === 0)
      ? pure([])
      : bind(ts[0], x => map(seq(...ts.slice(1)), rest => [x, ...rest]));
  const many = (t) => {
    const more = bind(t, a => map(many(t), rest => [a, ...rest]));
    const done = pure([]);

    return alt(more, done);
  };
  const fix = (f) => {
    let t = (str) => f(t)(str);
    return t
  };
  const run = (t, str) => {
    for ([a, str] of t(str)) {
      if (str === '') return a;
    }

    console.error(t(str));
    throw Error("parse failed");
  }

  // Okay. There. That wasn't so hard now was it
  const symbol =
    alt(
      map(char('S'), _ => Expr(S)),
      map(char('K'), _ => Expr(K)),
      map(char('I'), _ => Expr(I))
    );

  const group = (p) =>
    map(seq(char('('), p, char(')')), ([_l, ps, _r]) => ps);

  const expr =
    fix(expr =>
      map(many(alt(symbol, group(expr))), exprs =>
        (exprs.length > 0) ? squash(exprs) : fail));

  return run(expr, str);
};

console.log(
`parse : string -> t
print : t -> string
eval : t -> t
fixScan : t -> t list`);

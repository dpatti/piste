// S(_a, _a, K)
// S(_a, _a)(K)
// S(_a)(_a)(K)
//
// _a(K)(_a(K))

// ergonomics options:
// I(I,K(I,S,S(I)),S(I))
// _(I,I,_(K,I,S,_(S,I)),_(S,I))
// _.II(_.KIS(_.SI))(_.SI)
// "II(KIS(SI))(SI)"
const env = window;

const split = (arr, n) => [arr.slice(0, n), arr.slice(n)]
const match = (key, dict) => dict[key]

const Computation = (sym, f) => {
  const make = (...next) =>
    new Proxy(Computation, {
      get(target, name, receiver) {
        return match(name, {
          pretty() {
            return format(receiver.inspect());
          },
          inspect() {
            return [sym, ...next.map(x => x.inspect())];
          },
          eval() {
            if (next.length >= f.length) {
              const [apply, rest] = split(next, f.length);
              return f(...apply)(...rest);
            } else {
              return receiver;
            }
          }
        });
      },
      apply(target, that, args) {
        return make(...next.concat(args));
      },
    });
  return make();
};

env.S = Computation("S", (x, y, z) => x(z)(y(z)));
env.K = Computation("K", (x, y) => y);
env.I = Computation("I", (x) => x);
env._ = (x, ...rest) => x(...rest)

env.show = (t, n=0) =>
  (n == 0)
    ? t.pretty()
    : show(t.eval(), n - 1);

const format = (x) => {
  const chain = (x) => x.map(f).join('')
  const f = (x) => {
    if (Array.isArray(x)) {
      if (x.length == 1) {
        return f(x[0]);
      } else {
        return `(${chain(x)})`
      }
    } else {
      return x;
    }
  };
  return chain(x);
};

// const props = (obj) =>
//   Object.getOwnPropertyNames(obj).reduce(Object.create(null), (props, name) => {
//     props[name] = Object.getOwnPropertyDescriptor(obj, name);
//     return props;
//   });

// const T = Object.create(() => {

// }, props({
//   S: (x, y, z) => x(z)(y(z)),
//   K: (x, y) => y,
//   I: (x) => x
// }));

// for (cons in T) {
//   env[cons] = (...next) => ({ tag: cons, next });
// }

// const eval = (t) => {
//   const f = T[t.tag];
//   const arity = f.length;
//   if
// }

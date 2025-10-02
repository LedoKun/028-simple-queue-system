var QueuePolyfills = (function () {
	'use strict';

	var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

	var check = function (it) {
	  return it && it.Math === Math && it;
	};

	// https://github.com/zloirock/core-js/issues/86#issuecomment-115759028
	var globalThis_1 =
	  // eslint-disable-next-line es/no-global-this -- safe
	  check(typeof globalThis == 'object' && globalThis) ||
	  check(typeof window == 'object' && window) ||
	  // eslint-disable-next-line no-restricted-globals -- safe
	  check(typeof self == 'object' && self) ||
	  check(typeof commonjsGlobal == 'object' && commonjsGlobal) ||
	  check(typeof commonjsGlobal == 'object' && commonjsGlobal) ||
	  // eslint-disable-next-line no-new-func -- fallback
	  (function () { return this; })() || Function('return this')();

	var objectGetOwnPropertyDescriptor = {};

	var fails$1z = function (exec) {
	  try {
	    return !!exec();
	  } catch (error) {
	    return true;
	  }
	};

	var fails$1y = fails$1z;

	// Detect IE8's incomplete defineProperty implementation
	var descriptors = !fails$1y(function () {
	  // eslint-disable-next-line es/no-object-defineproperty -- required for testing
	  return Object.defineProperty({}, 1, { get: function () { return 7; } })[1] !== 7;
	});

	var fails$1x = fails$1z;

	var functionBindNative = !fails$1x(function () {
	  // eslint-disable-next-line es/no-function-prototype-bind -- safe
	  var test = (function () { /* empty */ }).bind();
	  // eslint-disable-next-line no-prototype-builtins -- safe
	  return typeof test != 'function' || test.hasOwnProperty('prototype');
	});

	var NATIVE_BIND$4 = functionBindNative;

	var call$_ = Function.prototype.call;
	// eslint-disable-next-line es/no-function-prototype-bind -- safe
	var functionCall = NATIVE_BIND$4 ? call$_.bind(call$_) : function () {
	  return call$_.apply(call$_, arguments);
	};

	var objectPropertyIsEnumerable = {};

	var $propertyIsEnumerable$2 = {}.propertyIsEnumerable;
	// eslint-disable-next-line es/no-object-getownpropertydescriptor -- safe
	var getOwnPropertyDescriptor$b = Object.getOwnPropertyDescriptor;

	// Nashorn ~ JDK8 bug
	var NASHORN_BUG = getOwnPropertyDescriptor$b && !$propertyIsEnumerable$2.call({ 1: 2 }, 1);

	// `Object.prototype.propertyIsEnumerable` method implementation
	// https://tc39.es/ecma262/#sec-object.prototype.propertyisenumerable
	objectPropertyIsEnumerable.f = NASHORN_BUG ? function propertyIsEnumerable(V) {
	  var descriptor = getOwnPropertyDescriptor$b(this, V);
	  return !!descriptor && descriptor.enumerable;
	} : $propertyIsEnumerable$2;

	var createPropertyDescriptor$d = function (bitmap, value) {
	  return {
	    enumerable: !(bitmap & 1),
	    configurable: !(bitmap & 2),
	    writable: !(bitmap & 4),
	    value: value
	  };
	};

	var NATIVE_BIND$3 = functionBindNative;

	var FunctionPrototype$4 = Function.prototype;
	var call$Z = FunctionPrototype$4.call;
	// eslint-disable-next-line es/no-function-prototype-bind -- safe
	var uncurryThisWithBind = NATIVE_BIND$3 && FunctionPrototype$4.bind.bind(call$Z, call$Z);

	var functionUncurryThis = NATIVE_BIND$3 ? uncurryThisWithBind : function (fn) {
	  return function () {
	    return call$Z.apply(fn, arguments);
	  };
	};

	var uncurryThis$1B = functionUncurryThis;

	var toString$F = uncurryThis$1B({}.toString);
	var stringSlice$j = uncurryThis$1B(''.slice);

	var classofRaw$2 = function (it) {
	  return stringSlice$j(toString$F(it), 8, -1);
	};

	var uncurryThis$1A = functionUncurryThis;
	var fails$1w = fails$1z;
	var classof$q = classofRaw$2;

	var $Object$5 = Object;
	var split$3 = uncurryThis$1A(''.split);

	// fallback for non-array-like ES3 and non-enumerable old V8 strings
	var indexedObject = fails$1w(function () {
	  // throws an error in rhino, see https://github.com/mozilla/rhino/issues/346
	  // eslint-disable-next-line no-prototype-builtins -- safe
	  return !$Object$5('z').propertyIsEnumerable(0);
	}) ? function (it) {
	  return classof$q(it) === 'String' ? split$3(it, '') : $Object$5(it);
	} : $Object$5;

	// we can't use just `it == null` since of `document.all` special case
	// https://tc39.es/ecma262/#sec-IsHTMLDDA-internal-slot-aec
	var isNullOrUndefined$9 = function (it) {
	  return it === null || it === undefined;
	};

	var isNullOrUndefined$8 = isNullOrUndefined$9;

	var $TypeError$z = TypeError;

	// `RequireObjectCoercible` abstract operation
	// https://tc39.es/ecma262/#sec-requireobjectcoercible
	var requireObjectCoercible$o = function (it) {
	  if (isNullOrUndefined$8(it)) throw new $TypeError$z("Can't call method on " + it);
	  return it;
	};

	// toObject with fallback for non-array-like ES3 strings
	var IndexedObject$5 = indexedObject;
	var requireObjectCoercible$n = requireObjectCoercible$o;

	var toIndexedObject$j = function (it) {
	  return IndexedObject$5(requireObjectCoercible$n(it));
	};

	// https://tc39.es/ecma262/#sec-IsHTMLDDA-internal-slot
	var documentAll = typeof document == 'object' && document.all;

	// `IsCallable` abstract operation
	// https://tc39.es/ecma262/#sec-iscallable
	// eslint-disable-next-line unicorn/no-typeof-undefined -- required for testing
	var isCallable$A = typeof documentAll == 'undefined' && documentAll !== undefined ? function (argument) {
	  return typeof argument == 'function' || argument === documentAll;
	} : function (argument) {
	  return typeof argument == 'function';
	};

	var isCallable$z = isCallable$A;

	var isObject$K = function (it) {
	  return typeof it == 'object' ? it !== null : isCallable$z(it);
	};

	var globalThis$1k = globalThis_1;
	var isCallable$y = isCallable$A;

	var aFunction = function (argument) {
	  return isCallable$y(argument) ? argument : undefined;
	};

	var getBuiltIn$B = function (namespace, method) {
	  return arguments.length < 2 ? aFunction(globalThis$1k[namespace]) : globalThis$1k[namespace] && globalThis$1k[namespace][method];
	};

	var uncurryThis$1z = functionUncurryThis;

	var objectIsPrototypeOf = uncurryThis$1z({}.isPrototypeOf);

	var globalThis$1j = globalThis_1;

	var navigator = globalThis$1j.navigator;
	var userAgent$8 = navigator && navigator.userAgent;

	var environmentUserAgent = userAgent$8 ? String(userAgent$8) : '';

	var globalThis$1i = globalThis_1;
	var userAgent$7 = environmentUserAgent;

	var process$3 = globalThis$1i.process;
	var Deno$1 = globalThis$1i.Deno;
	var versions = process$3 && process$3.versions || Deno$1 && Deno$1.version;
	var v8 = versions && versions.v8;
	var match, version;

	if (v8) {
	  match = v8.split('.');
	  // in old Chrome, versions of V8 isn't V8 = Chrome / 10
	  // but their correct versions are not interesting for us
	  version = match[0] > 0 && match[0] < 4 ? 1 : +(match[0] + match[1]);
	}

	// BrowserFS NodeJS `process` polyfill incorrectly set `.v8` to `0.0`
	// so check `userAgent` even if `.v8` exists, but 0
	if (!version && userAgent$7) {
	  match = userAgent$7.match(/Edge\/(\d+)/);
	  if (!match || match[1] >= 74) {
	    match = userAgent$7.match(/Chrome\/(\d+)/);
	    if (match) version = +match[1];
	  }
	}

	var environmentV8Version = version;

	/* eslint-disable es/no-symbol -- required for testing */
	var V8_VERSION$4 = environmentV8Version;
	var fails$1v = fails$1z;
	var globalThis$1h = globalThis_1;

	var $String$9 = globalThis$1h.String;

	// eslint-disable-next-line es/no-object-getownpropertysymbols -- required for testing
	var symbolConstructorDetection = !!Object.getOwnPropertySymbols && !fails$1v(function () {
	  var symbol = Symbol('symbol detection');
	  // Chrome 38 Symbol has incorrect toString conversion
	  // `get-own-property-symbols` polyfill symbols converted to object are not Symbol instances
	  // nb: Do not call `String` directly to avoid this being optimized out to `symbol+''` which will,
	  // of course, fail.
	  return !$String$9(symbol) || !(Object(symbol) instanceof Symbol) ||
	    // Chrome 38-40 symbols are not inherited from DOM collections prototypes to instances
	    !Symbol.sham && V8_VERSION$4 && V8_VERSION$4 < 41;
	});

	/* eslint-disable es/no-symbol -- required for testing */
	var NATIVE_SYMBOL$6 = symbolConstructorDetection;

	var useSymbolAsUid = NATIVE_SYMBOL$6 &&
	  !Symbol.sham &&
	  typeof Symbol.iterator == 'symbol';

	var getBuiltIn$A = getBuiltIn$B;
	var isCallable$x = isCallable$A;
	var isPrototypeOf$e = objectIsPrototypeOf;
	var USE_SYMBOL_AS_UID$1 = useSymbolAsUid;

	var $Object$4 = Object;

	var isSymbol$7 = USE_SYMBOL_AS_UID$1 ? function (it) {
	  return typeof it == 'symbol';
	} : function (it) {
	  var $Symbol = getBuiltIn$A('Symbol');
	  return isCallable$x($Symbol) && isPrototypeOf$e($Symbol.prototype, $Object$4(it));
	};

	var $String$8 = String;

	var tryToString$7 = function (argument) {
	  try {
	    return $String$8(argument);
	  } catch (error) {
	    return 'Object';
	  }
	};

	var isCallable$w = isCallable$A;
	var tryToString$6 = tryToString$7;

	var $TypeError$y = TypeError;

	// `Assert: IsCallable(argument) is true`
	var aCallable$B = function (argument) {
	  if (isCallable$w(argument)) return argument;
	  throw new $TypeError$y(tryToString$6(argument) + ' is not a function');
	};

	var aCallable$A = aCallable$B;
	var isNullOrUndefined$7 = isNullOrUndefined$9;

	// `GetMethod` abstract operation
	// https://tc39.es/ecma262/#sec-getmethod
	var getMethod$h = function (V, P) {
	  var func = V[P];
	  return isNullOrUndefined$7(func) ? undefined : aCallable$A(func);
	};

	var call$Y = functionCall;
	var isCallable$v = isCallable$A;
	var isObject$J = isObject$K;

	var $TypeError$x = TypeError;

	// `OrdinaryToPrimitive` abstract operation
	// https://tc39.es/ecma262/#sec-ordinarytoprimitive
	var ordinaryToPrimitive$2 = function (input, pref) {
	  var fn, val;
	  if (pref === 'string' && isCallable$v(fn = input.toString) && !isObject$J(val = call$Y(fn, input))) return val;
	  if (isCallable$v(fn = input.valueOf) && !isObject$J(val = call$Y(fn, input))) return val;
	  if (pref !== 'string' && isCallable$v(fn = input.toString) && !isObject$J(val = call$Y(fn, input))) return val;
	  throw new $TypeError$x("Can't convert object to primitive value");
	};

	var sharedStore = {exports: {}};

	var isPure = false;

	var globalThis$1g = globalThis_1;

	// eslint-disable-next-line es/no-object-defineproperty -- safe
	var defineProperty$g = Object.defineProperty;

	var defineGlobalProperty$3 = function (key, value) {
	  try {
	    defineProperty$g(globalThis$1g, key, { value: value, configurable: true, writable: true });
	  } catch (error) {
	    globalThis$1g[key] = value;
	  } return value;
	};

	var globalThis$1f = globalThis_1;
	var defineGlobalProperty$2 = defineGlobalProperty$3;

	var SHARED = '__core-js_shared__';
	var store$3 = sharedStore.exports = globalThis$1f[SHARED] || defineGlobalProperty$2(SHARED, {});

	(store$3.versions || (store$3.versions = [])).push({
	  version: '3.45.1',
	  mode: 'global',
	  copyright: '© 2014-2025 Denis Pushkarev (zloirock.ru)',
	  license: 'https://github.com/zloirock/core-js/blob/v3.45.1/LICENSE',
	  source: 'https://github.com/zloirock/core-js'
	});

	var sharedStoreExports = sharedStore.exports;

	var store$2 = sharedStoreExports;

	var shared$8 = function (key, value) {
	  return store$2[key] || (store$2[key] = value || {});
	};

	var requireObjectCoercible$m = requireObjectCoercible$o;

	var $Object$3 = Object;

	// `ToObject` abstract operation
	// https://tc39.es/ecma262/#sec-toobject
	var toObject$v = function (argument) {
	  return $Object$3(requireObjectCoercible$m(argument));
	};

	var uncurryThis$1y = functionUncurryThis;
	var toObject$u = toObject$v;

	var hasOwnProperty = uncurryThis$1y({}.hasOwnProperty);

	// `HasOwnProperty` abstract operation
	// https://tc39.es/ecma262/#sec-hasownproperty
	// eslint-disable-next-line es/no-object-hasown -- safe
	var hasOwnProperty_1 = Object.hasOwn || function hasOwn(it, key) {
	  return hasOwnProperty(toObject$u(it), key);
	};

	var uncurryThis$1x = functionUncurryThis;

	var id$2 = 0;
	var postfix = Math.random();
	var toString$E = uncurryThis$1x(1.1.toString);

	var uid$6 = function (key) {
	  return 'Symbol(' + (key === undefined ? '' : key) + ')_' + toString$E(++id$2 + postfix, 36);
	};

	var globalThis$1e = globalThis_1;
	var shared$7 = shared$8;
	var hasOwn$A = hasOwnProperty_1;
	var uid$5 = uid$6;
	var NATIVE_SYMBOL$5 = symbolConstructorDetection;
	var USE_SYMBOL_AS_UID = useSymbolAsUid;

	var Symbol$5 = globalThis$1e.Symbol;
	var WellKnownSymbolsStore$1 = shared$7('wks');
	var createWellKnownSymbol = USE_SYMBOL_AS_UID ? Symbol$5['for'] || Symbol$5 : Symbol$5 && Symbol$5.withoutSetter || uid$5;

	var wellKnownSymbol$K = function (name) {
	  if (!hasOwn$A(WellKnownSymbolsStore$1, name)) {
	    WellKnownSymbolsStore$1[name] = NATIVE_SYMBOL$5 && hasOwn$A(Symbol$5, name)
	      ? Symbol$5[name]
	      : createWellKnownSymbol('Symbol.' + name);
	  } return WellKnownSymbolsStore$1[name];
	};

	var call$X = functionCall;
	var isObject$I = isObject$K;
	var isSymbol$6 = isSymbol$7;
	var getMethod$g = getMethod$h;
	var ordinaryToPrimitive$1 = ordinaryToPrimitive$2;
	var wellKnownSymbol$J = wellKnownSymbol$K;

	var $TypeError$w = TypeError;
	var TO_PRIMITIVE$1 = wellKnownSymbol$J('toPrimitive');

	// `ToPrimitive` abstract operation
	// https://tc39.es/ecma262/#sec-toprimitive
	var toPrimitive$4 = function (input, pref) {
	  if (!isObject$I(input) || isSymbol$6(input)) return input;
	  var exoticToPrim = getMethod$g(input, TO_PRIMITIVE$1);
	  var result;
	  if (exoticToPrim) {
	    if (pref === undefined) pref = 'default';
	    result = call$X(exoticToPrim, input, pref);
	    if (!isObject$I(result) || isSymbol$6(result)) return result;
	    throw new $TypeError$w("Can't convert object to primitive value");
	  }
	  if (pref === undefined) pref = 'number';
	  return ordinaryToPrimitive$1(input, pref);
	};

	var toPrimitive$3 = toPrimitive$4;
	var isSymbol$5 = isSymbol$7;

	// `ToPropertyKey` abstract operation
	// https://tc39.es/ecma262/#sec-topropertykey
	var toPropertyKey$8 = function (argument) {
	  var key = toPrimitive$3(argument, 'string');
	  return isSymbol$5(key) ? key : key + '';
	};

	var globalThis$1d = globalThis_1;
	var isObject$H = isObject$K;

	var document$3 = globalThis$1d.document;
	// typeof document.createElement is 'object' in old IE
	var EXISTS$1 = isObject$H(document$3) && isObject$H(document$3.createElement);

	var documentCreateElement$2 = function (it) {
	  return EXISTS$1 ? document$3.createElement(it) : {};
	};

	var DESCRIPTORS$Q = descriptors;
	var fails$1u = fails$1z;
	var createElement$1 = documentCreateElement$2;

	// Thanks to IE8 for its funny defineProperty
	var ie8DomDefine = !DESCRIPTORS$Q && !fails$1u(function () {
	  // eslint-disable-next-line es/no-object-defineproperty -- required for testing
	  return Object.defineProperty(createElement$1('div'), 'a', {
	    get: function () { return 7; }
	  }).a !== 7;
	});

	var DESCRIPTORS$P = descriptors;
	var call$W = functionCall;
	var propertyIsEnumerableModule$2 = objectPropertyIsEnumerable;
	var createPropertyDescriptor$c = createPropertyDescriptor$d;
	var toIndexedObject$i = toIndexedObject$j;
	var toPropertyKey$7 = toPropertyKey$8;
	var hasOwn$z = hasOwnProperty_1;
	var IE8_DOM_DEFINE$1 = ie8DomDefine;

	// eslint-disable-next-line es/no-object-getownpropertydescriptor -- safe
	var $getOwnPropertyDescriptor$2 = Object.getOwnPropertyDescriptor;

	// `Object.getOwnPropertyDescriptor` method
	// https://tc39.es/ecma262/#sec-object.getownpropertydescriptor
	objectGetOwnPropertyDescriptor.f = DESCRIPTORS$P ? $getOwnPropertyDescriptor$2 : function getOwnPropertyDescriptor(O, P) {
	  O = toIndexedObject$i(O);
	  P = toPropertyKey$7(P);
	  if (IE8_DOM_DEFINE$1) try {
	    return $getOwnPropertyDescriptor$2(O, P);
	  } catch (error) { /* empty */ }
	  if (hasOwn$z(O, P)) return createPropertyDescriptor$c(!call$W(propertyIsEnumerableModule$2.f, O, P), O[P]);
	};

	var objectDefineProperty = {};

	var DESCRIPTORS$O = descriptors;
	var fails$1t = fails$1z;

	// V8 ~ Chrome 36-
	// https://bugs.chromium.org/p/v8/issues/detail?id=3334
	var v8PrototypeDefineBug = DESCRIPTORS$O && fails$1t(function () {
	  // eslint-disable-next-line es/no-object-defineproperty -- required for testing
	  return Object.defineProperty(function () { /* empty */ }, 'prototype', {
	    value: 42,
	    writable: false
	  }).prototype !== 42;
	});

	var isObject$G = isObject$K;

	var $String$7 = String;
	var $TypeError$v = TypeError;

	// `Assert: Type(argument) is Object`
	var anObject$U = function (argument) {
	  if (isObject$G(argument)) return argument;
	  throw new $TypeError$v($String$7(argument) + ' is not an object');
	};

	var DESCRIPTORS$N = descriptors;
	var IE8_DOM_DEFINE = ie8DomDefine;
	var V8_PROTOTYPE_DEFINE_BUG$1 = v8PrototypeDefineBug;
	var anObject$T = anObject$U;
	var toPropertyKey$6 = toPropertyKey$8;

	var $TypeError$u = TypeError;
	// eslint-disable-next-line es/no-object-defineproperty -- safe
	var $defineProperty$1 = Object.defineProperty;
	// eslint-disable-next-line es/no-object-getownpropertydescriptor -- safe
	var $getOwnPropertyDescriptor$1 = Object.getOwnPropertyDescriptor;
	var ENUMERABLE = 'enumerable';
	var CONFIGURABLE$1 = 'configurable';
	var WRITABLE = 'writable';

	// `Object.defineProperty` method
	// https://tc39.es/ecma262/#sec-object.defineproperty
	objectDefineProperty.f = DESCRIPTORS$N ? V8_PROTOTYPE_DEFINE_BUG$1 ? function defineProperty(O, P, Attributes) {
	  anObject$T(O);
	  P = toPropertyKey$6(P);
	  anObject$T(Attributes);
	  if (typeof O === 'function' && P === 'prototype' && 'value' in Attributes && WRITABLE in Attributes && !Attributes[WRITABLE]) {
	    var current = $getOwnPropertyDescriptor$1(O, P);
	    if (current && current[WRITABLE]) {
	      O[P] = Attributes.value;
	      Attributes = {
	        configurable: CONFIGURABLE$1 in Attributes ? Attributes[CONFIGURABLE$1] : current[CONFIGURABLE$1],
	        enumerable: ENUMERABLE in Attributes ? Attributes[ENUMERABLE] : current[ENUMERABLE],
	        writable: false
	      };
	    }
	  } return $defineProperty$1(O, P, Attributes);
	} : $defineProperty$1 : function defineProperty(O, P, Attributes) {
	  anObject$T(O);
	  P = toPropertyKey$6(P);
	  anObject$T(Attributes);
	  if (IE8_DOM_DEFINE) try {
	    return $defineProperty$1(O, P, Attributes);
	  } catch (error) { /* empty */ }
	  if ('get' in Attributes || 'set' in Attributes) throw new $TypeError$u('Accessors not supported');
	  if ('value' in Attributes) O[P] = Attributes.value;
	  return O;
	};

	var DESCRIPTORS$M = descriptors;
	var definePropertyModule$b = objectDefineProperty;
	var createPropertyDescriptor$b = createPropertyDescriptor$d;

	var createNonEnumerableProperty$h = DESCRIPTORS$M ? function (object, key, value) {
	  return definePropertyModule$b.f(object, key, createPropertyDescriptor$b(1, value));
	} : function (object, key, value) {
	  object[key] = value;
	  return object;
	};

	var makeBuiltIn$4 = {exports: {}};

	var DESCRIPTORS$L = descriptors;
	var hasOwn$y = hasOwnProperty_1;

	var FunctionPrototype$3 = Function.prototype;
	// eslint-disable-next-line es/no-object-getownpropertydescriptor -- safe
	var getDescriptor = DESCRIPTORS$L && Object.getOwnPropertyDescriptor;

	var EXISTS = hasOwn$y(FunctionPrototype$3, 'name');
	// additional protection from minified / mangled / dropped function names
	var PROPER = EXISTS && (function something() { /* empty */ }).name === 'something';
	var CONFIGURABLE = EXISTS && (!DESCRIPTORS$L || (DESCRIPTORS$L && getDescriptor(FunctionPrototype$3, 'name').configurable));

	var functionName = {
	  EXISTS: EXISTS,
	  PROPER: PROPER,
	  CONFIGURABLE: CONFIGURABLE
	};

	var uncurryThis$1w = functionUncurryThis;
	var isCallable$u = isCallable$A;
	var store$1 = sharedStoreExports;

	var functionToString$1 = uncurryThis$1w(Function.toString);

	// this helper broken in `core-js@3.4.1-3.4.4`, so we can't use `shared` helper
	if (!isCallable$u(store$1.inspectSource)) {
	  store$1.inspectSource = function (it) {
	    return functionToString$1(it);
	  };
	}

	var inspectSource$3 = store$1.inspectSource;

	var globalThis$1c = globalThis_1;
	var isCallable$t = isCallable$A;

	var WeakMap$2 = globalThis$1c.WeakMap;

	var weakMapBasicDetection = isCallable$t(WeakMap$2) && /native code/.test(String(WeakMap$2));

	var shared$6 = shared$8;
	var uid$4 = uid$6;

	var keys$2 = shared$6('keys');

	var sharedKey$4 = function (key) {
	  return keys$2[key] || (keys$2[key] = uid$4(key));
	};

	var hiddenKeys$6 = {};

	var NATIVE_WEAK_MAP$1 = weakMapBasicDetection;
	var globalThis$1b = globalThis_1;
	var isObject$F = isObject$K;
	var createNonEnumerableProperty$g = createNonEnumerableProperty$h;
	var hasOwn$x = hasOwnProperty_1;
	var shared$5 = sharedStoreExports;
	var sharedKey$3 = sharedKey$4;
	var hiddenKeys$5 = hiddenKeys$6;

	var OBJECT_ALREADY_INITIALIZED = 'Object already initialized';
	var TypeError$a = globalThis$1b.TypeError;
	var WeakMap$1 = globalThis$1b.WeakMap;
	var set$4, get$3, has$7;

	var enforce = function (it) {
	  return has$7(it) ? get$3(it) : set$4(it, {});
	};

	var getterFor$1 = function (TYPE) {
	  return function (it) {
	    var state;
	    if (!isObject$F(it) || (state = get$3(it)).type !== TYPE) {
	      throw new TypeError$a('Incompatible receiver, ' + TYPE + ' required');
	    } return state;
	  };
	};

	if (NATIVE_WEAK_MAP$1 || shared$5.state) {
	  var store = shared$5.state || (shared$5.state = new WeakMap$1());
	  /* eslint-disable no-self-assign -- prototype methods protection */
	  store.get = store.get;
	  store.has = store.has;
	  store.set = store.set;
	  /* eslint-enable no-self-assign -- prototype methods protection */
	  set$4 = function (it, metadata) {
	    if (store.has(it)) throw new TypeError$a(OBJECT_ALREADY_INITIALIZED);
	    metadata.facade = it;
	    store.set(it, metadata);
	    return metadata;
	  };
	  get$3 = function (it) {
	    return store.get(it) || {};
	  };
	  has$7 = function (it) {
	    return store.has(it);
	  };
	} else {
	  var STATE = sharedKey$3('state');
	  hiddenKeys$5[STATE] = true;
	  set$4 = function (it, metadata) {
	    if (hasOwn$x(it, STATE)) throw new TypeError$a(OBJECT_ALREADY_INITIALIZED);
	    metadata.facade = it;
	    createNonEnumerableProperty$g(it, STATE, metadata);
	    return metadata;
	  };
	  get$3 = function (it) {
	    return hasOwn$x(it, STATE) ? it[STATE] : {};
	  };
	  has$7 = function (it) {
	    return hasOwn$x(it, STATE);
	  };
	}

	var internalState = {
	  set: set$4,
	  get: get$3,
	  has: has$7,
	  enforce: enforce,
	  getterFor: getterFor$1
	};

	var uncurryThis$1v = functionUncurryThis;
	var fails$1s = fails$1z;
	var isCallable$s = isCallable$A;
	var hasOwn$w = hasOwnProperty_1;
	var DESCRIPTORS$K = descriptors;
	var CONFIGURABLE_FUNCTION_NAME$2 = functionName.CONFIGURABLE;
	var inspectSource$2 = inspectSource$3;
	var InternalStateModule$h = internalState;

	var enforceInternalState$4 = InternalStateModule$h.enforce;
	var getInternalState$b = InternalStateModule$h.get;
	var $String$6 = String;
	// eslint-disable-next-line es/no-object-defineproperty -- safe
	var defineProperty$f = Object.defineProperty;
	var stringSlice$i = uncurryThis$1v(''.slice);
	var replace$c = uncurryThis$1v(''.replace);
	var join$9 = uncurryThis$1v([].join);

	var CONFIGURABLE_LENGTH = DESCRIPTORS$K && !fails$1s(function () {
	  return defineProperty$f(function () { /* empty */ }, 'length', { value: 8 }).length !== 8;
	});

	var TEMPLATE = String(String).split('String');

	var makeBuiltIn$3 = makeBuiltIn$4.exports = function (value, name, options) {
	  if (stringSlice$i($String$6(name), 0, 7) === 'Symbol(') {
	    name = '[' + replace$c($String$6(name), /^Symbol\(([^)]*)\).*$/, '$1') + ']';
	  }
	  if (options && options.getter) name = 'get ' + name;
	  if (options && options.setter) name = 'set ' + name;
	  if (!hasOwn$w(value, 'name') || (CONFIGURABLE_FUNCTION_NAME$2 && value.name !== name)) {
	    if (DESCRIPTORS$K) defineProperty$f(value, 'name', { value: name, configurable: true });
	    else value.name = name;
	  }
	  if (CONFIGURABLE_LENGTH && options && hasOwn$w(options, 'arity') && value.length !== options.arity) {
	    defineProperty$f(value, 'length', { value: options.arity });
	  }
	  try {
	    if (options && hasOwn$w(options, 'constructor') && options.constructor) {
	      if (DESCRIPTORS$K) defineProperty$f(value, 'prototype', { writable: false });
	    // in V8 ~ Chrome 53, prototypes of some methods, like `Array.prototype.values`, are non-writable
	    } else if (value.prototype) value.prototype = undefined;
	  } catch (error) { /* empty */ }
	  var state = enforceInternalState$4(value);
	  if (!hasOwn$w(state, 'source')) {
	    state.source = join$9(TEMPLATE, typeof name == 'string' ? name : '');
	  } return value;
	};

	// add fake Function#toString for correct work wrapped methods / constructors with methods like LoDash isNative
	// eslint-disable-next-line no-extend-native -- required
	Function.prototype.toString = makeBuiltIn$3(function toString() {
	  return isCallable$s(this) && getInternalState$b(this).source || inspectSource$2(this);
	}, 'toString');

	var makeBuiltInExports = makeBuiltIn$4.exports;

	var isCallable$r = isCallable$A;
	var definePropertyModule$a = objectDefineProperty;
	var makeBuiltIn$2 = makeBuiltInExports;
	var defineGlobalProperty$1 = defineGlobalProperty$3;

	var defineBuiltIn$t = function (O, key, value, options) {
	  if (!options) options = {};
	  var simple = options.enumerable;
	  var name = options.name !== undefined ? options.name : key;
	  if (isCallable$r(value)) makeBuiltIn$2(value, name, options);
	  if (options.global) {
	    if (simple) O[key] = value;
	    else defineGlobalProperty$1(key, value);
	  } else {
	    try {
	      if (!options.unsafe) delete O[key];
	      else if (O[key]) simple = true;
	    } catch (error) { /* empty */ }
	    if (simple) O[key] = value;
	    else definePropertyModule$a.f(O, key, {
	      value: value,
	      enumerable: false,
	      configurable: !options.nonConfigurable,
	      writable: !options.nonWritable
	    });
	  } return O;
	};

	var objectGetOwnPropertyNames = {};

	var ceil$1 = Math.ceil;
	var floor$a = Math.floor;

	// `Math.trunc` method
	// https://tc39.es/ecma262/#sec-math.trunc
	// eslint-disable-next-line es/no-math-trunc -- safe
	var mathTrunc = Math.trunc || function trunc(x) {
	  var n = +x;
	  return (n > 0 ? floor$a : ceil$1)(n);
	};

	var trunc$1 = mathTrunc;

	// `ToIntegerOrInfinity` abstract operation
	// https://tc39.es/ecma262/#sec-tointegerorinfinity
	var toIntegerOrInfinity$m = function (argument) {
	  var number = +argument;
	  // eslint-disable-next-line no-self-compare -- NaN check
	  return number !== number || number === 0 ? 0 : trunc$1(number);
	};

	var toIntegerOrInfinity$l = toIntegerOrInfinity$m;

	var max$7 = Math.max;
	var min$c = Math.min;

	// Helper for a popular repeating case of the spec:
	// Let integer be ? ToInteger(index).
	// If integer < 0, let result be max((length + integer), 0); else let result be min(integer, length).
	var toAbsoluteIndex$9 = function (index, length) {
	  var integer = toIntegerOrInfinity$l(index);
	  return integer < 0 ? max$7(integer + length, 0) : min$c(integer, length);
	};

	var toIntegerOrInfinity$k = toIntegerOrInfinity$m;

	var min$b = Math.min;

	// `ToLength` abstract operation
	// https://tc39.es/ecma262/#sec-tolength
	var toLength$d = function (argument) {
	  var len = toIntegerOrInfinity$k(argument);
	  return len > 0 ? min$b(len, 0x1FFFFFFFFFFFFF) : 0; // 2 ** 53 - 1 == 9007199254740991
	};

	var toLength$c = toLength$d;

	// `LengthOfArrayLike` abstract operation
	// https://tc39.es/ecma262/#sec-lengthofarraylike
	var lengthOfArrayLike$s = function (obj) {
	  return toLength$c(obj.length);
	};

	var toIndexedObject$h = toIndexedObject$j;
	var toAbsoluteIndex$8 = toAbsoluteIndex$9;
	var lengthOfArrayLike$r = lengthOfArrayLike$s;

	// `Array.prototype.{ indexOf, includes }` methods implementation
	var createMethod$8 = function (IS_INCLUDES) {
	  return function ($this, el, fromIndex) {
	    var O = toIndexedObject$h($this);
	    var length = lengthOfArrayLike$r(O);
	    if (length === 0) return !IS_INCLUDES && -1;
	    var index = toAbsoluteIndex$8(fromIndex, length);
	    var value;
	    // Array#includes uses SameValueZero equality algorithm
	    // eslint-disable-next-line no-self-compare -- NaN check
	    if (IS_INCLUDES && el !== el) while (length > index) {
	      value = O[index++];
	      // eslint-disable-next-line no-self-compare -- NaN check
	      if (value !== value) return true;
	    // Array#indexOf ignores holes, Array#includes - not
	    } else for (;length > index; index++) {
	      if ((IS_INCLUDES || index in O) && O[index] === el) return IS_INCLUDES || index || 0;
	    } return !IS_INCLUDES && -1;
	  };
	};

	var arrayIncludes = {
	  // `Array.prototype.includes` method
	  // https://tc39.es/ecma262/#sec-array.prototype.includes
	  includes: createMethod$8(true),
	  // `Array.prototype.indexOf` method
	  // https://tc39.es/ecma262/#sec-array.prototype.indexof
	  indexOf: createMethod$8(false)
	};

	var uncurryThis$1u = functionUncurryThis;
	var hasOwn$v = hasOwnProperty_1;
	var toIndexedObject$g = toIndexedObject$j;
	var indexOf$2 = arrayIncludes.indexOf;
	var hiddenKeys$4 = hiddenKeys$6;

	var push$k = uncurryThis$1u([].push);

	var objectKeysInternal = function (object, names) {
	  var O = toIndexedObject$g(object);
	  var i = 0;
	  var result = [];
	  var key;
	  for (key in O) !hasOwn$v(hiddenKeys$4, key) && hasOwn$v(O, key) && push$k(result, key);
	  // Don't enum bug & hidden keys
	  while (names.length > i) if (hasOwn$v(O, key = names[i++])) {
	    ~indexOf$2(result, key) || push$k(result, key);
	  }
	  return result;
	};

	// IE8- don't enum bug keys
	var enumBugKeys$3 = [
	  'constructor',
	  'hasOwnProperty',
	  'isPrototypeOf',
	  'propertyIsEnumerable',
	  'toLocaleString',
	  'toString',
	  'valueOf'
	];

	var internalObjectKeys$1 = objectKeysInternal;
	var enumBugKeys$2 = enumBugKeys$3;

	var hiddenKeys$3 = enumBugKeys$2.concat('length', 'prototype');

	// `Object.getOwnPropertyNames` method
	// https://tc39.es/ecma262/#sec-object.getownpropertynames
	// eslint-disable-next-line es/no-object-getownpropertynames -- safe
	objectGetOwnPropertyNames.f = Object.getOwnPropertyNames || function getOwnPropertyNames(O) {
	  return internalObjectKeys$1(O, hiddenKeys$3);
	};

	var objectGetOwnPropertySymbols = {};

	// eslint-disable-next-line es/no-object-getownpropertysymbols -- safe
	objectGetOwnPropertySymbols.f = Object.getOwnPropertySymbols;

	var getBuiltIn$z = getBuiltIn$B;
	var uncurryThis$1t = functionUncurryThis;
	var getOwnPropertyNamesModule$2 = objectGetOwnPropertyNames;
	var getOwnPropertySymbolsModule$3 = objectGetOwnPropertySymbols;
	var anObject$S = anObject$U;

	var concat$3 = uncurryThis$1t([].concat);

	// all object keys, includes non-enumerable and symbols
	var ownKeys$3 = getBuiltIn$z('Reflect', 'ownKeys') || function ownKeys(it) {
	  var keys = getOwnPropertyNamesModule$2.f(anObject$S(it));
	  var getOwnPropertySymbols = getOwnPropertySymbolsModule$3.f;
	  return getOwnPropertySymbols ? concat$3(keys, getOwnPropertySymbols(it)) : keys;
	};

	var hasOwn$u = hasOwnProperty_1;
	var ownKeys$2 = ownKeys$3;
	var getOwnPropertyDescriptorModule$6 = objectGetOwnPropertyDescriptor;
	var definePropertyModule$9 = objectDefineProperty;

	var copyConstructorProperties$7 = function (target, source, exceptions) {
	  var keys = ownKeys$2(source);
	  var defineProperty = definePropertyModule$9.f;
	  var getOwnPropertyDescriptor = getOwnPropertyDescriptorModule$6.f;
	  for (var i = 0; i < keys.length; i++) {
	    var key = keys[i];
	    if (!hasOwn$u(target, key) && !(exceptions && hasOwn$u(exceptions, key))) {
	      defineProperty(target, key, getOwnPropertyDescriptor(source, key));
	    }
	  }
	};

	var fails$1r = fails$1z;
	var isCallable$q = isCallable$A;

	var replacement = /#|\.prototype\./;

	var isForced$5 = function (feature, detection) {
	  var value = data[normalize(feature)];
	  return value === POLYFILL ? true
	    : value === NATIVE ? false
	    : isCallable$q(detection) ? fails$1r(detection)
	    : !!detection;
	};

	var normalize = isForced$5.normalize = function (string) {
	  return String(string).replace(replacement, '.').toLowerCase();
	};

	var data = isForced$5.data = {};
	var NATIVE = isForced$5.NATIVE = 'N';
	var POLYFILL = isForced$5.POLYFILL = 'P';

	var isForced_1 = isForced$5;

	var globalThis$1a = globalThis_1;
	var getOwnPropertyDescriptor$a = objectGetOwnPropertyDescriptor.f;
	var createNonEnumerableProperty$f = createNonEnumerableProperty$h;
	var defineBuiltIn$s = defineBuiltIn$t;
	var defineGlobalProperty = defineGlobalProperty$3;
	var copyConstructorProperties$6 = copyConstructorProperties$7;
	var isForced$4 = isForced_1;

	/*
	  options.target         - name of the target object
	  options.global         - target is the global object
	  options.stat           - export as static methods of target
	  options.proto          - export as prototype methods of target
	  options.real           - real prototype method for the `pure` version
	  options.forced         - export even if the native feature is available
	  options.bind           - bind methods to the target, required for the `pure` version
	  options.wrap           - wrap constructors to preventing global pollution, required for the `pure` version
	  options.unsafe         - use the simple assignment of property instead of delete + defineProperty
	  options.sham           - add a flag to not completely full polyfills
	  options.enumerable     - export as enumerable property
	  options.dontCallGetSet - prevent calling a getter on target
	  options.name           - the .name of the function if it does not match the key
	*/
	var _export = function (options, source) {
	  var TARGET = options.target;
	  var GLOBAL = options.global;
	  var STATIC = options.stat;
	  var FORCED, target, key, targetProperty, sourceProperty, descriptor;
	  if (GLOBAL) {
	    target = globalThis$1a;
	  } else if (STATIC) {
	    target = globalThis$1a[TARGET] || defineGlobalProperty(TARGET, {});
	  } else {
	    target = globalThis$1a[TARGET] && globalThis$1a[TARGET].prototype;
	  }
	  if (target) for (key in source) {
	    sourceProperty = source[key];
	    if (options.dontCallGetSet) {
	      descriptor = getOwnPropertyDescriptor$a(target, key);
	      targetProperty = descriptor && descriptor.value;
	    } else targetProperty = target[key];
	    FORCED = isForced$4(GLOBAL ? key : TARGET + (STATIC ? '.' : '#') + key, options.forced);
	    // contained in target
	    if (!FORCED && targetProperty !== undefined) {
	      if (typeof sourceProperty == typeof targetProperty) continue;
	      copyConstructorProperties$6(sourceProperty, targetProperty);
	    }
	    // add a flag to not completely full polyfills
	    if (options.sham || (targetProperty && targetProperty.sham)) {
	      createNonEnumerableProperty$f(sourceProperty, 'sham', true);
	    }
	    defineBuiltIn$s(target, key, sourceProperty, options);
	  }
	};

	var wellKnownSymbol$I = wellKnownSymbol$K;

	var TO_STRING_TAG$9 = wellKnownSymbol$I('toStringTag');
	var test$2 = {};

	test$2[TO_STRING_TAG$9] = 'z';

	var toStringTagSupport = String(test$2) === '[object z]';

	var TO_STRING_TAG_SUPPORT$2 = toStringTagSupport;
	var isCallable$p = isCallable$A;
	var classofRaw$1 = classofRaw$2;
	var wellKnownSymbol$H = wellKnownSymbol$K;

	var TO_STRING_TAG$8 = wellKnownSymbol$H('toStringTag');
	var $Object$2 = Object;

	// ES3 wrong here
	var CORRECT_ARGUMENTS = classofRaw$1(function () { return arguments; }()) === 'Arguments';

	// fallback for IE11 Script Access Denied error
	var tryGet = function (it, key) {
	  try {
	    return it[key];
	  } catch (error) { /* empty */ }
	};

	// getting tag from ES6+ `Object.prototype.toString`
	var classof$p = TO_STRING_TAG_SUPPORT$2 ? classofRaw$1 : function (it) {
	  var O, tag, result;
	  return it === undefined ? 'Undefined' : it === null ? 'Null'
	    // @@toStringTag case
	    : typeof (tag = tryGet(O = $Object$2(it), TO_STRING_TAG$8)) == 'string' ? tag
	    // builtinTag case
	    : CORRECT_ARGUMENTS ? classofRaw$1(O)
	    // ES3 arguments fallback
	    : (result = classofRaw$1(O)) === 'Object' && isCallable$p(O.callee) ? 'Arguments' : result;
	};

	var classof$o = classof$p;

	var $String$5 = String;

	var toString$D = function (argument) {
	  if (classof$o(argument) === 'Symbol') throw new TypeError('Cannot convert a Symbol value to a string');
	  return $String$5(argument);
	};

	var objectDefineProperties = {};

	var internalObjectKeys = objectKeysInternal;
	var enumBugKeys$1 = enumBugKeys$3;

	// `Object.keys` method
	// https://tc39.es/ecma262/#sec-object.keys
	// eslint-disable-next-line es/no-object-keys -- safe
	var objectKeys$5 = Object.keys || function keys(O) {
	  return internalObjectKeys(O, enumBugKeys$1);
	};

	var DESCRIPTORS$J = descriptors;
	var V8_PROTOTYPE_DEFINE_BUG = v8PrototypeDefineBug;
	var definePropertyModule$8 = objectDefineProperty;
	var anObject$R = anObject$U;
	var toIndexedObject$f = toIndexedObject$j;
	var objectKeys$4 = objectKeys$5;

	// `Object.defineProperties` method
	// https://tc39.es/ecma262/#sec-object.defineproperties
	// eslint-disable-next-line es/no-object-defineproperties -- safe
	objectDefineProperties.f = DESCRIPTORS$J && !V8_PROTOTYPE_DEFINE_BUG ? Object.defineProperties : function defineProperties(O, Properties) {
	  anObject$R(O);
	  var props = toIndexedObject$f(Properties);
	  var keys = objectKeys$4(Properties);
	  var length = keys.length;
	  var index = 0;
	  var key;
	  while (length > index) definePropertyModule$8.f(O, key = keys[index++], props[key]);
	  return O;
	};

	var getBuiltIn$y = getBuiltIn$B;

	var html$2 = getBuiltIn$y('document', 'documentElement');

	/* global ActiveXObject -- old IE, WSH */
	var anObject$Q = anObject$U;
	var definePropertiesModule$1 = objectDefineProperties;
	var enumBugKeys = enumBugKeys$3;
	var hiddenKeys$2 = hiddenKeys$6;
	var html$1 = html$2;
	var documentCreateElement$1 = documentCreateElement$2;
	var sharedKey$2 = sharedKey$4;

	var GT = '>';
	var LT = '<';
	var PROTOTYPE$2 = 'prototype';
	var SCRIPT = 'script';
	var IE_PROTO$1 = sharedKey$2('IE_PROTO');

	var EmptyConstructor = function () { /* empty */ };

	var scriptTag = function (content) {
	  return LT + SCRIPT + GT + content + LT + '/' + SCRIPT + GT;
	};

	// Create object with fake `null` prototype: use ActiveX Object with cleared prototype
	var NullProtoObjectViaActiveX = function (activeXDocument) {
	  activeXDocument.write(scriptTag(''));
	  activeXDocument.close();
	  var temp = activeXDocument.parentWindow.Object;
	  // eslint-disable-next-line no-useless-assignment -- avoid memory leak
	  activeXDocument = null;
	  return temp;
	};

	// Create object with fake `null` prototype: use iframe Object with cleared prototype
	var NullProtoObjectViaIFrame = function () {
	  // Thrash, waste and sodomy: IE GC bug
	  var iframe = documentCreateElement$1('iframe');
	  var JS = 'java' + SCRIPT + ':';
	  var iframeDocument;
	  iframe.style.display = 'none';
	  html$1.appendChild(iframe);
	  // https://github.com/zloirock/core-js/issues/475
	  iframe.src = String(JS);
	  iframeDocument = iframe.contentWindow.document;
	  iframeDocument.open();
	  iframeDocument.write(scriptTag('document.F=Object'));
	  iframeDocument.close();
	  return iframeDocument.F;
	};

	// Check for document.domain and active x support
	// No need to use active x approach when document.domain is not set
	// see https://github.com/es-shims/es5-shim/issues/150
	// variation of https://github.com/kitcambridge/es5-shim/commit/4f738ac066346
	// avoid IE GC bug
	var activeXDocument;
	var NullProtoObject = function () {
	  try {
	    activeXDocument = new ActiveXObject('htmlfile');
	  } catch (error) { /* ignore */ }
	  NullProtoObject = typeof document != 'undefined'
	    ? document.domain && activeXDocument
	      ? NullProtoObjectViaActiveX(activeXDocument) // old IE
	      : NullProtoObjectViaIFrame()
	    : NullProtoObjectViaActiveX(activeXDocument); // WSH
	  var length = enumBugKeys.length;
	  while (length--) delete NullProtoObject[PROTOTYPE$2][enumBugKeys[length]];
	  return NullProtoObject();
	};

	hiddenKeys$2[IE_PROTO$1] = true;

	// `Object.create` method
	// https://tc39.es/ecma262/#sec-object.create
	// eslint-disable-next-line es/no-object-create -- safe
	var objectCreate = Object.create || function create(O, Properties) {
	  var result;
	  if (O !== null) {
	    EmptyConstructor[PROTOTYPE$2] = anObject$Q(O);
	    result = new EmptyConstructor();
	    EmptyConstructor[PROTOTYPE$2] = null;
	    // add "__proto__" for Object.getPrototypeOf polyfill
	    result[IE_PROTO$1] = O;
	  } else result = NullProtoObject();
	  return Properties === undefined ? result : definePropertiesModule$1.f(result, Properties);
	};

	var objectGetOwnPropertyNamesExternal = {};

	var uncurryThis$1s = functionUncurryThis;

	var arraySlice$a = uncurryThis$1s([].slice);

	/* eslint-disable es/no-object-getownpropertynames -- safe */
	var classof$n = classofRaw$2;
	var toIndexedObject$e = toIndexedObject$j;
	var $getOwnPropertyNames$1 = objectGetOwnPropertyNames.f;
	var arraySlice$9 = arraySlice$a;

	var windowNames = typeof window == 'object' && window && Object.getOwnPropertyNames
	  ? Object.getOwnPropertyNames(window) : [];

	var getWindowNames = function (it) {
	  try {
	    return $getOwnPropertyNames$1(it);
	  } catch (error) {
	    return arraySlice$9(windowNames);
	  }
	};

	// fallback for IE11 buggy Object.getOwnPropertyNames with iframe and window
	objectGetOwnPropertyNamesExternal.f = function getOwnPropertyNames(it) {
	  return windowNames && classof$n(it) === 'Window'
	    ? getWindowNames(it)
	    : $getOwnPropertyNames$1(toIndexedObject$e(it));
	};

	var makeBuiltIn$1 = makeBuiltInExports;
	var defineProperty$e = objectDefineProperty;

	var defineBuiltInAccessor$l = function (target, name, descriptor) {
	  if (descriptor.get) makeBuiltIn$1(descriptor.get, name, { getter: true });
	  if (descriptor.set) makeBuiltIn$1(descriptor.set, name, { setter: true });
	  return defineProperty$e.f(target, name, descriptor);
	};

	var wellKnownSymbolWrapped = {};

	var wellKnownSymbol$G = wellKnownSymbol$K;

	wellKnownSymbolWrapped.f = wellKnownSymbol$G;

	var globalThis$19 = globalThis_1;

	var path$3 = globalThis$19;

	var path$2 = path$3;
	var hasOwn$t = hasOwnProperty_1;
	var wrappedWellKnownSymbolModule$1 = wellKnownSymbolWrapped;
	var defineProperty$d = objectDefineProperty.f;

	var wellKnownSymbolDefine = function (NAME) {
	  var Symbol = path$2.Symbol || (path$2.Symbol = {});
	  if (!hasOwn$t(Symbol, NAME)) defineProperty$d(Symbol, NAME, {
	    value: wrappedWellKnownSymbolModule$1.f(NAME)
	  });
	};

	var call$V = functionCall;
	var getBuiltIn$x = getBuiltIn$B;
	var wellKnownSymbol$F = wellKnownSymbol$K;
	var defineBuiltIn$r = defineBuiltIn$t;

	var symbolDefineToPrimitive = function () {
	  var Symbol = getBuiltIn$x('Symbol');
	  var SymbolPrototype = Symbol && Symbol.prototype;
	  var valueOf = SymbolPrototype && SymbolPrototype.valueOf;
	  var TO_PRIMITIVE = wellKnownSymbol$F('toPrimitive');

	  if (SymbolPrototype && !SymbolPrototype[TO_PRIMITIVE]) {
	    // `Symbol.prototype[@@toPrimitive]` method
	    // https://tc39.es/ecma262/#sec-symbol.prototype-@@toprimitive
	    // eslint-disable-next-line no-unused-vars -- required for .length
	    defineBuiltIn$r(SymbolPrototype, TO_PRIMITIVE, function (hint) {
	      return call$V(valueOf, this);
	    }, { arity: 1 });
	  }
	};

	var defineProperty$c = objectDefineProperty.f;
	var hasOwn$s = hasOwnProperty_1;
	var wellKnownSymbol$E = wellKnownSymbol$K;

	var TO_STRING_TAG$7 = wellKnownSymbol$E('toStringTag');

	var setToStringTag$e = function (target, TAG, STATIC) {
	  if (target && !STATIC) target = target.prototype;
	  if (target && !hasOwn$s(target, TO_STRING_TAG$7)) {
	    defineProperty$c(target, TO_STRING_TAG$7, { configurable: true, value: TAG });
	  }
	};

	var classofRaw = classofRaw$2;
	var uncurryThis$1r = functionUncurryThis;

	var functionUncurryThisClause = function (fn) {
	  // Nashorn bug:
	  //   https://github.com/zloirock/core-js/issues/1128
	  //   https://github.com/zloirock/core-js/issues/1130
	  if (classofRaw(fn) === 'Function') return uncurryThis$1r(fn);
	};

	var uncurryThis$1q = functionUncurryThisClause;
	var aCallable$z = aCallable$B;
	var NATIVE_BIND$2 = functionBindNative;

	var bind$g = uncurryThis$1q(uncurryThis$1q.bind);

	// optional / simple context binding
	var functionBindContext = function (fn, that) {
	  aCallable$z(fn);
	  return that === undefined ? fn : NATIVE_BIND$2 ? bind$g(fn, that) : function (/* ...args */) {
	    return fn.apply(that, arguments);
	  };
	};

	var classof$m = classofRaw$2;

	// `IsArray` abstract operation
	// https://tc39.es/ecma262/#sec-isarray
	// eslint-disable-next-line es/no-array-isarray -- safe
	var isArray$9 = Array.isArray || function isArray(argument) {
	  return classof$m(argument) === 'Array';
	};

	var uncurryThis$1p = functionUncurryThis;
	var fails$1q = fails$1z;
	var isCallable$o = isCallable$A;
	var classof$l = classof$p;
	var getBuiltIn$w = getBuiltIn$B;
	var inspectSource$1 = inspectSource$3;

	var noop = function () { /* empty */ };
	var construct$1 = getBuiltIn$w('Reflect', 'construct');
	var constructorRegExp = /^\s*(?:class|function)\b/;
	var exec$c = uncurryThis$1p(constructorRegExp.exec);
	var INCORRECT_TO_STRING$2 = !constructorRegExp.test(noop);

	var isConstructorModern = function isConstructor(argument) {
	  if (!isCallable$o(argument)) return false;
	  try {
	    construct$1(noop, [], argument);
	    return true;
	  } catch (error) {
	    return false;
	  }
	};

	var isConstructorLegacy = function isConstructor(argument) {
	  if (!isCallable$o(argument)) return false;
	  switch (classof$l(argument)) {
	    case 'AsyncFunction':
	    case 'GeneratorFunction':
	    case 'AsyncGeneratorFunction': return false;
	  }
	  try {
	    // we can't check .prototype since constructors produced by .bind haven't it
	    // `Function#toString` throws on some built-it function in some legacy engines
	    // (for example, `DOMQuad` and similar in FF41-)
	    return INCORRECT_TO_STRING$2 || !!exec$c(constructorRegExp, inspectSource$1(argument));
	  } catch (error) {
	    return true;
	  }
	};

	isConstructorLegacy.sham = true;

	// `IsConstructor` abstract operation
	// https://tc39.es/ecma262/#sec-isconstructor
	var isConstructor$7 = !construct$1 || fails$1q(function () {
	  var called;
	  return isConstructorModern(isConstructorModern.call)
	    || !isConstructorModern(Object)
	    || !isConstructorModern(function () { called = true; })
	    || called;
	}) ? isConstructorLegacy : isConstructorModern;

	var isArray$8 = isArray$9;
	var isConstructor$6 = isConstructor$7;
	var isObject$E = isObject$K;
	var wellKnownSymbol$D = wellKnownSymbol$K;

	var SPECIES$6 = wellKnownSymbol$D('species');
	var $Array$a = Array;

	// a part of `ArraySpeciesCreate` abstract operation
	// https://tc39.es/ecma262/#sec-arrayspeciescreate
	var arraySpeciesConstructor$1 = function (originalArray) {
	  var C;
	  if (isArray$8(originalArray)) {
	    C = originalArray.constructor;
	    // cross-realm fallback
	    if (isConstructor$6(C) && (C === $Array$a || isArray$8(C.prototype))) C = undefined;
	    else if (isObject$E(C)) {
	      C = C[SPECIES$6];
	      if (C === null) C = undefined;
	    }
	  } return C === undefined ? $Array$a : C;
	};

	var arraySpeciesConstructor = arraySpeciesConstructor$1;

	// `ArraySpeciesCreate` abstract operation
	// https://tc39.es/ecma262/#sec-arrayspeciescreate
	var arraySpeciesCreate$5 = function (originalArray, length) {
	  return new (arraySpeciesConstructor(originalArray))(length === 0 ? 0 : length);
	};

	var bind$f = functionBindContext;
	var uncurryThis$1o = functionUncurryThis;
	var IndexedObject$4 = indexedObject;
	var toObject$t = toObject$v;
	var lengthOfArrayLike$q = lengthOfArrayLike$s;
	var arraySpeciesCreate$4 = arraySpeciesCreate$5;

	var push$j = uncurryThis$1o([].push);

	// `Array.prototype.{ forEach, map, filter, some, every, find, findIndex, filterReject }` methods implementation
	var createMethod$7 = function (TYPE) {
	  var IS_MAP = TYPE === 1;
	  var IS_FILTER = TYPE === 2;
	  var IS_SOME = TYPE === 3;
	  var IS_EVERY = TYPE === 4;
	  var IS_FIND_INDEX = TYPE === 6;
	  var IS_FILTER_REJECT = TYPE === 7;
	  var NO_HOLES = TYPE === 5 || IS_FIND_INDEX;
	  return function ($this, callbackfn, that, specificCreate) {
	    var O = toObject$t($this);
	    var self = IndexedObject$4(O);
	    var length = lengthOfArrayLike$q(self);
	    var boundFunction = bind$f(callbackfn, that);
	    var index = 0;
	    var create = specificCreate || arraySpeciesCreate$4;
	    var target = IS_MAP ? create($this, length) : IS_FILTER || IS_FILTER_REJECT ? create($this, 0) : undefined;
	    var value, result;
	    for (;length > index; index++) if (NO_HOLES || index in self) {
	      value = self[index];
	      result = boundFunction(value, index, O);
	      if (TYPE) {
	        if (IS_MAP) target[index] = result; // map
	        else if (result) switch (TYPE) {
	          case 3: return true;              // some
	          case 5: return value;             // find
	          case 6: return index;             // findIndex
	          case 2: push$j(target, value);      // filter
	        } else switch (TYPE) {
	          case 4: return false;             // every
	          case 7: push$j(target, value);      // filterReject
	        }
	      }
	    }
	    return IS_FIND_INDEX ? -1 : IS_SOME || IS_EVERY ? IS_EVERY : target;
	  };
	};

	var arrayIteration = {
	  // `Array.prototype.forEach` method
	  // https://tc39.es/ecma262/#sec-array.prototype.foreach
	  forEach: createMethod$7(0),
	  // `Array.prototype.map` method
	  // https://tc39.es/ecma262/#sec-array.prototype.map
	  map: createMethod$7(1),
	  // `Array.prototype.filter` method
	  // https://tc39.es/ecma262/#sec-array.prototype.filter
	  filter: createMethod$7(2),
	  // `Array.prototype.some` method
	  // https://tc39.es/ecma262/#sec-array.prototype.some
	  some: createMethod$7(3),
	  // `Array.prototype.every` method
	  // https://tc39.es/ecma262/#sec-array.prototype.every
	  every: createMethod$7(4),
	  // `Array.prototype.find` method
	  // https://tc39.es/ecma262/#sec-array.prototype.find
	  find: createMethod$7(5),
	  // `Array.prototype.findIndex` method
	  // https://tc39.es/ecma262/#sec-array.prototype.findIndex
	  findIndex: createMethod$7(6)};

	var $$3F = _export;
	var globalThis$18 = globalThis_1;
	var call$U = functionCall;
	var uncurryThis$1n = functionUncurryThis;
	var DESCRIPTORS$I = descriptors;
	var NATIVE_SYMBOL$4 = symbolConstructorDetection;
	var fails$1p = fails$1z;
	var hasOwn$r = hasOwnProperty_1;
	var isPrototypeOf$d = objectIsPrototypeOf;
	var anObject$P = anObject$U;
	var toIndexedObject$d = toIndexedObject$j;
	var toPropertyKey$5 = toPropertyKey$8;
	var $toString$3 = toString$D;
	var createPropertyDescriptor$a = createPropertyDescriptor$d;
	var nativeObjectCreate = objectCreate;
	var objectKeys$3 = objectKeys$5;
	var getOwnPropertyNamesModule$1 = objectGetOwnPropertyNames;
	var getOwnPropertyNamesExternal = objectGetOwnPropertyNamesExternal;
	var getOwnPropertySymbolsModule$2 = objectGetOwnPropertySymbols;
	var getOwnPropertyDescriptorModule$5 = objectGetOwnPropertyDescriptor;
	var definePropertyModule$7 = objectDefineProperty;
	var definePropertiesModule = objectDefineProperties;
	var propertyIsEnumerableModule$1 = objectPropertyIsEnumerable;
	var defineBuiltIn$q = defineBuiltIn$t;
	var defineBuiltInAccessor$k = defineBuiltInAccessor$l;
	var shared$4 = shared$8;
	var sharedKey$1 = sharedKey$4;
	var hiddenKeys$1 = hiddenKeys$6;
	var uid$3 = uid$6;
	var wellKnownSymbol$C = wellKnownSymbol$K;
	var wrappedWellKnownSymbolModule = wellKnownSymbolWrapped;
	var defineWellKnownSymbol$f = wellKnownSymbolDefine;
	var defineSymbolToPrimitive$1 = symbolDefineToPrimitive;
	var setToStringTag$d = setToStringTag$e;
	var InternalStateModule$g = internalState;
	var $forEach$2 = arrayIteration.forEach;

	var HIDDEN = sharedKey$1('hidden');
	var SYMBOL = 'Symbol';
	var PROTOTYPE$1 = 'prototype';

	var setInternalState$f = InternalStateModule$g.set;
	var getInternalState$a = InternalStateModule$g.getterFor(SYMBOL);

	var ObjectPrototype$5 = Object[PROTOTYPE$1];
	var $Symbol = globalThis$18.Symbol;
	var SymbolPrototype$1 = $Symbol && $Symbol[PROTOTYPE$1];
	var RangeError$4 = globalThis$18.RangeError;
	var TypeError$9 = globalThis$18.TypeError;
	var QObject = globalThis$18.QObject;
	var nativeGetOwnPropertyDescriptor$2 = getOwnPropertyDescriptorModule$5.f;
	var nativeDefineProperty$1 = definePropertyModule$7.f;
	var nativeGetOwnPropertyNames = getOwnPropertyNamesExternal.f;
	var nativePropertyIsEnumerable = propertyIsEnumerableModule$1.f;
	var push$i = uncurryThis$1n([].push);

	var AllSymbols = shared$4('symbols');
	var ObjectPrototypeSymbols = shared$4('op-symbols');
	var WellKnownSymbolsStore = shared$4('wks');

	// Don't use setters in Qt Script, https://github.com/zloirock/core-js/issues/173
	var USE_SETTER = !QObject || !QObject[PROTOTYPE$1] || !QObject[PROTOTYPE$1].findChild;

	// fallback for old Android, https://code.google.com/p/v8/issues/detail?id=687
	var fallbackDefineProperty = function (O, P, Attributes) {
	  var ObjectPrototypeDescriptor = nativeGetOwnPropertyDescriptor$2(ObjectPrototype$5, P);
	  if (ObjectPrototypeDescriptor) delete ObjectPrototype$5[P];
	  nativeDefineProperty$1(O, P, Attributes);
	  if (ObjectPrototypeDescriptor && O !== ObjectPrototype$5) {
	    nativeDefineProperty$1(ObjectPrototype$5, P, ObjectPrototypeDescriptor);
	  }
	};

	var setSymbolDescriptor = DESCRIPTORS$I && fails$1p(function () {
	  return nativeObjectCreate(nativeDefineProperty$1({}, 'a', {
	    get: function () { return nativeDefineProperty$1(this, 'a', { value: 7 }).a; }
	  })).a !== 7;
	}) ? fallbackDefineProperty : nativeDefineProperty$1;

	var wrap = function (tag, description) {
	  var symbol = AllSymbols[tag] = nativeObjectCreate(SymbolPrototype$1);
	  setInternalState$f(symbol, {
	    type: SYMBOL,
	    tag: tag,
	    description: description
	  });
	  if (!DESCRIPTORS$I) symbol.description = description;
	  return symbol;
	};

	var $defineProperty = function defineProperty(O, P, Attributes) {
	  if (O === ObjectPrototype$5) $defineProperty(ObjectPrototypeSymbols, P, Attributes);
	  anObject$P(O);
	  var key = toPropertyKey$5(P);
	  anObject$P(Attributes);
	  if (hasOwn$r(AllSymbols, key)) {
	    if (!Attributes.enumerable) {
	      if (!hasOwn$r(O, HIDDEN)) nativeDefineProperty$1(O, HIDDEN, createPropertyDescriptor$a(1, nativeObjectCreate(null)));
	      O[HIDDEN][key] = true;
	    } else {
	      if (hasOwn$r(O, HIDDEN) && O[HIDDEN][key]) O[HIDDEN][key] = false;
	      Attributes = nativeObjectCreate(Attributes, { enumerable: createPropertyDescriptor$a(0, false) });
	    } return setSymbolDescriptor(O, key, Attributes);
	  } return nativeDefineProperty$1(O, key, Attributes);
	};

	var $defineProperties = function defineProperties(O, Properties) {
	  anObject$P(O);
	  var properties = toIndexedObject$d(Properties);
	  var keys = objectKeys$3(properties).concat($getOwnPropertySymbols(properties));
	  $forEach$2(keys, function (key) {
	    if (!DESCRIPTORS$I || call$U($propertyIsEnumerable$1, properties, key)) $defineProperty(O, key, properties[key]);
	  });
	  return O;
	};

	var $create = function create(O, Properties) {
	  return Properties === undefined ? nativeObjectCreate(O) : $defineProperties(nativeObjectCreate(O), Properties);
	};

	var $propertyIsEnumerable$1 = function propertyIsEnumerable(V) {
	  var P = toPropertyKey$5(V);
	  var enumerable = call$U(nativePropertyIsEnumerable, this, P);
	  if (this === ObjectPrototype$5 && hasOwn$r(AllSymbols, P) && !hasOwn$r(ObjectPrototypeSymbols, P)) return false;
	  return enumerable || !hasOwn$r(this, P) || !hasOwn$r(AllSymbols, P) || hasOwn$r(this, HIDDEN) && this[HIDDEN][P]
	    ? enumerable : true;
	};

	var $getOwnPropertyDescriptor = function getOwnPropertyDescriptor(O, P) {
	  var it = toIndexedObject$d(O);
	  var key = toPropertyKey$5(P);
	  if (it === ObjectPrototype$5 && hasOwn$r(AllSymbols, key) && !hasOwn$r(ObjectPrototypeSymbols, key)) return;
	  var descriptor = nativeGetOwnPropertyDescriptor$2(it, key);
	  if (descriptor && hasOwn$r(AllSymbols, key) && !(hasOwn$r(it, HIDDEN) && it[HIDDEN][key])) {
	    descriptor.enumerable = true;
	  }
	  return descriptor;
	};

	var $getOwnPropertyNames = function getOwnPropertyNames(O) {
	  var names = nativeGetOwnPropertyNames(toIndexedObject$d(O));
	  var result = [];
	  $forEach$2(names, function (key) {
	    if (!hasOwn$r(AllSymbols, key) && !hasOwn$r(hiddenKeys$1, key)) push$i(result, key);
	  });
	  return result;
	};

	var $getOwnPropertySymbols = function (O) {
	  var IS_OBJECT_PROTOTYPE = O === ObjectPrototype$5;
	  var names = nativeGetOwnPropertyNames(IS_OBJECT_PROTOTYPE ? ObjectPrototypeSymbols : toIndexedObject$d(O));
	  var result = [];
	  $forEach$2(names, function (key) {
	    if (hasOwn$r(AllSymbols, key) && (!IS_OBJECT_PROTOTYPE || hasOwn$r(ObjectPrototype$5, key))) {
	      push$i(result, AllSymbols[key]);
	    }
	  });
	  return result;
	};

	// `Symbol` constructor
	// https://tc39.es/ecma262/#sec-symbol-constructor
	if (!NATIVE_SYMBOL$4) {
	  $Symbol = function Symbol() {
	    if (isPrototypeOf$d(SymbolPrototype$1, this)) throw new TypeError$9('Symbol is not a constructor');
	    var description = !arguments.length || arguments[0] === undefined ? undefined : $toString$3(arguments[0]);
	    var tag = uid$3(description);
	    var setter = function (value) {
	      var $this = this === undefined ? globalThis$18 : this;
	      if ($this === ObjectPrototype$5) call$U(setter, ObjectPrototypeSymbols, value);
	      if (hasOwn$r($this, HIDDEN) && hasOwn$r($this[HIDDEN], tag)) $this[HIDDEN][tag] = false;
	      var descriptor = createPropertyDescriptor$a(1, value);
	      try {
	        setSymbolDescriptor($this, tag, descriptor);
	      } catch (error) {
	        if (!(error instanceof RangeError$4)) throw error;
	        fallbackDefineProperty($this, tag, descriptor);
	      }
	    };
	    if (DESCRIPTORS$I && USE_SETTER) setSymbolDescriptor(ObjectPrototype$5, tag, { configurable: true, set: setter });
	    return wrap(tag, description);
	  };

	  SymbolPrototype$1 = $Symbol[PROTOTYPE$1];

	  defineBuiltIn$q(SymbolPrototype$1, 'toString', function toString() {
	    return getInternalState$a(this).tag;
	  });

	  defineBuiltIn$q($Symbol, 'withoutSetter', function (description) {
	    return wrap(uid$3(description), description);
	  });

	  propertyIsEnumerableModule$1.f = $propertyIsEnumerable$1;
	  definePropertyModule$7.f = $defineProperty;
	  definePropertiesModule.f = $defineProperties;
	  getOwnPropertyDescriptorModule$5.f = $getOwnPropertyDescriptor;
	  getOwnPropertyNamesModule$1.f = getOwnPropertyNamesExternal.f = $getOwnPropertyNames;
	  getOwnPropertySymbolsModule$2.f = $getOwnPropertySymbols;

	  wrappedWellKnownSymbolModule.f = function (name) {
	    return wrap(wellKnownSymbol$C(name), name);
	  };

	  if (DESCRIPTORS$I) {
	    // https://tc39.es/ecma262/#sec-symbol.prototype.description
	    defineBuiltInAccessor$k(SymbolPrototype$1, 'description', {
	      configurable: true,
	      get: function description() {
	        return getInternalState$a(this).description;
	      }
	    });
	    {
	      defineBuiltIn$q(ObjectPrototype$5, 'propertyIsEnumerable', $propertyIsEnumerable$1, { unsafe: true });
	    }
	  }
	}

	$$3F({ global: true, constructor: true, wrap: true, forced: !NATIVE_SYMBOL$4, sham: !NATIVE_SYMBOL$4 }, {
	  Symbol: $Symbol
	});

	$forEach$2(objectKeys$3(WellKnownSymbolsStore), function (name) {
	  defineWellKnownSymbol$f(name);
	});

	$$3F({ target: SYMBOL, stat: true, forced: !NATIVE_SYMBOL$4 }, {
	  useSetter: function () { USE_SETTER = true; },
	  useSimple: function () { USE_SETTER = false; }
	});

	$$3F({ target: 'Object', stat: true, forced: !NATIVE_SYMBOL$4, sham: !DESCRIPTORS$I }, {
	  // `Object.create` method
	  // https://tc39.es/ecma262/#sec-object.create
	  create: $create,
	  // `Object.defineProperty` method
	  // https://tc39.es/ecma262/#sec-object.defineproperty
	  defineProperty: $defineProperty,
	  // `Object.defineProperties` method
	  // https://tc39.es/ecma262/#sec-object.defineproperties
	  defineProperties: $defineProperties,
	  // `Object.getOwnPropertyDescriptor` method
	  // https://tc39.es/ecma262/#sec-object.getownpropertydescriptors
	  getOwnPropertyDescriptor: $getOwnPropertyDescriptor
	});

	$$3F({ target: 'Object', stat: true, forced: !NATIVE_SYMBOL$4 }, {
	  // `Object.getOwnPropertyNames` method
	  // https://tc39.es/ecma262/#sec-object.getownpropertynames
	  getOwnPropertyNames: $getOwnPropertyNames
	});

	// `Symbol.prototype[@@toPrimitive]` method
	// https://tc39.es/ecma262/#sec-symbol.prototype-@@toprimitive
	defineSymbolToPrimitive$1();

	// `Symbol.prototype[@@toStringTag]` property
	// https://tc39.es/ecma262/#sec-symbol.prototype-@@tostringtag
	setToStringTag$d($Symbol, SYMBOL);

	hiddenKeys$1[HIDDEN] = true;

	var NATIVE_SYMBOL$3 = symbolConstructorDetection;

	/* eslint-disable es/no-symbol -- safe */
	var symbolRegistryDetection = NATIVE_SYMBOL$3 && !!Symbol['for'] && !!Symbol.keyFor;

	var $$3E = _export;
	var getBuiltIn$v = getBuiltIn$B;
	var hasOwn$q = hasOwnProperty_1;
	var toString$C = toString$D;
	var shared$3 = shared$8;
	var NATIVE_SYMBOL_REGISTRY$1 = symbolRegistryDetection;

	var StringToSymbolRegistry = shared$3('string-to-symbol-registry');
	var SymbolToStringRegistry$1 = shared$3('symbol-to-string-registry');

	// `Symbol.for` method
	// https://tc39.es/ecma262/#sec-symbol.for
	$$3E({ target: 'Symbol', stat: true, forced: !NATIVE_SYMBOL_REGISTRY$1 }, {
	  'for': function (key) {
	    var string = toString$C(key);
	    if (hasOwn$q(StringToSymbolRegistry, string)) return StringToSymbolRegistry[string];
	    var symbol = getBuiltIn$v('Symbol')(string);
	    StringToSymbolRegistry[string] = symbol;
	    SymbolToStringRegistry$1[symbol] = string;
	    return symbol;
	  }
	});

	var $$3D = _export;
	var hasOwn$p = hasOwnProperty_1;
	var isSymbol$4 = isSymbol$7;
	var tryToString$5 = tryToString$7;
	var shared$2 = shared$8;
	var NATIVE_SYMBOL_REGISTRY = symbolRegistryDetection;

	var SymbolToStringRegistry = shared$2('symbol-to-string-registry');

	// `Symbol.keyFor` method
	// https://tc39.es/ecma262/#sec-symbol.keyfor
	$$3D({ target: 'Symbol', stat: true, forced: !NATIVE_SYMBOL_REGISTRY }, {
	  keyFor: function keyFor(sym) {
	    if (!isSymbol$4(sym)) throw new TypeError(tryToString$5(sym) + ' is not a symbol');
	    if (hasOwn$p(SymbolToStringRegistry, sym)) return SymbolToStringRegistry[sym];
	  }
	});

	var NATIVE_BIND$1 = functionBindNative;

	var FunctionPrototype$2 = Function.prototype;
	var apply$c = FunctionPrototype$2.apply;
	var call$T = FunctionPrototype$2.call;

	// eslint-disable-next-line es/no-function-prototype-bind, es/no-reflect -- safe
	var functionApply$1 = typeof Reflect == 'object' && Reflect.apply || (NATIVE_BIND$1 ? call$T.bind(apply$c) : function () {
	  return call$T.apply(apply$c, arguments);
	});

	var uncurryThis$1m = functionUncurryThis;
	var isArray$7 = isArray$9;
	var isCallable$n = isCallable$A;
	var classof$k = classofRaw$2;
	var toString$B = toString$D;

	var push$h = uncurryThis$1m([].push);

	var getJsonReplacerFunction = function (replacer) {
	  if (isCallable$n(replacer)) return replacer;
	  if (!isArray$7(replacer)) return;
	  var rawLength = replacer.length;
	  var keys = [];
	  for (var i = 0; i < rawLength; i++) {
	    var element = replacer[i];
	    if (typeof element == 'string') push$h(keys, element);
	    else if (typeof element == 'number' || classof$k(element) === 'Number' || classof$k(element) === 'String') push$h(keys, toString$B(element));
	  }
	  var keysLength = keys.length;
	  var root = true;
	  return function (key, value) {
	    if (root) {
	      root = false;
	      return value;
	    }
	    if (isArray$7(this)) return value;
	    for (var j = 0; j < keysLength; j++) if (keys[j] === key) return value;
	  };
	};

	var $$3C = _export;
	var getBuiltIn$u = getBuiltIn$B;
	var apply$b = functionApply$1;
	var call$S = functionCall;
	var uncurryThis$1l = functionUncurryThis;
	var fails$1o = fails$1z;
	var isCallable$m = isCallable$A;
	var isSymbol$3 = isSymbol$7;
	var arraySlice$8 = arraySlice$a;
	var getReplacerFunction = getJsonReplacerFunction;
	var NATIVE_SYMBOL$2 = symbolConstructorDetection;

	var $String$4 = String;
	var $stringify = getBuiltIn$u('JSON', 'stringify');
	var exec$b = uncurryThis$1l(/./.exec);
	var charAt$h = uncurryThis$1l(''.charAt);
	var charCodeAt$8 = uncurryThis$1l(''.charCodeAt);
	var replace$b = uncurryThis$1l(''.replace);
	var numberToString$4 = uncurryThis$1l(1.1.toString);

	var tester = /[\uD800-\uDFFF]/g;
	var low = /^[\uD800-\uDBFF]$/;
	var hi = /^[\uDC00-\uDFFF]$/;

	var WRONG_SYMBOLS_CONVERSION = !NATIVE_SYMBOL$2 || fails$1o(function () {
	  var symbol = getBuiltIn$u('Symbol')('stringify detection');
	  // MS Edge converts symbol values to JSON as {}
	  return $stringify([symbol]) !== '[null]'
	    // WebKit converts symbol values to JSON as null
	    || $stringify({ a: symbol }) !== '{}'
	    // V8 throws on boxed symbols
	    || $stringify(Object(symbol)) !== '{}';
	});

	// https://github.com/tc39/proposal-well-formed-stringify
	var ILL_FORMED_UNICODE = fails$1o(function () {
	  return $stringify('\uDF06\uD834') !== '"\\udf06\\ud834"'
	    || $stringify('\uDEAD') !== '"\\udead"';
	});

	var stringifyWithSymbolsFix = function (it, replacer) {
	  var args = arraySlice$8(arguments);
	  var $replacer = getReplacerFunction(replacer);
	  if (!isCallable$m($replacer) && (it === undefined || isSymbol$3(it))) return; // IE8 returns string on undefined
	  args[1] = function (key, value) {
	    // some old implementations (like WebKit) could pass numbers as keys
	    if (isCallable$m($replacer)) value = call$S($replacer, this, $String$4(key), value);
	    if (!isSymbol$3(value)) return value;
	  };
	  return apply$b($stringify, null, args);
	};

	var fixIllFormed = function (match, offset, string) {
	  var prev = charAt$h(string, offset - 1);
	  var next = charAt$h(string, offset + 1);
	  if ((exec$b(low, match) && !exec$b(hi, next)) || (exec$b(hi, match) && !exec$b(low, prev))) {
	    return '\\u' + numberToString$4(charCodeAt$8(match, 0), 16);
	  } return match;
	};

	if ($stringify) {
	  // `JSON.stringify` method
	  // https://tc39.es/ecma262/#sec-json.stringify
	  $$3C({ target: 'JSON', stat: true, arity: 3, forced: WRONG_SYMBOLS_CONVERSION || ILL_FORMED_UNICODE }, {
	    // eslint-disable-next-line no-unused-vars -- required for `.length`
	    stringify: function stringify(it, replacer, space) {
	      var args = arraySlice$8(arguments);
	      var result = apply$b(WRONG_SYMBOLS_CONVERSION ? stringifyWithSymbolsFix : $stringify, null, args);
	      return ILL_FORMED_UNICODE && typeof result == 'string' ? replace$b(result, tester, fixIllFormed) : result;
	    }
	  });
	}

	var $$3B = _export;
	var NATIVE_SYMBOL$1 = symbolConstructorDetection;
	var fails$1n = fails$1z;
	var getOwnPropertySymbolsModule$1 = objectGetOwnPropertySymbols;
	var toObject$s = toObject$v;

	// V8 ~ Chrome 38 and 39 `Object.getOwnPropertySymbols` fails on primitives
	// https://bugs.chromium.org/p/v8/issues/detail?id=3443
	var FORCED$P = !NATIVE_SYMBOL$1 || fails$1n(function () { getOwnPropertySymbolsModule$1.f(1); });

	// `Object.getOwnPropertySymbols` method
	// https://tc39.es/ecma262/#sec-object.getownpropertysymbols
	$$3B({ target: 'Object', stat: true, forced: FORCED$P }, {
	  getOwnPropertySymbols: function getOwnPropertySymbols(it) {
	    var $getOwnPropertySymbols = getOwnPropertySymbolsModule$1.f;
	    return $getOwnPropertySymbols ? $getOwnPropertySymbols(toObject$s(it)) : [];
	  }
	});

	var $$3A = _export;
	var DESCRIPTORS$H = descriptors;
	var globalThis$17 = globalThis_1;
	var uncurryThis$1k = functionUncurryThis;
	var hasOwn$o = hasOwnProperty_1;
	var isCallable$l = isCallable$A;
	var isPrototypeOf$c = objectIsPrototypeOf;
	var toString$A = toString$D;
	var defineBuiltInAccessor$j = defineBuiltInAccessor$l;
	var copyConstructorProperties$5 = copyConstructorProperties$7;

	var NativeSymbol = globalThis$17.Symbol;
	var SymbolPrototype = NativeSymbol && NativeSymbol.prototype;

	if (DESCRIPTORS$H && isCallable$l(NativeSymbol) && (!('description' in SymbolPrototype) ||
	  // Safari 12 bug
	  NativeSymbol().description !== undefined
	)) {
	  var EmptyStringDescriptionStore = {};
	  // wrap Symbol constructor for correct work with undefined description
	  var SymbolWrapper = function Symbol() {
	    var description = arguments.length < 1 || arguments[0] === undefined ? undefined : toString$A(arguments[0]);
	    var result = isPrototypeOf$c(SymbolPrototype, this)
	      // eslint-disable-next-line sonarjs/inconsistent-function-call -- ok
	      ? new NativeSymbol(description)
	      // in Edge 13, String(Symbol(undefined)) === 'Symbol(undefined)'
	      : description === undefined ? NativeSymbol() : NativeSymbol(description);
	    if (description === '') EmptyStringDescriptionStore[result] = true;
	    return result;
	  };

	  copyConstructorProperties$5(SymbolWrapper, NativeSymbol);
	  SymbolWrapper.prototype = SymbolPrototype;
	  SymbolPrototype.constructor = SymbolWrapper;

	  var NATIVE_SYMBOL = String(NativeSymbol('description detection')) === 'Symbol(description detection)';
	  var thisSymbolValue = uncurryThis$1k(SymbolPrototype.valueOf);
	  var symbolDescriptiveString = uncurryThis$1k(SymbolPrototype.toString);
	  var regexp = /^Symbol\((.*)\)[^)]+$/;
	  var replace$a = uncurryThis$1k(''.replace);
	  var stringSlice$h = uncurryThis$1k(''.slice);

	  defineBuiltInAccessor$j(SymbolPrototype, 'description', {
	    configurable: true,
	    get: function description() {
	      var symbol = thisSymbolValue(this);
	      if (hasOwn$o(EmptyStringDescriptionStore, symbol)) return '';
	      var string = symbolDescriptiveString(symbol);
	      var desc = NATIVE_SYMBOL ? stringSlice$h(string, 7, -1) : replace$a(string, regexp, '$1');
	      return desc === '' ? undefined : desc;
	    }
	  });

	  $$3A({ global: true, constructor: true, forced: true }, {
	    Symbol: SymbolWrapper
	  });
	}

	var globalThis$16 = globalThis_1;
	var defineWellKnownSymbol$e = wellKnownSymbolDefine;
	var defineProperty$b = objectDefineProperty.f;
	var getOwnPropertyDescriptor$9 = objectGetOwnPropertyDescriptor.f;

	var Symbol$4 = globalThis$16.Symbol;

	// `Symbol.asyncDispose` well-known symbol
	// https://github.com/tc39/proposal-async-explicit-resource-management
	defineWellKnownSymbol$e('asyncDispose');

	if (Symbol$4) {
	  var descriptor$4 = getOwnPropertyDescriptor$9(Symbol$4, 'asyncDispose');
	  // workaround of NodeJS 20.4 bug
	  // https://github.com/nodejs/node/issues/48699
	  // and incorrect descriptor from some transpilers and userland helpers
	  if (descriptor$4.enumerable && descriptor$4.configurable && descriptor$4.writable) {
	    defineProperty$b(Symbol$4, 'asyncDispose', { value: descriptor$4.value, enumerable: false, configurable: false, writable: false });
	  }
	}

	var defineWellKnownSymbol$d = wellKnownSymbolDefine;

	// `Symbol.asyncIterator` well-known symbol
	// https://tc39.es/ecma262/#sec-symbol.asynciterator
	defineWellKnownSymbol$d('asyncIterator');

	var globalThis$15 = globalThis_1;
	var defineWellKnownSymbol$c = wellKnownSymbolDefine;
	var defineProperty$a = objectDefineProperty.f;
	var getOwnPropertyDescriptor$8 = objectGetOwnPropertyDescriptor.f;

	var Symbol$3 = globalThis$15.Symbol;

	// `Symbol.dispose` well-known symbol
	// https://github.com/tc39/proposal-explicit-resource-management
	defineWellKnownSymbol$c('dispose');

	if (Symbol$3) {
	  var descriptor$3 = getOwnPropertyDescriptor$8(Symbol$3, 'dispose');
	  // workaround of NodeJS 20.4 bug
	  // https://github.com/nodejs/node/issues/48699
	  // and incorrect descriptor from some transpilers and userland helpers
	  if (descriptor$3.enumerable && descriptor$3.configurable && descriptor$3.writable) {
	    defineProperty$a(Symbol$3, 'dispose', { value: descriptor$3.value, enumerable: false, configurable: false, writable: false });
	  }
	}

	var defineWellKnownSymbol$b = wellKnownSymbolDefine;

	// `Symbol.hasInstance` well-known symbol
	// https://tc39.es/ecma262/#sec-symbol.hasinstance
	defineWellKnownSymbol$b('hasInstance');

	var defineWellKnownSymbol$a = wellKnownSymbolDefine;

	// `Symbol.isConcatSpreadable` well-known symbol
	// https://tc39.es/ecma262/#sec-symbol.isconcatspreadable
	defineWellKnownSymbol$a('isConcatSpreadable');

	var defineWellKnownSymbol$9 = wellKnownSymbolDefine;

	// `Symbol.iterator` well-known symbol
	// https://tc39.es/ecma262/#sec-symbol.iterator
	defineWellKnownSymbol$9('iterator');

	var defineWellKnownSymbol$8 = wellKnownSymbolDefine;

	// `Symbol.match` well-known symbol
	// https://tc39.es/ecma262/#sec-symbol.match
	defineWellKnownSymbol$8('match');

	var defineWellKnownSymbol$7 = wellKnownSymbolDefine;

	// `Symbol.matchAll` well-known symbol
	// https://tc39.es/ecma262/#sec-symbol.matchall
	defineWellKnownSymbol$7('matchAll');

	var defineWellKnownSymbol$6 = wellKnownSymbolDefine;

	// `Symbol.replace` well-known symbol
	// https://tc39.es/ecma262/#sec-symbol.replace
	defineWellKnownSymbol$6('replace');

	var defineWellKnownSymbol$5 = wellKnownSymbolDefine;

	// `Symbol.search` well-known symbol
	// https://tc39.es/ecma262/#sec-symbol.search
	defineWellKnownSymbol$5('search');

	var defineWellKnownSymbol$4 = wellKnownSymbolDefine;

	// `Symbol.species` well-known symbol
	// https://tc39.es/ecma262/#sec-symbol.species
	defineWellKnownSymbol$4('species');

	var defineWellKnownSymbol$3 = wellKnownSymbolDefine;

	// `Symbol.split` well-known symbol
	// https://tc39.es/ecma262/#sec-symbol.split
	defineWellKnownSymbol$3('split');

	var defineWellKnownSymbol$2 = wellKnownSymbolDefine;
	var defineSymbolToPrimitive = symbolDefineToPrimitive;

	// `Symbol.toPrimitive` well-known symbol
	// https://tc39.es/ecma262/#sec-symbol.toprimitive
	defineWellKnownSymbol$2('toPrimitive');

	// `Symbol.prototype[@@toPrimitive]` method
	// https://tc39.es/ecma262/#sec-symbol.prototype-@@toprimitive
	defineSymbolToPrimitive();

	var getBuiltIn$t = getBuiltIn$B;
	var defineWellKnownSymbol$1 = wellKnownSymbolDefine;
	var setToStringTag$c = setToStringTag$e;

	// `Symbol.toStringTag` well-known symbol
	// https://tc39.es/ecma262/#sec-symbol.tostringtag
	defineWellKnownSymbol$1('toStringTag');

	// `Symbol.prototype[@@toStringTag]` property
	// https://tc39.es/ecma262/#sec-symbol.prototype-@@tostringtag
	setToStringTag$c(getBuiltIn$t('Symbol'), 'Symbol');

	var defineWellKnownSymbol = wellKnownSymbolDefine;

	// `Symbol.unscopables` well-known symbol
	// https://tc39.es/ecma262/#sec-symbol.unscopables
	defineWellKnownSymbol('unscopables');

	var uncurryThis$1j = functionUncurryThis;
	var aCallable$y = aCallable$B;

	var functionUncurryThisAccessor = function (object, key, method) {
	  try {
	    // eslint-disable-next-line es/no-object-getownpropertydescriptor -- safe
	    return uncurryThis$1j(aCallable$y(Object.getOwnPropertyDescriptor(object, key)[method]));
	  } catch (error) { /* empty */ }
	};

	var isObject$D = isObject$K;

	var isPossiblePrototype$2 = function (argument) {
	  return isObject$D(argument) || argument === null;
	};

	var isPossiblePrototype$1 = isPossiblePrototype$2;

	var $String$3 = String;
	var $TypeError$t = TypeError;

	var aPossiblePrototype$2 = function (argument) {
	  if (isPossiblePrototype$1(argument)) return argument;
	  throw new $TypeError$t("Can't set " + $String$3(argument) + ' as a prototype');
	};

	/* eslint-disable no-proto -- safe */
	var uncurryThisAccessor$3 = functionUncurryThisAccessor;
	var isObject$C = isObject$K;
	var requireObjectCoercible$l = requireObjectCoercible$o;
	var aPossiblePrototype$1 = aPossiblePrototype$2;

	// `Object.setPrototypeOf` method
	// https://tc39.es/ecma262/#sec-object.setprototypeof
	// Works with __proto__ only. Old v8 can't work with null proto objects.
	// eslint-disable-next-line es/no-object-setprototypeof -- safe
	var objectSetPrototypeOf$1 = Object.setPrototypeOf || ('__proto__' in {} ? function () {
	  var CORRECT_SETTER = false;
	  var test = {};
	  var setter;
	  try {
	    setter = uncurryThisAccessor$3(Object.prototype, '__proto__', 'set');
	    setter(test, []);
	    CORRECT_SETTER = test instanceof Array;
	  } catch (error) { /* empty */ }
	  return function setPrototypeOf(O, proto) {
	    requireObjectCoercible$l(O);
	    aPossiblePrototype$1(proto);
	    if (!isObject$C(O)) return O;
	    if (CORRECT_SETTER) setter(O, proto);
	    else O.__proto__ = proto;
	    return O;
	  };
	}() : undefined);

	var defineProperty$9 = objectDefineProperty.f;

	var proxyAccessor$2 = function (Target, Source, key) {
	  key in Target || defineProperty$9(Target, key, {
	    configurable: true,
	    get: function () { return Source[key]; },
	    set: function (it) { Source[key] = it; }
	  });
	};

	var isCallable$k = isCallable$A;
	var isObject$B = isObject$K;
	var setPrototypeOf$a = objectSetPrototypeOf$1;

	// makes subclassing work correct for wrapped built-ins
	var inheritIfRequired$7 = function ($this, dummy, Wrapper) {
	  var NewTarget, NewTargetPrototype;
	  if (
	    // it can work only with native `setPrototypeOf`
	    setPrototypeOf$a &&
	    // we haven't completely correct pre-ES6 way for getting `new.target`, so use this
	    isCallable$k(NewTarget = dummy.constructor) &&
	    NewTarget !== Wrapper &&
	    isObject$B(NewTargetPrototype = NewTarget.prototype) &&
	    NewTargetPrototype !== Wrapper.prototype
	  ) setPrototypeOf$a($this, NewTargetPrototype);
	  return $this;
	};

	var toString$z = toString$D;

	var normalizeStringArgument$6 = function (argument, $default) {
	  return argument === undefined ? arguments.length < 2 ? '' : $default : toString$z(argument);
	};

	var isObject$A = isObject$K;
	var createNonEnumerableProperty$e = createNonEnumerableProperty$h;

	// `InstallErrorCause` abstract operation
	// https://tc39.es/ecma262/#sec-installerrorcause
	var installErrorCause$2 = function (O, options) {
	  if (isObject$A(options) && 'cause' in options) {
	    createNonEnumerableProperty$e(O, 'cause', options.cause);
	  }
	};

	var uncurryThis$1i = functionUncurryThis;

	var $Error$3 = Error;
	var replace$9 = uncurryThis$1i(''.replace);

	var TEST = (function (arg) { return String(new $Error$3(arg).stack); })('zxcasd');
	// eslint-disable-next-line redos/no-vulnerable, sonarjs/slow-regex -- safe
	var V8_OR_CHAKRA_STACK_ENTRY = /\n\s*at [^:]*:[^\n]*/;
	var IS_V8_OR_CHAKRA_STACK = V8_OR_CHAKRA_STACK_ENTRY.test(TEST);

	var errorStackClear = function (stack, dropEntries) {
	  if (IS_V8_OR_CHAKRA_STACK && typeof stack == 'string' && !$Error$3.prepareStackTrace) {
	    while (dropEntries--) stack = replace$9(stack, V8_OR_CHAKRA_STACK_ENTRY, '');
	  } return stack;
	};

	var fails$1m = fails$1z;
	var createPropertyDescriptor$9 = createPropertyDescriptor$d;

	var errorStackInstallable = !fails$1m(function () {
	  var error = new Error('a');
	  if (!('stack' in error)) return true;
	  // eslint-disable-next-line es/no-object-defineproperty -- safe
	  Object.defineProperty(error, 'stack', createPropertyDescriptor$9(1, 7));
	  return error.stack !== 7;
	});

	var createNonEnumerableProperty$d = createNonEnumerableProperty$h;
	var clearErrorStack$2 = errorStackClear;
	var ERROR_STACK_INSTALLABLE$1 = errorStackInstallable;

	// non-standard V8
	// eslint-disable-next-line es/no-nonstandard-error-properties -- safe
	var captureStackTrace = Error.captureStackTrace;

	var errorStackInstall = function (error, C, stack, dropEntries) {
	  if (ERROR_STACK_INSTALLABLE$1) {
	    if (captureStackTrace) captureStackTrace(error, C);
	    else createNonEnumerableProperty$d(error, 'stack', clearErrorStack$2(stack, dropEntries));
	  }
	};

	var getBuiltIn$s = getBuiltIn$B;
	var hasOwn$n = hasOwnProperty_1;
	var createNonEnumerableProperty$c = createNonEnumerableProperty$h;
	var isPrototypeOf$b = objectIsPrototypeOf;
	var setPrototypeOf$9 = objectSetPrototypeOf$1;
	var copyConstructorProperties$4 = copyConstructorProperties$7;
	var proxyAccessor$1 = proxyAccessor$2;
	var inheritIfRequired$6 = inheritIfRequired$7;
	var normalizeStringArgument$5 = normalizeStringArgument$6;
	var installErrorCause$1 = installErrorCause$2;
	var installErrorStack$2 = errorStackInstall;
	var DESCRIPTORS$G = descriptors;

	var wrapErrorConstructorWithCause$2 = function (FULL_NAME, wrapper, FORCED, IS_AGGREGATE_ERROR) {
	  var STACK_TRACE_LIMIT = 'stackTraceLimit';
	  var OPTIONS_POSITION = IS_AGGREGATE_ERROR ? 2 : 1;
	  var path = FULL_NAME.split('.');
	  var ERROR_NAME = path[path.length - 1];
	  var OriginalError = getBuiltIn$s.apply(null, path);

	  if (!OriginalError) return;

	  var OriginalErrorPrototype = OriginalError.prototype;

	  // V8 9.3- bug https://bugs.chromium.org/p/v8/issues/detail?id=12006
	  if (hasOwn$n(OriginalErrorPrototype, 'cause')) delete OriginalErrorPrototype.cause;

	  if (!FORCED) return OriginalError;

	  var BaseError = getBuiltIn$s('Error');

	  var WrappedError = wrapper(function (a, b) {
	    var message = normalizeStringArgument$5(IS_AGGREGATE_ERROR ? b : a, undefined);
	    var result = IS_AGGREGATE_ERROR ? new OriginalError(a) : new OriginalError();
	    if (message !== undefined) createNonEnumerableProperty$c(result, 'message', message);
	    installErrorStack$2(result, WrappedError, result.stack, 2);
	    if (this && isPrototypeOf$b(OriginalErrorPrototype, this)) inheritIfRequired$6(result, this, WrappedError);
	    if (arguments.length > OPTIONS_POSITION) installErrorCause$1(result, arguments[OPTIONS_POSITION]);
	    return result;
	  });

	  WrappedError.prototype = OriginalErrorPrototype;

	  if (ERROR_NAME !== 'Error') {
	    if (setPrototypeOf$9) setPrototypeOf$9(WrappedError, BaseError);
	    else copyConstructorProperties$4(WrappedError, BaseError, { name: true });
	  } else if (DESCRIPTORS$G && STACK_TRACE_LIMIT in OriginalError) {
	    proxyAccessor$1(WrappedError, OriginalError, STACK_TRACE_LIMIT);
	    proxyAccessor$1(WrappedError, OriginalError, 'prepareStackTrace');
	  }

	  copyConstructorProperties$4(WrappedError, OriginalError);

	  try {
	    // Safari 13- bug: WebAssembly errors does not have a proper `.name`
	    if (OriginalErrorPrototype.name !== ERROR_NAME) {
	      createNonEnumerableProperty$c(OriginalErrorPrototype, 'name', ERROR_NAME);
	    }
	    OriginalErrorPrototype.constructor = WrappedError;
	  } catch (error) { /* empty */ }

	  return WrappedError;
	};

	/* eslint-disable no-unused-vars -- required for functions `.length` */
	var $$3z = _export;
	var globalThis$14 = globalThis_1;
	var apply$a = functionApply$1;
	var wrapErrorConstructorWithCause$1 = wrapErrorConstructorWithCause$2;

	var WEB_ASSEMBLY = 'WebAssembly';
	var WebAssembly = globalThis$14[WEB_ASSEMBLY];

	// eslint-disable-next-line es/no-error-cause -- feature detection
	var FORCED$O = new Error('e', { cause: 7 }).cause !== 7;

	var exportGlobalErrorCauseWrapper = function (ERROR_NAME, wrapper) {
	  var O = {};
	  O[ERROR_NAME] = wrapErrorConstructorWithCause$1(ERROR_NAME, wrapper, FORCED$O);
	  $$3z({ global: true, constructor: true, arity: 1, forced: FORCED$O }, O);
	};

	var exportWebAssemblyErrorCauseWrapper = function (ERROR_NAME, wrapper) {
	  if (WebAssembly && WebAssembly[ERROR_NAME]) {
	    var O = {};
	    O[ERROR_NAME] = wrapErrorConstructorWithCause$1(WEB_ASSEMBLY + '.' + ERROR_NAME, wrapper, FORCED$O);
	    $$3z({ target: WEB_ASSEMBLY, stat: true, constructor: true, arity: 1, forced: FORCED$O }, O);
	  }
	};

	// https://tc39.es/ecma262/#sec-nativeerror
	exportGlobalErrorCauseWrapper('Error', function (init) {
	  return function Error(message) { return apply$a(init, this, arguments); };
	});
	exportGlobalErrorCauseWrapper('EvalError', function (init) {
	  return function EvalError(message) { return apply$a(init, this, arguments); };
	});
	exportGlobalErrorCauseWrapper('RangeError', function (init) {
	  return function RangeError(message) { return apply$a(init, this, arguments); };
	});
	exportGlobalErrorCauseWrapper('ReferenceError', function (init) {
	  return function ReferenceError(message) { return apply$a(init, this, arguments); };
	});
	exportGlobalErrorCauseWrapper('SyntaxError', function (init) {
	  return function SyntaxError(message) { return apply$a(init, this, arguments); };
	});
	exportGlobalErrorCauseWrapper('TypeError', function (init) {
	  return function TypeError(message) { return apply$a(init, this, arguments); };
	});
	exportGlobalErrorCauseWrapper('URIError', function (init) {
	  return function URIError(message) { return apply$a(init, this, arguments); };
	});
	exportWebAssemblyErrorCauseWrapper('CompileError', function (init) {
	  return function CompileError(message) { return apply$a(init, this, arguments); };
	});
	exportWebAssemblyErrorCauseWrapper('LinkError', function (init) {
	  return function LinkError(message) { return apply$a(init, this, arguments); };
	});
	exportWebAssemblyErrorCauseWrapper('RuntimeError', function (init) {
	  return function RuntimeError(message) { return apply$a(init, this, arguments); };
	});

	var $$3y = _export;
	var getBuiltIn$r = getBuiltIn$B;
	var isObject$z = isObject$K;
	var classof$j = classof$p;
	var fails$1l = fails$1z;

	var ERROR = 'Error';
	var DOM_EXCEPTION$3 = 'DOMException';
	// eslint-disable-next-line es/no-object-setprototypeof, no-proto -- safe
	var PROTOTYPE_SETTING_AVAILABLE = Object.setPrototypeOf || ({}).__proto__;

	var DOMException$2 = getBuiltIn$r(DOM_EXCEPTION$3);
	var $Error$2 = Error;
	// eslint-disable-next-line es/no-error-iserror -- safe
	var $isError = $Error$2.isError;

	var FORCED$N = !$isError || !PROTOTYPE_SETTING_AVAILABLE || fails$1l(function () {
	  // Bun, isNativeError-based implementations, some buggy structuredClone-based implementations, etc.
	  // https://github.com/oven-sh/bun/issues/15821
	  return (DOMException$2 && !$isError(new DOMException$2(DOM_EXCEPTION$3))) ||
	    // structuredClone-based implementations
	    // eslint-disable-next-line es/no-error-cause -- detection
	    !$isError(new $Error$2(ERROR, { cause: function () { /* empty */ } })) ||
	    // instanceof-based and FF Error#stack-based implementations
	    $isError(getBuiltIn$r('Object', 'create')($Error$2.prototype));
	});

	// `Error.isError` method
	// https://tc39.es/ecma262/#sec-error.iserror
	$$3y({ target: 'Error', stat: true, sham: true, forced: FORCED$N }, {
	  isError: function isError(arg) {
	    if (!isObject$z(arg)) return false;
	    var tag = classof$j(arg);
	    return tag === ERROR || tag === DOM_EXCEPTION$3;
	  }
	});

	var DESCRIPTORS$F = descriptors;
	var fails$1k = fails$1z;
	var anObject$O = anObject$U;
	var normalizeStringArgument$4 = normalizeStringArgument$6;

	var nativeErrorToString = Error.prototype.toString;

	var INCORRECT_TO_STRING$1 = fails$1k(function () {
	  if (DESCRIPTORS$F) {
	    // Chrome 32- incorrectly call accessor
	    // eslint-disable-next-line es/no-object-create, es/no-object-defineproperty -- safe
	    var object = Object.create(Object.defineProperty({}, 'name', { get: function () {
	      return this === object;
	    } }));
	    if (nativeErrorToString.call(object) !== 'true') return true;
	  }
	  // FF10- does not properly handle non-strings
	  return nativeErrorToString.call({ message: 1, name: 2 }) !== '2: 1'
	    // IE8 does not properly handle defaults
	    || nativeErrorToString.call({}) !== 'Error';
	});

	var errorToString$2 = INCORRECT_TO_STRING$1 ? function toString() {
	  var O = anObject$O(this);
	  var name = normalizeStringArgument$4(O.name, 'Error');
	  var message = normalizeStringArgument$4(O.message);
	  return !name ? message : !message ? name : name + ': ' + message;
	} : nativeErrorToString;

	var defineBuiltIn$p = defineBuiltIn$t;
	var errorToString$1 = errorToString$2;

	var ErrorPrototype$1 = Error.prototype;

	// `Error.prototype.toString` method fix
	// https://tc39.es/ecma262/#sec-error.prototype.tostring
	if (ErrorPrototype$1.toString !== errorToString$1) {
	  defineBuiltIn$p(ErrorPrototype$1, 'toString', errorToString$1);
	}

	var fails$1j = fails$1z;

	var correctPrototypeGetter = !fails$1j(function () {
	  function F() { /* empty */ }
	  F.prototype.constructor = null;
	  // eslint-disable-next-line es/no-object-getprototypeof -- required for testing
	  return Object.getPrototypeOf(new F()) !== F.prototype;
	});

	var hasOwn$m = hasOwnProperty_1;
	var isCallable$j = isCallable$A;
	var toObject$r = toObject$v;
	var sharedKey = sharedKey$4;
	var CORRECT_PROTOTYPE_GETTER$2 = correctPrototypeGetter;

	var IE_PROTO = sharedKey('IE_PROTO');
	var $Object$1 = Object;
	var ObjectPrototype$4 = $Object$1.prototype;

	// `Object.getPrototypeOf` method
	// https://tc39.es/ecma262/#sec-object.getprototypeof
	// eslint-disable-next-line es/no-object-getprototypeof -- safe
	var objectGetPrototypeOf$2 = CORRECT_PROTOTYPE_GETTER$2 ? $Object$1.getPrototypeOf : function (O) {
	  var object = toObject$r(O);
	  if (hasOwn$m(object, IE_PROTO)) return object[IE_PROTO];
	  var constructor = object.constructor;
	  if (isCallable$j(constructor) && object instanceof constructor) {
	    return constructor.prototype;
	  } return object instanceof $Object$1 ? ObjectPrototype$4 : null;
	};

	var iterators = {};

	var wellKnownSymbol$B = wellKnownSymbol$K;
	var Iterators$4 = iterators;

	var ITERATOR$b = wellKnownSymbol$B('iterator');
	var ArrayPrototype$1 = Array.prototype;

	// check on default Array iterator
	var isArrayIteratorMethod$3 = function (it) {
	  return it !== undefined && (Iterators$4.Array === it || ArrayPrototype$1[ITERATOR$b] === it);
	};

	var classof$i = classof$p;
	var getMethod$f = getMethod$h;
	var isNullOrUndefined$6 = isNullOrUndefined$9;
	var Iterators$3 = iterators;
	var wellKnownSymbol$A = wellKnownSymbol$K;

	var ITERATOR$a = wellKnownSymbol$A('iterator');

	var getIteratorMethod$7 = function (it) {
	  if (!isNullOrUndefined$6(it)) return getMethod$f(it, ITERATOR$a)
	    || getMethod$f(it, '@@iterator')
	    || Iterators$3[classof$i(it)];
	};

	var call$R = functionCall;
	var aCallable$x = aCallable$B;
	var anObject$N = anObject$U;
	var tryToString$4 = tryToString$7;
	var getIteratorMethod$6 = getIteratorMethod$7;

	var $TypeError$s = TypeError;

	var getIterator$6 = function (argument, usingIterator) {
	  var iteratorMethod = arguments.length < 2 ? getIteratorMethod$6(argument) : usingIterator;
	  if (aCallable$x(iteratorMethod)) return anObject$N(call$R(iteratorMethod, argument));
	  throw new $TypeError$s(tryToString$4(argument) + ' is not iterable');
	};

	var call$Q = functionCall;
	var anObject$M = anObject$U;
	var getMethod$e = getMethod$h;

	var iteratorClose$h = function (iterator, kind, value) {
	  var innerResult, innerError;
	  anObject$M(iterator);
	  try {
	    innerResult = getMethod$e(iterator, 'return');
	    if (!innerResult) {
	      if (kind === 'throw') throw value;
	      return value;
	    }
	    innerResult = call$Q(innerResult, iterator);
	  } catch (error) {
	    innerError = true;
	    innerResult = error;
	  }
	  if (kind === 'throw') throw value;
	  if (innerError) throw innerResult;
	  anObject$M(innerResult);
	  return value;
	};

	var bind$e = functionBindContext;
	var call$P = functionCall;
	var anObject$L = anObject$U;
	var tryToString$3 = tryToString$7;
	var isArrayIteratorMethod$2 = isArrayIteratorMethod$3;
	var lengthOfArrayLike$p = lengthOfArrayLike$s;
	var isPrototypeOf$a = objectIsPrototypeOf;
	var getIterator$5 = getIterator$6;
	var getIteratorMethod$5 = getIteratorMethod$7;
	var iteratorClose$g = iteratorClose$h;

	var $TypeError$r = TypeError;

	var Result = function (stopped, result) {
	  this.stopped = stopped;
	  this.result = result;
	};

	var ResultPrototype = Result.prototype;

	var iterate$l = function (iterable, unboundFunction, options) {
	  var that = options && options.that;
	  var AS_ENTRIES = !!(options && options.AS_ENTRIES);
	  var IS_RECORD = !!(options && options.IS_RECORD);
	  var IS_ITERATOR = !!(options && options.IS_ITERATOR);
	  var INTERRUPTED = !!(options && options.INTERRUPTED);
	  var fn = bind$e(unboundFunction, that);
	  var iterator, iterFn, index, length, result, next, step;

	  var stop = function (condition) {
	    if (iterator) iteratorClose$g(iterator, 'normal');
	    return new Result(true, condition);
	  };

	  var callFn = function (value) {
	    if (AS_ENTRIES) {
	      anObject$L(value);
	      return INTERRUPTED ? fn(value[0], value[1], stop) : fn(value[0], value[1]);
	    } return INTERRUPTED ? fn(value, stop) : fn(value);
	  };

	  if (IS_RECORD) {
	    iterator = iterable.iterator;
	  } else if (IS_ITERATOR) {
	    iterator = iterable;
	  } else {
	    iterFn = getIteratorMethod$5(iterable);
	    if (!iterFn) throw new $TypeError$r(tryToString$3(iterable) + ' is not iterable');
	    // optimisation for array iterators
	    if (isArrayIteratorMethod$2(iterFn)) {
	      for (index = 0, length = lengthOfArrayLike$p(iterable); length > index; index++) {
	        result = callFn(iterable[index]);
	        if (result && isPrototypeOf$a(ResultPrototype, result)) return result;
	      } return new Result(false);
	    }
	    iterator = getIterator$5(iterable, iterFn);
	  }

	  next = IS_RECORD ? iterable.next : iterator.next;
	  while (!(step = call$P(next, iterator)).done) {
	    try {
	      result = callFn(step.value);
	    } catch (error) {
	      iteratorClose$g(iterator, 'throw', error);
	    }
	    if (typeof result == 'object' && result && isPrototypeOf$a(ResultPrototype, result)) return result;
	  } return new Result(false);
	};

	var $$3x = _export;
	var isPrototypeOf$9 = objectIsPrototypeOf;
	var getPrototypeOf$c = objectGetPrototypeOf$2;
	var setPrototypeOf$8 = objectSetPrototypeOf$1;
	var copyConstructorProperties$3 = copyConstructorProperties$7;
	var create$e = objectCreate;
	var createNonEnumerableProperty$b = createNonEnumerableProperty$h;
	var createPropertyDescriptor$8 = createPropertyDescriptor$d;
	var installErrorCause = installErrorCause$2;
	var installErrorStack$1 = errorStackInstall;
	var iterate$k = iterate$l;
	var normalizeStringArgument$3 = normalizeStringArgument$6;
	var wellKnownSymbol$z = wellKnownSymbol$K;

	var TO_STRING_TAG$6 = wellKnownSymbol$z('toStringTag');
	var $Error$1 = Error;
	var push$g = [].push;

	var $AggregateError$1 = function AggregateError(errors, message /* , options */) {
	  var isInstance = isPrototypeOf$9(AggregateErrorPrototype, this);
	  var that;
	  if (setPrototypeOf$8) {
	    that = setPrototypeOf$8(new $Error$1(), isInstance ? getPrototypeOf$c(this) : AggregateErrorPrototype);
	  } else {
	    that = isInstance ? this : create$e(AggregateErrorPrototype);
	    createNonEnumerableProperty$b(that, TO_STRING_TAG$6, 'Error');
	  }
	  if (message !== undefined) createNonEnumerableProperty$b(that, 'message', normalizeStringArgument$3(message));
	  installErrorStack$1(that, $AggregateError$1, that.stack, 1);
	  if (arguments.length > 2) installErrorCause(that, arguments[2]);
	  var errorsArray = [];
	  iterate$k(errors, push$g, { that: errorsArray });
	  createNonEnumerableProperty$b(that, 'errors', errorsArray);
	  return that;
	};

	if (setPrototypeOf$8) setPrototypeOf$8($AggregateError$1, $Error$1);
	else copyConstructorProperties$3($AggregateError$1, $Error$1, { name: true });

	var AggregateErrorPrototype = $AggregateError$1.prototype = create$e($Error$1.prototype, {
	  constructor: createPropertyDescriptor$8(1, $AggregateError$1),
	  message: createPropertyDescriptor$8(1, ''),
	  name: createPropertyDescriptor$8(1, 'AggregateError')
	});

	// `AggregateError` constructor
	// https://tc39.es/ecma262/#sec-aggregate-error-constructor
	$$3x({ global: true, constructor: true, arity: 2 }, {
	  AggregateError: $AggregateError$1
	});

	var $$3w = _export;
	var getBuiltIn$q = getBuiltIn$B;
	var apply$9 = functionApply$1;
	var fails$1i = fails$1z;
	var wrapErrorConstructorWithCause = wrapErrorConstructorWithCause$2;

	var AGGREGATE_ERROR = 'AggregateError';
	var $AggregateError = getBuiltIn$q(AGGREGATE_ERROR);

	var FORCED$M = !fails$1i(function () {
	  return $AggregateError([1]).errors[0] !== 1;
	}) && fails$1i(function () {
	  return $AggregateError([1], AGGREGATE_ERROR, { cause: 7 }).cause !== 7;
	});

	// https://tc39.es/ecma262/#sec-aggregate-error
	$$3w({ global: true, constructor: true, arity: 2, forced: FORCED$M }, {
	  AggregateError: wrapErrorConstructorWithCause(AGGREGATE_ERROR, function (init) {
	    // eslint-disable-next-line no-unused-vars -- required for functions `.length`
	    return function AggregateError(errors, message) { return apply$9(init, this, arguments); };
	  }, FORCED$M, true)
	});

	var $$3v = _export;
	var globalThis$13 = globalThis_1;
	var isPrototypeOf$8 = objectIsPrototypeOf;
	var getPrototypeOf$b = objectGetPrototypeOf$2;
	var setPrototypeOf$7 = objectSetPrototypeOf$1;
	var copyConstructorProperties$2 = copyConstructorProperties$7;
	var create$d = objectCreate;
	var createNonEnumerableProperty$a = createNonEnumerableProperty$h;
	var createPropertyDescriptor$7 = createPropertyDescriptor$d;
	var installErrorStack = errorStackInstall;
	var normalizeStringArgument$2 = normalizeStringArgument$6;
	var wellKnownSymbol$y = wellKnownSymbol$K;
	var fails$1h = fails$1z;

	var NativeSuppressedError = globalThis$13.SuppressedError;
	var TO_STRING_TAG$5 = wellKnownSymbol$y('toStringTag');
	var $Error = Error;

	// https://github.com/oven-sh/bun/issues/9282
	var WRONG_ARITY$4 = !!NativeSuppressedError && NativeSuppressedError.length !== 3;

	// https://github.com/oven-sh/bun/issues/9283
	var EXTRA_ARGS_SUPPORT = !!NativeSuppressedError && fails$1h(function () {
	  return new NativeSuppressedError(1, 2, 3, { cause: 4 }).cause === 4;
	});

	var PATCH$1 = WRONG_ARITY$4 || EXTRA_ARGS_SUPPORT;

	var $SuppressedError = function SuppressedError(error, suppressed, message) {
	  var isInstance = isPrototypeOf$8(SuppressedErrorPrototype, this);
	  var that;
	  if (setPrototypeOf$7) {
	    that = PATCH$1 && (!isInstance || getPrototypeOf$b(this) === SuppressedErrorPrototype)
	      ? new NativeSuppressedError()
	      : setPrototypeOf$7(new $Error(), isInstance ? getPrototypeOf$b(this) : SuppressedErrorPrototype);
	  } else {
	    that = isInstance ? this : create$d(SuppressedErrorPrototype);
	    createNonEnumerableProperty$a(that, TO_STRING_TAG$5, 'Error');
	  }
	  if (message !== undefined) createNonEnumerableProperty$a(that, 'message', normalizeStringArgument$2(message));
	  installErrorStack(that, $SuppressedError, that.stack, 1);
	  createNonEnumerableProperty$a(that, 'error', error);
	  createNonEnumerableProperty$a(that, 'suppressed', suppressed);
	  return that;
	};

	if (setPrototypeOf$7) setPrototypeOf$7($SuppressedError, $Error);
	else copyConstructorProperties$2($SuppressedError, $Error, { name: true });

	var SuppressedErrorPrototype = $SuppressedError.prototype = PATCH$1 ? NativeSuppressedError.prototype : create$d($Error.prototype, {
	  constructor: createPropertyDescriptor$7(1, $SuppressedError),
	  message: createPropertyDescriptor$7(1, ''),
	  name: createPropertyDescriptor$7(1, 'SuppressedError')
	});

	if (PATCH$1 && true) SuppressedErrorPrototype.constructor = $SuppressedError;

	// `SuppressedError` constructor
	// https://github.com/tc39/proposal-explicit-resource-management
	$$3v({ global: true, constructor: true, arity: 3, forced: PATCH$1 }, {
	  SuppressedError: $SuppressedError
	});

	var wellKnownSymbol$x = wellKnownSymbol$K;
	var create$c = objectCreate;
	var defineProperty$8 = objectDefineProperty.f;

	var UNSCOPABLES = wellKnownSymbol$x('unscopables');
	var ArrayPrototype = Array.prototype;

	// Array.prototype[@@unscopables]
	// https://tc39.es/ecma262/#sec-array.prototype-@@unscopables
	if (ArrayPrototype[UNSCOPABLES] === undefined) {
	  defineProperty$8(ArrayPrototype, UNSCOPABLES, {
	    configurable: true,
	    value: create$c(null)
	  });
	}

	// add a key to Array.prototype[@@unscopables]
	var addToUnscopables$e = function (key) {
	  ArrayPrototype[UNSCOPABLES][key] = true;
	};

	var $$3u = _export;
	var toObject$q = toObject$v;
	var lengthOfArrayLike$o = lengthOfArrayLike$s;
	var toIntegerOrInfinity$j = toIntegerOrInfinity$m;
	var addToUnscopables$d = addToUnscopables$e;

	// `Array.prototype.at` method
	// https://tc39.es/ecma262/#sec-array.prototype.at
	$$3u({ target: 'Array', proto: true }, {
	  at: function at(index) {
	    var O = toObject$q(this);
	    var len = lengthOfArrayLike$o(O);
	    var relativeIndex = toIntegerOrInfinity$j(index);
	    var k = relativeIndex >= 0 ? relativeIndex : len + relativeIndex;
	    return (k < 0 || k >= len) ? undefined : O[k];
	  }
	});

	addToUnscopables$d('at');

	var $TypeError$q = TypeError;
	var MAX_SAFE_INTEGER$1 = 0x1FFFFFFFFFFFFF; // 2 ** 53 - 1 == 9007199254740991

	var doesNotExceedSafeInteger$7 = function (it) {
	  if (it > MAX_SAFE_INTEGER$1) throw $TypeError$q('Maximum allowed index exceeded');
	  return it;
	};

	var DESCRIPTORS$E = descriptors;
	var definePropertyModule$6 = objectDefineProperty;
	var createPropertyDescriptor$6 = createPropertyDescriptor$d;

	var createProperty$9 = function (object, key, value) {
	  if (DESCRIPTORS$E) definePropertyModule$6.f(object, key, createPropertyDescriptor$6(0, value));
	  else object[key] = value;
	};

	var fails$1g = fails$1z;
	var wellKnownSymbol$w = wellKnownSymbol$K;
	var V8_VERSION$3 = environmentV8Version;

	var SPECIES$5 = wellKnownSymbol$w('species');

	var arrayMethodHasSpeciesSupport$5 = function (METHOD_NAME) {
	  // We can't use this feature detection in V8 since it causes
	  // deoptimization and serious performance degradation
	  // https://github.com/zloirock/core-js/issues/677
	  return V8_VERSION$3 >= 51 || !fails$1g(function () {
	    var array = [];
	    var constructor = array.constructor = {};
	    constructor[SPECIES$5] = function () {
	      return { foo: 1 };
	    };
	    return array[METHOD_NAME](Boolean).foo !== 1;
	  });
	};

	var $$3t = _export;
	var fails$1f = fails$1z;
	var isArray$6 = isArray$9;
	var isObject$y = isObject$K;
	var toObject$p = toObject$v;
	var lengthOfArrayLike$n = lengthOfArrayLike$s;
	var doesNotExceedSafeInteger$6 = doesNotExceedSafeInteger$7;
	var createProperty$8 = createProperty$9;
	var arraySpeciesCreate$3 = arraySpeciesCreate$5;
	var arrayMethodHasSpeciesSupport$4 = arrayMethodHasSpeciesSupport$5;
	var wellKnownSymbol$v = wellKnownSymbol$K;
	var V8_VERSION$2 = environmentV8Version;

	var IS_CONCAT_SPREADABLE = wellKnownSymbol$v('isConcatSpreadable');

	// We can't use this feature detection in V8 since it causes
	// deoptimization and serious performance degradation
	// https://github.com/zloirock/core-js/issues/679
	var IS_CONCAT_SPREADABLE_SUPPORT = V8_VERSION$2 >= 51 || !fails$1f(function () {
	  var array = [];
	  array[IS_CONCAT_SPREADABLE] = false;
	  return array.concat()[0] !== array;
	});

	var isConcatSpreadable = function (O) {
	  if (!isObject$y(O)) return false;
	  var spreadable = O[IS_CONCAT_SPREADABLE];
	  return spreadable !== undefined ? !!spreadable : isArray$6(O);
	};

	var FORCED$L = !IS_CONCAT_SPREADABLE_SUPPORT || !arrayMethodHasSpeciesSupport$4('concat');

	// `Array.prototype.concat` method
	// https://tc39.es/ecma262/#sec-array.prototype.concat
	// with adding support of @@isConcatSpreadable and @@species
	$$3t({ target: 'Array', proto: true, arity: 1, forced: FORCED$L }, {
	  // eslint-disable-next-line no-unused-vars -- required for `.length`
	  concat: function concat(arg) {
	    var O = toObject$p(this);
	    var A = arraySpeciesCreate$3(O, 0);
	    var n = 0;
	    var i, k, length, len, E;
	    for (i = -1, length = arguments.length; i < length; i++) {
	      E = i === -1 ? O : arguments[i];
	      if (isConcatSpreadable(E)) {
	        len = lengthOfArrayLike$n(E);
	        doesNotExceedSafeInteger$6(n + len);
	        for (k = 0; k < len; k++, n++) if (k in E) createProperty$8(A, n, E[k]);
	      } else {
	        doesNotExceedSafeInteger$6(n + 1);
	        createProperty$8(A, n++, E);
	      }
	    }
	    A.length = n;
	    return A;
	  }
	});

	var tryToString$2 = tryToString$7;

	var $TypeError$p = TypeError;

	var deletePropertyOrThrow$4 = function (O, P) {
	  if (!delete O[P]) throw new $TypeError$p('Cannot delete property ' + tryToString$2(P) + ' of ' + tryToString$2(O));
	};

	var toObject$o = toObject$v;
	var toAbsoluteIndex$7 = toAbsoluteIndex$9;
	var lengthOfArrayLike$m = lengthOfArrayLike$s;
	var deletePropertyOrThrow$3 = deletePropertyOrThrow$4;

	var min$a = Math.min;

	// `Array.prototype.copyWithin` method implementation
	// https://tc39.es/ecma262/#sec-array.prototype.copywithin
	// eslint-disable-next-line es/no-array-prototype-copywithin -- safe
	var arrayCopyWithin = [].copyWithin || function copyWithin(target /* = 0 */, start /* = 0, end = @length */) {
	  var O = toObject$o(this);
	  var len = lengthOfArrayLike$m(O);
	  var to = toAbsoluteIndex$7(target, len);
	  var from = toAbsoluteIndex$7(start, len);
	  var end = arguments.length > 2 ? arguments[2] : undefined;
	  var count = min$a((end === undefined ? len : toAbsoluteIndex$7(end, len)) - from, len - to);
	  var inc = 1;
	  if (from < to && to < from + count) {
	    inc = -1;
	    from += count - 1;
	    to += count - 1;
	  }
	  while (count-- > 0) {
	    if (from in O) O[to] = O[from];
	    else deletePropertyOrThrow$3(O, to);
	    to += inc;
	    from += inc;
	  } return O;
	};

	var $$3s = _export;
	var copyWithin = arrayCopyWithin;
	var addToUnscopables$c = addToUnscopables$e;

	// `Array.prototype.copyWithin` method
	// https://tc39.es/ecma262/#sec-array.prototype.copywithin
	$$3s({ target: 'Array', proto: true }, {
	  copyWithin: copyWithin
	});

	// https://tc39.es/ecma262/#sec-array.prototype-@@unscopables
	addToUnscopables$c('copyWithin');

	var fails$1e = fails$1z;

	var arrayMethodIsStrict$9 = function (METHOD_NAME, argument) {
	  var method = [][METHOD_NAME];
	  return !!method && fails$1e(function () {
	    // eslint-disable-next-line no-useless-call -- required for testing
	    method.call(null, argument || function () { return 1; }, 1);
	  });
	};

	var $$3r = _export;
	var $every$1 = arrayIteration.every;
	var arrayMethodIsStrict$8 = arrayMethodIsStrict$9;

	var STRICT_METHOD$4 = arrayMethodIsStrict$8('every');

	// `Array.prototype.every` method
	// https://tc39.es/ecma262/#sec-array.prototype.every
	$$3r({ target: 'Array', proto: true, forced: !STRICT_METHOD$4 }, {
	  every: function every(callbackfn /* , thisArg */) {
	    return $every$1(this, callbackfn, arguments.length > 1 ? arguments[1] : undefined);
	  }
	});

	var toObject$n = toObject$v;
	var toAbsoluteIndex$6 = toAbsoluteIndex$9;
	var lengthOfArrayLike$l = lengthOfArrayLike$s;

	// `Array.prototype.fill` method implementation
	// https://tc39.es/ecma262/#sec-array.prototype.fill
	var arrayFill$1 = function fill(value /* , start = 0, end = @length */) {
	  var O = toObject$n(this);
	  var length = lengthOfArrayLike$l(O);
	  var argumentsLength = arguments.length;
	  var index = toAbsoluteIndex$6(argumentsLength > 1 ? arguments[1] : undefined, length);
	  var end = argumentsLength > 2 ? arguments[2] : undefined;
	  var endPos = end === undefined ? length : toAbsoluteIndex$6(end, length);
	  while (endPos > index) O[index++] = value;
	  return O;
	};

	var $$3q = _export;
	var fill$1 = arrayFill$1;
	var addToUnscopables$b = addToUnscopables$e;

	// `Array.prototype.fill` method
	// https://tc39.es/ecma262/#sec-array.prototype.fill
	$$3q({ target: 'Array', proto: true }, {
	  fill: fill$1
	});

	// https://tc39.es/ecma262/#sec-array.prototype-@@unscopables
	addToUnscopables$b('fill');

	var $$3p = _export;
	var $filter$1 = arrayIteration.filter;
	var arrayMethodHasSpeciesSupport$3 = arrayMethodHasSpeciesSupport$5;

	var HAS_SPECIES_SUPPORT$3 = arrayMethodHasSpeciesSupport$3('filter');

	// `Array.prototype.filter` method
	// https://tc39.es/ecma262/#sec-array.prototype.filter
	// with adding support of @@species
	$$3p({ target: 'Array', proto: true, forced: !HAS_SPECIES_SUPPORT$3 }, {
	  filter: function filter(callbackfn /* , thisArg */) {
	    return $filter$1(this, callbackfn, arguments.length > 1 ? arguments[1] : undefined);
	  }
	});

	var $$3o = _export;
	var $find$1 = arrayIteration.find;
	var addToUnscopables$a = addToUnscopables$e;

	var FIND = 'find';
	var SKIPS_HOLES$1 = true;

	// Shouldn't skip holes
	// eslint-disable-next-line es/no-array-prototype-find -- testing
	if (FIND in []) Array(1)[FIND](function () { SKIPS_HOLES$1 = false; });

	// `Array.prototype.find` method
	// https://tc39.es/ecma262/#sec-array.prototype.find
	$$3o({ target: 'Array', proto: true, forced: SKIPS_HOLES$1 }, {
	  find: function find(callbackfn /* , that = undefined */) {
	    return $find$1(this, callbackfn, arguments.length > 1 ? arguments[1] : undefined);
	  }
	});

	// https://tc39.es/ecma262/#sec-array.prototype-@@unscopables
	addToUnscopables$a(FIND);

	var $$3n = _export;
	var $findIndex$1 = arrayIteration.findIndex;
	var addToUnscopables$9 = addToUnscopables$e;

	var FIND_INDEX = 'findIndex';
	var SKIPS_HOLES = true;

	// Shouldn't skip holes
	// eslint-disable-next-line es/no-array-prototype-findindex -- testing
	if (FIND_INDEX in []) Array(1)[FIND_INDEX](function () { SKIPS_HOLES = false; });

	// `Array.prototype.findIndex` method
	// https://tc39.es/ecma262/#sec-array.prototype.findindex
	$$3n({ target: 'Array', proto: true, forced: SKIPS_HOLES }, {
	  findIndex: function findIndex(callbackfn /* , that = undefined */) {
	    return $findIndex$1(this, callbackfn, arguments.length > 1 ? arguments[1] : undefined);
	  }
	});

	// https://tc39.es/ecma262/#sec-array.prototype-@@unscopables
	addToUnscopables$9(FIND_INDEX);

	var bind$d = functionBindContext;
	var IndexedObject$3 = indexedObject;
	var toObject$m = toObject$v;
	var lengthOfArrayLike$k = lengthOfArrayLike$s;

	// `Array.prototype.{ findLast, findLastIndex }` methods implementation
	var createMethod$6 = function (TYPE) {
	  var IS_FIND_LAST_INDEX = TYPE === 1;
	  return function ($this, callbackfn, that) {
	    var O = toObject$m($this);
	    var self = IndexedObject$3(O);
	    var index = lengthOfArrayLike$k(self);
	    var boundFunction = bind$d(callbackfn, that);
	    var value, result;
	    while (index-- > 0) {
	      value = self[index];
	      result = boundFunction(value, index, O);
	      if (result) switch (TYPE) {
	        case 0: return value; // findLast
	        case 1: return index; // findLastIndex
	      }
	    }
	    return IS_FIND_LAST_INDEX ? -1 : undefined;
	  };
	};

	var arrayIterationFromLast = {
	  // `Array.prototype.findLast` method
	  // https://github.com/tc39/proposal-array-find-from-last
	  findLast: createMethod$6(0),
	  // `Array.prototype.findLastIndex` method
	  // https://github.com/tc39/proposal-array-find-from-last
	  findLastIndex: createMethod$6(1)
	};

	var $$3m = _export;
	var $findLast$1 = arrayIterationFromLast.findLast;
	var addToUnscopables$8 = addToUnscopables$e;

	// `Array.prototype.findLast` method
	// https://tc39.es/ecma262/#sec-array.prototype.findlast
	$$3m({ target: 'Array', proto: true }, {
	  findLast: function findLast(callbackfn /* , that = undefined */) {
	    return $findLast$1(this, callbackfn, arguments.length > 1 ? arguments[1] : undefined);
	  }
	});

	addToUnscopables$8('findLast');

	var $$3l = _export;
	var $findLastIndex$1 = arrayIterationFromLast.findLastIndex;
	var addToUnscopables$7 = addToUnscopables$e;

	// `Array.prototype.findLastIndex` method
	// https://tc39.es/ecma262/#sec-array.prototype.findlastindex
	$$3l({ target: 'Array', proto: true }, {
	  findLastIndex: function findLastIndex(callbackfn /* , that = undefined */) {
	    return $findLastIndex$1(this, callbackfn, arguments.length > 1 ? arguments[1] : undefined);
	  }
	});

	addToUnscopables$7('findLastIndex');

	var isArray$5 = isArray$9;
	var lengthOfArrayLike$j = lengthOfArrayLike$s;
	var doesNotExceedSafeInteger$5 = doesNotExceedSafeInteger$7;
	var bind$c = functionBindContext;

	// `FlattenIntoArray` abstract operation
	// https://tc39.es/ecma262/#sec-flattenintoarray
	var flattenIntoArray$2 = function (target, original, source, sourceLen, start, depth, mapper, thisArg) {
	  var targetIndex = start;
	  var sourceIndex = 0;
	  var mapFn = mapper ? bind$c(mapper, thisArg) : false;
	  var element, elementLen;

	  while (sourceIndex < sourceLen) {
	    if (sourceIndex in source) {
	      element = mapFn ? mapFn(source[sourceIndex], sourceIndex, original) : source[sourceIndex];

	      if (depth > 0 && isArray$5(element)) {
	        elementLen = lengthOfArrayLike$j(element);
	        targetIndex = flattenIntoArray$2(target, original, element, elementLen, targetIndex, depth - 1) - 1;
	      } else {
	        doesNotExceedSafeInteger$5(targetIndex + 1);
	        target[targetIndex] = element;
	      }

	      targetIndex++;
	    }
	    sourceIndex++;
	  }
	  return targetIndex;
	};

	var flattenIntoArray_1 = flattenIntoArray$2;

	var $$3k = _export;
	var flattenIntoArray$1 = flattenIntoArray_1;
	var toObject$l = toObject$v;
	var lengthOfArrayLike$i = lengthOfArrayLike$s;
	var toIntegerOrInfinity$i = toIntegerOrInfinity$m;
	var arraySpeciesCreate$2 = arraySpeciesCreate$5;

	// `Array.prototype.flat` method
	// https://tc39.es/ecma262/#sec-array.prototype.flat
	$$3k({ target: 'Array', proto: true }, {
	  flat: function flat(/* depthArg = 1 */) {
	    var depthArg = arguments.length ? arguments[0] : undefined;
	    var O = toObject$l(this);
	    var sourceLen = lengthOfArrayLike$i(O);
	    var A = arraySpeciesCreate$2(O, 0);
	    A.length = flattenIntoArray$1(A, O, O, sourceLen, 0, depthArg === undefined ? 1 : toIntegerOrInfinity$i(depthArg));
	    return A;
	  }
	});

	var $$3j = _export;
	var flattenIntoArray = flattenIntoArray_1;
	var aCallable$w = aCallable$B;
	var toObject$k = toObject$v;
	var lengthOfArrayLike$h = lengthOfArrayLike$s;
	var arraySpeciesCreate$1 = arraySpeciesCreate$5;

	// `Array.prototype.flatMap` method
	// https://tc39.es/ecma262/#sec-array.prototype.flatmap
	$$3j({ target: 'Array', proto: true }, {
	  flatMap: function flatMap(callbackfn /* , thisArg */) {
	    var O = toObject$k(this);
	    var sourceLen = lengthOfArrayLike$h(O);
	    var A;
	    aCallable$w(callbackfn);
	    A = arraySpeciesCreate$1(O, 0);
	    A.length = flattenIntoArray(A, O, O, sourceLen, 0, 1, callbackfn, arguments.length > 1 ? arguments[1] : undefined);
	    return A;
	  }
	});

	var $forEach$1 = arrayIteration.forEach;
	var arrayMethodIsStrict$7 = arrayMethodIsStrict$9;

	var STRICT_METHOD$3 = arrayMethodIsStrict$7('forEach');

	// `Array.prototype.forEach` method implementation
	// https://tc39.es/ecma262/#sec-array.prototype.foreach
	var arrayForEach = !STRICT_METHOD$3 ? function forEach(callbackfn /* , thisArg */) {
	  return $forEach$1(this, callbackfn, arguments.length > 1 ? arguments[1] : undefined);
	// eslint-disable-next-line es/no-array-prototype-foreach -- safe
	} : [].forEach;

	var $$3i = _export;
	var forEach$5 = arrayForEach;

	// `Array.prototype.forEach` method
	// https://tc39.es/ecma262/#sec-array.prototype.foreach
	// eslint-disable-next-line es/no-array-prototype-foreach -- safe
	$$3i({ target: 'Array', proto: true, forced: [].forEach !== forEach$5 }, {
	  forEach: forEach$5
	});

	var anObject$K = anObject$U;
	var iteratorClose$f = iteratorClose$h;

	// call something on iterator step with safe closing on error
	var callWithSafeIterationClosing$3 = function (iterator, fn, value, ENTRIES) {
	  try {
	    return ENTRIES ? fn(anObject$K(value)[0], value[1]) : fn(value);
	  } catch (error) {
	    iteratorClose$f(iterator, 'throw', error);
	  }
	};

	var bind$b = functionBindContext;
	var call$O = functionCall;
	var toObject$j = toObject$v;
	var callWithSafeIterationClosing$2 = callWithSafeIterationClosing$3;
	var isArrayIteratorMethod$1 = isArrayIteratorMethod$3;
	var isConstructor$5 = isConstructor$7;
	var lengthOfArrayLike$g = lengthOfArrayLike$s;
	var createProperty$7 = createProperty$9;
	var getIterator$4 = getIterator$6;
	var getIteratorMethod$4 = getIteratorMethod$7;

	var $Array$9 = Array;

	// `Array.from` method implementation
	// https://tc39.es/ecma262/#sec-array.from
	var arrayFrom$1 = function from(arrayLike /* , mapfn = undefined, thisArg = undefined */) {
	  var O = toObject$j(arrayLike);
	  var IS_CONSTRUCTOR = isConstructor$5(this);
	  var argumentsLength = arguments.length;
	  var mapfn = argumentsLength > 1 ? arguments[1] : undefined;
	  var mapping = mapfn !== undefined;
	  if (mapping) mapfn = bind$b(mapfn, argumentsLength > 2 ? arguments[2] : undefined);
	  var iteratorMethod = getIteratorMethod$4(O);
	  var index = 0;
	  var length, result, step, iterator, next, value;
	  // if the target is not iterable or it's an array with the default iterator - use a simple case
	  if (iteratorMethod && !(this === $Array$9 && isArrayIteratorMethod$1(iteratorMethod))) {
	    result = IS_CONSTRUCTOR ? new this() : [];
	    iterator = getIterator$4(O, iteratorMethod);
	    next = iterator.next;
	    for (;!(step = call$O(next, iterator)).done; index++) {
	      value = mapping ? callWithSafeIterationClosing$2(iterator, mapfn, [step.value, index], true) : step.value;
	      createProperty$7(result, index, value);
	    }
	  } else {
	    length = lengthOfArrayLike$g(O);
	    result = IS_CONSTRUCTOR ? new this(length) : $Array$9(length);
	    for (;length > index; index++) {
	      value = mapping ? mapfn(O[index], index) : O[index];
	      createProperty$7(result, index, value);
	    }
	  }
	  result.length = index;
	  return result;
	};

	var wellKnownSymbol$u = wellKnownSymbol$K;

	var ITERATOR$9 = wellKnownSymbol$u('iterator');
	var SAFE_CLOSING = false;

	try {
	  var called = 0;
	  var iteratorWithReturn = {
	    next: function () {
	      return { done: !!called++ };
	    },
	    'return': function () {
	      SAFE_CLOSING = true;
	    }
	  };
	  iteratorWithReturn[ITERATOR$9] = function () {
	    return this;
	  };
	  // eslint-disable-next-line es/no-array-from, no-throw-literal -- required for testing
	  Array.from(iteratorWithReturn, function () { throw 2; });
	} catch (error) { /* empty */ }

	var checkCorrectnessOfIteration$4 = function (exec, SKIP_CLOSING) {
	  try {
	    if (!SKIP_CLOSING && !SAFE_CLOSING) return false;
	  } catch (error) { return false; } // workaround of old WebKit + `eval` bug
	  var ITERATION_SUPPORT = false;
	  try {
	    var object = {};
	    object[ITERATOR$9] = function () {
	      return {
	        next: function () {
	          return { done: ITERATION_SUPPORT = true };
	        }
	      };
	    };
	    exec(object);
	  } catch (error) { /* empty */ }
	  return ITERATION_SUPPORT;
	};

	var $$3h = _export;
	var from = arrayFrom$1;
	var checkCorrectnessOfIteration$3 = checkCorrectnessOfIteration$4;

	var INCORRECT_ITERATION = !checkCorrectnessOfIteration$3(function (iterable) {
	  // eslint-disable-next-line es/no-array-from -- required for testing
	  Array.from(iterable);
	});

	// `Array.from` method
	// https://tc39.es/ecma262/#sec-array.from
	$$3h({ target: 'Array', stat: true, forced: INCORRECT_ITERATION }, {
	  from: from
	});

	var $$3g = _export;
	var $includes$1 = arrayIncludes.includes;
	var fails$1d = fails$1z;
	var addToUnscopables$6 = addToUnscopables$e;

	// FF99+ bug
	var BROKEN_ON_SPARSE = fails$1d(function () {
	  // eslint-disable-next-line es/no-array-prototype-includes -- detection
	  return !Array(1).includes();
	});

	// `Array.prototype.includes` method
	// https://tc39.es/ecma262/#sec-array.prototype.includes
	$$3g({ target: 'Array', proto: true, forced: BROKEN_ON_SPARSE }, {
	  includes: function includes(el /* , fromIndex = 0 */) {
	    return $includes$1(this, el, arguments.length > 1 ? arguments[1] : undefined);
	  }
	});

	// https://tc39.es/ecma262/#sec-array.prototype-@@unscopables
	addToUnscopables$6('includes');

	/* eslint-disable es/no-array-prototype-indexof -- required for testing */
	var $$3f = _export;
	var uncurryThis$1h = functionUncurryThisClause;
	var $indexOf$1 = arrayIncludes.indexOf;
	var arrayMethodIsStrict$6 = arrayMethodIsStrict$9;

	var nativeIndexOf = uncurryThis$1h([].indexOf);

	var NEGATIVE_ZERO$1 = !!nativeIndexOf && 1 / nativeIndexOf([1], 1, -0) < 0;
	var FORCED$K = NEGATIVE_ZERO$1 || !arrayMethodIsStrict$6('indexOf');

	// `Array.prototype.indexOf` method
	// https://tc39.es/ecma262/#sec-array.prototype.indexof
	$$3f({ target: 'Array', proto: true, forced: FORCED$K }, {
	  indexOf: function indexOf(searchElement /* , fromIndex = 0 */) {
	    var fromIndex = arguments.length > 1 ? arguments[1] : undefined;
	    return NEGATIVE_ZERO$1
	      // convert -0 to +0
	      ? nativeIndexOf(this, searchElement, fromIndex) || 0
	      : $indexOf$1(this, searchElement, fromIndex);
	  }
	});

	var $$3e = _export;
	var isArray$4 = isArray$9;

	// `Array.isArray` method
	// https://tc39.es/ecma262/#sec-array.isarray
	$$3e({ target: 'Array', stat: true }, {
	  isArray: isArray$4
	});

	var fails$1c = fails$1z;
	var isCallable$i = isCallable$A;
	var isObject$x = isObject$K;
	var getPrototypeOf$a = objectGetPrototypeOf$2;
	var defineBuiltIn$o = defineBuiltIn$t;
	var wellKnownSymbol$t = wellKnownSymbol$K;

	var ITERATOR$8 = wellKnownSymbol$t('iterator');
	var BUGGY_SAFARI_ITERATORS$1 = false;

	// `%IteratorPrototype%` object
	// https://tc39.es/ecma262/#sec-%iteratorprototype%-object
	var IteratorPrototype$6, PrototypeOfArrayIteratorPrototype, arrayIterator$1;

	/* eslint-disable es/no-array-prototype-keys -- safe */
	if ([].keys) {
	  arrayIterator$1 = [].keys();
	  // Safari 8 has buggy iterators w/o `next`
	  if (!('next' in arrayIterator$1)) BUGGY_SAFARI_ITERATORS$1 = true;
	  else {
	    PrototypeOfArrayIteratorPrototype = getPrototypeOf$a(getPrototypeOf$a(arrayIterator$1));
	    if (PrototypeOfArrayIteratorPrototype !== Object.prototype) IteratorPrototype$6 = PrototypeOfArrayIteratorPrototype;
	  }
	}

	var NEW_ITERATOR_PROTOTYPE = !isObject$x(IteratorPrototype$6) || fails$1c(function () {
	  var test = {};
	  // FF44- legacy iterators case
	  return IteratorPrototype$6[ITERATOR$8].call(test) !== test;
	});

	if (NEW_ITERATOR_PROTOTYPE) IteratorPrototype$6 = {};

	// `%IteratorPrototype%[@@iterator]()` method
	// https://tc39.es/ecma262/#sec-%iteratorprototype%-@@iterator
	if (!isCallable$i(IteratorPrototype$6[ITERATOR$8])) {
	  defineBuiltIn$o(IteratorPrototype$6, ITERATOR$8, function () {
	    return this;
	  });
	}

	var iteratorsCore = {
	  IteratorPrototype: IteratorPrototype$6,
	  BUGGY_SAFARI_ITERATORS: BUGGY_SAFARI_ITERATORS$1
	};

	var IteratorPrototype$5 = iteratorsCore.IteratorPrototype;
	var create$b = objectCreate;
	var createPropertyDescriptor$5 = createPropertyDescriptor$d;
	var setToStringTag$b = setToStringTag$e;
	var Iterators$2 = iterators;

	var returnThis$1 = function () { return this; };

	var iteratorCreateConstructor = function (IteratorConstructor, NAME, next, ENUMERABLE_NEXT) {
	  var TO_STRING_TAG = NAME + ' Iterator';
	  IteratorConstructor.prototype = create$b(IteratorPrototype$5, { next: createPropertyDescriptor$5(+!ENUMERABLE_NEXT, next) });
	  setToStringTag$b(IteratorConstructor, TO_STRING_TAG, false);
	  Iterators$2[TO_STRING_TAG] = returnThis$1;
	  return IteratorConstructor;
	};

	var $$3d = _export;
	var call$N = functionCall;
	var FunctionName$1 = functionName;
	var isCallable$h = isCallable$A;
	var createIteratorConstructor$2 = iteratorCreateConstructor;
	var getPrototypeOf$9 = objectGetPrototypeOf$2;
	var setPrototypeOf$6 = objectSetPrototypeOf$1;
	var setToStringTag$a = setToStringTag$e;
	var createNonEnumerableProperty$9 = createNonEnumerableProperty$h;
	var defineBuiltIn$n = defineBuiltIn$t;
	var wellKnownSymbol$s = wellKnownSymbol$K;
	var Iterators$1 = iterators;
	var IteratorsCore = iteratorsCore;

	var PROPER_FUNCTION_NAME$3 = FunctionName$1.PROPER;
	var CONFIGURABLE_FUNCTION_NAME$1 = FunctionName$1.CONFIGURABLE;
	var IteratorPrototype$4 = IteratorsCore.IteratorPrototype;
	var BUGGY_SAFARI_ITERATORS = IteratorsCore.BUGGY_SAFARI_ITERATORS;
	var ITERATOR$7 = wellKnownSymbol$s('iterator');
	var KEYS = 'keys';
	var VALUES = 'values';
	var ENTRIES = 'entries';

	var returnThis = function () { return this; };

	var iteratorDefine = function (Iterable, NAME, IteratorConstructor, next, DEFAULT, IS_SET, FORCED) {
	  createIteratorConstructor$2(IteratorConstructor, NAME, next);

	  var getIterationMethod = function (KIND) {
	    if (KIND === DEFAULT && defaultIterator) return defaultIterator;
	    if (!BUGGY_SAFARI_ITERATORS && KIND && KIND in IterablePrototype) return IterablePrototype[KIND];

	    switch (KIND) {
	      case KEYS: return function keys() { return new IteratorConstructor(this, KIND); };
	      case VALUES: return function values() { return new IteratorConstructor(this, KIND); };
	      case ENTRIES: return function entries() { return new IteratorConstructor(this, KIND); };
	    }

	    return function () { return new IteratorConstructor(this); };
	  };

	  var TO_STRING_TAG = NAME + ' Iterator';
	  var INCORRECT_VALUES_NAME = false;
	  var IterablePrototype = Iterable.prototype;
	  var nativeIterator = IterablePrototype[ITERATOR$7]
	    || IterablePrototype['@@iterator']
	    || DEFAULT && IterablePrototype[DEFAULT];
	  var defaultIterator = !BUGGY_SAFARI_ITERATORS && nativeIterator || getIterationMethod(DEFAULT);
	  var anyNativeIterator = NAME === 'Array' ? IterablePrototype.entries || nativeIterator : nativeIterator;
	  var CurrentIteratorPrototype, methods, KEY;

	  // fix native
	  if (anyNativeIterator) {
	    CurrentIteratorPrototype = getPrototypeOf$9(anyNativeIterator.call(new Iterable()));
	    if (CurrentIteratorPrototype !== Object.prototype && CurrentIteratorPrototype.next) {
	      if (getPrototypeOf$9(CurrentIteratorPrototype) !== IteratorPrototype$4) {
	        if (setPrototypeOf$6) {
	          setPrototypeOf$6(CurrentIteratorPrototype, IteratorPrototype$4);
	        } else if (!isCallable$h(CurrentIteratorPrototype[ITERATOR$7])) {
	          defineBuiltIn$n(CurrentIteratorPrototype, ITERATOR$7, returnThis);
	        }
	      }
	      // Set @@toStringTag to native iterators
	      setToStringTag$a(CurrentIteratorPrototype, TO_STRING_TAG, true);
	    }
	  }

	  // fix Array.prototype.{ values, @@iterator }.name in V8 / FF
	  if (PROPER_FUNCTION_NAME$3 && DEFAULT === VALUES && nativeIterator && nativeIterator.name !== VALUES) {
	    if (CONFIGURABLE_FUNCTION_NAME$1) {
	      createNonEnumerableProperty$9(IterablePrototype, 'name', VALUES);
	    } else {
	      INCORRECT_VALUES_NAME = true;
	      defaultIterator = function values() { return call$N(nativeIterator, this); };
	    }
	  }

	  // export additional methods
	  if (DEFAULT) {
	    methods = {
	      values: getIterationMethod(VALUES),
	      keys: IS_SET ? defaultIterator : getIterationMethod(KEYS),
	      entries: getIterationMethod(ENTRIES)
	    };
	    if (FORCED) for (KEY in methods) {
	      if (BUGGY_SAFARI_ITERATORS || INCORRECT_VALUES_NAME || !(KEY in IterablePrototype)) {
	        defineBuiltIn$n(IterablePrototype, KEY, methods[KEY]);
	      }
	    } else $$3d({ target: NAME, proto: true, forced: BUGGY_SAFARI_ITERATORS || INCORRECT_VALUES_NAME }, methods);
	  }

	  // define iterator
	  if (IterablePrototype[ITERATOR$7] !== defaultIterator) {
	    defineBuiltIn$n(IterablePrototype, ITERATOR$7, defaultIterator, { name: DEFAULT });
	  }
	  Iterators$1[NAME] = defaultIterator;

	  return methods;
	};

	// `CreateIterResultObject` abstract operation
	// https://tc39.es/ecma262/#sec-createiterresultobject
	var createIterResultObject$7 = function (value, done) {
	  return { value: value, done: done };
	};

	var toIndexedObject$c = toIndexedObject$j;
	var addToUnscopables$5 = addToUnscopables$e;
	var Iterators = iterators;
	var InternalStateModule$f = internalState;
	var defineProperty$7 = objectDefineProperty.f;
	var defineIterator$2 = iteratorDefine;
	var createIterResultObject$6 = createIterResultObject$7;
	var DESCRIPTORS$D = descriptors;

	var ARRAY_ITERATOR = 'Array Iterator';
	var setInternalState$e = InternalStateModule$f.set;
	var getInternalState$9 = InternalStateModule$f.getterFor(ARRAY_ITERATOR);

	// `Array.prototype.entries` method
	// https://tc39.es/ecma262/#sec-array.prototype.entries
	// `Array.prototype.keys` method
	// https://tc39.es/ecma262/#sec-array.prototype.keys
	// `Array.prototype.values` method
	// https://tc39.es/ecma262/#sec-array.prototype.values
	// `Array.prototype[@@iterator]` method
	// https://tc39.es/ecma262/#sec-array.prototype-@@iterator
	// `CreateArrayIterator` internal method
	// https://tc39.es/ecma262/#sec-createarrayiterator
	var es_array_iterator = defineIterator$2(Array, 'Array', function (iterated, kind) {
	  setInternalState$e(this, {
	    type: ARRAY_ITERATOR,
	    target: toIndexedObject$c(iterated), // target
	    index: 0,                          // next index
	    kind: kind                         // kind
	  });
	// `%ArrayIteratorPrototype%.next` method
	// https://tc39.es/ecma262/#sec-%arrayiteratorprototype%.next
	}, function () {
	  var state = getInternalState$9(this);
	  var target = state.target;
	  var index = state.index++;
	  if (!target || index >= target.length) {
	    state.target = null;
	    return createIterResultObject$6(undefined, true);
	  }
	  switch (state.kind) {
	    case 'keys': return createIterResultObject$6(index, false);
	    case 'values': return createIterResultObject$6(target[index], false);
	  } return createIterResultObject$6([index, target[index]], false);
	}, 'values');

	// argumentsList[@@iterator] is %ArrayProto_values%
	// https://tc39.es/ecma262/#sec-createunmappedargumentsobject
	// https://tc39.es/ecma262/#sec-createmappedargumentsobject
	var values = Iterators.Arguments = Iterators.Array;

	// https://tc39.es/ecma262/#sec-array.prototype-@@unscopables
	addToUnscopables$5('keys');
	addToUnscopables$5('values');
	addToUnscopables$5('entries');

	// V8 ~ Chrome 45- bug
	if (DESCRIPTORS$D && values.name !== 'values') try {
	  defineProperty$7(values, 'name', { value: 'values' });
	} catch (error) { /* empty */ }

	var $$3c = _export;
	var uncurryThis$1g = functionUncurryThis;
	var IndexedObject$2 = indexedObject;
	var toIndexedObject$b = toIndexedObject$j;
	var arrayMethodIsStrict$5 = arrayMethodIsStrict$9;

	var nativeJoin = uncurryThis$1g([].join);

	var ES3_STRINGS = IndexedObject$2 !== Object;
	var FORCED$J = ES3_STRINGS || !arrayMethodIsStrict$5('join', ',');

	// `Array.prototype.join` method
	// https://tc39.es/ecma262/#sec-array.prototype.join
	$$3c({ target: 'Array', proto: true, forced: FORCED$J }, {
	  join: function join(separator) {
	    return nativeJoin(toIndexedObject$b(this), separator === undefined ? ',' : separator);
	  }
	});

	/* eslint-disable es/no-array-prototype-lastindexof -- safe */
	var apply$8 = functionApply$1;
	var toIndexedObject$a = toIndexedObject$j;
	var toIntegerOrInfinity$h = toIntegerOrInfinity$m;
	var lengthOfArrayLike$f = lengthOfArrayLike$s;
	var arrayMethodIsStrict$4 = arrayMethodIsStrict$9;

	var min$9 = Math.min;
	var $lastIndexOf$1 = [].lastIndexOf;
	var NEGATIVE_ZERO = !!$lastIndexOf$1 && 1 / [1].lastIndexOf(1, -0) < 0;
	var STRICT_METHOD$2 = arrayMethodIsStrict$4('lastIndexOf');
	var FORCED$I = NEGATIVE_ZERO || !STRICT_METHOD$2;

	// `Array.prototype.lastIndexOf` method implementation
	// https://tc39.es/ecma262/#sec-array.prototype.lastindexof
	var arrayLastIndexOf = FORCED$I ? function lastIndexOf(searchElement /* , fromIndex = @[*-1] */) {
	  // convert -0 to +0
	  if (NEGATIVE_ZERO) return apply$8($lastIndexOf$1, this, arguments) || 0;
	  var O = toIndexedObject$a(this);
	  var length = lengthOfArrayLike$f(O);
	  if (length === 0) return -1;
	  var index = length - 1;
	  if (arguments.length > 1) index = min$9(index, toIntegerOrInfinity$h(arguments[1]));
	  if (index < 0) index = length + index;
	  for (;index >= 0; index--) if (index in O && O[index] === searchElement) return index || 0;
	  return -1;
	} : $lastIndexOf$1;

	var $$3b = _export;
	var lastIndexOf = arrayLastIndexOf;

	// `Array.prototype.lastIndexOf` method
	// https://tc39.es/ecma262/#sec-array.prototype.lastindexof
	// eslint-disable-next-line es/no-array-prototype-lastindexof -- required for testing
	$$3b({ target: 'Array', proto: true, forced: lastIndexOf !== [].lastIndexOf }, {
	  lastIndexOf: lastIndexOf
	});

	var $$3a = _export;
	var $map$1 = arrayIteration.map;
	var arrayMethodHasSpeciesSupport$2 = arrayMethodHasSpeciesSupport$5;

	var HAS_SPECIES_SUPPORT$2 = arrayMethodHasSpeciesSupport$2('map');

	// `Array.prototype.map` method
	// https://tc39.es/ecma262/#sec-array.prototype.map
	// with adding support of @@species
	$$3a({ target: 'Array', proto: true, forced: !HAS_SPECIES_SUPPORT$2 }, {
	  map: function map(callbackfn /* , thisArg */) {
	    return $map$1(this, callbackfn, arguments.length > 1 ? arguments[1] : undefined);
	  }
	});

	var $$39 = _export;
	var fails$1b = fails$1z;
	var isConstructor$4 = isConstructor$7;
	var createProperty$6 = createProperty$9;

	var $Array$8 = Array;

	var ISNT_GENERIC = fails$1b(function () {
	  function F() { /* empty */ }
	  // eslint-disable-next-line es/no-array-of -- safe
	  return !($Array$8.of.call(F) instanceof F);
	});

	// `Array.of` method
	// https://tc39.es/ecma262/#sec-array.of
	// WebKit Array.of isn't generic
	$$39({ target: 'Array', stat: true, forced: ISNT_GENERIC }, {
	  of: function of(/* ...args */) {
	    var index = 0;
	    var argumentsLength = arguments.length;
	    var result = new (isConstructor$4(this) ? this : $Array$8)(argumentsLength);
	    while (argumentsLength > index) createProperty$6(result, index, arguments[index++]);
	    result.length = argumentsLength;
	    return result;
	  }
	});

	var DESCRIPTORS$C = descriptors;
	var isArray$3 = isArray$9;

	var $TypeError$o = TypeError;
	// eslint-disable-next-line es/no-object-getownpropertydescriptor -- safe
	var getOwnPropertyDescriptor$7 = Object.getOwnPropertyDescriptor;

	// Safari < 13 does not throw an error in this case
	var SILENT_ON_NON_WRITABLE_LENGTH_SET = DESCRIPTORS$C && !function () {
	  // makes no sense without proper strict mode support
	  if (this !== undefined) return true;
	  try {
	    // eslint-disable-next-line es/no-object-defineproperty -- safe
	    Object.defineProperty([], 'length', { writable: false }).length = 1;
	  } catch (error) {
	    return error instanceof TypeError;
	  }
	}();

	var arraySetLength = SILENT_ON_NON_WRITABLE_LENGTH_SET ? function (O, length) {
	  if (isArray$3(O) && !getOwnPropertyDescriptor$7(O, 'length').writable) {
	    throw new $TypeError$o('Cannot set read only .length');
	  } return O.length = length;
	} : function (O, length) {
	  return O.length = length;
	};

	var $$38 = _export;
	var toObject$i = toObject$v;
	var lengthOfArrayLike$e = lengthOfArrayLike$s;
	var setArrayLength$2 = arraySetLength;
	var doesNotExceedSafeInteger$4 = doesNotExceedSafeInteger$7;
	var fails$1a = fails$1z;

	var INCORRECT_TO_LENGTH = fails$1a(function () {
	  return [].push.call({ length: 0x100000000 }, 1) !== 4294967297;
	});

	// V8 <= 121 and Safari <= 15.4; FF < 23 throws InternalError
	// https://bugs.chromium.org/p/v8/issues/detail?id=12681
	var properErrorOnNonWritableLength$1 = function () {
	  try {
	    // eslint-disable-next-line es/no-object-defineproperty -- safe
	    Object.defineProperty([], 'length', { writable: false }).push();
	  } catch (error) {
	    return error instanceof TypeError;
	  }
	};

	var FORCED$H = INCORRECT_TO_LENGTH || !properErrorOnNonWritableLength$1();

	// `Array.prototype.push` method
	// https://tc39.es/ecma262/#sec-array.prototype.push
	$$38({ target: 'Array', proto: true, arity: 1, forced: FORCED$H }, {
	  // eslint-disable-next-line no-unused-vars -- required for `.length`
	  push: function push(item) {
	    var O = toObject$i(this);
	    var len = lengthOfArrayLike$e(O);
	    var argCount = arguments.length;
	    doesNotExceedSafeInteger$4(len + argCount);
	    for (var i = 0; i < argCount; i++) {
	      O[len] = arguments[i];
	      len++;
	    }
	    setArrayLength$2(O, len);
	    return len;
	  }
	});

	var aCallable$v = aCallable$B;
	var toObject$h = toObject$v;
	var IndexedObject$1 = indexedObject;
	var lengthOfArrayLike$d = lengthOfArrayLike$s;

	var $TypeError$n = TypeError;

	var REDUCE_EMPTY = 'Reduce of empty array with no initial value';

	// `Array.prototype.{ reduce, reduceRight }` methods implementation
	var createMethod$5 = function (IS_RIGHT) {
	  return function (that, callbackfn, argumentsLength, memo) {
	    var O = toObject$h(that);
	    var self = IndexedObject$1(O);
	    var length = lengthOfArrayLike$d(O);
	    aCallable$v(callbackfn);
	    if (length === 0 && argumentsLength < 2) throw new $TypeError$n(REDUCE_EMPTY);
	    var index = IS_RIGHT ? length - 1 : 0;
	    var i = IS_RIGHT ? -1 : 1;
	    if (argumentsLength < 2) while (true) {
	      if (index in self) {
	        memo = self[index];
	        index += i;
	        break;
	      }
	      index += i;
	      if (IS_RIGHT ? index < 0 : length <= index) {
	        throw new $TypeError$n(REDUCE_EMPTY);
	      }
	    }
	    for (;IS_RIGHT ? index >= 0 : length > index; index += i) if (index in self) {
	      memo = callbackfn(memo, self[index], index, O);
	    }
	    return memo;
	  };
	};

	var arrayReduce = {
	  // `Array.prototype.reduce` method
	  // https://tc39.es/ecma262/#sec-array.prototype.reduce
	  left: createMethod$5(false),
	  // `Array.prototype.reduceRight` method
	  // https://tc39.es/ecma262/#sec-array.prototype.reduceright
	  right: createMethod$5(true)
	};

	/* global Bun, Deno -- detection */
	var globalThis$12 = globalThis_1;
	var userAgent$6 = environmentUserAgent;
	var classof$h = classofRaw$2;

	var userAgentStartsWith = function (string) {
	  return userAgent$6.slice(0, string.length) === string;
	};

	var environment = (function () {
	  if (userAgentStartsWith('Bun/')) return 'BUN';
	  if (userAgentStartsWith('Cloudflare-Workers')) return 'CLOUDFLARE';
	  if (userAgentStartsWith('Deno/')) return 'DENO';
	  if (userAgentStartsWith('Node.js/')) return 'NODE';
	  if (globalThis$12.Bun && typeof Bun.version == 'string') return 'BUN';
	  if (globalThis$12.Deno && typeof Deno.version == 'object') return 'DENO';
	  if (classof$h(globalThis$12.process) === 'process') return 'NODE';
	  if (globalThis$12.window && globalThis$12.document) return 'BROWSER';
	  return 'REST';
	})();

	var ENVIRONMENT$3 = environment;

	var environmentIsNode = ENVIRONMENT$3 === 'NODE';

	var $$37 = _export;
	var $reduce$1 = arrayReduce.left;
	var arrayMethodIsStrict$3 = arrayMethodIsStrict$9;
	var CHROME_VERSION$1 = environmentV8Version;
	var IS_NODE$5 = environmentIsNode;

	// Chrome 80-82 has a critical bug
	// https://bugs.chromium.org/p/chromium/issues/detail?id=1049982
	var CHROME_BUG$1 = !IS_NODE$5 && CHROME_VERSION$1 > 79 && CHROME_VERSION$1 < 83;
	var FORCED$G = CHROME_BUG$1 || !arrayMethodIsStrict$3('reduce');

	// `Array.prototype.reduce` method
	// https://tc39.es/ecma262/#sec-array.prototype.reduce
	$$37({ target: 'Array', proto: true, forced: FORCED$G }, {
	  reduce: function reduce(callbackfn /* , initialValue */) {
	    var length = arguments.length;
	    return $reduce$1(this, callbackfn, length, length > 1 ? arguments[1] : undefined);
	  }
	});

	var $$36 = _export;
	var $reduceRight$1 = arrayReduce.right;
	var arrayMethodIsStrict$2 = arrayMethodIsStrict$9;
	var CHROME_VERSION = environmentV8Version;
	var IS_NODE$4 = environmentIsNode;

	// Chrome 80-82 has a critical bug
	// https://bugs.chromium.org/p/chromium/issues/detail?id=1049982
	var CHROME_BUG = !IS_NODE$4 && CHROME_VERSION > 79 && CHROME_VERSION < 83;
	var FORCED$F = CHROME_BUG || !arrayMethodIsStrict$2('reduceRight');

	// `Array.prototype.reduceRight` method
	// https://tc39.es/ecma262/#sec-array.prototype.reduceright
	$$36({ target: 'Array', proto: true, forced: FORCED$F }, {
	  reduceRight: function reduceRight(callbackfn /* , initialValue */) {
	    return $reduceRight$1(this, callbackfn, arguments.length, arguments.length > 1 ? arguments[1] : undefined);
	  }
	});

	var $$35 = _export;
	var uncurryThis$1f = functionUncurryThis;
	var isArray$2 = isArray$9;

	var nativeReverse = uncurryThis$1f([].reverse);
	var test$1 = [1, 2];

	// `Array.prototype.reverse` method
	// https://tc39.es/ecma262/#sec-array.prototype.reverse
	// fix for Safari 12.0 bug
	// https://bugs.webkit.org/show_bug.cgi?id=188794
	$$35({ target: 'Array', proto: true, forced: String(test$1) === String(test$1.reverse()) }, {
	  reverse: function reverse() {
	    // eslint-disable-next-line no-self-assign -- dirty hack
	    if (isArray$2(this)) this.length = this.length;
	    return nativeReverse(this);
	  }
	});

	var $$34 = _export;
	var isArray$1 = isArray$9;
	var isConstructor$3 = isConstructor$7;
	var isObject$w = isObject$K;
	var toAbsoluteIndex$5 = toAbsoluteIndex$9;
	var lengthOfArrayLike$c = lengthOfArrayLike$s;
	var toIndexedObject$9 = toIndexedObject$j;
	var createProperty$5 = createProperty$9;
	var wellKnownSymbol$r = wellKnownSymbol$K;
	var arrayMethodHasSpeciesSupport$1 = arrayMethodHasSpeciesSupport$5;
	var nativeSlice = arraySlice$a;

	var HAS_SPECIES_SUPPORT$1 = arrayMethodHasSpeciesSupport$1('slice');

	var SPECIES$4 = wellKnownSymbol$r('species');
	var $Array$7 = Array;
	var max$6 = Math.max;

	// `Array.prototype.slice` method
	// https://tc39.es/ecma262/#sec-array.prototype.slice
	// fallback for not array-like ES3 strings and DOM objects
	$$34({ target: 'Array', proto: true, forced: !HAS_SPECIES_SUPPORT$1 }, {
	  slice: function slice(start, end) {
	    var O = toIndexedObject$9(this);
	    var length = lengthOfArrayLike$c(O);
	    var k = toAbsoluteIndex$5(start, length);
	    var fin = toAbsoluteIndex$5(end === undefined ? length : end, length);
	    // inline `ArraySpeciesCreate` for usage native `Array#slice` where it's possible
	    var Constructor, result, n;
	    if (isArray$1(O)) {
	      Constructor = O.constructor;
	      // cross-realm fallback
	      if (isConstructor$3(Constructor) && (Constructor === $Array$7 || isArray$1(Constructor.prototype))) {
	        Constructor = undefined;
	      } else if (isObject$w(Constructor)) {
	        Constructor = Constructor[SPECIES$4];
	        if (Constructor === null) Constructor = undefined;
	      }
	      if (Constructor === $Array$7 || Constructor === undefined) {
	        return nativeSlice(O, k, fin);
	      }
	    }
	    result = new (Constructor === undefined ? $Array$7 : Constructor)(max$6(fin - k, 0));
	    for (n = 0; k < fin; k++, n++) if (k in O) createProperty$5(result, n, O[k]);
	    result.length = n;
	    return result;
	  }
	});

	var $$33 = _export;
	var $some$1 = arrayIteration.some;
	var arrayMethodIsStrict$1 = arrayMethodIsStrict$9;

	var STRICT_METHOD$1 = arrayMethodIsStrict$1('some');

	// `Array.prototype.some` method
	// https://tc39.es/ecma262/#sec-array.prototype.some
	$$33({ target: 'Array', proto: true, forced: !STRICT_METHOD$1 }, {
	  some: function some(callbackfn /* , thisArg */) {
	    return $some$1(this, callbackfn, arguments.length > 1 ? arguments[1] : undefined);
	  }
	});

	var arraySlice$7 = arraySlice$a;

	var floor$9 = Math.floor;

	var sort$2 = function (array, comparefn) {
	  var length = array.length;

	  if (length < 8) {
	    // insertion sort
	    var i = 1;
	    var element, j;

	    while (i < length) {
	      j = i;
	      element = array[i];
	      while (j && comparefn(array[j - 1], element) > 0) {
	        array[j] = array[--j];
	      }
	      if (j !== i++) array[j] = element;
	    }
	  } else {
	    // merge sort
	    var middle = floor$9(length / 2);
	    var left = sort$2(arraySlice$7(array, 0, middle), comparefn);
	    var right = sort$2(arraySlice$7(array, middle), comparefn);
	    var llength = left.length;
	    var rlength = right.length;
	    var lindex = 0;
	    var rindex = 0;

	    while (lindex < llength || rindex < rlength) {
	      array[lindex + rindex] = (lindex < llength && rindex < rlength)
	        ? comparefn(left[lindex], right[rindex]) <= 0 ? left[lindex++] : right[rindex++]
	        : lindex < llength ? left[lindex++] : right[rindex++];
	    }
	  }

	  return array;
	};

	var arraySort$1 = sort$2;

	var userAgent$5 = environmentUserAgent;

	var firefox = userAgent$5.match(/firefox\/(\d+)/i);

	var environmentFfVersion = !!firefox && +firefox[1];

	var UA = environmentUserAgent;

	var environmentIsIeOrEdge = /MSIE|Trident/.test(UA);

	var userAgent$4 = environmentUserAgent;

	var webkit = userAgent$4.match(/AppleWebKit\/(\d+)\./);

	var environmentWebkitVersion = !!webkit && +webkit[1];

	var $$32 = _export;
	var uncurryThis$1e = functionUncurryThis;
	var aCallable$u = aCallable$B;
	var toObject$g = toObject$v;
	var lengthOfArrayLike$b = lengthOfArrayLike$s;
	var deletePropertyOrThrow$2 = deletePropertyOrThrow$4;
	var toString$y = toString$D;
	var fails$19 = fails$1z;
	var internalSort$1 = arraySort$1;
	var arrayMethodIsStrict = arrayMethodIsStrict$9;
	var FF$1 = environmentFfVersion;
	var IE_OR_EDGE$1 = environmentIsIeOrEdge;
	var V8$2 = environmentV8Version;
	var WEBKIT$2 = environmentWebkitVersion;

	var test = [];
	var nativeSort$1 = uncurryThis$1e(test.sort);
	var push$f = uncurryThis$1e(test.push);

	// IE8-
	var FAILS_ON_UNDEFINED = fails$19(function () {
	  test.sort(undefined);
	});
	// V8 bug
	var FAILS_ON_NULL = fails$19(function () {
	  test.sort(null);
	});
	// Old WebKit
	var STRICT_METHOD = arrayMethodIsStrict('sort');

	var STABLE_SORT$1 = !fails$19(function () {
	  // feature detection can be too slow, so check engines versions
	  if (V8$2) return V8$2 < 70;
	  if (FF$1 && FF$1 > 3) return;
	  if (IE_OR_EDGE$1) return true;
	  if (WEBKIT$2) return WEBKIT$2 < 603;

	  var result = '';
	  var code, chr, value, index;

	  // generate an array with more 512 elements (Chakra and old V8 fails only in this case)
	  for (code = 65; code < 76; code++) {
	    chr = String.fromCharCode(code);

	    switch (code) {
	      case 66: case 69: case 70: case 72: value = 3; break;
	      case 68: case 71: value = 4; break;
	      default: value = 2;
	    }

	    for (index = 0; index < 47; index++) {
	      test.push({ k: chr + index, v: value });
	    }
	  }

	  test.sort(function (a, b) { return b.v - a.v; });

	  for (index = 0; index < test.length; index++) {
	    chr = test[index].k.charAt(0);
	    if (result.charAt(result.length - 1) !== chr) result += chr;
	  }

	  return result !== 'DGBEFHACIJK';
	});

	var FORCED$E = FAILS_ON_UNDEFINED || !FAILS_ON_NULL || !STRICT_METHOD || !STABLE_SORT$1;

	var getSortCompare$1 = function (comparefn) {
	  return function (x, y) {
	    if (y === undefined) return -1;
	    if (x === undefined) return 1;
	    if (comparefn !== undefined) return +comparefn(x, y) || 0;
	    return toString$y(x) > toString$y(y) ? 1 : -1;
	  };
	};

	// `Array.prototype.sort` method
	// https://tc39.es/ecma262/#sec-array.prototype.sort
	$$32({ target: 'Array', proto: true, forced: FORCED$E }, {
	  sort: function sort(comparefn) {
	    if (comparefn !== undefined) aCallable$u(comparefn);

	    var array = toObject$g(this);

	    if (STABLE_SORT$1) return comparefn === undefined ? nativeSort$1(array) : nativeSort$1(array, comparefn);

	    var items = [];
	    var arrayLength = lengthOfArrayLike$b(array);
	    var itemsLength, index;

	    for (index = 0; index < arrayLength; index++) {
	      if (index in array) push$f(items, array[index]);
	    }

	    internalSort$1(items, getSortCompare$1(comparefn));

	    itemsLength = lengthOfArrayLike$b(items);
	    index = 0;

	    while (index < itemsLength) array[index] = items[index++];
	    while (index < arrayLength) deletePropertyOrThrow$2(array, index++);

	    return array;
	  }
	});

	var getBuiltIn$p = getBuiltIn$B;
	var defineBuiltInAccessor$i = defineBuiltInAccessor$l;
	var wellKnownSymbol$q = wellKnownSymbol$K;
	var DESCRIPTORS$B = descriptors;

	var SPECIES$3 = wellKnownSymbol$q('species');

	var setSpecies$6 = function (CONSTRUCTOR_NAME) {
	  var Constructor = getBuiltIn$p(CONSTRUCTOR_NAME);

	  if (DESCRIPTORS$B && Constructor && !Constructor[SPECIES$3]) {
	    defineBuiltInAccessor$i(Constructor, SPECIES$3, {
	      configurable: true,
	      get: function () { return this; }
	    });
	  }
	};

	var setSpecies$5 = setSpecies$6;

	// `Array[@@species]` getter
	// https://tc39.es/ecma262/#sec-get-array-@@species
	setSpecies$5('Array');

	var $$31 = _export;
	var toObject$f = toObject$v;
	var toAbsoluteIndex$4 = toAbsoluteIndex$9;
	var toIntegerOrInfinity$g = toIntegerOrInfinity$m;
	var lengthOfArrayLike$a = lengthOfArrayLike$s;
	var setArrayLength$1 = arraySetLength;
	var doesNotExceedSafeInteger$3 = doesNotExceedSafeInteger$7;
	var arraySpeciesCreate = arraySpeciesCreate$5;
	var createProperty$4 = createProperty$9;
	var deletePropertyOrThrow$1 = deletePropertyOrThrow$4;
	var arrayMethodHasSpeciesSupport = arrayMethodHasSpeciesSupport$5;

	var HAS_SPECIES_SUPPORT = arrayMethodHasSpeciesSupport('splice');

	var max$5 = Math.max;
	var min$8 = Math.min;

	// `Array.prototype.splice` method
	// https://tc39.es/ecma262/#sec-array.prototype.splice
	// with adding support of @@species
	$$31({ target: 'Array', proto: true, forced: !HAS_SPECIES_SUPPORT }, {
	  splice: function splice(start, deleteCount /* , ...items */) {
	    var O = toObject$f(this);
	    var len = lengthOfArrayLike$a(O);
	    var actualStart = toAbsoluteIndex$4(start, len);
	    var argumentsLength = arguments.length;
	    var insertCount, actualDeleteCount, A, k, from, to;
	    if (argumentsLength === 0) {
	      insertCount = actualDeleteCount = 0;
	    } else if (argumentsLength === 1) {
	      insertCount = 0;
	      actualDeleteCount = len - actualStart;
	    } else {
	      insertCount = argumentsLength - 2;
	      actualDeleteCount = min$8(max$5(toIntegerOrInfinity$g(deleteCount), 0), len - actualStart);
	    }
	    doesNotExceedSafeInteger$3(len + insertCount - actualDeleteCount);
	    A = arraySpeciesCreate(O, actualDeleteCount);
	    for (k = 0; k < actualDeleteCount; k++) {
	      from = actualStart + k;
	      if (from in O) createProperty$4(A, k, O[from]);
	    }
	    A.length = actualDeleteCount;
	    if (insertCount < actualDeleteCount) {
	      for (k = actualStart; k < len - actualDeleteCount; k++) {
	        from = k + actualDeleteCount;
	        to = k + insertCount;
	        if (from in O) O[to] = O[from];
	        else deletePropertyOrThrow$1(O, to);
	      }
	      for (k = len; k > len - actualDeleteCount + insertCount; k--) deletePropertyOrThrow$1(O, k - 1);
	    } else if (insertCount > actualDeleteCount) {
	      for (k = len - actualDeleteCount; k > actualStart; k--) {
	        from = k + actualDeleteCount - 1;
	        to = k + insertCount - 1;
	        if (from in O) O[to] = O[from];
	        else deletePropertyOrThrow$1(O, to);
	      }
	    }
	    for (k = 0; k < insertCount; k++) {
	      O[k + actualStart] = arguments[k + 2];
	    }
	    setArrayLength$1(O, len - actualDeleteCount + insertCount);
	    return A;
	  }
	});

	var lengthOfArrayLike$9 = lengthOfArrayLike$s;

	// https://tc39.es/ecma262/#sec-array.prototype.toreversed
	// https://tc39.es/ecma262/#sec-%typedarray%.prototype.toreversed
	var arrayToReversed$2 = function (O, C) {
	  var len = lengthOfArrayLike$9(O);
	  var A = new C(len);
	  var k = 0;
	  for (; k < len; k++) A[k] = O[len - k - 1];
	  return A;
	};

	var $$30 = _export;
	var arrayToReversed$1 = arrayToReversed$2;
	var toIndexedObject$8 = toIndexedObject$j;
	var addToUnscopables$4 = addToUnscopables$e;

	var $Array$6 = Array;

	// `Array.prototype.toReversed` method
	// https://tc39.es/ecma262/#sec-array.prototype.toreversed
	$$30({ target: 'Array', proto: true }, {
	  toReversed: function toReversed() {
	    return arrayToReversed$1(toIndexedObject$8(this), $Array$6);
	  }
	});

	addToUnscopables$4('toReversed');

	var lengthOfArrayLike$8 = lengthOfArrayLike$s;

	var arrayFromConstructorAndList$5 = function (Constructor, list, $length) {
	  var index = 0;
	  var length = arguments.length > 2 ? $length : lengthOfArrayLike$8(list);
	  var result = new Constructor(length);
	  while (length > index) result[index] = list[index++];
	  return result;
	};

	var globalThis$11 = globalThis_1;

	var getBuiltInPrototypeMethod$2 = function (CONSTRUCTOR, METHOD) {
	  var Constructor = globalThis$11[CONSTRUCTOR];
	  var Prototype = Constructor && Constructor.prototype;
	  return Prototype && Prototype[METHOD];
	};

	var $$2$ = _export;
	var uncurryThis$1d = functionUncurryThis;
	var aCallable$t = aCallable$B;
	var toIndexedObject$7 = toIndexedObject$j;
	var arrayFromConstructorAndList$4 = arrayFromConstructorAndList$5;
	var getBuiltInPrototypeMethod$1 = getBuiltInPrototypeMethod$2;
	var addToUnscopables$3 = addToUnscopables$e;

	var $Array$5 = Array;
	var sort$1 = uncurryThis$1d(getBuiltInPrototypeMethod$1('Array', 'sort'));

	// `Array.prototype.toSorted` method
	// https://tc39.es/ecma262/#sec-array.prototype.tosorted
	$$2$({ target: 'Array', proto: true }, {
	  toSorted: function toSorted(compareFn) {
	    if (compareFn !== undefined) aCallable$t(compareFn);
	    var O = toIndexedObject$7(this);
	    var A = arrayFromConstructorAndList$4($Array$5, O);
	    return sort$1(A, compareFn);
	  }
	});

	addToUnscopables$3('toSorted');

	var $$2_ = _export;
	var addToUnscopables$2 = addToUnscopables$e;
	var doesNotExceedSafeInteger$2 = doesNotExceedSafeInteger$7;
	var lengthOfArrayLike$7 = lengthOfArrayLike$s;
	var toAbsoluteIndex$3 = toAbsoluteIndex$9;
	var toIndexedObject$6 = toIndexedObject$j;
	var toIntegerOrInfinity$f = toIntegerOrInfinity$m;

	var $Array$4 = Array;
	var max$4 = Math.max;
	var min$7 = Math.min;

	// `Array.prototype.toSpliced` method
	// https://tc39.es/ecma262/#sec-array.prototype.tospliced
	$$2_({ target: 'Array', proto: true }, {
	  toSpliced: function toSpliced(start, deleteCount /* , ...items */) {
	    var O = toIndexedObject$6(this);
	    var len = lengthOfArrayLike$7(O);
	    var actualStart = toAbsoluteIndex$3(start, len);
	    var argumentsLength = arguments.length;
	    var k = 0;
	    var insertCount, actualDeleteCount, newLen, A;
	    if (argumentsLength === 0) {
	      insertCount = actualDeleteCount = 0;
	    } else if (argumentsLength === 1) {
	      insertCount = 0;
	      actualDeleteCount = len - actualStart;
	    } else {
	      insertCount = argumentsLength - 2;
	      actualDeleteCount = min$7(max$4(toIntegerOrInfinity$f(deleteCount), 0), len - actualStart);
	    }
	    newLen = doesNotExceedSafeInteger$2(len + insertCount - actualDeleteCount);
	    A = $Array$4(newLen);

	    for (; k < actualStart; k++) A[k] = O[k];
	    for (; k < actualStart + insertCount; k++) A[k] = arguments[k - actualStart + 2];
	    for (; k < newLen; k++) A[k] = O[k + actualDeleteCount - insertCount];

	    return A;
	  }
	});

	addToUnscopables$2('toSpliced');

	// this method was added to unscopables after implementation
	// in popular engines, so it's moved to a separate module
	var addToUnscopables$1 = addToUnscopables$e;

	// https://tc39.es/ecma262/#sec-array.prototype-@@unscopables
	addToUnscopables$1('flat');

	// this method was added to unscopables after implementation
	// in popular engines, so it's moved to a separate module
	var addToUnscopables = addToUnscopables$e;

	// https://tc39.es/ecma262/#sec-array.prototype-@@unscopables
	addToUnscopables('flatMap');

	var $$2Z = _export;
	var toObject$e = toObject$v;
	var lengthOfArrayLike$6 = lengthOfArrayLike$s;
	var setArrayLength = arraySetLength;
	var deletePropertyOrThrow = deletePropertyOrThrow$4;
	var doesNotExceedSafeInteger$1 = doesNotExceedSafeInteger$7;

	// IE8-
	var INCORRECT_RESULT = [].unshift(0) !== 1;

	// V8 ~ Chrome < 71 and Safari <= 15.4, FF < 23 throws InternalError
	var properErrorOnNonWritableLength = function () {
	  try {
	    // eslint-disable-next-line es/no-object-defineproperty -- safe
	    Object.defineProperty([], 'length', { writable: false }).unshift();
	  } catch (error) {
	    return error instanceof TypeError;
	  }
	};

	var FORCED$D = INCORRECT_RESULT || !properErrorOnNonWritableLength();

	// `Array.prototype.unshift` method
	// https://tc39.es/ecma262/#sec-array.prototype.unshift
	$$2Z({ target: 'Array', proto: true, arity: 1, forced: FORCED$D }, {
	  // eslint-disable-next-line no-unused-vars -- required for `.length`
	  unshift: function unshift(item) {
	    var O = toObject$e(this);
	    var len = lengthOfArrayLike$6(O);
	    var argCount = arguments.length;
	    if (argCount) {
	      doesNotExceedSafeInteger$1(len + argCount);
	      var k = len;
	      while (k--) {
	        var to = k + argCount;
	        if (k in O) O[to] = O[k];
	        else deletePropertyOrThrow(O, to);
	      }
	      for (var j = 0; j < argCount; j++) {
	        O[j] = arguments[j];
	      }
	    } return setArrayLength(O, len + argCount);
	  }
	});

	var lengthOfArrayLike$5 = lengthOfArrayLike$s;
	var toIntegerOrInfinity$e = toIntegerOrInfinity$m;

	var $RangeError$c = RangeError;

	// https://tc39.es/ecma262/#sec-array.prototype.with
	// https://tc39.es/ecma262/#sec-%typedarray%.prototype.with
	var arrayWith$2 = function (O, C, index, value) {
	  var len = lengthOfArrayLike$5(O);
	  var relativeIndex = toIntegerOrInfinity$e(index);
	  var actualIndex = relativeIndex < 0 ? len + relativeIndex : relativeIndex;
	  if (actualIndex >= len || actualIndex < 0) throw new $RangeError$c('Incorrect index');
	  var A = new C(len);
	  var k = 0;
	  for (; k < len; k++) A[k] = k === actualIndex ? value : O[k];
	  return A;
	};

	var $$2Y = _export;
	var arrayWith$1 = arrayWith$2;
	var toIndexedObject$5 = toIndexedObject$j;

	var $Array$3 = Array;

	// Firefox bug
	var INCORRECT_EXCEPTION_ON_COERCION_FAIL = (function () {
	  try {
	    // eslint-disable-next-line es/no-array-prototype-with, no-throw-literal -- needed for testing
	    []['with']({ valueOf: function () { throw 4; } }, null);
	  } catch (error) {
	    return error !== 4;
	  }
	})();

	// `Array.prototype.with` method
	// https://tc39.es/ecma262/#sec-array.prototype.with
	$$2Y({ target: 'Array', proto: true, forced: INCORRECT_EXCEPTION_ON_COERCION_FAIL }, {
	  'with': function (index, value) {
	    return arrayWith$1(toIndexedObject$5(this), $Array$3, index, value);
	  }
	});

	// eslint-disable-next-line es/no-typed-arrays -- safe
	var arrayBufferBasicDetection = typeof ArrayBuffer != 'undefined' && typeof DataView != 'undefined';

	var defineBuiltIn$m = defineBuiltIn$t;

	var defineBuiltIns$9 = function (target, src, options) {
	  for (var key in src) defineBuiltIn$m(target, key, src[key], options);
	  return target;
	};

	var isPrototypeOf$7 = objectIsPrototypeOf;

	var $TypeError$m = TypeError;

	var anInstance$d = function (it, Prototype) {
	  if (isPrototypeOf$7(Prototype, it)) return it;
	  throw new $TypeError$m('Incorrect invocation');
	};

	var toIntegerOrInfinity$d = toIntegerOrInfinity$m;
	var toLength$b = toLength$d;

	var $RangeError$b = RangeError;

	// `ToIndex` abstract operation
	// https://tc39.es/ecma262/#sec-toindex
	var toIndex$4 = function (it) {
	  if (it === undefined) return 0;
	  var number = toIntegerOrInfinity$d(it);
	  var length = toLength$b(number);
	  if (number !== length) throw new $RangeError$b('Wrong length or index');
	  return length;
	};

	// `Math.sign` method implementation
	// https://tc39.es/ecma262/#sec-math.sign
	// eslint-disable-next-line es/no-math-sign -- safe
	var mathSign = Math.sign || function sign(x) {
	  var n = +x;
	  // eslint-disable-next-line no-self-compare -- NaN check
	  return n === 0 || n !== n ? n : n < 0 ? -1 : 1;
	};

	var EPSILON$1 = 2.220446049250313e-16; // Number.EPSILON
	var INVERSE_EPSILON = 1 / EPSILON$1;

	var mathRoundTiesToEven = function (n) {
	  return n + INVERSE_EPSILON - INVERSE_EPSILON;
	};

	var sign$2 = mathSign;
	var roundTiesToEven$1 = mathRoundTiesToEven;

	var abs$9 = Math.abs;

	var EPSILON = 2.220446049250313e-16; // Number.EPSILON

	var mathFloatRound = function (x, FLOAT_EPSILON, FLOAT_MAX_VALUE, FLOAT_MIN_VALUE) {
	  var n = +x;
	  var absolute = abs$9(n);
	  var s = sign$2(n);
	  if (absolute < FLOAT_MIN_VALUE) return s * roundTiesToEven$1(absolute / FLOAT_MIN_VALUE / FLOAT_EPSILON) * FLOAT_MIN_VALUE * FLOAT_EPSILON;
	  var a = (1 + FLOAT_EPSILON / EPSILON) * absolute;
	  var result = a - (a - absolute);
	  // eslint-disable-next-line no-self-compare -- NaN check
	  if (result > FLOAT_MAX_VALUE || result !== result) return s * Infinity;
	  return s * result;
	};

	var floatRound$1 = mathFloatRound;

	var FLOAT32_EPSILON = 1.1920928955078125e-7; // 2 ** -23;
	var FLOAT32_MAX_VALUE = 3.4028234663852886e+38; // 2 ** 128 - 2 ** 104
	var FLOAT32_MIN_VALUE = 1.1754943508222875e-38; // 2 ** -126;

	// `Math.fround` method implementation
	// https://tc39.es/ecma262/#sec-math.fround
	// eslint-disable-next-line es/no-math-fround -- safe
	var mathFround = Math.fround || function fround(x) {
	  return floatRound$1(x, FLOAT32_EPSILON, FLOAT32_MAX_VALUE, FLOAT32_MIN_VALUE);
	};

	// IEEE754 conversions based on https://github.com/feross/ieee754
	var $Array$2 = Array;
	var abs$8 = Math.abs;
	var pow$7 = Math.pow;
	var floor$8 = Math.floor;
	var log$8 = Math.log;
	var LN2$2 = Math.LN2;

	var pack = function (number, mantissaLength, bytes) {
	  var buffer = $Array$2(bytes);
	  var exponentLength = bytes * 8 - mantissaLength - 1;
	  var eMax = (1 << exponentLength) - 1;
	  var eBias = eMax >> 1;
	  var rt = mantissaLength === 23 ? pow$7(2, -24) - pow$7(2, -77) : 0;
	  var sign = number < 0 || number === 0 && 1 / number < 0 ? 1 : 0;
	  var index = 0;
	  var exponent, mantissa, c;
	  number = abs$8(number);
	  // eslint-disable-next-line no-self-compare -- NaN check
	  if (number !== number || number === Infinity) {
	    // eslint-disable-next-line no-self-compare -- NaN check
	    mantissa = number !== number ? 1 : 0;
	    exponent = eMax;
	  } else {
	    exponent = floor$8(log$8(number) / LN2$2);
	    c = pow$7(2, -exponent);
	    if (number * c < 1) {
	      exponent--;
	      c *= 2;
	    }
	    if (exponent + eBias >= 1) {
	      number += rt / c;
	    } else {
	      number += rt * pow$7(2, 1 - eBias);
	    }
	    if (number * c >= 2) {
	      exponent++;
	      c /= 2;
	    }
	    if (exponent + eBias >= eMax) {
	      mantissa = 0;
	      exponent = eMax;
	    } else if (exponent + eBias >= 1) {
	      mantissa = (number * c - 1) * pow$7(2, mantissaLength);
	      exponent += eBias;
	    } else {
	      mantissa = number * pow$7(2, eBias - 1) * pow$7(2, mantissaLength);
	      exponent = 0;
	    }
	  }
	  while (mantissaLength >= 8) {
	    buffer[index++] = mantissa & 255;
	    mantissa /= 256;
	    mantissaLength -= 8;
	  }
	  exponent = exponent << mantissaLength | mantissa;
	  exponentLength += mantissaLength;
	  while (exponentLength > 0) {
	    buffer[index++] = exponent & 255;
	    exponent /= 256;
	    exponentLength -= 8;
	  }
	  buffer[index - 1] |= sign * 128;
	  return buffer;
	};

	var unpack = function (buffer, mantissaLength) {
	  var bytes = buffer.length;
	  var exponentLength = bytes * 8 - mantissaLength - 1;
	  var eMax = (1 << exponentLength) - 1;
	  var eBias = eMax >> 1;
	  var nBits = exponentLength - 7;
	  var index = bytes - 1;
	  var sign = buffer[index--];
	  var exponent = sign & 127;
	  var mantissa;
	  sign >>= 7;
	  while (nBits > 0) {
	    exponent = exponent * 256 + buffer[index--];
	    nBits -= 8;
	  }
	  mantissa = exponent & (1 << -nBits) - 1;
	  exponent >>= -nBits;
	  nBits += mantissaLength;
	  while (nBits > 0) {
	    mantissa = mantissa * 256 + buffer[index--];
	    nBits -= 8;
	  }
	  if (exponent === 0) {
	    exponent = 1 - eBias;
	  } else if (exponent === eMax) {
	    return mantissa ? NaN : sign ? -Infinity : Infinity;
	  } else {
	    mantissa += pow$7(2, mantissaLength);
	    exponent -= eBias;
	  } return (sign ? -1 : 1) * mantissa * pow$7(2, exponent - mantissaLength);
	};

	var ieee754 = {
	  pack: pack,
	  unpack: unpack
	};

	var globalThis$10 = globalThis_1;
	var uncurryThis$1c = functionUncurryThis;
	var DESCRIPTORS$A = descriptors;
	var NATIVE_ARRAY_BUFFER$3 = arrayBufferBasicDetection;
	var FunctionName = functionName;
	var createNonEnumerableProperty$8 = createNonEnumerableProperty$h;
	var defineBuiltInAccessor$h = defineBuiltInAccessor$l;
	var defineBuiltIns$8 = defineBuiltIns$9;
	var fails$18 = fails$1z;
	var anInstance$c = anInstance$d;
	var toIntegerOrInfinity$c = toIntegerOrInfinity$m;
	var toLength$a = toLength$d;
	var toIndex$3 = toIndex$4;
	var fround$1 = mathFround;
	var IEEE754 = ieee754;
	var getPrototypeOf$8 = objectGetPrototypeOf$2;
	var setPrototypeOf$5 = objectSetPrototypeOf$1;
	var arrayFill = arrayFill$1;
	var arraySlice$6 = arraySlice$a;
	var inheritIfRequired$5 = inheritIfRequired$7;
	var copyConstructorProperties$1 = copyConstructorProperties$7;
	var setToStringTag$9 = setToStringTag$e;
	var InternalStateModule$e = internalState;

	var PROPER_FUNCTION_NAME$2 = FunctionName.PROPER;
	var CONFIGURABLE_FUNCTION_NAME = FunctionName.CONFIGURABLE;
	var ARRAY_BUFFER$1 = 'ArrayBuffer';
	var DATA_VIEW = 'DataView';
	var PROTOTYPE = 'prototype';
	var WRONG_LENGTH$1 = 'Wrong length';
	var WRONG_INDEX = 'Wrong index';
	var getInternalArrayBufferState = InternalStateModule$e.getterFor(ARRAY_BUFFER$1);
	var getInternalDataViewState = InternalStateModule$e.getterFor(DATA_VIEW);
	var setInternalState$d = InternalStateModule$e.set;
	var NativeArrayBuffer$1 = globalThis$10[ARRAY_BUFFER$1];
	var $ArrayBuffer$1 = NativeArrayBuffer$1;
	var ArrayBufferPrototype$3 = $ArrayBuffer$1 && $ArrayBuffer$1[PROTOTYPE];
	var $DataView = globalThis$10[DATA_VIEW];
	var DataViewPrototype$2 = $DataView && $DataView[PROTOTYPE];
	var ObjectPrototype$3 = Object.prototype;
	var Array$2 = globalThis$10.Array;
	var RangeError$3 = globalThis$10.RangeError;
	var fill = uncurryThis$1c(arrayFill);
	var reverse = uncurryThis$1c([].reverse);

	var packIEEE754 = IEEE754.pack;
	var unpackIEEE754 = IEEE754.unpack;

	var packInt8 = function (number) {
	  return [number & 0xFF];
	};

	var packInt16 = function (number) {
	  return [number & 0xFF, number >> 8 & 0xFF];
	};

	var packInt32 = function (number) {
	  return [number & 0xFF, number >> 8 & 0xFF, number >> 16 & 0xFF, number >> 24 & 0xFF];
	};

	var unpackInt32 = function (buffer) {
	  return buffer[3] << 24 | buffer[2] << 16 | buffer[1] << 8 | buffer[0];
	};

	var packFloat32 = function (number) {
	  return packIEEE754(fround$1(number), 23, 4);
	};

	var packFloat64 = function (number) {
	  return packIEEE754(number, 52, 8);
	};

	var addGetter$1 = function (Constructor, key, getInternalState) {
	  defineBuiltInAccessor$h(Constructor[PROTOTYPE], key, {
	    configurable: true,
	    get: function () {
	      return getInternalState(this)[key];
	    }
	  });
	};

	var get$2 = function (view, count, index, isLittleEndian) {
	  var store = getInternalDataViewState(view);
	  var intIndex = toIndex$3(index);
	  var boolIsLittleEndian = !!isLittleEndian;
	  if (intIndex + count > store.byteLength) throw new RangeError$3(WRONG_INDEX);
	  var bytes = store.bytes;
	  var start = intIndex + store.byteOffset;
	  var pack = arraySlice$6(bytes, start, start + count);
	  return boolIsLittleEndian ? pack : reverse(pack);
	};

	var set$3 = function (view, count, index, conversion, value, isLittleEndian) {
	  var store = getInternalDataViewState(view);
	  var intIndex = toIndex$3(index);
	  var pack = conversion(+value);
	  var boolIsLittleEndian = !!isLittleEndian;
	  if (intIndex + count > store.byteLength) throw new RangeError$3(WRONG_INDEX);
	  var bytes = store.bytes;
	  var start = intIndex + store.byteOffset;
	  for (var i = 0; i < count; i++) bytes[start + i] = pack[boolIsLittleEndian ? i : count - i - 1];
	};

	if (!NATIVE_ARRAY_BUFFER$3) {
	  $ArrayBuffer$1 = function ArrayBuffer(length) {
	    anInstance$c(this, ArrayBufferPrototype$3);
	    var byteLength = toIndex$3(length);
	    setInternalState$d(this, {
	      type: ARRAY_BUFFER$1,
	      bytes: fill(Array$2(byteLength), 0),
	      byteLength: byteLength
	    });
	    if (!DESCRIPTORS$A) {
	      this.byteLength = byteLength;
	      this.detached = false;
	    }
	  };

	  ArrayBufferPrototype$3 = $ArrayBuffer$1[PROTOTYPE];

	  $DataView = function DataView(buffer, byteOffset, byteLength) {
	    anInstance$c(this, DataViewPrototype$2);
	    anInstance$c(buffer, ArrayBufferPrototype$3);
	    var bufferState = getInternalArrayBufferState(buffer);
	    var bufferLength = bufferState.byteLength;
	    var offset = toIntegerOrInfinity$c(byteOffset);
	    if (offset < 0 || offset > bufferLength) throw new RangeError$3('Wrong offset');
	    byteLength = byteLength === undefined ? bufferLength - offset : toLength$a(byteLength);
	    if (offset + byteLength > bufferLength) throw new RangeError$3(WRONG_LENGTH$1);
	    setInternalState$d(this, {
	      type: DATA_VIEW,
	      buffer: buffer,
	      byteLength: byteLength,
	      byteOffset: offset,
	      bytes: bufferState.bytes
	    });
	    if (!DESCRIPTORS$A) {
	      this.buffer = buffer;
	      this.byteLength = byteLength;
	      this.byteOffset = offset;
	    }
	  };

	  DataViewPrototype$2 = $DataView[PROTOTYPE];

	  if (DESCRIPTORS$A) {
	    addGetter$1($ArrayBuffer$1, 'byteLength', getInternalArrayBufferState);
	    addGetter$1($DataView, 'buffer', getInternalDataViewState);
	    addGetter$1($DataView, 'byteLength', getInternalDataViewState);
	    addGetter$1($DataView, 'byteOffset', getInternalDataViewState);
	  }

	  defineBuiltIns$8(DataViewPrototype$2, {
	    getInt8: function getInt8(byteOffset) {
	      return get$2(this, 1, byteOffset)[0] << 24 >> 24;
	    },
	    getUint8: function getUint8(byteOffset) {
	      return get$2(this, 1, byteOffset)[0];
	    },
	    getInt16: function getInt16(byteOffset /* , littleEndian */) {
	      var bytes = get$2(this, 2, byteOffset, arguments.length > 1 ? arguments[1] : false);
	      return (bytes[1] << 8 | bytes[0]) << 16 >> 16;
	    },
	    getUint16: function getUint16(byteOffset /* , littleEndian */) {
	      var bytes = get$2(this, 2, byteOffset, arguments.length > 1 ? arguments[1] : false);
	      return bytes[1] << 8 | bytes[0];
	    },
	    getInt32: function getInt32(byteOffset /* , littleEndian */) {
	      return unpackInt32(get$2(this, 4, byteOffset, arguments.length > 1 ? arguments[1] : false));
	    },
	    getUint32: function getUint32(byteOffset /* , littleEndian */) {
	      return unpackInt32(get$2(this, 4, byteOffset, arguments.length > 1 ? arguments[1] : false)) >>> 0;
	    },
	    getFloat32: function getFloat32(byteOffset /* , littleEndian */) {
	      return unpackIEEE754(get$2(this, 4, byteOffset, arguments.length > 1 ? arguments[1] : false), 23);
	    },
	    getFloat64: function getFloat64(byteOffset /* , littleEndian */) {
	      return unpackIEEE754(get$2(this, 8, byteOffset, arguments.length > 1 ? arguments[1] : false), 52);
	    },
	    setInt8: function setInt8(byteOffset, value) {
	      set$3(this, 1, byteOffset, packInt8, value);
	    },
	    setUint8: function setUint8(byteOffset, value) {
	      set$3(this, 1, byteOffset, packInt8, value);
	    },
	    setInt16: function setInt16(byteOffset, value /* , littleEndian */) {
	      set$3(this, 2, byteOffset, packInt16, value, arguments.length > 2 ? arguments[2] : false);
	    },
	    setUint16: function setUint16(byteOffset, value /* , littleEndian */) {
	      set$3(this, 2, byteOffset, packInt16, value, arguments.length > 2 ? arguments[2] : false);
	    },
	    setInt32: function setInt32(byteOffset, value /* , littleEndian */) {
	      set$3(this, 4, byteOffset, packInt32, value, arguments.length > 2 ? arguments[2] : false);
	    },
	    setUint32: function setUint32(byteOffset, value /* , littleEndian */) {
	      set$3(this, 4, byteOffset, packInt32, value, arguments.length > 2 ? arguments[2] : false);
	    },
	    setFloat32: function setFloat32(byteOffset, value /* , littleEndian */) {
	      set$3(this, 4, byteOffset, packFloat32, value, arguments.length > 2 ? arguments[2] : false);
	    },
	    setFloat64: function setFloat64(byteOffset, value /* , littleEndian */) {
	      set$3(this, 8, byteOffset, packFloat64, value, arguments.length > 2 ? arguments[2] : false);
	    }
	  });
	} else {
	  var INCORRECT_ARRAY_BUFFER_NAME = PROPER_FUNCTION_NAME$2 && NativeArrayBuffer$1.name !== ARRAY_BUFFER$1;
	  /* eslint-disable no-new, sonarjs/inconsistent-function-call -- required for testing */
	  if (!fails$18(function () {
	    NativeArrayBuffer$1(1);
	  }) || !fails$18(function () {
	    new NativeArrayBuffer$1(-1);
	  }) || fails$18(function () {
	    new NativeArrayBuffer$1();
	    new NativeArrayBuffer$1(1.5);
	    new NativeArrayBuffer$1(NaN);
	    return NativeArrayBuffer$1.length !== 1 || INCORRECT_ARRAY_BUFFER_NAME && !CONFIGURABLE_FUNCTION_NAME;
	  })) {
	    /* eslint-enable no-new, sonarjs/inconsistent-function-call -- required for testing */
	    $ArrayBuffer$1 = function ArrayBuffer(length) {
	      anInstance$c(this, ArrayBufferPrototype$3);
	      return inheritIfRequired$5(new NativeArrayBuffer$1(toIndex$3(length)), this, $ArrayBuffer$1);
	    };

	    $ArrayBuffer$1[PROTOTYPE] = ArrayBufferPrototype$3;

	    ArrayBufferPrototype$3.constructor = $ArrayBuffer$1;

	    copyConstructorProperties$1($ArrayBuffer$1, NativeArrayBuffer$1);
	  } else if (INCORRECT_ARRAY_BUFFER_NAME && CONFIGURABLE_FUNCTION_NAME) {
	    createNonEnumerableProperty$8(NativeArrayBuffer$1, 'name', ARRAY_BUFFER$1);
	  }

	  // WebKit bug - the same parent prototype for typed arrays and data view
	  if (setPrototypeOf$5 && getPrototypeOf$8(DataViewPrototype$2) !== ObjectPrototype$3) {
	    setPrototypeOf$5(DataViewPrototype$2, ObjectPrototype$3);
	  }

	  // iOS Safari 7.x bug
	  var testView = new $DataView(new $ArrayBuffer$1(2));
	  var $setInt8 = uncurryThis$1c(DataViewPrototype$2.setInt8);
	  testView.setInt8(0, 2147483648);
	  testView.setInt8(1, 2147483649);
	  if (testView.getInt8(0) || !testView.getInt8(1)) defineBuiltIns$8(DataViewPrototype$2, {
	    setInt8: function setInt8(byteOffset, value) {
	      $setInt8(this, byteOffset, value << 24 >> 24);
	    },
	    setUint8: function setUint8(byteOffset, value) {
	      $setInt8(this, byteOffset, value << 24 >> 24);
	    }
	  }, { unsafe: true });
	}

	setToStringTag$9($ArrayBuffer$1, ARRAY_BUFFER$1);
	setToStringTag$9($DataView, DATA_VIEW);

	var arrayBuffer = {
	  ArrayBuffer: $ArrayBuffer$1,
	  DataView: $DataView
	};

	var $$2X = _export;
	var globalThis$$ = globalThis_1;
	var arrayBufferModule = arrayBuffer;
	var setSpecies$4 = setSpecies$6;

	var ARRAY_BUFFER = 'ArrayBuffer';
	var ArrayBuffer$6 = arrayBufferModule[ARRAY_BUFFER];
	var NativeArrayBuffer = globalThis$$[ARRAY_BUFFER];

	// `ArrayBuffer` constructor
	// https://tc39.es/ecma262/#sec-arraybuffer-constructor
	$$2X({ global: true, constructor: true, forced: NativeArrayBuffer !== ArrayBuffer$6 }, {
	  ArrayBuffer: ArrayBuffer$6
	});

	setSpecies$4(ARRAY_BUFFER);

	var NATIVE_ARRAY_BUFFER$2 = arrayBufferBasicDetection;
	var DESCRIPTORS$z = descriptors;
	var globalThis$_ = globalThis_1;
	var isCallable$g = isCallable$A;
	var isObject$v = isObject$K;
	var hasOwn$l = hasOwnProperty_1;
	var classof$g = classof$p;
	var tryToString$1 = tryToString$7;
	var createNonEnumerableProperty$7 = createNonEnumerableProperty$h;
	var defineBuiltIn$l = defineBuiltIn$t;
	var defineBuiltInAccessor$g = defineBuiltInAccessor$l;
	var isPrototypeOf$6 = objectIsPrototypeOf;
	var getPrototypeOf$7 = objectGetPrototypeOf$2;
	var setPrototypeOf$4 = objectSetPrototypeOf$1;
	var wellKnownSymbol$p = wellKnownSymbol$K;
	var uid$2 = uid$6;
	var InternalStateModule$d = internalState;

	var enforceInternalState$3 = InternalStateModule$d.enforce;
	var getInternalState$8 = InternalStateModule$d.get;
	var Int8Array$4 = globalThis$_.Int8Array;
	var Int8ArrayPrototype$1 = Int8Array$4 && Int8Array$4.prototype;
	var Uint8ClampedArray$1 = globalThis$_.Uint8ClampedArray;
	var Uint8ClampedArrayPrototype = Uint8ClampedArray$1 && Uint8ClampedArray$1.prototype;
	var TypedArray$1 = Int8Array$4 && getPrototypeOf$7(Int8Array$4);
	var TypedArrayPrototype$2 = Int8ArrayPrototype$1 && getPrototypeOf$7(Int8ArrayPrototype$1);
	var ObjectPrototype$2 = Object.prototype;
	var TypeError$8 = globalThis$_.TypeError;

	var TO_STRING_TAG$4 = wellKnownSymbol$p('toStringTag');
	var TYPED_ARRAY_TAG$1 = uid$2('TYPED_ARRAY_TAG');
	var TYPED_ARRAY_CONSTRUCTOR = 'TypedArrayConstructor';
	// Fixing native typed arrays in Opera Presto crashes the browser, see #595
	var NATIVE_ARRAY_BUFFER_VIEWS$3 = NATIVE_ARRAY_BUFFER$2 && !!setPrototypeOf$4 && classof$g(globalThis$_.opera) !== 'Opera';
	var TYPED_ARRAY_TAG_REQUIRED = false;
	var NAME$1, Constructor, Prototype;

	var TypedArrayConstructorsList = {
	  Int8Array: 1,
	  Uint8Array: 1,
	  Uint8ClampedArray: 1,
	  Int16Array: 2,
	  Uint16Array: 2,
	  Int32Array: 4,
	  Uint32Array: 4,
	  Float32Array: 4,
	  Float64Array: 8
	};

	var BigIntArrayConstructorsList = {
	  BigInt64Array: 8,
	  BigUint64Array: 8
	};

	var isView = function isView(it) {
	  if (!isObject$v(it)) return false;
	  var klass = classof$g(it);
	  return klass === 'DataView'
	    || hasOwn$l(TypedArrayConstructorsList, klass)
	    || hasOwn$l(BigIntArrayConstructorsList, klass);
	};

	var getTypedArrayConstructor$7 = function (it) {
	  var proto = getPrototypeOf$7(it);
	  if (!isObject$v(proto)) return;
	  var state = getInternalState$8(proto);
	  return (state && hasOwn$l(state, TYPED_ARRAY_CONSTRUCTOR)) ? state[TYPED_ARRAY_CONSTRUCTOR] : getTypedArrayConstructor$7(proto);
	};

	var isTypedArray$1 = function (it) {
	  if (!isObject$v(it)) return false;
	  var klass = classof$g(it);
	  return hasOwn$l(TypedArrayConstructorsList, klass)
	    || hasOwn$l(BigIntArrayConstructorsList, klass);
	};

	var aTypedArray$s = function (it) {
	  if (isTypedArray$1(it)) return it;
	  throw new TypeError$8('Target is not a typed array');
	};

	var aTypedArrayConstructor$2 = function (C) {
	  if (isCallable$g(C) && (!setPrototypeOf$4 || isPrototypeOf$6(TypedArray$1, C))) return C;
	  throw new TypeError$8(tryToString$1(C) + ' is not a typed array constructor');
	};

	var exportTypedArrayMethod$t = function (KEY, property, forced, options) {
	  if (!DESCRIPTORS$z) return;
	  if (forced) for (var ARRAY in TypedArrayConstructorsList) {
	    var TypedArrayConstructor = globalThis$_[ARRAY];
	    if (TypedArrayConstructor && hasOwn$l(TypedArrayConstructor.prototype, KEY)) try {
	      delete TypedArrayConstructor.prototype[KEY];
	    } catch (error) {
	      // old WebKit bug - some methods are non-configurable
	      try {
	        TypedArrayConstructor.prototype[KEY] = property;
	      } catch (error2) { /* empty */ }
	    }
	  }
	  if (!TypedArrayPrototype$2[KEY] || forced) {
	    defineBuiltIn$l(TypedArrayPrototype$2, KEY, forced ? property
	      : NATIVE_ARRAY_BUFFER_VIEWS$3 && Int8ArrayPrototype$1[KEY] || property, options);
	  }
	};

	var exportTypedArrayStaticMethod$2 = function (KEY, property, forced) {
	  var ARRAY, TypedArrayConstructor;
	  if (!DESCRIPTORS$z) return;
	  if (setPrototypeOf$4) {
	    if (forced) for (ARRAY in TypedArrayConstructorsList) {
	      TypedArrayConstructor = globalThis$_[ARRAY];
	      if (TypedArrayConstructor && hasOwn$l(TypedArrayConstructor, KEY)) try {
	        delete TypedArrayConstructor[KEY];
	      } catch (error) { /* empty */ }
	    }
	    if (!TypedArray$1[KEY] || forced) {
	      // V8 ~ Chrome 49-50 `%TypedArray%` methods are non-writable non-configurable
	      try {
	        return defineBuiltIn$l(TypedArray$1, KEY, forced ? property : NATIVE_ARRAY_BUFFER_VIEWS$3 && TypedArray$1[KEY] || property);
	      } catch (error) { /* empty */ }
	    } else return;
	  }
	  for (ARRAY in TypedArrayConstructorsList) {
	    TypedArrayConstructor = globalThis$_[ARRAY];
	    if (TypedArrayConstructor && (!TypedArrayConstructor[KEY] || forced)) {
	      defineBuiltIn$l(TypedArrayConstructor, KEY, property);
	    }
	  }
	};

	for (NAME$1 in TypedArrayConstructorsList) {
	  Constructor = globalThis$_[NAME$1];
	  Prototype = Constructor && Constructor.prototype;
	  if (Prototype) enforceInternalState$3(Prototype)[TYPED_ARRAY_CONSTRUCTOR] = Constructor;
	  else NATIVE_ARRAY_BUFFER_VIEWS$3 = false;
	}

	for (NAME$1 in BigIntArrayConstructorsList) {
	  Constructor = globalThis$_[NAME$1];
	  Prototype = Constructor && Constructor.prototype;
	  if (Prototype) enforceInternalState$3(Prototype)[TYPED_ARRAY_CONSTRUCTOR] = Constructor;
	}

	// WebKit bug - typed arrays constructors prototype is Object.prototype
	if (!NATIVE_ARRAY_BUFFER_VIEWS$3 || !isCallable$g(TypedArray$1) || TypedArray$1 === Function.prototype) {
	  // eslint-disable-next-line no-shadow -- safe
	  TypedArray$1 = function TypedArray() {
	    throw new TypeError$8('Incorrect invocation');
	  };
	  if (NATIVE_ARRAY_BUFFER_VIEWS$3) for (NAME$1 in TypedArrayConstructorsList) {
	    if (globalThis$_[NAME$1]) setPrototypeOf$4(globalThis$_[NAME$1], TypedArray$1);
	  }
	}

	if (!NATIVE_ARRAY_BUFFER_VIEWS$3 || !TypedArrayPrototype$2 || TypedArrayPrototype$2 === ObjectPrototype$2) {
	  TypedArrayPrototype$2 = TypedArray$1.prototype;
	  if (NATIVE_ARRAY_BUFFER_VIEWS$3) for (NAME$1 in TypedArrayConstructorsList) {
	    if (globalThis$_[NAME$1]) setPrototypeOf$4(globalThis$_[NAME$1].prototype, TypedArrayPrototype$2);
	  }
	}

	// WebKit bug - one more object in Uint8ClampedArray prototype chain
	if (NATIVE_ARRAY_BUFFER_VIEWS$3 && getPrototypeOf$7(Uint8ClampedArrayPrototype) !== TypedArrayPrototype$2) {
	  setPrototypeOf$4(Uint8ClampedArrayPrototype, TypedArrayPrototype$2);
	}

	if (DESCRIPTORS$z && !hasOwn$l(TypedArrayPrototype$2, TO_STRING_TAG$4)) {
	  TYPED_ARRAY_TAG_REQUIRED = true;
	  defineBuiltInAccessor$g(TypedArrayPrototype$2, TO_STRING_TAG$4, {
	    configurable: true,
	    get: function () {
	      return isObject$v(this) ? this[TYPED_ARRAY_TAG$1] : undefined;
	    }
	  });
	  for (NAME$1 in TypedArrayConstructorsList) if (globalThis$_[NAME$1]) {
	    createNonEnumerableProperty$7(globalThis$_[NAME$1], TYPED_ARRAY_TAG$1, NAME$1);
	  }
	}

	var arrayBufferViewCore = {
	  NATIVE_ARRAY_BUFFER_VIEWS: NATIVE_ARRAY_BUFFER_VIEWS$3,
	  TYPED_ARRAY_TAG: TYPED_ARRAY_TAG_REQUIRED && TYPED_ARRAY_TAG$1,
	  aTypedArray: aTypedArray$s,
	  aTypedArrayConstructor: aTypedArrayConstructor$2,
	  exportTypedArrayMethod: exportTypedArrayMethod$t,
	  exportTypedArrayStaticMethod: exportTypedArrayStaticMethod$2,
	  getTypedArrayConstructor: getTypedArrayConstructor$7,
	  isView: isView,
	  isTypedArray: isTypedArray$1,
	  TypedArray: TypedArray$1,
	  TypedArrayPrototype: TypedArrayPrototype$2
	};

	var $$2W = _export;
	var ArrayBufferViewCore$u = arrayBufferViewCore;

	var NATIVE_ARRAY_BUFFER_VIEWS$2 = ArrayBufferViewCore$u.NATIVE_ARRAY_BUFFER_VIEWS;

	// `ArrayBuffer.isView` method
	// https://tc39.es/ecma262/#sec-arraybuffer.isview
	$$2W({ target: 'ArrayBuffer', stat: true, forced: !NATIVE_ARRAY_BUFFER_VIEWS$2 }, {
	  isView: ArrayBufferViewCore$u.isView
	});

	var $$2V = _export;
	var uncurryThis$1b = functionUncurryThisClause;
	var fails$17 = fails$1z;
	var ArrayBufferModule$2 = arrayBuffer;
	var anObject$J = anObject$U;
	var toAbsoluteIndex$2 = toAbsoluteIndex$9;
	var toLength$9 = toLength$d;

	var ArrayBuffer$5 = ArrayBufferModule$2.ArrayBuffer;
	var DataView$4 = ArrayBufferModule$2.DataView;
	var DataViewPrototype$1 = DataView$4.prototype;
	var nativeArrayBufferSlice = uncurryThis$1b(ArrayBuffer$5.prototype.slice);
	var getUint8 = uncurryThis$1b(DataViewPrototype$1.getUint8);
	var setUint8 = uncurryThis$1b(DataViewPrototype$1.setUint8);

	var INCORRECT_SLICE = fails$17(function () {
	  return !new ArrayBuffer$5(2).slice(1, undefined).byteLength;
	});

	// `ArrayBuffer.prototype.slice` method
	// https://tc39.es/ecma262/#sec-arraybuffer.prototype.slice
	$$2V({ target: 'ArrayBuffer', proto: true, unsafe: true, forced: INCORRECT_SLICE }, {
	  slice: function slice(start, end) {
	    if (nativeArrayBufferSlice && end === undefined) {
	      return nativeArrayBufferSlice(anObject$J(this), start); // FF fix
	    }
	    var length = anObject$J(this).byteLength;
	    var first = toAbsoluteIndex$2(start, length);
	    var fin = toAbsoluteIndex$2(end === undefined ? length : end, length);
	    var result = new ArrayBuffer$5(toLength$9(fin - first));
	    var viewSource = new DataView$4(this);
	    var viewTarget = new DataView$4(result);
	    var index = 0;
	    while (first < fin) {
	      setUint8(viewTarget, index++, getUint8(viewSource, first++));
	    } return result;
	  }
	});

	var $$2U = _export;
	var ArrayBufferModule$1 = arrayBuffer;
	var NATIVE_ARRAY_BUFFER$1 = arrayBufferBasicDetection;

	// `DataView` constructor
	// https://tc39.es/ecma262/#sec-dataview-constructor
	$$2U({ global: true, constructor: true, forced: !NATIVE_ARRAY_BUFFER$1 }, {
	  DataView: ArrayBufferModule$1.DataView
	});

	var $$2T = _export;
	var uncurryThis$1a = functionUncurryThis;

	var pow$6 = Math.pow;

	var EXP_MASK16 = 31; // 2 ** 5 - 1
	var SIGNIFICAND_MASK16 = 1023; // 2 ** 10 - 1
	var MIN_SUBNORMAL16 = pow$6(2, -24); // 2 ** -10 * 2 ** -14
	var SIGNIFICAND_DENOM16 = 0.0009765625; // 2 ** -10

	var unpackFloat16 = function (bytes) {
	  var sign = bytes >>> 15;
	  var exponent = bytes >>> 10 & EXP_MASK16;
	  var significand = bytes & SIGNIFICAND_MASK16;
	  if (exponent === EXP_MASK16) return significand === 0 ? (sign === 0 ? Infinity : -Infinity) : NaN;
	  if (exponent === 0) return significand * (sign === 0 ? MIN_SUBNORMAL16 : -MIN_SUBNORMAL16);
	  return pow$6(2, exponent - 15) * (sign === 0 ? 1 + significand * SIGNIFICAND_DENOM16 : -1 - significand * SIGNIFICAND_DENOM16);
	};

	// eslint-disable-next-line es/no-typed-arrays -- safe
	var getUint16 = uncurryThis$1a(DataView.prototype.getUint16);

	// `DataView.prototype.getFloat16` method
	// https://tc39.es/ecma262/#sec-dataview.prototype.getfloat16
	$$2T({ target: 'DataView', proto: true }, {
	  getFloat16: function getFloat16(byteOffset /* , littleEndian */) {
	    return unpackFloat16(getUint16(this, byteOffset, arguments.length > 1 ? arguments[1] : false));
	  }
	});

	var classof$f = classof$p;

	var $TypeError$l = TypeError;

	var aDataView$1 = function (argument) {
	  if (classof$f(argument) === 'DataView') return argument;
	  throw new $TypeError$l('Argument is not a DataView');
	};

	var log$7 = Math.log;
	var LN2$1 = Math.LN2;

	// `Math.log2` method
	// https://tc39.es/ecma262/#sec-math.log2
	// eslint-disable-next-line es/no-math-log2 -- safe
	var mathLog2 = Math.log2 || function log2(x) {
	  return log$7(x) / LN2$1;
	};

	var $$2S = _export;
	var uncurryThis$19 = functionUncurryThis;
	var aDataView = aDataView$1;
	var toIndex$2 = toIndex$4;
	// TODO: Replace with module dependency in `core-js@4`
	var log2$1 = mathLog2;
	var roundTiesToEven = mathRoundTiesToEven;

	var pow$5 = Math.pow;

	var MIN_INFINITY16 = 65520; // (2 - 2 ** -11) * 2 ** 15
	var MIN_NORMAL16 = 0.000061005353927612305; // (1 - 2 ** -11) * 2 ** -14
	var REC_MIN_SUBNORMAL16 = 16777216; // 2 ** 10 * 2 ** 14
	var REC_SIGNIFICAND_DENOM16 = 1024; // 2 ** 10;

	var packFloat16 = function (value) {
	  // eslint-disable-next-line no-self-compare -- NaN check
	  if (value !== value) return 0x7E00; // NaN
	  if (value === 0) return (1 / value === -Infinity) << 15; // +0 or -0

	  var neg = value < 0;
	  if (neg) value = -value;
	  if (value >= MIN_INFINITY16) return neg << 15 | 0x7C00; // Infinity
	  if (value < MIN_NORMAL16) return neg << 15 | roundTiesToEven(value * REC_MIN_SUBNORMAL16); // subnormal

	  // normal
	  var exponent = log2$1(value) | 0;
	  if (exponent === -15) {
	    // we round from a value between 2 ** -15 * (1 + 1022/1024) (the largest subnormal) and 2 ** -14 * (1 + 0/1024) (the smallest normal)
	    // to the latter (former impossible because of the subnormal check above)
	    return neg << 15 | REC_SIGNIFICAND_DENOM16;
	  }
	  var significand = roundTiesToEven((value * pow$5(2, -exponent) - 1) * REC_SIGNIFICAND_DENOM16);
	  if (significand === REC_SIGNIFICAND_DENOM16) {
	    // we round from a value between 2 ** n * (1 + 1023/1024) and 2 ** (n + 1) * (1 + 0/1024) to the latter
	    return neg << 15 | exponent + 16 << 10;
	  }
	  return neg << 15 | exponent + 15 << 10 | significand;
	};

	// eslint-disable-next-line es/no-typed-arrays -- safe
	var setUint16 = uncurryThis$19(DataView.prototype.setUint16);

	// `DataView.prototype.setFloat16` method
	// https://tc39.es/ecma262/#sec-dataview.prototype.setfloat16
	$$2S({ target: 'DataView', proto: true }, {
	  setFloat16: function setFloat16(byteOffset, value /* , littleEndian */) {
	    setUint16(
	      aDataView(this),
	      toIndex$2(byteOffset),
	      packFloat16(+value),
	      arguments.length > 2 ? arguments[2] : false
	    );
	  }
	});

	var globalThis$Z = globalThis_1;
	var uncurryThisAccessor$2 = functionUncurryThisAccessor;
	var classof$e = classofRaw$2;

	var ArrayBuffer$4 = globalThis$Z.ArrayBuffer;
	var TypeError$7 = globalThis$Z.TypeError;

	// Includes
	// - Perform ? RequireInternalSlot(O, [[ArrayBufferData]]).
	// - If IsSharedArrayBuffer(O) is true, throw a TypeError exception.
	var arrayBufferByteLength$2 = ArrayBuffer$4 && uncurryThisAccessor$2(ArrayBuffer$4.prototype, 'byteLength', 'get') || function (O) {
	  if (classof$e(O) !== 'ArrayBuffer') throw new TypeError$7('ArrayBuffer expected');
	  return O.byteLength;
	};

	var globalThis$Y = globalThis_1;
	var NATIVE_ARRAY_BUFFER = arrayBufferBasicDetection;
	var arrayBufferByteLength$1 = arrayBufferByteLength$2;

	var DataView$3 = globalThis$Y.DataView;

	var arrayBufferIsDetached = function (O) {
	  if (!NATIVE_ARRAY_BUFFER || arrayBufferByteLength$1(O) !== 0) return false;
	  try {
	    // eslint-disable-next-line no-new -- thrower
	    new DataView$3(O);
	    return false;
	  } catch (error) {
	    return true;
	  }
	};

	var DESCRIPTORS$y = descriptors;
	var defineBuiltInAccessor$f = defineBuiltInAccessor$l;
	var isDetached$1 = arrayBufferIsDetached;

	var ArrayBufferPrototype$2 = ArrayBuffer.prototype;

	// `ArrayBuffer.prototype.detached` getter
	// https://tc39.es/ecma262/#sec-get-arraybuffer.prototype.detached
	if (DESCRIPTORS$y && !('detached' in ArrayBufferPrototype$2)) {
	  defineBuiltInAccessor$f(ArrayBufferPrototype$2, 'detached', {
	    configurable: true,
	    get: function detached() {
	      return isDetached$1(this);
	    }
	  });
	}

	var isDetached = arrayBufferIsDetached;

	var $TypeError$k = TypeError;

	var arrayBufferNotDetached = function (it) {
	  if (isDetached(it)) throw new $TypeError$k('ArrayBuffer is detached');
	  return it;
	};

	var globalThis$X = globalThis_1;
	var IS_NODE$3 = environmentIsNode;

	var getBuiltInNodeModule$2 = function (name) {
	  if (IS_NODE$3) {
	    try {
	      return globalThis$X.process.getBuiltinModule(name);
	    } catch (error) { /* empty */ }
	    try {
	      // eslint-disable-next-line no-new-func -- safe
	      return Function('return require("' + name + '")')();
	    } catch (error) { /* empty */ }
	  }
	};

	var globalThis$W = globalThis_1;
	var fails$16 = fails$1z;
	var V8$1 = environmentV8Version;
	var ENVIRONMENT$2 = environment;

	var structuredClone$2 = globalThis$W.structuredClone;

	var structuredCloneProperTransfer = !!structuredClone$2 && !fails$16(function () {
	  // prevent V8 ArrayBufferDetaching protector cell invalidation and performance degradation
	  // https://github.com/zloirock/core-js/issues/679
	  if ((ENVIRONMENT$2 === 'DENO' && V8$1 > 92) || (ENVIRONMENT$2 === 'NODE' && V8$1 > 94) || (ENVIRONMENT$2 === 'BROWSER' && V8$1 > 97)) return false;
	  var buffer = new ArrayBuffer(8);
	  var clone = structuredClone$2(buffer, { transfer: [buffer] });
	  return buffer.byteLength !== 0 || clone.byteLength !== 8;
	});

	var globalThis$V = globalThis_1;
	var getBuiltInNodeModule$1 = getBuiltInNodeModule$2;
	var PROPER_STRUCTURED_CLONE_TRANSFER$2 = structuredCloneProperTransfer;

	var structuredClone$1 = globalThis$V.structuredClone;
	var $ArrayBuffer = globalThis$V.ArrayBuffer;
	var $MessageChannel = globalThis$V.MessageChannel;
	var detach = false;
	var WorkerThreads, channel$1, buffer, $detach;

	if (PROPER_STRUCTURED_CLONE_TRANSFER$2) {
	  detach = function (transferable) {
	    structuredClone$1(transferable, { transfer: [transferable] });
	  };
	} else if ($ArrayBuffer) try {
	  if (!$MessageChannel) {
	    WorkerThreads = getBuiltInNodeModule$1('worker_threads');
	    if (WorkerThreads) $MessageChannel = WorkerThreads.MessageChannel;
	  }

	  if ($MessageChannel) {
	    channel$1 = new $MessageChannel();
	    buffer = new $ArrayBuffer(2);

	    $detach = function (transferable) {
	      channel$1.port1.postMessage(null, [transferable]);
	    };

	    if (buffer.byteLength === 2) {
	      $detach(buffer);
	      if (buffer.byteLength === 0) detach = $detach;
	    }
	  }
	} catch (error) { /* empty */ }

	var detachTransferable$2 = detach;

	var globalThis$U = globalThis_1;
	var uncurryThis$18 = functionUncurryThis;
	var uncurryThisAccessor$1 = functionUncurryThisAccessor;
	var toIndex$1 = toIndex$4;
	var notDetached$4 = arrayBufferNotDetached;
	var arrayBufferByteLength = arrayBufferByteLength$2;
	var detachTransferable$1 = detachTransferable$2;
	var PROPER_STRUCTURED_CLONE_TRANSFER$1 = structuredCloneProperTransfer;

	var structuredClone = globalThis$U.structuredClone;
	var ArrayBuffer$3 = globalThis$U.ArrayBuffer;
	var DataView$2 = globalThis$U.DataView;
	var min$6 = Math.min;
	var ArrayBufferPrototype$1 = ArrayBuffer$3.prototype;
	var DataViewPrototype = DataView$2.prototype;
	var slice$3 = uncurryThis$18(ArrayBufferPrototype$1.slice);
	var isResizable = uncurryThisAccessor$1(ArrayBufferPrototype$1, 'resizable', 'get');
	var maxByteLength = uncurryThisAccessor$1(ArrayBufferPrototype$1, 'maxByteLength', 'get');
	var getInt8 = uncurryThis$18(DataViewPrototype.getInt8);
	var setInt8 = uncurryThis$18(DataViewPrototype.setInt8);

	var arrayBufferTransfer = (PROPER_STRUCTURED_CLONE_TRANSFER$1 || detachTransferable$1) && function (arrayBuffer, newLength, preserveResizability) {
	  var byteLength = arrayBufferByteLength(arrayBuffer);
	  var newByteLength = newLength === undefined ? byteLength : toIndex$1(newLength);
	  var fixedLength = !isResizable || !isResizable(arrayBuffer);
	  var newBuffer;
	  notDetached$4(arrayBuffer);
	  if (PROPER_STRUCTURED_CLONE_TRANSFER$1) {
	    arrayBuffer = structuredClone(arrayBuffer, { transfer: [arrayBuffer] });
	    if (byteLength === newByteLength && (preserveResizability || fixedLength)) return arrayBuffer;
	  }
	  if (byteLength >= newByteLength && (!preserveResizability || fixedLength)) {
	    newBuffer = slice$3(arrayBuffer, 0, newByteLength);
	  } else {
	    var options = preserveResizability && !fixedLength && maxByteLength ? { maxByteLength: maxByteLength(arrayBuffer) } : undefined;
	    newBuffer = new ArrayBuffer$3(newByteLength, options);
	    var a = new DataView$2(arrayBuffer);
	    var b = new DataView$2(newBuffer);
	    var copyLength = min$6(newByteLength, byteLength);
	    for (var i = 0; i < copyLength; i++) setInt8(b, i, getInt8(a, i));
	  }
	  if (!PROPER_STRUCTURED_CLONE_TRANSFER$1) detachTransferable$1(arrayBuffer);
	  return newBuffer;
	};

	var $$2R = _export;
	var $transfer$1 = arrayBufferTransfer;

	// `ArrayBuffer.prototype.transfer` method
	// https://tc39.es/ecma262/#sec-arraybuffer.prototype.transfer
	if ($transfer$1) $$2R({ target: 'ArrayBuffer', proto: true }, {
	  transfer: function transfer() {
	    return $transfer$1(this, arguments.length ? arguments[0] : undefined, true);
	  }
	});

	var $$2Q = _export;
	var $transfer = arrayBufferTransfer;

	// `ArrayBuffer.prototype.transferToFixedLength` method
	// https://tc39.es/ecma262/#sec-arraybuffer.prototype.transfertofixedlength
	if ($transfer) $$2Q({ target: 'ArrayBuffer', proto: true }, {
	  transferToFixedLength: function transferToFixedLength() {
	    return $transfer(this, arguments.length ? arguments[0] : undefined, false);
	  }
	});

	var $$2P = _export;
	var uncurryThis$17 = functionUncurryThis;
	var fails$15 = fails$1z;

	// IE8- non-standard case
	var FORCED$C = fails$15(function () {
	  // eslint-disable-next-line es/no-date-prototype-getyear-setyear -- detection
	  return new Date(16e11).getYear() !== 120;
	});

	var getFullYear = uncurryThis$17(Date.prototype.getFullYear);

	// `Date.prototype.getYear` method
	// https://tc39.es/ecma262/#sec-date.prototype.getyear
	$$2P({ target: 'Date', proto: true, forced: FORCED$C }, {
	  getYear: function getYear() {
	    return getFullYear(this) - 1900;
	  }
	});

	// TODO: Remove from `core-js@4`
	var $$2O = _export;
	var uncurryThis$16 = functionUncurryThis;

	var $Date = Date;
	var thisTimeValue$4 = uncurryThis$16($Date.prototype.getTime);

	// `Date.now` method
	// https://tc39.es/ecma262/#sec-date.now
	$$2O({ target: 'Date', stat: true }, {
	  now: function now() {
	    return thisTimeValue$4(new $Date());
	  }
	});

	var $$2N = _export;
	var uncurryThis$15 = functionUncurryThis;
	var toIntegerOrInfinity$b = toIntegerOrInfinity$m;

	var DatePrototype$3 = Date.prototype;
	var thisTimeValue$3 = uncurryThis$15(DatePrototype$3.getTime);
	var setFullYear = uncurryThis$15(DatePrototype$3.setFullYear);

	// `Date.prototype.setYear` method
	// https://tc39.es/ecma262/#sec-date.prototype.setyear
	$$2N({ target: 'Date', proto: true }, {
	  setYear: function setYear(year) {
	    // validate
	    thisTimeValue$3(this);
	    var yi = toIntegerOrInfinity$b(year);
	    var yyyy = yi >= 0 && yi <= 99 ? yi + 1900 : yi;
	    return setFullYear(this, yyyy);
	  }
	});

	var $$2M = _export;

	// `Date.prototype.toGMTString` method
	// https://tc39.es/ecma262/#sec-date.prototype.togmtstring
	$$2M({ target: 'Date', proto: true }, {
	  toGMTString: Date.prototype.toUTCString
	});

	var toIntegerOrInfinity$a = toIntegerOrInfinity$m;
	var toString$x = toString$D;
	var requireObjectCoercible$k = requireObjectCoercible$o;

	var $RangeError$a = RangeError;

	// `String.prototype.repeat` method implementation
	// https://tc39.es/ecma262/#sec-string.prototype.repeat
	var stringRepeat = function repeat(count) {
	  var str = toString$x(requireObjectCoercible$k(this));
	  var result = '';
	  var n = toIntegerOrInfinity$a(count);
	  if (n < 0 || n === Infinity) throw new $RangeError$a('Wrong number of repetitions');
	  for (;n > 0; (n >>>= 1) && (str += str)) if (n & 1) result += str;
	  return result;
	};

	var uncurryThis$14 = functionUncurryThis;
	var toLength$8 = toLength$d;
	var toString$w = toString$D;
	var $repeat$2 = stringRepeat;
	var requireObjectCoercible$j = requireObjectCoercible$o;

	var repeat$3 = uncurryThis$14($repeat$2);
	var stringSlice$g = uncurryThis$14(''.slice);
	var ceil = Math.ceil;

	// `String.prototype.{ padStart, padEnd }` methods implementation
	var createMethod$4 = function (IS_END) {
	  return function ($this, maxLength, fillString) {
	    var S = toString$w(requireObjectCoercible$j($this));
	    var intMaxLength = toLength$8(maxLength);
	    var stringLength = S.length;
	    var fillStr = fillString === undefined ? ' ' : toString$w(fillString);
	    var fillLen, stringFiller;
	    if (intMaxLength <= stringLength || fillStr === '') return S;
	    fillLen = intMaxLength - stringLength;
	    stringFiller = repeat$3(fillStr, ceil(fillLen / fillStr.length));
	    if (stringFiller.length > fillLen) stringFiller = stringSlice$g(stringFiller, 0, fillLen);
	    return IS_END ? S + stringFiller : stringFiller + S;
	  };
	};

	var stringPad = {
	  // `String.prototype.padStart` method
	  // https://tc39.es/ecma262/#sec-string.prototype.padstart
	  start: createMethod$4(false),
	  // `String.prototype.padEnd` method
	  // https://tc39.es/ecma262/#sec-string.prototype.padend
	  end: createMethod$4(true)
	};

	var uncurryThis$13 = functionUncurryThis;
	var fails$14 = fails$1z;
	var padStart$1 = stringPad.start;

	var $RangeError$9 = RangeError;
	var $isFinite$1 = isFinite;
	var abs$7 = Math.abs;
	var DatePrototype$2 = Date.prototype;
	var nativeDateToISOString = DatePrototype$2.toISOString;
	var thisTimeValue$2 = uncurryThis$13(DatePrototype$2.getTime);
	var getUTCDate = uncurryThis$13(DatePrototype$2.getUTCDate);
	var getUTCFullYear = uncurryThis$13(DatePrototype$2.getUTCFullYear);
	var getUTCHours = uncurryThis$13(DatePrototype$2.getUTCHours);
	var getUTCMilliseconds = uncurryThis$13(DatePrototype$2.getUTCMilliseconds);
	var getUTCMinutes = uncurryThis$13(DatePrototype$2.getUTCMinutes);
	var getUTCMonth = uncurryThis$13(DatePrototype$2.getUTCMonth);
	var getUTCSeconds = uncurryThis$13(DatePrototype$2.getUTCSeconds);

	// `Date.prototype.toISOString` method implementation
	// https://tc39.es/ecma262/#sec-date.prototype.toisostring
	// PhantomJS / old WebKit fails here:
	var dateToIsoString = (fails$14(function () {
	  return nativeDateToISOString.call(new Date(-5e13 - 1)) !== '0385-07-25T07:06:39.999Z';
	}) || !fails$14(function () {
	  nativeDateToISOString.call(new Date(NaN));
	})) ? function toISOString() {
	  if (!$isFinite$1(thisTimeValue$2(this))) throw new $RangeError$9('Invalid time value');
	  var date = this;
	  var year = getUTCFullYear(date);
	  var milliseconds = getUTCMilliseconds(date);
	  var sign = year < 0 ? '-' : year > 9999 ? '+' : '';
	  return sign + padStart$1(abs$7(year), sign ? 6 : 4, 0) +
	    '-' + padStart$1(getUTCMonth(date) + 1, 2, 0) +
	    '-' + padStart$1(getUTCDate(date), 2, 0) +
	    'T' + padStart$1(getUTCHours(date), 2, 0) +
	    ':' + padStart$1(getUTCMinutes(date), 2, 0) +
	    ':' + padStart$1(getUTCSeconds(date), 2, 0) +
	    '.' + padStart$1(milliseconds, 3, 0) +
	    'Z';
	} : nativeDateToISOString;

	var $$2L = _export;
	var toISOString = dateToIsoString;

	// `Date.prototype.toISOString` method
	// https://tc39.es/ecma262/#sec-date.prototype.toisostring
	// PhantomJS / old WebKit has a broken implementations
	$$2L({ target: 'Date', proto: true, forced: Date.prototype.toISOString !== toISOString }, {
	  toISOString: toISOString
	});

	var $$2K = _export;
	var fails$13 = fails$1z;
	var toObject$d = toObject$v;
	var toPrimitive$2 = toPrimitive$4;

	var FORCED$B = fails$13(function () {
	  return new Date(NaN).toJSON() !== null
	    || Date.prototype.toJSON.call({ toISOString: function () { return 1; } }) !== 1;
	});

	// `Date.prototype.toJSON` method
	// https://tc39.es/ecma262/#sec-date.prototype.tojson
	$$2K({ target: 'Date', proto: true, arity: 1, forced: FORCED$B }, {
	  // eslint-disable-next-line no-unused-vars -- required for `.length`
	  toJSON: function toJSON(key) {
	    var O = toObject$d(this);
	    var pv = toPrimitive$2(O, 'number');
	    return typeof pv == 'number' && !isFinite(pv) ? null : O.toISOString();
	  }
	});

	var anObject$I = anObject$U;
	var ordinaryToPrimitive = ordinaryToPrimitive$2;

	var $TypeError$j = TypeError;

	// `Date.prototype[@@toPrimitive](hint)` method implementation
	// https://tc39.es/ecma262/#sec-date.prototype-@@toprimitive
	var dateToPrimitive$1 = function (hint) {
	  anObject$I(this);
	  if (hint === 'string' || hint === 'default') hint = 'string';
	  else if (hint !== 'number') throw new $TypeError$j('Incorrect hint');
	  return ordinaryToPrimitive(this, hint);
	};

	var hasOwn$k = hasOwnProperty_1;
	var defineBuiltIn$k = defineBuiltIn$t;
	var dateToPrimitive = dateToPrimitive$1;
	var wellKnownSymbol$o = wellKnownSymbol$K;

	var TO_PRIMITIVE = wellKnownSymbol$o('toPrimitive');
	var DatePrototype$1 = Date.prototype;

	// `Date.prototype[@@toPrimitive]` method
	// https://tc39.es/ecma262/#sec-date.prototype-@@toprimitive
	if (!hasOwn$k(DatePrototype$1, TO_PRIMITIVE)) {
	  defineBuiltIn$k(DatePrototype$1, TO_PRIMITIVE, dateToPrimitive);
	}

	// TODO: Remove from `core-js@4`
	var uncurryThis$12 = functionUncurryThis;
	var defineBuiltIn$j = defineBuiltIn$t;

	var DatePrototype = Date.prototype;
	var INVALID_DATE = 'Invalid Date';
	var TO_STRING$1 = 'toString';
	var nativeDateToString = uncurryThis$12(DatePrototype[TO_STRING$1]);
	var thisTimeValue$1 = uncurryThis$12(DatePrototype.getTime);

	// `Date.prototype.toString` method
	// https://tc39.es/ecma262/#sec-date.prototype.tostring
	if (String(new Date(NaN)) !== INVALID_DATE) {
	  defineBuiltIn$j(DatePrototype, TO_STRING$1, function toString() {
	    var value = thisTimeValue$1(this);
	    // eslint-disable-next-line no-self-compare -- NaN check
	    return value === value ? nativeDateToString(this) : INVALID_DATE;
	  });
	}

	var getBuiltIn$o = getBuiltIn$B;
	var call$M = functionCall;
	var uncurryThis$11 = functionUncurryThis;
	var bind$a = functionBindContext;
	var anObject$H = anObject$U;
	var aCallable$s = aCallable$B;
	var isNullOrUndefined$5 = isNullOrUndefined$9;
	var getMethod$d = getMethod$h;
	var wellKnownSymbol$n = wellKnownSymbol$K;

	var ASYNC_DISPOSE$2 = wellKnownSymbol$n('asyncDispose');
	var DISPOSE$2 = wellKnownSymbol$n('dispose');

	var push$e = uncurryThis$11([].push);

	// `GetDisposeMethod` abstract operation
	// https://tc39.es/proposal-explicit-resource-management/#sec-getdisposemethod
	var getDisposeMethod = function (V, hint) {
	  if (hint === 'async-dispose') {
	    var method = getMethod$d(V, ASYNC_DISPOSE$2);
	    if (method !== undefined) return method;
	    method = getMethod$d(V, DISPOSE$2);
	    if (method === undefined) return method;
	    return function () {
	      var O = this;
	      var Promise = getBuiltIn$o('Promise');
	      return new Promise(function (resolve) {
	        call$M(method, O);
	        resolve(undefined);
	      });
	    };
	  } return getMethod$d(V, DISPOSE$2);
	};

	// `CreateDisposableResource` abstract operation
	// https://tc39.es/proposal-explicit-resource-management/#sec-createdisposableresource
	var createDisposableResource = function (V, hint, method) {
	  if (arguments.length < 3 && !isNullOrUndefined$5(V)) {
	    method = aCallable$s(getDisposeMethod(anObject$H(V), hint));
	  }

	  return method === undefined ? function () {
	    return undefined;
	  } : bind$a(method, V);
	};

	// `AddDisposableResource` abstract operation
	// https://tc39.es/proposal-explicit-resource-management/#sec-adddisposableresource
	var addDisposableResource$2 = function (disposable, V, hint, method) {
	  var resource;
	  if (arguments.length < 4) {
	    // When `V`` is either `null` or `undefined` and hint is `async-dispose`,
	    // we record that the resource was evaluated to ensure we will still perform an `Await` when resources are later disposed.
	    if (isNullOrUndefined$5(V) && hint === 'sync-dispose') return;
	    resource = createDisposableResource(V, hint);
	  } else {
	    resource = createDisposableResource(undefined, hint, method);
	  }

	  push$e(disposable.stack, resource);
	};

	// https://github.com/tc39/proposal-explicit-resource-management
	var $$2J = _export;
	var DESCRIPTORS$x = descriptors;
	var getBuiltIn$n = getBuiltIn$B;
	var aCallable$r = aCallable$B;
	var anInstance$b = anInstance$d;
	var defineBuiltIn$i = defineBuiltIn$t;
	var defineBuiltIns$7 = defineBuiltIns$9;
	var defineBuiltInAccessor$e = defineBuiltInAccessor$l;
	var wellKnownSymbol$m = wellKnownSymbol$K;
	var InternalStateModule$c = internalState;
	var addDisposableResource$1 = addDisposableResource$2;

	var SuppressedError$1 = getBuiltIn$n('SuppressedError');
	var $ReferenceError$1 = ReferenceError;

	var DISPOSE$1 = wellKnownSymbol$m('dispose');
	var TO_STRING_TAG$3 = wellKnownSymbol$m('toStringTag');

	var DISPOSABLE_STACK = 'DisposableStack';
	var setInternalState$c = InternalStateModule$c.set;
	var getDisposableStackInternalState = InternalStateModule$c.getterFor(DISPOSABLE_STACK);

	var HINT$1 = 'sync-dispose';
	var DISPOSED$1 = 'disposed';
	var PENDING$2 = 'pending';

	var getPendingDisposableStackInternalState = function (stack) {
	  var internalState = getDisposableStackInternalState(stack);
	  if (internalState.state === DISPOSED$1) throw new $ReferenceError$1(DISPOSABLE_STACK + ' already disposed');
	  return internalState;
	};

	var $DisposableStack = function DisposableStack() {
	  setInternalState$c(anInstance$b(this, DisposableStackPrototype), {
	    type: DISPOSABLE_STACK,
	    state: PENDING$2,
	    stack: []
	  });

	  if (!DESCRIPTORS$x) this.disposed = false;
	};

	var DisposableStackPrototype = $DisposableStack.prototype;

	defineBuiltIns$7(DisposableStackPrototype, {
	  dispose: function dispose() {
	    var internalState = getDisposableStackInternalState(this);
	    if (internalState.state === DISPOSED$1) return;
	    internalState.state = DISPOSED$1;
	    if (!DESCRIPTORS$x) this.disposed = true;
	    var stack = internalState.stack;
	    var i = stack.length;
	    var thrown = false;
	    var suppressed;
	    while (i) {
	      var disposeMethod = stack[--i];
	      stack[i] = null;
	      try {
	        disposeMethod();
	      } catch (errorResult) {
	        if (thrown) {
	          suppressed = new SuppressedError$1(errorResult, suppressed);
	        } else {
	          thrown = true;
	          suppressed = errorResult;
	        }
	      }
	    }
	    internalState.stack = null;
	    if (thrown) throw suppressed;
	  },
	  use: function use(value) {
	    addDisposableResource$1(getPendingDisposableStackInternalState(this), value, HINT$1);
	    return value;
	  },
	  adopt: function adopt(value, onDispose) {
	    var internalState = getPendingDisposableStackInternalState(this);
	    aCallable$r(onDispose);
	    addDisposableResource$1(internalState, undefined, HINT$1, function () {
	      onDispose(value);
	    });
	    return value;
	  },
	  defer: function defer(onDispose) {
	    var internalState = getPendingDisposableStackInternalState(this);
	    aCallable$r(onDispose);
	    addDisposableResource$1(internalState, undefined, HINT$1, onDispose);
	  },
	  move: function move() {
	    var internalState = getPendingDisposableStackInternalState(this);
	    var newDisposableStack = new $DisposableStack();
	    getDisposableStackInternalState(newDisposableStack).stack = internalState.stack;
	    internalState.stack = [];
	    internalState.state = DISPOSED$1;
	    if (!DESCRIPTORS$x) this.disposed = true;
	    return newDisposableStack;
	  }
	});

	if (DESCRIPTORS$x) defineBuiltInAccessor$e(DisposableStackPrototype, 'disposed', {
	  configurable: true,
	  get: function disposed() {
	    return getDisposableStackInternalState(this).state === DISPOSED$1;
	  }
	});

	defineBuiltIn$i(DisposableStackPrototype, DISPOSE$1, DisposableStackPrototype.dispose, { name: 'dispose' });
	defineBuiltIn$i(DisposableStackPrototype, TO_STRING_TAG$3, DISPOSABLE_STACK, { nonWritable: true });

	$$2J({ global: true, constructor: true }, {
	  DisposableStack: $DisposableStack
	});

	var $$2I = _export;
	var uncurryThis$10 = functionUncurryThis;
	var toString$v = toString$D;

	var charAt$g = uncurryThis$10(''.charAt);
	var charCodeAt$7 = uncurryThis$10(''.charCodeAt);
	var exec$a = uncurryThis$10(/./.exec);
	var numberToString$3 = uncurryThis$10(1.1.toString);
	var toUpperCase = uncurryThis$10(''.toUpperCase);

	var raw = /[\w*+\-./@]/;

	var hex$1 = function (code, length) {
	  var result = numberToString$3(code, 16);
	  while (result.length < length) result = '0' + result;
	  return result;
	};

	// `escape` method
	// https://tc39.es/ecma262/#sec-escape-string
	$$2I({ global: true }, {
	  escape: function escape(string) {
	    var str = toString$v(string);
	    var result = '';
	    var length = str.length;
	    var index = 0;
	    var chr, code;
	    while (index < length) {
	      chr = charAt$g(str, index++);
	      if (exec$a(raw, chr)) {
	        result += chr;
	      } else {
	        code = charCodeAt$7(chr, 0);
	        if (code < 256) {
	          result += '%' + hex$1(code, 2);
	        } else {
	          result += '%u' + toUpperCase(hex$1(code, 4));
	        }
	      }
	    } return result;
	  }
	});

	var uncurryThis$$ = functionUncurryThis;
	var aCallable$q = aCallable$B;
	var isObject$u = isObject$K;
	var hasOwn$j = hasOwnProperty_1;
	var arraySlice$5 = arraySlice$a;
	var NATIVE_BIND = functionBindNative;

	var $Function = Function;
	var concat$2 = uncurryThis$$([].concat);
	var join$8 = uncurryThis$$([].join);
	var factories = {};

	var construct = function (C, argsLength, args) {
	  if (!hasOwn$j(factories, argsLength)) {
	    var list = [];
	    var i = 0;
	    for (; i < argsLength; i++) list[i] = 'a[' + i + ']';
	    factories[argsLength] = $Function('C,a', 'return new C(' + join$8(list, ',') + ')');
	  } return factories[argsLength](C, args);
	};

	// `Function.prototype.bind` method implementation
	// https://tc39.es/ecma262/#sec-function.prototype.bind
	// eslint-disable-next-line es/no-function-prototype-bind -- detection
	var functionBind = NATIVE_BIND ? $Function.bind : function bind(that /* , ...args */) {
	  var F = aCallable$q(this);
	  var Prototype = F.prototype;
	  var partArgs = arraySlice$5(arguments, 1);
	  var boundFunction = function bound(/* args... */) {
	    var args = concat$2(partArgs, arraySlice$5(arguments));
	    return this instanceof boundFunction ? construct(F, args.length, args) : F.apply(that, args);
	  };
	  if (isObject$u(Prototype)) boundFunction.prototype = Prototype;
	  return boundFunction;
	};

	// TODO: Remove from `core-js@4`
	var $$2H = _export;
	var bind$9 = functionBind;

	// `Function.prototype.bind` method
	// https://tc39.es/ecma262/#sec-function.prototype.bind
	// eslint-disable-next-line es/no-function-prototype-bind -- detection
	$$2H({ target: 'Function', proto: true, forced: Function.bind !== bind$9 }, {
	  bind: bind$9
	});

	var isCallable$f = isCallable$A;
	var isObject$t = isObject$K;
	var definePropertyModule$5 = objectDefineProperty;
	var isPrototypeOf$5 = objectIsPrototypeOf;
	var wellKnownSymbol$l = wellKnownSymbol$K;
	var makeBuiltIn = makeBuiltInExports;

	var HAS_INSTANCE = wellKnownSymbol$l('hasInstance');
	var FunctionPrototype$1 = Function.prototype;

	// `Function.prototype[@@hasInstance]` method
	// https://tc39.es/ecma262/#sec-function.prototype-@@hasinstance
	if (!(HAS_INSTANCE in FunctionPrototype$1)) {
	  definePropertyModule$5.f(FunctionPrototype$1, HAS_INSTANCE, { value: makeBuiltIn(function (O) {
	    if (!isCallable$f(this) || !isObject$t(O)) return false;
	    var P = this.prototype;
	    return isObject$t(P) ? isPrototypeOf$5(P, O) : O instanceof this;
	  }, HAS_INSTANCE) });
	}

	var DESCRIPTORS$w = descriptors;
	var FUNCTION_NAME_EXISTS = functionName.EXISTS;
	var uncurryThis$_ = functionUncurryThis;
	var defineBuiltInAccessor$d = defineBuiltInAccessor$l;

	var FunctionPrototype = Function.prototype;
	var functionToString = uncurryThis$_(FunctionPrototype.toString);
	var nameRE = /function\b(?:\s|\/\*[\S\s]*?\*\/|\/\/[^\n\r]*[\n\r]+)*([^\s(/]*)/;
	var regExpExec$5 = uncurryThis$_(nameRE.exec);
	var NAME = 'name';

	// Function instances `.name` property
	// https://tc39.es/ecma262/#sec-function-instances-name
	if (DESCRIPTORS$w && !FUNCTION_NAME_EXISTS) {
	  defineBuiltInAccessor$d(FunctionPrototype, NAME, {
	    configurable: true,
	    get: function () {
	      try {
	        return regExpExec$5(nameRE, functionToString(this))[1];
	      } catch (error) {
	        return '';
	      }
	    }
	  });
	}

	var $$2G = _export;
	var globalThis$T = globalThis_1;

	// `globalThis` object
	// https://tc39.es/ecma262/#sec-globalthis
	$$2G({ global: true, forced: globalThis$T.globalThis !== globalThis$T }, {
	  globalThis: globalThis$T
	});

	var $$2F = _export;
	var globalThis$S = globalThis_1;
	var anInstance$a = anInstance$d;
	var anObject$G = anObject$U;
	var isCallable$e = isCallable$A;
	var getPrototypeOf$6 = objectGetPrototypeOf$2;
	var defineBuiltInAccessor$c = defineBuiltInAccessor$l;
	var createProperty$3 = createProperty$9;
	var fails$12 = fails$1z;
	var hasOwn$i = hasOwnProperty_1;
	var wellKnownSymbol$k = wellKnownSymbol$K;
	var IteratorPrototype$3 = iteratorsCore.IteratorPrototype;
	var DESCRIPTORS$v = descriptors;

	var CONSTRUCTOR = 'constructor';
	var ITERATOR$6 = 'Iterator';
	var TO_STRING_TAG$2 = wellKnownSymbol$k('toStringTag');

	var $TypeError$i = TypeError;
	var NativeIterator = globalThis$S[ITERATOR$6];

	// FF56- have non-standard global helper `Iterator`
	var FORCED$A = !isCallable$e(NativeIterator)
	  || NativeIterator.prototype !== IteratorPrototype$3
	  // FF44- non-standard `Iterator` passes previous tests
	  || !fails$12(function () { NativeIterator({}); });

	var IteratorConstructor = function Iterator() {
	  anInstance$a(this, IteratorPrototype$3);
	  if (getPrototypeOf$6(this) === IteratorPrototype$3) throw new $TypeError$i('Abstract class Iterator not directly constructable');
	};

	var defineIteratorPrototypeAccessor = function (key, value) {
	  if (DESCRIPTORS$v) {
	    defineBuiltInAccessor$c(IteratorPrototype$3, key, {
	      configurable: true,
	      get: function () {
	        return value;
	      },
	      set: function (replacement) {
	        anObject$G(this);
	        if (this === IteratorPrototype$3) throw new $TypeError$i("You can't redefine this property");
	        if (hasOwn$i(this, key)) this[key] = replacement;
	        else createProperty$3(this, key, replacement);
	      }
	    });
	  } else IteratorPrototype$3[key] = value;
	};

	if (!hasOwn$i(IteratorPrototype$3, TO_STRING_TAG$2)) defineIteratorPrototypeAccessor(TO_STRING_TAG$2, ITERATOR$6);

	if (FORCED$A || !hasOwn$i(IteratorPrototype$3, CONSTRUCTOR) || IteratorPrototype$3[CONSTRUCTOR] === Object) {
	  defineIteratorPrototypeAccessor(CONSTRUCTOR, IteratorConstructor);
	}

	IteratorConstructor.prototype = IteratorPrototype$3;

	// `Iterator` constructor
	// https://tc39.es/ecma262/#sec-iterator
	$$2F({ global: true, constructor: true, forced: FORCED$A }, {
	  Iterator: IteratorConstructor
	});

	// https://github.com/tc39/proposal-explicit-resource-management
	var call$L = functionCall;
	var defineBuiltIn$h = defineBuiltIn$t;
	var getMethod$c = getMethod$h;
	var hasOwn$h = hasOwnProperty_1;
	var wellKnownSymbol$j = wellKnownSymbol$K;
	var IteratorPrototype$2 = iteratorsCore.IteratorPrototype;

	var DISPOSE = wellKnownSymbol$j('dispose');

	if (!hasOwn$h(IteratorPrototype$2, DISPOSE)) {
	  defineBuiltIn$h(IteratorPrototype$2, DISPOSE, function () {
	    var $return = getMethod$c(this, 'return');
	    if ($return) call$L($return, this);
	  });
	}

	// `GetIteratorDirect(obj)` abstract operation
	// https://tc39.es/ecma262/#sec-getiteratordirect
	var getIteratorDirect$g = function (obj) {
	  return {
	    iterator: obj,
	    next: obj.next,
	    done: false
	  };
	};

	var $RangeError$8 = RangeError;

	var notANan = function (it) {
	  // eslint-disable-next-line no-self-compare -- NaN check
	  if (it === it) return it;
	  throw new $RangeError$8('NaN is not allowed');
	};

	var toIntegerOrInfinity$9 = toIntegerOrInfinity$m;

	var $RangeError$7 = RangeError;

	var toPositiveInteger$3 = function (it) {
	  var result = toIntegerOrInfinity$9(it);
	  if (result < 0) throw new $RangeError$7("The argument can't be less than 0");
	  return result;
	};

	var iteratorClose$e = iteratorClose$h;

	var iteratorCloseAll$1 = function (iters, kind, value) {
	  for (var i = iters.length - 1; i >= 0; i--) {
	    if (iters[i] === undefined) continue;
	    try {
	      value = iteratorClose$e(iters[i].iterator, kind, value);
	    } catch (error) {
	      kind = 'throw';
	      value = error;
	    }
	  }
	  if (kind === 'throw') throw value;
	  return value;
	};

	var call$K = functionCall;
	var create$a = objectCreate;
	var createNonEnumerableProperty$6 = createNonEnumerableProperty$h;
	var defineBuiltIns$6 = defineBuiltIns$9;
	var wellKnownSymbol$i = wellKnownSymbol$K;
	var InternalStateModule$b = internalState;
	var getMethod$b = getMethod$h;
	var IteratorPrototype$1 = iteratorsCore.IteratorPrototype;
	var createIterResultObject$5 = createIterResultObject$7;
	var iteratorClose$d = iteratorClose$h;
	var iteratorCloseAll = iteratorCloseAll$1;

	var TO_STRING_TAG$1 = wellKnownSymbol$i('toStringTag');
	var ITERATOR_HELPER = 'IteratorHelper';
	var WRAP_FOR_VALID_ITERATOR = 'WrapForValidIterator';
	var NORMAL = 'normal';
	var THROW = 'throw';
	var setInternalState$b = InternalStateModule$b.set;

	var createIteratorProxyPrototype = function (IS_ITERATOR) {
	  var getInternalState = InternalStateModule$b.getterFor(IS_ITERATOR ? WRAP_FOR_VALID_ITERATOR : ITERATOR_HELPER);

	  return defineBuiltIns$6(create$a(IteratorPrototype$1), {
	    next: function next() {
	      var state = getInternalState(this);
	      // for simplification:
	      //   for `%WrapForValidIteratorPrototype%.next` or with `state.returnHandlerResult` our `nextHandler` returns `IterResultObject`
	      //   for `%IteratorHelperPrototype%.next` - just a value
	      if (IS_ITERATOR) return state.nextHandler();
	      if (state.done) return createIterResultObject$5(undefined, true);
	      try {
	        var result = state.nextHandler();
	        return state.returnHandlerResult ? result : createIterResultObject$5(result, state.done);
	      } catch (error) {
	        state.done = true;
	        throw error;
	      }
	    },
	    'return': function () {
	      var state = getInternalState(this);
	      var iterator = state.iterator;
	      state.done = true;
	      if (IS_ITERATOR) {
	        var returnMethod = getMethod$b(iterator, 'return');
	        return returnMethod ? call$K(returnMethod, iterator) : createIterResultObject$5(undefined, true);
	      }
	      if (state.inner) try {
	        iteratorClose$d(state.inner.iterator, NORMAL);
	      } catch (error) {
	        return iteratorClose$d(iterator, THROW, error);
	      }
	      if (state.openIters) try {
	        iteratorCloseAll(state.openIters, NORMAL);
	      } catch (error) {
	        return iteratorClose$d(iterator, THROW, error);
	      }
	      if (iterator) iteratorClose$d(iterator, NORMAL);
	      return createIterResultObject$5(undefined, true);
	    }
	  });
	};

	var WrapForValidIteratorPrototype = createIteratorProxyPrototype(true);
	var IteratorHelperPrototype = createIteratorProxyPrototype(false);

	createNonEnumerableProperty$6(IteratorHelperPrototype, TO_STRING_TAG$1, 'Iterator Helper');

	var iteratorCreateProxy = function (nextHandler, IS_ITERATOR, RETURN_HANDLER_RESULT) {
	  var IteratorProxy = function Iterator(record, state) {
	    if (state) {
	      state.iterator = record.iterator;
	      state.next = record.next;
	    } else state = record;
	    state.type = IS_ITERATOR ? WRAP_FOR_VALID_ITERATOR : ITERATOR_HELPER;
	    state.returnHandlerResult = !!RETURN_HANDLER_RESULT;
	    state.nextHandler = nextHandler;
	    state.counter = 0;
	    state.done = false;
	    setInternalState$b(this, state);
	  };

	  IteratorProxy.prototype = IS_ITERATOR ? WrapForValidIteratorPrototype : IteratorHelperPrototype;

	  return IteratorProxy;
	};

	// Should throw an error on invalid iterator
	// https://issues.chromium.org/issues/336839115
	var iteratorHelperThrowsOnInvalidIterator$4 = function (methodName, argument) {
	  // eslint-disable-next-line es/no-iterator -- required for testing
	  var method = typeof Iterator == 'function' && Iterator.prototype[methodName];
	  if (method) try {
	    method.call({ next: null }, argument).next();
	  } catch (error) {
	    return true;
	  }
	};

	var globalThis$R = globalThis_1;

	// https://github.com/tc39/ecma262/pull/3467
	var iteratorHelperWithoutClosingOnEarlyError$a = function (METHOD_NAME, ExpectedError) {
	  var Iterator = globalThis$R.Iterator;
	  var IteratorPrototype = Iterator && Iterator.prototype;
	  var method = IteratorPrototype && IteratorPrototype[METHOD_NAME];

	  var CLOSED = false;

	  if (method) try {
	    method.call({
	      next: function () { return { done: true }; },
	      'return': function () { CLOSED = true; }
	    }, -1);
	  } catch (error) {
	    // https://bugs.webkit.org/show_bug.cgi?id=291195
	    if (!(error instanceof ExpectedError)) CLOSED = false;
	  }

	  if (!CLOSED) return method;
	};

	var $$2E = _export;
	var call$J = functionCall;
	var anObject$F = anObject$U;
	var getIteratorDirect$f = getIteratorDirect$g;
	var notANaN$1 = notANan;
	var toPositiveInteger$2 = toPositiveInteger$3;
	var iteratorClose$c = iteratorClose$h;
	var createIteratorProxy$5 = iteratorCreateProxy;
	var iteratorHelperThrowsOnInvalidIterator$3 = iteratorHelperThrowsOnInvalidIterator$4;
	var iteratorHelperWithoutClosingOnEarlyError$9 = iteratorHelperWithoutClosingOnEarlyError$a;

	var DROP_WITHOUT_THROWING_ON_INVALID_ITERATOR = !iteratorHelperThrowsOnInvalidIterator$3('drop', 0);
	var dropWithoutClosingOnEarlyError = !DROP_WITHOUT_THROWING_ON_INVALID_ITERATOR
	  && iteratorHelperWithoutClosingOnEarlyError$9('drop', RangeError);

	var FORCED$z = DROP_WITHOUT_THROWING_ON_INVALID_ITERATOR || dropWithoutClosingOnEarlyError;

	var IteratorProxy$5 = createIteratorProxy$5(function () {
	  var iterator = this.iterator;
	  var next = this.next;
	  var result, done;
	  while (this.remaining) {
	    this.remaining--;
	    result = anObject$F(call$J(next, iterator));
	    done = this.done = !!result.done;
	    if (done) return;
	  }
	  result = anObject$F(call$J(next, iterator));
	  done = this.done = !!result.done;
	  if (!done) return result.value;
	});

	// `Iterator.prototype.drop` method
	// https://tc39.es/ecma262/#sec-iterator.prototype.drop
	$$2E({ target: 'Iterator', proto: true, real: true, forced: FORCED$z }, {
	  drop: function drop(limit) {
	    anObject$F(this);
	    var remaining;
	    try {
	      remaining = toPositiveInteger$2(notANaN$1(+limit));
	    } catch (error) {
	      iteratorClose$c(this, 'throw', error);
	    }

	    if (dropWithoutClosingOnEarlyError) return call$J(dropWithoutClosingOnEarlyError, this, remaining);

	    return new IteratorProxy$5(getIteratorDirect$f(this), {
	      remaining: remaining
	    });
	  }
	});

	var $$2D = _export;
	var call$I = functionCall;
	var iterate$j = iterate$l;
	var aCallable$p = aCallable$B;
	var anObject$E = anObject$U;
	var getIteratorDirect$e = getIteratorDirect$g;
	var iteratorClose$b = iteratorClose$h;
	var iteratorHelperWithoutClosingOnEarlyError$8 = iteratorHelperWithoutClosingOnEarlyError$a;

	var everyWithoutClosingOnEarlyError = iteratorHelperWithoutClosingOnEarlyError$8('every', TypeError);

	// `Iterator.prototype.every` method
	// https://tc39.es/ecma262/#sec-iterator.prototype.every
	$$2D({ target: 'Iterator', proto: true, real: true, forced: everyWithoutClosingOnEarlyError }, {
	  every: function every(predicate) {
	    anObject$E(this);
	    try {
	      aCallable$p(predicate);
	    } catch (error) {
	      iteratorClose$b(this, 'throw', error);
	    }

	    if (everyWithoutClosingOnEarlyError) return call$I(everyWithoutClosingOnEarlyError, this, predicate);

	    var record = getIteratorDirect$e(this);
	    var counter = 0;
	    return !iterate$j(record, function (value, stop) {
	      if (!predicate(value, counter++)) return stop();
	    }, { IS_RECORD: true, INTERRUPTED: true }).stopped;
	  }
	});

	var $$2C = _export;
	var call$H = functionCall;
	var aCallable$o = aCallable$B;
	var anObject$D = anObject$U;
	var getIteratorDirect$d = getIteratorDirect$g;
	var createIteratorProxy$4 = iteratorCreateProxy;
	var callWithSafeIterationClosing$1 = callWithSafeIterationClosing$3;
	var iteratorClose$a = iteratorClose$h;
	var iteratorHelperThrowsOnInvalidIterator$2 = iteratorHelperThrowsOnInvalidIterator$4;
	var iteratorHelperWithoutClosingOnEarlyError$7 = iteratorHelperWithoutClosingOnEarlyError$a;

	var FILTER_WITHOUT_THROWING_ON_INVALID_ITERATOR = !iteratorHelperThrowsOnInvalidIterator$2('filter', function () { /* empty */ });
	var filterWithoutClosingOnEarlyError = !FILTER_WITHOUT_THROWING_ON_INVALID_ITERATOR
	  && iteratorHelperWithoutClosingOnEarlyError$7('filter', TypeError);

	var FORCED$y = FILTER_WITHOUT_THROWING_ON_INVALID_ITERATOR || filterWithoutClosingOnEarlyError;

	var IteratorProxy$4 = createIteratorProxy$4(function () {
	  var iterator = this.iterator;
	  var predicate = this.predicate;
	  var next = this.next;
	  var result, done, value;
	  while (true) {
	    result = anObject$D(call$H(next, iterator));
	    done = this.done = !!result.done;
	    if (done) return;
	    value = result.value;
	    if (callWithSafeIterationClosing$1(iterator, predicate, [value, this.counter++], true)) return value;
	  }
	});

	// `Iterator.prototype.filter` method
	// https://tc39.es/ecma262/#sec-iterator.prototype.filter
	$$2C({ target: 'Iterator', proto: true, real: true, forced: FORCED$y }, {
	  filter: function filter(predicate) {
	    anObject$D(this);
	    try {
	      aCallable$o(predicate);
	    } catch (error) {
	      iteratorClose$a(this, 'throw', error);
	    }

	    if (filterWithoutClosingOnEarlyError) return call$H(filterWithoutClosingOnEarlyError, this, predicate);

	    return new IteratorProxy$4(getIteratorDirect$d(this), {
	      predicate: predicate
	    });
	  }
	});

	var $$2B = _export;
	var call$G = functionCall;
	var iterate$i = iterate$l;
	var aCallable$n = aCallable$B;
	var anObject$C = anObject$U;
	var getIteratorDirect$c = getIteratorDirect$g;
	var iteratorClose$9 = iteratorClose$h;
	var iteratorHelperWithoutClosingOnEarlyError$6 = iteratorHelperWithoutClosingOnEarlyError$a;

	var findWithoutClosingOnEarlyError = iteratorHelperWithoutClosingOnEarlyError$6('find', TypeError);

	// `Iterator.prototype.find` method
	// https://tc39.es/ecma262/#sec-iterator.prototype.find
	$$2B({ target: 'Iterator', proto: true, real: true, forced: findWithoutClosingOnEarlyError }, {
	  find: function find(predicate) {
	    anObject$C(this);
	    try {
	      aCallable$n(predicate);
	    } catch (error) {
	      iteratorClose$9(this, 'throw', error);
	    }

	    if (findWithoutClosingOnEarlyError) return call$G(findWithoutClosingOnEarlyError, this, predicate);

	    var record = getIteratorDirect$c(this);
	    var counter = 0;
	    return iterate$i(record, function (value, stop) {
	      if (predicate(value, counter++)) return stop(value);
	    }, { IS_RECORD: true, INTERRUPTED: true }).result;
	  }
	});

	var call$F = functionCall;
	var anObject$B = anObject$U;
	var getIteratorDirect$b = getIteratorDirect$g;
	var getIteratorMethod$3 = getIteratorMethod$7;

	var getIteratorFlattenable$2 = function (obj, stringHandling) {
	  if (!stringHandling || typeof obj !== 'string') anObject$B(obj);
	  var method = getIteratorMethod$3(obj);
	  return getIteratorDirect$b(anObject$B(method !== undefined ? call$F(method, obj) : obj));
	};

	var $$2A = _export;
	var call$E = functionCall;
	var aCallable$m = aCallable$B;
	var anObject$A = anObject$U;
	var getIteratorDirect$a = getIteratorDirect$g;
	var getIteratorFlattenable$1 = getIteratorFlattenable$2;
	var createIteratorProxy$3 = iteratorCreateProxy;
	var iteratorClose$8 = iteratorClose$h;
	var iteratorHelperThrowsOnInvalidIterator$1 = iteratorHelperThrowsOnInvalidIterator$4;
	var iteratorHelperWithoutClosingOnEarlyError$5 = iteratorHelperWithoutClosingOnEarlyError$a;

	var FLAT_MAP_WITHOUT_THROWING_ON_INVALID_ITERATOR = !iteratorHelperThrowsOnInvalidIterator$1('flatMap', function () { /* empty */ });
	var flatMapWithoutClosingOnEarlyError = !FLAT_MAP_WITHOUT_THROWING_ON_INVALID_ITERATOR
	  && iteratorHelperWithoutClosingOnEarlyError$5('flatMap', TypeError);

	var FORCED$x = FLAT_MAP_WITHOUT_THROWING_ON_INVALID_ITERATOR || flatMapWithoutClosingOnEarlyError;

	var IteratorProxy$3 = createIteratorProxy$3(function () {
	  var iterator = this.iterator;
	  var mapper = this.mapper;
	  var result, inner;

	  while (true) {
	    if (inner = this.inner) try {
	      result = anObject$A(call$E(inner.next, inner.iterator));
	      if (!result.done) return result.value;
	      this.inner = null;
	    } catch (error) { iteratorClose$8(iterator, 'throw', error); }

	    result = anObject$A(call$E(this.next, iterator));

	    if (this.done = !!result.done) return;

	    try {
	      this.inner = getIteratorFlattenable$1(mapper(result.value, this.counter++), false);
	    } catch (error) { iteratorClose$8(iterator, 'throw', error); }
	  }
	});

	// `Iterator.prototype.flatMap` method
	// https://tc39.es/ecma262/#sec-iterator.prototype.flatmap
	$$2A({ target: 'Iterator', proto: true, real: true, forced: FORCED$x }, {
	  flatMap: function flatMap(mapper) {
	    anObject$A(this);
	    try {
	      aCallable$m(mapper);
	    } catch (error) {
	      iteratorClose$8(this, 'throw', error);
	    }

	    if (flatMapWithoutClosingOnEarlyError) return call$E(flatMapWithoutClosingOnEarlyError, this, mapper);

	    return new IteratorProxy$3(getIteratorDirect$a(this), {
	      mapper: mapper,
	      inner: null
	    });
	  }
	});

	var $$2z = _export;
	var call$D = functionCall;
	var iterate$h = iterate$l;
	var aCallable$l = aCallable$B;
	var anObject$z = anObject$U;
	var getIteratorDirect$9 = getIteratorDirect$g;
	var iteratorClose$7 = iteratorClose$h;
	var iteratorHelperWithoutClosingOnEarlyError$4 = iteratorHelperWithoutClosingOnEarlyError$a;

	var forEachWithoutClosingOnEarlyError = iteratorHelperWithoutClosingOnEarlyError$4('forEach', TypeError);

	// `Iterator.prototype.forEach` method
	// https://tc39.es/ecma262/#sec-iterator.prototype.foreach
	$$2z({ target: 'Iterator', proto: true, real: true, forced: forEachWithoutClosingOnEarlyError }, {
	  forEach: function forEach(fn) {
	    anObject$z(this);
	    try {
	      aCallable$l(fn);
	    } catch (error) {
	      iteratorClose$7(this, 'throw', error);
	    }

	    if (forEachWithoutClosingOnEarlyError) return call$D(forEachWithoutClosingOnEarlyError, this, fn);

	    var record = getIteratorDirect$9(this);
	    var counter = 0;
	    iterate$h(record, function (value) {
	      fn(value, counter++);
	    }, { IS_RECORD: true });
	  }
	});

	var $$2y = _export;
	var call$C = functionCall;
	var toObject$c = toObject$v;
	var isPrototypeOf$4 = objectIsPrototypeOf;
	var IteratorPrototype = iteratorsCore.IteratorPrototype;
	var createIteratorProxy$2 = iteratorCreateProxy;
	var getIteratorFlattenable = getIteratorFlattenable$2;

	var FORCED$w = function () {
	  // Should not throw when an underlying iterator's `return` method is null
	  // https://bugs.webkit.org/show_bug.cgi?id=288714
	  try {
	    // eslint-disable-next-line es/no-iterator -- required for testing
	    Iterator.from({ 'return': null })['return']();
	  } catch (error) {
	    return true;
	  }
	}();

	var IteratorProxy$2 = createIteratorProxy$2(function () {
	  return call$C(this.next, this.iterator);
	}, true);

	// `Iterator.from` method
	// https://tc39.es/ecma262/#sec-iterator.from
	$$2y({ target: 'Iterator', stat: true, forced: FORCED$w }, {
	  from: function from(O) {
	    var iteratorRecord = getIteratorFlattenable(typeof O == 'string' ? toObject$c(O) : O, true);
	    return isPrototypeOf$4(IteratorPrototype, iteratorRecord.iterator)
	      ? iteratorRecord.iterator
	      : new IteratorProxy$2(iteratorRecord);
	  }
	});

	var $$2x = _export;
	var call$B = functionCall;
	var aCallable$k = aCallable$B;
	var anObject$y = anObject$U;
	var getIteratorDirect$8 = getIteratorDirect$g;
	var createIteratorProxy$1 = iteratorCreateProxy;
	var callWithSafeIterationClosing = callWithSafeIterationClosing$3;
	var iteratorClose$6 = iteratorClose$h;
	var iteratorHelperThrowsOnInvalidIterator = iteratorHelperThrowsOnInvalidIterator$4;
	var iteratorHelperWithoutClosingOnEarlyError$3 = iteratorHelperWithoutClosingOnEarlyError$a;

	var MAP_WITHOUT_THROWING_ON_INVALID_ITERATOR = !iteratorHelperThrowsOnInvalidIterator('map', function () { /* empty */ });
	var mapWithoutClosingOnEarlyError = !MAP_WITHOUT_THROWING_ON_INVALID_ITERATOR
	  && iteratorHelperWithoutClosingOnEarlyError$3('map', TypeError);

	var FORCED$v = MAP_WITHOUT_THROWING_ON_INVALID_ITERATOR || mapWithoutClosingOnEarlyError;

	var IteratorProxy$1 = createIteratorProxy$1(function () {
	  var iterator = this.iterator;
	  var result = anObject$y(call$B(this.next, iterator));
	  var done = this.done = !!result.done;
	  if (!done) return callWithSafeIterationClosing(iterator, this.mapper, [result.value, this.counter++], true);
	});

	// `Iterator.prototype.map` method
	// https://tc39.es/ecma262/#sec-iterator.prototype.map
	$$2x({ target: 'Iterator', proto: true, real: true, forced: FORCED$v }, {
	  map: function map(mapper) {
	    anObject$y(this);
	    try {
	      aCallable$k(mapper);
	    } catch (error) {
	      iteratorClose$6(this, 'throw', error);
	    }

	    if (mapWithoutClosingOnEarlyError) return call$B(mapWithoutClosingOnEarlyError, this, mapper);

	    return new IteratorProxy$1(getIteratorDirect$8(this), {
	      mapper: mapper
	    });
	  }
	});

	var $$2w = _export;
	var iterate$g = iterate$l;
	var aCallable$j = aCallable$B;
	var anObject$x = anObject$U;
	var getIteratorDirect$7 = getIteratorDirect$g;
	var iteratorClose$5 = iteratorClose$h;
	var iteratorHelperWithoutClosingOnEarlyError$2 = iteratorHelperWithoutClosingOnEarlyError$a;
	var apply$7 = functionApply$1;
	var fails$11 = fails$1z;

	var $TypeError$h = TypeError;

	// https://bugs.webkit.org/show_bug.cgi?id=291651
	var FAILS_ON_INITIAL_UNDEFINED = fails$11(function () {
	  // eslint-disable-next-line es/no-iterator-prototype-reduce, es/no-array-prototype-keys, array-callback-return -- required for testing
	  [].keys().reduce(function () { /* empty */ }, undefined);
	});

	var reduceWithoutClosingOnEarlyError = !FAILS_ON_INITIAL_UNDEFINED && iteratorHelperWithoutClosingOnEarlyError$2('reduce', $TypeError$h);

	// `Iterator.prototype.reduce` method
	// https://tc39.es/ecma262/#sec-iterator.prototype.reduce
	$$2w({ target: 'Iterator', proto: true, real: true, forced: FAILS_ON_INITIAL_UNDEFINED || reduceWithoutClosingOnEarlyError }, {
	  reduce: function reduce(reducer /* , initialValue */) {
	    anObject$x(this);
	    try {
	      aCallable$j(reducer);
	    } catch (error) {
	      iteratorClose$5(this, 'throw', error);
	    }

	    var noInitial = arguments.length < 2;
	    var accumulator = noInitial ? undefined : arguments[1];
	    if (reduceWithoutClosingOnEarlyError) {
	      return apply$7(reduceWithoutClosingOnEarlyError, this, noInitial ? [reducer] : [reducer, accumulator]);
	    }
	    var record = getIteratorDirect$7(this);
	    var counter = 0;
	    iterate$g(record, function (value) {
	      if (noInitial) {
	        noInitial = false;
	        accumulator = value;
	      } else {
	        accumulator = reducer(accumulator, value, counter);
	      }
	      counter++;
	    }, { IS_RECORD: true });
	    if (noInitial) throw new $TypeError$h('Reduce of empty iterator with no initial value');
	    return accumulator;
	  }
	});

	var $$2v = _export;
	var call$A = functionCall;
	var iterate$f = iterate$l;
	var aCallable$i = aCallable$B;
	var anObject$w = anObject$U;
	var getIteratorDirect$6 = getIteratorDirect$g;
	var iteratorClose$4 = iteratorClose$h;
	var iteratorHelperWithoutClosingOnEarlyError$1 = iteratorHelperWithoutClosingOnEarlyError$a;

	var someWithoutClosingOnEarlyError = iteratorHelperWithoutClosingOnEarlyError$1('some', TypeError);

	// `Iterator.prototype.some` method
	// https://tc39.es/ecma262/#sec-iterator.prototype.some
	$$2v({ target: 'Iterator', proto: true, real: true, forced: someWithoutClosingOnEarlyError }, {
	  some: function some(predicate) {
	    anObject$w(this);
	    try {
	      aCallable$i(predicate);
	    } catch (error) {
	      iteratorClose$4(this, 'throw', error);
	    }

	    if (someWithoutClosingOnEarlyError) return call$A(someWithoutClosingOnEarlyError, this, predicate);

	    var record = getIteratorDirect$6(this);
	    var counter = 0;
	    return iterate$f(record, function (value, stop) {
	      if (predicate(value, counter++)) return stop();
	    }, { IS_RECORD: true, INTERRUPTED: true }).stopped;
	  }
	});

	var $$2u = _export;
	var call$z = functionCall;
	var anObject$v = anObject$U;
	var getIteratorDirect$5 = getIteratorDirect$g;
	var notANaN = notANan;
	var toPositiveInteger$1 = toPositiveInteger$3;
	var createIteratorProxy = iteratorCreateProxy;
	var iteratorClose$3 = iteratorClose$h;
	var iteratorHelperWithoutClosingOnEarlyError = iteratorHelperWithoutClosingOnEarlyError$a;

	var takeWithoutClosingOnEarlyError = iteratorHelperWithoutClosingOnEarlyError('take', RangeError);

	var IteratorProxy = createIteratorProxy(function () {
	  var iterator = this.iterator;
	  if (!this.remaining--) {
	    this.done = true;
	    return iteratorClose$3(iterator, 'normal', undefined);
	  }
	  var result = anObject$v(call$z(this.next, iterator));
	  var done = this.done = !!result.done;
	  if (!done) return result.value;
	});

	// `Iterator.prototype.take` method
	// https://tc39.es/ecma262/#sec-iterator.prototype.take
	$$2u({ target: 'Iterator', proto: true, real: true, forced: takeWithoutClosingOnEarlyError }, {
	  take: function take(limit) {
	    anObject$v(this);
	    var remaining;
	    try {
	      remaining = toPositiveInteger$1(notANaN(+limit));
	    } catch (error) {
	      iteratorClose$3(this, 'throw', error);
	    }

	    if (takeWithoutClosingOnEarlyError) return call$z(takeWithoutClosingOnEarlyError, this, remaining);

	    return new IteratorProxy(getIteratorDirect$5(this), {
	      remaining: remaining
	    });
	  }
	});

	var $$2t = _export;
	var anObject$u = anObject$U;
	var iterate$e = iterate$l;
	var getIteratorDirect$4 = getIteratorDirect$g;

	var push$d = [].push;

	// `Iterator.prototype.toArray` method
	// https://tc39.es/ecma262/#sec-iterator.prototype.toarray
	$$2t({ target: 'Iterator', proto: true, real: true }, {
	  toArray: function toArray() {
	    var result = [];
	    iterate$e(getIteratorDirect$4(anObject$u(this)), push$d, { that: result, IS_RECORD: true });
	    return result;
	  }
	});

	var globalThis$Q = globalThis_1;
	var setToStringTag$8 = setToStringTag$e;

	// JSON[@@toStringTag] property
	// https://tc39.es/ecma262/#sec-json-@@tostringtag
	setToStringTag$8(globalThis$Q.JSON, 'JSON', true);

	var internalMetadata = {exports: {}};

	// FF26- bug: ArrayBuffers are non-extensible, but Object.isExtensible does not report it
	var fails$10 = fails$1z;

	var arrayBufferNonExtensible = fails$10(function () {
	  if (typeof ArrayBuffer == 'function') {
	    var buffer = new ArrayBuffer(8);
	    // eslint-disable-next-line es/no-object-isextensible, es/no-object-defineproperty -- safe
	    if (Object.isExtensible(buffer)) Object.defineProperty(buffer, 'a', { value: 8 });
	  }
	});

	var fails$$ = fails$1z;
	var isObject$s = isObject$K;
	var classof$d = classofRaw$2;
	var ARRAY_BUFFER_NON_EXTENSIBLE$2 = arrayBufferNonExtensible;

	// eslint-disable-next-line es/no-object-isextensible -- safe
	var $isExtensible$2 = Object.isExtensible;
	var FAILS_ON_PRIMITIVES$6 = fails$$(function () { $isExtensible$2(1); });

	// `Object.isExtensible` method
	// https://tc39.es/ecma262/#sec-object.isextensible
	var objectIsExtensible = (FAILS_ON_PRIMITIVES$6 || ARRAY_BUFFER_NON_EXTENSIBLE$2) ? function isExtensible(it) {
	  if (!isObject$s(it)) return false;
	  if (ARRAY_BUFFER_NON_EXTENSIBLE$2 && classof$d(it) === 'ArrayBuffer') return false;
	  return $isExtensible$2 ? $isExtensible$2(it) : true;
	} : $isExtensible$2;

	var fails$_ = fails$1z;

	var freezing = !fails$_(function () {
	  // eslint-disable-next-line es/no-object-isextensible, es/no-object-preventextensions -- required for testing
	  return Object.isExtensible(Object.preventExtensions({}));
	});

	var $$2s = _export;
	var uncurryThis$Z = functionUncurryThis;
	var hiddenKeys = hiddenKeys$6;
	var isObject$r = isObject$K;
	var hasOwn$g = hasOwnProperty_1;
	var defineProperty$6 = objectDefineProperty.f;
	var getOwnPropertyNamesModule = objectGetOwnPropertyNames;
	var getOwnPropertyNamesExternalModule = objectGetOwnPropertyNamesExternal;
	var isExtensible$1 = objectIsExtensible;
	var uid$1 = uid$6;
	var FREEZING$5 = freezing;

	var REQUIRED = false;
	var METADATA = uid$1('meta');
	var id$1 = 0;

	var setMetadata = function (it) {
	  defineProperty$6(it, METADATA, { value: {
	    objectID: 'O' + id$1++, // object ID
	    weakData: {}          // weak collections IDs
	  } });
	};

	var fastKey$1 = function (it, create) {
	  // return a primitive with prefix
	  if (!isObject$r(it)) return typeof it == 'symbol' ? it : (typeof it == 'string' ? 'S' : 'P') + it;
	  if (!hasOwn$g(it, METADATA)) {
	    // can't set metadata to uncaught frozen object
	    if (!isExtensible$1(it)) return 'F';
	    // not necessary to add metadata
	    if (!create) return 'E';
	    // add missing metadata
	    setMetadata(it);
	  // return object ID
	  } return it[METADATA].objectID;
	};

	var getWeakData$1 = function (it, create) {
	  if (!hasOwn$g(it, METADATA)) {
	    // can't set metadata to uncaught frozen object
	    if (!isExtensible$1(it)) return true;
	    // not necessary to add metadata
	    if (!create) return false;
	    // add missing metadata
	    setMetadata(it);
	  // return the store of weak collections IDs
	  } return it[METADATA].weakData;
	};

	// add metadata on freeze-family methods calling
	var onFreeze$3 = function (it) {
	  if (FREEZING$5 && REQUIRED && isExtensible$1(it) && !hasOwn$g(it, METADATA)) setMetadata(it);
	  return it;
	};

	var enable = function () {
	  meta.enable = function () { /* empty */ };
	  REQUIRED = true;
	  var getOwnPropertyNames = getOwnPropertyNamesModule.f;
	  var splice = uncurryThis$Z([].splice);
	  var test = {};
	  test[METADATA] = 1;

	  // prevent exposing of metadata key
	  if (getOwnPropertyNames(test).length) {
	    getOwnPropertyNamesModule.f = function (it) {
	      var result = getOwnPropertyNames(it);
	      for (var i = 0, length = result.length; i < length; i++) {
	        if (result[i] === METADATA) {
	          splice(result, i, 1);
	          break;
	        }
	      } return result;
	    };

	    $$2s({ target: 'Object', stat: true, forced: true }, {
	      getOwnPropertyNames: getOwnPropertyNamesExternalModule.f
	    });
	  }
	};

	var meta = internalMetadata.exports = {
	  enable: enable,
	  fastKey: fastKey$1,
	  getWeakData: getWeakData$1,
	  onFreeze: onFreeze$3
	};

	hiddenKeys[METADATA] = true;

	var internalMetadataExports = internalMetadata.exports;

	var $$2r = _export;
	var globalThis$P = globalThis_1;
	var uncurryThis$Y = functionUncurryThis;
	var isForced$3 = isForced_1;
	var defineBuiltIn$g = defineBuiltIn$t;
	var InternalMetadataModule$1 = internalMetadataExports;
	var iterate$d = iterate$l;
	var anInstance$9 = anInstance$d;
	var isCallable$d = isCallable$A;
	var isNullOrUndefined$4 = isNullOrUndefined$9;
	var isObject$q = isObject$K;
	var fails$Z = fails$1z;
	var checkCorrectnessOfIteration$2 = checkCorrectnessOfIteration$4;
	var setToStringTag$7 = setToStringTag$e;
	var inheritIfRequired$4 = inheritIfRequired$7;

	var collection$4 = function (CONSTRUCTOR_NAME, wrapper, common) {
	  var IS_MAP = CONSTRUCTOR_NAME.indexOf('Map') !== -1;
	  var IS_WEAK = CONSTRUCTOR_NAME.indexOf('Weak') !== -1;
	  var ADDER = IS_MAP ? 'set' : 'add';
	  var NativeConstructor = globalThis$P[CONSTRUCTOR_NAME];
	  var NativePrototype = NativeConstructor && NativeConstructor.prototype;
	  var Constructor = NativeConstructor;
	  var exported = {};

	  var fixMethod = function (KEY) {
	    var uncurriedNativeMethod = uncurryThis$Y(NativePrototype[KEY]);
	    defineBuiltIn$g(NativePrototype, KEY,
	      KEY === 'add' ? function add(value) {
	        uncurriedNativeMethod(this, value === 0 ? 0 : value);
	        return this;
	      } : KEY === 'delete' ? function (key) {
	        return IS_WEAK && !isObject$q(key) ? false : uncurriedNativeMethod(this, key === 0 ? 0 : key);
	      } : KEY === 'get' ? function get(key) {
	        return IS_WEAK && !isObject$q(key) ? undefined : uncurriedNativeMethod(this, key === 0 ? 0 : key);
	      } : KEY === 'has' ? function has(key) {
	        return IS_WEAK && !isObject$q(key) ? false : uncurriedNativeMethod(this, key === 0 ? 0 : key);
	      } : function set(key, value) {
	        uncurriedNativeMethod(this, key === 0 ? 0 : key, value);
	        return this;
	      }
	    );
	  };

	  var REPLACE = isForced$3(
	    CONSTRUCTOR_NAME,
	    !isCallable$d(NativeConstructor) || !(IS_WEAK || NativePrototype.forEach && !fails$Z(function () {
	      new NativeConstructor().entries().next();
	    }))
	  );

	  if (REPLACE) {
	    // create collection constructor
	    Constructor = common.getConstructor(wrapper, CONSTRUCTOR_NAME, IS_MAP, ADDER);
	    InternalMetadataModule$1.enable();
	  } else if (isForced$3(CONSTRUCTOR_NAME, true)) {
	    var instance = new Constructor();
	    // early implementations not supports chaining
	    var HASNT_CHAINING = instance[ADDER](IS_WEAK ? {} : -0, 1) !== instance;
	    // V8 ~ Chromium 40- weak-collections throws on primitives, but should return false
	    var THROWS_ON_PRIMITIVES = fails$Z(function () { instance.has(1); });
	    // most early implementations doesn't supports iterables, most modern - not close it correctly
	    // eslint-disable-next-line no-new -- required for testing
	    var ACCEPT_ITERABLES = checkCorrectnessOfIteration$2(function (iterable) { new NativeConstructor(iterable); });
	    // for early implementations -0 and +0 not the same
	    var BUGGY_ZERO = !IS_WEAK && fails$Z(function () {
	      // V8 ~ Chromium 42- fails only with 5+ elements
	      var $instance = new NativeConstructor();
	      var index = 5;
	      while (index--) $instance[ADDER](index, index);
	      return !$instance.has(-0);
	    });

	    if (!ACCEPT_ITERABLES) {
	      Constructor = wrapper(function (dummy, iterable) {
	        anInstance$9(dummy, NativePrototype);
	        var that = inheritIfRequired$4(new NativeConstructor(), dummy, Constructor);
	        if (!isNullOrUndefined$4(iterable)) iterate$d(iterable, that[ADDER], { that: that, AS_ENTRIES: IS_MAP });
	        return that;
	      });
	      Constructor.prototype = NativePrototype;
	      NativePrototype.constructor = Constructor;
	    }

	    if (THROWS_ON_PRIMITIVES || BUGGY_ZERO) {
	      fixMethod('delete');
	      fixMethod('has');
	      IS_MAP && fixMethod('get');
	    }

	    if (BUGGY_ZERO || HASNT_CHAINING) fixMethod(ADDER);

	    // weak collections should not contains .clear method
	    if (IS_WEAK && NativePrototype.clear) delete NativePrototype.clear;
	  }

	  exported[CONSTRUCTOR_NAME] = Constructor;
	  $$2r({ global: true, constructor: true, forced: Constructor !== NativeConstructor }, exported);

	  setToStringTag$7(Constructor, CONSTRUCTOR_NAME);

	  if (!IS_WEAK) common.setStrong(Constructor, CONSTRUCTOR_NAME, IS_MAP);

	  return Constructor;
	};

	var create$9 = objectCreate;
	var defineBuiltInAccessor$b = defineBuiltInAccessor$l;
	var defineBuiltIns$5 = defineBuiltIns$9;
	var bind$8 = functionBindContext;
	var anInstance$8 = anInstance$d;
	var isNullOrUndefined$3 = isNullOrUndefined$9;
	var iterate$c = iterate$l;
	var defineIterator$1 = iteratorDefine;
	var createIterResultObject$4 = createIterResultObject$7;
	var setSpecies$3 = setSpecies$6;
	var DESCRIPTORS$u = descriptors;
	var fastKey = internalMetadataExports.fastKey;
	var InternalStateModule$a = internalState;

	var setInternalState$a = InternalStateModule$a.set;
	var internalStateGetterFor$1 = InternalStateModule$a.getterFor;

	var collectionStrong$2 = {
	  getConstructor: function (wrapper, CONSTRUCTOR_NAME, IS_MAP, ADDER) {
	    var Constructor = wrapper(function (that, iterable) {
	      anInstance$8(that, Prototype);
	      setInternalState$a(that, {
	        type: CONSTRUCTOR_NAME,
	        index: create$9(null),
	        first: null,
	        last: null,
	        size: 0
	      });
	      if (!DESCRIPTORS$u) that.size = 0;
	      if (!isNullOrUndefined$3(iterable)) iterate$c(iterable, that[ADDER], { that: that, AS_ENTRIES: IS_MAP });
	    });

	    var Prototype = Constructor.prototype;

	    var getInternalState = internalStateGetterFor$1(CONSTRUCTOR_NAME);

	    var define = function (that, key, value) {
	      var state = getInternalState(that);
	      var entry = getEntry(that, key);
	      var previous, index;
	      // change existing entry
	      if (entry) {
	        entry.value = value;
	      // create new entry
	      } else {
	        state.last = entry = {
	          index: index = fastKey(key, true),
	          key: key,
	          value: value,
	          previous: previous = state.last,
	          next: null,
	          removed: false
	        };
	        if (!state.first) state.first = entry;
	        if (previous) previous.next = entry;
	        if (DESCRIPTORS$u) state.size++;
	        else that.size++;
	        // add to index
	        if (index !== 'F') state.index[index] = entry;
	      } return that;
	    };

	    var getEntry = function (that, key) {
	      var state = getInternalState(that);
	      // fast case
	      var index = fastKey(key);
	      var entry;
	      if (index !== 'F') return state.index[index];
	      // frozen object case
	      for (entry = state.first; entry; entry = entry.next) {
	        if (entry.key === key) return entry;
	      }
	    };

	    defineBuiltIns$5(Prototype, {
	      // `{ Map, Set }.prototype.clear()` methods
	      // https://tc39.es/ecma262/#sec-map.prototype.clear
	      // https://tc39.es/ecma262/#sec-set.prototype.clear
	      clear: function clear() {
	        var that = this;
	        var state = getInternalState(that);
	        var entry = state.first;
	        while (entry) {
	          entry.removed = true;
	          if (entry.previous) entry.previous = entry.previous.next = null;
	          entry = entry.next;
	        }
	        state.first = state.last = null;
	        state.index = create$9(null);
	        if (DESCRIPTORS$u) state.size = 0;
	        else that.size = 0;
	      },
	      // `{ Map, Set }.prototype.delete(key)` methods
	      // https://tc39.es/ecma262/#sec-map.prototype.delete
	      // https://tc39.es/ecma262/#sec-set.prototype.delete
	      'delete': function (key) {
	        var that = this;
	        var state = getInternalState(that);
	        var entry = getEntry(that, key);
	        if (entry) {
	          var next = entry.next;
	          var prev = entry.previous;
	          delete state.index[entry.index];
	          entry.removed = true;
	          if (prev) prev.next = next;
	          if (next) next.previous = prev;
	          if (state.first === entry) state.first = next;
	          if (state.last === entry) state.last = prev;
	          if (DESCRIPTORS$u) state.size--;
	          else that.size--;
	        } return !!entry;
	      },
	      // `{ Map, Set }.prototype.forEach(callbackfn, thisArg = undefined)` methods
	      // https://tc39.es/ecma262/#sec-map.prototype.foreach
	      // https://tc39.es/ecma262/#sec-set.prototype.foreach
	      forEach: function forEach(callbackfn /* , that = undefined */) {
	        var state = getInternalState(this);
	        var boundFunction = bind$8(callbackfn, arguments.length > 1 ? arguments[1] : undefined);
	        var entry;
	        while (entry = entry ? entry.next : state.first) {
	          boundFunction(entry.value, entry.key, this);
	          // revert to the last existing entry
	          while (entry && entry.removed) entry = entry.previous;
	        }
	      },
	      // `{ Map, Set}.prototype.has(key)` methods
	      // https://tc39.es/ecma262/#sec-map.prototype.has
	      // https://tc39.es/ecma262/#sec-set.prototype.has
	      has: function has(key) {
	        return !!getEntry(this, key);
	      }
	    });

	    defineBuiltIns$5(Prototype, IS_MAP ? {
	      // `Map.prototype.get(key)` method
	      // https://tc39.es/ecma262/#sec-map.prototype.get
	      get: function get(key) {
	        var entry = getEntry(this, key);
	        return entry && entry.value;
	      },
	      // `Map.prototype.set(key, value)` method
	      // https://tc39.es/ecma262/#sec-map.prototype.set
	      set: function set(key, value) {
	        return define(this, key === 0 ? 0 : key, value);
	      }
	    } : {
	      // `Set.prototype.add(value)` method
	      // https://tc39.es/ecma262/#sec-set.prototype.add
	      add: function add(value) {
	        return define(this, value = value === 0 ? 0 : value, value);
	      }
	    });
	    if (DESCRIPTORS$u) defineBuiltInAccessor$b(Prototype, 'size', {
	      configurable: true,
	      get: function () {
	        return getInternalState(this).size;
	      }
	    });
	    return Constructor;
	  },
	  setStrong: function (Constructor, CONSTRUCTOR_NAME, IS_MAP) {
	    var ITERATOR_NAME = CONSTRUCTOR_NAME + ' Iterator';
	    var getInternalCollectionState = internalStateGetterFor$1(CONSTRUCTOR_NAME);
	    var getInternalIteratorState = internalStateGetterFor$1(ITERATOR_NAME);
	    // `{ Map, Set }.prototype.{ keys, values, entries, @@iterator }()` methods
	    // https://tc39.es/ecma262/#sec-map.prototype.entries
	    // https://tc39.es/ecma262/#sec-map.prototype.keys
	    // https://tc39.es/ecma262/#sec-map.prototype.values
	    // https://tc39.es/ecma262/#sec-map.prototype-@@iterator
	    // https://tc39.es/ecma262/#sec-set.prototype.entries
	    // https://tc39.es/ecma262/#sec-set.prototype.keys
	    // https://tc39.es/ecma262/#sec-set.prototype.values
	    // https://tc39.es/ecma262/#sec-set.prototype-@@iterator
	    defineIterator$1(Constructor, CONSTRUCTOR_NAME, function (iterated, kind) {
	      setInternalState$a(this, {
	        type: ITERATOR_NAME,
	        target: iterated,
	        state: getInternalCollectionState(iterated),
	        kind: kind,
	        last: null
	      });
	    }, function () {
	      var state = getInternalIteratorState(this);
	      var kind = state.kind;
	      var entry = state.last;
	      // revert to the last existing entry
	      while (entry && entry.removed) entry = entry.previous;
	      // get next entry
	      if (!state.target || !(state.last = entry = entry ? entry.next : state.state.first)) {
	        // or finish the iteration
	        state.target = null;
	        return createIterResultObject$4(undefined, true);
	      }
	      // return step by kind
	      if (kind === 'keys') return createIterResultObject$4(entry.key, false);
	      if (kind === 'values') return createIterResultObject$4(entry.value, false);
	      return createIterResultObject$4([entry.key, entry.value], false);
	    }, IS_MAP ? 'entries' : 'values', !IS_MAP, true);

	    // `{ Map, Set }.prototype[@@species]` accessors
	    // https://tc39.es/ecma262/#sec-get-map-@@species
	    // https://tc39.es/ecma262/#sec-get-set-@@species
	    setSpecies$3(CONSTRUCTOR_NAME);
	  }
	};

	var collection$3 = collection$4;
	var collectionStrong$1 = collectionStrong$2;

	// `Map` constructor
	// https://tc39.es/ecma262/#sec-map-objects
	collection$3('Map', function (init) {
	  return function Map() { return init(this, arguments.length ? arguments[0] : undefined); };
	}, collectionStrong$1);

	var uncurryThis$X = functionUncurryThis;

	// eslint-disable-next-line es/no-map -- safe
	var MapPrototype = Map.prototype;

	var mapHelpers = {
	  // eslint-disable-next-line es/no-map -- safe
	  Map: Map,
	  set: uncurryThis$X(MapPrototype.set),
	  get: uncurryThis$X(MapPrototype.get),
	  has: uncurryThis$X(MapPrototype.has),
	  remove: uncurryThis$X(MapPrototype['delete'])};

	var $$2q = _export;
	var uncurryThis$W = functionUncurryThis;
	var aCallable$h = aCallable$B;
	var requireObjectCoercible$i = requireObjectCoercible$o;
	var iterate$b = iterate$l;
	var MapHelpers$1 = mapHelpers;
	var fails$Y = fails$1z;

	var Map$2 = MapHelpers$1.Map;
	var has$6 = MapHelpers$1.has;
	var get$1 = MapHelpers$1.get;
	var set$2 = MapHelpers$1.set;
	var push$c = uncurryThis$W([].push);

	// https://bugs.webkit.org/show_bug.cgi?id=271524
	var DOES_NOT_WORK_WITH_PRIMITIVES$1 = fails$Y(function () {
	  return Map$2.groupBy('ab', function (it) {
	    return it;
	  }).get('a').length !== 1;
	});

	// `Map.groupBy` method
	// https://tc39.es/ecma262/#sec-map.groupby
	$$2q({ target: 'Map', stat: true, forced: DOES_NOT_WORK_WITH_PRIMITIVES$1 }, {
	  groupBy: function groupBy(items, callbackfn) {
	    requireObjectCoercible$i(items);
	    aCallable$h(callbackfn);
	    var map = new Map$2();
	    var k = 0;
	    iterate$b(items, function (value) {
	      var key = callbackfn(value, k++);
	      if (!has$6(map, key)) set$2(map, key, [value]);
	      else push$c(get$1(map, key), value);
	    });
	    return map;
	  }
	});

	var log$6 = Math.log;

	// `Math.log1p` method implementation
	// https://tc39.es/ecma262/#sec-math.log1p
	// eslint-disable-next-line es/no-math-log1p -- safe
	var mathLog1p = Math.log1p || function log1p(x) {
	  var n = +x;
	  return n > -1e-8 && n < 1e-8 ? n - n * n / 2 : log$6(1 + n);
	};

	var $$2p = _export;
	var log1p$1 = mathLog1p;

	// eslint-disable-next-line es/no-math-acosh -- required for testing
	var $acosh = Math.acosh;
	var log$5 = Math.log;
	var sqrt$2 = Math.sqrt;
	var LN2 = Math.LN2;

	var FORCED$u = !$acosh
	  // V8 bug: https://code.google.com/p/v8/issues/detail?id=3509
	  || Math.floor($acosh(Number.MAX_VALUE)) !== 710
	  // Tor Browser bug: Math.acosh(Infinity) -> NaN
	  || $acosh(Infinity) !== Infinity;

	// `Math.acosh` method
	// https://tc39.es/ecma262/#sec-math.acosh
	$$2p({ target: 'Math', stat: true, forced: FORCED$u }, {
	  acosh: function acosh(x) {
	    var n = +x;
	    return n < 1 ? NaN : n > 94906265.62425156
	      ? log$5(n) + LN2
	      : log1p$1(n - 1 + sqrt$2(n - 1) * sqrt$2(n + 1));
	  }
	});

	var $$2o = _export;

	// eslint-disable-next-line es/no-math-asinh -- required for testing
	var $asinh = Math.asinh;
	var log$4 = Math.log;
	var sqrt$1 = Math.sqrt;

	function asinh(x) {
	  var n = +x;
	  return !isFinite(n) || n === 0 ? n : n < 0 ? -asinh(-n) : log$4(n + sqrt$1(n * n + 1));
	}

	var FORCED$t = !($asinh && 1 / $asinh(0) > 0);

	// `Math.asinh` method
	// https://tc39.es/ecma262/#sec-math.asinh
	// Tor Browser bug: Math.asinh(0) -> -0
	$$2o({ target: 'Math', stat: true, forced: FORCED$t }, {
	  asinh: asinh
	});

	var $$2n = _export;

	// eslint-disable-next-line es/no-math-atanh -- required for testing
	var $atanh = Math.atanh;
	var log$3 = Math.log;

	var FORCED$s = !($atanh && 1 / $atanh(-0) < 0);

	// `Math.atanh` method
	// https://tc39.es/ecma262/#sec-math.atanh
	// Tor Browser bug: Math.atanh(-0) -> 0
	$$2n({ target: 'Math', stat: true, forced: FORCED$s }, {
	  atanh: function atanh(x) {
	    var n = +x;
	    return n === 0 ? n : log$3((1 + n) / (1 - n)) / 2;
	  }
	});

	var $$2m = _export;
	var sign$1 = mathSign;

	var abs$6 = Math.abs;
	var pow$4 = Math.pow;

	// `Math.cbrt` method
	// https://tc39.es/ecma262/#sec-math.cbrt
	$$2m({ target: 'Math', stat: true }, {
	  cbrt: function cbrt(x) {
	    var n = +x;
	    return sign$1(n) * pow$4(abs$6(n), 1 / 3);
	  }
	});

	var $$2l = _export;

	var floor$7 = Math.floor;
	var log$2 = Math.log;
	var LOG2E = Math.LOG2E;

	// `Math.clz32` method
	// https://tc39.es/ecma262/#sec-math.clz32
	$$2l({ target: 'Math', stat: true }, {
	  clz32: function clz32(x) {
	    var n = x >>> 0;
	    return n ? 31 - floor$7(log$2(n + 0.5) * LOG2E) : 32;
	  }
	});

	// eslint-disable-next-line es/no-math-expm1 -- safe
	var $expm1 = Math.expm1;
	var exp$2 = Math.exp;

	// `Math.expm1` method implementation
	// https://tc39.es/ecma262/#sec-math.expm1
	var mathExpm1 = (!$expm1
	  // Old FF bug
	  // eslint-disable-next-line no-loss-of-precision -- required for old engines
	  || $expm1(10) > 22025.465794806719 || $expm1(10) < 22025.4657948067165168
	  // Tor Browser bug
	  || $expm1(-2e-17) !== -2e-17
	) ? function expm1(x) {
	  var n = +x;
	  return n === 0 ? n : n > -1e-6 && n < 1e-6 ? n + n * n / 2 : exp$2(n) - 1;
	} : $expm1;

	var $$2k = _export;
	var expm1$3 = mathExpm1;

	// eslint-disable-next-line es/no-math-cosh -- required for testing
	var $cosh = Math.cosh;
	var abs$5 = Math.abs;
	var E$1 = Math.E;

	var FORCED$r = !$cosh || $cosh(710) === Infinity;

	// `Math.cosh` method
	// https://tc39.es/ecma262/#sec-math.cosh
	$$2k({ target: 'Math', stat: true, forced: FORCED$r }, {
	  cosh: function cosh(x) {
	    var t = expm1$3(abs$5(x) - 1) + 1;
	    return (t + 1 / (t * E$1 * E$1)) * (E$1 / 2);
	  }
	});

	var $$2j = _export;
	var expm1$2 = mathExpm1;

	// `Math.expm1` method
	// https://tc39.es/ecma262/#sec-math.expm1
	// eslint-disable-next-line es/no-math-expm1 -- required for testing
	$$2j({ target: 'Math', stat: true, forced: expm1$2 !== Math.expm1 }, { expm1: expm1$2 });

	var $$2i = _export;
	var fround = mathFround;

	// `Math.fround` method
	// https://tc39.es/ecma262/#sec-math.fround
	$$2i({ target: 'Math', stat: true }, { fround: fround });

	var $$2h = _export;
	var floatRound = mathFloatRound;

	var FLOAT16_EPSILON = 0.0009765625;
	var FLOAT16_MAX_VALUE = 65504;
	var FLOAT16_MIN_VALUE = 6.103515625e-05;

	// `Math.f16round` method
	// https://tc39.es/ecma262/#sec-math.f16round
	$$2h({ target: 'Math', stat: true }, {
	  f16round: function f16round(x) {
	    return floatRound(x, FLOAT16_EPSILON, FLOAT16_MAX_VALUE, FLOAT16_MIN_VALUE);
	  }
	});

	var $$2g = _export;

	// eslint-disable-next-line es/no-math-hypot -- required for testing
	var $hypot = Math.hypot;
	var abs$4 = Math.abs;
	var sqrt = Math.sqrt;

	// Chrome 77 bug
	// https://bugs.chromium.org/p/v8/issues/detail?id=9546
	var FORCED$q = !!$hypot && $hypot(Infinity, NaN) !== Infinity;

	// `Math.hypot` method
	// https://tc39.es/ecma262/#sec-math.hypot
	$$2g({ target: 'Math', stat: true, arity: 2, forced: FORCED$q }, {
	  // eslint-disable-next-line no-unused-vars -- required for `.length`
	  hypot: function hypot(value1, value2) {
	    var sum = 0;
	    var i = 0;
	    var aLen = arguments.length;
	    var larg = 0;
	    var arg, div;
	    while (i < aLen) {
	      arg = abs$4(arguments[i++]);
	      if (larg < arg) {
	        div = larg / arg;
	        sum = sum * div * div + 1;
	        larg = arg;
	      } else if (arg > 0) {
	        div = arg / larg;
	        sum += div * div;
	      } else sum += arg;
	    }
	    return larg === Infinity ? Infinity : larg * sqrt(sum);
	  }
	});

	var $$2f = _export;
	var fails$X = fails$1z;

	// eslint-disable-next-line es/no-math-imul -- required for testing
	var $imul = Math.imul;

	var FORCED$p = fails$X(function () {
	  return $imul(0xFFFFFFFF, 5) !== -5 || $imul.length !== 2;
	});

	// `Math.imul` method
	// https://tc39.es/ecma262/#sec-math.imul
	// some WebKit versions fails with big numbers, some has wrong arity
	$$2f({ target: 'Math', stat: true, forced: FORCED$p }, {
	  imul: function imul(x, y) {
	    var UINT16 = 0xFFFF;
	    var xn = +x;
	    var yn = +y;
	    var xl = UINT16 & xn;
	    var yl = UINT16 & yn;
	    return 0 | xl * yl + ((UINT16 & xn >>> 16) * yl + xl * (UINT16 & yn >>> 16) << 16 >>> 0);
	  }
	});

	var log$1 = Math.log;
	var LOG10E = Math.LOG10E;

	// eslint-disable-next-line es/no-math-log10 -- safe
	var mathLog10 = Math.log10 || function log10(x) {
	  return log$1(x) * LOG10E;
	};

	var $$2e = _export;
	var log10$1 = mathLog10;

	// `Math.log10` method
	// https://tc39.es/ecma262/#sec-math.log10
	$$2e({ target: 'Math', stat: true }, {
	  log10: log10$1
	});

	var $$2d = _export;
	var log1p = mathLog1p;

	// `Math.log1p` method
	// https://tc39.es/ecma262/#sec-math.log1p
	$$2d({ target: 'Math', stat: true }, { log1p: log1p });

	var $$2c = _export;
	var log2 = mathLog2;

	// `Math.log2` method
	// https://tc39.es/ecma262/#sec-math.log2
	$$2c({ target: 'Math', stat: true }, {
	  log2: log2
	});

	var $$2b = _export;
	var sign = mathSign;

	// `Math.sign` method
	// https://tc39.es/ecma262/#sec-math.sign
	$$2b({ target: 'Math', stat: true }, {
	  sign: sign
	});

	var $$2a = _export;
	var fails$W = fails$1z;
	var expm1$1 = mathExpm1;

	var abs$3 = Math.abs;
	var exp$1 = Math.exp;
	var E = Math.E;

	var FORCED$o = fails$W(function () {
	  // eslint-disable-next-line es/no-math-sinh -- required for testing
	  return Math.sinh(-2e-17) !== -2e-17;
	});

	// `Math.sinh` method
	// https://tc39.es/ecma262/#sec-math.sinh
	// V8 near Chromium 38 has a problem with very small numbers
	$$2a({ target: 'Math', stat: true, forced: FORCED$o }, {
	  sinh: function sinh(x) {
	    var n = +x;
	    return abs$3(n) < 1 ? (expm1$1(n) - expm1$1(-n)) / 2 : (exp$1(n - 1) - exp$1(-n - 1)) * (E / 2);
	  }
	});

	// based on Shewchuk's algorithm for exactly floating point addition
	// adapted from https://github.com/tc39/proposal-math-sum/blob/3513d58323a1ae25560e8700aa5294500c6c9287/polyfill/polyfill.mjs
	var $$29 = _export;
	var uncurryThis$V = functionUncurryThis;
	var iterate$a = iterate$l;

	var $RangeError$6 = RangeError;
	var $TypeError$g = TypeError;
	var $Infinity = Infinity;
	var $NaN = NaN;
	var abs$2 = Math.abs;
	var pow$3 = Math.pow;
	var push$b = uncurryThis$V([].push);

	var POW_2_1023 = pow$3(2, 1023);
	var MAX_SAFE_INTEGER = pow$3(2, 53) - 1; // 2 ** 53 - 1 === 9007199254740992
	var MAX_DOUBLE = Number.MAX_VALUE; // 2 ** 1024 - 2 ** (1023 - 52) === 1.79769313486231570815e+308
	var MAX_ULP = pow$3(2, 971); // 2 ** (1023 - 52) === 1.99584030953471981166e+292

	var NOT_A_NUMBER = {};
	var MINUS_INFINITY = {};
	var PLUS_INFINITY = {};
	var MINUS_ZERO = {};
	var FINITE = {};

	// prerequisite: abs(x) >= abs(y)
	var twosum = function (x, y) {
	  var hi = x + y;
	  var lo = y - (hi - x);
	  return { hi: hi, lo: lo };
	};

	// `Math.sumPrecise` method
	// https://github.com/tc39/proposal-math-sum
	$$29({ target: 'Math', stat: true }, {
	  // eslint-disable-next-line max-statements -- ok
	  sumPrecise: function sumPrecise(items) {
	    var numbers = [];
	    var count = 0;
	    var state = MINUS_ZERO;

	    iterate$a(items, function (n) {
	      if (++count >= MAX_SAFE_INTEGER) throw new $RangeError$6('Maximum allowed index exceeded');
	      if (typeof n != 'number') throw new $TypeError$g('Value is not a number');
	      if (state !== NOT_A_NUMBER) {
	        // eslint-disable-next-line no-self-compare -- NaN check
	        if (n !== n) state = NOT_A_NUMBER;
	        else if (n === $Infinity) state = state === MINUS_INFINITY ? NOT_A_NUMBER : PLUS_INFINITY;
	        else if (n === -$Infinity) state = state === PLUS_INFINITY ? NOT_A_NUMBER : MINUS_INFINITY;
	        else if ((n !== 0 || (1 / n) === $Infinity) && (state === MINUS_ZERO || state === FINITE)) {
	          state = FINITE;
	          push$b(numbers, n);
	        }
	      }
	    });

	    switch (state) {
	      case NOT_A_NUMBER: return $NaN;
	      case MINUS_INFINITY: return -$Infinity;
	      case PLUS_INFINITY: return $Infinity;
	      case MINUS_ZERO: return -0;
	    }

	    var partials = [];
	    var overflow = 0; // conceptually 2 ** 1024 times this value; the final partial is biased by this amount
	    var x, y, sum, hi, lo, tmp;

	    for (var i = 0; i < numbers.length; i++) {
	      x = numbers[i];
	      var actuallyUsedPartials = 0;
	      for (var j = 0; j < partials.length; j++) {
	        y = partials[j];
	        if (abs$2(x) < abs$2(y)) {
	          tmp = x;
	          x = y;
	          y = tmp;
	        }
	        sum = twosum(x, y);
	        hi = sum.hi;
	        lo = sum.lo;
	        if (abs$2(hi) === $Infinity) {
	          var sign = hi === $Infinity ? 1 : -1;
	          overflow += sign;

	          x = (x - (sign * POW_2_1023)) - (sign * POW_2_1023);
	          if (abs$2(x) < abs$2(y)) {
	            tmp = x;
	            x = y;
	            y = tmp;
	          }
	          sum = twosum(x, y);
	          hi = sum.hi;
	          lo = sum.lo;
	        }
	        if (lo !== 0) partials[actuallyUsedPartials++] = lo;
	        x = hi;
	      }
	      partials.length = actuallyUsedPartials;
	      if (x !== 0) push$b(partials, x);
	    }

	    // compute the exact sum of partials, stopping once we lose precision
	    var n = partials.length - 1;
	    hi = 0;
	    lo = 0;

	    if (overflow !== 0) {
	      var next = n >= 0 ? partials[n] : 0;
	      n--;
	      if (abs$2(overflow) > 1 || (overflow > 0 && next > 0) || (overflow < 0 && next < 0)) {
	        return overflow > 0 ? $Infinity : -$Infinity;
	      }
	      // here we actually have to do the arithmetic
	      // drop a factor of 2 so we can do it without overflow
	      // assert(abs(overflow) === 1)
	      sum = twosum(overflow * POW_2_1023, next / 2);
	      hi = sum.hi;
	      lo = sum.lo;
	      lo *= 2;
	      if (abs$2(2 * hi) === $Infinity) {
	        // rounding to the maximum value
	        if (hi > 0) {
	          return (hi === POW_2_1023 && lo === -(MAX_ULP / 2) && n >= 0 && partials[n] < 0) ? MAX_DOUBLE : $Infinity;
	        } return (hi === -POW_2_1023 && lo === (MAX_ULP / 2) && n >= 0 && partials[n] > 0) ? -MAX_DOUBLE : -$Infinity;
	      }

	      if (lo !== 0) {
	        partials[++n] = lo;
	        lo = 0;
	      }

	      hi *= 2;
	    }

	    while (n >= 0) {
	      sum = twosum(hi, partials[n--]);
	      hi = sum.hi;
	      lo = sum.lo;
	      if (lo !== 0) break;
	    }

	    if (n >= 0 && ((lo < 0 && partials[n] < 0) || (lo > 0 && partials[n] > 0))) {
	      y = lo * 2;
	      x = hi + y;
	      if (y === x - hi) hi = x;
	    }

	    return hi;
	  }
	});

	var $$28 = _export;
	var expm1 = mathExpm1;

	var exp = Math.exp;

	// `Math.tanh` method
	// https://tc39.es/ecma262/#sec-math.tanh
	$$28({ target: 'Math', stat: true }, {
	  tanh: function tanh(x) {
	    var n = +x;
	    var a = expm1(n);
	    var b = expm1(-n);
	    return a === Infinity ? 1 : b === Infinity ? -1 : (a - b) / (exp(n) + exp(-n));
	  }
	});

	var setToStringTag$6 = setToStringTag$e;

	// Math[@@toStringTag] property
	// https://tc39.es/ecma262/#sec-math-@@tostringtag
	setToStringTag$6(Math, 'Math', true);

	var $$27 = _export;
	var trunc = mathTrunc;

	// `Math.trunc` method
	// https://tc39.es/ecma262/#sec-math.trunc
	$$27({ target: 'Math', stat: true }, {
	  trunc: trunc
	});

	var uncurryThis$U = functionUncurryThis;

	// `thisNumberValue` abstract operation
	// https://tc39.es/ecma262/#sec-thisnumbervalue
	var thisNumberValue$5 = uncurryThis$U(1.1.valueOf);

	// a string of all valid unicode whitespaces
	var whitespaces$5 = '\u0009\u000A\u000B\u000C\u000D\u0020\u00A0\u1680\u2000\u2001\u2002' +
	  '\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000\u2028\u2029\uFEFF';

	var uncurryThis$T = functionUncurryThis;
	var requireObjectCoercible$h = requireObjectCoercible$o;
	var toString$u = toString$D;
	var whitespaces$4 = whitespaces$5;

	var replace$8 = uncurryThis$T(''.replace);
	var ltrim = RegExp('^[' + whitespaces$4 + ']+');
	var rtrim = RegExp('(^|[^' + whitespaces$4 + '])[' + whitespaces$4 + ']+$');

	// `String.prototype.{ trim, trimStart, trimEnd, trimLeft, trimRight }` methods implementation
	var createMethod$3 = function (TYPE) {
	  return function ($this) {
	    var string = toString$u(requireObjectCoercible$h($this));
	    if (TYPE & 1) string = replace$8(string, ltrim, '');
	    if (TYPE & 2) string = replace$8(string, rtrim, '$1');
	    return string;
	  };
	};

	var stringTrim = {
	  // `String.prototype.{ trimLeft, trimStart }` methods
	  // https://tc39.es/ecma262/#sec-string.prototype.trimstart
	  start: createMethod$3(1),
	  // `String.prototype.{ trimRight, trimEnd }` methods
	  // https://tc39.es/ecma262/#sec-string.prototype.trimend
	  end: createMethod$3(2),
	  // `String.prototype.trim` method
	  // https://tc39.es/ecma262/#sec-string.prototype.trim
	  trim: createMethod$3(3)
	};

	var $$26 = _export;
	var IS_PURE$1 = isPure;
	var DESCRIPTORS$t = descriptors;
	var globalThis$O = globalThis_1;
	var path$1 = path$3;
	var uncurryThis$S = functionUncurryThis;
	var isForced$2 = isForced_1;
	var hasOwn$f = hasOwnProperty_1;
	var inheritIfRequired$3 = inheritIfRequired$7;
	var isPrototypeOf$3 = objectIsPrototypeOf;
	var isSymbol$2 = isSymbol$7;
	var toPrimitive$1 = toPrimitive$4;
	var fails$V = fails$1z;
	var getOwnPropertyNames$3 = objectGetOwnPropertyNames.f;
	var getOwnPropertyDescriptor$6 = objectGetOwnPropertyDescriptor.f;
	var defineProperty$5 = objectDefineProperty.f;
	var thisNumberValue$4 = thisNumberValue$5;
	var trim$2 = stringTrim.trim;

	var NUMBER = 'Number';
	var NativeNumber = globalThis$O[NUMBER];
	path$1[NUMBER];
	var NumberPrototype = NativeNumber.prototype;
	var TypeError$6 = globalThis$O.TypeError;
	var stringSlice$f = uncurryThis$S(''.slice);
	var charCodeAt$6 = uncurryThis$S(''.charCodeAt);

	// `ToNumeric` abstract operation
	// https://tc39.es/ecma262/#sec-tonumeric
	var toNumeric = function (value) {
	  var primValue = toPrimitive$1(value, 'number');
	  return typeof primValue == 'bigint' ? primValue : toNumber(primValue);
	};

	// `ToNumber` abstract operation
	// https://tc39.es/ecma262/#sec-tonumber
	var toNumber = function (argument) {
	  var it = toPrimitive$1(argument, 'number');
	  var first, third, radix, maxCode, digits, length, index, code;
	  if (isSymbol$2(it)) throw new TypeError$6('Cannot convert a Symbol value to a number');
	  if (typeof it == 'string' && it.length > 2) {
	    it = trim$2(it);
	    first = charCodeAt$6(it, 0);
	    if (first === 43 || first === 45) {
	      third = charCodeAt$6(it, 2);
	      if (third === 88 || third === 120) return NaN; // Number('+0x1') should be NaN, old V8 fix
	    } else if (first === 48) {
	      switch (charCodeAt$6(it, 1)) {
	        // fast equal of /^0b[01]+$/i
	        case 66:
	        case 98:
	          radix = 2;
	          maxCode = 49;
	          break;
	        // fast equal of /^0o[0-7]+$/i
	        case 79:
	        case 111:
	          radix = 8;
	          maxCode = 55;
	          break;
	        default:
	          return +it;
	      }
	      digits = stringSlice$f(it, 2);
	      length = digits.length;
	      for (index = 0; index < length; index++) {
	        code = charCodeAt$6(digits, index);
	        // parseInt parses a string to a first unavailable symbol
	        // but ToNumber should return NaN if a string contains unavailable symbols
	        if (code < 48 || code > maxCode) return NaN;
	      } return parseInt(digits, radix);
	    }
	  } return +it;
	};

	var FORCED$n = isForced$2(NUMBER, !NativeNumber(' 0o1') || !NativeNumber('0b1') || NativeNumber('+0x1'));

	var calledWithNew = function (dummy) {
	  // includes check on 1..constructor(foo) case
	  return isPrototypeOf$3(NumberPrototype, dummy) && fails$V(function () { thisNumberValue$4(dummy); });
	};

	// `Number` constructor
	// https://tc39.es/ecma262/#sec-number-constructor
	var NumberWrapper = function Number(value) {
	  var n = arguments.length < 1 ? 0 : NativeNumber(toNumeric(value));
	  return calledWithNew(this) ? inheritIfRequired$3(Object(n), this, NumberWrapper) : n;
	};

	NumberWrapper.prototype = NumberPrototype;
	if (FORCED$n && !IS_PURE$1) NumberPrototype.constructor = NumberWrapper;

	$$26({ global: true, constructor: true, wrap: true, forced: FORCED$n }, {
	  Number: NumberWrapper
	});

	// Use `internal/copy-constructor-properties` helper in `core-js@4`
	var copyConstructorProperties = function (target, source) {
	  for (var keys = DESCRIPTORS$t ? getOwnPropertyNames$3(source) : (
	    // ES3:
	    'MAX_VALUE,MIN_VALUE,NaN,NEGATIVE_INFINITY,POSITIVE_INFINITY,' +
	    // ES2015 (in case, if modules with ES2015 Number statics required before):
	    'EPSILON,MAX_SAFE_INTEGER,MIN_SAFE_INTEGER,isFinite,isInteger,isNaN,isSafeInteger,parseFloat,parseInt,' +
	    // ESNext
	    'fromString,range'
	  ).split(','), j = 0, key; keys.length > j; j++) {
	    if (hasOwn$f(source, key = keys[j]) && !hasOwn$f(target, key)) {
	      defineProperty$5(target, key, getOwnPropertyDescriptor$6(source, key));
	    }
	  }
	};
	if (FORCED$n || IS_PURE$1) copyConstructorProperties(path$1[NUMBER], NativeNumber);

	var $$25 = _export;

	// `Number.EPSILON` constant
	// https://tc39.es/ecma262/#sec-number.epsilon
	$$25({ target: 'Number', stat: true, nonConfigurable: true, nonWritable: true }, {
	  EPSILON: Math.pow(2, -52)
	});

	var globalThis$N = globalThis_1;

	var globalIsFinite = globalThis$N.isFinite;

	// `Number.isFinite` method
	// https://tc39.es/ecma262/#sec-number.isfinite
	// eslint-disable-next-line es/no-number-isfinite -- safe
	var numberIsFinite$1 = Number.isFinite || function isFinite(it) {
	  return typeof it == 'number' && globalIsFinite(it);
	};

	var $$24 = _export;
	var numberIsFinite = numberIsFinite$1;

	// `Number.isFinite` method
	// https://tc39.es/ecma262/#sec-number.isfinite
	$$24({ target: 'Number', stat: true }, { isFinite: numberIsFinite });

	var isObject$p = isObject$K;

	var floor$6 = Math.floor;

	// `IsIntegralNumber` abstract operation
	// https://tc39.es/ecma262/#sec-isintegralnumber
	// eslint-disable-next-line es/no-number-isinteger -- safe
	var isIntegralNumber$3 = Number.isInteger || function isInteger(it) {
	  return !isObject$p(it) && isFinite(it) && floor$6(it) === it;
	};

	var $$23 = _export;
	var isIntegralNumber$2 = isIntegralNumber$3;

	// `Number.isInteger` method
	// https://tc39.es/ecma262/#sec-number.isinteger
	$$23({ target: 'Number', stat: true }, {
	  isInteger: isIntegralNumber$2
	});

	var $$22 = _export;

	// `Number.isNaN` method
	// https://tc39.es/ecma262/#sec-number.isnan
	$$22({ target: 'Number', stat: true }, {
	  isNaN: function isNaN(number) {
	    // eslint-disable-next-line no-self-compare -- NaN check
	    return number !== number;
	  }
	});

	var $$21 = _export;
	var isIntegralNumber$1 = isIntegralNumber$3;

	var abs$1 = Math.abs;

	// `Number.isSafeInteger` method
	// https://tc39.es/ecma262/#sec-number.issafeinteger
	$$21({ target: 'Number', stat: true }, {
	  isSafeInteger: function isSafeInteger(number) {
	    return isIntegralNumber$1(number) && abs$1(number) <= 0x1FFFFFFFFFFFFF;
	  }
	});

	var $$20 = _export;

	// `Number.MAX_SAFE_INTEGER` constant
	// https://tc39.es/ecma262/#sec-number.max_safe_integer
	$$20({ target: 'Number', stat: true, nonConfigurable: true, nonWritable: true }, {
	  MAX_SAFE_INTEGER: 0x1FFFFFFFFFFFFF
	});

	var $$1$ = _export;

	// `Number.MIN_SAFE_INTEGER` constant
	// https://tc39.es/ecma262/#sec-number.min_safe_integer
	$$1$({ target: 'Number', stat: true, nonConfigurable: true, nonWritable: true }, {
	  MIN_SAFE_INTEGER: -9007199254740991
	});

	var globalThis$M = globalThis_1;
	var fails$U = fails$1z;
	var uncurryThis$R = functionUncurryThis;
	var toString$t = toString$D;
	var trim$1 = stringTrim.trim;
	var whitespaces$3 = whitespaces$5;

	var charAt$f = uncurryThis$R(''.charAt);
	var $parseFloat$1 = globalThis$M.parseFloat;
	var Symbol$2 = globalThis$M.Symbol;
	var ITERATOR$5 = Symbol$2 && Symbol$2.iterator;
	var FORCED$m = 1 / $parseFloat$1(whitespaces$3 + '-0') !== -Infinity
	  // MS Edge 18- broken with boxed symbols
	  || (ITERATOR$5 && !fails$U(function () { $parseFloat$1(Object(ITERATOR$5)); }));

	// `parseFloat` method
	// https://tc39.es/ecma262/#sec-parsefloat-string
	var numberParseFloat = FORCED$m ? function parseFloat(string) {
	  var trimmedString = trim$1(toString$t(string));
	  var result = $parseFloat$1(trimmedString);
	  return result === 0 && charAt$f(trimmedString, 0) === '-' ? -0 : result;
	} : $parseFloat$1;

	var $$1_ = _export;
	var parseFloat$1 = numberParseFloat;

	// `Number.parseFloat` method
	// https://tc39.es/ecma262/#sec-number.parseFloat
	// eslint-disable-next-line es/no-number-parsefloat -- required for testing
	$$1_({ target: 'Number', stat: true, forced: Number.parseFloat !== parseFloat$1 }, {
	  parseFloat: parseFloat$1
	});

	var globalThis$L = globalThis_1;
	var fails$T = fails$1z;
	var uncurryThis$Q = functionUncurryThis;
	var toString$s = toString$D;
	var trim = stringTrim.trim;
	var whitespaces$2 = whitespaces$5;

	var $parseInt$2 = globalThis$L.parseInt;
	var Symbol$1 = globalThis$L.Symbol;
	var ITERATOR$4 = Symbol$1 && Symbol$1.iterator;
	var hex = /^[+-]?0x/i;
	var exec$9 = uncurryThis$Q(hex.exec);
	var FORCED$l = $parseInt$2(whitespaces$2 + '08') !== 8 || $parseInt$2(whitespaces$2 + '0x16') !== 22
	  // MS Edge 18- broken with boxed symbols
	  || (ITERATOR$4 && !fails$T(function () { $parseInt$2(Object(ITERATOR$4)); }));

	// `parseInt` method
	// https://tc39.es/ecma262/#sec-parseint-string-radix
	var numberParseInt = FORCED$l ? function parseInt(string, radix) {
	  var S = trim(toString$s(string));
	  return $parseInt$2(S, (radix >>> 0) || (exec$9(hex, S) ? 16 : 10));
	} : $parseInt$2;

	var $$1Z = _export;
	var parseInt$3 = numberParseInt;

	// `Number.parseInt` method
	// https://tc39.es/ecma262/#sec-number.parseint
	// eslint-disable-next-line es/no-number-parseint -- required for testing
	$$1Z({ target: 'Number', stat: true, forced: Number.parseInt !== parseInt$3 }, {
	  parseInt: parseInt$3
	});

	var $$1Y = _export;
	var uncurryThis$P = functionUncurryThis;
	var toIntegerOrInfinity$8 = toIntegerOrInfinity$m;
	var thisNumberValue$3 = thisNumberValue$5;
	var $repeat$1 = stringRepeat;
	var log10 = mathLog10;
	var fails$S = fails$1z;

	var $RangeError$5 = RangeError;
	var $String$2 = String;
	var $isFinite = isFinite;
	var abs = Math.abs;
	var floor$5 = Math.floor;
	var pow$2 = Math.pow;
	var round$1 = Math.round;
	var nativeToExponential = uncurryThis$P(1.1.toExponential);
	var repeat$2 = uncurryThis$P($repeat$1);
	var stringSlice$e = uncurryThis$P(''.slice);

	// Edge 17-
	var ROUNDS_PROPERLY = nativeToExponential(-69e-12, 4) === '-6.9000e-11'
	  // IE11- && Edge 14-
	  && nativeToExponential(1.255, 2) === '1.25e+0'
	  // FF86-, V8 ~ Chrome 49-50
	  && nativeToExponential(12345, 3) === '1.235e+4'
	  // FF86-, V8 ~ Chrome 49-50
	  && nativeToExponential(25, 0) === '3e+1';

	// IE8-
	var throwsOnInfinityFraction = function () {
	  return fails$S(function () {
	    nativeToExponential(1, Infinity);
	  }) && fails$S(function () {
	    nativeToExponential(1, -Infinity);
	  });
	};

	// Safari <11 && FF <50
	var properNonFiniteThisCheck = function () {
	  return !fails$S(function () {
	    nativeToExponential(Infinity, Infinity);
	    nativeToExponential(NaN, Infinity);
	  });
	};

	var FORCED$k = !ROUNDS_PROPERLY || !throwsOnInfinityFraction() || !properNonFiniteThisCheck();

	// `Number.prototype.toExponential` method
	// https://tc39.es/ecma262/#sec-number.prototype.toexponential
	$$1Y({ target: 'Number', proto: true, forced: FORCED$k }, {
	  toExponential: function toExponential(fractionDigits) {
	    var x = thisNumberValue$3(this);
	    if (fractionDigits === undefined) return nativeToExponential(x);
	    var f = toIntegerOrInfinity$8(fractionDigits);
	    if (!$isFinite(x)) return String(x);
	    // TODO: ES2018 increased the maximum number of fraction digits to 100, need to improve the implementation
	    if (f < 0 || f > 20) throw new $RangeError$5('Incorrect fraction digits');
	    if (ROUNDS_PROPERLY) return nativeToExponential(x, f);
	    var s = '';
	    var m, e, c, d;
	    if (x < 0) {
	      s = '-';
	      x = -x;
	    }
	    if (x === 0) {
	      e = 0;
	      m = repeat$2('0', f + 1);
	    } else {
	      // this block is based on https://gist.github.com/SheetJSDev/1100ad56b9f856c95299ed0e068eea08
	      // TODO: improve accuracy with big fraction digits
	      var l = log10(x);
	      e = floor$5(l);
	      var w = pow$2(10, e - f);
	      var n = round$1(x / w);
	      if (2 * x >= (2 * n + 1) * w) {
	        n += 1;
	      }
	      if (n >= pow$2(10, f + 1)) {
	        n /= 10;
	        e += 1;
	      }
	      m = $String$2(n);
	    }
	    if (f !== 0) {
	      m = stringSlice$e(m, 0, 1) + '.' + stringSlice$e(m, 1);
	    }
	    if (e === 0) {
	      c = '+';
	      d = '0';
	    } else {
	      c = e > 0 ? '+' : '-';
	      d = $String$2(abs(e));
	    }
	    m += 'e' + c + d;
	    return s + m;
	  }
	});

	var $$1X = _export;
	var uncurryThis$O = functionUncurryThis;
	var toIntegerOrInfinity$7 = toIntegerOrInfinity$m;
	var thisNumberValue$2 = thisNumberValue$5;
	var $repeat = stringRepeat;
	var fails$R = fails$1z;

	var $RangeError$4 = RangeError;
	var $String$1 = String;
	var floor$4 = Math.floor;
	var repeat$1 = uncurryThis$O($repeat);
	var stringSlice$d = uncurryThis$O(''.slice);
	var nativeToFixed = uncurryThis$O(1.1.toFixed);

	var pow$1 = function (x, n, acc) {
	  return n === 0 ? acc : n % 2 === 1 ? pow$1(x, n - 1, acc * x) : pow$1(x * x, n / 2, acc);
	};

	var log = function (x) {
	  var n = 0;
	  var x2 = x;
	  while (x2 >= 4096) {
	    n += 12;
	    x2 /= 4096;
	  }
	  while (x2 >= 2) {
	    n += 1;
	    x2 /= 2;
	  } return n;
	};

	var multiply = function (data, n, c) {
	  var index = -1;
	  var c2 = c;
	  while (++index < 6) {
	    c2 += n * data[index];
	    data[index] = c2 % 1e7;
	    c2 = floor$4(c2 / 1e7);
	  }
	};

	var divide = function (data, n) {
	  var index = 6;
	  var c = 0;
	  while (--index >= 0) {
	    c += data[index];
	    data[index] = floor$4(c / n);
	    c = (c % n) * 1e7;
	  }
	};

	var dataToString = function (data) {
	  var index = 6;
	  var s = '';
	  while (--index >= 0) {
	    if (s !== '' || index === 0 || data[index] !== 0) {
	      var t = $String$1(data[index]);
	      s = s === '' ? t : s + repeat$1('0', 7 - t.length) + t;
	    }
	  } return s;
	};

	var FORCED$j = fails$R(function () {
	  return nativeToFixed(0.00008, 3) !== '0.000' ||
	    nativeToFixed(0.9, 0) !== '1' ||
	    nativeToFixed(1.255, 2) !== '1.25' ||
	    nativeToFixed(1000000000000000128.0, 0) !== '1000000000000000128';
	}) || !fails$R(function () {
	  // V8 ~ Android 4.3-
	  nativeToFixed({});
	});

	// `Number.prototype.toFixed` method
	// https://tc39.es/ecma262/#sec-number.prototype.tofixed
	$$1X({ target: 'Number', proto: true, forced: FORCED$j }, {
	  toFixed: function toFixed(fractionDigits) {
	    var number = thisNumberValue$2(this);
	    var fractDigits = toIntegerOrInfinity$7(fractionDigits);
	    var data = [0, 0, 0, 0, 0, 0];
	    var sign = '';
	    var result = '0';
	    var e, z, j, k;

	    // TODO: ES2018 increased the maximum number of fraction digits to 100, need to improve the implementation
	    if (fractDigits < 0 || fractDigits > 20) throw new $RangeError$4('Incorrect fraction digits');
	    // eslint-disable-next-line no-self-compare -- NaN check
	    if (number !== number) return 'NaN';
	    if (number <= -1e21 || number >= 1e21) return $String$1(number);
	    if (number < 0) {
	      sign = '-';
	      number = -number;
	    }
	    if (number > 1e-21) {
	      e = log(number * pow$1(2, 69, 1)) - 69;
	      z = e < 0 ? number * pow$1(2, -e, 1) : number / pow$1(2, e, 1);
	      z *= 0x10000000000000;
	      e = 52 - e;
	      if (e > 0) {
	        multiply(data, 0, z);
	        j = fractDigits;
	        while (j >= 7) {
	          multiply(data, 1e7, 0);
	          j -= 7;
	        }
	        multiply(data, pow$1(10, j, 1), 0);
	        j = e - 1;
	        while (j >= 23) {
	          divide(data, 1 << 23);
	          j -= 23;
	        }
	        divide(data, 1 << j);
	        multiply(data, 1, 1);
	        divide(data, 2);
	        result = dataToString(data);
	      } else {
	        multiply(data, 0, z);
	        multiply(data, 1 << -e, 0);
	        result = dataToString(data) + repeat$1('0', fractDigits);
	      }
	    }
	    if (fractDigits > 0) {
	      k = result.length;
	      result = sign + (k <= fractDigits
	        ? '0.' + repeat$1('0', fractDigits - k) + result
	        : stringSlice$d(result, 0, k - fractDigits) + '.' + stringSlice$d(result, k - fractDigits));
	    } else {
	      result = sign + result;
	    } return result;
	  }
	});

	var $$1W = _export;
	var uncurryThis$N = functionUncurryThis;
	var fails$Q = fails$1z;
	var thisNumberValue$1 = thisNumberValue$5;

	var nativeToPrecision = uncurryThis$N(1.1.toPrecision);

	var FORCED$i = fails$Q(function () {
	  // IE7-
	  return nativeToPrecision(1, undefined) !== '1';
	}) || !fails$Q(function () {
	  // V8 ~ Android 4.3-
	  nativeToPrecision({});
	});

	// `Number.prototype.toPrecision` method
	// https://tc39.es/ecma262/#sec-number.prototype.toprecision
	$$1W({ target: 'Number', proto: true, forced: FORCED$i }, {
	  toPrecision: function toPrecision(precision) {
	    return precision === undefined
	      ? nativeToPrecision(thisNumberValue$1(this))
	      : nativeToPrecision(thisNumberValue$1(this), precision);
	  }
	});

	var DESCRIPTORS$s = descriptors;
	var uncurryThis$M = functionUncurryThis;
	var call$y = functionCall;
	var fails$P = fails$1z;
	var objectKeys$2 = objectKeys$5;
	var getOwnPropertySymbolsModule = objectGetOwnPropertySymbols;
	var propertyIsEnumerableModule = objectPropertyIsEnumerable;
	var toObject$b = toObject$v;
	var IndexedObject = indexedObject;

	// eslint-disable-next-line es/no-object-assign -- safe
	var $assign = Object.assign;
	// eslint-disable-next-line es/no-object-defineproperty -- required for testing
	var defineProperty$4 = Object.defineProperty;
	var concat$1 = uncurryThis$M([].concat);

	// `Object.assign` method
	// https://tc39.es/ecma262/#sec-object.assign
	var objectAssign = !$assign || fails$P(function () {
	  // should have correct order of operations (Edge bug)
	  if (DESCRIPTORS$s && $assign({ b: 1 }, $assign(defineProperty$4({}, 'a', {
	    enumerable: true,
	    get: function () {
	      defineProperty$4(this, 'b', {
	        value: 3,
	        enumerable: false
	      });
	    }
	  }), { b: 2 })).b !== 1) return true;
	  // should work with symbols and should have deterministic property order (V8 bug)
	  var A = {};
	  var B = {};
	  // eslint-disable-next-line es/no-symbol -- safe
	  var symbol = Symbol('assign detection');
	  var alphabet = 'abcdefghijklmnopqrst';
	  A[symbol] = 7;
	  // eslint-disable-next-line es/no-array-prototype-foreach -- safe
	  alphabet.split('').forEach(function (chr) { B[chr] = chr; });
	  return $assign({}, A)[symbol] !== 7 || objectKeys$2($assign({}, B)).join('') !== alphabet;
	}) ? function assign(target, source) { // eslint-disable-line no-unused-vars -- required for `.length`
	  var T = toObject$b(target);
	  var argumentsLength = arguments.length;
	  var index = 1;
	  var getOwnPropertySymbols = getOwnPropertySymbolsModule.f;
	  var propertyIsEnumerable = propertyIsEnumerableModule.f;
	  while (argumentsLength > index) {
	    var S = IndexedObject(arguments[index++]);
	    var keys = getOwnPropertySymbols ? concat$1(objectKeys$2(S), getOwnPropertySymbols(S)) : objectKeys$2(S);
	    var length = keys.length;
	    var j = 0;
	    var key;
	    while (length > j) {
	      key = keys[j++];
	      if (!DESCRIPTORS$s || call$y(propertyIsEnumerable, S, key)) T[key] = S[key];
	    }
	  } return T;
	} : $assign;

	var $$1V = _export;
	var assign$1 = objectAssign;

	// `Object.assign` method
	// https://tc39.es/ecma262/#sec-object.assign
	// eslint-disable-next-line es/no-object-assign -- required for testing
	$$1V({ target: 'Object', stat: true, arity: 2, forced: Object.assign !== assign$1 }, {
	  assign: assign$1
	});

	// TODO: Remove from `core-js@4`
	var $$1U = _export;
	var DESCRIPTORS$r = descriptors;
	var create$8 = objectCreate;

	// `Object.create` method
	// https://tc39.es/ecma262/#sec-object.create
	$$1U({ target: 'Object', stat: true, sham: !DESCRIPTORS$r }, {
	  create: create$8
	});

	var globalThis$K = globalThis_1;
	var fails$O = fails$1z;
	var WEBKIT$1 = environmentWebkitVersion;

	// Forced replacement object prototype accessors methods
	var objectPrototypeAccessorsForced = !fails$O(function () {
	  // This feature detection crashes old WebKit
	  // https://github.com/zloirock/core-js/issues/232
	  if (WEBKIT$1 && WEBKIT$1 < 535) return;
	  var key = Math.random();
	  // In FF throws only define methods
	  __defineSetter__.call(null, key, function () { /* empty */ });
	  delete globalThis$K[key];
	});

	var $$1T = _export;
	var DESCRIPTORS$q = descriptors;
	var FORCED$h = objectPrototypeAccessorsForced;
	var aCallable$g = aCallable$B;
	var toObject$a = toObject$v;
	var definePropertyModule$4 = objectDefineProperty;

	// `Object.prototype.__defineGetter__` method
	// https://tc39.es/ecma262/#sec-object.prototype.__defineGetter__
	if (DESCRIPTORS$q) {
	  $$1T({ target: 'Object', proto: true, forced: FORCED$h }, {
	    __defineGetter__: function __defineGetter__(P, getter) {
	      definePropertyModule$4.f(toObject$a(this), P, { get: aCallable$g(getter), enumerable: true, configurable: true });
	    }
	  });
	}

	var $$1S = _export;
	var DESCRIPTORS$p = descriptors;
	var defineProperties = objectDefineProperties.f;

	// `Object.defineProperties` method
	// https://tc39.es/ecma262/#sec-object.defineproperties
	// eslint-disable-next-line es/no-object-defineproperties -- safe
	$$1S({ target: 'Object', stat: true, forced: Object.defineProperties !== defineProperties, sham: !DESCRIPTORS$p }, {
	  defineProperties: defineProperties
	});

	var $$1R = _export;
	var DESCRIPTORS$o = descriptors;
	var defineProperty$3 = objectDefineProperty.f;

	// `Object.defineProperty` method
	// https://tc39.es/ecma262/#sec-object.defineproperty
	// eslint-disable-next-line es/no-object-defineproperty -- safe
	$$1R({ target: 'Object', stat: true, forced: Object.defineProperty !== defineProperty$3, sham: !DESCRIPTORS$o }, {
	  defineProperty: defineProperty$3
	});

	var $$1Q = _export;
	var DESCRIPTORS$n = descriptors;
	var FORCED$g = objectPrototypeAccessorsForced;
	var aCallable$f = aCallable$B;
	var toObject$9 = toObject$v;
	var definePropertyModule$3 = objectDefineProperty;

	// `Object.prototype.__defineSetter__` method
	// https://tc39.es/ecma262/#sec-object.prototype.__defineSetter__
	if (DESCRIPTORS$n) {
	  $$1Q({ target: 'Object', proto: true, forced: FORCED$g }, {
	    __defineSetter__: function __defineSetter__(P, setter) {
	      definePropertyModule$3.f(toObject$9(this), P, { set: aCallable$f(setter), enumerable: true, configurable: true });
	    }
	  });
	}

	var DESCRIPTORS$m = descriptors;
	var fails$N = fails$1z;
	var uncurryThis$L = functionUncurryThis;
	var objectGetPrototypeOf$1 = objectGetPrototypeOf$2;
	var objectKeys$1 = objectKeys$5;
	var toIndexedObject$4 = toIndexedObject$j;
	var $propertyIsEnumerable = objectPropertyIsEnumerable.f;

	var propertyIsEnumerable = uncurryThis$L($propertyIsEnumerable);
	var push$a = uncurryThis$L([].push);

	// in some IE versions, `propertyIsEnumerable` returns incorrect result on integer keys
	// of `null` prototype objects
	var IE_BUG = DESCRIPTORS$m && fails$N(function () {
	  // eslint-disable-next-line es/no-object-create -- safe
	  var O = Object.create(null);
	  O[2] = 2;
	  return !propertyIsEnumerable(O, 2);
	});

	// `Object.{ entries, values }` methods implementation
	var createMethod$2 = function (TO_ENTRIES) {
	  return function (it) {
	    var O = toIndexedObject$4(it);
	    var keys = objectKeys$1(O);
	    var IE_WORKAROUND = IE_BUG && objectGetPrototypeOf$1(O) === null;
	    var length = keys.length;
	    var i = 0;
	    var result = [];
	    var key;
	    while (length > i) {
	      key = keys[i++];
	      if (!DESCRIPTORS$m || (IE_WORKAROUND ? key in O : propertyIsEnumerable(O, key))) {
	        push$a(result, TO_ENTRIES ? [key, O[key]] : O[key]);
	      }
	    }
	    return result;
	  };
	};

	var objectToArray = {
	  // `Object.entries` method
	  // https://tc39.es/ecma262/#sec-object.entries
	  entries: createMethod$2(true),
	  // `Object.values` method
	  // https://tc39.es/ecma262/#sec-object.values
	  values: createMethod$2(false)
	};

	var $$1P = _export;
	var $entries = objectToArray.entries;

	// `Object.entries` method
	// https://tc39.es/ecma262/#sec-object.entries
	$$1P({ target: 'Object', stat: true }, {
	  entries: function entries(O) {
	    return $entries(O);
	  }
	});

	var $$1O = _export;
	var FREEZING$4 = freezing;
	var fails$M = fails$1z;
	var isObject$o = isObject$K;
	var onFreeze$2 = internalMetadataExports.onFreeze;

	// eslint-disable-next-line es/no-object-freeze -- safe
	var $freeze = Object.freeze;
	var FAILS_ON_PRIMITIVES$5 = fails$M(function () { $freeze(1); });

	// `Object.freeze` method
	// https://tc39.es/ecma262/#sec-object.freeze
	$$1O({ target: 'Object', stat: true, forced: FAILS_ON_PRIMITIVES$5, sham: !FREEZING$4 }, {
	  freeze: function freeze(it) {
	    return $freeze && isObject$o(it) ? $freeze(onFreeze$2(it)) : it;
	  }
	});

	var $$1N = _export;
	var iterate$9 = iterate$l;
	var createProperty$2 = createProperty$9;

	// `Object.fromEntries` method
	// https://tc39.es/ecma262/#sec-object.fromentries
	$$1N({ target: 'Object', stat: true }, {
	  fromEntries: function fromEntries(iterable) {
	    var obj = {};
	    iterate$9(iterable, function (k, v) {
	      createProperty$2(obj, k, v);
	    }, { AS_ENTRIES: true });
	    return obj;
	  }
	});

	var $$1M = _export;
	var fails$L = fails$1z;
	var toIndexedObject$3 = toIndexedObject$j;
	var nativeGetOwnPropertyDescriptor$1 = objectGetOwnPropertyDescriptor.f;
	var DESCRIPTORS$l = descriptors;

	var FORCED$f = !DESCRIPTORS$l || fails$L(function () { nativeGetOwnPropertyDescriptor$1(1); });

	// `Object.getOwnPropertyDescriptor` method
	// https://tc39.es/ecma262/#sec-object.getownpropertydescriptor
	$$1M({ target: 'Object', stat: true, forced: FORCED$f, sham: !DESCRIPTORS$l }, {
	  getOwnPropertyDescriptor: function getOwnPropertyDescriptor(it, key) {
	    return nativeGetOwnPropertyDescriptor$1(toIndexedObject$3(it), key);
	  }
	});

	var $$1L = _export;
	var DESCRIPTORS$k = descriptors;
	var ownKeys$1 = ownKeys$3;
	var toIndexedObject$2 = toIndexedObject$j;
	var getOwnPropertyDescriptorModule$4 = objectGetOwnPropertyDescriptor;
	var createProperty$1 = createProperty$9;

	// `Object.getOwnPropertyDescriptors` method
	// https://tc39.es/ecma262/#sec-object.getownpropertydescriptors
	$$1L({ target: 'Object', stat: true, sham: !DESCRIPTORS$k }, {
	  getOwnPropertyDescriptors: function getOwnPropertyDescriptors(object) {
	    var O = toIndexedObject$2(object);
	    var getOwnPropertyDescriptor = getOwnPropertyDescriptorModule$4.f;
	    var keys = ownKeys$1(O);
	    var result = {};
	    var index = 0;
	    var key, descriptor;
	    while (keys.length > index) {
	      descriptor = getOwnPropertyDescriptor(O, key = keys[index++]);
	      if (descriptor !== undefined) createProperty$1(result, key, descriptor);
	    }
	    return result;
	  }
	});

	var $$1K = _export;
	var fails$K = fails$1z;
	var getOwnPropertyNames$2 = objectGetOwnPropertyNamesExternal.f;

	// eslint-disable-next-line es/no-object-getownpropertynames -- required for testing
	var FAILS_ON_PRIMITIVES$4 = fails$K(function () { return !Object.getOwnPropertyNames(1); });

	// `Object.getOwnPropertyNames` method
	// https://tc39.es/ecma262/#sec-object.getownpropertynames
	$$1K({ target: 'Object', stat: true, forced: FAILS_ON_PRIMITIVES$4 }, {
	  getOwnPropertyNames: getOwnPropertyNames$2
	});

	var $$1J = _export;
	var fails$J = fails$1z;
	var toObject$8 = toObject$v;
	var nativeGetPrototypeOf = objectGetPrototypeOf$2;
	var CORRECT_PROTOTYPE_GETTER$1 = correctPrototypeGetter;

	var FAILS_ON_PRIMITIVES$3 = fails$J(function () { nativeGetPrototypeOf(1); });

	// `Object.getPrototypeOf` method
	// https://tc39.es/ecma262/#sec-object.getprototypeof
	$$1J({ target: 'Object', stat: true, forced: FAILS_ON_PRIMITIVES$3, sham: !CORRECT_PROTOTYPE_GETTER$1 }, {
	  getPrototypeOf: function getPrototypeOf(it) {
	    return nativeGetPrototypeOf(toObject$8(it));
	  }
	});

	var $$1I = _export;
	var getBuiltIn$m = getBuiltIn$B;
	var uncurryThis$K = functionUncurryThis;
	var aCallable$e = aCallable$B;
	var requireObjectCoercible$g = requireObjectCoercible$o;
	var toPropertyKey$4 = toPropertyKey$8;
	var iterate$8 = iterate$l;
	var fails$I = fails$1z;

	// eslint-disable-next-line es/no-object-groupby -- testing
	var nativeGroupBy = Object.groupBy;
	var create$7 = getBuiltIn$m('Object', 'create');
	var push$9 = uncurryThis$K([].push);

	// https://bugs.webkit.org/show_bug.cgi?id=271524
	var DOES_NOT_WORK_WITH_PRIMITIVES = !nativeGroupBy || fails$I(function () {
	  return nativeGroupBy('ab', function (it) {
	    return it;
	  }).a.length !== 1;
	});

	// `Object.groupBy` method
	// https://tc39.es/ecma262/#sec-object.groupby
	$$1I({ target: 'Object', stat: true, forced: DOES_NOT_WORK_WITH_PRIMITIVES }, {
	  groupBy: function groupBy(items, callbackfn) {
	    requireObjectCoercible$g(items);
	    aCallable$e(callbackfn);
	    var obj = create$7(null);
	    var k = 0;
	    iterate$8(items, function (value) {
	      var key = toPropertyKey$4(callbackfn(value, k++));
	      // in some IE versions, `hasOwnProperty` returns incorrect result on integer keys
	      // but since it's a `null` prototype object, we can safely use `in`
	      if (key in obj) push$9(obj[key], value);
	      else obj[key] = [value];
	    });
	    return obj;
	  }
	});

	var $$1H = _export;
	var hasOwn$e = hasOwnProperty_1;

	// `Object.hasOwn` method
	// https://tc39.es/ecma262/#sec-object.hasown
	$$1H({ target: 'Object', stat: true }, {
	  hasOwn: hasOwn$e
	});

	// `SameValue` abstract operation
	// https://tc39.es/ecma262/#sec-samevalue
	// eslint-disable-next-line es/no-object-is -- safe
	var sameValue$1 = Object.is || function is(x, y) {
	  // eslint-disable-next-line no-self-compare -- NaN check
	  return x === y ? x !== 0 || 1 / x === 1 / y : x !== x && y !== y;
	};

	var $$1G = _export;
	var is = sameValue$1;

	// `Object.is` method
	// https://tc39.es/ecma262/#sec-object.is
	$$1G({ target: 'Object', stat: true }, {
	  is: is
	});

	var $$1F = _export;
	var $isExtensible$1 = objectIsExtensible;

	// `Object.isExtensible` method
	// https://tc39.es/ecma262/#sec-object.isextensible
	// eslint-disable-next-line es/no-object-isextensible -- safe
	$$1F({ target: 'Object', stat: true, forced: Object.isExtensible !== $isExtensible$1 }, {
	  isExtensible: $isExtensible$1
	});

	var $$1E = _export;
	var fails$H = fails$1z;
	var isObject$n = isObject$K;
	var classof$c = classofRaw$2;
	var ARRAY_BUFFER_NON_EXTENSIBLE$1 = arrayBufferNonExtensible;

	// eslint-disable-next-line es/no-object-isfrozen -- safe
	var $isFrozen = Object.isFrozen;

	var FORCED$e = ARRAY_BUFFER_NON_EXTENSIBLE$1 || fails$H(function () { $isFrozen(1); });

	// `Object.isFrozen` method
	// https://tc39.es/ecma262/#sec-object.isfrozen
	$$1E({ target: 'Object', stat: true, forced: FORCED$e }, {
	  isFrozen: function isFrozen(it) {
	    if (!isObject$n(it)) return true;
	    if (ARRAY_BUFFER_NON_EXTENSIBLE$1 && classof$c(it) === 'ArrayBuffer') return true;
	    return $isFrozen ? $isFrozen(it) : false;
	  }
	});

	var $$1D = _export;
	var fails$G = fails$1z;
	var isObject$m = isObject$K;
	var classof$b = classofRaw$2;
	var ARRAY_BUFFER_NON_EXTENSIBLE = arrayBufferNonExtensible;

	// eslint-disable-next-line es/no-object-issealed -- safe
	var $isSealed = Object.isSealed;

	var FORCED$d = ARRAY_BUFFER_NON_EXTENSIBLE || fails$G(function () { $isSealed(1); });

	// `Object.isSealed` method
	// https://tc39.es/ecma262/#sec-object.issealed
	$$1D({ target: 'Object', stat: true, forced: FORCED$d }, {
	  isSealed: function isSealed(it) {
	    if (!isObject$m(it)) return true;
	    if (ARRAY_BUFFER_NON_EXTENSIBLE && classof$b(it) === 'ArrayBuffer') return true;
	    return $isSealed ? $isSealed(it) : false;
	  }
	});

	var $$1C = _export;
	var toObject$7 = toObject$v;
	var nativeKeys = objectKeys$5;
	var fails$F = fails$1z;

	var FAILS_ON_PRIMITIVES$2 = fails$F(function () { nativeKeys(1); });

	// `Object.keys` method
	// https://tc39.es/ecma262/#sec-object.keys
	$$1C({ target: 'Object', stat: true, forced: FAILS_ON_PRIMITIVES$2 }, {
	  keys: function keys(it) {
	    return nativeKeys(toObject$7(it));
	  }
	});

	var $$1B = _export;
	var DESCRIPTORS$j = descriptors;
	var FORCED$c = objectPrototypeAccessorsForced;
	var toObject$6 = toObject$v;
	var toPropertyKey$3 = toPropertyKey$8;
	var getPrototypeOf$5 = objectGetPrototypeOf$2;
	var getOwnPropertyDescriptor$5 = objectGetOwnPropertyDescriptor.f;

	// `Object.prototype.__lookupGetter__` method
	// https://tc39.es/ecma262/#sec-object.prototype.__lookupGetter__
	if (DESCRIPTORS$j) {
	  $$1B({ target: 'Object', proto: true, forced: FORCED$c }, {
	    __lookupGetter__: function __lookupGetter__(P) {
	      var O = toObject$6(this);
	      var key = toPropertyKey$3(P);
	      var desc;
	      do {
	        if (desc = getOwnPropertyDescriptor$5(O, key)) return desc.get;
	      } while (O = getPrototypeOf$5(O));
	    }
	  });
	}

	var $$1A = _export;
	var DESCRIPTORS$i = descriptors;
	var FORCED$b = objectPrototypeAccessorsForced;
	var toObject$5 = toObject$v;
	var toPropertyKey$2 = toPropertyKey$8;
	var getPrototypeOf$4 = objectGetPrototypeOf$2;
	var getOwnPropertyDescriptor$4 = objectGetOwnPropertyDescriptor.f;

	// `Object.prototype.__lookupSetter__` method
	// https://tc39.es/ecma262/#sec-object.prototype.__lookupSetter__
	if (DESCRIPTORS$i) {
	  $$1A({ target: 'Object', proto: true, forced: FORCED$b }, {
	    __lookupSetter__: function __lookupSetter__(P) {
	      var O = toObject$5(this);
	      var key = toPropertyKey$2(P);
	      var desc;
	      do {
	        if (desc = getOwnPropertyDescriptor$4(O, key)) return desc.set;
	      } while (O = getPrototypeOf$4(O));
	    }
	  });
	}

	var $$1z = _export;
	var isObject$l = isObject$K;
	var onFreeze$1 = internalMetadataExports.onFreeze;
	var FREEZING$3 = freezing;
	var fails$E = fails$1z;

	// eslint-disable-next-line es/no-object-preventextensions -- safe
	var $preventExtensions = Object.preventExtensions;
	var FAILS_ON_PRIMITIVES$1 = fails$E(function () { $preventExtensions(1); });

	// `Object.preventExtensions` method
	// https://tc39.es/ecma262/#sec-object.preventextensions
	$$1z({ target: 'Object', stat: true, forced: FAILS_ON_PRIMITIVES$1, sham: !FREEZING$3 }, {
	  preventExtensions: function preventExtensions(it) {
	    return $preventExtensions && isObject$l(it) ? $preventExtensions(onFreeze$1(it)) : it;
	  }
	});

	var DESCRIPTORS$h = descriptors;
	var defineBuiltInAccessor$a = defineBuiltInAccessor$l;
	var isObject$k = isObject$K;
	var isPossiblePrototype = isPossiblePrototype$2;
	var toObject$4 = toObject$v;
	var requireObjectCoercible$f = requireObjectCoercible$o;

	// eslint-disable-next-line es/no-object-getprototypeof -- safe
	var getPrototypeOf$3 = Object.getPrototypeOf;
	// eslint-disable-next-line es/no-object-setprototypeof -- safe
	var setPrototypeOf$3 = Object.setPrototypeOf;
	var ObjectPrototype$1 = Object.prototype;
	var PROTO = '__proto__';

	// `Object.prototype.__proto__` accessor
	// https://tc39.es/ecma262/#sec-object.prototype.__proto__
	if (DESCRIPTORS$h && getPrototypeOf$3 && setPrototypeOf$3 && !(PROTO in ObjectPrototype$1)) try {
	  defineBuiltInAccessor$a(ObjectPrototype$1, PROTO, {
	    configurable: true,
	    get: function __proto__() {
	      return getPrototypeOf$3(toObject$4(this));
	    },
	    set: function __proto__(proto) {
	      var O = requireObjectCoercible$f(this);
	      if (isPossiblePrototype(proto) && isObject$k(O)) {
	        setPrototypeOf$3(O, proto);
	      }
	    }
	  });
	} catch (error) { /* empty */ }

	var $$1y = _export;
	var isObject$j = isObject$K;
	var onFreeze = internalMetadataExports.onFreeze;
	var FREEZING$2 = freezing;
	var fails$D = fails$1z;

	// eslint-disable-next-line es/no-object-seal -- safe
	var $seal = Object.seal;
	var FAILS_ON_PRIMITIVES = fails$D(function () { $seal(1); });

	// `Object.seal` method
	// https://tc39.es/ecma262/#sec-object.seal
	$$1y({ target: 'Object', stat: true, forced: FAILS_ON_PRIMITIVES, sham: !FREEZING$2 }, {
	  seal: function seal(it) {
	    return $seal && isObject$j(it) ? $seal(onFreeze(it)) : it;
	  }
	});

	var $$1x = _export;
	var setPrototypeOf$2 = objectSetPrototypeOf$1;

	// `Object.setPrototypeOf` method
	// https://tc39.es/ecma262/#sec-object.setprototypeof
	$$1x({ target: 'Object', stat: true }, {
	  setPrototypeOf: setPrototypeOf$2
	});

	var TO_STRING_TAG_SUPPORT$1 = toStringTagSupport;
	var classof$a = classof$p;

	// `Object.prototype.toString` method implementation
	// https://tc39.es/ecma262/#sec-object.prototype.tostring
	var objectToString = TO_STRING_TAG_SUPPORT$1 ? {}.toString : function toString() {
	  return '[object ' + classof$a(this) + ']';
	};

	var TO_STRING_TAG_SUPPORT = toStringTagSupport;
	var defineBuiltIn$f = defineBuiltIn$t;
	var toString$r = objectToString;

	// `Object.prototype.toString` method
	// https://tc39.es/ecma262/#sec-object.prototype.tostring
	if (!TO_STRING_TAG_SUPPORT) {
	  defineBuiltIn$f(Object.prototype, 'toString', toString$r, { unsafe: true });
	}

	var $$1w = _export;
	var $values = objectToArray.values;

	// `Object.values` method
	// https://tc39.es/ecma262/#sec-object.values
	$$1w({ target: 'Object', stat: true }, {
	  values: function values(O) {
	    return $values(O);
	  }
	});

	var $$1v = _export;
	var $parseFloat = numberParseFloat;

	// `parseFloat` method
	// https://tc39.es/ecma262/#sec-parsefloat-string
	$$1v({ global: true, forced: parseFloat !== $parseFloat }, {
	  parseFloat: $parseFloat
	});

	var $$1u = _export;
	var $parseInt$1 = numberParseInt;

	// `parseInt` method
	// https://tc39.es/ecma262/#sec-parseint-string-radix
	$$1u({ global: true, forced: parseInt !== $parseInt$1 }, {
	  parseInt: $parseInt$1
	});

	var isConstructor$2 = isConstructor$7;
	var tryToString = tryToString$7;

	var $TypeError$f = TypeError;

	// `Assert: IsConstructor(argument) is true`
	var aConstructor$3 = function (argument) {
	  if (isConstructor$2(argument)) return argument;
	  throw new $TypeError$f(tryToString(argument) + ' is not a constructor');
	};

	var anObject$t = anObject$U;
	var aConstructor$2 = aConstructor$3;
	var isNullOrUndefined$2 = isNullOrUndefined$9;
	var wellKnownSymbol$h = wellKnownSymbol$K;

	var SPECIES$2 = wellKnownSymbol$h('species');

	// `SpeciesConstructor` abstract operation
	// https://tc39.es/ecma262/#sec-speciesconstructor
	var speciesConstructor$4 = function (O, defaultConstructor) {
	  var C = anObject$t(O).constructor;
	  var S;
	  return C === undefined || isNullOrUndefined$2(S = anObject$t(C)[SPECIES$2]) ? defaultConstructor : aConstructor$2(S);
	};

	var $TypeError$e = TypeError;

	var validateArgumentsLength$c = function (passed, required) {
	  if (passed < required) throw new $TypeError$e('Not enough arguments');
	  return passed;
	};

	var userAgent$3 = environmentUserAgent;

	// eslint-disable-next-line redos/no-vulnerable -- safe
	var environmentIsIos = /(?:ipad|iphone|ipod).*applewebkit/i.test(userAgent$3);

	var globalThis$J = globalThis_1;
	var apply$6 = functionApply$1;
	var bind$7 = functionBindContext;
	var isCallable$c = isCallable$A;
	var hasOwn$d = hasOwnProperty_1;
	var fails$C = fails$1z;
	var html = html$2;
	var arraySlice$4 = arraySlice$a;
	var createElement = documentCreateElement$2;
	var validateArgumentsLength$b = validateArgumentsLength$c;
	var IS_IOS$1 = environmentIsIos;
	var IS_NODE$2 = environmentIsNode;

	var set$1 = globalThis$J.setImmediate;
	var clear = globalThis$J.clearImmediate;
	var process$2 = globalThis$J.process;
	var Dispatch = globalThis$J.Dispatch;
	var Function$2 = globalThis$J.Function;
	var MessageChannel = globalThis$J.MessageChannel;
	var String$1 = globalThis$J.String;
	var counter = 0;
	var queue$2 = {};
	var ONREADYSTATECHANGE = 'onreadystatechange';
	var $location, defer, channel, port;

	fails$C(function () {
	  // Deno throws a ReferenceError on `location` access without `--location` flag
	  $location = globalThis$J.location;
	});

	var run = function (id) {
	  if (hasOwn$d(queue$2, id)) {
	    var fn = queue$2[id];
	    delete queue$2[id];
	    fn();
	  }
	};

	var runner = function (id) {
	  return function () {
	    run(id);
	  };
	};

	var eventListener = function (event) {
	  run(event.data);
	};

	var globalPostMessageDefer = function (id) {
	  // old engines have not location.origin
	  globalThis$J.postMessage(String$1(id), $location.protocol + '//' + $location.host);
	};

	// Node.js 0.9+ & IE10+ has setImmediate, otherwise:
	if (!set$1 || !clear) {
	  set$1 = function setImmediate(handler) {
	    validateArgumentsLength$b(arguments.length, 1);
	    var fn = isCallable$c(handler) ? handler : Function$2(handler);
	    var args = arraySlice$4(arguments, 1);
	    queue$2[++counter] = function () {
	      apply$6(fn, undefined, args);
	    };
	    defer(counter);
	    return counter;
	  };
	  clear = function clearImmediate(id) {
	    delete queue$2[id];
	  };
	  // Node.js 0.8-
	  if (IS_NODE$2) {
	    defer = function (id) {
	      process$2.nextTick(runner(id));
	    };
	  // Sphere (JS game engine) Dispatch API
	  } else if (Dispatch && Dispatch.now) {
	    defer = function (id) {
	      Dispatch.now(runner(id));
	    };
	  // Browsers with MessageChannel, includes WebWorkers
	  // except iOS - https://github.com/zloirock/core-js/issues/624
	  } else if (MessageChannel && !IS_IOS$1) {
	    channel = new MessageChannel();
	    port = channel.port2;
	    channel.port1.onmessage = eventListener;
	    defer = bind$7(port.postMessage, port);
	  // Browsers with postMessage, skip WebWorkers
	  // IE8 has postMessage, but it's sync & typeof its postMessage is 'object'
	  } else if (
	    globalThis$J.addEventListener &&
	    isCallable$c(globalThis$J.postMessage) &&
	    !globalThis$J.importScripts &&
	    $location && $location.protocol !== 'file:' &&
	    !fails$C(globalPostMessageDefer)
	  ) {
	    defer = globalPostMessageDefer;
	    globalThis$J.addEventListener('message', eventListener, false);
	  // IE8-
	  } else if (ONREADYSTATECHANGE in createElement('script')) {
	    defer = function (id) {
	      html.appendChild(createElement('script'))[ONREADYSTATECHANGE] = function () {
	        html.removeChild(this);
	        run(id);
	      };
	    };
	  // Rest old browsers
	  } else {
	    defer = function (id) {
	      setTimeout(runner(id), 0);
	    };
	  }
	}

	var task$1 = {
	  set: set$1,
	  clear: clear
	};

	var globalThis$I = globalThis_1;
	var DESCRIPTORS$g = descriptors;

	// eslint-disable-next-line es/no-object-getownpropertydescriptor -- safe
	var getOwnPropertyDescriptor$3 = Object.getOwnPropertyDescriptor;

	// Avoid NodeJS experimental warning
	var safeGetBuiltIn$2 = function (name) {
	  if (!DESCRIPTORS$g) return globalThis$I[name];
	  var descriptor = getOwnPropertyDescriptor$3(globalThis$I, name);
	  return descriptor && descriptor.value;
	};

	var Queue$2 = function () {
	  this.head = null;
	  this.tail = null;
	};

	Queue$2.prototype = {
	  add: function (item) {
	    var entry = { item: item, next: null };
	    var tail = this.tail;
	    if (tail) tail.next = entry;
	    else this.head = entry;
	    this.tail = entry;
	  },
	  get: function () {
	    var entry = this.head;
	    if (entry) {
	      var next = this.head = entry.next;
	      if (next === null) this.tail = null;
	      return entry.item;
	    }
	  }
	};

	var queue$1 = Queue$2;

	var userAgent$2 = environmentUserAgent;

	var environmentIsIosPebble = /ipad|iphone|ipod/i.test(userAgent$2) && typeof Pebble != 'undefined';

	var userAgent$1 = environmentUserAgent;

	var environmentIsWebosWebkit = /web0s(?!.*chrome)/i.test(userAgent$1);

	var globalThis$H = globalThis_1;
	var safeGetBuiltIn$1 = safeGetBuiltIn$2;
	var bind$6 = functionBindContext;
	var macrotask = task$1.set;
	var Queue$1 = queue$1;
	var IS_IOS = environmentIsIos;
	var IS_IOS_PEBBLE = environmentIsIosPebble;
	var IS_WEBOS_WEBKIT = environmentIsWebosWebkit;
	var IS_NODE$1 = environmentIsNode;

	var MutationObserver = globalThis$H.MutationObserver || globalThis$H.WebKitMutationObserver;
	var document$2 = globalThis$H.document;
	var process$1 = globalThis$H.process;
	var Promise$5 = globalThis$H.Promise;
	var microtask$2 = safeGetBuiltIn$1('queueMicrotask');
	var notify$1, toggle, node, promise, then;

	// modern engines have queueMicrotask method
	if (!microtask$2) {
	  var queue = new Queue$1();

	  var flush = function () {
	    var parent, fn;
	    if (IS_NODE$1 && (parent = process$1.domain)) parent.exit();
	    while (fn = queue.get()) try {
	      fn();
	    } catch (error) {
	      if (queue.head) notify$1();
	      throw error;
	    }
	    if (parent) parent.enter();
	  };

	  // browsers with MutationObserver, except iOS - https://github.com/zloirock/core-js/issues/339
	  // also except WebOS Webkit https://github.com/zloirock/core-js/issues/898
	  if (!IS_IOS && !IS_NODE$1 && !IS_WEBOS_WEBKIT && MutationObserver && document$2) {
	    toggle = true;
	    node = document$2.createTextNode('');
	    new MutationObserver(flush).observe(node, { characterData: true });
	    notify$1 = function () {
	      node.data = toggle = !toggle;
	    };
	  // environments with maybe non-completely correct, but existent Promise
	  } else if (!IS_IOS_PEBBLE && Promise$5 && Promise$5.resolve) {
	    // Promise.resolve without an argument throws an error in LG WebOS 2
	    promise = Promise$5.resolve(undefined);
	    // workaround of WebKit ~ iOS Safari 10.1 bug
	    promise.constructor = Promise$5;
	    then = bind$6(promise.then, promise);
	    notify$1 = function () {
	      then(flush);
	    };
	  // Node.js without promises
	  } else if (IS_NODE$1) {
	    notify$1 = function () {
	      process$1.nextTick(flush);
	    };
	  // for other environments - macrotask based on:
	  // - setImmediate
	  // - MessageChannel
	  // - window.postMessage
	  // - onreadystatechange
	  // - setTimeout
	  } else {
	    // `webpack` dev server bug on IE global methods - use bind(fn, global)
	    macrotask = bind$6(macrotask, globalThis$H);
	    notify$1 = function () {
	      macrotask(flush);
	    };
	  }

	  microtask$2 = function (fn) {
	    if (!queue.head) notify$1();
	    queue.add(fn);
	  };
	}

	var microtask_1 = microtask$2;

	var hostReportErrors$1 = function (a, b) {
	  try {
	    // eslint-disable-next-line no-console -- safe
	    arguments.length === 1 ? console.error(a) : console.error(a, b);
	  } catch (error) { /* empty */ }
	};

	var perform$6 = function (exec) {
	  try {
	    return { error: false, value: exec() };
	  } catch (error) {
	    return { error: true, value: error };
	  }
	};

	var globalThis$G = globalThis_1;

	var promiseNativeConstructor = globalThis$G.Promise;

	var globalThis$F = globalThis_1;
	var NativePromiseConstructor$4 = promiseNativeConstructor;
	var isCallable$b = isCallable$A;
	var isForced$1 = isForced_1;
	var inspectSource = inspectSource$3;
	var wellKnownSymbol$g = wellKnownSymbol$K;
	var ENVIRONMENT$1 = environment;
	var V8_VERSION$1 = environmentV8Version;

	NativePromiseConstructor$4 && NativePromiseConstructor$4.prototype;
	var SPECIES$1 = wellKnownSymbol$g('species');
	var SUBCLASSING = false;
	var NATIVE_PROMISE_REJECTION_EVENT$1 = isCallable$b(globalThis$F.PromiseRejectionEvent);

	var FORCED_PROMISE_CONSTRUCTOR$5 = isForced$1('Promise', function () {
	  var PROMISE_CONSTRUCTOR_SOURCE = inspectSource(NativePromiseConstructor$4);
	  var GLOBAL_CORE_JS_PROMISE = PROMISE_CONSTRUCTOR_SOURCE !== String(NativePromiseConstructor$4);
	  // V8 6.6 (Node 10 and Chrome 66) have a bug with resolving custom thenables
	  // https://bugs.chromium.org/p/chromium/issues/detail?id=830565
	  // We can't detect it synchronously, so just check versions
	  if (!GLOBAL_CORE_JS_PROMISE && V8_VERSION$1 === 66) return true;
	  // We can't use @@species feature detection in V8 since it causes
	  // deoptimization and performance degradation
	  // https://github.com/zloirock/core-js/issues/679
	  if (!V8_VERSION$1 || V8_VERSION$1 < 51 || !/native code/.test(PROMISE_CONSTRUCTOR_SOURCE)) {
	    // Detect correctness of subclassing with @@species support
	    var promise = new NativePromiseConstructor$4(function (resolve) { resolve(1); });
	    var FakePromise = function (exec) {
	      exec(function () { /* empty */ }, function () { /* empty */ });
	    };
	    var constructor = promise.constructor = {};
	    constructor[SPECIES$1] = FakePromise;
	    SUBCLASSING = promise.then(function () { /* empty */ }) instanceof FakePromise;
	    if (!SUBCLASSING) return true;
	  // Unhandled rejections tracking support, NodeJS Promise without it fails @@species test
	  } return !GLOBAL_CORE_JS_PROMISE && (ENVIRONMENT$1 === 'BROWSER' || ENVIRONMENT$1 === 'DENO') && !NATIVE_PROMISE_REJECTION_EVENT$1;
	});

	var promiseConstructorDetection = {
	  CONSTRUCTOR: FORCED_PROMISE_CONSTRUCTOR$5,
	  REJECTION_EVENT: NATIVE_PROMISE_REJECTION_EVENT$1,
	  SUBCLASSING: SUBCLASSING
	};

	var newPromiseCapability$2 = {};

	var aCallable$d = aCallable$B;

	var $TypeError$d = TypeError;

	var PromiseCapability = function (C) {
	  var resolve, reject;
	  this.promise = new C(function ($$resolve, $$reject) {
	    if (resolve !== undefined || reject !== undefined) throw new $TypeError$d('Bad Promise constructor');
	    resolve = $$resolve;
	    reject = $$reject;
	  });
	  this.resolve = aCallable$d(resolve);
	  this.reject = aCallable$d(reject);
	};

	// `NewPromiseCapability` abstract operation
	// https://tc39.es/ecma262/#sec-newpromisecapability
	newPromiseCapability$2.f = function (C) {
	  return new PromiseCapability(C);
	};

	var $$1t = _export;
	var IS_NODE = environmentIsNode;
	var globalThis$E = globalThis_1;
	var path = path$3;
	var call$x = functionCall;
	var defineBuiltIn$e = defineBuiltIn$t;
	var setPrototypeOf$1 = objectSetPrototypeOf$1;
	var setToStringTag$5 = setToStringTag$e;
	var setSpecies$2 = setSpecies$6;
	var aCallable$c = aCallable$B;
	var isCallable$a = isCallable$A;
	var isObject$i = isObject$K;
	var anInstance$7 = anInstance$d;
	var speciesConstructor$3 = speciesConstructor$4;
	var task = task$1.set;
	var microtask$1 = microtask_1;
	var hostReportErrors = hostReportErrors$1;
	var perform$5 = perform$6;
	var Queue = queue$1;
	var InternalStateModule$9 = internalState;
	var NativePromiseConstructor$3 = promiseNativeConstructor;
	var PromiseConstructorDetection = promiseConstructorDetection;
	var newPromiseCapabilityModule$7 = newPromiseCapability$2;

	var PROMISE = 'Promise';
	var FORCED_PROMISE_CONSTRUCTOR$4 = PromiseConstructorDetection.CONSTRUCTOR;
	var NATIVE_PROMISE_REJECTION_EVENT = PromiseConstructorDetection.REJECTION_EVENT;
	var NATIVE_PROMISE_SUBCLASSING = PromiseConstructorDetection.SUBCLASSING;
	var getInternalPromiseState = InternalStateModule$9.getterFor(PROMISE);
	var setInternalState$9 = InternalStateModule$9.set;
	var NativePromisePrototype$2 = NativePromiseConstructor$3 && NativePromiseConstructor$3.prototype;
	var PromiseConstructor = NativePromiseConstructor$3;
	var PromisePrototype = NativePromisePrototype$2;
	var TypeError$5 = globalThis$E.TypeError;
	var document$1 = globalThis$E.document;
	var process = globalThis$E.process;
	var newPromiseCapability$1 = newPromiseCapabilityModule$7.f;
	var newGenericPromiseCapability = newPromiseCapability$1;

	var DISPATCH_EVENT = !!(document$1 && document$1.createEvent && globalThis$E.dispatchEvent);
	var UNHANDLED_REJECTION = 'unhandledrejection';
	var REJECTION_HANDLED = 'rejectionhandled';
	var PENDING$1 = 0;
	var FULFILLED = 1;
	var REJECTED = 2;
	var HANDLED = 1;
	var UNHANDLED = 2;

	var Internal, OwnPromiseCapability, PromiseWrapper, nativeThen;

	// helpers
	var isThenable = function (it) {
	  var then;
	  return isObject$i(it) && isCallable$a(then = it.then) ? then : false;
	};

	var callReaction = function (reaction, state) {
	  var value = state.value;
	  var ok = state.state === FULFILLED;
	  var handler = ok ? reaction.ok : reaction.fail;
	  var resolve = reaction.resolve;
	  var reject = reaction.reject;
	  var domain = reaction.domain;
	  var result, then, exited;
	  try {
	    if (handler) {
	      if (!ok) {
	        if (state.rejection === UNHANDLED) onHandleUnhandled(state);
	        state.rejection = HANDLED;
	      }
	      if (handler === true) result = value;
	      else {
	        if (domain) domain.enter();
	        result = handler(value); // can throw
	        if (domain) {
	          domain.exit();
	          exited = true;
	        }
	      }
	      if (result === reaction.promise) {
	        reject(new TypeError$5('Promise-chain cycle'));
	      } else if (then = isThenable(result)) {
	        call$x(then, result, resolve, reject);
	      } else resolve(result);
	    } else reject(value);
	  } catch (error) {
	    if (domain && !exited) domain.exit();
	    reject(error);
	  }
	};

	var notify = function (state, isReject) {
	  if (state.notified) return;
	  state.notified = true;
	  microtask$1(function () {
	    var reactions = state.reactions;
	    var reaction;
	    while (reaction = reactions.get()) {
	      callReaction(reaction, state);
	    }
	    state.notified = false;
	    if (isReject && !state.rejection) onUnhandled(state);
	  });
	};

	var dispatchEvent = function (name, promise, reason) {
	  var event, handler;
	  if (DISPATCH_EVENT) {
	    event = document$1.createEvent('Event');
	    event.promise = promise;
	    event.reason = reason;
	    event.initEvent(name, false, true);
	    globalThis$E.dispatchEvent(event);
	  } else event = { promise: promise, reason: reason };
	  if (!NATIVE_PROMISE_REJECTION_EVENT && (handler = globalThis$E['on' + name])) handler(event);
	  else if (name === UNHANDLED_REJECTION) hostReportErrors('Unhandled promise rejection', reason);
	};

	var onUnhandled = function (state) {
	  call$x(task, globalThis$E, function () {
	    var promise = state.facade;
	    var value = state.value;
	    var IS_UNHANDLED = isUnhandled(state);
	    var result;
	    if (IS_UNHANDLED) {
	      result = perform$5(function () {
	        if (IS_NODE) {
	          process.emit('unhandledRejection', value, promise);
	        } else dispatchEvent(UNHANDLED_REJECTION, promise, value);
	      });
	      // Browsers should not trigger `rejectionHandled` event if it was handled here, NodeJS - should
	      state.rejection = IS_NODE || isUnhandled(state) ? UNHANDLED : HANDLED;
	      if (result.error) throw result.value;
	    }
	  });
	};

	var isUnhandled = function (state) {
	  return state.rejection !== HANDLED && !state.parent;
	};

	var onHandleUnhandled = function (state) {
	  call$x(task, globalThis$E, function () {
	    var promise = state.facade;
	    if (IS_NODE) {
	      process.emit('rejectionHandled', promise);
	    } else dispatchEvent(REJECTION_HANDLED, promise, state.value);
	  });
	};

	var bind$5 = function (fn, state, unwrap) {
	  return function (value) {
	    fn(state, value, unwrap);
	  };
	};

	var internalReject = function (state, value, unwrap) {
	  if (state.done) return;
	  state.done = true;
	  if (unwrap) state = unwrap;
	  state.value = value;
	  state.state = REJECTED;
	  notify(state, true);
	};

	var internalResolve = function (state, value, unwrap) {
	  if (state.done) return;
	  state.done = true;
	  if (unwrap) state = unwrap;
	  try {
	    if (state.facade === value) throw new TypeError$5("Promise can't be resolved itself");
	    var then = isThenable(value);
	    if (then) {
	      microtask$1(function () {
	        var wrapper = { done: false };
	        try {
	          call$x(then, value,
	            bind$5(internalResolve, wrapper, state),
	            bind$5(internalReject, wrapper, state)
	          );
	        } catch (error) {
	          internalReject(wrapper, error, state);
	        }
	      });
	    } else {
	      state.value = value;
	      state.state = FULFILLED;
	      notify(state, false);
	    }
	  } catch (error) {
	    internalReject({ done: false }, error, state);
	  }
	};

	// constructor polyfill
	if (FORCED_PROMISE_CONSTRUCTOR$4) {
	  // 25.4.3.1 Promise(executor)
	  PromiseConstructor = function Promise(executor) {
	    anInstance$7(this, PromisePrototype);
	    aCallable$c(executor);
	    call$x(Internal, this);
	    var state = getInternalPromiseState(this);
	    try {
	      executor(bind$5(internalResolve, state), bind$5(internalReject, state));
	    } catch (error) {
	      internalReject(state, error);
	    }
	  };

	  PromisePrototype = PromiseConstructor.prototype;

	  // eslint-disable-next-line no-unused-vars -- required for `.length`
	  Internal = function Promise(executor) {
	    setInternalState$9(this, {
	      type: PROMISE,
	      done: false,
	      notified: false,
	      parent: false,
	      reactions: new Queue(),
	      rejection: false,
	      state: PENDING$1,
	      value: null
	    });
	  };

	  // `Promise.prototype.then` method
	  // https://tc39.es/ecma262/#sec-promise.prototype.then
	  Internal.prototype = defineBuiltIn$e(PromisePrototype, 'then', function then(onFulfilled, onRejected) {
	    var state = getInternalPromiseState(this);
	    var reaction = newPromiseCapability$1(speciesConstructor$3(this, PromiseConstructor));
	    state.parent = true;
	    reaction.ok = isCallable$a(onFulfilled) ? onFulfilled : true;
	    reaction.fail = isCallable$a(onRejected) && onRejected;
	    reaction.domain = IS_NODE ? process.domain : undefined;
	    if (state.state === PENDING$1) state.reactions.add(reaction);
	    else microtask$1(function () {
	      callReaction(reaction, state);
	    });
	    return reaction.promise;
	  });

	  OwnPromiseCapability = function () {
	    var promise = new Internal();
	    var state = getInternalPromiseState(promise);
	    this.promise = promise;
	    this.resolve = bind$5(internalResolve, state);
	    this.reject = bind$5(internalReject, state);
	  };

	  newPromiseCapabilityModule$7.f = newPromiseCapability$1 = function (C) {
	    return C === PromiseConstructor || C === PromiseWrapper
	      ? new OwnPromiseCapability(C)
	      : newGenericPromiseCapability(C);
	  };

	  if (isCallable$a(NativePromiseConstructor$3) && NativePromisePrototype$2 !== Object.prototype) {
	    nativeThen = NativePromisePrototype$2.then;

	    if (!NATIVE_PROMISE_SUBCLASSING) {
	      // make `Promise#then` return a polyfilled `Promise` for native promise-based APIs
	      defineBuiltIn$e(NativePromisePrototype$2, 'then', function then(onFulfilled, onRejected) {
	        var that = this;
	        return new PromiseConstructor(function (resolve, reject) {
	          call$x(nativeThen, that, resolve, reject);
	        }).then(onFulfilled, onRejected);
	      // https://github.com/zloirock/core-js/issues/640
	      }, { unsafe: true });
	    }

	    // make `.constructor === Promise` work for native promise-based APIs
	    try {
	      delete NativePromisePrototype$2.constructor;
	    } catch (error) { /* empty */ }

	    // make `instanceof Promise` work for native promise-based APIs
	    if (setPrototypeOf$1) {
	      setPrototypeOf$1(NativePromisePrototype$2, PromisePrototype);
	    }
	  }
	}

	// `Promise` constructor
	// https://tc39.es/ecma262/#sec-promise-executor
	$$1t({ global: true, constructor: true, wrap: true, forced: FORCED_PROMISE_CONSTRUCTOR$4 }, {
	  Promise: PromiseConstructor
	});

	PromiseWrapper = path.Promise;

	setToStringTag$5(PromiseConstructor, PROMISE, false);
	setSpecies$2(PROMISE);

	var NativePromiseConstructor$2 = promiseNativeConstructor;
	var checkCorrectnessOfIteration$1 = checkCorrectnessOfIteration$4;
	var FORCED_PROMISE_CONSTRUCTOR$3 = promiseConstructorDetection.CONSTRUCTOR;

	var promiseStaticsIncorrectIteration = FORCED_PROMISE_CONSTRUCTOR$3 || !checkCorrectnessOfIteration$1(function (iterable) {
	  NativePromiseConstructor$2.all(iterable).then(undefined, function () { /* empty */ });
	});

	var $$1s = _export;
	var call$w = functionCall;
	var aCallable$b = aCallable$B;
	var newPromiseCapabilityModule$6 = newPromiseCapability$2;
	var perform$4 = perform$6;
	var iterate$7 = iterate$l;
	var PROMISE_STATICS_INCORRECT_ITERATION$3 = promiseStaticsIncorrectIteration;

	// `Promise.all` method
	// https://tc39.es/ecma262/#sec-promise.all
	$$1s({ target: 'Promise', stat: true, forced: PROMISE_STATICS_INCORRECT_ITERATION$3 }, {
	  all: function all(iterable) {
	    var C = this;
	    var capability = newPromiseCapabilityModule$6.f(C);
	    var resolve = capability.resolve;
	    var reject = capability.reject;
	    var result = perform$4(function () {
	      var $promiseResolve = aCallable$b(C.resolve);
	      var values = [];
	      var counter = 0;
	      var remaining = 1;
	      iterate$7(iterable, function (promise) {
	        var index = counter++;
	        var alreadyCalled = false;
	        remaining++;
	        call$w($promiseResolve, C, promise).then(function (value) {
	          if (alreadyCalled) return;
	          alreadyCalled = true;
	          values[index] = value;
	          --remaining || resolve(values);
	        }, reject);
	      });
	      --remaining || resolve(values);
	    });
	    if (result.error) reject(result.value);
	    return capability.promise;
	  }
	});

	var $$1r = _export;
	var FORCED_PROMISE_CONSTRUCTOR$2 = promiseConstructorDetection.CONSTRUCTOR;
	var NativePromiseConstructor$1 = promiseNativeConstructor;
	var getBuiltIn$l = getBuiltIn$B;
	var isCallable$9 = isCallable$A;
	var defineBuiltIn$d = defineBuiltIn$t;

	var NativePromisePrototype$1 = NativePromiseConstructor$1 && NativePromiseConstructor$1.prototype;

	// `Promise.prototype.catch` method
	// https://tc39.es/ecma262/#sec-promise.prototype.catch
	$$1r({ target: 'Promise', proto: true, forced: FORCED_PROMISE_CONSTRUCTOR$2, real: true }, {
	  'catch': function (onRejected) {
	    return this.then(undefined, onRejected);
	  }
	});

	// makes sure that native promise-based APIs `Promise#catch` properly works with patched `Promise#then`
	if (isCallable$9(NativePromiseConstructor$1)) {
	  var method$1 = getBuiltIn$l('Promise').prototype['catch'];
	  if (NativePromisePrototype$1['catch'] !== method$1) {
	    defineBuiltIn$d(NativePromisePrototype$1, 'catch', method$1, { unsafe: true });
	  }
	}

	var $$1q = _export;
	var call$v = functionCall;
	var aCallable$a = aCallable$B;
	var newPromiseCapabilityModule$5 = newPromiseCapability$2;
	var perform$3 = perform$6;
	var iterate$6 = iterate$l;
	var PROMISE_STATICS_INCORRECT_ITERATION$2 = promiseStaticsIncorrectIteration;

	// `Promise.race` method
	// https://tc39.es/ecma262/#sec-promise.race
	$$1q({ target: 'Promise', stat: true, forced: PROMISE_STATICS_INCORRECT_ITERATION$2 }, {
	  race: function race(iterable) {
	    var C = this;
	    var capability = newPromiseCapabilityModule$5.f(C);
	    var reject = capability.reject;
	    var result = perform$3(function () {
	      var $promiseResolve = aCallable$a(C.resolve);
	      iterate$6(iterable, function (promise) {
	        call$v($promiseResolve, C, promise).then(capability.resolve, reject);
	      });
	    });
	    if (result.error) reject(result.value);
	    return capability.promise;
	  }
	});

	var $$1p = _export;
	var newPromiseCapabilityModule$4 = newPromiseCapability$2;
	var FORCED_PROMISE_CONSTRUCTOR$1 = promiseConstructorDetection.CONSTRUCTOR;

	// `Promise.reject` method
	// https://tc39.es/ecma262/#sec-promise.reject
	$$1p({ target: 'Promise', stat: true, forced: FORCED_PROMISE_CONSTRUCTOR$1 }, {
	  reject: function reject(r) {
	    var capability = newPromiseCapabilityModule$4.f(this);
	    var capabilityReject = capability.reject;
	    capabilityReject(r);
	    return capability.promise;
	  }
	});

	var anObject$s = anObject$U;
	var isObject$h = isObject$K;
	var newPromiseCapability = newPromiseCapability$2;

	var promiseResolve$2 = function (C, x) {
	  anObject$s(C);
	  if (isObject$h(x) && x.constructor === C) return x;
	  var promiseCapability = newPromiseCapability.f(C);
	  var resolve = promiseCapability.resolve;
	  resolve(x);
	  return promiseCapability.promise;
	};

	var $$1o = _export;
	var getBuiltIn$k = getBuiltIn$B;
	var FORCED_PROMISE_CONSTRUCTOR = promiseConstructorDetection.CONSTRUCTOR;
	var promiseResolve$1 = promiseResolve$2;

	getBuiltIn$k('Promise');

	// `Promise.resolve` method
	// https://tc39.es/ecma262/#sec-promise.resolve
	$$1o({ target: 'Promise', stat: true, forced: FORCED_PROMISE_CONSTRUCTOR }, {
	  resolve: function resolve(x) {
	    return promiseResolve$1(this, x);
	  }
	});

	var $$1n = _export;
	var call$u = functionCall;
	var aCallable$9 = aCallable$B;
	var newPromiseCapabilityModule$3 = newPromiseCapability$2;
	var perform$2 = perform$6;
	var iterate$5 = iterate$l;
	var PROMISE_STATICS_INCORRECT_ITERATION$1 = promiseStaticsIncorrectIteration;

	// `Promise.allSettled` method
	// https://tc39.es/ecma262/#sec-promise.allsettled
	$$1n({ target: 'Promise', stat: true, forced: PROMISE_STATICS_INCORRECT_ITERATION$1 }, {
	  allSettled: function allSettled(iterable) {
	    var C = this;
	    var capability = newPromiseCapabilityModule$3.f(C);
	    var resolve = capability.resolve;
	    var reject = capability.reject;
	    var result = perform$2(function () {
	      var promiseResolve = aCallable$9(C.resolve);
	      var values = [];
	      var counter = 0;
	      var remaining = 1;
	      iterate$5(iterable, function (promise) {
	        var index = counter++;
	        var alreadyCalled = false;
	        remaining++;
	        call$u(promiseResolve, C, promise).then(function (value) {
	          if (alreadyCalled) return;
	          alreadyCalled = true;
	          values[index] = { status: 'fulfilled', value: value };
	          --remaining || resolve(values);
	        }, function (error) {
	          if (alreadyCalled) return;
	          alreadyCalled = true;
	          values[index] = { status: 'rejected', reason: error };
	          --remaining || resolve(values);
	        });
	      });
	      --remaining || resolve(values);
	    });
	    if (result.error) reject(result.value);
	    return capability.promise;
	  }
	});

	var $$1m = _export;
	var call$t = functionCall;
	var aCallable$8 = aCallable$B;
	var getBuiltIn$j = getBuiltIn$B;
	var newPromiseCapabilityModule$2 = newPromiseCapability$2;
	var perform$1 = perform$6;
	var iterate$4 = iterate$l;
	var PROMISE_STATICS_INCORRECT_ITERATION = promiseStaticsIncorrectIteration;

	var PROMISE_ANY_ERROR = 'No one promise resolved';

	// `Promise.any` method
	// https://tc39.es/ecma262/#sec-promise.any
	$$1m({ target: 'Promise', stat: true, forced: PROMISE_STATICS_INCORRECT_ITERATION }, {
	  any: function any(iterable) {
	    var C = this;
	    var AggregateError = getBuiltIn$j('AggregateError');
	    var capability = newPromiseCapabilityModule$2.f(C);
	    var resolve = capability.resolve;
	    var reject = capability.reject;
	    var result = perform$1(function () {
	      var promiseResolve = aCallable$8(C.resolve);
	      var errors = [];
	      var counter = 0;
	      var remaining = 1;
	      var alreadyResolved = false;
	      iterate$4(iterable, function (promise) {
	        var index = counter++;
	        var alreadyRejected = false;
	        remaining++;
	        call$t(promiseResolve, C, promise).then(function (value) {
	          if (alreadyRejected || alreadyResolved) return;
	          alreadyResolved = true;
	          resolve(value);
	        }, function (error) {
	          if (alreadyRejected || alreadyResolved) return;
	          alreadyRejected = true;
	          errors[index] = error;
	          --remaining || reject(new AggregateError(errors, PROMISE_ANY_ERROR));
	        });
	      });
	      --remaining || reject(new AggregateError(errors, PROMISE_ANY_ERROR));
	    });
	    if (result.error) reject(result.value);
	    return capability.promise;
	  }
	});

	var $$1l = _export;
	var NativePromiseConstructor = promiseNativeConstructor;
	var fails$B = fails$1z;
	var getBuiltIn$i = getBuiltIn$B;
	var isCallable$8 = isCallable$A;
	var speciesConstructor$2 = speciesConstructor$4;
	var promiseResolve = promiseResolve$2;
	var defineBuiltIn$c = defineBuiltIn$t;

	var NativePromisePrototype = NativePromiseConstructor && NativePromiseConstructor.prototype;

	// Safari bug https://bugs.webkit.org/show_bug.cgi?id=200829
	var NON_GENERIC = !!NativePromiseConstructor && fails$B(function () {
	  // eslint-disable-next-line unicorn/no-thenable -- required for testing
	  NativePromisePrototype['finally'].call({ then: function () { /* empty */ } }, function () { /* empty */ });
	});

	// `Promise.prototype.finally` method
	// https://tc39.es/ecma262/#sec-promise.prototype.finally
	$$1l({ target: 'Promise', proto: true, real: true, forced: NON_GENERIC }, {
	  'finally': function (onFinally) {
	    var C = speciesConstructor$2(this, getBuiltIn$i('Promise'));
	    var isFunction = isCallable$8(onFinally);
	    return this.then(
	      isFunction ? function (x) {
	        return promiseResolve(C, onFinally()).then(function () { return x; });
	      } : onFinally,
	      isFunction ? function (e) {
	        return promiseResolve(C, onFinally()).then(function () { throw e; });
	      } : onFinally
	    );
	  }
	});

	// makes sure that native promise-based APIs `Promise#finally` properly works with patched `Promise#then`
	if (isCallable$8(NativePromiseConstructor)) {
	  var method = getBuiltIn$i('Promise').prototype['finally'];
	  if (NativePromisePrototype['finally'] !== method) {
	    defineBuiltIn$c(NativePromisePrototype, 'finally', method, { unsafe: true });
	  }
	}

	var $$1k = _export;
	var globalThis$D = globalThis_1;
	var apply$5 = functionApply$1;
	var slice$2 = arraySlice$a;
	var newPromiseCapabilityModule$1 = newPromiseCapability$2;
	var aCallable$7 = aCallable$B;
	var perform = perform$6;

	var Promise$4 = globalThis$D.Promise;

	var ACCEPT_ARGUMENTS = false;
	// Avoiding the use of polyfills of the previous iteration of this proposal
	// that does not accept arguments of the callback
	var FORCED$a = !Promise$4 || !Promise$4['try'] || perform(function () {
	  Promise$4['try'](function (argument) {
	    ACCEPT_ARGUMENTS = argument === 8;
	  }, 8);
	}).error || !ACCEPT_ARGUMENTS;

	// `Promise.try` method
	// https://tc39.es/ecma262/#sec-promise.try
	$$1k({ target: 'Promise', stat: true, forced: FORCED$a }, {
	  'try': function (callbackfn /* , ...args */) {
	    var args = arguments.length > 1 ? slice$2(arguments, 1) : [];
	    var promiseCapability = newPromiseCapabilityModule$1.f(this);
	    var result = perform(function () {
	      return apply$5(aCallable$7(callbackfn), undefined, args);
	    });
	    (result.error ? promiseCapability.reject : promiseCapability.resolve)(result.value);
	    return promiseCapability.promise;
	  }
	});

	var $$1j = _export;
	var newPromiseCapabilityModule = newPromiseCapability$2;

	// `Promise.withResolvers` method
	// https://tc39.es/ecma262/#sec-promise.withResolvers
	$$1j({ target: 'Promise', stat: true }, {
	  withResolvers: function withResolvers() {
	    var promiseCapability = newPromiseCapabilityModule.f(this);
	    return {
	      promise: promiseCapability.promise,
	      resolve: promiseCapability.resolve,
	      reject: promiseCapability.reject
	    };
	  }
	});

	var globalThis$C = globalThis_1;
	var shared$1 = sharedStoreExports;
	var isCallable$7 = isCallable$A;
	var getPrototypeOf$2 = objectGetPrototypeOf$2;
	var defineBuiltIn$b = defineBuiltIn$t;
	var wellKnownSymbol$f = wellKnownSymbol$K;

	var USE_FUNCTION_CONSTRUCTOR = 'USE_FUNCTION_CONSTRUCTOR';
	var ASYNC_ITERATOR$2 = wellKnownSymbol$f('asyncIterator');
	var AsyncIterator = globalThis$C.AsyncIterator;
	var PassedAsyncIteratorPrototype = shared$1.AsyncIteratorPrototype;
	var AsyncIteratorPrototype$2, prototype;

	if (PassedAsyncIteratorPrototype) {
	  AsyncIteratorPrototype$2 = PassedAsyncIteratorPrototype;
	} else if (isCallable$7(AsyncIterator)) {
	  AsyncIteratorPrototype$2 = AsyncIterator.prototype;
	} else if (shared$1[USE_FUNCTION_CONSTRUCTOR] || globalThis$C[USE_FUNCTION_CONSTRUCTOR]) {
	  try {
	    // eslint-disable-next-line no-new-func -- we have no alternatives without usage of modern syntax
	    prototype = getPrototypeOf$2(getPrototypeOf$2(getPrototypeOf$2(Function('return async function*(){}()')())));
	    if (getPrototypeOf$2(prototype) === Object.prototype) AsyncIteratorPrototype$2 = prototype;
	  } catch (error) { /* empty */ }
	}

	if (!AsyncIteratorPrototype$2) AsyncIteratorPrototype$2 = {};

	if (!isCallable$7(AsyncIteratorPrototype$2[ASYNC_ITERATOR$2])) {
	  defineBuiltIn$b(AsyncIteratorPrototype$2, ASYNC_ITERATOR$2, function () {
	    return this;
	  });
	}

	var asyncIteratorPrototype = AsyncIteratorPrototype$2;

	var call$s = functionCall;
	var anObject$r = anObject$U;
	var create$6 = objectCreate;
	var getMethod$a = getMethod$h;
	var defineBuiltIns$4 = defineBuiltIns$9;
	var InternalStateModule$8 = internalState;
	var iteratorClose$2 = iteratorClose$h;
	var getBuiltIn$h = getBuiltIn$B;
	var AsyncIteratorPrototype$1 = asyncIteratorPrototype;
	var createIterResultObject$3 = createIterResultObject$7;

	var Promise$3 = getBuiltIn$h('Promise');

	var ASYNC_FROM_SYNC_ITERATOR = 'AsyncFromSyncIterator';
	var setInternalState$8 = InternalStateModule$8.set;
	var getInternalState$7 = InternalStateModule$8.getterFor(ASYNC_FROM_SYNC_ITERATOR);

	var asyncFromSyncIteratorContinuation = function (result, resolve, reject, syncIterator, closeOnRejection) {
	  var done = result.done;
	  Promise$3.resolve(result.value).then(function (value) {
	    resolve(createIterResultObject$3(value, done));
	  }, function (error) {
	    if (!done && closeOnRejection) {
	      try {
	        iteratorClose$2(syncIterator, 'throw', error);
	      } catch (error2) {
	        error = error2;
	      }
	    }

	    reject(error);
	  });
	};

	var AsyncFromSyncIterator$2 = function AsyncIterator(iteratorRecord) {
	  iteratorRecord.type = ASYNC_FROM_SYNC_ITERATOR;
	  setInternalState$8(this, iteratorRecord);
	};

	AsyncFromSyncIterator$2.prototype = defineBuiltIns$4(create$6(AsyncIteratorPrototype$1), {
	  next: function next() {
	    var state = getInternalState$7(this);
	    return new Promise$3(function (resolve, reject) {
	      var result = anObject$r(call$s(state.next, state.iterator));
	      asyncFromSyncIteratorContinuation(result, resolve, reject, state.iterator, true);
	    });
	  },
	  'return': function () {
	    var iterator = getInternalState$7(this).iterator;
	    return new Promise$3(function (resolve, reject) {
	      var $return = getMethod$a(iterator, 'return');
	      if ($return === undefined) return resolve(createIterResultObject$3(undefined, true));
	      var result = anObject$r(call$s($return, iterator));
	      asyncFromSyncIteratorContinuation(result, resolve, reject, iterator);
	    });
	  }
	});

	var asyncFromSyncIterator = AsyncFromSyncIterator$2;

	var call$r = functionCall;
	var AsyncFromSyncIterator$1 = asyncFromSyncIterator;
	var anObject$q = anObject$U;
	var getIterator$3 = getIterator$6;
	var getIteratorDirect$3 = getIteratorDirect$g;
	var getMethod$9 = getMethod$h;
	var wellKnownSymbol$e = wellKnownSymbol$K;

	var ASYNC_ITERATOR$1 = wellKnownSymbol$e('asyncIterator');

	var getAsyncIterator$1 = function (it, usingIterator) {
	  var method = arguments.length < 2 ? getMethod$9(it, ASYNC_ITERATOR$1) : usingIterator;
	  return method ? anObject$q(call$r(method, it)) : new AsyncFromSyncIterator$1(getIteratorDirect$3(getIterator$3(it)));
	};

	var call$q = functionCall;
	var getBuiltIn$g = getBuiltIn$B;
	var getMethod$8 = getMethod$h;

	var asyncIteratorClose = function (iterator, method, argument, reject) {
	  try {
	    var returnMethod = getMethod$8(iterator, 'return');
	    if (returnMethod) {
	      return getBuiltIn$g('Promise').resolve(call$q(returnMethod, iterator)).then(function () {
	        method(argument);
	      }, function (error) {
	        reject(error);
	      });
	    }
	  } catch (error2) {
	    return reject(error2);
	  } method(argument);
	};

	// https://github.com/tc39/proposal-async-iterator-helpers
	// https://github.com/tc39/proposal-array-from-async
	var call$p = functionCall;
	var aCallable$6 = aCallable$B;
	var anObject$p = anObject$U;
	var isObject$g = isObject$K;
	var doesNotExceedSafeInteger = doesNotExceedSafeInteger$7;
	var getBuiltIn$f = getBuiltIn$B;
	var getIteratorDirect$2 = getIteratorDirect$g;
	var closeAsyncIteration = asyncIteratorClose;

	var createMethod$1 = function (TYPE) {
	  var IS_TO_ARRAY = TYPE === 0;
	  var IS_FOR_EACH = TYPE === 1;
	  var IS_EVERY = TYPE === 2;
	  var IS_SOME = TYPE === 3;
	  return function (object, fn, target) {
	    anObject$p(object);
	    var MAPPING = fn !== undefined;
	    if (MAPPING || !IS_TO_ARRAY) aCallable$6(fn);
	    var record = getIteratorDirect$2(object);
	    var Promise = getBuiltIn$f('Promise');
	    var iterator = record.iterator;
	    var next = record.next;
	    var counter = 0;

	    return new Promise(function (resolve, reject) {
	      var ifAbruptCloseAsyncIterator = function (error) {
	        closeAsyncIteration(iterator, reject, error, reject);
	      };

	      var loop = function () {
	        try {
	          if (MAPPING) try {
	            doesNotExceedSafeInteger(counter);
	          } catch (error5) { ifAbruptCloseAsyncIterator(error5); }
	          Promise.resolve(anObject$p(call$p(next, iterator))).then(function (step) {
	            try {
	              if (anObject$p(step).done) {
	                if (IS_TO_ARRAY) {
	                  target.length = counter;
	                  resolve(target);
	                } else resolve(IS_SOME ? false : IS_EVERY || undefined);
	              } else {
	                var value = step.value;
	                try {
	                  if (MAPPING) {
	                    var result = fn(value, counter);

	                    var handler = function ($result) {
	                      if (IS_FOR_EACH) {
	                        loop();
	                      } else if (IS_EVERY) {
	                        $result ? loop() : closeAsyncIteration(iterator, resolve, false, reject);
	                      } else if (IS_TO_ARRAY) {
	                        try {
	                          target[counter++] = $result;
	                          loop();
	                        } catch (error4) { ifAbruptCloseAsyncIterator(error4); }
	                      } else {
	                        $result ? closeAsyncIteration(iterator, resolve, IS_SOME || value, reject) : loop();
	                      }
	                    };

	                    if (isObject$g(result)) Promise.resolve(result).then(handler, ifAbruptCloseAsyncIterator);
	                    else handler(result);
	                  } else {
	                    target[counter++] = value;
	                    loop();
	                  }
	                } catch (error3) { ifAbruptCloseAsyncIterator(error3); }
	              }
	            } catch (error2) { reject(error2); }
	          }, reject);
	        } catch (error) { reject(error); }
	      };

	      loop();
	    });
	  };
	};

	var asyncIteratorIteration = {
	  // `AsyncIterator.prototype.toArray` / `Array.fromAsync` methods
	  toArray: createMethod$1(0)};

	var bind$4 = functionBindContext;
	var uncurryThis$J = functionUncurryThis;
	var toObject$3 = toObject$v;
	var isConstructor$1 = isConstructor$7;
	var getAsyncIterator = getAsyncIterator$1;
	var getIterator$2 = getIterator$6;
	var getIteratorDirect$1 = getIteratorDirect$g;
	var getIteratorMethod$2 = getIteratorMethod$7;
	var getMethod$7 = getMethod$h;
	var getBuiltIn$e = getBuiltIn$B;
	var getBuiltInPrototypeMethod = getBuiltInPrototypeMethod$2;
	var wellKnownSymbol$d = wellKnownSymbol$K;
	var AsyncFromSyncIterator = asyncFromSyncIterator;
	var toArray = asyncIteratorIteration.toArray;

	var ASYNC_ITERATOR = wellKnownSymbol$d('asyncIterator');
	var arrayIterator = uncurryThis$J(getBuiltInPrototypeMethod('Array', 'values'));
	var arrayIteratorNext = uncurryThis$J(arrayIterator([]).next);

	var safeArrayIterator = function () {
	  return new SafeArrayIterator(this);
	};

	var SafeArrayIterator = function (O) {
	  this.iterator = arrayIterator(O);
	};

	SafeArrayIterator.prototype.next = function () {
	  return arrayIteratorNext(this.iterator);
	};

	// `Array.fromAsync` method implementation
	// https://github.com/tc39/proposal-array-from-async
	var arrayFromAsync = function fromAsync(asyncItems /* , mapfn = undefined, thisArg = undefined */) {
	  var C = this;
	  var argumentsLength = arguments.length;
	  var mapfn = argumentsLength > 1 ? arguments[1] : undefined;
	  var thisArg = argumentsLength > 2 ? arguments[2] : undefined;
	  return new (getBuiltIn$e('Promise'))(function (resolve) {
	    var O = toObject$3(asyncItems);
	    if (mapfn !== undefined) mapfn = bind$4(mapfn, thisArg);
	    var usingAsyncIterator = getMethod$7(O, ASYNC_ITERATOR);
	    var usingSyncIterator = usingAsyncIterator ? undefined : getIteratorMethod$2(O) || safeArrayIterator;
	    var A = isConstructor$1(C) ? new C() : [];
	    var iterator = usingAsyncIterator
	      ? getAsyncIterator(O, usingAsyncIterator)
	      : new AsyncFromSyncIterator(getIteratorDirect$1(getIterator$2(O, usingSyncIterator)));
	    resolve(toArray(iterator, mapfn, A));
	  });
	};

	var $$1i = _export;
	var fromAsync = arrayFromAsync;
	var fails$A = fails$1z;

	// eslint-disable-next-line es/no-array-fromasync -- safe
	var nativeFromAsync = Array.fromAsync;
	// https://bugs.webkit.org/show_bug.cgi?id=271703
	var INCORRECT_CONSTRUCTURING = !nativeFromAsync || fails$A(function () {
	  var counter = 0;
	  nativeFromAsync.call(function () {
	    counter++;
	    return [];
	  }, { length: 0 });
	  return counter !== 1;
	});

	// `Array.fromAsync` method
	// https://github.com/tc39/proposal-array-from-async
	$$1i({ target: 'Array', stat: true, forced: INCORRECT_CONSTRUCTURING }, {
	  fromAsync: fromAsync
	});

	// https://github.com/tc39/proposal-async-explicit-resource-management
	var $$1h = _export;
	var DESCRIPTORS$f = descriptors;
	var getBuiltIn$d = getBuiltIn$B;
	var aCallable$5 = aCallable$B;
	var anInstance$6 = anInstance$d;
	var defineBuiltIn$a = defineBuiltIn$t;
	var defineBuiltIns$3 = defineBuiltIns$9;
	var defineBuiltInAccessor$9 = defineBuiltInAccessor$l;
	var wellKnownSymbol$c = wellKnownSymbol$K;
	var InternalStateModule$7 = internalState;
	var addDisposableResource = addDisposableResource$2;
	var V8_VERSION = environmentV8Version;

	var Promise$2 = getBuiltIn$d('Promise');
	var SuppressedError = getBuiltIn$d('SuppressedError');
	var $ReferenceError = ReferenceError;

	var ASYNC_DISPOSE$1 = wellKnownSymbol$c('asyncDispose');
	var TO_STRING_TAG = wellKnownSymbol$c('toStringTag');

	var ASYNC_DISPOSABLE_STACK = 'AsyncDisposableStack';
	var setInternalState$7 = InternalStateModule$7.set;
	var getAsyncDisposableStackInternalState = InternalStateModule$7.getterFor(ASYNC_DISPOSABLE_STACK);

	var HINT = 'async-dispose';
	var DISPOSED = 'disposed';
	var PENDING = 'pending';

	var getPendingAsyncDisposableStackInternalState = function (stack) {
	  var internalState = getAsyncDisposableStackInternalState(stack);
	  if (internalState.state === DISPOSED) throw new $ReferenceError(ASYNC_DISPOSABLE_STACK + ' already disposed');
	  return internalState;
	};

	var $AsyncDisposableStack = function AsyncDisposableStack() {
	  setInternalState$7(anInstance$6(this, AsyncDisposableStackPrototype), {
	    type: ASYNC_DISPOSABLE_STACK,
	    state: PENDING,
	    stack: []
	  });

	  if (!DESCRIPTORS$f) this.disposed = false;
	};

	var AsyncDisposableStackPrototype = $AsyncDisposableStack.prototype;

	defineBuiltIns$3(AsyncDisposableStackPrototype, {
	  disposeAsync: function disposeAsync() {
	    var asyncDisposableStack = this;
	    return new Promise$2(function (resolve, reject) {
	      var internalState = getAsyncDisposableStackInternalState(asyncDisposableStack);
	      if (internalState.state === DISPOSED) return resolve(undefined);
	      internalState.state = DISPOSED;
	      if (!DESCRIPTORS$f) asyncDisposableStack.disposed = true;
	      var stack = internalState.stack;
	      var i = stack.length;
	      var thrown = false;
	      var suppressed;

	      var handleError = function (result) {
	        if (thrown) {
	          suppressed = new SuppressedError(result, suppressed);
	        } else {
	          thrown = true;
	          suppressed = result;
	        }

	        loop();
	      };

	      var loop = function () {
	        if (i) {
	          var disposeMethod = stack[--i];
	          stack[i] = null;
	          try {
	            Promise$2.resolve(disposeMethod()).then(loop, handleError);
	          } catch (error) {
	            handleError(error);
	          }
	        } else {
	          internalState.stack = null;
	          thrown ? reject(suppressed) : resolve(undefined);
	        }
	      };

	      loop();
	    });
	  },
	  use: function use(value) {
	    addDisposableResource(getPendingAsyncDisposableStackInternalState(this), value, HINT);
	    return value;
	  },
	  adopt: function adopt(value, onDispose) {
	    var internalState = getPendingAsyncDisposableStackInternalState(this);
	    aCallable$5(onDispose);
	    addDisposableResource(internalState, undefined, HINT, function () {
	      return onDispose(value);
	    });
	    return value;
	  },
	  defer: function defer(onDispose) {
	    var internalState = getPendingAsyncDisposableStackInternalState(this);
	    aCallable$5(onDispose);
	    addDisposableResource(internalState, undefined, HINT, onDispose);
	  },
	  move: function move() {
	    var internalState = getPendingAsyncDisposableStackInternalState(this);
	    var newAsyncDisposableStack = new $AsyncDisposableStack();
	    getAsyncDisposableStackInternalState(newAsyncDisposableStack).stack = internalState.stack;
	    internalState.stack = [];
	    internalState.state = DISPOSED;
	    if (!DESCRIPTORS$f) this.disposed = true;
	    return newAsyncDisposableStack;
	  }
	});

	if (DESCRIPTORS$f) defineBuiltInAccessor$9(AsyncDisposableStackPrototype, 'disposed', {
	  configurable: true,
	  get: function disposed() {
	    return getAsyncDisposableStackInternalState(this).state === DISPOSED;
	  }
	});

	defineBuiltIn$a(AsyncDisposableStackPrototype, ASYNC_DISPOSE$1, AsyncDisposableStackPrototype.disposeAsync, { name: 'disposeAsync' });
	defineBuiltIn$a(AsyncDisposableStackPrototype, TO_STRING_TAG, ASYNC_DISPOSABLE_STACK, { nonWritable: true });

	// https://github.com/tc39/proposal-explicit-resource-management/issues/256
	// can't be detected synchronously
	var SYNC_DISPOSE_RETURNING_PROMISE_RESOLUTION_BUG = V8_VERSION && V8_VERSION < 136;

	$$1h({ global: true, constructor: true, forced: SYNC_DISPOSE_RETURNING_PROMISE_RESOLUTION_BUG }, {
	  AsyncDisposableStack: $AsyncDisposableStack
	});

	// https://github.com/tc39/proposal-async-explicit-resource-management
	var call$o = functionCall;
	var defineBuiltIn$9 = defineBuiltIn$t;
	var getBuiltIn$c = getBuiltIn$B;
	var getMethod$6 = getMethod$h;
	var hasOwn$c = hasOwnProperty_1;
	var wellKnownSymbol$b = wellKnownSymbol$K;
	var AsyncIteratorPrototype = asyncIteratorPrototype;

	var ASYNC_DISPOSE = wellKnownSymbol$b('asyncDispose');
	var Promise$1 = getBuiltIn$c('Promise');

	if (!hasOwn$c(AsyncIteratorPrototype, ASYNC_DISPOSE)) {
	  defineBuiltIn$9(AsyncIteratorPrototype, ASYNC_DISPOSE, function () {
	    var O = this;
	    return new Promise$1(function (resolve, reject) {
	      var $return = getMethod$6(O, 'return');
	      if ($return) {
	        Promise$1.resolve(call$o($return, O)).then(function () {
	          resolve(undefined);
	        }, reject);
	      } else resolve(undefined);
	    });
	  });
	}

	var $$1g = _export;
	var functionApply = functionApply$1;
	var aCallable$4 = aCallable$B;
	var anObject$o = anObject$U;
	var fails$z = fails$1z;

	// MS Edge argumentsList argument is optional
	var OPTIONAL_ARGUMENTS_LIST = !fails$z(function () {
	  // eslint-disable-next-line es/no-reflect -- required for testing
	  Reflect.apply(function () { /* empty */ });
	});

	// `Reflect.apply` method
	// https://tc39.es/ecma262/#sec-reflect.apply
	$$1g({ target: 'Reflect', stat: true, forced: OPTIONAL_ARGUMENTS_LIST }, {
	  apply: function apply(target, thisArgument, argumentsList) {
	    return functionApply(aCallable$4(target), thisArgument, anObject$o(argumentsList));
	  }
	});

	var $$1f = _export;
	var getBuiltIn$b = getBuiltIn$B;
	var apply$4 = functionApply$1;
	var bind$3 = functionBind;
	var aConstructor$1 = aConstructor$3;
	var anObject$n = anObject$U;
	var isObject$f = isObject$K;
	var create$5 = objectCreate;
	var fails$y = fails$1z;

	var nativeConstruct = getBuiltIn$b('Reflect', 'construct');
	var ObjectPrototype = Object.prototype;
	var push$8 = [].push;

	// `Reflect.construct` method
	// https://tc39.es/ecma262/#sec-reflect.construct
	// MS Edge supports only 2 arguments and argumentsList argument is optional
	// FF Nightly sets third argument as `new.target`, but does not create `this` from it
	var NEW_TARGET_BUG = fails$y(function () {
	  function F() { /* empty */ }
	  return !(nativeConstruct(function () { /* empty */ }, [], F) instanceof F);
	});

	var ARGS_BUG = !fails$y(function () {
	  nativeConstruct(function () { /* empty */ });
	});

	var FORCED$9 = NEW_TARGET_BUG || ARGS_BUG;

	$$1f({ target: 'Reflect', stat: true, forced: FORCED$9, sham: FORCED$9 }, {
	  construct: function construct(Target, args /* , newTarget */) {
	    aConstructor$1(Target);
	    anObject$n(args);
	    var newTarget = arguments.length < 3 ? Target : aConstructor$1(arguments[2]);
	    if (ARGS_BUG && !NEW_TARGET_BUG) return nativeConstruct(Target, args, newTarget);
	    if (Target === newTarget) {
	      // w/o altered newTarget, optimization for 0-4 arguments
	      switch (args.length) {
	        case 0: return new Target();
	        case 1: return new Target(args[0]);
	        case 2: return new Target(args[0], args[1]);
	        case 3: return new Target(args[0], args[1], args[2]);
	        case 4: return new Target(args[0], args[1], args[2], args[3]);
	      }
	      // w/o altered newTarget, lot of arguments case
	      var $args = [null];
	      apply$4(push$8, $args, args);
	      return new (apply$4(bind$3, Target, $args))();
	    }
	    // with altered newTarget, not support built-in constructors
	    var proto = newTarget.prototype;
	    var instance = create$5(isObject$f(proto) ? proto : ObjectPrototype);
	    var result = apply$4(Target, instance, args);
	    return isObject$f(result) ? result : instance;
	  }
	});

	var $$1e = _export;
	var DESCRIPTORS$e = descriptors;
	var anObject$m = anObject$U;
	var toPropertyKey$1 = toPropertyKey$8;
	var definePropertyModule$2 = objectDefineProperty;
	var fails$x = fails$1z;

	// MS Edge has broken Reflect.defineProperty - throwing instead of returning false
	var ERROR_INSTEAD_OF_FALSE = fails$x(function () {
	  // eslint-disable-next-line es/no-reflect -- required for testing
	  Reflect.defineProperty(definePropertyModule$2.f({}, 1, { value: 1 }), 1, { value: 2 });
	});

	// `Reflect.defineProperty` method
	// https://tc39.es/ecma262/#sec-reflect.defineproperty
	$$1e({ target: 'Reflect', stat: true, forced: ERROR_INSTEAD_OF_FALSE, sham: !DESCRIPTORS$e }, {
	  defineProperty: function defineProperty(target, propertyKey, attributes) {
	    anObject$m(target);
	    var key = toPropertyKey$1(propertyKey);
	    anObject$m(attributes);
	    try {
	      definePropertyModule$2.f(target, key, attributes);
	      return true;
	    } catch (error) {
	      return false;
	    }
	  }
	});

	var $$1d = _export;
	var anObject$l = anObject$U;
	var getOwnPropertyDescriptor$2 = objectGetOwnPropertyDescriptor.f;

	// `Reflect.deleteProperty` method
	// https://tc39.es/ecma262/#sec-reflect.deleteproperty
	$$1d({ target: 'Reflect', stat: true }, {
	  deleteProperty: function deleteProperty(target, propertyKey) {
	    var descriptor = getOwnPropertyDescriptor$2(anObject$l(target), propertyKey);
	    return descriptor && !descriptor.configurable ? false : delete target[propertyKey];
	  }
	});

	var hasOwn$b = hasOwnProperty_1;

	var isDataDescriptor$2 = function (descriptor) {
	  return descriptor !== undefined && (hasOwn$b(descriptor, 'value') || hasOwn$b(descriptor, 'writable'));
	};

	var $$1c = _export;
	var call$n = functionCall;
	var isObject$e = isObject$K;
	var anObject$k = anObject$U;
	var isDataDescriptor$1 = isDataDescriptor$2;
	var getOwnPropertyDescriptorModule$3 = objectGetOwnPropertyDescriptor;
	var getPrototypeOf$1 = objectGetPrototypeOf$2;

	// `Reflect.get` method
	// https://tc39.es/ecma262/#sec-reflect.get
	function get(target, propertyKey /* , receiver */) {
	  var receiver = arguments.length < 3 ? target : arguments[2];
	  var descriptor, prototype;
	  if (anObject$k(target) === receiver) return target[propertyKey];
	  descriptor = getOwnPropertyDescriptorModule$3.f(target, propertyKey);
	  if (descriptor) return isDataDescriptor$1(descriptor)
	    ? descriptor.value
	    : descriptor.get === undefined ? undefined : call$n(descriptor.get, receiver);
	  if (isObject$e(prototype = getPrototypeOf$1(target))) return get(prototype, propertyKey, receiver);
	}

	$$1c({ target: 'Reflect', stat: true }, {
	  get: get
	});

	var $$1b = _export;
	var DESCRIPTORS$d = descriptors;
	var anObject$j = anObject$U;
	var getOwnPropertyDescriptorModule$2 = objectGetOwnPropertyDescriptor;

	// `Reflect.getOwnPropertyDescriptor` method
	// https://tc39.es/ecma262/#sec-reflect.getownpropertydescriptor
	$$1b({ target: 'Reflect', stat: true, sham: !DESCRIPTORS$d }, {
	  getOwnPropertyDescriptor: function getOwnPropertyDescriptor(target, propertyKey) {
	    return getOwnPropertyDescriptorModule$2.f(anObject$j(target), propertyKey);
	  }
	});

	var $$1a = _export;
	var anObject$i = anObject$U;
	var objectGetPrototypeOf = objectGetPrototypeOf$2;
	var CORRECT_PROTOTYPE_GETTER = correctPrototypeGetter;

	// `Reflect.getPrototypeOf` method
	// https://tc39.es/ecma262/#sec-reflect.getprototypeof
	$$1a({ target: 'Reflect', stat: true, sham: !CORRECT_PROTOTYPE_GETTER }, {
	  getPrototypeOf: function getPrototypeOf(target) {
	    return objectGetPrototypeOf(anObject$i(target));
	  }
	});

	var $$19 = _export;

	// `Reflect.has` method
	// https://tc39.es/ecma262/#sec-reflect.has
	$$19({ target: 'Reflect', stat: true }, {
	  has: function has(target, propertyKey) {
	    return propertyKey in target;
	  }
	});

	var $$18 = _export;
	var anObject$h = anObject$U;
	var $isExtensible = objectIsExtensible;

	// `Reflect.isExtensible` method
	// https://tc39.es/ecma262/#sec-reflect.isextensible
	$$18({ target: 'Reflect', stat: true }, {
	  isExtensible: function isExtensible(target) {
	    anObject$h(target);
	    return $isExtensible(target);
	  }
	});

	var $$17 = _export;
	var ownKeys = ownKeys$3;

	// `Reflect.ownKeys` method
	// https://tc39.es/ecma262/#sec-reflect.ownkeys
	$$17({ target: 'Reflect', stat: true }, {
	  ownKeys: ownKeys
	});

	var $$16 = _export;
	var getBuiltIn$a = getBuiltIn$B;
	var anObject$g = anObject$U;
	var FREEZING$1 = freezing;

	// `Reflect.preventExtensions` method
	// https://tc39.es/ecma262/#sec-reflect.preventextensions
	$$16({ target: 'Reflect', stat: true, sham: !FREEZING$1 }, {
	  preventExtensions: function preventExtensions(target) {
	    anObject$g(target);
	    try {
	      var objectPreventExtensions = getBuiltIn$a('Object', 'preventExtensions');
	      if (objectPreventExtensions) objectPreventExtensions(target);
	      return true;
	    } catch (error) {
	      return false;
	    }
	  }
	});

	var $$15 = _export;
	var call$m = functionCall;
	var anObject$f = anObject$U;
	var isObject$d = isObject$K;
	var isDataDescriptor = isDataDescriptor$2;
	var fails$w = fails$1z;
	var definePropertyModule$1 = objectDefineProperty;
	var getOwnPropertyDescriptorModule$1 = objectGetOwnPropertyDescriptor;
	var getPrototypeOf = objectGetPrototypeOf$2;
	var createPropertyDescriptor$4 = createPropertyDescriptor$d;

	// `Reflect.set` method
	// https://tc39.es/ecma262/#sec-reflect.set
	function set(target, propertyKey, V /* , receiver */) {
	  var receiver = arguments.length < 4 ? target : arguments[3];
	  var ownDescriptor = getOwnPropertyDescriptorModule$1.f(anObject$f(target), propertyKey);
	  var existingDescriptor, prototype, setter;
	  if (!ownDescriptor) {
	    if (isObject$d(prototype = getPrototypeOf(target))) {
	      return set(prototype, propertyKey, V, receiver);
	    }
	    ownDescriptor = createPropertyDescriptor$4(0);
	  }
	  if (isDataDescriptor(ownDescriptor)) {
	    if (ownDescriptor.writable === false || !isObject$d(receiver)) return false;
	    if (existingDescriptor = getOwnPropertyDescriptorModule$1.f(receiver, propertyKey)) {
	      if (existingDescriptor.get || existingDescriptor.set || existingDescriptor.writable === false) return false;
	      existingDescriptor.value = V;
	      definePropertyModule$1.f(receiver, propertyKey, existingDescriptor);
	    } else definePropertyModule$1.f(receiver, propertyKey, createPropertyDescriptor$4(0, V));
	  } else {
	    setter = ownDescriptor.set;
	    if (setter === undefined) return false;
	    call$m(setter, receiver, V);
	  } return true;
	}

	// MS Edge 17-18 Reflect.set allows setting the property to object
	// with non-writable property on the prototype
	var MS_EDGE_BUG = fails$w(function () {
	  var Constructor = function () { /* empty */ };
	  var object = definePropertyModule$1.f(new Constructor(), 'a', { configurable: true });
	  // eslint-disable-next-line es/no-reflect -- required for testing
	  return Reflect.set(Constructor.prototype, 'a', 1, object) !== false;
	});

	$$15({ target: 'Reflect', stat: true, forced: MS_EDGE_BUG }, {
	  set: set
	});

	var $$14 = _export;
	var anObject$e = anObject$U;
	var aPossiblePrototype = aPossiblePrototype$2;
	var objectSetPrototypeOf = objectSetPrototypeOf$1;

	// `Reflect.setPrototypeOf` method
	// https://tc39.es/ecma262/#sec-reflect.setprototypeof
	if (objectSetPrototypeOf) $$14({ target: 'Reflect', stat: true }, {
	  setPrototypeOf: function setPrototypeOf(target, proto) {
	    anObject$e(target);
	    aPossiblePrototype(proto);
	    try {
	      objectSetPrototypeOf(target, proto);
	      return true;
	    } catch (error) {
	      return false;
	    }
	  }
	});

	var $$13 = _export;
	var globalThis$B = globalThis_1;
	var setToStringTag$4 = setToStringTag$e;

	$$13({ global: true }, { Reflect: {} });

	// Reflect[@@toStringTag] property
	// https://tc39.es/ecma262/#sec-reflect-@@tostringtag
	setToStringTag$4(globalThis$B.Reflect, 'Reflect', true);

	var isObject$c = isObject$K;
	var classof$9 = classofRaw$2;
	var wellKnownSymbol$a = wellKnownSymbol$K;

	var MATCH$2 = wellKnownSymbol$a('match');

	// `IsRegExp` abstract operation
	// https://tc39.es/ecma262/#sec-isregexp
	var isRegexp = function (it) {
	  var isRegExp;
	  return isObject$c(it) && ((isRegExp = it[MATCH$2]) !== undefined ? !!isRegExp : classof$9(it) === 'RegExp');
	};

	var globalThis$A = globalThis_1;
	var fails$v = fails$1z;

	// babel-minify and Closure Compiler transpiles RegExp('.', 'd') -> /./d and it causes SyntaxError
	var RegExp$1 = globalThis$A.RegExp;

	var FLAGS_GETTER_IS_CORRECT = !fails$v(function () {
	  var INDICES_SUPPORT = true;
	  try {
	    RegExp$1('.', 'd');
	  } catch (error) {
	    INDICES_SUPPORT = false;
	  }

	  var O = {};
	  // modern V8 bug
	  var calls = '';
	  var expected = INDICES_SUPPORT ? 'dgimsy' : 'gimsy';

	  var addGetter = function (key, chr) {
	    // eslint-disable-next-line es/no-object-defineproperty -- safe
	    Object.defineProperty(O, key, { get: function () {
	      calls += chr;
	      return true;
	    } });
	  };

	  var pairs = {
	    dotAll: 's',
	    global: 'g',
	    ignoreCase: 'i',
	    multiline: 'm',
	    sticky: 'y'
	  };

	  if (INDICES_SUPPORT) pairs.hasIndices = 'd';

	  for (var key in pairs) addGetter(key, pairs[key]);

	  // eslint-disable-next-line es/no-object-getownpropertydescriptor -- safe
	  var result = Object.getOwnPropertyDescriptor(RegExp$1.prototype, 'flags').get.call(O);

	  return result !== expected || calls !== expected;
	});

	var regexpFlagsDetection = { correct: FLAGS_GETTER_IS_CORRECT };

	var anObject$d = anObject$U;

	// `RegExp.prototype.flags` getter implementation
	// https://tc39.es/ecma262/#sec-get-regexp.prototype.flags
	var regexpFlags$1 = function () {
	  var that = anObject$d(this);
	  var result = '';
	  if (that.hasIndices) result += 'd';
	  if (that.global) result += 'g';
	  if (that.ignoreCase) result += 'i';
	  if (that.multiline) result += 'm';
	  if (that.dotAll) result += 's';
	  if (that.unicode) result += 'u';
	  if (that.unicodeSets) result += 'v';
	  if (that.sticky) result += 'y';
	  return result;
	};

	var call$l = functionCall;
	var hasOwn$a = hasOwnProperty_1;
	var isPrototypeOf$2 = objectIsPrototypeOf;
	var regExpFlagsDetection$1 = regexpFlagsDetection;
	var regExpFlagsGetterImplementation$1 = regexpFlags$1;

	var RegExpPrototype$6 = RegExp.prototype;

	var regexpGetFlags = regExpFlagsDetection$1.correct ? function (it) {
	  return it.flags;
	} : function (it) {
	  return (!regExpFlagsDetection$1.correct && isPrototypeOf$2(RegExpPrototype$6, it) && !hasOwn$a(it, 'flags'))
	    ? call$l(regExpFlagsGetterImplementation$1, it)
	    : it.flags;
	};

	var fails$u = fails$1z;
	var globalThis$z = globalThis_1;

	// babel-minify and Closure Compiler transpiles RegExp('a', 'y') -> /a/y and it causes SyntaxError
	var $RegExp$2 = globalThis$z.RegExp;

	var UNSUPPORTED_Y$3 = fails$u(function () {
	  var re = $RegExp$2('a', 'y');
	  re.lastIndex = 2;
	  return re.exec('abcd') !== null;
	});

	// UC Browser bug
	// https://github.com/zloirock/core-js/issues/1008
	var MISSED_STICKY$2 = UNSUPPORTED_Y$3 || fails$u(function () {
	  return !$RegExp$2('a', 'y').sticky;
	});

	var BROKEN_CARET = UNSUPPORTED_Y$3 || fails$u(function () {
	  // https://bugzilla.mozilla.org/show_bug.cgi?id=773687
	  var re = $RegExp$2('^r', 'gy');
	  re.lastIndex = 2;
	  return re.exec('str') !== null;
	});

	var regexpStickyHelpers = {
	  BROKEN_CARET: BROKEN_CARET,
	  MISSED_STICKY: MISSED_STICKY$2,
	  UNSUPPORTED_Y: UNSUPPORTED_Y$3
	};

	var fails$t = fails$1z;
	var globalThis$y = globalThis_1;

	// babel-minify and Closure Compiler transpiles RegExp('.', 's') -> /./s and it causes SyntaxError
	var $RegExp$1 = globalThis$y.RegExp;

	var regexpUnsupportedDotAll = fails$t(function () {
	  var re = $RegExp$1('.', 's');
	  return !(re.dotAll && re.test('\n') && re.flags === 's');
	});

	var fails$s = fails$1z;
	var globalThis$x = globalThis_1;

	// babel-minify and Closure Compiler transpiles RegExp('(?<a>b)', 'g') -> /(?<a>b)/g and it causes SyntaxError
	var $RegExp = globalThis$x.RegExp;

	var regexpUnsupportedNcg = fails$s(function () {
	  var re = $RegExp('(?<a>b)', 'g');
	  return re.exec('b').groups.a !== 'b' ||
	    'b'.replace(re, '$<a>c') !== 'bc';
	});

	var DESCRIPTORS$c = descriptors;
	var globalThis$w = globalThis_1;
	var uncurryThis$I = functionUncurryThis;
	var isForced = isForced_1;
	var inheritIfRequired$2 = inheritIfRequired$7;
	var createNonEnumerableProperty$5 = createNonEnumerableProperty$h;
	var create$4 = objectCreate;
	var getOwnPropertyNames$1 = objectGetOwnPropertyNames.f;
	var isPrototypeOf$1 = objectIsPrototypeOf;
	var isRegExp$3 = isRegexp;
	var toString$q = toString$D;
	var getRegExpFlags$6 = regexpGetFlags;
	var stickyHelpers$2 = regexpStickyHelpers;
	var proxyAccessor = proxyAccessor$2;
	var defineBuiltIn$8 = defineBuiltIn$t;
	var fails$r = fails$1z;
	var hasOwn$9 = hasOwnProperty_1;
	var enforceInternalState$2 = internalState.enforce;
	var setSpecies$1 = setSpecies$6;
	var wellKnownSymbol$9 = wellKnownSymbol$K;
	var UNSUPPORTED_DOT_ALL$2 = regexpUnsupportedDotAll;
	var UNSUPPORTED_NCG$1 = regexpUnsupportedNcg;

	var MATCH$1 = wellKnownSymbol$9('match');
	var NativeRegExp = globalThis$w.RegExp;
	var RegExpPrototype$5 = NativeRegExp.prototype;
	var SyntaxError$3 = globalThis$w.SyntaxError;
	var exec$8 = uncurryThis$I(RegExpPrototype$5.exec);
	var charAt$e = uncurryThis$I(''.charAt);
	var replace$7 = uncurryThis$I(''.replace);
	var stringIndexOf$4 = uncurryThis$I(''.indexOf);
	var stringSlice$c = uncurryThis$I(''.slice);
	// TODO: Use only proper RegExpIdentifierName
	var IS_NCG = /^\?<[^\s\d!#%&*+<=>@^][^\s!#%&*+<=>@^]*>/;
	var re1 = /a/g;
	var re2 = /a/g;

	// "new" should create a new object, old webkit bug
	var CORRECT_NEW = new NativeRegExp(re1) !== re1;

	var MISSED_STICKY$1 = stickyHelpers$2.MISSED_STICKY;
	var UNSUPPORTED_Y$2 = stickyHelpers$2.UNSUPPORTED_Y;

	var BASE_FORCED = DESCRIPTORS$c &&
	  (!CORRECT_NEW || MISSED_STICKY$1 || UNSUPPORTED_DOT_ALL$2 || UNSUPPORTED_NCG$1 || fails$r(function () {
	    re2[MATCH$1] = false;
	    // RegExp constructor can alter flags and IsRegExp works correct with @@match
	    // eslint-disable-next-line sonarjs/inconsistent-function-call -- required for testing
	    return NativeRegExp(re1) !== re1 || NativeRegExp(re2) === re2 || String(NativeRegExp(re1, 'i')) !== '/a/i';
	  }));

	var handleDotAll = function (string) {
	  var length = string.length;
	  var index = 0;
	  var result = '';
	  var brackets = false;
	  var chr;
	  for (; index <= length; index++) {
	    chr = charAt$e(string, index);
	    if (chr === '\\') {
	      result += chr + charAt$e(string, ++index);
	      continue;
	    }
	    if (!brackets && chr === '.') {
	      result += '[\\s\\S]';
	    } else {
	      if (chr === '[') {
	        brackets = true;
	      } else if (chr === ']') {
	        brackets = false;
	      } result += chr;
	    }
	  } return result;
	};

	var handleNCG = function (string) {
	  var length = string.length;
	  var index = 0;
	  var result = '';
	  var named = [];
	  var names = create$4(null);
	  var brackets = false;
	  var ncg = false;
	  var groupid = 0;
	  var groupname = '';
	  var chr;
	  for (; index <= length; index++) {
	    chr = charAt$e(string, index);
	    if (chr === '\\') {
	      chr += charAt$e(string, ++index);
	    } else if (chr === ']') {
	      brackets = false;
	    } else if (!brackets) switch (true) {
	      case chr === '[':
	        brackets = true;
	        break;
	      case chr === '(':
	        result += chr;
	        // ignore non-capturing groups
	        if (stringSlice$c(string, index + 1, index + 3) === '?:') {
	          continue;
	        }
	        if (exec$8(IS_NCG, stringSlice$c(string, index + 1))) {
	          index += 2;
	          ncg = true;
	        }
	        groupid++;
	        continue;
	      case chr === '>' && ncg:
	        if (groupname === '' || hasOwn$9(names, groupname)) {
	          throw new SyntaxError$3('Invalid capture group name');
	        }
	        names[groupname] = true;
	        named[named.length] = [groupname, groupid];
	        ncg = false;
	        groupname = '';
	        continue;
	    }
	    if (ncg) groupname += chr;
	    else result += chr;
	  } return [result, named];
	};

	// `RegExp` constructor
	// https://tc39.es/ecma262/#sec-regexp-constructor
	if (isForced('RegExp', BASE_FORCED)) {
	  var RegExpWrapper = function RegExp(pattern, flags) {
	    var thisIsRegExp = isPrototypeOf$1(RegExpPrototype$5, this);
	    var patternIsRegExp = isRegExp$3(pattern);
	    var flagsAreUndefined = flags === undefined;
	    var groups = [];
	    var rawPattern = pattern;
	    var rawFlags, dotAll, sticky, handled, result, state;

	    if (!thisIsRegExp && patternIsRegExp && flagsAreUndefined && pattern.constructor === RegExpWrapper) {
	      return pattern;
	    }

	    if (patternIsRegExp || isPrototypeOf$1(RegExpPrototype$5, pattern)) {
	      pattern = pattern.source;
	      if (flagsAreUndefined) flags = getRegExpFlags$6(rawPattern);
	    }

	    pattern = pattern === undefined ? '' : toString$q(pattern);
	    flags = flags === undefined ? '' : toString$q(flags);
	    rawPattern = pattern;

	    if (UNSUPPORTED_DOT_ALL$2 && 'dotAll' in re1) {
	      dotAll = !!flags && stringIndexOf$4(flags, 's') > -1;
	      if (dotAll) flags = replace$7(flags, /s/g, '');
	    }

	    rawFlags = flags;

	    if (MISSED_STICKY$1 && 'sticky' in re1) {
	      sticky = !!flags && stringIndexOf$4(flags, 'y') > -1;
	      if (sticky && UNSUPPORTED_Y$2) flags = replace$7(flags, /y/g, '');
	    }

	    if (UNSUPPORTED_NCG$1) {
	      handled = handleNCG(pattern);
	      pattern = handled[0];
	      groups = handled[1];
	    }

	    result = inheritIfRequired$2(NativeRegExp(pattern, flags), thisIsRegExp ? this : RegExpPrototype$5, RegExpWrapper);

	    if (dotAll || sticky || groups.length) {
	      state = enforceInternalState$2(result);
	      if (dotAll) {
	        state.dotAll = true;
	        state.raw = RegExpWrapper(handleDotAll(pattern), rawFlags);
	      }
	      if (sticky) state.sticky = true;
	      if (groups.length) state.groups = groups;
	    }

	    if (pattern !== rawPattern) try {
	      // fails in old engines, but we have no alternatives for unsupported regex syntax
	      createNonEnumerableProperty$5(result, 'source', rawPattern === '' ? '(?:)' : rawPattern);
	    } catch (error) { /* empty */ }

	    return result;
	  };

	  for (var keys$1 = getOwnPropertyNames$1(NativeRegExp), index$1 = 0; keys$1.length > index$1;) {
	    proxyAccessor(RegExpWrapper, NativeRegExp, keys$1[index$1++]);
	  }

	  RegExpPrototype$5.constructor = RegExpWrapper;
	  RegExpWrapper.prototype = RegExpPrototype$5;
	  defineBuiltIn$8(globalThis$w, 'RegExp', RegExpWrapper, { constructor: true });
	}

	// https://tc39.es/ecma262/#sec-get-regexp-@@species
	setSpecies$1('RegExp');

	var $TypeError$c = TypeError;

	var aString$4 = function (argument) {
	  if (typeof argument == 'string') return argument;
	  throw new $TypeError$c('Argument is not a string');
	};

	var $$12 = _export;
	var uncurryThis$H = functionUncurryThis;
	var aString$3 = aString$4;
	var hasOwn$8 = hasOwnProperty_1;
	var padStart = stringPad.start;
	var WHITESPACES = whitespaces$5;

	var $Array$1 = Array;
	var $escape = RegExp.escape;
	var charAt$d = uncurryThis$H(''.charAt);
	var charCodeAt$5 = uncurryThis$H(''.charCodeAt);
	var numberToString$2 = uncurryThis$H(1.1.toString);
	var join$7 = uncurryThis$H([].join);
	var FIRST_DIGIT_OR_ASCII = /^[0-9a-z]/i;
	var SYNTAX_SOLIDUS = /^[$()*+./?[\\\]^{|}]/;
	var OTHER_PUNCTUATORS_AND_WHITESPACES = RegExp('^[!"#%&\',\\-:;<=>@`~' + WHITESPACES + ']');
	var exec$7 = uncurryThis$H(FIRST_DIGIT_OR_ASCII.exec);

	var ControlEscape = {
	  '\u0009': 't',
	  '\u000A': 'n',
	  '\u000B': 'v',
	  '\u000C': 'f',
	  '\u000D': 'r'
	};

	var escapeChar = function (chr) {
	  var hex = numberToString$2(charCodeAt$5(chr, 0), 16);
	  return hex.length < 3 ? '\\x' + padStart(hex, 2, '0') : '\\u' + padStart(hex, 4, '0');
	};

	// Avoiding the use of polyfills of the previous iteration of this proposal
	var FORCED$8 = !$escape || $escape('ab') !== '\\x61b';

	// `RegExp.escape` method
	// https://tc39.es/ecma262/#sec-regexp.escape
	$$12({ target: 'RegExp', stat: true, forced: FORCED$8 }, {
	  escape: function escape(S) {
	    aString$3(S);
	    var length = S.length;
	    var result = $Array$1(length);

	    for (var i = 0; i < length; i++) {
	      var chr = charAt$d(S, i);
	      if (i === 0 && exec$7(FIRST_DIGIT_OR_ASCII, chr)) {
	        result[i] = escapeChar(chr);
	      } else if (hasOwn$8(ControlEscape, chr)) {
	        result[i] = '\\' + ControlEscape[chr];
	      } else if (exec$7(SYNTAX_SOLIDUS, chr)) {
	        result[i] = '\\' + chr;
	      } else if (exec$7(OTHER_PUNCTUATORS_AND_WHITESPACES, chr)) {
	        result[i] = escapeChar(chr);
	      } else {
	        var charCode = charCodeAt$5(chr, 0);
	        // single UTF-16 code unit
	        if ((charCode & 0xF800) !== 0xD800) result[i] = chr;
	        // unpaired surrogate
	        else if (charCode >= 0xDC00 || i + 1 >= length || (charCodeAt$5(S, i + 1) & 0xFC00) !== 0xDC00) result[i] = escapeChar(chr);
	        // surrogate pair
	        else {
	          result[i] = chr;
	          result[++i] = charAt$d(S, i);
	        }
	      }
	    }

	    return join$7(result, '');
	  }
	});

	var DESCRIPTORS$b = descriptors;
	var UNSUPPORTED_DOT_ALL$1 = regexpUnsupportedDotAll;
	var classof$8 = classofRaw$2;
	var defineBuiltInAccessor$8 = defineBuiltInAccessor$l;
	var getInternalState$6 = internalState.get;

	var RegExpPrototype$4 = RegExp.prototype;
	var $TypeError$b = TypeError;

	// `RegExp.prototype.dotAll` getter
	// https://tc39.es/ecma262/#sec-get-regexp.prototype.dotall
	if (DESCRIPTORS$b && UNSUPPORTED_DOT_ALL$1) {
	  defineBuiltInAccessor$8(RegExpPrototype$4, 'dotAll', {
	    configurable: true,
	    get: function dotAll() {
	      if (this === RegExpPrototype$4) return;
	      // We can't use InternalStateModule.getterFor because
	      // we don't add metadata for regexps created by a literal.
	      if (classof$8(this) === 'RegExp') {
	        return !!getInternalState$6(this).dotAll;
	      }
	      throw new $TypeError$b('Incompatible receiver, RegExp required');
	    }
	  });
	}

	/* eslint-disable regexp/no-empty-capturing-group, regexp/no-empty-group, regexp/no-lazy-ends -- testing */
	/* eslint-disable regexp/no-useless-quantifier -- testing */
	var call$k = functionCall;
	var uncurryThis$G = functionUncurryThis;
	var toString$p = toString$D;
	var regexpFlags = regexpFlags$1;
	var stickyHelpers$1 = regexpStickyHelpers;
	var shared = shared$8;
	var create$3 = objectCreate;
	var getInternalState$5 = internalState.get;
	var UNSUPPORTED_DOT_ALL = regexpUnsupportedDotAll;
	var UNSUPPORTED_NCG = regexpUnsupportedNcg;

	var nativeReplace = shared('native-string-replace', String.prototype.replace);
	var nativeExec = RegExp.prototype.exec;
	var patchedExec = nativeExec;
	var charAt$c = uncurryThis$G(''.charAt);
	var indexOf$1 = uncurryThis$G(''.indexOf);
	var replace$6 = uncurryThis$G(''.replace);
	var stringSlice$b = uncurryThis$G(''.slice);

	var UPDATES_LAST_INDEX_WRONG = (function () {
	  var re1 = /a/;
	  var re2 = /b*/g;
	  call$k(nativeExec, re1, 'a');
	  call$k(nativeExec, re2, 'a');
	  return re1.lastIndex !== 0 || re2.lastIndex !== 0;
	})();

	var UNSUPPORTED_Y$1 = stickyHelpers$1.BROKEN_CARET;

	// nonparticipating capturing group, copied from es5-shim's String#split patch.
	var NPCG_INCLUDED = /()??/.exec('')[1] !== undefined;

	var PATCH = UPDATES_LAST_INDEX_WRONG || NPCG_INCLUDED || UNSUPPORTED_Y$1 || UNSUPPORTED_DOT_ALL || UNSUPPORTED_NCG;

	if (PATCH) {
	  patchedExec = function exec(string) {
	    var re = this;
	    var state = getInternalState$5(re);
	    var str = toString$p(string);
	    var raw = state.raw;
	    var result, reCopy, lastIndex, match, i, object, group;

	    if (raw) {
	      raw.lastIndex = re.lastIndex;
	      result = call$k(patchedExec, raw, str);
	      re.lastIndex = raw.lastIndex;
	      return result;
	    }

	    var groups = state.groups;
	    var sticky = UNSUPPORTED_Y$1 && re.sticky;
	    var flags = call$k(regexpFlags, re);
	    var source = re.source;
	    var charsAdded = 0;
	    var strCopy = str;

	    if (sticky) {
	      flags = replace$6(flags, 'y', '');
	      if (indexOf$1(flags, 'g') === -1) {
	        flags += 'g';
	      }

	      strCopy = stringSlice$b(str, re.lastIndex);
	      // Support anchored sticky behavior.
	      if (re.lastIndex > 0 && (!re.multiline || re.multiline && charAt$c(str, re.lastIndex - 1) !== '\n')) {
	        source = '(?: ' + source + ')';
	        strCopy = ' ' + strCopy;
	        charsAdded++;
	      }
	      // ^(? + rx + ) is needed, in combination with some str slicing, to
	      // simulate the 'y' flag.
	      reCopy = new RegExp('^(?:' + source + ')', flags);
	    }

	    if (NPCG_INCLUDED) {
	      reCopy = new RegExp('^' + source + '$(?!\\s)', flags);
	    }
	    if (UPDATES_LAST_INDEX_WRONG) lastIndex = re.lastIndex;

	    match = call$k(nativeExec, sticky ? reCopy : re, strCopy);

	    if (sticky) {
	      if (match) {
	        match.input = stringSlice$b(match.input, charsAdded);
	        match[0] = stringSlice$b(match[0], charsAdded);
	        match.index = re.lastIndex;
	        re.lastIndex += match[0].length;
	      } else re.lastIndex = 0;
	    } else if (UPDATES_LAST_INDEX_WRONG && match) {
	      re.lastIndex = re.global ? match.index + match[0].length : lastIndex;
	    }
	    if (NPCG_INCLUDED && match && match.length > 1) {
	      // Fix browsers whose `exec` methods don't consistently return `undefined`
	      // for NPCG, like IE8. NOTE: This doesn't work for /(.?)?/
	      call$k(nativeReplace, match[0], reCopy, function () {
	        for (i = 1; i < arguments.length - 2; i++) {
	          if (arguments[i] === undefined) match[i] = undefined;
	        }
	      });
	    }

	    if (match && groups) {
	      match.groups = object = create$3(null);
	      for (i = 0; i < groups.length; i++) {
	        group = groups[i];
	        object[group[0]] = match[group[1]];
	      }
	    }

	    return match;
	  };
	}

	var regexpExec$2 = patchedExec;

	var $$11 = _export;
	var exec$6 = regexpExec$2;

	// `RegExp.prototype.exec` method
	// https://tc39.es/ecma262/#sec-regexp.prototype.exec
	$$11({ target: 'RegExp', proto: true, forced: /./.exec !== exec$6 }, {
	  exec: exec$6
	});

	var DESCRIPTORS$a = descriptors;
	var defineBuiltInAccessor$7 = defineBuiltInAccessor$l;
	var regExpFlagsDetection = regexpFlagsDetection;
	var regExpFlagsGetterImplementation = regexpFlags$1;

	// `RegExp.prototype.flags` getter
	// https://tc39.es/ecma262/#sec-get-regexp.prototype.flags
	if (DESCRIPTORS$a && !regExpFlagsDetection.correct) {
	  defineBuiltInAccessor$7(RegExp.prototype, 'flags', {
	    configurable: true,
	    get: regExpFlagsGetterImplementation
	  });

	  regExpFlagsDetection.correct = true;
	}

	var DESCRIPTORS$9 = descriptors;
	var MISSED_STICKY = regexpStickyHelpers.MISSED_STICKY;
	var classof$7 = classofRaw$2;
	var defineBuiltInAccessor$6 = defineBuiltInAccessor$l;
	var getInternalState$4 = internalState.get;

	var RegExpPrototype$3 = RegExp.prototype;
	var $TypeError$a = TypeError;

	// `RegExp.prototype.sticky` getter
	// https://tc39.es/ecma262/#sec-get-regexp.prototype.sticky
	if (DESCRIPTORS$9 && MISSED_STICKY) {
	  defineBuiltInAccessor$6(RegExpPrototype$3, 'sticky', {
	    configurable: true,
	    get: function sticky() {
	      if (this === RegExpPrototype$3) return;
	      // We can't use InternalStateModule.getterFor because
	      // we don't add metadata for regexps created by a literal.
	      if (classof$7(this) === 'RegExp') {
	        return !!getInternalState$4(this).sticky;
	      }
	      throw new $TypeError$a('Incompatible receiver, RegExp required');
	    }
	  });
	}

	// TODO: Remove from `core-js@4` since it's moved to entry points

	var $$10 = _export;
	var call$j = functionCall;
	var isCallable$6 = isCallable$A;
	var anObject$c = anObject$U;
	var toString$o = toString$D;

	var DELEGATES_TO_EXEC = function () {
	  var execCalled = false;
	  var re = /[ac]/;
	  re.exec = function () {
	    execCalled = true;
	    return /./.exec.apply(this, arguments);
	  };
	  return re.test('abc') === true && execCalled;
	}();

	var nativeTest = /./.test;

	// `RegExp.prototype.test` method
	// https://tc39.es/ecma262/#sec-regexp.prototype.test
	$$10({ target: 'RegExp', proto: true, forced: !DELEGATES_TO_EXEC }, {
	  test: function (S) {
	    var R = anObject$c(this);
	    var string = toString$o(S);
	    var exec = R.exec;
	    if (!isCallable$6(exec)) return call$j(nativeTest, R, string);
	    var result = call$j(exec, R, string);
	    if (result === null) return false;
	    anObject$c(result);
	    return true;
	  }
	});

	var PROPER_FUNCTION_NAME$1 = functionName.PROPER;
	var defineBuiltIn$7 = defineBuiltIn$t;
	var anObject$b = anObject$U;
	var $toString$2 = toString$D;
	var fails$q = fails$1z;
	var getRegExpFlags$5 = regexpGetFlags;

	var TO_STRING = 'toString';
	var RegExpPrototype$2 = RegExp.prototype;
	var nativeToString = RegExpPrototype$2[TO_STRING];

	var NOT_GENERIC = fails$q(function () { return nativeToString.call({ source: 'a', flags: 'b' }) !== '/a/b'; });
	// FF44- RegExp#toString has a wrong name
	var INCORRECT_NAME = PROPER_FUNCTION_NAME$1 && nativeToString.name !== TO_STRING;

	// `RegExp.prototype.toString` method
	// https://tc39.es/ecma262/#sec-regexp.prototype.tostring
	if (NOT_GENERIC || INCORRECT_NAME) {
	  defineBuiltIn$7(RegExpPrototype$2, TO_STRING, function toString() {
	    var R = anObject$b(this);
	    var pattern = $toString$2(R.source);
	    var flags = $toString$2(getRegExpFlags$5(R));
	    return '/' + pattern + '/' + flags;
	  }, { unsafe: true });
	}

	var collection$2 = collection$4;
	var collectionStrong = collectionStrong$2;

	// `Set` constructor
	// https://tc39.es/ecma262/#sec-set-objects
	collection$2('Set', function (init) {
	  return function Set() { return init(this, arguments.length ? arguments[0] : undefined); };
	}, collectionStrong);

	var uncurryThis$F = functionUncurryThis;

	// eslint-disable-next-line es/no-set -- safe
	var SetPrototype$1 = Set.prototype;

	var setHelpers = {
	  // eslint-disable-next-line es/no-set -- safe
	  Set: Set,
	  add: uncurryThis$F(SetPrototype$1.add),
	  has: uncurryThis$F(SetPrototype$1.has),
	  remove: uncurryThis$F(SetPrototype$1['delete']),
	  proto: SetPrototype$1
	};

	var has$5 = setHelpers.has;

	// Perform ? RequireInternalSlot(M, [[SetData]])
	var aSet$7 = function (it) {
	  has$5(it);
	  return it;
	};

	var call$i = functionCall;

	var iterateSimple$7 = function (record, fn, ITERATOR_INSTEAD_OF_RECORD) {
	  var iterator = ITERATOR_INSTEAD_OF_RECORD ? record : record.iterator;
	  var next = record.next;
	  var step, result;
	  while (!(step = call$i(next, iterator)).done) {
	    result = fn(step.value);
	    if (result !== undefined) return result;
	  }
	};

	var uncurryThis$E = functionUncurryThis;
	var iterateSimple$6 = iterateSimple$7;
	var SetHelpers$6 = setHelpers;

	var Set$4 = SetHelpers$6.Set;
	var SetPrototype = SetHelpers$6.proto;
	var forEach$4 = uncurryThis$E(SetPrototype.forEach);
	var keys = uncurryThis$E(SetPrototype.keys);
	var next = keys(new Set$4()).next;

	var setIterate$1 = function (set, fn, interruptible) {
	  return interruptible ? iterateSimple$6({ iterator: keys(set), next: next }, fn) : forEach$4(set, fn);
	};

	var SetHelpers$5 = setHelpers;
	var iterate$3 = setIterate$1;

	var Set$3 = SetHelpers$5.Set;
	var add$3 = SetHelpers$5.add;

	var setClone = function (set) {
	  var result = new Set$3();
	  iterate$3(set, function (it) {
	    add$3(result, it);
	  });
	  return result;
	};

	var uncurryThisAccessor = functionUncurryThisAccessor;
	var SetHelpers$4 = setHelpers;

	var setSize = uncurryThisAccessor(SetHelpers$4.proto, 'size', 'get') || function (set) {
	  return set.size;
	};

	var aCallable$3 = aCallable$B;
	var anObject$a = anObject$U;
	var call$h = functionCall;
	var toIntegerOrInfinity$6 = toIntegerOrInfinity$m;
	var getIteratorDirect = getIteratorDirect$g;

	var INVALID_SIZE = 'Invalid size';
	var $RangeError$3 = RangeError;
	var $TypeError$9 = TypeError;
	var max$3 = Math.max;

	var SetRecord = function (set, intSize) {
	  this.set = set;
	  this.size = max$3(intSize, 0);
	  this.has = aCallable$3(set.has);
	  this.keys = aCallable$3(set.keys);
	};

	SetRecord.prototype = {
	  getIterator: function () {
	    return getIteratorDirect(anObject$a(call$h(this.keys, this.set)));
	  },
	  includes: function (it) {
	    return call$h(this.has, this.set, it);
	  }
	};

	// `GetSetRecord` abstract operation
	// https://tc39.es/proposal-set-methods/#sec-getsetrecord
	var getSetRecord$7 = function (obj) {
	  anObject$a(obj);
	  var numSize = +obj.size;
	  // NOTE: If size is undefined, then numSize will be NaN
	  // eslint-disable-next-line no-self-compare -- NaN check
	  if (numSize !== numSize) throw new $TypeError$9(INVALID_SIZE);
	  var intSize = toIntegerOrInfinity$6(numSize);
	  if (intSize < 0) throw new $RangeError$3(INVALID_SIZE);
	  return new SetRecord(obj, intSize);
	};

	var aSet$6 = aSet$7;
	var SetHelpers$3 = setHelpers;
	var clone$2 = setClone;
	var size$4 = setSize;
	var getSetRecord$6 = getSetRecord$7;
	var iterateSet$2 = setIterate$1;
	var iterateSimple$5 = iterateSimple$7;

	var has$4 = SetHelpers$3.has;
	var remove$1 = SetHelpers$3.remove;

	// `Set.prototype.difference` method
	// https://tc39.es/ecma262/#sec-set.prototype.difference
	var setDifference = function difference(other) {
	  var O = aSet$6(this);
	  var otherRec = getSetRecord$6(other);
	  var result = clone$2(O);
	  if (size$4(O) <= otherRec.size) iterateSet$2(O, function (e) {
	    if (otherRec.includes(e)) remove$1(result, e);
	  });
	  else iterateSimple$5(otherRec.getIterator(), function (e) {
	    if (has$4(result, e)) remove$1(result, e);
	  });
	  return result;
	};

	var getBuiltIn$9 = getBuiltIn$B;

	var createSetLike = function (size) {
	  return {
	    size: size,
	    has: function () {
	      return false;
	    },
	    keys: function () {
	      return {
	        next: function () {
	          return { done: true };
	        }
	      };
	    }
	  };
	};

	var createSetLikeWithInfinitySize = function (size) {
	  return {
	    size: size,
	    has: function () {
	      return true;
	    },
	    keys: function () {
	      throw new Error('e');
	    }
	  };
	};

	var setMethodAcceptSetLike$7 = function (name, callback) {
	  var Set = getBuiltIn$9('Set');
	  try {
	    new Set()[name](createSetLike(0));
	    try {
	      // late spec change, early WebKit ~ Safari 17 implementation does not pass it
	      // https://github.com/tc39/proposal-set-methods/pull/88
	      // also covered engines with
	      // https://bugs.webkit.org/show_bug.cgi?id=272679
	      new Set()[name](createSetLike(-1));
	      return false;
	    } catch (error2) {
	      if (!callback) return true;
	      // early V8 implementation bug
	      // https://issues.chromium.org/issues/351332634
	      try {
	        new Set()[name](createSetLikeWithInfinitySize(-Infinity));
	        return false;
	      } catch (error) {
	        var set = new Set();
	        set.add(1);
	        set.add(2);
	        return callback(set[name](createSetLikeWithInfinitySize(Infinity)));
	      }
	    }
	  } catch (error) {
	    return false;
	  }
	};

	var $$$ = _export;
	var difference = setDifference;
	var fails$p = fails$1z;
	var setMethodAcceptSetLike$6 = setMethodAcceptSetLike$7;

	var SET_LIKE_INCORRECT_BEHAVIOR = !setMethodAcceptSetLike$6('difference', function (result) {
	  return result.size === 0;
	});

	var FORCED$7 = SET_LIKE_INCORRECT_BEHAVIOR || fails$p(function () {
	  // https://bugs.webkit.org/show_bug.cgi?id=288595
	  var setLike = {
	    size: 1,
	    has: function () { return true; },
	    keys: function () {
	      var index = 0;
	      return {
	        next: function () {
	          var done = index++ > 1;
	          if (baseSet.has(1)) baseSet.clear();
	          return { done: done, value: 2 };
	        }
	      };
	    }
	  };
	  // eslint-disable-next-line es/no-set -- testing
	  var baseSet = new Set([1, 2, 3, 4]);
	  // eslint-disable-next-line es/no-set-prototype-difference -- testing
	  return baseSet.difference(setLike).size !== 3;
	});

	// `Set.prototype.difference` method
	// https://tc39.es/ecma262/#sec-set.prototype.difference
	$$$({ target: 'Set', proto: true, real: true, forced: FORCED$7 }, {
	  difference: difference
	});

	var aSet$5 = aSet$7;
	var SetHelpers$2 = setHelpers;
	var size$3 = setSize;
	var getSetRecord$5 = getSetRecord$7;
	var iterateSet$1 = setIterate$1;
	var iterateSimple$4 = iterateSimple$7;

	var Set$2 = SetHelpers$2.Set;
	var add$2 = SetHelpers$2.add;
	var has$3 = SetHelpers$2.has;

	// `Set.prototype.intersection` method
	// https://tc39.es/ecma262/#sec-set.prototype.intersection
	var setIntersection = function intersection(other) {
	  var O = aSet$5(this);
	  var otherRec = getSetRecord$5(other);
	  var result = new Set$2();

	  if (size$3(O) > otherRec.size) {
	    iterateSimple$4(otherRec.getIterator(), function (e) {
	      if (has$3(O, e)) add$2(result, e);
	    });
	  } else {
	    iterateSet$1(O, function (e) {
	      if (otherRec.includes(e)) add$2(result, e);
	    });
	  }

	  return result;
	};

	var $$_ = _export;
	var fails$o = fails$1z;
	var intersection = setIntersection;
	var setMethodAcceptSetLike$5 = setMethodAcceptSetLike$7;

	var INCORRECT$3 = !setMethodAcceptSetLike$5('intersection', function (result) {
	  return result.size === 2 && result.has(1) && result.has(2);
	}) || fails$o(function () {
	  // eslint-disable-next-line es/no-array-from, es/no-set, es/no-set-prototype-intersection -- testing
	  return String(Array.from(new Set([1, 2, 3]).intersection(new Set([3, 2])))) !== '3,2';
	});

	// `Set.prototype.intersection` method
	// https://tc39.es/ecma262/#sec-set.prototype.intersection
	$$_({ target: 'Set', proto: true, real: true, forced: INCORRECT$3 }, {
	  intersection: intersection
	});

	var aSet$4 = aSet$7;
	var has$2 = setHelpers.has;
	var size$2 = setSize;
	var getSetRecord$4 = getSetRecord$7;
	var iterateSet = setIterate$1;
	var iterateSimple$3 = iterateSimple$7;
	var iteratorClose$1 = iteratorClose$h;

	// `Set.prototype.isDisjointFrom` method
	// https://tc39.es/ecma262/#sec-set.prototype.isdisjointfrom
	var setIsDisjointFrom = function isDisjointFrom(other) {
	  var O = aSet$4(this);
	  var otherRec = getSetRecord$4(other);
	  if (size$2(O) <= otherRec.size) return iterateSet(O, function (e) {
	    if (otherRec.includes(e)) return false;
	  }, true) !== false;
	  var iterator = otherRec.getIterator();
	  return iterateSimple$3(iterator, function (e) {
	    if (has$2(O, e)) return iteratorClose$1(iterator, 'normal', false);
	  }) !== false;
	};

	var $$Z = _export;
	var isDisjointFrom = setIsDisjointFrom;
	var setMethodAcceptSetLike$4 = setMethodAcceptSetLike$7;

	var INCORRECT$2 = !setMethodAcceptSetLike$4('isDisjointFrom', function (result) {
	  return !result;
	});

	// `Set.prototype.isDisjointFrom` method
	// https://tc39.es/ecma262/#sec-set.prototype.isdisjointfrom
	$$Z({ target: 'Set', proto: true, real: true, forced: INCORRECT$2 }, {
	  isDisjointFrom: isDisjointFrom
	});

	var aSet$3 = aSet$7;
	var size$1 = setSize;
	var iterate$2 = setIterate$1;
	var getSetRecord$3 = getSetRecord$7;

	// `Set.prototype.isSubsetOf` method
	// https://tc39.es/ecma262/#sec-set.prototype.issubsetof
	var setIsSubsetOf = function isSubsetOf(other) {
	  var O = aSet$3(this);
	  var otherRec = getSetRecord$3(other);
	  if (size$1(O) > otherRec.size) return false;
	  return iterate$2(O, function (e) {
	    if (!otherRec.includes(e)) return false;
	  }, true) !== false;
	};

	var $$Y = _export;
	var isSubsetOf = setIsSubsetOf;
	var setMethodAcceptSetLike$3 = setMethodAcceptSetLike$7;

	var INCORRECT$1 = !setMethodAcceptSetLike$3('isSubsetOf', function (result) {
	  return result;
	});

	// `Set.prototype.isSubsetOf` method
	// https://tc39.es/ecma262/#sec-set.prototype.issubsetof
	$$Y({ target: 'Set', proto: true, real: true, forced: INCORRECT$1 }, {
	  isSubsetOf: isSubsetOf
	});

	var aSet$2 = aSet$7;
	var has$1 = setHelpers.has;
	var size = setSize;
	var getSetRecord$2 = getSetRecord$7;
	var iterateSimple$2 = iterateSimple$7;
	var iteratorClose = iteratorClose$h;

	// `Set.prototype.isSupersetOf` method
	// https://tc39.es/ecma262/#sec-set.prototype.issupersetof
	var setIsSupersetOf = function isSupersetOf(other) {
	  var O = aSet$2(this);
	  var otherRec = getSetRecord$2(other);
	  if (size(O) < otherRec.size) return false;
	  var iterator = otherRec.getIterator();
	  return iterateSimple$2(iterator, function (e) {
	    if (!has$1(O, e)) return iteratorClose(iterator, 'normal', false);
	  }) !== false;
	};

	var $$X = _export;
	var isSupersetOf = setIsSupersetOf;
	var setMethodAcceptSetLike$2 = setMethodAcceptSetLike$7;

	var INCORRECT = !setMethodAcceptSetLike$2('isSupersetOf', function (result) {
	  return !result;
	});

	// `Set.prototype.isSupersetOf` method
	// https://tc39.es/ecma262/#sec-set.prototype.issupersetof
	$$X({ target: 'Set', proto: true, real: true, forced: INCORRECT }, {
	  isSupersetOf: isSupersetOf
	});

	var aSet$1 = aSet$7;
	var SetHelpers$1 = setHelpers;
	var clone$1 = setClone;
	var getSetRecord$1 = getSetRecord$7;
	var iterateSimple$1 = iterateSimple$7;

	var add$1 = SetHelpers$1.add;
	var has = SetHelpers$1.has;
	var remove = SetHelpers$1.remove;

	// `Set.prototype.symmetricDifference` method
	// https://tc39.es/ecma262/#sec-set.prototype.symmetricdifference
	var setSymmetricDifference = function symmetricDifference(other) {
	  var O = aSet$1(this);
	  var keysIter = getSetRecord$1(other).getIterator();
	  var result = clone$1(O);
	  iterateSimple$1(keysIter, function (e) {
	    if (has(O, e)) remove(result, e);
	    else add$1(result, e);
	  });
	  return result;
	};

	// Should get iterator record of a set-like object before cloning this
	// https://bugs.webkit.org/show_bug.cgi?id=289430
	var setMethodGetKeysBeforeCloningDetection = function (METHOD_NAME) {
	  try {
	    // eslint-disable-next-line es/no-set -- needed for test
	    var baseSet = new Set();
	    var setLike = {
	      size: 0,
	      has: function () { return true; },
	      keys: function () {
	        // eslint-disable-next-line es/no-object-defineproperty -- needed for test
	        return Object.defineProperty({}, 'next', {
	          get: function () {
	            baseSet.clear();
	            baseSet.add(4);
	            return function () {
	              return { done: true };
	            };
	          }
	        });
	      }
	    };
	    var result = baseSet[METHOD_NAME](setLike);

	    return result.size === 1 && result.values().next().value === 4;
	  } catch (error) {
	    return false;
	  }
	};

	var $$W = _export;
	var symmetricDifference = setSymmetricDifference;
	var setMethodGetKeysBeforeCloning$1 = setMethodGetKeysBeforeCloningDetection;
	var setMethodAcceptSetLike$1 = setMethodAcceptSetLike$7;

	var FORCED$6 = !setMethodAcceptSetLike$1('symmetricDifference') || !setMethodGetKeysBeforeCloning$1('symmetricDifference');

	// `Set.prototype.symmetricDifference` method
	// https://tc39.es/ecma262/#sec-set.prototype.symmetricdifference
	$$W({ target: 'Set', proto: true, real: true, forced: FORCED$6 }, {
	  symmetricDifference: symmetricDifference
	});

	var aSet = aSet$7;
	var add = setHelpers.add;
	var clone = setClone;
	var getSetRecord = getSetRecord$7;
	var iterateSimple = iterateSimple$7;

	// `Set.prototype.union` method
	// https://tc39.es/ecma262/#sec-set.prototype.union
	var setUnion = function union(other) {
	  var O = aSet(this);
	  var keysIter = getSetRecord(other).getIterator();
	  var result = clone(O);
	  iterateSimple(keysIter, function (it) {
	    add(result, it);
	  });
	  return result;
	};

	var $$V = _export;
	var union = setUnion;
	var setMethodGetKeysBeforeCloning = setMethodGetKeysBeforeCloningDetection;
	var setMethodAcceptSetLike = setMethodAcceptSetLike$7;

	var FORCED$5 = !setMethodAcceptSetLike('union') || !setMethodGetKeysBeforeCloning('union');

	// `Set.prototype.union` method
	// https://tc39.es/ecma262/#sec-set.prototype.union
	$$V({ target: 'Set', proto: true, real: true, forced: FORCED$5 }, {
	  union: union
	});

	var $$U = _export;
	var uncurryThis$D = functionUncurryThis;
	var requireObjectCoercible$e = requireObjectCoercible$o;
	var toIntegerOrInfinity$5 = toIntegerOrInfinity$m;
	var toString$n = toString$D;
	var fails$n = fails$1z;

	var charAt$b = uncurryThis$D(''.charAt);

	var FORCED$4 = fails$n(function () {
	  // eslint-disable-next-line es/no-string-prototype-at -- safe
	  return '𠮷'.at(-2) !== '\uD842';
	});

	// `String.prototype.at` method
	// https://tc39.es/ecma262/#sec-string.prototype.at
	$$U({ target: 'String', proto: true, forced: FORCED$4 }, {
	  at: function at(index) {
	    var S = toString$n(requireObjectCoercible$e(this));
	    var len = S.length;
	    var relativeIndex = toIntegerOrInfinity$5(index);
	    var k = relativeIndex >= 0 ? relativeIndex : len + relativeIndex;
	    return (k < 0 || k >= len) ? undefined : charAt$b(S, k);
	  }
	});

	var uncurryThis$C = functionUncurryThis;
	var toIntegerOrInfinity$4 = toIntegerOrInfinity$m;
	var toString$m = toString$D;
	var requireObjectCoercible$d = requireObjectCoercible$o;

	var charAt$a = uncurryThis$C(''.charAt);
	var charCodeAt$4 = uncurryThis$C(''.charCodeAt);
	var stringSlice$a = uncurryThis$C(''.slice);

	var createMethod = function (CONVERT_TO_STRING) {
	  return function ($this, pos) {
	    var S = toString$m(requireObjectCoercible$d($this));
	    var position = toIntegerOrInfinity$4(pos);
	    var size = S.length;
	    var first, second;
	    if (position < 0 || position >= size) return CONVERT_TO_STRING ? '' : undefined;
	    first = charCodeAt$4(S, position);
	    return first < 0xD800 || first > 0xDBFF || position + 1 === size
	      || (second = charCodeAt$4(S, position + 1)) < 0xDC00 || second > 0xDFFF
	        ? CONVERT_TO_STRING
	          ? charAt$a(S, position)
	          : first
	        : CONVERT_TO_STRING
	          ? stringSlice$a(S, position, position + 2)
	          : (first - 0xD800 << 10) + (second - 0xDC00) + 0x10000;
	  };
	};

	var stringMultibyte = {
	  // `String.prototype.codePointAt` method
	  // https://tc39.es/ecma262/#sec-string.prototype.codepointat
	  codeAt: createMethod(false),
	  // `String.prototype.at` method
	  // https://github.com/mathiasbynens/String.prototype.at
	  charAt: createMethod(true)
	};

	var $$T = _export;
	var codeAt$1 = stringMultibyte.codeAt;

	// `String.prototype.codePointAt` method
	// https://tc39.es/ecma262/#sec-string.prototype.codepointat
	$$T({ target: 'String', proto: true }, {
	  codePointAt: function codePointAt(pos) {
	    return codeAt$1(this, pos);
	  }
	});

	var isRegExp$2 = isRegexp;

	var $TypeError$8 = TypeError;

	var notARegexp = function (it) {
	  if (isRegExp$2(it)) {
	    throw new $TypeError$8("The method doesn't accept regular expressions");
	  } return it;
	};

	var wellKnownSymbol$8 = wellKnownSymbol$K;

	var MATCH = wellKnownSymbol$8('match');

	var correctIsRegexpLogic = function (METHOD_NAME) {
	  var regexp = /./;
	  try {
	    '/./'[METHOD_NAME](regexp);
	  } catch (error1) {
	    try {
	      regexp[MATCH] = false;
	      return '/./'[METHOD_NAME](regexp);
	    } catch (error2) { /* empty */ }
	  } return false;
	};

	var $$S = _export;
	var uncurryThis$B = functionUncurryThisClause;
	var getOwnPropertyDescriptor$1 = objectGetOwnPropertyDescriptor.f;
	var toLength$7 = toLength$d;
	var toString$l = toString$D;
	var notARegExp$2 = notARegexp;
	var requireObjectCoercible$c = requireObjectCoercible$o;
	var correctIsRegExpLogic$2 = correctIsRegexpLogic;

	var slice$1 = uncurryThis$B(''.slice);
	var min$5 = Math.min;

	var CORRECT_IS_REGEXP_LOGIC$1 = correctIsRegExpLogic$2('endsWith');
	// https://github.com/zloirock/core-js/pull/702
	var MDN_POLYFILL_BUG$1 = !CORRECT_IS_REGEXP_LOGIC$1 && !!function () {
	  var descriptor = getOwnPropertyDescriptor$1(String.prototype, 'endsWith');
	  return descriptor && !descriptor.writable;
	}();

	// `String.prototype.endsWith` method
	// https://tc39.es/ecma262/#sec-string.prototype.endswith
	$$S({ target: 'String', proto: true, forced: !MDN_POLYFILL_BUG$1 && !CORRECT_IS_REGEXP_LOGIC$1 }, {
	  endsWith: function endsWith(searchString /* , endPosition = @length */) {
	    var that = toString$l(requireObjectCoercible$c(this));
	    notARegExp$2(searchString);
	    var endPosition = arguments.length > 1 ? arguments[1] : undefined;
	    var len = that.length;
	    var end = endPosition === undefined ? len : min$5(toLength$7(endPosition), len);
	    var search = toString$l(searchString);
	    return slice$1(that, end - search.length, end) === search;
	  }
	});

	var $$R = _export;
	var uncurryThis$A = functionUncurryThis;
	var toAbsoluteIndex$1 = toAbsoluteIndex$9;

	var $RangeError$2 = RangeError;
	var fromCharCode$4 = String.fromCharCode;
	// eslint-disable-next-line es/no-string-fromcodepoint -- required for testing
	var $fromCodePoint = String.fromCodePoint;
	var join$6 = uncurryThis$A([].join);

	// length should be 1, old FF problem
	var INCORRECT_LENGTH = !!$fromCodePoint && $fromCodePoint.length !== 1;

	// `String.fromCodePoint` method
	// https://tc39.es/ecma262/#sec-string.fromcodepoint
	$$R({ target: 'String', stat: true, arity: 1, forced: INCORRECT_LENGTH }, {
	  // eslint-disable-next-line no-unused-vars -- required for `.length`
	  fromCodePoint: function fromCodePoint(x) {
	    var elements = [];
	    var length = arguments.length;
	    var i = 0;
	    var code;
	    while (length > i) {
	      code = +arguments[i++];
	      if (toAbsoluteIndex$1(code, 0x10FFFF) !== code) throw new $RangeError$2(code + ' is not a valid code point');
	      elements[i] = code < 0x10000
	        ? fromCharCode$4(code)
	        : fromCharCode$4(((code -= 0x10000) >> 10) + 0xD800, code % 0x400 + 0xDC00);
	    } return join$6(elements, '');
	  }
	});

	var $$Q = _export;
	var uncurryThis$z = functionUncurryThis;
	var notARegExp$1 = notARegexp;
	var requireObjectCoercible$b = requireObjectCoercible$o;
	var toString$k = toString$D;
	var correctIsRegExpLogic$1 = correctIsRegexpLogic;

	var stringIndexOf$3 = uncurryThis$z(''.indexOf);

	// `String.prototype.includes` method
	// https://tc39.es/ecma262/#sec-string.prototype.includes
	$$Q({ target: 'String', proto: true, forced: !correctIsRegExpLogic$1('includes') }, {
	  includes: function includes(searchString /* , position = 0 */) {
	    return !!~stringIndexOf$3(
	      toString$k(requireObjectCoercible$b(this)),
	      toString$k(notARegExp$1(searchString)),
	      arguments.length > 1 ? arguments[1] : undefined
	    );
	  }
	});

	var $$P = _export;
	var uncurryThis$y = functionUncurryThis;
	var requireObjectCoercible$a = requireObjectCoercible$o;
	var toString$j = toString$D;

	var charCodeAt$3 = uncurryThis$y(''.charCodeAt);

	// `String.prototype.isWellFormed` method
	// https://tc39.es/ecma262/#sec-string.prototype.iswellformed
	$$P({ target: 'String', proto: true }, {
	  isWellFormed: function isWellFormed() {
	    var S = toString$j(requireObjectCoercible$a(this));
	    var length = S.length;
	    for (var i = 0; i < length; i++) {
	      var charCode = charCodeAt$3(S, i);
	      // single UTF-16 code unit
	      if ((charCode & 0xF800) !== 0xD800) continue;
	      // unpaired surrogate
	      if (charCode >= 0xDC00 || ++i >= length || (charCodeAt$3(S, i) & 0xFC00) !== 0xDC00) return false;
	    } return true;
	  }
	});

	var charAt$9 = stringMultibyte.charAt;
	var toString$i = toString$D;
	var InternalStateModule$6 = internalState;
	var defineIterator = iteratorDefine;
	var createIterResultObject$2 = createIterResultObject$7;

	var STRING_ITERATOR = 'String Iterator';
	var setInternalState$6 = InternalStateModule$6.set;
	var getInternalState$3 = InternalStateModule$6.getterFor(STRING_ITERATOR);

	// `String.prototype[@@iterator]` method
	// https://tc39.es/ecma262/#sec-string.prototype-@@iterator
	defineIterator(String, 'String', function (iterated) {
	  setInternalState$6(this, {
	    type: STRING_ITERATOR,
	    string: toString$i(iterated),
	    index: 0
	  });
	// `%StringIteratorPrototype%.next` method
	// https://tc39.es/ecma262/#sec-%stringiteratorprototype%.next
	}, function next() {
	  var state = getInternalState$3(this);
	  var string = state.string;
	  var index = state.index;
	  var point;
	  if (index >= string.length) return createIterResultObject$2(undefined, true);
	  point = charAt$9(string, index);
	  state.index += point.length;
	  return createIterResultObject$2(point, false);
	});

	// TODO: Remove from `core-js@4` since it's moved to entry points

	var call$g = functionCall;
	var defineBuiltIn$6 = defineBuiltIn$t;
	var regexpExec$1 = regexpExec$2;
	var fails$m = fails$1z;
	var wellKnownSymbol$7 = wellKnownSymbol$K;
	var createNonEnumerableProperty$4 = createNonEnumerableProperty$h;

	var SPECIES = wellKnownSymbol$7('species');
	var RegExpPrototype$1 = RegExp.prototype;

	var fixRegexpWellKnownSymbolLogic = function (KEY, exec, FORCED, SHAM) {
	  var SYMBOL = wellKnownSymbol$7(KEY);

	  var DELEGATES_TO_SYMBOL = !fails$m(function () {
	    // String methods call symbol-named RegExp methods
	    var O = {};
	    O[SYMBOL] = function () { return 7; };
	    return ''[KEY](O) !== 7;
	  });

	  var DELEGATES_TO_EXEC = DELEGATES_TO_SYMBOL && !fails$m(function () {
	    // Symbol-named RegExp methods call .exec
	    var execCalled = false;
	    var re = /a/;

	    if (KEY === 'split') {
	      // We can't use real regex here since it causes deoptimization
	      // and serious performance degradation in V8
	      // https://github.com/zloirock/core-js/issues/306
	      re = {};
	      // RegExp[@@split] doesn't call the regex's exec method, but first creates
	      // a new one. We need to return the patched regex when creating the new one.
	      re.constructor = {};
	      re.constructor[SPECIES] = function () { return re; };
	      re.flags = '';
	      re[SYMBOL] = /./[SYMBOL];
	    }

	    re.exec = function () {
	      execCalled = true;
	      return null;
	    };

	    re[SYMBOL]('');
	    return !execCalled;
	  });

	  if (
	    !DELEGATES_TO_SYMBOL ||
	    !DELEGATES_TO_EXEC ||
	    FORCED
	  ) {
	    var nativeRegExpMethod = /./[SYMBOL];
	    var methods = exec(SYMBOL, ''[KEY], function (nativeMethod, regexp, str, arg2, forceStringMethod) {
	      var $exec = regexp.exec;
	      if ($exec === regexpExec$1 || $exec === RegExpPrototype$1.exec) {
	        if (DELEGATES_TO_SYMBOL && !forceStringMethod) {
	          // The native String method already delegates to @@method (this
	          // polyfilled function), leasing to infinite recursion.
	          // We avoid it by directly calling the native @@method method.
	          return { done: true, value: call$g(nativeRegExpMethod, regexp, str, arg2) };
	        }
	        return { done: true, value: call$g(nativeMethod, str, regexp, arg2) };
	      }
	      return { done: false };
	    });

	    defineBuiltIn$6(String.prototype, KEY, methods[0]);
	    defineBuiltIn$6(RegExpPrototype$1, SYMBOL, methods[1]);
	  }

	  if (SHAM) createNonEnumerableProperty$4(RegExpPrototype$1[SYMBOL], 'sham', true);
	};

	var charAt$8 = stringMultibyte.charAt;

	// `AdvanceStringIndex` abstract operation
	// https://tc39.es/ecma262/#sec-advancestringindex
	var advanceStringIndex$4 = function (S, index, unicode) {
	  return index + (unicode ? charAt$8(S, index).length : 1);
	};

	var call$f = functionCall;
	var anObject$9 = anObject$U;
	var isCallable$5 = isCallable$A;
	var classof$6 = classofRaw$2;
	var regexpExec = regexpExec$2;

	var $TypeError$7 = TypeError;

	// `RegExpExec` abstract operation
	// https://tc39.es/ecma262/#sec-regexpexec
	var regexpExecAbstract = function (R, S) {
	  var exec = R.exec;
	  if (isCallable$5(exec)) {
	    var result = call$f(exec, R, S);
	    if (result !== null) anObject$9(result);
	    return result;
	  }
	  if (classof$6(R) === 'RegExp') return call$f(regexpExec, R, S);
	  throw new $TypeError$7('RegExp#exec called on incompatible receiver');
	};

	var call$e = functionCall;
	var uncurryThis$x = functionUncurryThis;
	var fixRegExpWellKnownSymbolLogic$3 = fixRegexpWellKnownSymbolLogic;
	var anObject$8 = anObject$U;
	var isObject$b = isObject$K;
	var toLength$6 = toLength$d;
	var toString$h = toString$D;
	var requireObjectCoercible$9 = requireObjectCoercible$o;
	var getMethod$5 = getMethod$h;
	var advanceStringIndex$3 = advanceStringIndex$4;
	var getRegExpFlags$4 = regexpGetFlags;
	var regExpExec$4 = regexpExecAbstract;

	var stringIndexOf$2 = uncurryThis$x(''.indexOf);

	// @@match logic
	fixRegExpWellKnownSymbolLogic$3('match', function (MATCH, nativeMatch, maybeCallNative) {
	  return [
	    // `String.prototype.match` method
	    // https://tc39.es/ecma262/#sec-string.prototype.match
	    function match(regexp) {
	      var O = requireObjectCoercible$9(this);
	      var matcher = isObject$b(regexp) ? getMethod$5(regexp, MATCH) : undefined;
	      return matcher ? call$e(matcher, regexp, O) : new RegExp(regexp)[MATCH](toString$h(O));
	    },
	    // `RegExp.prototype[@@match]` method
	    // https://tc39.es/ecma262/#sec-regexp.prototype-@@match
	    function (string) {
	      var rx = anObject$8(this);
	      var S = toString$h(string);
	      var res = maybeCallNative(nativeMatch, rx, S);

	      if (res.done) return res.value;

	      var flags = toString$h(getRegExpFlags$4(rx));

	      if (stringIndexOf$2(flags, 'g') === -1) return regExpExec$4(rx, S);

	      var fullUnicode = stringIndexOf$2(flags, 'u') !== -1;
	      rx.lastIndex = 0;
	      var A = [];
	      var n = 0;
	      var result;
	      while ((result = regExpExec$4(rx, S)) !== null) {
	        var matchStr = toString$h(result[0]);
	        A[n] = matchStr;
	        if (matchStr === '') rx.lastIndex = advanceStringIndex$3(S, toLength$6(rx.lastIndex), fullUnicode);
	        n++;
	      }
	      return n === 0 ? null : A;
	    }
	  ];
	});

	/* eslint-disable es/no-string-prototype-matchall -- safe */
	var $$O = _export;
	var call$d = functionCall;
	var uncurryThis$w = functionUncurryThisClause;
	var createIteratorConstructor$1 = iteratorCreateConstructor;
	var createIterResultObject$1 = createIterResultObject$7;
	var requireObjectCoercible$8 = requireObjectCoercible$o;
	var toLength$5 = toLength$d;
	var toString$g = toString$D;
	var anObject$7 = anObject$U;
	var isObject$a = isObject$K;
	var isRegExp$1 = isRegexp;
	var getRegExpFlags$3 = regexpGetFlags;
	var getMethod$4 = getMethod$h;
	var defineBuiltIn$5 = defineBuiltIn$t;
	var fails$l = fails$1z;
	var wellKnownSymbol$6 = wellKnownSymbol$K;
	var speciesConstructor$1 = speciesConstructor$4;
	var advanceStringIndex$2 = advanceStringIndex$4;
	var regExpExec$3 = regexpExecAbstract;
	var InternalStateModule$5 = internalState;

	var MATCH_ALL = wellKnownSymbol$6('matchAll');
	var REGEXP_STRING = 'RegExp String';
	var REGEXP_STRING_ITERATOR = REGEXP_STRING + ' Iterator';
	var setInternalState$5 = InternalStateModule$5.set;
	var getInternalState$2 = InternalStateModule$5.getterFor(REGEXP_STRING_ITERATOR);
	var RegExpPrototype = RegExp.prototype;
	var $TypeError$6 = TypeError;
	var stringIndexOf$1 = uncurryThis$w(''.indexOf);
	var nativeMatchAll = uncurryThis$w(''.matchAll);

	var WORKS_WITH_NON_GLOBAL_REGEX = !!nativeMatchAll && !fails$l(function () {
	  nativeMatchAll('a', /./);
	});

	var $RegExpStringIterator = createIteratorConstructor$1(function RegExpStringIterator(regexp, string, $global, fullUnicode) {
	  setInternalState$5(this, {
	    type: REGEXP_STRING_ITERATOR,
	    regexp: regexp,
	    string: string,
	    global: $global,
	    unicode: fullUnicode,
	    done: false
	  });
	}, REGEXP_STRING, function next() {
	  var state = getInternalState$2(this);
	  if (state.done) return createIterResultObject$1(undefined, true);
	  var R = state.regexp;
	  var S = state.string;
	  var match = regExpExec$3(R, S);
	  if (match === null) {
	    state.done = true;
	    return createIterResultObject$1(undefined, true);
	  }
	  if (state.global) {
	    if (toString$g(match[0]) === '') R.lastIndex = advanceStringIndex$2(S, toLength$5(R.lastIndex), state.unicode);
	    return createIterResultObject$1(match, false);
	  }
	  state.done = true;
	  return createIterResultObject$1(match, false);
	});

	var $matchAll = function (string) {
	  var R = anObject$7(this);
	  var S = toString$g(string);
	  var C = speciesConstructor$1(R, RegExp);
	  var flags = toString$g(getRegExpFlags$3(R));
	  var matcher, $global, fullUnicode;
	  matcher = new C(C === RegExp ? R.source : R, flags);
	  $global = !!~stringIndexOf$1(flags, 'g');
	  fullUnicode = !!~stringIndexOf$1(flags, 'u');
	  matcher.lastIndex = toLength$5(R.lastIndex);
	  return new $RegExpStringIterator(matcher, S, $global, fullUnicode);
	};

	// `String.prototype.matchAll` method
	// https://tc39.es/ecma262/#sec-string.prototype.matchall
	$$O({ target: 'String', proto: true, forced: WORKS_WITH_NON_GLOBAL_REGEX }, {
	  matchAll: function matchAll(regexp) {
	    var O = requireObjectCoercible$8(this);
	    var flags, S, matcher, rx;
	    if (isObject$a(regexp)) {
	      if (isRegExp$1(regexp)) {
	        flags = toString$g(requireObjectCoercible$8(getRegExpFlags$3(regexp)));
	        if (!~stringIndexOf$1(flags, 'g')) throw new $TypeError$6('`.matchAll` does not allow non-global regexes');
	      }
	      if (WORKS_WITH_NON_GLOBAL_REGEX) return nativeMatchAll(O, regexp);
	      matcher = getMethod$4(regexp, MATCH_ALL);
	      if (matcher) return call$d(matcher, regexp, O);
	    } else if (WORKS_WITH_NON_GLOBAL_REGEX) return nativeMatchAll(O, regexp);
	    S = toString$g(O);
	    rx = new RegExp(regexp, 'g');
	    return rx[MATCH_ALL](S);
	  }
	});

	MATCH_ALL in RegExpPrototype || defineBuiltIn$5(RegExpPrototype, MATCH_ALL, $matchAll);

	// https://github.com/zloirock/core-js/issues/280
	var userAgent = environmentUserAgent;

	var stringPadWebkitBug = /Version\/10(?:\.\d+){1,2}(?: [\w./]+)?(?: Mobile\/\w+)? Safari\//.test(userAgent);

	var $$N = _export;
	var $padEnd = stringPad.end;
	var WEBKIT_BUG$1 = stringPadWebkitBug;

	// `String.prototype.padEnd` method
	// https://tc39.es/ecma262/#sec-string.prototype.padend
	$$N({ target: 'String', proto: true, forced: WEBKIT_BUG$1 }, {
	  padEnd: function padEnd(maxLength /* , fillString = ' ' */) {
	    return $padEnd(this, maxLength, arguments.length > 1 ? arguments[1] : undefined);
	  }
	});

	var $$M = _export;
	var $padStart = stringPad.start;
	var WEBKIT_BUG = stringPadWebkitBug;

	// `String.prototype.padStart` method
	// https://tc39.es/ecma262/#sec-string.prototype.padstart
	$$M({ target: 'String', proto: true, forced: WEBKIT_BUG }, {
	  padStart: function padStart(maxLength /* , fillString = ' ' */) {
	    return $padStart(this, maxLength, arguments.length > 1 ? arguments[1] : undefined);
	  }
	});

	var $$L = _export;
	var uncurryThis$v = functionUncurryThis;
	var toIndexedObject$1 = toIndexedObject$j;
	var toObject$2 = toObject$v;
	var toString$f = toString$D;
	var lengthOfArrayLike$4 = lengthOfArrayLike$s;

	var push$7 = uncurryThis$v([].push);
	var join$5 = uncurryThis$v([].join);

	// `String.raw` method
	// https://tc39.es/ecma262/#sec-string.raw
	$$L({ target: 'String', stat: true }, {
	  raw: function raw(template) {
	    var rawTemplate = toIndexedObject$1(toObject$2(template).raw);
	    var literalSegments = lengthOfArrayLike$4(rawTemplate);
	    if (!literalSegments) return '';
	    var argumentsLength = arguments.length;
	    var elements = [];
	    var i = 0;
	    while (true) {
	      push$7(elements, toString$f(rawTemplate[i++]));
	      if (i === literalSegments) return join$5(elements, '');
	      if (i < argumentsLength) push$7(elements, toString$f(arguments[i]));
	    }
	  }
	});

	var $$K = _export;
	var repeat = stringRepeat;

	// `String.prototype.repeat` method
	// https://tc39.es/ecma262/#sec-string.prototype.repeat
	$$K({ target: 'String', proto: true }, {
	  repeat: repeat
	});

	var uncurryThis$u = functionUncurryThis;
	var toObject$1 = toObject$v;

	var floor$3 = Math.floor;
	var charAt$7 = uncurryThis$u(''.charAt);
	var replace$5 = uncurryThis$u(''.replace);
	var stringSlice$9 = uncurryThis$u(''.slice);
	// eslint-disable-next-line redos/no-vulnerable -- safe
	var SUBSTITUTION_SYMBOLS = /\$([$&'`]|\d{1,2}|<[^>]*>)/g;
	var SUBSTITUTION_SYMBOLS_NO_NAMED = /\$([$&'`]|\d{1,2})/g;

	// `GetSubstitution` abstract operation
	// https://tc39.es/ecma262/#sec-getsubstitution
	var getSubstitution$2 = function (matched, str, position, captures, namedCaptures, replacement) {
	  var tailPos = position + matched.length;
	  var m = captures.length;
	  var symbols = SUBSTITUTION_SYMBOLS_NO_NAMED;
	  if (namedCaptures !== undefined) {
	    namedCaptures = toObject$1(namedCaptures);
	    symbols = SUBSTITUTION_SYMBOLS;
	  }
	  return replace$5(replacement, symbols, function (match, ch) {
	    var capture;
	    switch (charAt$7(ch, 0)) {
	      case '$': return '$';
	      case '&': return matched;
	      case '`': return stringSlice$9(str, 0, position);
	      case "'": return stringSlice$9(str, tailPos);
	      case '<':
	        capture = namedCaptures[stringSlice$9(ch, 1, -1)];
	        break;
	      default: // \d\d?
	        var n = +ch;
	        if (n === 0) return match;
	        if (n > m) {
	          var f = floor$3(n / 10);
	          if (f === 0) return match;
	          if (f <= m) return captures[f - 1] === undefined ? charAt$7(ch, 1) : captures[f - 1] + charAt$7(ch, 1);
	          return match;
	        }
	        capture = captures[n - 1];
	    }
	    return capture === undefined ? '' : capture;
	  });
	};

	var apply$3 = functionApply$1;
	var call$c = functionCall;
	var uncurryThis$t = functionUncurryThis;
	var fixRegExpWellKnownSymbolLogic$2 = fixRegexpWellKnownSymbolLogic;
	var fails$k = fails$1z;
	var anObject$6 = anObject$U;
	var isCallable$4 = isCallable$A;
	var isObject$9 = isObject$K;
	var toIntegerOrInfinity$3 = toIntegerOrInfinity$m;
	var toLength$4 = toLength$d;
	var toString$e = toString$D;
	var requireObjectCoercible$7 = requireObjectCoercible$o;
	var advanceStringIndex$1 = advanceStringIndex$4;
	var getMethod$3 = getMethod$h;
	var getSubstitution$1 = getSubstitution$2;
	var getRegExpFlags$2 = regexpGetFlags;
	var regExpExec$2 = regexpExecAbstract;
	var wellKnownSymbol$5 = wellKnownSymbol$K;

	var REPLACE$1 = wellKnownSymbol$5('replace');
	var max$2 = Math.max;
	var min$4 = Math.min;
	var concat = uncurryThis$t([].concat);
	var push$6 = uncurryThis$t([].push);
	var stringIndexOf = uncurryThis$t(''.indexOf);
	var stringSlice$8 = uncurryThis$t(''.slice);

	var maybeToString = function (it) {
	  return it === undefined ? it : String(it);
	};

	// IE <= 11 replaces $0 with the whole match, as if it was $&
	// https://stackoverflow.com/questions/6024666/getting-ie-to-replace-a-regex-with-the-literal-string-0
	var REPLACE_KEEPS_$0 = (function () {
	  // eslint-disable-next-line regexp/prefer-escape-replacement-dollar-char -- required for testing
	  return 'a'.replace(/./, '$0') === '$0';
	})();

	// Safari <= 13.0.3(?) substitutes nth capture where n>m with an empty string
	var REGEXP_REPLACE_SUBSTITUTES_UNDEFINED_CAPTURE = (function () {
	  if (/./[REPLACE$1]) {
	    return /./[REPLACE$1]('a', '$0') === '';
	  }
	  return false;
	})();

	var REPLACE_SUPPORTS_NAMED_GROUPS = !fails$k(function () {
	  var re = /./;
	  re.exec = function () {
	    var result = [];
	    result.groups = { a: '7' };
	    return result;
	  };
	  // eslint-disable-next-line regexp/no-useless-dollar-replacements -- false positive
	  return ''.replace(re, '$<a>') !== '7';
	});

	// @@replace logic
	fixRegExpWellKnownSymbolLogic$2('replace', function (_, nativeReplace, maybeCallNative) {
	  var UNSAFE_SUBSTITUTE = REGEXP_REPLACE_SUBSTITUTES_UNDEFINED_CAPTURE ? '$' : '$0';

	  return [
	    // `String.prototype.replace` method
	    // https://tc39.es/ecma262/#sec-string.prototype.replace
	    function replace(searchValue, replaceValue) {
	      var O = requireObjectCoercible$7(this);
	      var replacer = isObject$9(searchValue) ? getMethod$3(searchValue, REPLACE$1) : undefined;
	      return replacer
	        ? call$c(replacer, searchValue, O, replaceValue)
	        : call$c(nativeReplace, toString$e(O), searchValue, replaceValue);
	    },
	    // `RegExp.prototype[@@replace]` method
	    // https://tc39.es/ecma262/#sec-regexp.prototype-@@replace
	    function (string, replaceValue) {
	      var rx = anObject$6(this);
	      var S = toString$e(string);

	      if (
	        typeof replaceValue == 'string' &&
	        stringIndexOf(replaceValue, UNSAFE_SUBSTITUTE) === -1 &&
	        stringIndexOf(replaceValue, '$<') === -1
	      ) {
	        var res = maybeCallNative(nativeReplace, rx, S, replaceValue);
	        if (res.done) return res.value;
	      }

	      var functionalReplace = isCallable$4(replaceValue);
	      if (!functionalReplace) replaceValue = toString$e(replaceValue);

	      var flags = toString$e(getRegExpFlags$2(rx));
	      var global = stringIndexOf(flags, 'g') !== -1;
	      var fullUnicode;
	      if (global) {
	        fullUnicode = stringIndexOf(flags, 'u') !== -1;
	        rx.lastIndex = 0;
	      }

	      var results = [];
	      var result;
	      while (true) {
	        result = regExpExec$2(rx, S);
	        if (result === null) break;

	        push$6(results, result);
	        if (!global) break;

	        var matchStr = toString$e(result[0]);
	        if (matchStr === '') rx.lastIndex = advanceStringIndex$1(S, toLength$4(rx.lastIndex), fullUnicode);
	      }

	      var accumulatedResult = '';
	      var nextSourcePosition = 0;
	      for (var i = 0; i < results.length; i++) {
	        result = results[i];

	        var matched = toString$e(result[0]);
	        var position = max$2(min$4(toIntegerOrInfinity$3(result.index), S.length), 0);
	        var captures = [];
	        var replacement;
	        // NOTE: This is equivalent to
	        //   captures = result.slice(1).map(maybeToString)
	        // but for some reason `nativeSlice.call(result, 1, result.length)` (called in
	        // the slice polyfill when slicing native arrays) "doesn't work" in safari 9 and
	        // causes a crash (https://pastebin.com/N21QzeQA) when trying to debug it.
	        for (var j = 1; j < result.length; j++) push$6(captures, maybeToString(result[j]));
	        var namedCaptures = result.groups;
	        if (functionalReplace) {
	          var replacerArgs = concat([matched], captures, position, S);
	          if (namedCaptures !== undefined) push$6(replacerArgs, namedCaptures);
	          replacement = toString$e(apply$3(replaceValue, undefined, replacerArgs));
	        } else {
	          replacement = getSubstitution$1(matched, S, position, captures, namedCaptures, replaceValue);
	        }
	        if (position >= nextSourcePosition) {
	          accumulatedResult += stringSlice$8(S, nextSourcePosition, position) + replacement;
	          nextSourcePosition = position + matched.length;
	        }
	      }

	      return accumulatedResult + stringSlice$8(S, nextSourcePosition);
	    }
	  ];
	}, !REPLACE_SUPPORTS_NAMED_GROUPS || !REPLACE_KEEPS_$0 || REGEXP_REPLACE_SUBSTITUTES_UNDEFINED_CAPTURE);

	var $$J = _export;
	var call$b = functionCall;
	var uncurryThis$s = functionUncurryThis;
	var requireObjectCoercible$6 = requireObjectCoercible$o;
	var isCallable$3 = isCallable$A;
	var isObject$8 = isObject$K;
	var isRegExp = isRegexp;
	var toString$d = toString$D;
	var getMethod$2 = getMethod$h;
	var getRegExpFlags$1 = regexpGetFlags;
	var getSubstitution = getSubstitution$2;
	var wellKnownSymbol$4 = wellKnownSymbol$K;

	var REPLACE = wellKnownSymbol$4('replace');
	var $TypeError$5 = TypeError;
	var indexOf = uncurryThis$s(''.indexOf);
	uncurryThis$s(''.replace);
	var stringSlice$7 = uncurryThis$s(''.slice);
	var max$1 = Math.max;

	// `String.prototype.replaceAll` method
	// https://tc39.es/ecma262/#sec-string.prototype.replaceall
	$$J({ target: 'String', proto: true }, {
	  replaceAll: function replaceAll(searchValue, replaceValue) {
	    var O = requireObjectCoercible$6(this);
	    var IS_REG_EXP, flags, replacer, string, searchString, functionalReplace, searchLength, advanceBy, position, replacement;
	    var endOfLastMatch = 0;
	    var result = '';
	    if (isObject$8(searchValue)) {
	      IS_REG_EXP = isRegExp(searchValue);
	      if (IS_REG_EXP) {
	        flags = toString$d(requireObjectCoercible$6(getRegExpFlags$1(searchValue)));
	        if (!~indexOf(flags, 'g')) throw new $TypeError$5('`.replaceAll` does not allow non-global regexes');
	      }
	      replacer = getMethod$2(searchValue, REPLACE);
	      if (replacer) return call$b(replacer, searchValue, O, replaceValue);
	    }
	    string = toString$d(O);
	    searchString = toString$d(searchValue);
	    functionalReplace = isCallable$3(replaceValue);
	    if (!functionalReplace) replaceValue = toString$d(replaceValue);
	    searchLength = searchString.length;
	    advanceBy = max$1(1, searchLength);
	    position = indexOf(string, searchString);
	    while (position !== -1) {
	      replacement = functionalReplace
	        ? toString$d(replaceValue(searchString, position, string))
	        : getSubstitution(searchString, string, position, [], undefined, replaceValue);
	      result += stringSlice$7(string, endOfLastMatch, position) + replacement;
	      endOfLastMatch = position + searchLength;
	      position = position + advanceBy > string.length ? -1 : indexOf(string, searchString, position + advanceBy);
	    }
	    if (endOfLastMatch < string.length) {
	      result += stringSlice$7(string, endOfLastMatch);
	    }
	    return result;
	  }
	});

	var call$a = functionCall;
	var fixRegExpWellKnownSymbolLogic$1 = fixRegexpWellKnownSymbolLogic;
	var anObject$5 = anObject$U;
	var isObject$7 = isObject$K;
	var requireObjectCoercible$5 = requireObjectCoercible$o;
	var sameValue = sameValue$1;
	var toString$c = toString$D;
	var getMethod$1 = getMethod$h;
	var regExpExec$1 = regexpExecAbstract;

	// @@search logic
	fixRegExpWellKnownSymbolLogic$1('search', function (SEARCH, nativeSearch, maybeCallNative) {
	  return [
	    // `String.prototype.search` method
	    // https://tc39.es/ecma262/#sec-string.prototype.search
	    function search(regexp) {
	      var O = requireObjectCoercible$5(this);
	      var searcher = isObject$7(regexp) ? getMethod$1(regexp, SEARCH) : undefined;
	      return searcher ? call$a(searcher, regexp, O) : new RegExp(regexp)[SEARCH](toString$c(O));
	    },
	    // `RegExp.prototype[@@search]` method
	    // https://tc39.es/ecma262/#sec-regexp.prototype-@@search
	    function (string) {
	      var rx = anObject$5(this);
	      var S = toString$c(string);
	      var res = maybeCallNative(nativeSearch, rx, S);

	      if (res.done) return res.value;

	      var previousLastIndex = rx.lastIndex;
	      if (!sameValue(previousLastIndex, 0)) rx.lastIndex = 0;
	      var result = regExpExec$1(rx, S);
	      if (!sameValue(rx.lastIndex, previousLastIndex)) rx.lastIndex = previousLastIndex;
	      return result === null ? -1 : result.index;
	    }
	  ];
	});

	var call$9 = functionCall;
	var uncurryThis$r = functionUncurryThis;
	var fixRegExpWellKnownSymbolLogic = fixRegexpWellKnownSymbolLogic;
	var anObject$4 = anObject$U;
	var isObject$6 = isObject$K;
	var requireObjectCoercible$4 = requireObjectCoercible$o;
	var speciesConstructor = speciesConstructor$4;
	var advanceStringIndex = advanceStringIndex$4;
	var toLength$3 = toLength$d;
	var toString$b = toString$D;
	var getMethod = getMethod$h;
	var regExpExec = regexpExecAbstract;
	var stickyHelpers = regexpStickyHelpers;
	var fails$j = fails$1z;

	var UNSUPPORTED_Y = stickyHelpers.UNSUPPORTED_Y;
	var MAX_UINT32 = 0xFFFFFFFF;
	var min$3 = Math.min;
	var push$5 = uncurryThis$r([].push);
	var stringSlice$6 = uncurryThis$r(''.slice);

	// Chrome 51 has a buggy "split" implementation when RegExp#exec !== nativeExec
	// Weex JS has frozen built-in prototypes, so use try / catch wrapper
	var SPLIT_WORKS_WITH_OVERWRITTEN_EXEC = !fails$j(function () {
	  // eslint-disable-next-line regexp/no-empty-group -- required for testing
	  var re = /(?:)/;
	  var originalExec = re.exec;
	  re.exec = function () { return originalExec.apply(this, arguments); };
	  var result = 'ab'.split(re);
	  return result.length !== 2 || result[0] !== 'a' || result[1] !== 'b';
	});

	var BUGGY = 'abbc'.split(/(b)*/)[1] === 'c' ||
	  // eslint-disable-next-line regexp/no-empty-group -- required for testing
	  'test'.split(/(?:)/, -1).length !== 4 ||
	  'ab'.split(/(?:ab)*/).length !== 2 ||
	  '.'.split(/(.?)(.?)/).length !== 4 ||
	  // eslint-disable-next-line regexp/no-empty-capturing-group, regexp/no-empty-group -- required for testing
	  '.'.split(/()()/).length > 1 ||
	  ''.split(/.?/).length;

	// @@split logic
	fixRegExpWellKnownSymbolLogic('split', function (SPLIT, nativeSplit, maybeCallNative) {
	  var internalSplit = '0'.split(undefined, 0).length ? function (separator, limit) {
	    return separator === undefined && limit === 0 ? [] : call$9(nativeSplit, this, separator, limit);
	  } : nativeSplit;

	  return [
	    // `String.prototype.split` method
	    // https://tc39.es/ecma262/#sec-string.prototype.split
	    function split(separator, limit) {
	      var O = requireObjectCoercible$4(this);
	      var splitter = isObject$6(separator) ? getMethod(separator, SPLIT) : undefined;
	      return splitter
	        ? call$9(splitter, separator, O, limit)
	        : call$9(internalSplit, toString$b(O), separator, limit);
	    },
	    // `RegExp.prototype[@@split]` method
	    // https://tc39.es/ecma262/#sec-regexp.prototype-@@split
	    //
	    // NOTE: This cannot be properly polyfilled in engines that don't support
	    // the 'y' flag.
	    function (string, limit) {
	      var rx = anObject$4(this);
	      var S = toString$b(string);

	      if (!BUGGY) {
	        var res = maybeCallNative(internalSplit, rx, S, limit, internalSplit !== nativeSplit);
	        if (res.done) return res.value;
	      }

	      var C = speciesConstructor(rx, RegExp);
	      var unicodeMatching = rx.unicode;
	      var flags = (rx.ignoreCase ? 'i' : '') +
	                  (rx.multiline ? 'm' : '') +
	                  (rx.unicode ? 'u' : '') +
	                  (UNSUPPORTED_Y ? 'g' : 'y');
	      // ^(? + rx + ) is needed, in combination with some S slicing, to
	      // simulate the 'y' flag.
	      var splitter = new C(UNSUPPORTED_Y ? '^(?:' + rx.source + ')' : rx, flags);
	      var lim = limit === undefined ? MAX_UINT32 : limit >>> 0;
	      if (lim === 0) return [];
	      if (S.length === 0) return regExpExec(splitter, S) === null ? [S] : [];
	      var p = 0;
	      var q = 0;
	      var A = [];
	      while (q < S.length) {
	        splitter.lastIndex = UNSUPPORTED_Y ? 0 : q;
	        var z = regExpExec(splitter, UNSUPPORTED_Y ? stringSlice$6(S, q) : S);
	        var e;
	        if (
	          z === null ||
	          (e = min$3(toLength$3(splitter.lastIndex + (UNSUPPORTED_Y ? q : 0)), S.length)) === p
	        ) {
	          q = advanceStringIndex(S, q, unicodeMatching);
	        } else {
	          push$5(A, stringSlice$6(S, p, q));
	          if (A.length === lim) return A;
	          for (var i = 1; i <= z.length - 1; i++) {
	            push$5(A, z[i]);
	            if (A.length === lim) return A;
	          }
	          q = p = e;
	        }
	      }
	      push$5(A, stringSlice$6(S, p));
	      return A;
	    }
	  ];
	}, BUGGY || !SPLIT_WORKS_WITH_OVERWRITTEN_EXEC, UNSUPPORTED_Y);

	var $$I = _export;
	var uncurryThis$q = functionUncurryThisClause;
	var getOwnPropertyDescriptor = objectGetOwnPropertyDescriptor.f;
	var toLength$2 = toLength$d;
	var toString$a = toString$D;
	var notARegExp = notARegexp;
	var requireObjectCoercible$3 = requireObjectCoercible$o;
	var correctIsRegExpLogic = correctIsRegexpLogic;

	var stringSlice$5 = uncurryThis$q(''.slice);
	var min$2 = Math.min;

	var CORRECT_IS_REGEXP_LOGIC = correctIsRegExpLogic('startsWith');
	// https://github.com/zloirock/core-js/pull/702
	var MDN_POLYFILL_BUG = !CORRECT_IS_REGEXP_LOGIC && !!function () {
	  var descriptor = getOwnPropertyDescriptor(String.prototype, 'startsWith');
	  return descriptor && !descriptor.writable;
	}();

	// `String.prototype.startsWith` method
	// https://tc39.es/ecma262/#sec-string.prototype.startswith
	$$I({ target: 'String', proto: true, forced: !MDN_POLYFILL_BUG && !CORRECT_IS_REGEXP_LOGIC }, {
	  startsWith: function startsWith(searchString /* , position = 0 */) {
	    var that = toString$a(requireObjectCoercible$3(this));
	    notARegExp(searchString);
	    var index = toLength$2(min$2(arguments.length > 1 ? arguments[1] : undefined, that.length));
	    var search = toString$a(searchString);
	    return stringSlice$5(that, index, index + search.length) === search;
	  }
	});

	var $$H = _export;
	var uncurryThis$p = functionUncurryThis;
	var requireObjectCoercible$2 = requireObjectCoercible$o;
	var toIntegerOrInfinity$2 = toIntegerOrInfinity$m;
	var toString$9 = toString$D;

	var stringSlice$4 = uncurryThis$p(''.slice);
	var max = Math.max;
	var min$1 = Math.min;

	// eslint-disable-next-line unicorn/prefer-string-slice -- required for testing
	var FORCED$3 = !''.substr || 'ab'.substr(-1) !== 'b';

	// `String.prototype.substr` method
	// https://tc39.es/ecma262/#sec-string.prototype.substr
	$$H({ target: 'String', proto: true, forced: FORCED$3 }, {
	  substr: function substr(start, length) {
	    var that = toString$9(requireObjectCoercible$2(this));
	    var size = that.length;
	    var intStart = toIntegerOrInfinity$2(start);
	    var intLength, intEnd;
	    if (intStart === Infinity) intStart = 0;
	    if (intStart < 0) intStart = max(size + intStart, 0);
	    intLength = length === undefined ? size : toIntegerOrInfinity$2(length);
	    if (intLength <= 0 || intLength === Infinity) return '';
	    intEnd = min$1(intStart + intLength, size);
	    return intStart >= intEnd ? '' : stringSlice$4(that, intStart, intEnd);
	  }
	});

	var $$G = _export;
	var call$8 = functionCall;
	var uncurryThis$o = functionUncurryThis;
	var requireObjectCoercible$1 = requireObjectCoercible$o;
	var toString$8 = toString$D;
	var fails$i = fails$1z;

	var $Array = Array;
	var charAt$6 = uncurryThis$o(''.charAt);
	var charCodeAt$2 = uncurryThis$o(''.charCodeAt);
	var join$4 = uncurryThis$o([].join);
	// eslint-disable-next-line es/no-string-prototype-towellformed -- safe
	var $toWellFormed = ''.toWellFormed;
	var REPLACEMENT_CHARACTER = '\uFFFD';

	// Safari bug
	var TO_STRING_CONVERSION_BUG = $toWellFormed && fails$i(function () {
	  return call$8($toWellFormed, 1) !== '1';
	});

	// `String.prototype.toWellFormed` method
	// https://tc39.es/ecma262/#sec-string.prototype.towellformed
	$$G({ target: 'String', proto: true, forced: TO_STRING_CONVERSION_BUG }, {
	  toWellFormed: function toWellFormed() {
	    var S = toString$8(requireObjectCoercible$1(this));
	    if (TO_STRING_CONVERSION_BUG) return call$8($toWellFormed, S);
	    var length = S.length;
	    var result = $Array(length);
	    for (var i = 0; i < length; i++) {
	      var charCode = charCodeAt$2(S, i);
	      // single UTF-16 code unit
	      if ((charCode & 0xF800) !== 0xD800) result[i] = charAt$6(S, i);
	      // unpaired surrogate
	      else if (charCode >= 0xDC00 || i + 1 >= length || (charCodeAt$2(S, i + 1) & 0xFC00) !== 0xDC00) result[i] = REPLACEMENT_CHARACTER;
	      // surrogate pair
	      else {
	        result[i] = charAt$6(S, i);
	        result[++i] = charAt$6(S, i);
	      }
	    } return join$4(result, '');
	  }
	});

	var PROPER_FUNCTION_NAME = functionName.PROPER;
	var fails$h = fails$1z;
	var whitespaces$1 = whitespaces$5;

	var non = '\u200B\u0085\u180E';

	// check that a method works with the correct list
	// of whitespaces and has a correct name
	var stringTrimForced = function (METHOD_NAME) {
	  return fails$h(function () {
	    return !!whitespaces$1[METHOD_NAME]()
	      || non[METHOD_NAME]() !== non
	      || (PROPER_FUNCTION_NAME && whitespaces$1[METHOD_NAME].name !== METHOD_NAME);
	  });
	};

	var $$F = _export;
	var $trim = stringTrim.trim;
	var forcedStringTrimMethod$2 = stringTrimForced;

	// `String.prototype.trim` method
	// https://tc39.es/ecma262/#sec-string.prototype.trim
	$$F({ target: 'String', proto: true, forced: forcedStringTrimMethod$2('trim') }, {
	  trim: function trim() {
	    return $trim(this);
	  }
	});

	var $trimEnd = stringTrim.end;
	var forcedStringTrimMethod$1 = stringTrimForced;

	// `String.prototype.{ trimEnd, trimRight }` method
	// https://tc39.es/ecma262/#sec-string.prototype.trimend
	// https://tc39.es/ecma262/#String.prototype.trimright
	var stringTrimEnd = forcedStringTrimMethod$1('trimEnd') ? function trimEnd() {
	  return $trimEnd(this);
	// eslint-disable-next-line es/no-string-prototype-trimstart-trimend -- safe
	} : ''.trimEnd;

	var $$E = _export;
	var trimEnd$1 = stringTrimEnd;

	// `String.prototype.trimRight` method
	// https://tc39.es/ecma262/#sec-string.prototype.trimend
	// eslint-disable-next-line es/no-string-prototype-trimleft-trimright -- safe
	$$E({ target: 'String', proto: true, name: 'trimEnd', forced: ''.trimRight !== trimEnd$1 }, {
	  trimRight: trimEnd$1
	});

	// TODO: Remove this line from `core-js@4`

	var $$D = _export;
	var trimEnd = stringTrimEnd;

	// `String.prototype.trimEnd` method
	// https://tc39.es/ecma262/#sec-string.prototype.trimend
	// eslint-disable-next-line es/no-string-prototype-trimstart-trimend -- safe
	$$D({ target: 'String', proto: true, name: 'trimEnd', forced: ''.trimEnd !== trimEnd }, {
	  trimEnd: trimEnd
	});

	var $trimStart = stringTrim.start;
	var forcedStringTrimMethod = stringTrimForced;

	// `String.prototype.{ trimStart, trimLeft }` method
	// https://tc39.es/ecma262/#sec-string.prototype.trimstart
	// https://tc39.es/ecma262/#String.prototype.trimleft
	var stringTrimStart = forcedStringTrimMethod('trimStart') ? function trimStart() {
	  return $trimStart(this);
	// eslint-disable-next-line es/no-string-prototype-trimstart-trimend -- safe
	} : ''.trimStart;

	var $$C = _export;
	var trimStart$1 = stringTrimStart;

	// `String.prototype.trimLeft` method
	// https://tc39.es/ecma262/#sec-string.prototype.trimleft
	// eslint-disable-next-line es/no-string-prototype-trimleft-trimright -- safe
	$$C({ target: 'String', proto: true, name: 'trimStart', forced: ''.trimLeft !== trimStart$1 }, {
	  trimLeft: trimStart$1
	});

	// TODO: Remove this line from `core-js@4`

	var $$B = _export;
	var trimStart = stringTrimStart;

	// `String.prototype.trimStart` method
	// https://tc39.es/ecma262/#sec-string.prototype.trimstart
	// eslint-disable-next-line es/no-string-prototype-trimstart-trimend -- safe
	$$B({ target: 'String', proto: true, name: 'trimStart', forced: ''.trimStart !== trimStart }, {
	  trimStart: trimStart
	});

	var uncurryThis$n = functionUncurryThis;
	var requireObjectCoercible = requireObjectCoercible$o;
	var toString$7 = toString$D;

	var quot = /"/g;
	var replace$4 = uncurryThis$n(''.replace);

	// `CreateHTML` abstract operation
	// https://tc39.es/ecma262/#sec-createhtml
	var createHtml = function (string, tag, attribute, value) {
	  var S = toString$7(requireObjectCoercible(string));
	  var p1 = '<' + tag;
	  if (attribute !== '') p1 += ' ' + attribute + '="' + replace$4(toString$7(value), quot, '&quot;') + '"';
	  return p1 + '>' + S + '</' + tag + '>';
	};

	var fails$g = fails$1z;

	// check the existence of a method, lowercase
	// of a tag and escaping quotes in arguments
	var stringHtmlForced = function (METHOD_NAME) {
	  return fails$g(function () {
	    var test = ''[METHOD_NAME]('"');
	    return test !== test.toLowerCase() || test.split('"').length > 3;
	  });
	};

	var $$A = _export;
	var createHTML$c = createHtml;
	var forcedStringHTMLMethod$c = stringHtmlForced;

	// `String.prototype.anchor` method
	// https://tc39.es/ecma262/#sec-string.prototype.anchor
	$$A({ target: 'String', proto: true, forced: forcedStringHTMLMethod$c('anchor') }, {
	  anchor: function anchor(name) {
	    return createHTML$c(this, 'a', 'name', name);
	  }
	});

	var $$z = _export;
	var createHTML$b = createHtml;
	var forcedStringHTMLMethod$b = stringHtmlForced;

	// `String.prototype.big` method
	// https://tc39.es/ecma262/#sec-string.prototype.big
	$$z({ target: 'String', proto: true, forced: forcedStringHTMLMethod$b('big') }, {
	  big: function big() {
	    return createHTML$b(this, 'big', '', '');
	  }
	});

	var $$y = _export;
	var createHTML$a = createHtml;
	var forcedStringHTMLMethod$a = stringHtmlForced;

	// `String.prototype.blink` method
	// https://tc39.es/ecma262/#sec-string.prototype.blink
	$$y({ target: 'String', proto: true, forced: forcedStringHTMLMethod$a('blink') }, {
	  blink: function blink() {
	    return createHTML$a(this, 'blink', '', '');
	  }
	});

	var $$x = _export;
	var createHTML$9 = createHtml;
	var forcedStringHTMLMethod$9 = stringHtmlForced;

	// `String.prototype.bold` method
	// https://tc39.es/ecma262/#sec-string.prototype.bold
	$$x({ target: 'String', proto: true, forced: forcedStringHTMLMethod$9('bold') }, {
	  bold: function bold() {
	    return createHTML$9(this, 'b', '', '');
	  }
	});

	var $$w = _export;
	var createHTML$8 = createHtml;
	var forcedStringHTMLMethod$8 = stringHtmlForced;

	// `String.prototype.fixed` method
	// https://tc39.es/ecma262/#sec-string.prototype.fixed
	$$w({ target: 'String', proto: true, forced: forcedStringHTMLMethod$8('fixed') }, {
	  fixed: function fixed() {
	    return createHTML$8(this, 'tt', '', '');
	  }
	});

	var $$v = _export;
	var createHTML$7 = createHtml;
	var forcedStringHTMLMethod$7 = stringHtmlForced;

	// `String.prototype.fontcolor` method
	// https://tc39.es/ecma262/#sec-string.prototype.fontcolor
	$$v({ target: 'String', proto: true, forced: forcedStringHTMLMethod$7('fontcolor') }, {
	  fontcolor: function fontcolor(color) {
	    return createHTML$7(this, 'font', 'color', color);
	  }
	});

	var $$u = _export;
	var createHTML$6 = createHtml;
	var forcedStringHTMLMethod$6 = stringHtmlForced;

	// `String.prototype.fontsize` method
	// https://tc39.es/ecma262/#sec-string.prototype.fontsize
	$$u({ target: 'String', proto: true, forced: forcedStringHTMLMethod$6('fontsize') }, {
	  fontsize: function fontsize(size) {
	    return createHTML$6(this, 'font', 'size', size);
	  }
	});

	var $$t = _export;
	var createHTML$5 = createHtml;
	var forcedStringHTMLMethod$5 = stringHtmlForced;

	// `String.prototype.italics` method
	// https://tc39.es/ecma262/#sec-string.prototype.italics
	$$t({ target: 'String', proto: true, forced: forcedStringHTMLMethod$5('italics') }, {
	  italics: function italics() {
	    return createHTML$5(this, 'i', '', '');
	  }
	});

	var $$s = _export;
	var createHTML$4 = createHtml;
	var forcedStringHTMLMethod$4 = stringHtmlForced;

	// `String.prototype.link` method
	// https://tc39.es/ecma262/#sec-string.prototype.link
	$$s({ target: 'String', proto: true, forced: forcedStringHTMLMethod$4('link') }, {
	  link: function link(url) {
	    return createHTML$4(this, 'a', 'href', url);
	  }
	});

	var $$r = _export;
	var createHTML$3 = createHtml;
	var forcedStringHTMLMethod$3 = stringHtmlForced;

	// `String.prototype.small` method
	// https://tc39.es/ecma262/#sec-string.prototype.small
	$$r({ target: 'String', proto: true, forced: forcedStringHTMLMethod$3('small') }, {
	  small: function small() {
	    return createHTML$3(this, 'small', '', '');
	  }
	});

	var $$q = _export;
	var createHTML$2 = createHtml;
	var forcedStringHTMLMethod$2 = stringHtmlForced;

	// `String.prototype.strike` method
	// https://tc39.es/ecma262/#sec-string.prototype.strike
	$$q({ target: 'String', proto: true, forced: forcedStringHTMLMethod$2('strike') }, {
	  strike: function strike() {
	    return createHTML$2(this, 'strike', '', '');
	  }
	});

	var $$p = _export;
	var createHTML$1 = createHtml;
	var forcedStringHTMLMethod$1 = stringHtmlForced;

	// `String.prototype.sub` method
	// https://tc39.es/ecma262/#sec-string.prototype.sub
	$$p({ target: 'String', proto: true, forced: forcedStringHTMLMethod$1('sub') }, {
	  sub: function sub() {
	    return createHTML$1(this, 'sub', '', '');
	  }
	});

	var $$o = _export;
	var createHTML = createHtml;
	var forcedStringHTMLMethod = stringHtmlForced;

	// `String.prototype.sup` method
	// https://tc39.es/ecma262/#sec-string.prototype.sup
	$$o({ target: 'String', proto: true, forced: forcedStringHTMLMethod('sup') }, {
	  sup: function sup() {
	    return createHTML(this, 'sup', '', '');
	  }
	});

	var typedArrayConstructor = {exports: {}};

	/* eslint-disable no-new, sonarjs/inconsistent-function-call -- required for testing */
	var globalThis$v = globalThis_1;
	var fails$f = fails$1z;
	var checkCorrectnessOfIteration = checkCorrectnessOfIteration$4;
	var NATIVE_ARRAY_BUFFER_VIEWS$1 = arrayBufferViewCore.NATIVE_ARRAY_BUFFER_VIEWS;

	var ArrayBuffer$2 = globalThis$v.ArrayBuffer;
	var Int8Array$3 = globalThis$v.Int8Array;

	var typedArrayConstructorsRequireWrappers = !NATIVE_ARRAY_BUFFER_VIEWS$1 || !fails$f(function () {
	  Int8Array$3(1);
	}) || !fails$f(function () {
	  new Int8Array$3(-1);
	}) || !checkCorrectnessOfIteration(function (iterable) {
	  new Int8Array$3();
	  new Int8Array$3(null);
	  new Int8Array$3(1.5);
	  new Int8Array$3(iterable);
	}, true) || fails$f(function () {
	  // Safari (11+) bug - a reason why even Safari 13 should load a typed array polyfill
	  return new Int8Array$3(new ArrayBuffer$2(2), 1, undefined).length !== 1;
	});

	var toPositiveInteger = toPositiveInteger$3;

	var $RangeError$1 = RangeError;

	var toOffset$2 = function (it, BYTES) {
	  var offset = toPositiveInteger(it);
	  if (offset % BYTES) throw new $RangeError$1('Wrong offset');
	  return offset;
	};

	var round = Math.round;

	var toUint8Clamped$1 = function (it) {
	  var value = round(it);
	  return value < 0 ? 0 : value > 0xFF ? 0xFF : value & 0xFF;
	};

	var classof$5 = classof$p;

	var isBigIntArray$2 = function (it) {
	  var klass = classof$5(it);
	  return klass === 'BigInt64Array' || klass === 'BigUint64Array';
	};

	var toPrimitive = toPrimitive$4;

	var $TypeError$4 = TypeError;

	// `ToBigInt` abstract operation
	// https://tc39.es/ecma262/#sec-tobigint
	var toBigInt$3 = function (argument) {
	  var prim = toPrimitive(argument, 'number');
	  if (typeof prim == 'number') throw new $TypeError$4("Can't convert number to bigint");
	  // eslint-disable-next-line es/no-bigint -- safe
	  return BigInt(prim);
	};

	var bind$2 = functionBindContext;
	var call$7 = functionCall;
	var aConstructor = aConstructor$3;
	var toObject = toObject$v;
	var lengthOfArrayLike$3 = lengthOfArrayLike$s;
	var getIterator$1 = getIterator$6;
	var getIteratorMethod$1 = getIteratorMethod$7;
	var isArrayIteratorMethod = isArrayIteratorMethod$3;
	var isBigIntArray$1 = isBigIntArray$2;
	var aTypedArrayConstructor$1 = arrayBufferViewCore.aTypedArrayConstructor;
	var toBigInt$2 = toBigInt$3;

	var typedArrayFrom$2 = function from(source /* , mapfn, thisArg */) {
	  var C = aConstructor(this);
	  var O = toObject(source);
	  var argumentsLength = arguments.length;
	  var mapfn = argumentsLength > 1 ? arguments[1] : undefined;
	  var mapping = mapfn !== undefined;
	  var iteratorMethod = getIteratorMethod$1(O);
	  var i, length, result, thisIsBigIntArray, value, step, iterator, next;
	  if (iteratorMethod && !isArrayIteratorMethod(iteratorMethod)) {
	    iterator = getIterator$1(O, iteratorMethod);
	    next = iterator.next;
	    O = [];
	    while (!(step = call$7(next, iterator)).done) {
	      O.push(step.value);
	    }
	  }
	  if (mapping && argumentsLength > 2) {
	    mapfn = bind$2(mapfn, arguments[2]);
	  }
	  length = lengthOfArrayLike$3(O);
	  result = new (aTypedArrayConstructor$1(C))(length);
	  thisIsBigIntArray = isBigIntArray$1(result);
	  for (i = 0; length > i; i++) {
	    value = mapping ? mapfn(O[i], i) : O[i];
	    // FF30- typed arrays doesn't properly convert objects to typed array values
	    result[i] = thisIsBigIntArray ? toBigInt$2(value) : +value;
	  }
	  return result;
	};

	var $$n = _export;
	var globalThis$u = globalThis_1;
	var call$6 = functionCall;
	var DESCRIPTORS$8 = descriptors;
	var TYPED_ARRAYS_CONSTRUCTORS_REQUIRES_WRAPPERS$2 = typedArrayConstructorsRequireWrappers;
	var ArrayBufferViewCore$t = arrayBufferViewCore;
	var ArrayBufferModule = arrayBuffer;
	var anInstance$5 = anInstance$d;
	var createPropertyDescriptor$3 = createPropertyDescriptor$d;
	var createNonEnumerableProperty$3 = createNonEnumerableProperty$h;
	var isIntegralNumber = isIntegralNumber$3;
	var toLength$1 = toLength$d;
	var toIndex = toIndex$4;
	var toOffset$1 = toOffset$2;
	var toUint8Clamped = toUint8Clamped$1;
	var toPropertyKey = toPropertyKey$8;
	var hasOwn$7 = hasOwnProperty_1;
	var classof$4 = classof$p;
	var isObject$5 = isObject$K;
	var isSymbol$1 = isSymbol$7;
	var create$2 = objectCreate;
	var isPrototypeOf = objectIsPrototypeOf;
	var setPrototypeOf = objectSetPrototypeOf$1;
	var getOwnPropertyNames = objectGetOwnPropertyNames.f;
	var typedArrayFrom$1 = typedArrayFrom$2;
	var forEach$3 = arrayIteration.forEach;
	var setSpecies = setSpecies$6;
	var defineBuiltInAccessor$5 = defineBuiltInAccessor$l;
	var definePropertyModule = objectDefineProperty;
	var getOwnPropertyDescriptorModule = objectGetOwnPropertyDescriptor;
	var arrayFromConstructorAndList$3 = arrayFromConstructorAndList$5;
	var InternalStateModule$4 = internalState;
	var inheritIfRequired$1 = inheritIfRequired$7;

	var getInternalState$1 = InternalStateModule$4.get;
	var setInternalState$4 = InternalStateModule$4.set;
	var enforceInternalState$1 = InternalStateModule$4.enforce;
	var nativeDefineProperty = definePropertyModule.f;
	var nativeGetOwnPropertyDescriptor = getOwnPropertyDescriptorModule.f;
	var RangeError$2 = globalThis$u.RangeError;
	var ArrayBuffer$1 = ArrayBufferModule.ArrayBuffer;
	var ArrayBufferPrototype = ArrayBuffer$1.prototype;
	var DataView$1 = ArrayBufferModule.DataView;
	var NATIVE_ARRAY_BUFFER_VIEWS = ArrayBufferViewCore$t.NATIVE_ARRAY_BUFFER_VIEWS;
	var TYPED_ARRAY_TAG = ArrayBufferViewCore$t.TYPED_ARRAY_TAG;
	var TypedArray = ArrayBufferViewCore$t.TypedArray;
	var TypedArrayPrototype$1 = ArrayBufferViewCore$t.TypedArrayPrototype;
	var isTypedArray = ArrayBufferViewCore$t.isTypedArray;
	var BYTES_PER_ELEMENT = 'BYTES_PER_ELEMENT';
	var WRONG_LENGTH = 'Wrong length';

	var addGetter = function (it, key) {
	  defineBuiltInAccessor$5(it, key, {
	    configurable: true,
	    get: function () {
	      return getInternalState$1(this)[key];
	    }
	  });
	};

	var isArrayBuffer = function (it) {
	  var klass;
	  return isPrototypeOf(ArrayBufferPrototype, it) || (klass = classof$4(it)) === 'ArrayBuffer' || klass === 'SharedArrayBuffer';
	};

	var isTypedArrayIndex = function (target, key) {
	  return isTypedArray(target)
	    && !isSymbol$1(key)
	    && key in target
	    && isIntegralNumber(+key)
	    && key >= 0;
	};

	var wrappedGetOwnPropertyDescriptor = function getOwnPropertyDescriptor(target, key) {
	  key = toPropertyKey(key);
	  return isTypedArrayIndex(target, key)
	    ? createPropertyDescriptor$3(2, target[key])
	    : nativeGetOwnPropertyDescriptor(target, key);
	};

	var wrappedDefineProperty = function defineProperty(target, key, descriptor) {
	  key = toPropertyKey(key);
	  if (isTypedArrayIndex(target, key)
	    && isObject$5(descriptor)
	    && hasOwn$7(descriptor, 'value')
	    && !hasOwn$7(descriptor, 'get')
	    && !hasOwn$7(descriptor, 'set')
	    // TODO: add validation descriptor w/o calling accessors
	    && !descriptor.configurable
	    && (!hasOwn$7(descriptor, 'writable') || descriptor.writable)
	    && (!hasOwn$7(descriptor, 'enumerable') || descriptor.enumerable)
	  ) {
	    target[key] = descriptor.value;
	    return target;
	  } return nativeDefineProperty(target, key, descriptor);
	};

	if (DESCRIPTORS$8) {
	  if (!NATIVE_ARRAY_BUFFER_VIEWS) {
	    getOwnPropertyDescriptorModule.f = wrappedGetOwnPropertyDescriptor;
	    definePropertyModule.f = wrappedDefineProperty;
	    addGetter(TypedArrayPrototype$1, 'buffer');
	    addGetter(TypedArrayPrototype$1, 'byteOffset');
	    addGetter(TypedArrayPrototype$1, 'byteLength');
	    addGetter(TypedArrayPrototype$1, 'length');
	  }

	  $$n({ target: 'Object', stat: true, forced: !NATIVE_ARRAY_BUFFER_VIEWS }, {
	    getOwnPropertyDescriptor: wrappedGetOwnPropertyDescriptor,
	    defineProperty: wrappedDefineProperty
	  });

	  typedArrayConstructor.exports = function (TYPE, wrapper, CLAMPED) {
	    var BYTES = TYPE.match(/\d+/)[0] / 8;
	    var CONSTRUCTOR_NAME = TYPE + (CLAMPED ? 'Clamped' : '') + 'Array';
	    var GETTER = 'get' + TYPE;
	    var SETTER = 'set' + TYPE;
	    var NativeTypedArrayConstructor = globalThis$u[CONSTRUCTOR_NAME];
	    var TypedArrayConstructor = NativeTypedArrayConstructor;
	    var TypedArrayConstructorPrototype = TypedArrayConstructor && TypedArrayConstructor.prototype;
	    var exported = {};

	    var getter = function (that, index) {
	      var data = getInternalState$1(that);
	      return data.view[GETTER](index * BYTES + data.byteOffset, true);
	    };

	    var setter = function (that, index, value) {
	      var data = getInternalState$1(that);
	      data.view[SETTER](index * BYTES + data.byteOffset, CLAMPED ? toUint8Clamped(value) : value, true);
	    };

	    var addElement = function (that, index) {
	      nativeDefineProperty(that, index, {
	        get: function () {
	          return getter(this, index);
	        },
	        set: function (value) {
	          return setter(this, index, value);
	        },
	        enumerable: true
	      });
	    };

	    if (!NATIVE_ARRAY_BUFFER_VIEWS) {
	      TypedArrayConstructor = wrapper(function (that, data, offset, $length) {
	        anInstance$5(that, TypedArrayConstructorPrototype);
	        var index = 0;
	        var byteOffset = 0;
	        var buffer, byteLength, length;
	        if (!isObject$5(data)) {
	          length = toIndex(data);
	          byteLength = length * BYTES;
	          buffer = new ArrayBuffer$1(byteLength);
	        } else if (isArrayBuffer(data)) {
	          buffer = data;
	          byteOffset = toOffset$1(offset, BYTES);
	          var $len = data.byteLength;
	          if ($length === undefined) {
	            if ($len % BYTES) throw new RangeError$2(WRONG_LENGTH);
	            byteLength = $len - byteOffset;
	            if (byteLength < 0) throw new RangeError$2(WRONG_LENGTH);
	          } else {
	            byteLength = toLength$1($length) * BYTES;
	            if (byteLength + byteOffset > $len) throw new RangeError$2(WRONG_LENGTH);
	          }
	          length = byteLength / BYTES;
	        } else if (isTypedArray(data)) {
	          return arrayFromConstructorAndList$3(TypedArrayConstructor, data);
	        } else {
	          return call$6(typedArrayFrom$1, TypedArrayConstructor, data);
	        }
	        setInternalState$4(that, {
	          buffer: buffer,
	          byteOffset: byteOffset,
	          byteLength: byteLength,
	          length: length,
	          view: new DataView$1(buffer)
	        });
	        while (index < length) addElement(that, index++);
	      });

	      if (setPrototypeOf) setPrototypeOf(TypedArrayConstructor, TypedArray);
	      TypedArrayConstructorPrototype = TypedArrayConstructor.prototype = create$2(TypedArrayPrototype$1);
	    } else if (TYPED_ARRAYS_CONSTRUCTORS_REQUIRES_WRAPPERS$2) {
	      TypedArrayConstructor = wrapper(function (dummy, data, typedArrayOffset, $length) {
	        anInstance$5(dummy, TypedArrayConstructorPrototype);
	        return inheritIfRequired$1(function () {
	          if (!isObject$5(data)) return new NativeTypedArrayConstructor(toIndex(data));
	          if (isArrayBuffer(data)) return $length !== undefined
	            ? new NativeTypedArrayConstructor(data, toOffset$1(typedArrayOffset, BYTES), $length)
	            : typedArrayOffset !== undefined
	              ? new NativeTypedArrayConstructor(data, toOffset$1(typedArrayOffset, BYTES))
	              : new NativeTypedArrayConstructor(data);
	          if (isTypedArray(data)) return arrayFromConstructorAndList$3(TypedArrayConstructor, data);
	          return call$6(typedArrayFrom$1, TypedArrayConstructor, data);
	        }(), dummy, TypedArrayConstructor);
	      });

	      if (setPrototypeOf) setPrototypeOf(TypedArrayConstructor, TypedArray);
	      forEach$3(getOwnPropertyNames(NativeTypedArrayConstructor), function (key) {
	        if (!(key in TypedArrayConstructor)) {
	          createNonEnumerableProperty$3(TypedArrayConstructor, key, NativeTypedArrayConstructor[key]);
	        }
	      });
	      TypedArrayConstructor.prototype = TypedArrayConstructorPrototype;
	    }

	    if (TypedArrayConstructorPrototype.constructor !== TypedArrayConstructor) {
	      createNonEnumerableProperty$3(TypedArrayConstructorPrototype, 'constructor', TypedArrayConstructor);
	    }

	    enforceInternalState$1(TypedArrayConstructorPrototype).TypedArrayConstructor = TypedArrayConstructor;

	    if (TYPED_ARRAY_TAG) {
	      createNonEnumerableProperty$3(TypedArrayConstructorPrototype, TYPED_ARRAY_TAG, CONSTRUCTOR_NAME);
	    }

	    var FORCED = TypedArrayConstructor !== NativeTypedArrayConstructor;

	    exported[CONSTRUCTOR_NAME] = TypedArrayConstructor;

	    $$n({ global: true, constructor: true, forced: FORCED, sham: !NATIVE_ARRAY_BUFFER_VIEWS }, exported);

	    if (!(BYTES_PER_ELEMENT in TypedArrayConstructor)) {
	      createNonEnumerableProperty$3(TypedArrayConstructor, BYTES_PER_ELEMENT, BYTES);
	    }

	    if (!(BYTES_PER_ELEMENT in TypedArrayConstructorPrototype)) {
	      createNonEnumerableProperty$3(TypedArrayConstructorPrototype, BYTES_PER_ELEMENT, BYTES);
	    }

	    setSpecies(CONSTRUCTOR_NAME);
	  };
	} else typedArrayConstructor.exports = function () { /* empty */ };

	var typedArrayConstructorExports = typedArrayConstructor.exports;

	var createTypedArrayConstructor$8 = typedArrayConstructorExports;

	// `Float32Array` constructor
	// https://tc39.es/ecma262/#sec-typedarray-objects
	createTypedArrayConstructor$8('Float32', function (init) {
	  return function Float32Array(data, byteOffset, length) {
	    return init(this, data, byteOffset, length);
	  };
	});

	var createTypedArrayConstructor$7 = typedArrayConstructorExports;

	// `Float64Array` constructor
	// https://tc39.es/ecma262/#sec-typedarray-objects
	createTypedArrayConstructor$7('Float64', function (init) {
	  return function Float64Array(data, byteOffset, length) {
	    return init(this, data, byteOffset, length);
	  };
	});

	var createTypedArrayConstructor$6 = typedArrayConstructorExports;

	// `Int8Array` constructor
	// https://tc39.es/ecma262/#sec-typedarray-objects
	createTypedArrayConstructor$6('Int8', function (init) {
	  return function Int8Array(data, byteOffset, length) {
	    return init(this, data, byteOffset, length);
	  };
	});

	var createTypedArrayConstructor$5 = typedArrayConstructorExports;

	// `Int16Array` constructor
	// https://tc39.es/ecma262/#sec-typedarray-objects
	createTypedArrayConstructor$5('Int16', function (init) {
	  return function Int16Array(data, byteOffset, length) {
	    return init(this, data, byteOffset, length);
	  };
	});

	var createTypedArrayConstructor$4 = typedArrayConstructorExports;

	// `Int32Array` constructor
	// https://tc39.es/ecma262/#sec-typedarray-objects
	createTypedArrayConstructor$4('Int32', function (init) {
	  return function Int32Array(data, byteOffset, length) {
	    return init(this, data, byteOffset, length);
	  };
	});

	var createTypedArrayConstructor$3 = typedArrayConstructorExports;

	// `Uint8Array` constructor
	// https://tc39.es/ecma262/#sec-typedarray-objects
	createTypedArrayConstructor$3('Uint8', function (init) {
	  return function Uint8Array(data, byteOffset, length) {
	    return init(this, data, byteOffset, length);
	  };
	});

	var createTypedArrayConstructor$2 = typedArrayConstructorExports;

	// `Uint8ClampedArray` constructor
	// https://tc39.es/ecma262/#sec-typedarray-objects
	createTypedArrayConstructor$2('Uint8', function (init) {
	  return function Uint8ClampedArray(data, byteOffset, length) {
	    return init(this, data, byteOffset, length);
	  };
	}, true);

	var createTypedArrayConstructor$1 = typedArrayConstructorExports;

	// `Uint16Array` constructor
	// https://tc39.es/ecma262/#sec-typedarray-objects
	createTypedArrayConstructor$1('Uint16', function (init) {
	  return function Uint16Array(data, byteOffset, length) {
	    return init(this, data, byteOffset, length);
	  };
	});

	var createTypedArrayConstructor = typedArrayConstructorExports;

	// `Uint32Array` constructor
	// https://tc39.es/ecma262/#sec-typedarray-objects
	createTypedArrayConstructor('Uint32', function (init) {
	  return function Uint32Array(data, byteOffset, length) {
	    return init(this, data, byteOffset, length);
	  };
	});

	var ArrayBufferViewCore$s = arrayBufferViewCore;
	var lengthOfArrayLike$2 = lengthOfArrayLike$s;
	var toIntegerOrInfinity$1 = toIntegerOrInfinity$m;

	var aTypedArray$r = ArrayBufferViewCore$s.aTypedArray;
	var exportTypedArrayMethod$s = ArrayBufferViewCore$s.exportTypedArrayMethod;

	// `%TypedArray%.prototype.at` method
	// https://tc39.es/ecma262/#sec-%typedarray%.prototype.at
	exportTypedArrayMethod$s('at', function at(index) {
	  var O = aTypedArray$r(this);
	  var len = lengthOfArrayLike$2(O);
	  var relativeIndex = toIntegerOrInfinity$1(index);
	  var k = relativeIndex >= 0 ? relativeIndex : len + relativeIndex;
	  return (k < 0 || k >= len) ? undefined : O[k];
	});

	var uncurryThis$m = functionUncurryThis;
	var ArrayBufferViewCore$r = arrayBufferViewCore;
	var $ArrayCopyWithin = arrayCopyWithin;

	var u$ArrayCopyWithin = uncurryThis$m($ArrayCopyWithin);
	var aTypedArray$q = ArrayBufferViewCore$r.aTypedArray;
	var exportTypedArrayMethod$r = ArrayBufferViewCore$r.exportTypedArrayMethod;

	// `%TypedArray%.prototype.copyWithin` method
	// https://tc39.es/ecma262/#sec-%typedarray%.prototype.copywithin
	exportTypedArrayMethod$r('copyWithin', function copyWithin(target, start /* , end */) {
	  return u$ArrayCopyWithin(aTypedArray$q(this), target, start, arguments.length > 2 ? arguments[2] : undefined);
	});

	var ArrayBufferViewCore$q = arrayBufferViewCore;
	var $every = arrayIteration.every;

	var aTypedArray$p = ArrayBufferViewCore$q.aTypedArray;
	var exportTypedArrayMethod$q = ArrayBufferViewCore$q.exportTypedArrayMethod;

	// `%TypedArray%.prototype.every` method
	// https://tc39.es/ecma262/#sec-%typedarray%.prototype.every
	exportTypedArrayMethod$q('every', function every(callbackfn /* , thisArg */) {
	  return $every(aTypedArray$p(this), callbackfn, arguments.length > 1 ? arguments[1] : undefined);
	});

	var ArrayBufferViewCore$p = arrayBufferViewCore;
	var $fill = arrayFill$1;
	var toBigInt$1 = toBigInt$3;
	var classof$3 = classof$p;
	var call$5 = functionCall;
	var uncurryThis$l = functionUncurryThis;
	var fails$e = fails$1z;

	var aTypedArray$o = ArrayBufferViewCore$p.aTypedArray;
	var exportTypedArrayMethod$p = ArrayBufferViewCore$p.exportTypedArrayMethod;
	var slice = uncurryThis$l(''.slice);

	// V8 ~ Chrome < 59, Safari < 14.1, FF < 55, Edge <=18
	var CONVERSION_BUG = fails$e(function () {
	  var count = 0;
	  // eslint-disable-next-line es/no-typed-arrays -- safe
	  new Int8Array(2).fill({ valueOf: function () { return count++; } });
	  return count !== 1;
	});

	// `%TypedArray%.prototype.fill` method
	// https://tc39.es/ecma262/#sec-%typedarray%.prototype.fill
	exportTypedArrayMethod$p('fill', function fill(value /* , start, end */) {
	  var length = arguments.length;
	  aTypedArray$o(this);
	  var actualValue = slice(classof$3(this), 0, 3) === 'Big' ? toBigInt$1(value) : +value;
	  return call$5($fill, this, actualValue, length > 1 ? arguments[1] : undefined, length > 2 ? arguments[2] : undefined);
	}, CONVERSION_BUG);

	var arrayFromConstructorAndList$2 = arrayFromConstructorAndList$5;
	var getTypedArrayConstructor$6 = arrayBufferViewCore.getTypedArrayConstructor;

	var typedArrayFromSameTypeAndList = function (instance, list) {
	  return arrayFromConstructorAndList$2(getTypedArrayConstructor$6(instance), list);
	};

	var ArrayBufferViewCore$o = arrayBufferViewCore;
	var $filter = arrayIteration.filter;
	var fromSameTypeAndList = typedArrayFromSameTypeAndList;

	var aTypedArray$n = ArrayBufferViewCore$o.aTypedArray;
	var exportTypedArrayMethod$o = ArrayBufferViewCore$o.exportTypedArrayMethod;

	// `%TypedArray%.prototype.filter` method
	// https://tc39.es/ecma262/#sec-%typedarray%.prototype.filter
	exportTypedArrayMethod$o('filter', function filter(callbackfn /* , thisArg */) {
	  var list = $filter(aTypedArray$n(this), callbackfn, arguments.length > 1 ? arguments[1] : undefined);
	  return fromSameTypeAndList(this, list);
	});

	var ArrayBufferViewCore$n = arrayBufferViewCore;
	var $find = arrayIteration.find;

	var aTypedArray$m = ArrayBufferViewCore$n.aTypedArray;
	var exportTypedArrayMethod$n = ArrayBufferViewCore$n.exportTypedArrayMethod;

	// `%TypedArray%.prototype.find` method
	// https://tc39.es/ecma262/#sec-%typedarray%.prototype.find
	exportTypedArrayMethod$n('find', function find(predicate /* , thisArg */) {
	  return $find(aTypedArray$m(this), predicate, arguments.length > 1 ? arguments[1] : undefined);
	});

	var ArrayBufferViewCore$m = arrayBufferViewCore;
	var $findIndex = arrayIteration.findIndex;

	var aTypedArray$l = ArrayBufferViewCore$m.aTypedArray;
	var exportTypedArrayMethod$m = ArrayBufferViewCore$m.exportTypedArrayMethod;

	// `%TypedArray%.prototype.findIndex` method
	// https://tc39.es/ecma262/#sec-%typedarray%.prototype.findindex
	exportTypedArrayMethod$m('findIndex', function findIndex(predicate /* , thisArg */) {
	  return $findIndex(aTypedArray$l(this), predicate, arguments.length > 1 ? arguments[1] : undefined);
	});

	var ArrayBufferViewCore$l = arrayBufferViewCore;
	var $findLast = arrayIterationFromLast.findLast;

	var aTypedArray$k = ArrayBufferViewCore$l.aTypedArray;
	var exportTypedArrayMethod$l = ArrayBufferViewCore$l.exportTypedArrayMethod;

	// `%TypedArray%.prototype.findLast` method
	// https://tc39.es/ecma262/#sec-%typedarray%.prototype.findlast
	exportTypedArrayMethod$l('findLast', function findLast(predicate /* , thisArg */) {
	  return $findLast(aTypedArray$k(this), predicate, arguments.length > 1 ? arguments[1] : undefined);
	});

	var ArrayBufferViewCore$k = arrayBufferViewCore;
	var $findLastIndex = arrayIterationFromLast.findLastIndex;

	var aTypedArray$j = ArrayBufferViewCore$k.aTypedArray;
	var exportTypedArrayMethod$k = ArrayBufferViewCore$k.exportTypedArrayMethod;

	// `%TypedArray%.prototype.findLastIndex` method
	// https://tc39.es/ecma262/#sec-%typedarray%.prototype.findlastindex
	exportTypedArrayMethod$k('findLastIndex', function findLastIndex(predicate /* , thisArg */) {
	  return $findLastIndex(aTypedArray$j(this), predicate, arguments.length > 1 ? arguments[1] : undefined);
	});

	var ArrayBufferViewCore$j = arrayBufferViewCore;
	var $forEach = arrayIteration.forEach;

	var aTypedArray$i = ArrayBufferViewCore$j.aTypedArray;
	var exportTypedArrayMethod$j = ArrayBufferViewCore$j.exportTypedArrayMethod;

	// `%TypedArray%.prototype.forEach` method
	// https://tc39.es/ecma262/#sec-%typedarray%.prototype.foreach
	exportTypedArrayMethod$j('forEach', function forEach(callbackfn /* , thisArg */) {
	  $forEach(aTypedArray$i(this), callbackfn, arguments.length > 1 ? arguments[1] : undefined);
	});

	var TYPED_ARRAYS_CONSTRUCTORS_REQUIRES_WRAPPERS$1 = typedArrayConstructorsRequireWrappers;
	var exportTypedArrayStaticMethod$1 = arrayBufferViewCore.exportTypedArrayStaticMethod;
	var typedArrayFrom = typedArrayFrom$2;

	// `%TypedArray%.from` method
	// https://tc39.es/ecma262/#sec-%typedarray%.from
	exportTypedArrayStaticMethod$1('from', typedArrayFrom, TYPED_ARRAYS_CONSTRUCTORS_REQUIRES_WRAPPERS$1);

	var ArrayBufferViewCore$i = arrayBufferViewCore;
	var $includes = arrayIncludes.includes;

	var aTypedArray$h = ArrayBufferViewCore$i.aTypedArray;
	var exportTypedArrayMethod$i = ArrayBufferViewCore$i.exportTypedArrayMethod;

	// `%TypedArray%.prototype.includes` method
	// https://tc39.es/ecma262/#sec-%typedarray%.prototype.includes
	exportTypedArrayMethod$i('includes', function includes(searchElement /* , fromIndex */) {
	  return $includes(aTypedArray$h(this), searchElement, arguments.length > 1 ? arguments[1] : undefined);
	});

	var ArrayBufferViewCore$h = arrayBufferViewCore;
	var $indexOf = arrayIncludes.indexOf;

	var aTypedArray$g = ArrayBufferViewCore$h.aTypedArray;
	var exportTypedArrayMethod$h = ArrayBufferViewCore$h.exportTypedArrayMethod;

	// `%TypedArray%.prototype.indexOf` method
	// https://tc39.es/ecma262/#sec-%typedarray%.prototype.indexof
	exportTypedArrayMethod$h('indexOf', function indexOf(searchElement /* , fromIndex */) {
	  return $indexOf(aTypedArray$g(this), searchElement, arguments.length > 1 ? arguments[1] : undefined);
	});

	var globalThis$t = globalThis_1;
	var fails$d = fails$1z;
	var uncurryThis$k = functionUncurryThis;
	var ArrayBufferViewCore$g = arrayBufferViewCore;
	var ArrayIterators = es_array_iterator;
	var wellKnownSymbol$3 = wellKnownSymbol$K;

	var ITERATOR$3 = wellKnownSymbol$3('iterator');
	var Uint8Array$7 = globalThis$t.Uint8Array;
	var arrayValues = uncurryThis$k(ArrayIterators.values);
	var arrayKeys = uncurryThis$k(ArrayIterators.keys);
	var arrayEntries = uncurryThis$k(ArrayIterators.entries);
	var aTypedArray$f = ArrayBufferViewCore$g.aTypedArray;
	var exportTypedArrayMethod$g = ArrayBufferViewCore$g.exportTypedArrayMethod;
	var TypedArrayPrototype = Uint8Array$7 && Uint8Array$7.prototype;

	var GENERIC = !fails$d(function () {
	  TypedArrayPrototype[ITERATOR$3].call([1]);
	});

	var ITERATOR_IS_VALUES = !!TypedArrayPrototype
	  && TypedArrayPrototype.values
	  && TypedArrayPrototype[ITERATOR$3] === TypedArrayPrototype.values
	  && TypedArrayPrototype.values.name === 'values';

	var typedArrayValues = function values() {
	  return arrayValues(aTypedArray$f(this));
	};

	// `%TypedArray%.prototype.entries` method
	// https://tc39.es/ecma262/#sec-%typedarray%.prototype.entries
	exportTypedArrayMethod$g('entries', function entries() {
	  return arrayEntries(aTypedArray$f(this));
	}, GENERIC);
	// `%TypedArray%.prototype.keys` method
	// https://tc39.es/ecma262/#sec-%typedarray%.prototype.keys
	exportTypedArrayMethod$g('keys', function keys() {
	  return arrayKeys(aTypedArray$f(this));
	}, GENERIC);
	// `%TypedArray%.prototype.values` method
	// https://tc39.es/ecma262/#sec-%typedarray%.prototype.values
	exportTypedArrayMethod$g('values', typedArrayValues, GENERIC || !ITERATOR_IS_VALUES, { name: 'values' });
	// `%TypedArray%.prototype[@@iterator]` method
	// https://tc39.es/ecma262/#sec-%typedarray%.prototype-@@iterator
	exportTypedArrayMethod$g(ITERATOR$3, typedArrayValues, GENERIC || !ITERATOR_IS_VALUES, { name: 'values' });

	var ArrayBufferViewCore$f = arrayBufferViewCore;
	var uncurryThis$j = functionUncurryThis;

	var aTypedArray$e = ArrayBufferViewCore$f.aTypedArray;
	var exportTypedArrayMethod$f = ArrayBufferViewCore$f.exportTypedArrayMethod;
	var $join = uncurryThis$j([].join);

	// `%TypedArray%.prototype.join` method
	// https://tc39.es/ecma262/#sec-%typedarray%.prototype.join
	exportTypedArrayMethod$f('join', function join(separator) {
	  return $join(aTypedArray$e(this), separator);
	});

	var ArrayBufferViewCore$e = arrayBufferViewCore;
	var apply$2 = functionApply$1;
	var $lastIndexOf = arrayLastIndexOf;

	var aTypedArray$d = ArrayBufferViewCore$e.aTypedArray;
	var exportTypedArrayMethod$e = ArrayBufferViewCore$e.exportTypedArrayMethod;

	// `%TypedArray%.prototype.lastIndexOf` method
	// https://tc39.es/ecma262/#sec-%typedarray%.prototype.lastindexof
	exportTypedArrayMethod$e('lastIndexOf', function lastIndexOf(searchElement /* , fromIndex */) {
	  var length = arguments.length;
	  return apply$2($lastIndexOf, aTypedArray$d(this), length > 1 ? [searchElement, arguments[1]] : [searchElement]);
	});

	var ArrayBufferViewCore$d = arrayBufferViewCore;
	var $map = arrayIteration.map;

	var aTypedArray$c = ArrayBufferViewCore$d.aTypedArray;
	var getTypedArrayConstructor$5 = ArrayBufferViewCore$d.getTypedArrayConstructor;
	var exportTypedArrayMethod$d = ArrayBufferViewCore$d.exportTypedArrayMethod;

	// `%TypedArray%.prototype.map` method
	// https://tc39.es/ecma262/#sec-%typedarray%.prototype.map
	exportTypedArrayMethod$d('map', function map(mapfn /* , thisArg */) {
	  return $map(aTypedArray$c(this), mapfn, arguments.length > 1 ? arguments[1] : undefined, function (O, length) {
	    return new (getTypedArrayConstructor$5(O))(length);
	  });
	});

	var ArrayBufferViewCore$c = arrayBufferViewCore;
	var TYPED_ARRAYS_CONSTRUCTORS_REQUIRES_WRAPPERS = typedArrayConstructorsRequireWrappers;

	var aTypedArrayConstructor = ArrayBufferViewCore$c.aTypedArrayConstructor;
	var exportTypedArrayStaticMethod = ArrayBufferViewCore$c.exportTypedArrayStaticMethod;

	// `%TypedArray%.of` method
	// https://tc39.es/ecma262/#sec-%typedarray%.of
	exportTypedArrayStaticMethod('of', function of(/* ...items */) {
	  var index = 0;
	  var length = arguments.length;
	  var result = new (aTypedArrayConstructor(this))(length);
	  while (length > index) result[index] = arguments[index++];
	  return result;
	}, TYPED_ARRAYS_CONSTRUCTORS_REQUIRES_WRAPPERS);

	var ArrayBufferViewCore$b = arrayBufferViewCore;
	var $reduce = arrayReduce.left;

	var aTypedArray$b = ArrayBufferViewCore$b.aTypedArray;
	var exportTypedArrayMethod$c = ArrayBufferViewCore$b.exportTypedArrayMethod;

	// `%TypedArray%.prototype.reduce` method
	// https://tc39.es/ecma262/#sec-%typedarray%.prototype.reduce
	exportTypedArrayMethod$c('reduce', function reduce(callbackfn /* , initialValue */) {
	  var length = arguments.length;
	  return $reduce(aTypedArray$b(this), callbackfn, length, length > 1 ? arguments[1] : undefined);
	});

	var ArrayBufferViewCore$a = arrayBufferViewCore;
	var $reduceRight = arrayReduce.right;

	var aTypedArray$a = ArrayBufferViewCore$a.aTypedArray;
	var exportTypedArrayMethod$b = ArrayBufferViewCore$a.exportTypedArrayMethod;

	// `%TypedArray%.prototype.reduceRight` method
	// https://tc39.es/ecma262/#sec-%typedarray%.prototype.reduceright
	exportTypedArrayMethod$b('reduceRight', function reduceRight(callbackfn /* , initialValue */) {
	  var length = arguments.length;
	  return $reduceRight(aTypedArray$a(this), callbackfn, length, length > 1 ? arguments[1] : undefined);
	});

	var ArrayBufferViewCore$9 = arrayBufferViewCore;

	var aTypedArray$9 = ArrayBufferViewCore$9.aTypedArray;
	var exportTypedArrayMethod$a = ArrayBufferViewCore$9.exportTypedArrayMethod;
	var floor$2 = Math.floor;

	// `%TypedArray%.prototype.reverse` method
	// https://tc39.es/ecma262/#sec-%typedarray%.prototype.reverse
	exportTypedArrayMethod$a('reverse', function reverse() {
	  var that = this;
	  var length = aTypedArray$9(that).length;
	  var middle = floor$2(length / 2);
	  var index = 0;
	  var value;
	  while (index < middle) {
	    value = that[index];
	    that[index++] = that[--length];
	    that[length] = value;
	  } return that;
	});

	var globalThis$s = globalThis_1;
	var call$4 = functionCall;
	var ArrayBufferViewCore$8 = arrayBufferViewCore;
	var lengthOfArrayLike$1 = lengthOfArrayLike$s;
	var toOffset = toOffset$2;
	var toIndexedObject = toObject$v;
	var fails$c = fails$1z;

	var RangeError$1 = globalThis$s.RangeError;
	var Int8Array$2 = globalThis$s.Int8Array;
	var Int8ArrayPrototype = Int8Array$2 && Int8Array$2.prototype;
	var $set = Int8ArrayPrototype && Int8ArrayPrototype.set;
	var aTypedArray$8 = ArrayBufferViewCore$8.aTypedArray;
	var exportTypedArrayMethod$9 = ArrayBufferViewCore$8.exportTypedArrayMethod;

	var WORKS_WITH_OBJECTS_AND_GENERIC_ON_TYPED_ARRAYS = !fails$c(function () {
	  // eslint-disable-next-line es/no-typed-arrays -- required for testing
	  var array = new Uint8ClampedArray(2);
	  call$4($set, array, { length: 1, 0: 3 }, 1);
	  return array[1] !== 3;
	});

	// https://bugs.chromium.org/p/v8/issues/detail?id=11294 and other
	var TO_OBJECT_BUG = WORKS_WITH_OBJECTS_AND_GENERIC_ON_TYPED_ARRAYS && ArrayBufferViewCore$8.NATIVE_ARRAY_BUFFER_VIEWS && fails$c(function () {
	  var array = new Int8Array$2(2);
	  array.set(1);
	  array.set('2', 1);
	  return array[0] !== 0 || array[1] !== 2;
	});

	// `%TypedArray%.prototype.set` method
	// https://tc39.es/ecma262/#sec-%typedarray%.prototype.set
	exportTypedArrayMethod$9('set', function set(arrayLike /* , offset */) {
	  aTypedArray$8(this);
	  var offset = toOffset(arguments.length > 1 ? arguments[1] : undefined, 1);
	  var src = toIndexedObject(arrayLike);
	  if (WORKS_WITH_OBJECTS_AND_GENERIC_ON_TYPED_ARRAYS) return call$4($set, this, src, offset);
	  var length = this.length;
	  var len = lengthOfArrayLike$1(src);
	  var index = 0;
	  if (len + offset > length) throw new RangeError$1('Wrong length');
	  while (index < len) this[offset + index] = src[index++];
	}, !WORKS_WITH_OBJECTS_AND_GENERIC_ON_TYPED_ARRAYS || TO_OBJECT_BUG);

	var ArrayBufferViewCore$7 = arrayBufferViewCore;
	var fails$b = fails$1z;
	var arraySlice$3 = arraySlice$a;

	var aTypedArray$7 = ArrayBufferViewCore$7.aTypedArray;
	var getTypedArrayConstructor$4 = ArrayBufferViewCore$7.getTypedArrayConstructor;
	var exportTypedArrayMethod$8 = ArrayBufferViewCore$7.exportTypedArrayMethod;

	var FORCED$2 = fails$b(function () {
	  // eslint-disable-next-line es/no-typed-arrays -- required for testing
	  new Int8Array(1).slice();
	});

	// `%TypedArray%.prototype.slice` method
	// https://tc39.es/ecma262/#sec-%typedarray%.prototype.slice
	exportTypedArrayMethod$8('slice', function slice(start, end) {
	  var list = arraySlice$3(aTypedArray$7(this), start, end);
	  var C = getTypedArrayConstructor$4(this);
	  var index = 0;
	  var length = list.length;
	  var result = new C(length);
	  while (length > index) result[index] = list[index++];
	  return result;
	}, FORCED$2);

	var ArrayBufferViewCore$6 = arrayBufferViewCore;
	var $some = arrayIteration.some;

	var aTypedArray$6 = ArrayBufferViewCore$6.aTypedArray;
	var exportTypedArrayMethod$7 = ArrayBufferViewCore$6.exportTypedArrayMethod;

	// `%TypedArray%.prototype.some` method
	// https://tc39.es/ecma262/#sec-%typedarray%.prototype.some
	exportTypedArrayMethod$7('some', function some(callbackfn /* , thisArg */) {
	  return $some(aTypedArray$6(this), callbackfn, arguments.length > 1 ? arguments[1] : undefined);
	});

	var globalThis$r = globalThis_1;
	var uncurryThis$i = functionUncurryThisClause;
	var fails$a = fails$1z;
	var aCallable$2 = aCallable$B;
	var internalSort = arraySort$1;
	var ArrayBufferViewCore$5 = arrayBufferViewCore;
	var FF = environmentFfVersion;
	var IE_OR_EDGE = environmentIsIeOrEdge;
	var V8 = environmentV8Version;
	var WEBKIT = environmentWebkitVersion;

	var aTypedArray$5 = ArrayBufferViewCore$5.aTypedArray;
	var exportTypedArrayMethod$6 = ArrayBufferViewCore$5.exportTypedArrayMethod;
	var Uint16Array = globalThis$r.Uint16Array;
	var nativeSort = Uint16Array && uncurryThis$i(Uint16Array.prototype.sort);

	// WebKit
	var ACCEPT_INCORRECT_ARGUMENTS = !!nativeSort && !(fails$a(function () {
	  nativeSort(new Uint16Array(2), null);
	}) && fails$a(function () {
	  nativeSort(new Uint16Array(2), {});
	}));

	var STABLE_SORT = !!nativeSort && !fails$a(function () {
	  // feature detection can be too slow, so check engines versions
	  if (V8) return V8 < 74;
	  if (FF) return FF < 67;
	  if (IE_OR_EDGE) return true;
	  if (WEBKIT) return WEBKIT < 602;

	  var array = new Uint16Array(516);
	  var expected = Array(516);
	  var index, mod;

	  for (index = 0; index < 516; index++) {
	    mod = index % 4;
	    array[index] = 515 - index;
	    expected[index] = index - 2 * mod + 3;
	  }

	  nativeSort(array, function (a, b) {
	    return (a / 4 | 0) - (b / 4 | 0);
	  });

	  for (index = 0; index < 516; index++) {
	    if (array[index] !== expected[index]) return true;
	  }
	});

	var getSortCompare = function (comparefn) {
	  return function (x, y) {
	    if (comparefn !== undefined) return +comparefn(x, y) || 0;
	    // eslint-disable-next-line no-self-compare -- NaN check
	    if (y !== y) return -1;
	    // eslint-disable-next-line no-self-compare -- NaN check
	    if (x !== x) return 1;
	    if (x === 0 && y === 0) return 1 / x > 0 && 1 / y < 0 ? 1 : -1;
	    return x > y;
	  };
	};

	// `%TypedArray%.prototype.sort` method
	// https://tc39.es/ecma262/#sec-%typedarray%.prototype.sort
	exportTypedArrayMethod$6('sort', function sort(comparefn) {
	  if (comparefn !== undefined) aCallable$2(comparefn);
	  if (STABLE_SORT) return nativeSort(this, comparefn);

	  return internalSort(aTypedArray$5(this), getSortCompare(comparefn));
	}, !STABLE_SORT || ACCEPT_INCORRECT_ARGUMENTS);

	var ArrayBufferViewCore$4 = arrayBufferViewCore;
	var toLength = toLength$d;
	var toAbsoluteIndex = toAbsoluteIndex$9;

	var aTypedArray$4 = ArrayBufferViewCore$4.aTypedArray;
	var getTypedArrayConstructor$3 = ArrayBufferViewCore$4.getTypedArrayConstructor;
	var exportTypedArrayMethod$5 = ArrayBufferViewCore$4.exportTypedArrayMethod;

	// `%TypedArray%.prototype.subarray` method
	// https://tc39.es/ecma262/#sec-%typedarray%.prototype.subarray
	exportTypedArrayMethod$5('subarray', function subarray(begin, end) {
	  var O = aTypedArray$4(this);
	  var length = O.length;
	  var beginIndex = toAbsoluteIndex(begin, length);
	  var C = getTypedArrayConstructor$3(O);
	  return new C(
	    O.buffer,
	    O.byteOffset + beginIndex * O.BYTES_PER_ELEMENT,
	    toLength((end === undefined ? length : toAbsoluteIndex(end, length)) - beginIndex)
	  );
	});

	var globalThis$q = globalThis_1;
	var apply$1 = functionApply$1;
	var ArrayBufferViewCore$3 = arrayBufferViewCore;
	var fails$9 = fails$1z;
	var arraySlice$2 = arraySlice$a;

	var Int8Array$1 = globalThis$q.Int8Array;
	var aTypedArray$3 = ArrayBufferViewCore$3.aTypedArray;
	var exportTypedArrayMethod$4 = ArrayBufferViewCore$3.exportTypedArrayMethod;
	var $toLocaleString = [].toLocaleString;

	// iOS Safari 6.x fails here
	var TO_LOCALE_STRING_BUG = !!Int8Array$1 && fails$9(function () {
	  $toLocaleString.call(new Int8Array$1(1));
	});

	var FORCED$1 = fails$9(function () {
	  return [1, 2].toLocaleString() !== new Int8Array$1([1, 2]).toLocaleString();
	}) || !fails$9(function () {
	  Int8Array$1.prototype.toLocaleString.call([1, 2]);
	});

	// `%TypedArray%.prototype.toLocaleString` method
	// https://tc39.es/ecma262/#sec-%typedarray%.prototype.tolocalestring
	exportTypedArrayMethod$4('toLocaleString', function toLocaleString() {
	  return apply$1(
	    $toLocaleString,
	    TO_LOCALE_STRING_BUG ? arraySlice$2(aTypedArray$3(this)) : aTypedArray$3(this),
	    arraySlice$2(arguments)
	  );
	}, FORCED$1);

	var arrayToReversed = arrayToReversed$2;
	var ArrayBufferViewCore$2 = arrayBufferViewCore;

	var aTypedArray$2 = ArrayBufferViewCore$2.aTypedArray;
	var exportTypedArrayMethod$3 = ArrayBufferViewCore$2.exportTypedArrayMethod;
	var getTypedArrayConstructor$2 = ArrayBufferViewCore$2.getTypedArrayConstructor;

	// `%TypedArray%.prototype.toReversed` method
	// https://tc39.es/ecma262/#sec-%typedarray%.prototype.toreversed
	exportTypedArrayMethod$3('toReversed', function toReversed() {
	  return arrayToReversed(aTypedArray$2(this), getTypedArrayConstructor$2(this));
	});

	var ArrayBufferViewCore$1 = arrayBufferViewCore;
	var uncurryThis$h = functionUncurryThis;
	var aCallable$1 = aCallable$B;
	var arrayFromConstructorAndList$1 = arrayFromConstructorAndList$5;

	var aTypedArray$1 = ArrayBufferViewCore$1.aTypedArray;
	var getTypedArrayConstructor$1 = ArrayBufferViewCore$1.getTypedArrayConstructor;
	var exportTypedArrayMethod$2 = ArrayBufferViewCore$1.exportTypedArrayMethod;
	var sort = uncurryThis$h(ArrayBufferViewCore$1.TypedArrayPrototype.sort);

	// `%TypedArray%.prototype.toSorted` method
	// https://tc39.es/ecma262/#sec-%typedarray%.prototype.tosorted
	exportTypedArrayMethod$2('toSorted', function toSorted(compareFn) {
	  if (compareFn !== undefined) aCallable$1(compareFn);
	  var O = aTypedArray$1(this);
	  var A = arrayFromConstructorAndList$1(getTypedArrayConstructor$1(O), O);
	  return sort(A, compareFn);
	});

	var exportTypedArrayMethod$1 = arrayBufferViewCore.exportTypedArrayMethod;
	var fails$8 = fails$1z;
	var globalThis$p = globalThis_1;
	var uncurryThis$g = functionUncurryThis;

	var Uint8Array$6 = globalThis$p.Uint8Array;
	var Uint8ArrayPrototype = Uint8Array$6 && Uint8Array$6.prototype || {};
	var arrayToString = [].toString;
	var join$3 = uncurryThis$g([].join);

	if (fails$8(function () { arrayToString.call({}); })) {
	  arrayToString = function toString() {
	    return join$3(this);
	  };
	}

	var IS_NOT_ARRAY_METHOD = Uint8ArrayPrototype.toString !== arrayToString;

	// `%TypedArray%.prototype.toString` method
	// https://tc39.es/ecma262/#sec-%typedarray%.prototype.tostring
	exportTypedArrayMethod$1('toString', arrayToString, IS_NOT_ARRAY_METHOD);

	var arrayWith = arrayWith$2;
	var ArrayBufferViewCore = arrayBufferViewCore;
	var isBigIntArray = isBigIntArray$2;
	var toIntegerOrInfinity = toIntegerOrInfinity$m;
	var toBigInt = toBigInt$3;

	var aTypedArray = ArrayBufferViewCore.aTypedArray;
	var getTypedArrayConstructor = ArrayBufferViewCore.getTypedArrayConstructor;
	var exportTypedArrayMethod = ArrayBufferViewCore.exportTypedArrayMethod;

	var PROPER_ORDER = function () {
	  try {
	    // eslint-disable-next-line no-throw-literal, es/no-typed-arrays, es/no-array-prototype-with -- required for testing
	    new Int8Array(1)['with'](2, { valueOf: function () { throw 8; } });
	  } catch (error) {
	    // some early implementations, like WebKit, does not follow the final semantic
	    // https://github.com/tc39/proposal-change-array-by-copy/pull/86
	    return error === 8;
	  }
	}();

	// Bug in WebKit. It should truncate a negative fractional index to zero, but instead throws an error
	var THROW_ON_NEGATIVE_FRACTIONAL_INDEX = PROPER_ORDER && function () {
	  try {
	    // eslint-disable-next-line es/no-typed-arrays, es/no-array-prototype-with -- required for testing
	    new Int8Array(1)['with'](-0.5, 1);
	  } catch (error) {
	    return true;
	  }
	}();

	// `%TypedArray%.prototype.with` method
	// https://tc39.es/ecma262/#sec-%typedarray%.prototype.with
	exportTypedArrayMethod('with', { 'with': function (index, value) {
	  var O = aTypedArray(this);
	  var relativeIndex = toIntegerOrInfinity(index);
	  var actualValue = isBigIntArray(O) ? toBigInt(value) : +value;
	  return arrayWith(O, getTypedArrayConstructor(O), relativeIndex, actualValue);
	} }['with'], !PROPER_ORDER || THROW_ON_NEGATIVE_FRACTIONAL_INDEX);

	var isObject$4 = isObject$K;

	var $String = String;
	var $TypeError$3 = TypeError;

	var anObjectOrUndefined$2 = function (argument) {
	  if (argument === undefined || isObject$4(argument)) return argument;
	  throw new $TypeError$3($String(argument) + ' is not an object or undefined');
	};

	var commonAlphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	var base64Alphabet$2 = commonAlphabet + '+/';
	var base64UrlAlphabet$2 = commonAlphabet + '-_';

	var inverse = function (characters) {
	  // TODO: use `Object.create(null)` in `core-js@4`
	  var result = {};
	  var index = 0;
	  for (; index < 64; index++) result[characters.charAt(index)] = index;
	  return result;
	};

	var base64Map$2 = {
	  i2c: base64Alphabet$2,
	  c2i: inverse(base64Alphabet$2),
	  i2cUrl: base64UrlAlphabet$2,
	  c2iUrl: inverse(base64UrlAlphabet$2)
	};

	var $TypeError$2 = TypeError;

	var getAlphabetOption$2 = function (options) {
	  var alphabet = options && options.alphabet;
	  if (alphabet === undefined || alphabet === 'base64' || alphabet === 'base64url') return alphabet || 'base64';
	  throw new $TypeError$2('Incorrect `alphabet` option');
	};

	var globalThis$o = globalThis_1;
	var uncurryThis$f = functionUncurryThis;
	var anObjectOrUndefined$1 = anObjectOrUndefined$2;
	var aString$2 = aString$4;
	var hasOwn$6 = hasOwnProperty_1;
	var base64Map$1 = base64Map$2;
	var getAlphabetOption$1 = getAlphabetOption$2;
	var notDetached$3 = arrayBufferNotDetached;

	var base64Alphabet$1 = base64Map$1.c2i;
	var base64UrlAlphabet$1 = base64Map$1.c2iUrl;

	var SyntaxError$2 = globalThis$o.SyntaxError;
	var TypeError$4 = globalThis$o.TypeError;
	var at = uncurryThis$f(''.charAt);

	var skipAsciiWhitespace = function (string, index) {
	  var length = string.length;
	  for (;index < length; index++) {
	    var chr = at(string, index);
	    if (chr !== ' ' && chr !== '\t' && chr !== '\n' && chr !== '\f' && chr !== '\r') break;
	  } return index;
	};

	var decodeBase64Chunk = function (chunk, alphabet, throwOnExtraBits) {
	  var chunkLength = chunk.length;

	  if (chunkLength < 4) {
	    chunk += chunkLength === 2 ? 'AA' : 'A';
	  }

	  var triplet = (alphabet[at(chunk, 0)] << 18)
	    + (alphabet[at(chunk, 1)] << 12)
	    + (alphabet[at(chunk, 2)] << 6)
	    + alphabet[at(chunk, 3)];

	  var chunkBytes = [
	    (triplet >> 16) & 255,
	    (triplet >> 8) & 255,
	    triplet & 255
	  ];

	  if (chunkLength === 2) {
	    if (throwOnExtraBits && chunkBytes[1] !== 0) {
	      throw new SyntaxError$2('Extra bits');
	    }
	    return [chunkBytes[0]];
	  }

	  if (chunkLength === 3) {
	    if (throwOnExtraBits && chunkBytes[2] !== 0) {
	      throw new SyntaxError$2('Extra bits');
	    }
	    return [chunkBytes[0], chunkBytes[1]];
	  }

	  return chunkBytes;
	};

	var writeBytes = function (bytes, elements, written) {
	  var elementsLength = elements.length;
	  for (var index = 0; index < elementsLength; index++) {
	    bytes[written + index] = elements[index];
	  }
	  return written + elementsLength;
	};

	/* eslint-disable max-statements, max-depth -- TODO */
	var uint8FromBase64 = function (string, options, into, maxLength) {
	  aString$2(string);
	  anObjectOrUndefined$1(options);
	  var alphabet = getAlphabetOption$1(options) === 'base64' ? base64Alphabet$1 : base64UrlAlphabet$1;
	  var lastChunkHandling = options ? options.lastChunkHandling : undefined;

	  if (lastChunkHandling === undefined) lastChunkHandling = 'loose';

	  if (lastChunkHandling !== 'loose' && lastChunkHandling !== 'strict' && lastChunkHandling !== 'stop-before-partial') {
	    throw new TypeError$4('Incorrect `lastChunkHandling` option');
	  }

	  if (into) notDetached$3(into.buffer);

	  var stringLength = string.length;
	  var bytes = into || [];
	  var written = 0;
	  var read = 0;
	  var chunk = '';
	  var index = 0;

	  if (maxLength) while (true) {
	    index = skipAsciiWhitespace(string, index);
	    if (index === stringLength) {
	      if (chunk.length > 0) {
	        if (lastChunkHandling === 'stop-before-partial') {
	          break;
	        }
	        if (lastChunkHandling === 'loose') {
	          if (chunk.length === 1) {
	            throw new SyntaxError$2('Malformed padding: exactly one additional character');
	          }
	          written = writeBytes(bytes, decodeBase64Chunk(chunk, alphabet, false), written);
	        } else {
	          throw new SyntaxError$2('Missing padding');
	        }
	      }
	      read = stringLength;
	      break;
	    }
	    var chr = at(string, index);
	    ++index;
	    if (chr === '=') {
	      if (chunk.length < 2) {
	        throw new SyntaxError$2('Padding is too early');
	      }
	      index = skipAsciiWhitespace(string, index);
	      if (chunk.length === 2) {
	        if (index === stringLength) {
	          if (lastChunkHandling === 'stop-before-partial') {
	            break;
	          }
	          throw new SyntaxError$2('Malformed padding: only one =');
	        }
	        if (at(string, index) === '=') {
	          ++index;
	          index = skipAsciiWhitespace(string, index);
	        }
	      }
	      if (index < stringLength) {
	        throw new SyntaxError$2('Unexpected character after padding');
	      }
	      written = writeBytes(bytes, decodeBase64Chunk(chunk, alphabet, lastChunkHandling === 'strict'), written);
	      read = stringLength;
	      break;
	    }
	    if (!hasOwn$6(alphabet, chr)) {
	      throw new SyntaxError$2('Unexpected character');
	    }
	    var remainingBytes = maxLength - written;
	    if (remainingBytes === 1 && chunk.length === 2 || remainingBytes === 2 && chunk.length === 3) {
	      // special case: we can fit exactly the number of bytes currently represented by chunk, so we were just checking for `=`
	      break;
	    }

	    chunk += chr;
	    if (chunk.length === 4) {
	      written = writeBytes(bytes, decodeBase64Chunk(chunk, alphabet, false), written);
	      chunk = '';
	      read = index;
	      if (written === maxLength) {
	        break;
	      }
	    }
	  }

	  return { bytes: bytes, read: read, written: written };
	};

	var $$m = _export;
	var globalThis$n = globalThis_1;
	var arrayFromConstructorAndList = arrayFromConstructorAndList$5;
	var $fromBase64$1 = uint8FromBase64;

	var Uint8Array$5 = globalThis$n.Uint8Array;

	var INCORRECT_BEHAVIOR_OR_DOESNT_EXISTS$3 = !Uint8Array$5 || !Uint8Array$5.fromBase64 || !function () {
	  // Webkit not throw an error on odd length string
	  try {
	    Uint8Array$5.fromBase64('a');
	    return;
	  } catch (error) { /* empty */ }
	  try {
	    Uint8Array$5.fromBase64('', null);
	  } catch (error) {
	    return true;
	  }
	}();

	// `Uint8Array.fromBase64` method
	// https://github.com/tc39/proposal-arraybuffer-base64
	if (Uint8Array$5) $$m({ target: 'Uint8Array', stat: true, forced: INCORRECT_BEHAVIOR_OR_DOESNT_EXISTS$3 }, {
	  fromBase64: function fromBase64(string /* , options */) {
	    var result = $fromBase64$1(string, arguments.length > 1 ? arguments[1] : undefined, null, 0x1FFFFFFFFFFFFF);
	    return arrayFromConstructorAndList(Uint8Array$5, result.bytes);
	  }
	});

	var globalThis$m = globalThis_1;
	var uncurryThis$e = functionUncurryThis;

	var Uint8Array$4 = globalThis$m.Uint8Array;
	var SyntaxError$1 = globalThis$m.SyntaxError;
	var parseInt$2 = globalThis$m.parseInt;
	var min = Math.min;
	var NOT_HEX = /[^\da-f]/i;
	var exec$5 = uncurryThis$e(NOT_HEX.exec);
	var stringSlice$3 = uncurryThis$e(''.slice);

	var uint8FromHex = function (string, into) {
	  var stringLength = string.length;
	  if (stringLength % 2 !== 0) throw new SyntaxError$1('String should be an even number of characters');
	  var maxLength = into ? min(into.length, stringLength / 2) : stringLength / 2;
	  var bytes = into || new Uint8Array$4(maxLength);
	  var read = 0;
	  var written = 0;
	  while (written < maxLength) {
	    var hexits = stringSlice$3(string, read, read += 2);
	    if (exec$5(NOT_HEX, hexits)) throw new SyntaxError$1('String should only contain hex characters');
	    bytes[written++] = parseInt$2(hexits, 16);
	  }
	  return { bytes: bytes, read: read };
	};

	var $$l = _export;
	var globalThis$l = globalThis_1;
	var aString$1 = aString$4;
	var $fromHex$1 = uint8FromHex;

	// `Uint8Array.fromHex` method
	// https://github.com/tc39/proposal-arraybuffer-base64
	if (globalThis$l.Uint8Array) $$l({ target: 'Uint8Array', stat: true }, {
	  fromHex: function fromHex(string) {
	    return $fromHex$1(aString$1(string)).bytes;
	  }
	});

	var classof$2 = classof$p;

	var $TypeError$1 = TypeError;

	// Perform ? RequireInternalSlot(argument, [[TypedArrayName]])
	// If argument.[[TypedArrayName]] is not "Uint8Array", throw a TypeError exception
	var anUint8Array$4 = function (argument) {
	  if (classof$2(argument) === 'Uint8Array') return argument;
	  throw new $TypeError$1('Argument is not an Uint8Array');
	};

	var $$k = _export;
	var globalThis$k = globalThis_1;
	var $fromBase64 = uint8FromBase64;
	var anUint8Array$3 = anUint8Array$4;

	var Uint8Array$3 = globalThis$k.Uint8Array;

	var INCORRECT_BEHAVIOR_OR_DOESNT_EXISTS$2 = !Uint8Array$3 || !Uint8Array$3.prototype.setFromBase64 || !function () {
	  var target = new Uint8Array$3([255, 255, 255, 255, 255]);
	  try {
	    target.setFromBase64('', null);
	    return;
	  } catch (error) { /* empty */ }
	  // Webkit not throw an error on odd length string
	  try {
	    target.setFromBase64('a');
	    return;
	  } catch (error) { /* empty */ }
	  try {
	    target.setFromBase64('MjYyZg===');
	  } catch (error) {
	    return target[0] === 50 && target[1] === 54 && target[2] === 50 && target[3] === 255 && target[4] === 255;
	  }
	}();

	// `Uint8Array.prototype.setFromBase64` method
	// https://github.com/tc39/proposal-arraybuffer-base64
	if (Uint8Array$3) $$k({ target: 'Uint8Array', proto: true, forced: INCORRECT_BEHAVIOR_OR_DOESNT_EXISTS$2 }, {
	  setFromBase64: function setFromBase64(string /* , options */) {
	    anUint8Array$3(this);

	    var result = $fromBase64(string, arguments.length > 1 ? arguments[1] : undefined, this, this.length);

	    return { read: result.read, written: result.written };
	  }
	});

	var $$j = _export;
	var globalThis$j = globalThis_1;
	var aString = aString$4;
	var anUint8Array$2 = anUint8Array$4;
	var notDetached$2 = arrayBufferNotDetached;
	var $fromHex = uint8FromHex;

	// `Uint8Array.prototype.setFromHex` method
	// https://github.com/tc39/proposal-arraybuffer-base64
	if (globalThis$j.Uint8Array) $$j({ target: 'Uint8Array', proto: true }, {
	  setFromHex: function setFromHex(string) {
	    anUint8Array$2(this);
	    aString(string);
	    notDetached$2(this.buffer);
	    var read = $fromHex(string, this).read;
	    return { read: read, written: read / 2 };
	  }
	});

	var $$i = _export;
	var globalThis$i = globalThis_1;
	var uncurryThis$d = functionUncurryThis;
	var anObjectOrUndefined = anObjectOrUndefined$2;
	var anUint8Array$1 = anUint8Array$4;
	var notDetached$1 = arrayBufferNotDetached;
	var base64Map = base64Map$2;
	var getAlphabetOption = getAlphabetOption$2;

	var base64Alphabet = base64Map.i2c;
	var base64UrlAlphabet = base64Map.i2cUrl;

	var charAt$5 = uncurryThis$d(''.charAt);

	var Uint8Array$2 = globalThis$i.Uint8Array;

	var INCORRECT_BEHAVIOR_OR_DOESNT_EXISTS$1 = !Uint8Array$2 || !Uint8Array$2.prototype.toBase64 || !function () {
	  try {
	    var target = new Uint8Array$2();
	    target.toBase64(null);
	  } catch (error) {
	    return true;
	  }
	}();

	// `Uint8Array.prototype.toBase64` method
	// https://github.com/tc39/proposal-arraybuffer-base64
	if (Uint8Array$2) $$i({ target: 'Uint8Array', proto: true, forced: INCORRECT_BEHAVIOR_OR_DOESNT_EXISTS$1 }, {
	  toBase64: function toBase64(/* options */) {
	    var array = anUint8Array$1(this);
	    var options = arguments.length ? anObjectOrUndefined(arguments[0]) : undefined;
	    var alphabet = getAlphabetOption(options) === 'base64' ? base64Alphabet : base64UrlAlphabet;
	    var omitPadding = !!options && !!options.omitPadding;
	    notDetached$1(this.buffer);

	    var result = '';
	    var i = 0;
	    var length = array.length;
	    var triplet;

	    var at = function (shift) {
	      return charAt$5(alphabet, (triplet >> (6 * shift)) & 63);
	    };

	    for (; i + 2 < length; i += 3) {
	      triplet = (array[i] << 16) + (array[i + 1] << 8) + array[i + 2];
	      result += at(3) + at(2) + at(1) + at(0);
	    }
	    if (i + 2 === length) {
	      triplet = (array[i] << 16) + (array[i + 1] << 8);
	      result += at(3) + at(2) + at(1) + (omitPadding ? '' : '=');
	    } else if (i + 1 === length) {
	      triplet = array[i] << 16;
	      result += at(3) + at(2) + (omitPadding ? '' : '==');
	    }

	    return result;
	  }
	});

	var $$h = _export;
	var globalThis$h = globalThis_1;
	var uncurryThis$c = functionUncurryThis;
	var anUint8Array = anUint8Array$4;
	var notDetached = arrayBufferNotDetached;

	var numberToString$1 = uncurryThis$c(1.1.toString);

	var Uint8Array$1 = globalThis$h.Uint8Array;

	var INCORRECT_BEHAVIOR_OR_DOESNT_EXISTS = !Uint8Array$1 || !Uint8Array$1.prototype.toHex || !(function () {
	  try {
	    var target = new Uint8Array$1([255, 255, 255, 255, 255, 255, 255, 255]);
	    return target.toHex() === 'ffffffffffffffff';
	  } catch (error) {
	    return false;
	  }
	})();

	// `Uint8Array.prototype.toHex` method
	// https://github.com/tc39/proposal-arraybuffer-base64
	if (Uint8Array$1) $$h({ target: 'Uint8Array', proto: true, forced: INCORRECT_BEHAVIOR_OR_DOESNT_EXISTS }, {
	  toHex: function toHex() {
	    anUint8Array(this);
	    notDetached(this.buffer);
	    var result = '';
	    for (var i = 0, length = this.length; i < length; i++) {
	      var hex = numberToString$1(this[i], 16);
	      result += hex.length === 1 ? '0' + hex : hex;
	    }
	    return result;
	  }
	});

	var $$g = _export;
	var uncurryThis$b = functionUncurryThis;
	var toString$6 = toString$D;

	var fromCharCode$3 = String.fromCharCode;
	var charAt$4 = uncurryThis$b(''.charAt);
	var exec$4 = uncurryThis$b(/./.exec);
	var stringSlice$2 = uncurryThis$b(''.slice);

	var hex2 = /^[\da-f]{2}$/i;
	var hex4 = /^[\da-f]{4}$/i;

	// `unescape` method
	// https://tc39.es/ecma262/#sec-unescape-string
	$$g({ global: true }, {
	  unescape: function unescape(string) {
	    var str = toString$6(string);
	    var result = '';
	    var length = str.length;
	    var index = 0;
	    var chr, part;
	    while (index < length) {
	      chr = charAt$4(str, index++);
	      if (chr === '%') {
	        if (charAt$4(str, index) === 'u') {
	          part = stringSlice$2(str, index + 1, index + 5);
	          if (exec$4(hex4, part)) {
	            result += fromCharCode$3(parseInt(part, 16));
	            index += 5;
	            continue;
	          }
	        } else {
	          part = stringSlice$2(str, index, index + 2);
	          if (exec$4(hex2, part)) {
	            result += fromCharCode$3(parseInt(part, 16));
	            index += 2;
	            continue;
	          }
	        }
	      }
	      result += chr;
	    } return result;
	  }
	});

	var uncurryThis$a = functionUncurryThis;
	var defineBuiltIns$2 = defineBuiltIns$9;
	var getWeakData = internalMetadataExports.getWeakData;
	var anInstance$4 = anInstance$d;
	var anObject$3 = anObject$U;
	var isNullOrUndefined$1 = isNullOrUndefined$9;
	var isObject$3 = isObject$K;
	var iterate$1 = iterate$l;
	var ArrayIterationModule = arrayIteration;
	var hasOwn$5 = hasOwnProperty_1;
	var InternalStateModule$3 = internalState;

	var setInternalState$3 = InternalStateModule$3.set;
	var internalStateGetterFor = InternalStateModule$3.getterFor;
	var find$1 = ArrayIterationModule.find;
	var findIndex = ArrayIterationModule.findIndex;
	var splice$1 = uncurryThis$a([].splice);
	var id = 0;

	// fallback for uncaught frozen keys
	var uncaughtFrozenStore = function (state) {
	  return state.frozen || (state.frozen = new UncaughtFrozenStore());
	};

	var UncaughtFrozenStore = function () {
	  this.entries = [];
	};

	var findUncaughtFrozen = function (store, key) {
	  return find$1(store.entries, function (it) {
	    return it[0] === key;
	  });
	};

	UncaughtFrozenStore.prototype = {
	  get: function (key) {
	    var entry = findUncaughtFrozen(this, key);
	    if (entry) return entry[1];
	  },
	  has: function (key) {
	    return !!findUncaughtFrozen(this, key);
	  },
	  set: function (key, value) {
	    var entry = findUncaughtFrozen(this, key);
	    if (entry) entry[1] = value;
	    else this.entries.push([key, value]);
	  },
	  'delete': function (key) {
	    var index = findIndex(this.entries, function (it) {
	      return it[0] === key;
	    });
	    if (~index) splice$1(this.entries, index, 1);
	    return !!~index;
	  }
	};

	var collectionWeak$2 = {
	  getConstructor: function (wrapper, CONSTRUCTOR_NAME, IS_MAP, ADDER) {
	    var Constructor = wrapper(function (that, iterable) {
	      anInstance$4(that, Prototype);
	      setInternalState$3(that, {
	        type: CONSTRUCTOR_NAME,
	        id: id++,
	        frozen: null
	      });
	      if (!isNullOrUndefined$1(iterable)) iterate$1(iterable, that[ADDER], { that: that, AS_ENTRIES: IS_MAP });
	    });

	    var Prototype = Constructor.prototype;

	    var getInternalState = internalStateGetterFor(CONSTRUCTOR_NAME);

	    var define = function (that, key, value) {
	      var state = getInternalState(that);
	      var data = getWeakData(anObject$3(key), true);
	      if (data === true) uncaughtFrozenStore(state).set(key, value);
	      else data[state.id] = value;
	      return that;
	    };

	    defineBuiltIns$2(Prototype, {
	      // `{ WeakMap, WeakSet }.prototype.delete(key)` methods
	      // https://tc39.es/ecma262/#sec-weakmap.prototype.delete
	      // https://tc39.es/ecma262/#sec-weakset.prototype.delete
	      'delete': function (key) {
	        var state = getInternalState(this);
	        if (!isObject$3(key)) return false;
	        var data = getWeakData(key);
	        if (data === true) return uncaughtFrozenStore(state)['delete'](key);
	        return data && hasOwn$5(data, state.id) && delete data[state.id];
	      },
	      // `{ WeakMap, WeakSet }.prototype.has(key)` methods
	      // https://tc39.es/ecma262/#sec-weakmap.prototype.has
	      // https://tc39.es/ecma262/#sec-weakset.prototype.has
	      has: function has(key) {
	        var state = getInternalState(this);
	        if (!isObject$3(key)) return false;
	        var data = getWeakData(key);
	        if (data === true) return uncaughtFrozenStore(state).has(key);
	        return data && hasOwn$5(data, state.id);
	      }
	    });

	    defineBuiltIns$2(Prototype, IS_MAP ? {
	      // `WeakMap.prototype.get(key)` method
	      // https://tc39.es/ecma262/#sec-weakmap.prototype.get
	      get: function get(key) {
	        var state = getInternalState(this);
	        if (isObject$3(key)) {
	          var data = getWeakData(key);
	          if (data === true) return uncaughtFrozenStore(state).get(key);
	          if (data) return data[state.id];
	        }
	      },
	      // `WeakMap.prototype.set(key, value)` method
	      // https://tc39.es/ecma262/#sec-weakmap.prototype.set
	      set: function set(key, value) {
	        return define(this, key, value);
	      }
	    } : {
	      // `WeakSet.prototype.add(value)` method
	      // https://tc39.es/ecma262/#sec-weakset.prototype.add
	      add: function add(value) {
	        return define(this, value, true);
	      }
	    });

	    return Constructor;
	  }
	};

	var FREEZING = freezing;
	var globalThis$g = globalThis_1;
	var uncurryThis$9 = functionUncurryThis;
	var defineBuiltIns$1 = defineBuiltIns$9;
	var InternalMetadataModule = internalMetadataExports;
	var collection$1 = collection$4;
	var collectionWeak$1 = collectionWeak$2;
	var isObject$2 = isObject$K;
	var enforceInternalState = internalState.enforce;
	var fails$7 = fails$1z;
	var NATIVE_WEAK_MAP = weakMapBasicDetection;

	var $Object = Object;
	// eslint-disable-next-line es/no-array-isarray -- safe
	var isArray = Array.isArray;
	// eslint-disable-next-line es/no-object-isextensible -- safe
	var isExtensible = $Object.isExtensible;
	// eslint-disable-next-line es/no-object-isfrozen -- safe
	var isFrozen = $Object.isFrozen;
	// eslint-disable-next-line es/no-object-issealed -- safe
	var isSealed = $Object.isSealed;
	// eslint-disable-next-line es/no-object-freeze -- safe
	var freeze = $Object.freeze;
	// eslint-disable-next-line es/no-object-seal -- safe
	var seal = $Object.seal;

	var IS_IE11 = !globalThis$g.ActiveXObject && 'ActiveXObject' in globalThis$g;
	var InternalWeakMap;

	var wrapper = function (init) {
	  return function WeakMap() {
	    return init(this, arguments.length ? arguments[0] : undefined);
	  };
	};

	// `WeakMap` constructor
	// https://tc39.es/ecma262/#sec-weakmap-constructor
	var $WeakMap = collection$1('WeakMap', wrapper, collectionWeak$1);
	var WeakMapPrototype = $WeakMap.prototype;
	var nativeSet = uncurryThis$9(WeakMapPrototype.set);

	// Chakra Edge bug: adding frozen arrays to WeakMap unfreeze them
	var hasMSEdgeFreezingBug = function () {
	  return FREEZING && fails$7(function () {
	    var frozenArray = freeze([]);
	    nativeSet(new $WeakMap(), frozenArray, 1);
	    return !isFrozen(frozenArray);
	  });
	};

	// IE11 WeakMap frozen keys fix
	// We can't use feature detection because it crash some old IE builds
	// https://github.com/zloirock/core-js/issues/485
	if (NATIVE_WEAK_MAP) if (IS_IE11) {
	  InternalWeakMap = collectionWeak$1.getConstructor(wrapper, 'WeakMap', true);
	  InternalMetadataModule.enable();
	  var nativeDelete = uncurryThis$9(WeakMapPrototype['delete']);
	  var nativeHas = uncurryThis$9(WeakMapPrototype.has);
	  var nativeGet = uncurryThis$9(WeakMapPrototype.get);
	  defineBuiltIns$1(WeakMapPrototype, {
	    'delete': function (key) {
	      if (isObject$2(key) && !isExtensible(key)) {
	        var state = enforceInternalState(this);
	        if (!state.frozen) state.frozen = new InternalWeakMap();
	        return nativeDelete(this, key) || state.frozen['delete'](key);
	      } return nativeDelete(this, key);
	    },
	    has: function has(key) {
	      if (isObject$2(key) && !isExtensible(key)) {
	        var state = enforceInternalState(this);
	        if (!state.frozen) state.frozen = new InternalWeakMap();
	        return nativeHas(this, key) || state.frozen.has(key);
	      } return nativeHas(this, key);
	    },
	    get: function get(key) {
	      if (isObject$2(key) && !isExtensible(key)) {
	        var state = enforceInternalState(this);
	        if (!state.frozen) state.frozen = new InternalWeakMap();
	        return nativeHas(this, key) ? nativeGet(this, key) : state.frozen.get(key);
	      } return nativeGet(this, key);
	    },
	    set: function set(key, value) {
	      if (isObject$2(key) && !isExtensible(key)) {
	        var state = enforceInternalState(this);
	        if (!state.frozen) state.frozen = new InternalWeakMap();
	        nativeHas(this, key) ? nativeSet(this, key, value) : state.frozen.set(key, value);
	      } else nativeSet(this, key, value);
	      return this;
	    }
	  });
	// Chakra Edge frozen keys fix
	} else if (hasMSEdgeFreezingBug()) {
	  defineBuiltIns$1(WeakMapPrototype, {
	    set: function set(key, value) {
	      var arrayIntegrityLevel;
	      if (isArray(key)) {
	        if (isFrozen(key)) arrayIntegrityLevel = freeze;
	        else if (isSealed(key)) arrayIntegrityLevel = seal;
	      }
	      nativeSet(this, key, value);
	      if (arrayIntegrityLevel) arrayIntegrityLevel(key);
	      return this;
	    }
	  });
	}

	var collection = collection$4;
	var collectionWeak = collectionWeak$2;

	// `WeakSet` constructor
	// https://tc39.es/ecma262/#sec-weakset-constructor
	collection('WeakSet', function (init) {
	  return function WeakSet() { return init(this, arguments.length ? arguments[0] : undefined); };
	}, collectionWeak);

	var $$f = _export;
	var globalThis$f = globalThis_1;
	var getBuiltIn$8 = getBuiltIn$B;
	var uncurryThis$8 = functionUncurryThis;
	var call$3 = functionCall;
	var fails$6 = fails$1z;
	var toString$5 = toString$D;
	var validateArgumentsLength$a = validateArgumentsLength$c;
	var c2i = base64Map$2.c2i;

	var disallowed = /[^\d+/a-z]/i;
	var whitespaces = /[\t\n\f\r ]+/g;
	var finalEq = /[=]{1,2}$/;

	var $atob = getBuiltIn$8('atob');
	var fromCharCode$2 = String.fromCharCode;
	var charAt$3 = uncurryThis$8(''.charAt);
	var replace$3 = uncurryThis$8(''.replace);
	var exec$3 = uncurryThis$8(disallowed.exec);

	var BASIC$1 = !!$atob && !fails$6(function () {
	  return $atob('aGk=') !== 'hi';
	});

	var NO_SPACES_IGNORE = BASIC$1 && fails$6(function () {
	  return $atob(' ') !== '';
	});

	var NO_ENCODING_CHECK = BASIC$1 && !fails$6(function () {
	  $atob('a');
	});

	var NO_ARG_RECEIVING_CHECK$1 = BASIC$1 && !fails$6(function () {
	  $atob();
	});

	var WRONG_ARITY$3 = BASIC$1 && $atob.length !== 1;

	var FORCED = !BASIC$1 || NO_SPACES_IGNORE || NO_ENCODING_CHECK || NO_ARG_RECEIVING_CHECK$1 || WRONG_ARITY$3;

	// `atob` method
	// https://html.spec.whatwg.org/multipage/webappapis.html#dom-atob
	$$f({ global: true, bind: true, enumerable: true, forced: FORCED }, {
	  atob: function atob(data) {
	    validateArgumentsLength$a(arguments.length, 1);
	    // `webpack` dev server bug on IE global methods - use call(fn, global, ...)
	    if (BASIC$1 && !NO_SPACES_IGNORE && !NO_ENCODING_CHECK) return call$3($atob, globalThis$f, data);
	    var string = replace$3(toString$5(data), whitespaces, '');
	    var output = '';
	    var position = 0;
	    var bc = 0;
	    var length, chr, bs;
	    if (string.length % 4 === 0) {
	      string = replace$3(string, finalEq, '');
	    }
	    length = string.length;
	    if (length % 4 === 1 || exec$3(disallowed, string)) {
	      throw new (getBuiltIn$8('DOMException'))('The string is not correctly encoded', 'InvalidCharacterError');
	    }
	    while (position < length) {
	      chr = charAt$3(string, position++);
	      bs = bc % 4 ? bs * 64 + c2i[chr] : c2i[chr];
	      if (bc++ % 4) output += fromCharCode$2(255 & bs >> (-2 * bc & 6));
	    } return output;
	  }
	});

	var $$e = _export;
	var globalThis$e = globalThis_1;
	var getBuiltIn$7 = getBuiltIn$B;
	var uncurryThis$7 = functionUncurryThis;
	var call$2 = functionCall;
	var fails$5 = fails$1z;
	var toString$4 = toString$D;
	var validateArgumentsLength$9 = validateArgumentsLength$c;
	var i2c = base64Map$2.i2c;

	var $btoa = getBuiltIn$7('btoa');
	var charAt$2 = uncurryThis$7(''.charAt);
	var charCodeAt$1 = uncurryThis$7(''.charCodeAt);

	var BASIC = !!$btoa && !fails$5(function () {
	  return $btoa('hi') !== 'aGk=';
	});

	var NO_ARG_RECEIVING_CHECK = BASIC && !fails$5(function () {
	  $btoa();
	});

	var WRONG_ARG_CONVERSION = BASIC && fails$5(function () {
	  return $btoa(null) !== 'bnVsbA==';
	});

	var WRONG_ARITY$2 = BASIC && $btoa.length !== 1;

	// `btoa` method
	// https://html.spec.whatwg.org/multipage/webappapis.html#dom-btoa
	$$e({ global: true, bind: true, enumerable: true, forced: !BASIC || NO_ARG_RECEIVING_CHECK || WRONG_ARG_CONVERSION || WRONG_ARITY$2 }, {
	  btoa: function btoa(data) {
	    validateArgumentsLength$9(arguments.length, 1);
	    // `webpack` dev server bug on IE global methods - use call(fn, global, ...)
	    if (BASIC) return call$2($btoa, globalThis$e, toString$4(data));
	    var string = toString$4(data);
	    var output = '';
	    var position = 0;
	    var map = i2c;
	    var block, charCode;
	    while (charAt$2(string, position) || (map = '=', position % 1)) {
	      charCode = charCodeAt$1(string, position += 3 / 4);
	      if (charCode > 0xFF) {
	        throw new (getBuiltIn$7('DOMException'))('The string contains characters outside of the Latin1 range', 'InvalidCharacterError');
	      }
	      block = block << 8 | charCode;
	      output += charAt$2(map, 63 & block >> 8 - position % 1 * 8);
	    } return output;
	  }
	});

	// iterable DOM collections
	// flag - `iterable` interface - 'entries', 'keys', 'values', 'forEach' methods
	var domIterables = {
	  CSSRuleList: 0,
	  CSSStyleDeclaration: 0,
	  CSSValueList: 0,
	  ClientRectList: 0,
	  DOMRectList: 0,
	  DOMStringList: 0,
	  DOMTokenList: 1,
	  DataTransferItemList: 0,
	  FileList: 0,
	  HTMLAllCollection: 0,
	  HTMLCollection: 0,
	  HTMLFormElement: 0,
	  HTMLSelectElement: 0,
	  MediaList: 0,
	  MimeTypeArray: 0,
	  NamedNodeMap: 0,
	  NodeList: 1,
	  PaintRequestList: 0,
	  Plugin: 0,
	  PluginArray: 0,
	  SVGLengthList: 0,
	  SVGNumberList: 0,
	  SVGPathSegList: 0,
	  SVGPointList: 0,
	  SVGStringList: 0,
	  SVGTransformList: 0,
	  SourceBufferList: 0,
	  StyleSheetList: 0,
	  TextTrackCueList: 0,
	  TextTrackList: 0,
	  TouchList: 0
	};

	// in old WebKit versions, `element.classList` is not an instance of global `DOMTokenList`
	var documentCreateElement = documentCreateElement$2;

	var classList = documentCreateElement('span').classList;
	var DOMTokenListPrototype$2 = classList && classList.constructor && classList.constructor.prototype;

	var domTokenListPrototype = DOMTokenListPrototype$2 === Object.prototype ? undefined : DOMTokenListPrototype$2;

	var globalThis$d = globalThis_1;
	var DOMIterables$1 = domIterables;
	var DOMTokenListPrototype$1 = domTokenListPrototype;
	var forEach$2 = arrayForEach;
	var createNonEnumerableProperty$2 = createNonEnumerableProperty$h;

	var handlePrototype$1 = function (CollectionPrototype) {
	  // some Chrome versions have non-configurable methods on DOMTokenList
	  if (CollectionPrototype && CollectionPrototype.forEach !== forEach$2) try {
	    createNonEnumerableProperty$2(CollectionPrototype, 'forEach', forEach$2);
	  } catch (error) {
	    CollectionPrototype.forEach = forEach$2;
	  }
	};

	for (var COLLECTION_NAME$1 in DOMIterables$1) {
	  if (DOMIterables$1[COLLECTION_NAME$1]) {
	    handlePrototype$1(globalThis$d[COLLECTION_NAME$1] && globalThis$d[COLLECTION_NAME$1].prototype);
	  }
	}

	handlePrototype$1(DOMTokenListPrototype$1);

	var globalThis$c = globalThis_1;
	var DOMIterables = domIterables;
	var DOMTokenListPrototype = domTokenListPrototype;
	var ArrayIteratorMethods = es_array_iterator;
	var createNonEnumerableProperty$1 = createNonEnumerableProperty$h;
	var setToStringTag$3 = setToStringTag$e;
	var wellKnownSymbol$2 = wellKnownSymbol$K;

	var ITERATOR$2 = wellKnownSymbol$2('iterator');
	var ArrayValues = ArrayIteratorMethods.values;

	var handlePrototype = function (CollectionPrototype, COLLECTION_NAME) {
	  if (CollectionPrototype) {
	    // some Chrome versions have non-configurable methods on DOMTokenList
	    if (CollectionPrototype[ITERATOR$2] !== ArrayValues) try {
	      createNonEnumerableProperty$1(CollectionPrototype, ITERATOR$2, ArrayValues);
	    } catch (error) {
	      CollectionPrototype[ITERATOR$2] = ArrayValues;
	    }
	    setToStringTag$3(CollectionPrototype, COLLECTION_NAME, true);
	    if (DOMIterables[COLLECTION_NAME]) for (var METHOD_NAME in ArrayIteratorMethods) {
	      // some Chrome versions have non-configurable methods on DOMTokenList
	      if (CollectionPrototype[METHOD_NAME] !== ArrayIteratorMethods[METHOD_NAME]) try {
	        createNonEnumerableProperty$1(CollectionPrototype, METHOD_NAME, ArrayIteratorMethods[METHOD_NAME]);
	      } catch (error) {
	        CollectionPrototype[METHOD_NAME] = ArrayIteratorMethods[METHOD_NAME];
	      }
	    }
	  }
	};

	for (var COLLECTION_NAME in DOMIterables) {
	  handlePrototype(globalThis$c[COLLECTION_NAME] && globalThis$c[COLLECTION_NAME].prototype, COLLECTION_NAME);
	}

	handlePrototype(DOMTokenListPrototype, 'DOMTokenList');

	var domExceptionConstants = {
	  IndexSizeError: { s: 'INDEX_SIZE_ERR', c: 1, m: 1 },
	  DOMStringSizeError: { s: 'DOMSTRING_SIZE_ERR', c: 2, m: 0 },
	  HierarchyRequestError: { s: 'HIERARCHY_REQUEST_ERR', c: 3, m: 1 },
	  WrongDocumentError: { s: 'WRONG_DOCUMENT_ERR', c: 4, m: 1 },
	  InvalidCharacterError: { s: 'INVALID_CHARACTER_ERR', c: 5, m: 1 },
	  NoDataAllowedError: { s: 'NO_DATA_ALLOWED_ERR', c: 6, m: 0 },
	  NoModificationAllowedError: { s: 'NO_MODIFICATION_ALLOWED_ERR', c: 7, m: 1 },
	  NotFoundError: { s: 'NOT_FOUND_ERR', c: 8, m: 1 },
	  NotSupportedError: { s: 'NOT_SUPPORTED_ERR', c: 9, m: 1 },
	  InUseAttributeError: { s: 'INUSE_ATTRIBUTE_ERR', c: 10, m: 1 },
	  InvalidStateError: { s: 'INVALID_STATE_ERR', c: 11, m: 1 },
	  SyntaxError: { s: 'SYNTAX_ERR', c: 12, m: 1 },
	  InvalidModificationError: { s: 'INVALID_MODIFICATION_ERR', c: 13, m: 1 },
	  NamespaceError: { s: 'NAMESPACE_ERR', c: 14, m: 1 },
	  InvalidAccessError: { s: 'INVALID_ACCESS_ERR', c: 15, m: 1 },
	  ValidationError: { s: 'VALIDATION_ERR', c: 16, m: 0 },
	  TypeMismatchError: { s: 'TYPE_MISMATCH_ERR', c: 17, m: 1 },
	  SecurityError: { s: 'SECURITY_ERR', c: 18, m: 1 },
	  NetworkError: { s: 'NETWORK_ERR', c: 19, m: 1 },
	  AbortError: { s: 'ABORT_ERR', c: 20, m: 1 },
	  URLMismatchError: { s: 'URL_MISMATCH_ERR', c: 21, m: 1 },
	  QuotaExceededError: { s: 'QUOTA_EXCEEDED_ERR', c: 22, m: 1 },
	  TimeoutError: { s: 'TIMEOUT_ERR', c: 23, m: 1 },
	  InvalidNodeTypeError: { s: 'INVALID_NODE_TYPE_ERR', c: 24, m: 1 },
	  DataCloneError: { s: 'DATA_CLONE_ERR', c: 25, m: 1 }
	};

	var $$d = _export;
	var getBuiltIn$6 = getBuiltIn$B;
	var getBuiltInNodeModule = getBuiltInNodeModule$2;
	var fails$4 = fails$1z;
	var create$1 = objectCreate;
	var createPropertyDescriptor$2 = createPropertyDescriptor$d;
	var defineProperty$2 = objectDefineProperty.f;
	var defineBuiltIn$4 = defineBuiltIn$t;
	var defineBuiltInAccessor$4 = defineBuiltInAccessor$l;
	var hasOwn$4 = hasOwnProperty_1;
	var anInstance$3 = anInstance$d;
	var anObject$2 = anObject$U;
	var errorToString = errorToString$2;
	var normalizeStringArgument$1 = normalizeStringArgument$6;
	var DOMExceptionConstants$1 = domExceptionConstants;
	var clearErrorStack$1 = errorStackClear;
	var InternalStateModule$2 = internalState;
	var DESCRIPTORS$7 = descriptors;

	var DOM_EXCEPTION$2 = 'DOMException';
	var DATA_CLONE_ERR = 'DATA_CLONE_ERR';
	var Error$3 = getBuiltIn$6('Error');
	// NodeJS < 17.0 does not expose `DOMException` to global
	var NativeDOMException$1 = getBuiltIn$6(DOM_EXCEPTION$2) || (function () {
	  try {
	    // NodeJS < 15.0 does not expose `MessageChannel` to global
	    var MessageChannel = getBuiltIn$6('MessageChannel') || getBuiltInNodeModule('worker_threads').MessageChannel;
	    // eslint-disable-next-line es/no-weak-map, unicorn/require-post-message-target-origin -- safe
	    new MessageChannel().port1.postMessage(new WeakMap());
	  } catch (error) {
	    if (error.name === DATA_CLONE_ERR && error.code === 25) return error.constructor;
	  }
	})();
	var NativeDOMExceptionPrototype = NativeDOMException$1 && NativeDOMException$1.prototype;
	var ErrorPrototype = Error$3.prototype;
	var setInternalState$2 = InternalStateModule$2.set;
	var getInternalState = InternalStateModule$2.getterFor(DOM_EXCEPTION$2);
	var HAS_STACK = 'stack' in new Error$3(DOM_EXCEPTION$2);

	var codeFor = function (name) {
	  return hasOwn$4(DOMExceptionConstants$1, name) && DOMExceptionConstants$1[name].m ? DOMExceptionConstants$1[name].c : 0;
	};

	var $DOMException$1 = function DOMException() {
	  anInstance$3(this, DOMExceptionPrototype$1);
	  var argumentsLength = arguments.length;
	  var message = normalizeStringArgument$1(argumentsLength < 1 ? undefined : arguments[0]);
	  var name = normalizeStringArgument$1(argumentsLength < 2 ? undefined : arguments[1], 'Error');
	  var code = codeFor(name);
	  setInternalState$2(this, {
	    type: DOM_EXCEPTION$2,
	    name: name,
	    message: message,
	    code: code
	  });
	  if (!DESCRIPTORS$7) {
	    this.name = name;
	    this.message = message;
	    this.code = code;
	  }
	  if (HAS_STACK) {
	    var error = new Error$3(message);
	    error.name = DOM_EXCEPTION$2;
	    defineProperty$2(this, 'stack', createPropertyDescriptor$2(1, clearErrorStack$1(error.stack, 1)));
	  }
	};

	var DOMExceptionPrototype$1 = $DOMException$1.prototype = create$1(ErrorPrototype);

	var createGetterDescriptor = function (get) {
	  return { enumerable: true, configurable: true, get: get };
	};

	var getterFor = function (key) {
	  return createGetterDescriptor(function () {
	    return getInternalState(this)[key];
	  });
	};

	if (DESCRIPTORS$7) {
	  // `DOMException.prototype.code` getter
	  defineBuiltInAccessor$4(DOMExceptionPrototype$1, 'code', getterFor('code'));
	  // `DOMException.prototype.message` getter
	  defineBuiltInAccessor$4(DOMExceptionPrototype$1, 'message', getterFor('message'));
	  // `DOMException.prototype.name` getter
	  defineBuiltInAccessor$4(DOMExceptionPrototype$1, 'name', getterFor('name'));
	}

	defineProperty$2(DOMExceptionPrototype$1, 'constructor', createPropertyDescriptor$2(1, $DOMException$1));

	// FF36- DOMException is a function, but can't be constructed
	var INCORRECT_CONSTRUCTOR = fails$4(function () {
	  return !(new NativeDOMException$1() instanceof Error$3);
	});

	// Safari 10.1 / Chrome 32- / IE8- DOMException.prototype.toString bugs
	var INCORRECT_TO_STRING = INCORRECT_CONSTRUCTOR || fails$4(function () {
	  return ErrorPrototype.toString !== errorToString || String(new NativeDOMException$1(1, 2)) !== '2: 1';
	});

	// Deno 1.6.3- DOMException.prototype.code just missed
	var INCORRECT_CODE = INCORRECT_CONSTRUCTOR || fails$4(function () {
	  return new NativeDOMException$1(1, 'DataCloneError').code !== 25;
	});

	// Deno 1.6.3- DOMException constants just missed
	INCORRECT_CONSTRUCTOR
	  || NativeDOMException$1[DATA_CLONE_ERR] !== 25
	  || NativeDOMExceptionPrototype[DATA_CLONE_ERR] !== 25;

	var FORCED_CONSTRUCTOR$1 = INCORRECT_CONSTRUCTOR;

	// `DOMException` constructor
	// https://webidl.spec.whatwg.org/#idl-DOMException
	$$d({ global: true, constructor: true, forced: FORCED_CONSTRUCTOR$1 }, {
	  DOMException: FORCED_CONSTRUCTOR$1 ? $DOMException$1 : NativeDOMException$1
	});

	var PolyfilledDOMException$1 = getBuiltIn$6(DOM_EXCEPTION$2);
	var PolyfilledDOMExceptionPrototype$1 = PolyfilledDOMException$1.prototype;

	if (INCORRECT_TO_STRING && (NativeDOMException$1 === PolyfilledDOMException$1)) {
	  defineBuiltIn$4(PolyfilledDOMExceptionPrototype$1, 'toString', errorToString);
	}

	if (INCORRECT_CODE && DESCRIPTORS$7 && NativeDOMException$1 === PolyfilledDOMException$1) {
	  defineBuiltInAccessor$4(PolyfilledDOMExceptionPrototype$1, 'code', createGetterDescriptor(function () {
	    return codeFor(anObject$2(this).name);
	  }));
	}

	// `DOMException` constants
	for (var key$1 in DOMExceptionConstants$1) if (hasOwn$4(DOMExceptionConstants$1, key$1)) {
	  var constant$1 = DOMExceptionConstants$1[key$1];
	  var constantName$1 = constant$1.s;
	  var descriptor$2 = createPropertyDescriptor$2(6, constant$1.c);
	  if (!hasOwn$4(PolyfilledDOMException$1, constantName$1)) {
	    defineProperty$2(PolyfilledDOMException$1, constantName$1, descriptor$2);
	  }
	  if (!hasOwn$4(PolyfilledDOMExceptionPrototype$1, constantName$1)) {
	    defineProperty$2(PolyfilledDOMExceptionPrototype$1, constantName$1, descriptor$2);
	  }
	}

	var $$c = _export;
	var globalThis$b = globalThis_1;
	var getBuiltIn$5 = getBuiltIn$B;
	var createPropertyDescriptor$1 = createPropertyDescriptor$d;
	var defineProperty$1 = objectDefineProperty.f;
	var hasOwn$3 = hasOwnProperty_1;
	var anInstance$2 = anInstance$d;
	var inheritIfRequired = inheritIfRequired$7;
	var normalizeStringArgument = normalizeStringArgument$6;
	var DOMExceptionConstants = domExceptionConstants;
	var clearErrorStack = errorStackClear;
	var DESCRIPTORS$6 = descriptors;

	var DOM_EXCEPTION$1 = 'DOMException';
	var Error$2 = getBuiltIn$5('Error');
	var NativeDOMException = getBuiltIn$5(DOM_EXCEPTION$1);

	var $DOMException = function DOMException() {
	  anInstance$2(this, DOMExceptionPrototype);
	  var argumentsLength = arguments.length;
	  var message = normalizeStringArgument(argumentsLength < 1 ? undefined : arguments[0]);
	  var name = normalizeStringArgument(argumentsLength < 2 ? undefined : arguments[1], 'Error');
	  var that = new NativeDOMException(message, name);
	  var error = new Error$2(message);
	  error.name = DOM_EXCEPTION$1;
	  defineProperty$1(that, 'stack', createPropertyDescriptor$1(1, clearErrorStack(error.stack, 1)));
	  inheritIfRequired(that, this, $DOMException);
	  return that;
	};

	var DOMExceptionPrototype = $DOMException.prototype = NativeDOMException.prototype;

	var ERROR_HAS_STACK = 'stack' in new Error$2(DOM_EXCEPTION$1);
	var DOM_EXCEPTION_HAS_STACK = 'stack' in new NativeDOMException(1, 2);

	// eslint-disable-next-line es/no-object-getownpropertydescriptor -- safe
	var descriptor$1 = NativeDOMException && DESCRIPTORS$6 && Object.getOwnPropertyDescriptor(globalThis$b, DOM_EXCEPTION$1);

	// Bun ~ 0.1.1 DOMException have incorrect descriptor and we can't redefine it
	// https://github.com/Jarred-Sumner/bun/issues/399
	var BUGGY_DESCRIPTOR = !!descriptor$1 && !(descriptor$1.writable && descriptor$1.configurable);

	var FORCED_CONSTRUCTOR = ERROR_HAS_STACK && !BUGGY_DESCRIPTOR && !DOM_EXCEPTION_HAS_STACK;

	// `DOMException` constructor patch for `.stack` where it's required
	// https://webidl.spec.whatwg.org/#es-DOMException-specialness
	$$c({ global: true, constructor: true, forced: FORCED_CONSTRUCTOR }, { // TODO: fix export logic
	  DOMException: FORCED_CONSTRUCTOR ? $DOMException : NativeDOMException
	});

	var PolyfilledDOMException = getBuiltIn$5(DOM_EXCEPTION$1);
	var PolyfilledDOMExceptionPrototype = PolyfilledDOMException.prototype;

	if (PolyfilledDOMExceptionPrototype.constructor !== PolyfilledDOMException) {
	  {
	    defineProperty$1(PolyfilledDOMExceptionPrototype, 'constructor', createPropertyDescriptor$1(1, PolyfilledDOMException));
	  }

	  for (var key in DOMExceptionConstants) if (hasOwn$3(DOMExceptionConstants, key)) {
	    var constant = DOMExceptionConstants[key];
	    var constantName = constant.s;
	    if (!hasOwn$3(PolyfilledDOMException, constantName)) {
	      defineProperty$1(PolyfilledDOMException, constantName, createPropertyDescriptor$1(6, constant.c));
	    }
	  }
	}

	var getBuiltIn$4 = getBuiltIn$B;
	var setToStringTag$2 = setToStringTag$e;

	var DOM_EXCEPTION = 'DOMException';

	// `DOMException.prototype[@@toStringTag]` property
	setToStringTag$2(getBuiltIn$4(DOM_EXCEPTION), DOM_EXCEPTION);

	var $$b = _export;
	var globalThis$a = globalThis_1;
	var clearImmediate = task$1.clear;

	// `clearImmediate` method
	// http://w3c.github.io/setImmediate/#si-clearImmediate
	$$b({ global: true, bind: true, enumerable: true, forced: globalThis$a.clearImmediate !== clearImmediate }, {
	  clearImmediate: clearImmediate
	});

	var globalThis$9 = globalThis_1;
	var apply = functionApply$1;
	var isCallable$2 = isCallable$A;
	var ENVIRONMENT = environment;
	var USER_AGENT = environmentUserAgent;
	var arraySlice$1 = arraySlice$a;
	var validateArgumentsLength$8 = validateArgumentsLength$c;

	var Function$1 = globalThis$9.Function;
	// dirty IE9- and Bun 0.3.0- checks
	var WRAP = /MSIE .\./.test(USER_AGENT) || ENVIRONMENT === 'BUN' && (function () {
	  var version = globalThis$9.Bun.version.split('.');
	  return version.length < 3 || version[0] === '0' && (version[1] < 3 || version[1] === '3' && version[2] === '0');
	})();

	// IE9- / Bun 0.3.0- setTimeout / setInterval / setImmediate additional parameters fix
	// https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#timers
	// https://github.com/oven-sh/bun/issues/1633
	var schedulersFix$3 = function (scheduler, hasTimeArg) {
	  var firstParamIndex = hasTimeArg ? 2 : 1;
	  return WRAP ? function (handler, timeout /* , ...arguments */) {
	    var boundArgs = validateArgumentsLength$8(arguments.length, 1) > firstParamIndex;
	    var fn = isCallable$2(handler) ? handler : Function$1(handler);
	    var params = boundArgs ? arraySlice$1(arguments, firstParamIndex) : [];
	    var callback = boundArgs ? function () {
	      apply(fn, this, params);
	    } : fn;
	    return hasTimeArg ? scheduler(callback, timeout) : scheduler(callback);
	  } : scheduler;
	};

	var $$a = _export;
	var globalThis$8 = globalThis_1;
	var setTask = task$1.set;
	var schedulersFix$2 = schedulersFix$3;

	// https://github.com/oven-sh/bun/issues/1633
	var setImmediate = globalThis$8.setImmediate ? schedulersFix$2(setTask, false) : setTask;

	// `setImmediate` method
	// http://w3c.github.io/setImmediate/#si-setImmediate
	$$a({ global: true, bind: true, enumerable: true, forced: globalThis$8.setImmediate !== setImmediate }, {
	  setImmediate: setImmediate
	});

	var $$9 = _export;
	var globalThis$7 = globalThis_1;
	var microtask = microtask_1;
	var aCallable = aCallable$B;
	var validateArgumentsLength$7 = validateArgumentsLength$c;
	var fails$3 = fails$1z;
	var DESCRIPTORS$5 = descriptors;

	// Bun ~ 1.0.30 bug
	// https://github.com/oven-sh/bun/issues/9249
	var WRONG_ARITY$1 = fails$3(function () {
	  // getOwnPropertyDescriptor for prevent experimental warning in Node 11
	  // eslint-disable-next-line es/no-object-getownpropertydescriptor -- safe
	  return DESCRIPTORS$5 && Object.getOwnPropertyDescriptor(globalThis$7, 'queueMicrotask').value.length !== 1;
	});

	// `queueMicrotask` method
	// https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#dom-queuemicrotask
	$$9({ global: true, enumerable: true, dontCallGetSet: true, forced: WRONG_ARITY$1 }, {
	  queueMicrotask: function queueMicrotask(fn) {
	    validateArgumentsLength$7(arguments.length, 1);
	    microtask(aCallable(fn));
	  }
	});

	var $$8 = _export;
	var globalThis$6 = globalThis_1;
	var defineBuiltInAccessor$3 = defineBuiltInAccessor$l;
	var DESCRIPTORS$4 = descriptors;

	var $TypeError = TypeError;
	// eslint-disable-next-line es/no-object-defineproperty -- safe
	var defineProperty = Object.defineProperty;
	var INCORRECT_VALUE = globalThis$6.self !== globalThis$6;

	// `self` getter
	// https://html.spec.whatwg.org/multipage/window-object.html#dom-self
	try {
	  if (DESCRIPTORS$4) {
	    // eslint-disable-next-line es/no-object-getownpropertydescriptor -- safe
	    var descriptor = Object.getOwnPropertyDescriptor(globalThis$6, 'self');
	    // some engines have `self`, but with incorrect descriptor
	    // https://github.com/denoland/deno/issues/15765
	    if (INCORRECT_VALUE || !descriptor || !descriptor.get || !descriptor.enumerable) {
	      defineBuiltInAccessor$3(globalThis$6, 'self', {
	        get: function self() {
	          return globalThis$6;
	        },
	        set: function self(value) {
	          if (this !== globalThis$6) throw new $TypeError('Illegal invocation');
	          defineProperty(globalThis$6, 'self', {
	            value: value,
	            writable: true,
	            configurable: true,
	            enumerable: true
	          });
	        },
	        configurable: true,
	        enumerable: true
	      });
	    }
	  } else $$8({ global: true, simple: true, forced: INCORRECT_VALUE }, {
	    self: globalThis$6
	  });
	} catch (error) { /* empty */ }

	var $$7 = _export;
	var globalThis$5 = globalThis_1;
	var getBuiltIn$3 = getBuiltIn$B;
	var uncurryThis$6 = functionUncurryThis;
	var fails$2 = fails$1z;
	var uid = uid$6;
	var isCallable$1 = isCallable$A;
	var isConstructor = isConstructor$7;
	var isNullOrUndefined = isNullOrUndefined$9;
	var isObject$1 = isObject$K;
	var isSymbol = isSymbol$7;
	var iterate = iterate$l;
	var anObject$1 = anObject$U;
	var classof$1 = classof$p;
	var hasOwn$2 = hasOwnProperty_1;
	var createProperty = createProperty$9;
	var createNonEnumerableProperty = createNonEnumerableProperty$h;
	var lengthOfArrayLike = lengthOfArrayLike$s;
	var validateArgumentsLength$6 = validateArgumentsLength$c;
	var getRegExpFlags = regexpGetFlags;
	var MapHelpers = mapHelpers;
	var SetHelpers = setHelpers;
	var setIterate = setIterate$1;
	var detachTransferable = detachTransferable$2;
	var ERROR_STACK_INSTALLABLE = errorStackInstallable;
	var PROPER_STRUCTURED_CLONE_TRANSFER = structuredCloneProperTransfer;

	var Object$1 = globalThis$5.Object;
	var Array$1 = globalThis$5.Array;
	var Date$1 = globalThis$5.Date;
	var Error$1 = globalThis$5.Error;
	var TypeError$3 = globalThis$5.TypeError;
	var PerformanceMark = globalThis$5.PerformanceMark;
	var DOMException$1 = getBuiltIn$3('DOMException');
	var Map$1 = MapHelpers.Map;
	var mapHas = MapHelpers.has;
	var mapGet = MapHelpers.get;
	var mapSet = MapHelpers.set;
	var Set$1 = SetHelpers.Set;
	var setAdd = SetHelpers.add;
	var setHas = SetHelpers.has;
	var objectKeys = getBuiltIn$3('Object', 'keys');
	var push$4 = uncurryThis$6([].push);
	var thisBooleanValue = uncurryThis$6(true.valueOf);
	var thisNumberValue = uncurryThis$6(1.1.valueOf);
	var thisStringValue = uncurryThis$6(''.valueOf);
	var thisTimeValue = uncurryThis$6(Date$1.prototype.getTime);
	var PERFORMANCE_MARK = uid('structuredClone');
	var DATA_CLONE_ERROR = 'DataCloneError';
	var TRANSFERRING = 'Transferring';

	var checkBasicSemantic = function (structuredCloneImplementation) {
	  return !fails$2(function () {
	    var set1 = new globalThis$5.Set([7]);
	    var set2 = structuredCloneImplementation(set1);
	    var number = structuredCloneImplementation(Object$1(7));
	    return set2 === set1 || !set2.has(7) || !isObject$1(number) || +number !== 7;
	  }) && structuredCloneImplementation;
	};

	var checkErrorsCloning = function (structuredCloneImplementation, $Error) {
	  return !fails$2(function () {
	    var error = new $Error();
	    var test = structuredCloneImplementation({ a: error, b: error });
	    return !(test && test.a === test.b && test.a instanceof $Error && test.a.stack === error.stack);
	  });
	};

	// https://github.com/whatwg/html/pull/5749
	var checkNewErrorsCloningSemantic = function (structuredCloneImplementation) {
	  return !fails$2(function () {
	    var test = structuredCloneImplementation(new globalThis$5.AggregateError([1], PERFORMANCE_MARK, { cause: 3 }));
	    return test.name !== 'AggregateError' || test.errors[0] !== 1 || test.message !== PERFORMANCE_MARK || test.cause !== 3;
	  });
	};

	// FF94+, Safari 15.4+, Chrome 98+, NodeJS 17.0+, Deno 1.13+
	// FF<103 and Safari implementations can't clone errors
	// https://bugzilla.mozilla.org/show_bug.cgi?id=1556604
	// FF103 can clone errors, but `.stack` of clone is an empty string
	// https://bugzilla.mozilla.org/show_bug.cgi?id=1778762
	// FF104+ fixed it on usual errors, but not on DOMExceptions
	// https://bugzilla.mozilla.org/show_bug.cgi?id=1777321
	// Chrome <102 returns `null` if cloned object contains multiple references to one error
	// https://bugs.chromium.org/p/v8/issues/detail?id=12542
	// NodeJS implementation can't clone DOMExceptions
	// https://github.com/nodejs/node/issues/41038
	// only FF103+ supports new (html/5749) error cloning semantic
	var nativeStructuredClone = globalThis$5.structuredClone;

	var FORCED_REPLACEMENT = !checkErrorsCloning(nativeStructuredClone, Error$1)
	  || !checkErrorsCloning(nativeStructuredClone, DOMException$1)
	  || !checkNewErrorsCloningSemantic(nativeStructuredClone);

	// Chrome 82+, Safari 14.1+, Deno 1.11+
	// Chrome 78-81 implementation swaps `.name` and `.message` of cloned `DOMException`
	// Chrome returns `null` if cloned object contains multiple references to one error
	// Safari 14.1 implementation doesn't clone some `RegExp` flags, so requires a workaround
	// Safari implementation can't clone errors
	// Deno 1.2-1.10 implementations too naive
	// NodeJS 16.0+ does not have `PerformanceMark` constructor
	// NodeJS <17.2 structured cloning implementation from `performance.mark` is too naive
	// and can't clone, for example, `RegExp` or some boxed primitives
	// https://github.com/nodejs/node/issues/40840
	// no one of those implementations supports new (html/5749) error cloning semantic
	var structuredCloneFromMark = !nativeStructuredClone && checkBasicSemantic(function (value) {
	  return new PerformanceMark(PERFORMANCE_MARK, { detail: value }).detail;
	});

	var nativeRestrictedStructuredClone = checkBasicSemantic(nativeStructuredClone) || structuredCloneFromMark;

	var throwUncloneable = function (type) {
	  throw new DOMException$1('Uncloneable type: ' + type, DATA_CLONE_ERROR);
	};

	var throwUnpolyfillable = function (type, action) {
	  throw new DOMException$1((action || 'Cloning') + ' of ' + type + ' cannot be properly polyfilled in this engine', DATA_CLONE_ERROR);
	};

	var tryNativeRestrictedStructuredClone = function (value, type) {
	  if (!nativeRestrictedStructuredClone) throwUnpolyfillable(type);
	  return nativeRestrictedStructuredClone(value);
	};

	var createDataTransfer = function () {
	  var dataTransfer;
	  try {
	    dataTransfer = new globalThis$5.DataTransfer();
	  } catch (error) {
	    try {
	      dataTransfer = new globalThis$5.ClipboardEvent('').clipboardData;
	    } catch (error2) { /* empty */ }
	  }
	  return dataTransfer && dataTransfer.items && dataTransfer.files ? dataTransfer : null;
	};

	var cloneBuffer = function (value, map, $type) {
	  if (mapHas(map, value)) return mapGet(map, value);

	  var type = $type || classof$1(value);
	  var clone, length, options, source, target, i;

	  if (type === 'SharedArrayBuffer') {
	    if (nativeRestrictedStructuredClone) clone = nativeRestrictedStructuredClone(value);
	    // SharedArrayBuffer should use shared memory, we can't polyfill it, so return the original
	    else clone = value;
	  } else {
	    var DataView = globalThis$5.DataView;

	    // `ArrayBuffer#slice` is not available in IE10
	    // `ArrayBuffer#slice` and `DataView` are not available in old FF
	    if (!DataView && !isCallable$1(value.slice)) throwUnpolyfillable('ArrayBuffer');
	    // detached buffers throws in `DataView` and `.slice`
	    try {
	      if (isCallable$1(value.slice) && !value.resizable) {
	        clone = value.slice(0);
	      } else {
	        length = value.byteLength;
	        options = 'maxByteLength' in value ? { maxByteLength: value.maxByteLength } : undefined;
	        // eslint-disable-next-line es/no-resizable-and-growable-arraybuffers -- safe
	        clone = new ArrayBuffer(length, options);
	        source = new DataView(value);
	        target = new DataView(clone);
	        for (i = 0; i < length; i++) {
	          target.setUint8(i, source.getUint8(i));
	        }
	      }
	    } catch (error) {
	      throw new DOMException$1('ArrayBuffer is detached', DATA_CLONE_ERROR);
	    }
	  }

	  mapSet(map, value, clone);

	  return clone;
	};

	var cloneView = function (value, type, offset, length, map) {
	  var C = globalThis$5[type];
	  // in some old engines like Safari 9, typeof C is 'object'
	  // on Uint8ClampedArray or some other constructors
	  if (!isObject$1(C)) throwUnpolyfillable(type);
	  return new C(cloneBuffer(value.buffer, map), offset, length);
	};

	var structuredCloneInternal = function (value, map) {
	  if (isSymbol(value)) throwUncloneable('Symbol');
	  if (!isObject$1(value)) return value;
	  // effectively preserves circular references
	  if (map) {
	    if (mapHas(map, value)) return mapGet(map, value);
	  } else map = new Map$1();

	  var type = classof$1(value);
	  var C, name, cloned, dataTransfer, i, length, keys, key;

	  switch (type) {
	    case 'Array':
	      cloned = Array$1(lengthOfArrayLike(value));
	      break;
	    case 'Object':
	      cloned = {};
	      break;
	    case 'Map':
	      cloned = new Map$1();
	      break;
	    case 'Set':
	      cloned = new Set$1();
	      break;
	    case 'RegExp':
	      // in this block because of a Safari 14.1 bug
	      // old FF does not clone regexes passed to the constructor, so get the source and flags directly
	      cloned = new RegExp(value.source, getRegExpFlags(value));
	      break;
	    case 'Error':
	      name = value.name;
	      switch (name) {
	        case 'AggregateError':
	          cloned = new (getBuiltIn$3(name))([]);
	          break;
	        case 'EvalError':
	        case 'RangeError':
	        case 'ReferenceError':
	        case 'SuppressedError':
	        case 'SyntaxError':
	        case 'TypeError':
	        case 'URIError':
	          cloned = new (getBuiltIn$3(name))();
	          break;
	        case 'CompileError':
	        case 'LinkError':
	        case 'RuntimeError':
	          cloned = new (getBuiltIn$3('WebAssembly', name))();
	          break;
	        default:
	          cloned = new Error$1();
	      }
	      break;
	    case 'DOMException':
	      cloned = new DOMException$1(value.message, value.name);
	      break;
	    case 'ArrayBuffer':
	    case 'SharedArrayBuffer':
	      cloned = cloneBuffer(value, map, type);
	      break;
	    case 'DataView':
	    case 'Int8Array':
	    case 'Uint8Array':
	    case 'Uint8ClampedArray':
	    case 'Int16Array':
	    case 'Uint16Array':
	    case 'Int32Array':
	    case 'Uint32Array':
	    case 'Float16Array':
	    case 'Float32Array':
	    case 'Float64Array':
	    case 'BigInt64Array':
	    case 'BigUint64Array':
	      length = type === 'DataView' ? value.byteLength : value.length;
	      cloned = cloneView(value, type, value.byteOffset, length, map);
	      break;
	    case 'DOMQuad':
	      try {
	        cloned = new DOMQuad(
	          structuredCloneInternal(value.p1, map),
	          structuredCloneInternal(value.p2, map),
	          structuredCloneInternal(value.p3, map),
	          structuredCloneInternal(value.p4, map)
	        );
	      } catch (error) {
	        cloned = tryNativeRestrictedStructuredClone(value, type);
	      }
	      break;
	    case 'File':
	      if (nativeRestrictedStructuredClone) try {
	        cloned = nativeRestrictedStructuredClone(value);
	        // NodeJS 20.0.0 bug, https://github.com/nodejs/node/issues/47612
	        if (classof$1(cloned) !== type) cloned = undefined;
	      } catch (error) { /* empty */ }
	      if (!cloned) try {
	        cloned = new File([value], value.name, value);
	      } catch (error) { /* empty */ }
	      if (!cloned) throwUnpolyfillable(type);
	      break;
	    case 'FileList':
	      dataTransfer = createDataTransfer();
	      if (dataTransfer) {
	        for (i = 0, length = lengthOfArrayLike(value); i < length; i++) {
	          dataTransfer.items.add(structuredCloneInternal(value[i], map));
	        }
	        cloned = dataTransfer.files;
	      } else cloned = tryNativeRestrictedStructuredClone(value, type);
	      break;
	    case 'ImageData':
	      // Safari 9 ImageData is a constructor, but typeof ImageData is 'object'
	      try {
	        cloned = new ImageData(
	          structuredCloneInternal(value.data, map),
	          value.width,
	          value.height,
	          { colorSpace: value.colorSpace }
	        );
	      } catch (error) {
	        cloned = tryNativeRestrictedStructuredClone(value, type);
	      } break;
	    default:
	      if (nativeRestrictedStructuredClone) {
	        cloned = nativeRestrictedStructuredClone(value);
	      } else switch (type) {
	        case 'BigInt':
	          // can be a 3rd party polyfill
	          cloned = Object$1(value.valueOf());
	          break;
	        case 'Boolean':
	          cloned = Object$1(thisBooleanValue(value));
	          break;
	        case 'Number':
	          cloned = Object$1(thisNumberValue(value));
	          break;
	        case 'String':
	          cloned = Object$1(thisStringValue(value));
	          break;
	        case 'Date':
	          cloned = new Date$1(thisTimeValue(value));
	          break;
	        case 'Blob':
	          try {
	            cloned = value.slice(0, value.size, value.type);
	          } catch (error) {
	            throwUnpolyfillable(type);
	          } break;
	        case 'DOMPoint':
	        case 'DOMPointReadOnly':
	          C = globalThis$5[type];
	          try {
	            cloned = C.fromPoint
	              ? C.fromPoint(value)
	              : new C(value.x, value.y, value.z, value.w);
	          } catch (error) {
	            throwUnpolyfillable(type);
	          } break;
	        case 'DOMRect':
	        case 'DOMRectReadOnly':
	          C = globalThis$5[type];
	          try {
	            cloned = C.fromRect
	              ? C.fromRect(value)
	              : new C(value.x, value.y, value.width, value.height);
	          } catch (error) {
	            throwUnpolyfillable(type);
	          } break;
	        case 'DOMMatrix':
	        case 'DOMMatrixReadOnly':
	          C = globalThis$5[type];
	          try {
	            cloned = C.fromMatrix
	              ? C.fromMatrix(value)
	              : new C(value);
	          } catch (error) {
	            throwUnpolyfillable(type);
	          } break;
	        case 'AudioData':
	        case 'VideoFrame':
	          if (!isCallable$1(value.clone)) throwUnpolyfillable(type);
	          try {
	            cloned = value.clone();
	          } catch (error) {
	            throwUncloneable(type);
	          } break;
	        case 'CropTarget':
	        case 'CryptoKey':
	        case 'FileSystemDirectoryHandle':
	        case 'FileSystemFileHandle':
	        case 'FileSystemHandle':
	        case 'GPUCompilationInfo':
	        case 'GPUCompilationMessage':
	        case 'ImageBitmap':
	        case 'RTCCertificate':
	        case 'WebAssembly.Module':
	          throwUnpolyfillable(type);
	          // break omitted
	        default:
	          throwUncloneable(type);
	      }
	  }

	  mapSet(map, value, cloned);

	  switch (type) {
	    case 'Array':
	    case 'Object':
	      keys = objectKeys(value);
	      for (i = 0, length = lengthOfArrayLike(keys); i < length; i++) {
	        key = keys[i];
	        createProperty(cloned, key, structuredCloneInternal(value[key], map));
	      } break;
	    case 'Map':
	      value.forEach(function (v, k) {
	        mapSet(cloned, structuredCloneInternal(k, map), structuredCloneInternal(v, map));
	      });
	      break;
	    case 'Set':
	      value.forEach(function (v) {
	        setAdd(cloned, structuredCloneInternal(v, map));
	      });
	      break;
	    case 'Error':
	      createNonEnumerableProperty(cloned, 'message', structuredCloneInternal(value.message, map));
	      if (hasOwn$2(value, 'cause')) {
	        createNonEnumerableProperty(cloned, 'cause', structuredCloneInternal(value.cause, map));
	      }
	      if (name === 'AggregateError') {
	        cloned.errors = structuredCloneInternal(value.errors, map);
	      } else if (name === 'SuppressedError') {
	        cloned.error = structuredCloneInternal(value.error, map);
	        cloned.suppressed = structuredCloneInternal(value.suppressed, map);
	      } // break omitted
	    case 'DOMException':
	      if (ERROR_STACK_INSTALLABLE) {
	        createNonEnumerableProperty(cloned, 'stack', structuredCloneInternal(value.stack, map));
	      }
	  }

	  return cloned;
	};

	var tryToTransfer = function (rawTransfer, map) {
	  if (!isObject$1(rawTransfer)) throw new TypeError$3('Transfer option cannot be converted to a sequence');

	  var transfer = [];

	  iterate(rawTransfer, function (value) {
	    push$4(transfer, anObject$1(value));
	  });

	  var i = 0;
	  var length = lengthOfArrayLike(transfer);
	  var buffers = new Set$1();
	  var value, type, C, transferred, canvas, context;

	  while (i < length) {
	    value = transfer[i++];

	    type = classof$1(value);

	    if (type === 'ArrayBuffer' ? setHas(buffers, value) : mapHas(map, value)) {
	      throw new DOMException$1('Duplicate transferable', DATA_CLONE_ERROR);
	    }

	    if (type === 'ArrayBuffer') {
	      setAdd(buffers, value);
	      continue;
	    }

	    if (PROPER_STRUCTURED_CLONE_TRANSFER) {
	      transferred = nativeStructuredClone(value, { transfer: [value] });
	    } else switch (type) {
	      case 'ImageBitmap':
	        C = globalThis$5.OffscreenCanvas;
	        if (!isConstructor(C)) throwUnpolyfillable(type, TRANSFERRING);
	        try {
	          canvas = new C(value.width, value.height);
	          context = canvas.getContext('bitmaprenderer');
	          context.transferFromImageBitmap(value);
	          transferred = canvas.transferToImageBitmap();
	        } catch (error) { /* empty */ }
	        break;
	      case 'AudioData':
	      case 'VideoFrame':
	        if (!isCallable$1(value.clone) || !isCallable$1(value.close)) throwUnpolyfillable(type, TRANSFERRING);
	        try {
	          transferred = value.clone();
	          value.close();
	        } catch (error) { /* empty */ }
	        break;
	      case 'MediaSourceHandle':
	      case 'MessagePort':
	      case 'MIDIAccess':
	      case 'OffscreenCanvas':
	      case 'ReadableStream':
	      case 'RTCDataChannel':
	      case 'TransformStream':
	      case 'WebTransportReceiveStream':
	      case 'WebTransportSendStream':
	      case 'WritableStream':
	        throwUnpolyfillable(type, TRANSFERRING);
	    }

	    if (transferred === undefined) throw new DOMException$1('This object cannot be transferred: ' + type, DATA_CLONE_ERROR);

	    mapSet(map, value, transferred);
	  }

	  return buffers;
	};

	var detachBuffers = function (buffers) {
	  setIterate(buffers, function (buffer) {
	    if (PROPER_STRUCTURED_CLONE_TRANSFER) {
	      nativeRestrictedStructuredClone(buffer, { transfer: [buffer] });
	    } else if (isCallable$1(buffer.transfer)) {
	      buffer.transfer();
	    } else if (detachTransferable) {
	      detachTransferable(buffer);
	    } else {
	      throwUnpolyfillable('ArrayBuffer', TRANSFERRING);
	    }
	  });
	};

	// `structuredClone` method
	// https://html.spec.whatwg.org/multipage/structured-data.html#dom-structuredclone
	$$7({ global: true, enumerable: true, sham: !PROPER_STRUCTURED_CLONE_TRANSFER, forced: FORCED_REPLACEMENT }, {
	  structuredClone: function structuredClone(value /* , { transfer } */) {
	    var options = validateArgumentsLength$6(arguments.length, 1) > 1 && !isNullOrUndefined(arguments[1]) ? anObject$1(arguments[1]) : undefined;
	    var transfer = options ? options.transfer : undefined;
	    var map, buffers;

	    if (transfer !== undefined) {
	      map = new Map$1();
	      buffers = tryToTransfer(transfer, map);
	    }

	    var clone = structuredCloneInternal(value, map);

	    // since of an issue with cloning views of transferred buffers, we a forced to detach them later
	    // https://github.com/zloirock/core-js/issues/1265
	    if (buffers) detachBuffers(buffers);

	    return clone;
	  }
	});

	var $$6 = _export;
	var globalThis$4 = globalThis_1;
	var schedulersFix$1 = schedulersFix$3;

	var setInterval = schedulersFix$1(globalThis$4.setInterval, true);

	// Bun / IE9- setInterval additional parameters fix
	// https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#dom-setinterval
	$$6({ global: true, bind: true, forced: globalThis$4.setInterval !== setInterval }, {
	  setInterval: setInterval
	});

	var $$5 = _export;
	var globalThis$3 = globalThis_1;
	var schedulersFix = schedulersFix$3;

	var setTimeout$1 = schedulersFix(globalThis$3.setTimeout, true);

	// Bun / IE9- setTimeout additional parameters fix
	// https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#dom-settimeout
	$$5({ global: true, bind: true, forced: globalThis$3.setTimeout !== setTimeout$1 }, {
	  setTimeout: setTimeout$1
	});

	var fails$1 = fails$1z;
	var wellKnownSymbol$1 = wellKnownSymbol$K;
	var DESCRIPTORS$3 = descriptors;
	var IS_PURE = isPure;

	var ITERATOR$1 = wellKnownSymbol$1('iterator');

	var urlConstructorDetection = !fails$1(function () {
	  // eslint-disable-next-line unicorn/relative-url-style -- required for testing
	  var url = new URL('b?a=1&b=2&c=3', 'https://a');
	  var params = url.searchParams;
	  var params2 = new URLSearchParams('a=1&a=2&b=3');
	  var result = '';
	  url.pathname = 'c%20d';
	  params.forEach(function (value, key) {
	    params['delete']('b');
	    result += key + value;
	  });
	  params2['delete']('a', 2);
	  // `undefined` case is a Chromium 117 bug
	  // https://bugs.chromium.org/p/v8/issues/detail?id=14222
	  params2['delete']('b', undefined);
	  return (IS_PURE && (!url.toJSON || !params2.has('a', 1) || params2.has('a', 2) || !params2.has('a', undefined) || params2.has('b')))
	    || (!params.size && (IS_PURE || !DESCRIPTORS$3))
	    || !params.sort
	    || url.href !== 'https://a/c%20d?a=1&c=3'
	    || params.get('c') !== '3'
	    || String(new URLSearchParams('?a=1')) !== 'a=1'
	    || !params[ITERATOR$1]
	    // throws in Edge
	    || new URL('https://a@b').username !== 'a'
	    || new URLSearchParams(new URLSearchParams('a=b')).get('a') !== 'b'
	    // not punycoded in Edge
	    || new URL('https://тест').host !== 'xn--e1aybc'
	    // not escaped in Chrome 62-
	    || new URL('https://a#б').hash !== '#%D0%B1'
	    // fails in Chrome 66-
	    || result !== 'a1c3'
	    // throws in Safari
	    || new URL('https://x', undefined).host !== 'x';
	});

	// based on https://github.com/bestiejs/punycode.js/blob/master/punycode.js
	var uncurryThis$5 = functionUncurryThis;

	var maxInt = 2147483647; // aka. 0x7FFFFFFF or 2^31-1
	var base = 36;
	var tMin = 1;
	var tMax = 26;
	var skew = 38;
	var damp = 700;
	var initialBias = 72;
	var initialN = 128; // 0x80
	var delimiter = '-'; // '\x2D'
	var regexNonASCII = /[^\0-\u007E]/; // non-ASCII chars
	var regexSeparators = /[.\u3002\uFF0E\uFF61]/g; // RFC 3490 separators
	var OVERFLOW_ERROR = 'Overflow: input needs wider integers to process';
	var baseMinusTMin = base - tMin;

	var $RangeError = RangeError;
	var exec$2 = uncurryThis$5(regexSeparators.exec);
	var floor$1 = Math.floor;
	var fromCharCode$1 = String.fromCharCode;
	var charCodeAt = uncurryThis$5(''.charCodeAt);
	var join$2 = uncurryThis$5([].join);
	var push$3 = uncurryThis$5([].push);
	var replace$2 = uncurryThis$5(''.replace);
	var split$2 = uncurryThis$5(''.split);
	var toLowerCase$1 = uncurryThis$5(''.toLowerCase);

	/**
	 * Creates an array containing the numeric code points of each Unicode
	 * character in the string. While JavaScript uses UCS-2 internally,
	 * this function will convert a pair of surrogate halves (each of which
	 * UCS-2 exposes as separate characters) into a single code point,
	 * matching UTF-16.
	 */
	var ucs2decode = function (string) {
	  var output = [];
	  var counter = 0;
	  var length = string.length;
	  while (counter < length) {
	    var value = charCodeAt(string, counter++);
	    if (value >= 0xD800 && value <= 0xDBFF && counter < length) {
	      // It's a high surrogate, and there is a next character.
	      var extra = charCodeAt(string, counter++);
	      if ((extra & 0xFC00) === 0xDC00) { // Low surrogate.
	        push$3(output, ((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000);
	      } else {
	        // It's an unmatched surrogate; only append this code unit, in case the
	        // next code unit is the high surrogate of a surrogate pair.
	        push$3(output, value);
	        counter--;
	      }
	    } else {
	      push$3(output, value);
	    }
	  }
	  return output;
	};

	/**
	 * Converts a digit/integer into a basic code point.
	 */
	var digitToBasic = function (digit) {
	  //  0..25 map to ASCII a..z or A..Z
	  // 26..35 map to ASCII 0..9
	  return digit + 22 + 75 * (digit < 26);
	};

	/**
	 * Bias adaptation function as per section 3.4 of RFC 3492.
	 * https://tools.ietf.org/html/rfc3492#section-3.4
	 */
	var adapt = function (delta, numPoints, firstTime) {
	  var k = 0;
	  delta = firstTime ? floor$1(delta / damp) : delta >> 1;
	  delta += floor$1(delta / numPoints);
	  while (delta > baseMinusTMin * tMax >> 1) {
	    delta = floor$1(delta / baseMinusTMin);
	    k += base;
	  }
	  return floor$1(k + (baseMinusTMin + 1) * delta / (delta + skew));
	};

	/**
	 * Converts a string of Unicode symbols (e.g. a domain name label) to a
	 * Punycode string of ASCII-only symbols.
	 */
	var encode = function (input) {
	  var output = [];

	  // Convert the input in UCS-2 to an array of Unicode code points.
	  input = ucs2decode(input);

	  // Cache the length.
	  var inputLength = input.length;

	  // Initialize the state.
	  var n = initialN;
	  var delta = 0;
	  var bias = initialBias;
	  var i, currentValue;

	  // Handle the basic code points.
	  for (i = 0; i < input.length; i++) {
	    currentValue = input[i];
	    if (currentValue < 0x80) {
	      push$3(output, fromCharCode$1(currentValue));
	    }
	  }

	  var basicLength = output.length; // number of basic code points.
	  var handledCPCount = basicLength; // number of code points that have been handled;

	  // Finish the basic string with a delimiter unless it's empty.
	  if (basicLength) {
	    push$3(output, delimiter);
	  }

	  // Main encoding loop:
	  while (handledCPCount < inputLength) {
	    // All non-basic code points < n have been handled already. Find the next larger one:
	    var m = maxInt;
	    for (i = 0; i < input.length; i++) {
	      currentValue = input[i];
	      if (currentValue >= n && currentValue < m) {
	        m = currentValue;
	      }
	    }

	    // Increase `delta` enough to advance the decoder's <n,i> state to <m,0>, but guard against overflow.
	    var handledCPCountPlusOne = handledCPCount + 1;
	    if (m - n > floor$1((maxInt - delta) / handledCPCountPlusOne)) {
	      throw new $RangeError(OVERFLOW_ERROR);
	    }

	    delta += (m - n) * handledCPCountPlusOne;
	    n = m;

	    for (i = 0; i < input.length; i++) {
	      currentValue = input[i];
	      if (currentValue < n && ++delta > maxInt) {
	        throw new $RangeError(OVERFLOW_ERROR);
	      }
	      if (currentValue === n) {
	        // Represent delta as a generalized variable-length integer.
	        var q = delta;
	        var k = base;
	        while (true) {
	          var t = k <= bias ? tMin : k >= bias + tMax ? tMax : k - bias;
	          if (q < t) break;
	          var qMinusT = q - t;
	          var baseMinusT = base - t;
	          push$3(output, fromCharCode$1(digitToBasic(t + qMinusT % baseMinusT)));
	          q = floor$1(qMinusT / baseMinusT);
	          k += base;
	        }

	        push$3(output, fromCharCode$1(digitToBasic(q)));
	        bias = adapt(delta, handledCPCountPlusOne, handledCPCount === basicLength);
	        delta = 0;
	        handledCPCount++;
	      }
	    }

	    delta++;
	    n++;
	  }
	  return join$2(output, '');
	};

	var stringPunycodeToAscii = function (input) {
	  var encoded = [];
	  var labels = split$2(replace$2(toLowerCase$1(input), regexSeparators, '\u002E'), '.');
	  var i, label;
	  for (i = 0; i < labels.length; i++) {
	    label = labels[i];
	    push$3(encoded, exec$2(regexNonASCII, label) ? 'xn--' + encode(label) : label);
	  }
	  return join$2(encoded, '.');
	};

	// TODO: in core-js@4, move /modules/ dependencies to public entries for better optimization by tools like `preset-env`


	var $$4 = _export;
	var globalThis$2 = globalThis_1;
	var safeGetBuiltIn = safeGetBuiltIn$2;
	var getBuiltIn$2 = getBuiltIn$B;
	var call$1 = functionCall;
	var uncurryThis$4 = functionUncurryThis;
	var DESCRIPTORS$2 = descriptors;
	var USE_NATIVE_URL$3 = urlConstructorDetection;
	var defineBuiltIn$3 = defineBuiltIn$t;
	var defineBuiltInAccessor$2 = defineBuiltInAccessor$l;
	var defineBuiltIns = defineBuiltIns$9;
	var setToStringTag$1 = setToStringTag$e;
	var createIteratorConstructor = iteratorCreateConstructor;
	var InternalStateModule$1 = internalState;
	var anInstance$1 = anInstance$d;
	var isCallable = isCallable$A;
	var hasOwn$1 = hasOwnProperty_1;
	var bind$1 = functionBindContext;
	var classof = classof$p;
	var anObject = anObject$U;
	var isObject = isObject$K;
	var $toString$1 = toString$D;
	var create = objectCreate;
	var createPropertyDescriptor = createPropertyDescriptor$d;
	var getIterator = getIterator$6;
	var getIteratorMethod = getIteratorMethod$7;
	var createIterResultObject = createIterResultObject$7;
	var validateArgumentsLength$5 = validateArgumentsLength$c;
	var wellKnownSymbol = wellKnownSymbol$K;
	var arraySort = arraySort$1;

	var ITERATOR = wellKnownSymbol('iterator');
	var URL_SEARCH_PARAMS = 'URLSearchParams';
	var URL_SEARCH_PARAMS_ITERATOR = URL_SEARCH_PARAMS + 'Iterator';
	var setInternalState$1 = InternalStateModule$1.set;
	var getInternalParamsState = InternalStateModule$1.getterFor(URL_SEARCH_PARAMS);
	var getInternalIteratorState = InternalStateModule$1.getterFor(URL_SEARCH_PARAMS_ITERATOR);

	var nativeFetch = safeGetBuiltIn('fetch');
	var NativeRequest = safeGetBuiltIn('Request');
	var Headers$1 = safeGetBuiltIn('Headers');
	var RequestPrototype = NativeRequest && NativeRequest.prototype;
	var HeadersPrototype = Headers$1 && Headers$1.prototype;
	var TypeError$2 = globalThis$2.TypeError;
	var encodeURIComponent$1 = globalThis$2.encodeURIComponent;
	var fromCharCode = String.fromCharCode;
	var fromCodePoint = getBuiltIn$2('String', 'fromCodePoint');
	var $parseInt = parseInt;
	var charAt$1 = uncurryThis$4(''.charAt);
	var join$1 = uncurryThis$4([].join);
	var push$2 = uncurryThis$4([].push);
	var replace$1 = uncurryThis$4(''.replace);
	var shift$1 = uncurryThis$4([].shift);
	var splice = uncurryThis$4([].splice);
	var split$1 = uncurryThis$4(''.split);
	var stringSlice$1 = uncurryThis$4(''.slice);
	var exec$1 = uncurryThis$4(/./.exec);

	var plus = /\+/g;
	var FALLBACK_REPLACER = '\uFFFD';
	var VALID_HEX = /^[0-9a-f]+$/i;

	var parseHexOctet = function (string, start) {
	  var substr = stringSlice$1(string, start, start + 2);
	  if (!exec$1(VALID_HEX, substr)) return NaN;

	  return $parseInt(substr, 16);
	};

	var getLeadingOnes = function (octet) {
	  var count = 0;
	  for (var mask = 0x80; mask > 0 && (octet & mask) !== 0; mask >>= 1) {
	    count++;
	  }
	  return count;
	};

	var utf8Decode = function (octets) {
	  var codePoint = null;

	  switch (octets.length) {
	    case 1:
	      codePoint = octets[0];
	      break;
	    case 2:
	      codePoint = (octets[0] & 0x1F) << 6 | (octets[1] & 0x3F);
	      break;
	    case 3:
	      codePoint = (octets[0] & 0x0F) << 12 | (octets[1] & 0x3F) << 6 | (octets[2] & 0x3F);
	      break;
	    case 4:
	      codePoint = (octets[0] & 0x07) << 18 | (octets[1] & 0x3F) << 12 | (octets[2] & 0x3F) << 6 | (octets[3] & 0x3F);
	      break;
	  }

	  return codePoint > 0x10FFFF ? null : codePoint;
	};

	var decode$1 = function (input) {
	  input = replace$1(input, plus, ' ');
	  var length = input.length;
	  var result = '';
	  var i = 0;

	  while (i < length) {
	    var decodedChar = charAt$1(input, i);

	    if (decodedChar === '%') {
	      if (charAt$1(input, i + 1) === '%' || i + 3 > length) {
	        result += '%';
	        i++;
	        continue;
	      }

	      var octet = parseHexOctet(input, i + 1);

	      // eslint-disable-next-line no-self-compare -- NaN check
	      if (octet !== octet) {
	        result += decodedChar;
	        i++;
	        continue;
	      }

	      i += 2;
	      var byteSequenceLength = getLeadingOnes(octet);

	      if (byteSequenceLength === 0) {
	        decodedChar = fromCharCode(octet);
	      } else {
	        if (byteSequenceLength === 1 || byteSequenceLength > 4) {
	          result += FALLBACK_REPLACER;
	          i++;
	          continue;
	        }

	        var octets = [octet];
	        var sequenceIndex = 1;

	        while (sequenceIndex < byteSequenceLength) {
	          i++;
	          if (i + 3 > length || charAt$1(input, i) !== '%') break;

	          var nextByte = parseHexOctet(input, i + 1);

	          // eslint-disable-next-line no-self-compare -- NaN check
	          if (nextByte !== nextByte) {
	            i += 3;
	            break;
	          }
	          if (nextByte > 191 || nextByte < 128) break;

	          push$2(octets, nextByte);
	          i += 2;
	          sequenceIndex++;
	        }

	        if (octets.length !== byteSequenceLength) {
	          result += FALLBACK_REPLACER;
	          continue;
	        }

	        var codePoint = utf8Decode(octets);
	        if (codePoint === null) {
	          result += FALLBACK_REPLACER;
	        } else {
	          decodedChar = fromCodePoint(codePoint);
	        }
	      }
	    }

	    result += decodedChar;
	    i++;
	  }

	  return result;
	};

	var find = /[!'()~]|%20/g;

	var replacements = {
	  '!': '%21',
	  "'": '%27',
	  '(': '%28',
	  ')': '%29',
	  '~': '%7E',
	  '%20': '+'
	};

	var replacer = function (match) {
	  return replacements[match];
	};

	var serialize = function (it) {
	  return replace$1(encodeURIComponent$1(it), find, replacer);
	};

	var URLSearchParamsIterator = createIteratorConstructor(function Iterator(params, kind) {
	  setInternalState$1(this, {
	    type: URL_SEARCH_PARAMS_ITERATOR,
	    target: getInternalParamsState(params).entries,
	    index: 0,
	    kind: kind
	  });
	}, URL_SEARCH_PARAMS, function next() {
	  var state = getInternalIteratorState(this);
	  var target = state.target;
	  var index = state.index++;
	  if (!target || index >= target.length) {
	    state.target = null;
	    return createIterResultObject(undefined, true);
	  }
	  var entry = target[index];
	  switch (state.kind) {
	    case 'keys': return createIterResultObject(entry.key, false);
	    case 'values': return createIterResultObject(entry.value, false);
	  } return createIterResultObject([entry.key, entry.value], false);
	}, true);

	var URLSearchParamsState = function (init) {
	  this.entries = [];
	  this.url = null;

	  if (init !== undefined) {
	    if (isObject(init)) this.parseObject(init);
	    else this.parseQuery(typeof init == 'string' ? charAt$1(init, 0) === '?' ? stringSlice$1(init, 1) : init : $toString$1(init));
	  }
	};

	URLSearchParamsState.prototype = {
	  type: URL_SEARCH_PARAMS,
	  bindURL: function (url) {
	    this.url = url;
	    this.update();
	  },
	  parseObject: function (object) {
	    var entries = this.entries;
	    var iteratorMethod = getIteratorMethod(object);
	    var iterator, next, step, entryIterator, entryNext, first, second;

	    if (iteratorMethod) {
	      iterator = getIterator(object, iteratorMethod);
	      next = iterator.next;
	      while (!(step = call$1(next, iterator)).done) {
	        entryIterator = getIterator(anObject(step.value));
	        entryNext = entryIterator.next;
	        if (
	          (first = call$1(entryNext, entryIterator)).done ||
	          (second = call$1(entryNext, entryIterator)).done ||
	          !call$1(entryNext, entryIterator).done
	        ) throw new TypeError$2('Expected sequence with length 2');
	        push$2(entries, { key: $toString$1(first.value), value: $toString$1(second.value) });
	      }
	    } else for (var key in object) if (hasOwn$1(object, key)) {
	      push$2(entries, { key: key, value: $toString$1(object[key]) });
	    }
	  },
	  parseQuery: function (query) {
	    if (query) {
	      var entries = this.entries;
	      var attributes = split$1(query, '&');
	      var index = 0;
	      var attribute, entry;
	      while (index < attributes.length) {
	        attribute = attributes[index++];
	        if (attribute.length) {
	          entry = split$1(attribute, '=');
	          push$2(entries, {
	            key: decode$1(shift$1(entry)),
	            value: decode$1(join$1(entry, '='))
	          });
	        }
	      }
	    }
	  },
	  serialize: function () {
	    var entries = this.entries;
	    var result = [];
	    var index = 0;
	    var entry;
	    while (index < entries.length) {
	      entry = entries[index++];
	      push$2(result, serialize(entry.key) + '=' + serialize(entry.value));
	    } return join$1(result, '&');
	  },
	  update: function () {
	    this.entries.length = 0;
	    this.parseQuery(this.url.query);
	  },
	  updateURL: function () {
	    if (this.url) this.url.update();
	  }
	};

	// `URLSearchParams` constructor
	// https://url.spec.whatwg.org/#interface-urlsearchparams
	var URLSearchParamsConstructor = function URLSearchParams(/* init */) {
	  anInstance$1(this, URLSearchParamsPrototype$3);
	  var init = arguments.length > 0 ? arguments[0] : undefined;
	  var state = setInternalState$1(this, new URLSearchParamsState(init));
	  if (!DESCRIPTORS$2) this.size = state.entries.length;
	};

	var URLSearchParamsPrototype$3 = URLSearchParamsConstructor.prototype;

	defineBuiltIns(URLSearchParamsPrototype$3, {
	  // `URLSearchParams.prototype.append` method
	  // https://url.spec.whatwg.org/#dom-urlsearchparams-append
	  append: function append(name, value) {
	    var state = getInternalParamsState(this);
	    validateArgumentsLength$5(arguments.length, 2);
	    push$2(state.entries, { key: $toString$1(name), value: $toString$1(value) });
	    if (!DESCRIPTORS$2) this.length++;
	    state.updateURL();
	  },
	  // `URLSearchParams.prototype.delete` method
	  // https://url.spec.whatwg.org/#dom-urlsearchparams-delete
	  'delete': function (name /* , value */) {
	    var state = getInternalParamsState(this);
	    var length = validateArgumentsLength$5(arguments.length, 1);
	    var entries = state.entries;
	    var key = $toString$1(name);
	    var $value = length < 2 ? undefined : arguments[1];
	    var value = $value === undefined ? $value : $toString$1($value);
	    var index = 0;
	    while (index < entries.length) {
	      var entry = entries[index];
	      if (entry.key === key && (value === undefined || entry.value === value)) {
	        splice(entries, index, 1);
	        if (value !== undefined) break;
	      } else index++;
	    }
	    if (!DESCRIPTORS$2) this.size = entries.length;
	    state.updateURL();
	  },
	  // `URLSearchParams.prototype.get` method
	  // https://url.spec.whatwg.org/#dom-urlsearchparams-get
	  get: function get(name) {
	    var entries = getInternalParamsState(this).entries;
	    validateArgumentsLength$5(arguments.length, 1);
	    var key = $toString$1(name);
	    var index = 0;
	    for (; index < entries.length; index++) {
	      if (entries[index].key === key) return entries[index].value;
	    }
	    return null;
	  },
	  // `URLSearchParams.prototype.getAll` method
	  // https://url.spec.whatwg.org/#dom-urlsearchparams-getall
	  getAll: function getAll(name) {
	    var entries = getInternalParamsState(this).entries;
	    validateArgumentsLength$5(arguments.length, 1);
	    var key = $toString$1(name);
	    var result = [];
	    var index = 0;
	    for (; index < entries.length; index++) {
	      if (entries[index].key === key) push$2(result, entries[index].value);
	    }
	    return result;
	  },
	  // `URLSearchParams.prototype.has` method
	  // https://url.spec.whatwg.org/#dom-urlsearchparams-has
	  has: function has(name /* , value */) {
	    var entries = getInternalParamsState(this).entries;
	    var length = validateArgumentsLength$5(arguments.length, 1);
	    var key = $toString$1(name);
	    var $value = length < 2 ? undefined : arguments[1];
	    var value = $value === undefined ? $value : $toString$1($value);
	    var index = 0;
	    while (index < entries.length) {
	      var entry = entries[index++];
	      if (entry.key === key && (value === undefined || entry.value === value)) return true;
	    }
	    return false;
	  },
	  // `URLSearchParams.prototype.set` method
	  // https://url.spec.whatwg.org/#dom-urlsearchparams-set
	  set: function set(name, value) {
	    var state = getInternalParamsState(this);
	    validateArgumentsLength$5(arguments.length, 1);
	    var entries = state.entries;
	    var found = false;
	    var key = $toString$1(name);
	    var val = $toString$1(value);
	    var index = 0;
	    var entry;
	    for (; index < entries.length; index++) {
	      entry = entries[index];
	      if (entry.key === key) {
	        if (found) splice(entries, index--, 1);
	        else {
	          found = true;
	          entry.value = val;
	        }
	      }
	    }
	    if (!found) push$2(entries, { key: key, value: val });
	    if (!DESCRIPTORS$2) this.size = entries.length;
	    state.updateURL();
	  },
	  // `URLSearchParams.prototype.sort` method
	  // https://url.spec.whatwg.org/#dom-urlsearchparams-sort
	  sort: function sort() {
	    var state = getInternalParamsState(this);
	    arraySort(state.entries, function (a, b) {
	      return a.key > b.key ? 1 : -1;
	    });
	    state.updateURL();
	  },
	  // `URLSearchParams.prototype.forEach` method
	  forEach: function forEach(callback /* , thisArg */) {
	    var entries = getInternalParamsState(this).entries;
	    var boundFunction = bind$1(callback, arguments.length > 1 ? arguments[1] : undefined);
	    var index = 0;
	    var entry;
	    while (index < entries.length) {
	      entry = entries[index++];
	      boundFunction(entry.value, entry.key, this);
	    }
	  },
	  // `URLSearchParams.prototype.keys` method
	  keys: function keys() {
	    return new URLSearchParamsIterator(this, 'keys');
	  },
	  // `URLSearchParams.prototype.values` method
	  values: function values() {
	    return new URLSearchParamsIterator(this, 'values');
	  },
	  // `URLSearchParams.prototype.entries` method
	  entries: function entries() {
	    return new URLSearchParamsIterator(this, 'entries');
	  }
	}, { enumerable: true });

	// `URLSearchParams.prototype[@@iterator]` method
	defineBuiltIn$3(URLSearchParamsPrototype$3, ITERATOR, URLSearchParamsPrototype$3.entries, { name: 'entries' });

	// `URLSearchParams.prototype.toString` method
	// https://url.spec.whatwg.org/#urlsearchparams-stringification-behavior
	defineBuiltIn$3(URLSearchParamsPrototype$3, 'toString', function toString() {
	  return getInternalParamsState(this).serialize();
	}, { enumerable: true });

	// `URLSearchParams.prototype.size` getter
	// https://github.com/whatwg/url/pull/734
	if (DESCRIPTORS$2) defineBuiltInAccessor$2(URLSearchParamsPrototype$3, 'size', {
	  get: function size() {
	    return getInternalParamsState(this).entries.length;
	  },
	  configurable: true,
	  enumerable: true
	});

	setToStringTag$1(URLSearchParamsConstructor, URL_SEARCH_PARAMS);

	$$4({ global: true, constructor: true, forced: !USE_NATIVE_URL$3 }, {
	  URLSearchParams: URLSearchParamsConstructor
	});

	// Wrap `fetch` and `Request` for correct work with polyfilled `URLSearchParams`
	if (!USE_NATIVE_URL$3 && isCallable(Headers$1)) {
	  var headersHas = uncurryThis$4(HeadersPrototype.has);
	  var headersSet = uncurryThis$4(HeadersPrototype.set);

	  var wrapRequestOptions = function (init) {
	    if (isObject(init)) {
	      var body = init.body;
	      var headers;
	      if (classof(body) === URL_SEARCH_PARAMS) {
	        headers = init.headers ? new Headers$1(init.headers) : new Headers$1();
	        if (!headersHas(headers, 'content-type')) {
	          headersSet(headers, 'content-type', 'application/x-www-form-urlencoded;charset=UTF-8');
	        }
	        return create(init, {
	          body: createPropertyDescriptor(0, $toString$1(body)),
	          headers: createPropertyDescriptor(0, headers)
	        });
	      }
	    } return init;
	  };

	  if (isCallable(nativeFetch)) {
	    $$4({ global: true, enumerable: true, dontCallGetSet: true, forced: true }, {
	      fetch: function fetch(input /* , init */) {
	        return nativeFetch(input, arguments.length > 1 ? wrapRequestOptions(arguments[1]) : {});
	      }
	    });
	  }

	  if (isCallable(NativeRequest)) {
	    var RequestConstructor = function Request(input /* , init */) {
	      anInstance$1(this, RequestPrototype);
	      return new NativeRequest(input, arguments.length > 1 ? wrapRequestOptions(arguments[1]) : {});
	    };

	    RequestPrototype.constructor = RequestConstructor;
	    RequestConstructor.prototype = RequestPrototype;

	    $$4({ global: true, constructor: true, dontCallGetSet: true, forced: true }, {
	      Request: RequestConstructor
	    });
	  }
	}

	var web_urlSearchParams_constructor = {
	  URLSearchParams: URLSearchParamsConstructor,
	  getState: getInternalParamsState
	};

	// TODO: in core-js@4, move /modules/ dependencies to public entries for better optimization by tools like `preset-env`

	var $$3 = _export;
	var DESCRIPTORS$1 = descriptors;
	var USE_NATIVE_URL$2 = urlConstructorDetection;
	var globalThis$1 = globalThis_1;
	var bind = functionBindContext;
	var uncurryThis$3 = functionUncurryThis;
	var defineBuiltIn$2 = defineBuiltIn$t;
	var defineBuiltInAccessor$1 = defineBuiltInAccessor$l;
	var anInstance = anInstance$d;
	var hasOwn = hasOwnProperty_1;
	var assign = objectAssign;
	var arrayFrom = arrayFrom$1;
	var arraySlice = arraySlice$a;
	var codeAt = stringMultibyte.codeAt;
	var toASCII = stringPunycodeToAscii;
	var $toString = toString$D;
	var setToStringTag = setToStringTag$e;
	var validateArgumentsLength$4 = validateArgumentsLength$c;
	var URLSearchParamsModule = web_urlSearchParams_constructor;
	var InternalStateModule = internalState;

	var setInternalState = InternalStateModule.set;
	var getInternalURLState = InternalStateModule.getterFor('URL');
	var URLSearchParams$1 = URLSearchParamsModule.URLSearchParams;
	var getInternalSearchParamsState = URLSearchParamsModule.getState;

	var NativeURL = globalThis$1.URL;
	var TypeError$1 = globalThis$1.TypeError;
	var parseInt$1 = globalThis$1.parseInt;
	var floor = Math.floor;
	var pow = Math.pow;
	var charAt = uncurryThis$3(''.charAt);
	var exec = uncurryThis$3(/./.exec);
	var join = uncurryThis$3([].join);
	var numberToString = uncurryThis$3(1.1.toString);
	var pop = uncurryThis$3([].pop);
	var push$1 = uncurryThis$3([].push);
	var replace = uncurryThis$3(''.replace);
	var shift = uncurryThis$3([].shift);
	var split = uncurryThis$3(''.split);
	var stringSlice = uncurryThis$3(''.slice);
	var toLowerCase = uncurryThis$3(''.toLowerCase);
	var unshift = uncurryThis$3([].unshift);

	var INVALID_AUTHORITY = 'Invalid authority';
	var INVALID_SCHEME = 'Invalid scheme';
	var INVALID_HOST = 'Invalid host';
	var INVALID_PORT = 'Invalid port';

	var ALPHA = /[a-z]/i;
	// eslint-disable-next-line regexp/no-obscure-range -- safe
	var ALPHANUMERIC = /[\d+-.a-z]/i;
	var DIGIT = /\d/;
	var HEX_START = /^0x/i;
	var OCT = /^[0-7]+$/;
	var DEC = /^\d+$/;
	var HEX = /^[\da-f]+$/i;
	/* eslint-disable regexp/no-control-character -- safe */
	var FORBIDDEN_HOST_CODE_POINT = /[\0\t\n\r #%/:<>?@[\\\]^|]/;
	var FORBIDDEN_HOST_CODE_POINT_EXCLUDING_PERCENT = /[\0\t\n\r #/:<>?@[\\\]^|]/;
	var LEADING_C0_CONTROL_OR_SPACE = /^[\u0000-\u0020]+/;
	var TRAILING_C0_CONTROL_OR_SPACE = /(^|[^\u0000-\u0020])[\u0000-\u0020]+$/;
	var TAB_AND_NEW_LINE = /[\t\n\r]/g;
	/* eslint-enable regexp/no-control-character -- safe */
	// eslint-disable-next-line no-unassigned-vars -- expected `undefined` value
	var EOF;

	// https://url.spec.whatwg.org/#ipv4-number-parser
	var parseIPv4 = function (input) {
	  var parts = split(input, '.');
	  var partsLength, numbers, index, part, radix, number, ipv4;
	  if (parts.length && parts[parts.length - 1] === '') {
	    parts.length--;
	  }
	  partsLength = parts.length;
	  if (partsLength > 4) return input;
	  numbers = [];
	  for (index = 0; index < partsLength; index++) {
	    part = parts[index];
	    if (part === '') return input;
	    radix = 10;
	    if (part.length > 1 && charAt(part, 0) === '0') {
	      radix = exec(HEX_START, part) ? 16 : 8;
	      part = stringSlice(part, radix === 8 ? 1 : 2);
	    }
	    if (part === '') {
	      number = 0;
	    } else {
	      if (!exec(radix === 10 ? DEC : radix === 8 ? OCT : HEX, part)) return input;
	      number = parseInt$1(part, radix);
	    }
	    push$1(numbers, number);
	  }
	  for (index = 0; index < partsLength; index++) {
	    number = numbers[index];
	    if (index === partsLength - 1) {
	      if (number >= pow(256, 5 - partsLength)) return null;
	    } else if (number > 255) return null;
	  }
	  ipv4 = pop(numbers);
	  for (index = 0; index < numbers.length; index++) {
	    ipv4 += numbers[index] * pow(256, 3 - index);
	  }
	  return ipv4;
	};

	// https://url.spec.whatwg.org/#concept-ipv6-parser
	// eslint-disable-next-line max-statements -- TODO
	var parseIPv6 = function (input) {
	  var address = [0, 0, 0, 0, 0, 0, 0, 0];
	  var pieceIndex = 0;
	  var compress = null;
	  var pointer = 0;
	  var value, length, numbersSeen, ipv4Piece, number, swaps, swap;

	  var chr = function () {
	    return charAt(input, pointer);
	  };

	  if (chr() === ':') {
	    if (charAt(input, 1) !== ':') return;
	    pointer += 2;
	    pieceIndex++;
	    compress = pieceIndex;
	  }
	  while (chr()) {
	    if (pieceIndex === 8) return;
	    if (chr() === ':') {
	      if (compress !== null) return;
	      pointer++;
	      pieceIndex++;
	      compress = pieceIndex;
	      continue;
	    }
	    value = length = 0;
	    while (length < 4 && exec(HEX, chr())) {
	      value = value * 16 + parseInt$1(chr(), 16);
	      pointer++;
	      length++;
	    }
	    if (chr() === '.') {
	      if (length === 0) return;
	      pointer -= length;
	      if (pieceIndex > 6) return;
	      numbersSeen = 0;
	      while (chr()) {
	        ipv4Piece = null;
	        if (numbersSeen > 0) {
	          if (chr() === '.' && numbersSeen < 4) pointer++;
	          else return;
	        }
	        if (!exec(DIGIT, chr())) return;
	        while (exec(DIGIT, chr())) {
	          number = parseInt$1(chr(), 10);
	          if (ipv4Piece === null) ipv4Piece = number;
	          else if (ipv4Piece === 0) return;
	          else ipv4Piece = ipv4Piece * 10 + number;
	          if (ipv4Piece > 255) return;
	          pointer++;
	        }
	        address[pieceIndex] = address[pieceIndex] * 256 + ipv4Piece;
	        numbersSeen++;
	        if (numbersSeen === 2 || numbersSeen === 4) pieceIndex++;
	      }
	      if (numbersSeen !== 4) return;
	      break;
	    } else if (chr() === ':') {
	      pointer++;
	      if (!chr()) return;
	    } else if (chr()) return;
	    address[pieceIndex++] = value;
	  }
	  if (compress !== null) {
	    swaps = pieceIndex - compress;
	    pieceIndex = 7;
	    while (pieceIndex !== 0 && swaps > 0) {
	      swap = address[pieceIndex];
	      address[pieceIndex--] = address[compress + swaps - 1];
	      address[compress + --swaps] = swap;
	    }
	  } else if (pieceIndex !== 8) return;
	  return address;
	};

	var findLongestZeroSequence = function (ipv6) {
	  var maxIndex = null;
	  var maxLength = 1;
	  var currStart = null;
	  var currLength = 0;
	  var index = 0;
	  for (; index < 8; index++) {
	    if (ipv6[index] !== 0) {
	      if (currLength > maxLength) {
	        maxIndex = currStart;
	        maxLength = currLength;
	      }
	      currStart = null;
	      currLength = 0;
	    } else {
	      if (currStart === null) currStart = index;
	      ++currLength;
	    }
	  }
	  return currLength > maxLength ? currStart : maxIndex;
	};

	// https://url.spec.whatwg.org/#host-serializing
	var serializeHost = function (host) {
	  var result, index, compress, ignore0;

	  // ipv4
	  if (typeof host == 'number') {
	    result = [];
	    for (index = 0; index < 4; index++) {
	      unshift(result, host % 256);
	      host = floor(host / 256);
	    }
	    return join(result, '.');
	  }

	  // ipv6
	  if (typeof host == 'object') {
	    result = '';
	    compress = findLongestZeroSequence(host);
	    for (index = 0; index < 8; index++) {
	      if (ignore0 && host[index] === 0) continue;
	      if (ignore0) ignore0 = false;
	      if (compress === index) {
	        result += index ? ':' : '::';
	        ignore0 = true;
	      } else {
	        result += numberToString(host[index], 16);
	        if (index < 7) result += ':';
	      }
	    }
	    return '[' + result + ']';
	  }

	  return host;
	};

	var C0ControlPercentEncodeSet = {};
	var fragmentPercentEncodeSet = assign({}, C0ControlPercentEncodeSet, {
	  ' ': 1, '"': 1, '<': 1, '>': 1, '`': 1
	});
	var pathPercentEncodeSet = assign({}, fragmentPercentEncodeSet, {
	  '#': 1, '?': 1, '{': 1, '}': 1
	});
	var userinfoPercentEncodeSet = assign({}, pathPercentEncodeSet, {
	  '/': 1, ':': 1, ';': 1, '=': 1, '@': 1, '[': 1, '\\': 1, ']': 1, '^': 1, '|': 1
	});

	var percentEncode = function (chr, set) {
	  var code = codeAt(chr, 0);
	  return code > 0x20 && code < 0x7F && !hasOwn(set, chr) ? chr : encodeURIComponent(chr);
	};

	// https://url.spec.whatwg.org/#special-scheme
	var specialSchemes = {
	  ftp: 21,
	  file: null,
	  http: 80,
	  https: 443,
	  ws: 80,
	  wss: 443
	};

	// https://url.spec.whatwg.org/#windows-drive-letter
	var isWindowsDriveLetter = function (string, normalized) {
	  var second;
	  return string.length === 2 && exec(ALPHA, charAt(string, 0))
	    && ((second = charAt(string, 1)) === ':' || (!normalized && second === '|'));
	};

	// https://url.spec.whatwg.org/#start-with-a-windows-drive-letter
	var startsWithWindowsDriveLetter = function (string) {
	  var third;
	  return string.length > 1 && isWindowsDriveLetter(stringSlice(string, 0, 2)) && (
	    string.length === 2 ||
	    ((third = charAt(string, 2)) === '/' || third === '\\' || third === '?' || third === '#')
	  );
	};

	// https://url.spec.whatwg.org/#single-dot-path-segment
	var isSingleDot = function (segment) {
	  return segment === '.' || toLowerCase(segment) === '%2e';
	};

	// https://url.spec.whatwg.org/#double-dot-path-segment
	var isDoubleDot = function (segment) {
	  segment = toLowerCase(segment);
	  return segment === '..' || segment === '%2e.' || segment === '.%2e' || segment === '%2e%2e';
	};

	// States:
	var SCHEME_START = {};
	var SCHEME = {};
	var NO_SCHEME = {};
	var SPECIAL_RELATIVE_OR_AUTHORITY = {};
	var PATH_OR_AUTHORITY = {};
	var RELATIVE = {};
	var RELATIVE_SLASH = {};
	var SPECIAL_AUTHORITY_SLASHES = {};
	var SPECIAL_AUTHORITY_IGNORE_SLASHES = {};
	var AUTHORITY = {};
	var HOST = {};
	var HOSTNAME = {};
	var PORT = {};
	var FILE = {};
	var FILE_SLASH = {};
	var FILE_HOST = {};
	var PATH_START = {};
	var PATH = {};
	var CANNOT_BE_A_BASE_URL_PATH = {};
	var QUERY = {};
	var FRAGMENT = {};

	var URLState = function (url, isBase, base) {
	  var urlString = $toString(url);
	  var baseState, failure, searchParams;
	  if (isBase) {
	    failure = this.parse(urlString);
	    if (failure) throw new TypeError$1(failure);
	    this.searchParams = null;
	  } else {
	    if (base !== undefined) baseState = new URLState(base, true);
	    failure = this.parse(urlString, null, baseState);
	    if (failure) throw new TypeError$1(failure);
	    searchParams = getInternalSearchParamsState(new URLSearchParams$1());
	    searchParams.bindURL(this);
	    this.searchParams = searchParams;
	  }
	};

	URLState.prototype = {
	  type: 'URL',
	  // https://url.spec.whatwg.org/#url-parsing
	  // eslint-disable-next-line max-statements -- TODO
	  parse: function (input, stateOverride, base) {
	    var url = this;
	    var state = stateOverride || SCHEME_START;
	    var pointer = 0;
	    var buffer = '';
	    var seenAt = false;
	    var seenBracket = false;
	    var seenPasswordToken = false;
	    var codePoints, chr, bufferCodePoints, failure;

	    input = $toString(input);

	    if (!stateOverride) {
	      url.scheme = '';
	      url.username = '';
	      url.password = '';
	      url.host = null;
	      url.port = null;
	      url.path = [];
	      url.query = null;
	      url.fragment = null;
	      url.cannotBeABaseURL = false;
	      input = replace(input, LEADING_C0_CONTROL_OR_SPACE, '');
	      input = replace(input, TRAILING_C0_CONTROL_OR_SPACE, '$1');
	    }

	    input = replace(input, TAB_AND_NEW_LINE, '');

	    codePoints = arrayFrom(input);

	    while (pointer <= codePoints.length) {
	      chr = codePoints[pointer];
	      switch (state) {
	        case SCHEME_START:
	          if (chr && exec(ALPHA, chr)) {
	            buffer += toLowerCase(chr);
	            state = SCHEME;
	          } else if (!stateOverride) {
	            state = NO_SCHEME;
	            continue;
	          } else return INVALID_SCHEME;
	          break;

	        case SCHEME:
	          if (chr && (exec(ALPHANUMERIC, chr) || chr === '+' || chr === '-' || chr === '.')) {
	            buffer += toLowerCase(chr);
	          } else if (chr === ':') {
	            if (stateOverride && (
	              (url.isSpecial() !== hasOwn(specialSchemes, buffer)) ||
	              (buffer === 'file' && (url.includesCredentials() || url.port !== null)) ||
	              (url.scheme === 'file' && !url.host)
	            )) return;
	            url.scheme = buffer;
	            if (stateOverride) {
	              if (url.isSpecial() && specialSchemes[url.scheme] === url.port) url.port = null;
	              return;
	            }
	            buffer = '';
	            if (url.scheme === 'file') {
	              state = FILE;
	            } else if (url.isSpecial() && base && base.scheme === url.scheme) {
	              state = SPECIAL_RELATIVE_OR_AUTHORITY;
	            } else if (url.isSpecial()) {
	              state = SPECIAL_AUTHORITY_SLASHES;
	            } else if (codePoints[pointer + 1] === '/') {
	              state = PATH_OR_AUTHORITY;
	              pointer++;
	            } else {
	              url.cannotBeABaseURL = true;
	              push$1(url.path, '');
	              state = CANNOT_BE_A_BASE_URL_PATH;
	            }
	          } else if (!stateOverride) {
	            buffer = '';
	            state = NO_SCHEME;
	            pointer = 0;
	            continue;
	          } else return INVALID_SCHEME;
	          break;

	        case NO_SCHEME:
	          if (!base || (base.cannotBeABaseURL && chr !== '#')) return INVALID_SCHEME;
	          if (base.cannotBeABaseURL && chr === '#') {
	            url.scheme = base.scheme;
	            url.path = arraySlice(base.path);
	            url.query = base.query;
	            url.fragment = '';
	            url.cannotBeABaseURL = true;
	            state = FRAGMENT;
	            break;
	          }
	          state = base.scheme === 'file' ? FILE : RELATIVE;
	          continue;

	        case SPECIAL_RELATIVE_OR_AUTHORITY:
	          if (chr === '/' && codePoints[pointer + 1] === '/') {
	            state = SPECIAL_AUTHORITY_IGNORE_SLASHES;
	            pointer++;
	          } else {
	            state = RELATIVE;
	            continue;
	          } break;

	        case PATH_OR_AUTHORITY:
	          if (chr === '/') {
	            state = AUTHORITY;
	            break;
	          } else {
	            state = PATH;
	            continue;
	          }

	        case RELATIVE:
	          url.scheme = base.scheme;
	          if (chr === EOF) {
	            url.username = base.username;
	            url.password = base.password;
	            url.host = base.host;
	            url.port = base.port;
	            url.path = arraySlice(base.path);
	            url.query = base.query;
	          } else if (chr === '/' || (chr === '\\' && url.isSpecial())) {
	            state = RELATIVE_SLASH;
	          } else if (chr === '?') {
	            url.username = base.username;
	            url.password = base.password;
	            url.host = base.host;
	            url.port = base.port;
	            url.path = arraySlice(base.path);
	            url.query = '';
	            state = QUERY;
	          } else if (chr === '#') {
	            url.username = base.username;
	            url.password = base.password;
	            url.host = base.host;
	            url.port = base.port;
	            url.path = arraySlice(base.path);
	            url.query = base.query;
	            url.fragment = '';
	            state = FRAGMENT;
	          } else {
	            url.username = base.username;
	            url.password = base.password;
	            url.host = base.host;
	            url.port = base.port;
	            url.path = arraySlice(base.path);
	            url.path.length--;
	            state = PATH;
	            continue;
	          } break;

	        case RELATIVE_SLASH:
	          if (url.isSpecial() && (chr === '/' || chr === '\\')) {
	            state = SPECIAL_AUTHORITY_IGNORE_SLASHES;
	          } else if (chr === '/') {
	            state = AUTHORITY;
	          } else {
	            url.username = base.username;
	            url.password = base.password;
	            url.host = base.host;
	            url.port = base.port;
	            state = PATH;
	            continue;
	          } break;

	        case SPECIAL_AUTHORITY_SLASHES:
	          state = SPECIAL_AUTHORITY_IGNORE_SLASHES;
	          if (chr !== '/' || charAt(buffer, pointer + 1) !== '/') continue;
	          pointer++;
	          break;

	        case SPECIAL_AUTHORITY_IGNORE_SLASHES:
	          if (chr !== '/' && chr !== '\\') {
	            state = AUTHORITY;
	            continue;
	          } break;

	        case AUTHORITY:
	          if (chr === '@') {
	            if (seenAt) buffer = '%40' + buffer;
	            seenAt = true;
	            bufferCodePoints = arrayFrom(buffer);
	            for (var i = 0; i < bufferCodePoints.length; i++) {
	              var codePoint = bufferCodePoints[i];
	              if (codePoint === ':' && !seenPasswordToken) {
	                seenPasswordToken = true;
	                continue;
	              }
	              var encodedCodePoints = percentEncode(codePoint, userinfoPercentEncodeSet);
	              if (seenPasswordToken) url.password += encodedCodePoints;
	              else url.username += encodedCodePoints;
	            }
	            buffer = '';
	          } else if (
	            chr === EOF || chr === '/' || chr === '?' || chr === '#' ||
	            (chr === '\\' && url.isSpecial())
	          ) {
	            if (seenAt && buffer === '') return INVALID_AUTHORITY;
	            pointer -= arrayFrom(buffer).length + 1;
	            buffer = '';
	            state = HOST;
	          } else buffer += chr;
	          break;

	        case HOST:
	        case HOSTNAME:
	          if (stateOverride && url.scheme === 'file') {
	            state = FILE_HOST;
	            continue;
	          } else if (chr === ':' && !seenBracket) {
	            if (buffer === '') return INVALID_HOST;
	            failure = url.parseHost(buffer);
	            if (failure) return failure;
	            buffer = '';
	            state = PORT;
	            if (stateOverride === HOSTNAME) return;
	          } else if (
	            chr === EOF || chr === '/' || chr === '?' || chr === '#' ||
	            (chr === '\\' && url.isSpecial())
	          ) {
	            if (url.isSpecial() && buffer === '') return INVALID_HOST;
	            if (stateOverride && buffer === '' && (url.includesCredentials() || url.port !== null)) return;
	            failure = url.parseHost(buffer);
	            if (failure) return failure;
	            buffer = '';
	            state = PATH_START;
	            if (stateOverride) return;
	            continue;
	          } else {
	            if (chr === '[') seenBracket = true;
	            else if (chr === ']') seenBracket = false;
	            buffer += chr;
	          } break;

	        case PORT:
	          if (exec(DIGIT, chr)) {
	            buffer += chr;
	          } else if (
	            chr === EOF || chr === '/' || chr === '?' || chr === '#' ||
	            (chr === '\\' && url.isSpecial()) ||
	            stateOverride
	          ) {
	            if (buffer !== '') {
	              var port = parseInt$1(buffer, 10);
	              if (port > 0xFFFF) return INVALID_PORT;
	              url.port = (url.isSpecial() && port === specialSchemes[url.scheme]) ? null : port;
	              buffer = '';
	            }
	            if (stateOverride) return;
	            state = PATH_START;
	            continue;
	          } else return INVALID_PORT;
	          break;

	        case FILE:
	          url.scheme = 'file';
	          if (chr === '/' || chr === '\\') state = FILE_SLASH;
	          else if (base && base.scheme === 'file') {
	            switch (chr) {
	              case EOF:
	                url.host = base.host;
	                url.path = arraySlice(base.path);
	                url.query = base.query;
	                break;
	              case '?':
	                url.host = base.host;
	                url.path = arraySlice(base.path);
	                url.query = '';
	                state = QUERY;
	                break;
	              case '#':
	                url.host = base.host;
	                url.path = arraySlice(base.path);
	                url.query = base.query;
	                url.fragment = '';
	                state = FRAGMENT;
	                break;
	              default:
	                if (!startsWithWindowsDriveLetter(join(arraySlice(codePoints, pointer), ''))) {
	                  url.host = base.host;
	                  url.path = arraySlice(base.path);
	                  url.shortenPath();
	                }
	                state = PATH;
	                continue;
	            }
	          } else {
	            state = PATH;
	            continue;
	          } break;

	        case FILE_SLASH:
	          if (chr === '/' || chr === '\\') {
	            state = FILE_HOST;
	            break;
	          }
	          if (base && base.scheme === 'file' && !startsWithWindowsDriveLetter(join(arraySlice(codePoints, pointer), ''))) {
	            if (isWindowsDriveLetter(base.path[0], true)) push$1(url.path, base.path[0]);
	            else url.host = base.host;
	          }
	          state = PATH;
	          continue;

	        case FILE_HOST:
	          if (chr === EOF || chr === '/' || chr === '\\' || chr === '?' || chr === '#') {
	            if (!stateOverride && isWindowsDriveLetter(buffer)) {
	              state = PATH;
	            } else if (buffer === '') {
	              url.host = '';
	              if (stateOverride) return;
	              state = PATH_START;
	            } else {
	              failure = url.parseHost(buffer);
	              if (failure) return failure;
	              if (url.host === 'localhost') url.host = '';
	              if (stateOverride) return;
	              buffer = '';
	              state = PATH_START;
	            } continue;
	          } else buffer += chr;
	          break;

	        case PATH_START:
	          if (url.isSpecial()) {
	            state = PATH;
	            if (chr !== '/' && chr !== '\\') continue;
	          } else if (!stateOverride && chr === '?') {
	            url.query = '';
	            state = QUERY;
	          } else if (!stateOverride && chr === '#') {
	            url.fragment = '';
	            state = FRAGMENT;
	          } else if (chr !== EOF) {
	            state = PATH;
	            if (chr !== '/') continue;
	          } break;

	        case PATH:
	          if (
	            chr === EOF || chr === '/' ||
	            (chr === '\\' && url.isSpecial()) ||
	            (!stateOverride && (chr === '?' || chr === '#'))
	          ) {
	            if (isDoubleDot(buffer)) {
	              url.shortenPath();
	              if (chr !== '/' && !(chr === '\\' && url.isSpecial())) {
	                push$1(url.path, '');
	              }
	            } else if (isSingleDot(buffer)) {
	              if (chr !== '/' && !(chr === '\\' && url.isSpecial())) {
	                push$1(url.path, '');
	              }
	            } else {
	              if (url.scheme === 'file' && !url.path.length && isWindowsDriveLetter(buffer)) {
	                if (url.host) url.host = '';
	                buffer = charAt(buffer, 0) + ':'; // normalize windows drive letter
	              }
	              push$1(url.path, buffer);
	            }
	            buffer = '';
	            if (url.scheme === 'file' && (chr === EOF || chr === '?' || chr === '#')) {
	              while (url.path.length > 1 && url.path[0] === '') {
	                shift(url.path);
	              }
	            }
	            if (chr === '?') {
	              url.query = '';
	              state = QUERY;
	            } else if (chr === '#') {
	              url.fragment = '';
	              state = FRAGMENT;
	            }
	          } else {
	            buffer += percentEncode(chr, pathPercentEncodeSet);
	          } break;

	        case CANNOT_BE_A_BASE_URL_PATH:
	          if (chr === '?') {
	            url.query = '';
	            state = QUERY;
	          } else if (chr === '#') {
	            url.fragment = '';
	            state = FRAGMENT;
	          } else if (chr !== EOF) {
	            url.path[0] += percentEncode(chr, C0ControlPercentEncodeSet);
	          } break;

	        case QUERY:
	          if (!stateOverride && chr === '#') {
	            url.fragment = '';
	            state = FRAGMENT;
	          } else if (chr !== EOF) {
	            if (chr === "'" && url.isSpecial()) url.query += '%27';
	            else if (chr === '#') url.query += '%23';
	            else url.query += percentEncode(chr, C0ControlPercentEncodeSet);
	          } break;

	        case FRAGMENT:
	          if (chr !== EOF) url.fragment += percentEncode(chr, fragmentPercentEncodeSet);
	          break;
	      }

	      pointer++;
	    }
	  },
	  // https://url.spec.whatwg.org/#host-parsing
	  parseHost: function (input) {
	    var result, codePoints, index;
	    if (charAt(input, 0) === '[') {
	      if (charAt(input, input.length - 1) !== ']') return INVALID_HOST;
	      result = parseIPv6(stringSlice(input, 1, -1));
	      if (!result) return INVALID_HOST;
	      this.host = result;
	    // opaque host
	    } else if (!this.isSpecial()) {
	      if (exec(FORBIDDEN_HOST_CODE_POINT_EXCLUDING_PERCENT, input)) return INVALID_HOST;
	      result = '';
	      codePoints = arrayFrom(input);
	      for (index = 0; index < codePoints.length; index++) {
	        result += percentEncode(codePoints[index], C0ControlPercentEncodeSet);
	      }
	      this.host = result;
	    } else {
	      input = toASCII(input);
	      if (exec(FORBIDDEN_HOST_CODE_POINT, input)) return INVALID_HOST;
	      result = parseIPv4(input);
	      if (result === null) return INVALID_HOST;
	      this.host = result;
	    }
	  },
	  // https://url.spec.whatwg.org/#cannot-have-a-username-password-port
	  cannotHaveUsernamePasswordPort: function () {
	    return !this.host || this.cannotBeABaseURL || this.scheme === 'file';
	  },
	  // https://url.spec.whatwg.org/#include-credentials
	  includesCredentials: function () {
	    return this.username !== '' || this.password !== '';
	  },
	  // https://url.spec.whatwg.org/#is-special
	  isSpecial: function () {
	    return hasOwn(specialSchemes, this.scheme);
	  },
	  // https://url.spec.whatwg.org/#shorten-a-urls-path
	  shortenPath: function () {
	    var path = this.path;
	    var pathSize = path.length;
	    if (pathSize && (this.scheme !== 'file' || pathSize !== 1 || !isWindowsDriveLetter(path[0], true))) {
	      path.length--;
	    }
	  },
	  // https://url.spec.whatwg.org/#concept-url-serializer
	  serialize: function () {
	    var url = this;
	    var scheme = url.scheme;
	    var username = url.username;
	    var password = url.password;
	    var host = url.host;
	    var port = url.port;
	    var path = url.path;
	    var query = url.query;
	    var fragment = url.fragment;
	    var output = scheme + ':';
	    if (host !== null) {
	      output += '//';
	      if (url.includesCredentials()) {
	        output += username + (password ? ':' + password : '') + '@';
	      }
	      output += serializeHost(host);
	      if (port !== null) output += ':' + port;
	    } else if (scheme === 'file') output += '//';
	    output += url.cannotBeABaseURL ? path[0] : path.length ? '/' + join(path, '/') : '';
	    if (query !== null) output += '?' + query;
	    if (fragment !== null) output += '#' + fragment;
	    return output;
	  },
	  // https://url.spec.whatwg.org/#dom-url-href
	  setHref: function (href) {
	    var failure = this.parse(href);
	    if (failure) throw new TypeError$1(failure);
	    this.searchParams.update();
	  },
	  // https://url.spec.whatwg.org/#dom-url-origin
	  getOrigin: function () {
	    var scheme = this.scheme;
	    var port = this.port;
	    if (scheme === 'blob') try {
	      return new URLConstructor(scheme.path[0]).origin;
	    } catch (error) {
	      return 'null';
	    }
	    if (scheme === 'file' || !this.isSpecial()) return 'null';
	    return scheme + '://' + serializeHost(this.host) + (port !== null ? ':' + port : '');
	  },
	  // https://url.spec.whatwg.org/#dom-url-protocol
	  getProtocol: function () {
	    return this.scheme + ':';
	  },
	  setProtocol: function (protocol) {
	    this.parse($toString(protocol) + ':', SCHEME_START);
	  },
	  // https://url.spec.whatwg.org/#dom-url-username
	  getUsername: function () {
	    return this.username;
	  },
	  setUsername: function (username) {
	    var codePoints = arrayFrom($toString(username));
	    if (this.cannotHaveUsernamePasswordPort()) return;
	    this.username = '';
	    for (var i = 0; i < codePoints.length; i++) {
	      this.username += percentEncode(codePoints[i], userinfoPercentEncodeSet);
	    }
	  },
	  // https://url.spec.whatwg.org/#dom-url-password
	  getPassword: function () {
	    return this.password;
	  },
	  setPassword: function (password) {
	    var codePoints = arrayFrom($toString(password));
	    if (this.cannotHaveUsernamePasswordPort()) return;
	    this.password = '';
	    for (var i = 0; i < codePoints.length; i++) {
	      this.password += percentEncode(codePoints[i], userinfoPercentEncodeSet);
	    }
	  },
	  // https://url.spec.whatwg.org/#dom-url-host
	  getHost: function () {
	    var host = this.host;
	    var port = this.port;
	    return host === null ? ''
	      : port === null ? serializeHost(host)
	      : serializeHost(host) + ':' + port;
	  },
	  setHost: function (host) {
	    if (this.cannotBeABaseURL) return;
	    this.parse(host, HOST);
	  },
	  // https://url.spec.whatwg.org/#dom-url-hostname
	  getHostname: function () {
	    var host = this.host;
	    return host === null ? '' : serializeHost(host);
	  },
	  setHostname: function (hostname) {
	    if (this.cannotBeABaseURL) return;
	    this.parse(hostname, HOSTNAME);
	  },
	  // https://url.spec.whatwg.org/#dom-url-port
	  getPort: function () {
	    var port = this.port;
	    return port === null ? '' : $toString(port);
	  },
	  setPort: function (port) {
	    if (this.cannotHaveUsernamePasswordPort()) return;
	    port = $toString(port);
	    if (port === '') this.port = null;
	    else this.parse(port, PORT);
	  },
	  // https://url.spec.whatwg.org/#dom-url-pathname
	  getPathname: function () {
	    var path = this.path;
	    return this.cannotBeABaseURL ? path[0] : path.length ? '/' + join(path, '/') : '';
	  },
	  setPathname: function (pathname) {
	    if (this.cannotBeABaseURL) return;
	    this.path = [];
	    this.parse(pathname, PATH_START);
	  },
	  // https://url.spec.whatwg.org/#dom-url-search
	  getSearch: function () {
	    var query = this.query;
	    return query ? '?' + query : '';
	  },
	  setSearch: function (search) {
	    search = $toString(search);
	    if (search === '') {
	      this.query = null;
	    } else {
	      if (charAt(search, 0) === '?') search = stringSlice(search, 1);
	      this.query = '';
	      this.parse(search, QUERY);
	    }
	    this.searchParams.update();
	  },
	  // https://url.spec.whatwg.org/#dom-url-searchparams
	  getSearchParams: function () {
	    return this.searchParams.facade;
	  },
	  // https://url.spec.whatwg.org/#dom-url-hash
	  getHash: function () {
	    var fragment = this.fragment;
	    return fragment ? '#' + fragment : '';
	  },
	  setHash: function (hash) {
	    hash = $toString(hash);
	    if (hash === '') {
	      this.fragment = null;
	      return;
	    }
	    if (charAt(hash, 0) === '#') hash = stringSlice(hash, 1);
	    this.fragment = '';
	    this.parse(hash, FRAGMENT);
	  },
	  update: function () {
	    this.query = this.searchParams.serialize() || null;
	  }
	};

	// `URL` constructor
	// https://url.spec.whatwg.org/#url-class
	var URLConstructor = function URL(url /* , base */) {
	  var that = anInstance(this, URLPrototype);
	  var base = validateArgumentsLength$4(arguments.length, 1) > 1 ? arguments[1] : undefined;
	  var state = setInternalState(that, new URLState(url, false, base));
	  if (!DESCRIPTORS$1) {
	    that.href = state.serialize();
	    that.origin = state.getOrigin();
	    that.protocol = state.getProtocol();
	    that.username = state.getUsername();
	    that.password = state.getPassword();
	    that.host = state.getHost();
	    that.hostname = state.getHostname();
	    that.port = state.getPort();
	    that.pathname = state.getPathname();
	    that.search = state.getSearch();
	    that.searchParams = state.getSearchParams();
	    that.hash = state.getHash();
	  }
	};

	var URLPrototype = URLConstructor.prototype;

	var accessorDescriptor = function (getter, setter) {
	  return {
	    get: function () {
	      return getInternalURLState(this)[getter]();
	    },
	    set: setter && function (value) {
	      return getInternalURLState(this)[setter](value);
	    },
	    configurable: true,
	    enumerable: true
	  };
	};

	if (DESCRIPTORS$1) {
	  // `URL.prototype.href` accessors pair
	  // https://url.spec.whatwg.org/#dom-url-href
	  defineBuiltInAccessor$1(URLPrototype, 'href', accessorDescriptor('serialize', 'setHref'));
	  // `URL.prototype.origin` getter
	  // https://url.spec.whatwg.org/#dom-url-origin
	  defineBuiltInAccessor$1(URLPrototype, 'origin', accessorDescriptor('getOrigin'));
	  // `URL.prototype.protocol` accessors pair
	  // https://url.spec.whatwg.org/#dom-url-protocol
	  defineBuiltInAccessor$1(URLPrototype, 'protocol', accessorDescriptor('getProtocol', 'setProtocol'));
	  // `URL.prototype.username` accessors pair
	  // https://url.spec.whatwg.org/#dom-url-username
	  defineBuiltInAccessor$1(URLPrototype, 'username', accessorDescriptor('getUsername', 'setUsername'));
	  // `URL.prototype.password` accessors pair
	  // https://url.spec.whatwg.org/#dom-url-password
	  defineBuiltInAccessor$1(URLPrototype, 'password', accessorDescriptor('getPassword', 'setPassword'));
	  // `URL.prototype.host` accessors pair
	  // https://url.spec.whatwg.org/#dom-url-host
	  defineBuiltInAccessor$1(URLPrototype, 'host', accessorDescriptor('getHost', 'setHost'));
	  // `URL.prototype.hostname` accessors pair
	  // https://url.spec.whatwg.org/#dom-url-hostname
	  defineBuiltInAccessor$1(URLPrototype, 'hostname', accessorDescriptor('getHostname', 'setHostname'));
	  // `URL.prototype.port` accessors pair
	  // https://url.spec.whatwg.org/#dom-url-port
	  defineBuiltInAccessor$1(URLPrototype, 'port', accessorDescriptor('getPort', 'setPort'));
	  // `URL.prototype.pathname` accessors pair
	  // https://url.spec.whatwg.org/#dom-url-pathname
	  defineBuiltInAccessor$1(URLPrototype, 'pathname', accessorDescriptor('getPathname', 'setPathname'));
	  // `URL.prototype.search` accessors pair
	  // https://url.spec.whatwg.org/#dom-url-search
	  defineBuiltInAccessor$1(URLPrototype, 'search', accessorDescriptor('getSearch', 'setSearch'));
	  // `URL.prototype.searchParams` getter
	  // https://url.spec.whatwg.org/#dom-url-searchparams
	  defineBuiltInAccessor$1(URLPrototype, 'searchParams', accessorDescriptor('getSearchParams'));
	  // `URL.prototype.hash` accessors pair
	  // https://url.spec.whatwg.org/#dom-url-hash
	  defineBuiltInAccessor$1(URLPrototype, 'hash', accessorDescriptor('getHash', 'setHash'));
	}

	// `URL.prototype.toJSON` method
	// https://url.spec.whatwg.org/#dom-url-tojson
	defineBuiltIn$2(URLPrototype, 'toJSON', function toJSON() {
	  return getInternalURLState(this).serialize();
	}, { enumerable: true });

	// `URL.prototype.toString` method
	// https://url.spec.whatwg.org/#URL-stringification-behavior
	defineBuiltIn$2(URLPrototype, 'toString', function toString() {
	  return getInternalURLState(this).serialize();
	}, { enumerable: true });

	if (NativeURL) {
	  var nativeCreateObjectURL = NativeURL.createObjectURL;
	  var nativeRevokeObjectURL = NativeURL.revokeObjectURL;
	  // `URL.createObjectURL` method
	  // https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL
	  if (nativeCreateObjectURL) defineBuiltIn$2(URLConstructor, 'createObjectURL', bind(nativeCreateObjectURL, NativeURL));
	  // `URL.revokeObjectURL` method
	  // https://developer.mozilla.org/en-US/docs/Web/API/URL/revokeObjectURL
	  if (nativeRevokeObjectURL) defineBuiltIn$2(URLConstructor, 'revokeObjectURL', bind(nativeRevokeObjectURL, NativeURL));
	}

	setToStringTag(URLConstructor, 'URL');

	$$3({ global: true, constructor: true, forced: !USE_NATIVE_URL$2, sham: !DESCRIPTORS$1 }, {
	  URL: URLConstructor
	});

	var $$2 = _export;
	var getBuiltIn$1 = getBuiltIn$B;
	var fails = fails$1z;
	var validateArgumentsLength$3 = validateArgumentsLength$c;
	var toString$3 = toString$D;
	var USE_NATIVE_URL$1 = urlConstructorDetection;

	var URL$2 = getBuiltIn$1('URL');

	// https://github.com/nodejs/node/issues/47505
	// https://github.com/denoland/deno/issues/18893
	var THROWS_WITHOUT_ARGUMENTS = USE_NATIVE_URL$1 && fails(function () {
	  URL$2.canParse();
	});

	// Bun ~ 1.0.30 bug
	// https://github.com/oven-sh/bun/issues/9250
	var WRONG_ARITY = fails(function () {
	  return URL$2.canParse.length !== 1;
	});

	// `URL.canParse` method
	// https://url.spec.whatwg.org/#dom-url-canparse
	$$2({ target: 'URL', stat: true, forced: !THROWS_WITHOUT_ARGUMENTS || WRONG_ARITY }, {
	  canParse: function canParse(url) {
	    var length = validateArgumentsLength$3(arguments.length, 1);
	    var urlString = toString$3(url);
	    var base = length < 2 || arguments[1] === undefined ? undefined : toString$3(arguments[1]);
	    try {
	      return !!new URL$2(urlString, base);
	    } catch (error) {
	      return false;
	    }
	  }
	});

	var $$1 = _export;
	var getBuiltIn = getBuiltIn$B;
	var validateArgumentsLength$2 = validateArgumentsLength$c;
	var toString$2 = toString$D;
	var USE_NATIVE_URL = urlConstructorDetection;

	var URL$1 = getBuiltIn('URL');

	// `URL.parse` method
	// https://url.spec.whatwg.org/#dom-url-canparse
	$$1({ target: 'URL', stat: true, forced: !USE_NATIVE_URL }, {
	  parse: function parse(url) {
	    var length = validateArgumentsLength$2(arguments.length, 1);
	    var urlString = toString$2(url);
	    var base = length < 2 || arguments[1] === undefined ? undefined : toString$2(arguments[1]);
	    try {
	      return new URL$1(urlString, base);
	    } catch (error) {
	      return null;
	    }
	  }
	});

	var $ = _export;
	var call = functionCall;

	// `URL.prototype.toJSON` method
	// https://url.spec.whatwg.org/#dom-url-tojson
	$({ target: 'URL', proto: true, enumerable: true }, {
	  toJSON: function toJSON() {
	    return call(URL.prototype.toString, this);
	  }
	});

	var defineBuiltIn$1 = defineBuiltIn$t;
	var uncurryThis$2 = functionUncurryThis;
	var toString$1 = toString$D;
	var validateArgumentsLength$1 = validateArgumentsLength$c;

	var $URLSearchParams$1 = URLSearchParams;
	var URLSearchParamsPrototype$2 = $URLSearchParams$1.prototype;
	var append = uncurryThis$2(URLSearchParamsPrototype$2.append);
	var $delete = uncurryThis$2(URLSearchParamsPrototype$2['delete']);
	var forEach$1 = uncurryThis$2(URLSearchParamsPrototype$2.forEach);
	var push = uncurryThis$2([].push);
	var params$1 = new $URLSearchParams$1('a=1&a=2&b=3');

	params$1['delete']('a', 1);
	// `undefined` case is a Chromium 117 bug
	// https://bugs.chromium.org/p/v8/issues/detail?id=14222
	params$1['delete']('b', undefined);

	if (params$1 + '' !== 'a=2') {
	  defineBuiltIn$1(URLSearchParamsPrototype$2, 'delete', function (name /* , value */) {
	    var length = arguments.length;
	    var $value = length < 2 ? undefined : arguments[1];
	    if (length && $value === undefined) return $delete(this, name);
	    var entries = [];
	    forEach$1(this, function (v, k) { // also validates `this`
	      push(entries, { key: k, value: v });
	    });
	    validateArgumentsLength$1(length, 1);
	    var key = toString$1(name);
	    var value = toString$1($value);
	    var index = 0;
	    var dindex = 0;
	    var found = false;
	    var entriesLength = entries.length;
	    var entry;
	    while (index < entriesLength) {
	      entry = entries[index++];
	      if (found || entry.key === key) {
	        found = true;
	        $delete(this, entry.key);
	      } else dindex++;
	    }
	    while (dindex < entriesLength) {
	      entry = entries[dindex++];
	      if (!(entry.key === key && entry.value === value)) append(this, entry.key, entry.value);
	    }
	  }, { enumerable: true, unsafe: true });
	}

	var defineBuiltIn = defineBuiltIn$t;
	var uncurryThis$1 = functionUncurryThis;
	var toString = toString$D;
	var validateArgumentsLength = validateArgumentsLength$c;

	var $URLSearchParams = URLSearchParams;
	var URLSearchParamsPrototype$1 = $URLSearchParams.prototype;
	var getAll = uncurryThis$1(URLSearchParamsPrototype$1.getAll);
	var $has = uncurryThis$1(URLSearchParamsPrototype$1.has);
	var params = new $URLSearchParams('a=1');

	// `undefined` case is a Chromium 117 bug
	// https://bugs.chromium.org/p/v8/issues/detail?id=14222
	if (params.has('a', 2) || !params.has('a', undefined)) {
	  defineBuiltIn(URLSearchParamsPrototype$1, 'has', function has(name /* , value */) {
	    var length = arguments.length;
	    var $value = length < 2 ? undefined : arguments[1];
	    if (length && $value === undefined) return $has(this, name);
	    var values = getAll(this, name); // also validates `this`
	    validateArgumentsLength(length, 1);
	    var value = toString($value);
	    var index = 0;
	    while (index < values.length) {
	      if (values[index++] === value) return true;
	    } return false;
	  }, { enumerable: true, unsafe: true });
	}

	var DESCRIPTORS = descriptors;
	var uncurryThis = functionUncurryThis;
	var defineBuiltInAccessor = defineBuiltInAccessor$l;

	var URLSearchParamsPrototype = URLSearchParams.prototype;
	var forEach = uncurryThis(URLSearchParamsPrototype.forEach);

	// `URLSearchParams.prototype.size` getter
	// https://github.com/whatwg/url/pull/734
	if (DESCRIPTORS && !('size' in URLSearchParamsPrototype)) {
	  defineBuiltInAccessor(URLSearchParamsPrototype, 'size', {
	    get: function size() {
	      var count = 0;
	      forEach(this, function () { count++; });
	      return count;
	    },
	    configurable: true,
	    enumerable: true
	  });
	}

	var runtime = {exports: {}};

	/**
	 * Copyright (c) 2014-present, Facebook, Inc.
	 *
	 * This source code is licensed under the MIT license found in the
	 * LICENSE file in the root directory of this source tree.
	 */

	(function (module) {
		var runtime = (function (exports) {

		  var Op = Object.prototype;
		  var hasOwn = Op.hasOwnProperty;
		  var defineProperty = Object.defineProperty || function (obj, key, desc) { obj[key] = desc.value; };
		  var undefined$1; // More compressible than void 0.
		  var $Symbol = typeof Symbol === "function" ? Symbol : {};
		  var iteratorSymbol = $Symbol.iterator || "@@iterator";
		  var asyncIteratorSymbol = $Symbol.asyncIterator || "@@asyncIterator";
		  var toStringTagSymbol = $Symbol.toStringTag || "@@toStringTag";

		  function define(obj, key, value) {
		    Object.defineProperty(obj, key, {
		      value: value,
		      enumerable: true,
		      configurable: true,
		      writable: true
		    });
		    return obj[key];
		  }
		  try {
		    // IE 8 has a broken Object.defineProperty that only works on DOM objects.
		    define({}, "");
		  } catch (err) {
		    define = function(obj, key, value) {
		      return obj[key] = value;
		    };
		  }

		  function wrap(innerFn, outerFn, self, tryLocsList) {
		    // If outerFn provided and outerFn.prototype is a Generator, then outerFn.prototype instanceof Generator.
		    var protoGenerator = outerFn && outerFn.prototype instanceof Generator ? outerFn : Generator;
		    var generator = Object.create(protoGenerator.prototype);
		    var context = new Context(tryLocsList || []);

		    // The ._invoke method unifies the implementations of the .next,
		    // .throw, and .return methods.
		    defineProperty(generator, "_invoke", { value: makeInvokeMethod(innerFn, self, context) });

		    return generator;
		  }
		  exports.wrap = wrap;

		  // Try/catch helper to minimize deoptimizations. Returns a completion
		  // record like context.tryEntries[i].completion. This interface could
		  // have been (and was previously) designed to take a closure to be
		  // invoked without arguments, but in all the cases we care about we
		  // already have an existing method we want to call, so there's no need
		  // to create a new function object. We can even get away with assuming
		  // the method takes exactly one argument, since that happens to be true
		  // in every case, so we don't have to touch the arguments object. The
		  // only additional allocation required is the completion record, which
		  // has a stable shape and so hopefully should be cheap to allocate.
		  function tryCatch(fn, obj, arg) {
		    try {
		      return { type: "normal", arg: fn.call(obj, arg) };
		    } catch (err) {
		      return { type: "throw", arg: err };
		    }
		  }

		  var GenStateSuspendedStart = "suspendedStart";
		  var GenStateSuspendedYield = "suspendedYield";
		  var GenStateExecuting = "executing";
		  var GenStateCompleted = "completed";

		  // Returning this object from the innerFn has the same effect as
		  // breaking out of the dispatch switch statement.
		  var ContinueSentinel = {};

		  // Dummy constructor functions that we use as the .constructor and
		  // .constructor.prototype properties for functions that return Generator
		  // objects. For full spec compliance, you may wish to configure your
		  // minifier not to mangle the names of these two functions.
		  function Generator() {}
		  function GeneratorFunction() {}
		  function GeneratorFunctionPrototype() {}

		  // This is a polyfill for %IteratorPrototype% for environments that
		  // don't natively support it.
		  var IteratorPrototype = {};
		  define(IteratorPrototype, iteratorSymbol, function () {
		    return this;
		  });

		  var getProto = Object.getPrototypeOf;
		  var NativeIteratorPrototype = getProto && getProto(getProto(values([])));
		  if (NativeIteratorPrototype &&
		      NativeIteratorPrototype !== Op &&
		      hasOwn.call(NativeIteratorPrototype, iteratorSymbol)) {
		    // This environment has a native %IteratorPrototype%; use it instead
		    // of the polyfill.
		    IteratorPrototype = NativeIteratorPrototype;
		  }

		  var Gp = GeneratorFunctionPrototype.prototype =
		    Generator.prototype = Object.create(IteratorPrototype);
		  GeneratorFunction.prototype = GeneratorFunctionPrototype;
		  defineProperty(Gp, "constructor", { value: GeneratorFunctionPrototype, configurable: true });
		  defineProperty(
		    GeneratorFunctionPrototype,
		    "constructor",
		    { value: GeneratorFunction, configurable: true }
		  );
		  GeneratorFunction.displayName = define(
		    GeneratorFunctionPrototype,
		    toStringTagSymbol,
		    "GeneratorFunction"
		  );

		  // Helper for defining the .next, .throw, and .return methods of the
		  // Iterator interface in terms of a single ._invoke method.
		  function defineIteratorMethods(prototype) {
		    ["next", "throw", "return"].forEach(function(method) {
		      define(prototype, method, function(arg) {
		        return this._invoke(method, arg);
		      });
		    });
		  }

		  exports.isGeneratorFunction = function(genFun) {
		    var ctor = typeof genFun === "function" && genFun.constructor;
		    return ctor
		      ? ctor === GeneratorFunction ||
		        // For the native GeneratorFunction constructor, the best we can
		        // do is to check its .name property.
		        (ctor.displayName || ctor.name) === "GeneratorFunction"
		      : false;
		  };

		  exports.mark = function(genFun) {
		    if (Object.setPrototypeOf) {
		      Object.setPrototypeOf(genFun, GeneratorFunctionPrototype);
		    } else {
		      genFun.__proto__ = GeneratorFunctionPrototype;
		      define(genFun, toStringTagSymbol, "GeneratorFunction");
		    }
		    genFun.prototype = Object.create(Gp);
		    return genFun;
		  };

		  // Within the body of any async function, `await x` is transformed to
		  // `yield regeneratorRuntime.awrap(x)`, so that the runtime can test
		  // `hasOwn.call(value, "__await")` to determine if the yielded value is
		  // meant to be awaited.
		  exports.awrap = function(arg) {
		    return { __await: arg };
		  };

		  function AsyncIterator(generator, PromiseImpl) {
		    function invoke(method, arg, resolve, reject) {
		      var record = tryCatch(generator[method], generator, arg);
		      if (record.type === "throw") {
		        reject(record.arg);
		      } else {
		        var result = record.arg;
		        var value = result.value;
		        if (value &&
		            typeof value === "object" &&
		            hasOwn.call(value, "__await")) {
		          return PromiseImpl.resolve(value.__await).then(function(value) {
		            invoke("next", value, resolve, reject);
		          }, function(err) {
		            invoke("throw", err, resolve, reject);
		          });
		        }

		        return PromiseImpl.resolve(value).then(function(unwrapped) {
		          // When a yielded Promise is resolved, its final value becomes
		          // the .value of the Promise<{value,done}> result for the
		          // current iteration.
		          result.value = unwrapped;
		          resolve(result);
		        }, function(error) {
		          // If a rejected Promise was yielded, throw the rejection back
		          // into the async generator function so it can be handled there.
		          return invoke("throw", error, resolve, reject);
		        });
		      }
		    }

		    var previousPromise;

		    function enqueue(method, arg) {
		      function callInvokeWithMethodAndArg() {
		        return new PromiseImpl(function(resolve, reject) {
		          invoke(method, arg, resolve, reject);
		        });
		      }

		      return previousPromise =
		        // If enqueue has been called before, then we want to wait until
		        // all previous Promises have been resolved before calling invoke,
		        // so that results are always delivered in the correct order. If
		        // enqueue has not been called before, then it is important to
		        // call invoke immediately, without waiting on a callback to fire,
		        // so that the async generator function has the opportunity to do
		        // any necessary setup in a predictable way. This predictability
		        // is why the Promise constructor synchronously invokes its
		        // executor callback, and why async functions synchronously
		        // execute code before the first await. Since we implement simple
		        // async functions in terms of async generators, it is especially
		        // important to get this right, even though it requires care.
		        previousPromise ? previousPromise.then(
		          callInvokeWithMethodAndArg,
		          // Avoid propagating failures to Promises returned by later
		          // invocations of the iterator.
		          callInvokeWithMethodAndArg
		        ) : callInvokeWithMethodAndArg();
		    }

		    // Define the unified helper method that is used to implement .next,
		    // .throw, and .return (see defineIteratorMethods).
		    defineProperty(this, "_invoke", { value: enqueue });
		  }

		  defineIteratorMethods(AsyncIterator.prototype);
		  define(AsyncIterator.prototype, asyncIteratorSymbol, function () {
		    return this;
		  });
		  exports.AsyncIterator = AsyncIterator;

		  // Note that simple async functions are implemented on top of
		  // AsyncIterator objects; they just return a Promise for the value of
		  // the final result produced by the iterator.
		  exports.async = function(innerFn, outerFn, self, tryLocsList, PromiseImpl) {
		    if (PromiseImpl === void 0) PromiseImpl = Promise;

		    var iter = new AsyncIterator(
		      wrap(innerFn, outerFn, self, tryLocsList),
		      PromiseImpl
		    );

		    return exports.isGeneratorFunction(outerFn)
		      ? iter // If outerFn is a generator, return the full iterator.
		      : iter.next().then(function(result) {
		          return result.done ? result.value : iter.next();
		        });
		  };

		  function makeInvokeMethod(innerFn, self, context) {
		    var state = GenStateSuspendedStart;

		    return function invoke(method, arg) {
		      if (state === GenStateExecuting) {
		        throw new Error("Generator is already running");
		      }

		      if (state === GenStateCompleted) {
		        if (method === "throw") {
		          throw arg;
		        }

		        // Be forgiving, per GeneratorResume behavior specified since ES2015:
		        // ES2015 spec, step 3: https://262.ecma-international.org/6.0/#sec-generatorresume
		        // Latest spec, step 2: https://tc39.es/ecma262/#sec-generatorresume
		        return doneResult();
		      }

		      context.method = method;
		      context.arg = arg;

		      while (true) {
		        var delegate = context.delegate;
		        if (delegate) {
		          var delegateResult = maybeInvokeDelegate(delegate, context);
		          if (delegateResult) {
		            if (delegateResult === ContinueSentinel) continue;
		            return delegateResult;
		          }
		        }

		        if (context.method === "next") {
		          // Setting context._sent for legacy support of Babel's
		          // function.sent implementation.
		          context.sent = context._sent = context.arg;

		        } else if (context.method === "throw") {
		          if (state === GenStateSuspendedStart) {
		            state = GenStateCompleted;
		            throw context.arg;
		          }

		          context.dispatchException(context.arg);

		        } else if (context.method === "return") {
		          context.abrupt("return", context.arg);
		        }

		        state = GenStateExecuting;

		        var record = tryCatch(innerFn, self, context);
		        if (record.type === "normal") {
		          // If an exception is thrown from innerFn, we leave state ===
		          // GenStateExecuting and loop back for another invocation.
		          state = context.done
		            ? GenStateCompleted
		            : GenStateSuspendedYield;

		          if (record.arg === ContinueSentinel) {
		            continue;
		          }

		          return {
		            value: record.arg,
		            done: context.done
		          };

		        } else if (record.type === "throw") {
		          state = GenStateCompleted;
		          // Dispatch the exception by looping back around to the
		          // context.dispatchException(context.arg) call above.
		          context.method = "throw";
		          context.arg = record.arg;
		        }
		      }
		    };
		  }

		  // Call delegate.iterator[context.method](context.arg) and handle the
		  // result, either by returning a { value, done } result from the
		  // delegate iterator, or by modifying context.method and context.arg,
		  // setting context.delegate to null, and returning the ContinueSentinel.
		  function maybeInvokeDelegate(delegate, context) {
		    var methodName = context.method;
		    var method = delegate.iterator[methodName];
		    if (method === undefined$1) {
		      // A .throw or .return when the delegate iterator has no .throw
		      // method, or a missing .next method, always terminate the
		      // yield* loop.
		      context.delegate = null;

		      // Note: ["return"] must be used for ES3 parsing compatibility.
		      if (methodName === "throw" && delegate.iterator["return"]) {
		        // If the delegate iterator has a return method, give it a
		        // chance to clean up.
		        context.method = "return";
		        context.arg = undefined$1;
		        maybeInvokeDelegate(delegate, context);

		        if (context.method === "throw") {
		          // If maybeInvokeDelegate(context) changed context.method from
		          // "return" to "throw", let that override the TypeError below.
		          return ContinueSentinel;
		        }
		      }
		      if (methodName !== "return") {
		        context.method = "throw";
		        context.arg = new TypeError(
		          "The iterator does not provide a '" + methodName + "' method");
		      }

		      return ContinueSentinel;
		    }

		    var record = tryCatch(method, delegate.iterator, context.arg);

		    if (record.type === "throw") {
		      context.method = "throw";
		      context.arg = record.arg;
		      context.delegate = null;
		      return ContinueSentinel;
		    }

		    var info = record.arg;

		    if (! info) {
		      context.method = "throw";
		      context.arg = new TypeError("iterator result is not an object");
		      context.delegate = null;
		      return ContinueSentinel;
		    }

		    if (info.done) {
		      // Assign the result of the finished delegate to the temporary
		      // variable specified by delegate.resultName (see delegateYield).
		      context[delegate.resultName] = info.value;

		      // Resume execution at the desired location (see delegateYield).
		      context.next = delegate.nextLoc;

		      // If context.method was "throw" but the delegate handled the
		      // exception, let the outer generator proceed normally. If
		      // context.method was "next", forget context.arg since it has been
		      // "consumed" by the delegate iterator. If context.method was
		      // "return", allow the original .return call to continue in the
		      // outer generator.
		      if (context.method !== "return") {
		        context.method = "next";
		        context.arg = undefined$1;
		      }

		    } else {
		      // Re-yield the result returned by the delegate method.
		      return info;
		    }

		    // The delegate iterator is finished, so forget it and continue with
		    // the outer generator.
		    context.delegate = null;
		    return ContinueSentinel;
		  }

		  // Define Generator.prototype.{next,throw,return} in terms of the
		  // unified ._invoke helper method.
		  defineIteratorMethods(Gp);

		  define(Gp, toStringTagSymbol, "Generator");

		  // A Generator should always return itself as the iterator object when the
		  // @@iterator function is called on it. Some browsers' implementations of the
		  // iterator prototype chain incorrectly implement this, causing the Generator
		  // object to not be returned from this call. This ensures that doesn't happen.
		  // See https://github.com/facebook/regenerator/issues/274 for more details.
		  define(Gp, iteratorSymbol, function() {
		    return this;
		  });

		  define(Gp, "toString", function() {
		    return "[object Generator]";
		  });

		  function pushTryEntry(locs) {
		    var entry = { tryLoc: locs[0] };

		    if (1 in locs) {
		      entry.catchLoc = locs[1];
		    }

		    if (2 in locs) {
		      entry.finallyLoc = locs[2];
		      entry.afterLoc = locs[3];
		    }

		    this.tryEntries.push(entry);
		  }

		  function resetTryEntry(entry) {
		    var record = entry.completion || {};
		    record.type = "normal";
		    delete record.arg;
		    entry.completion = record;
		  }

		  function Context(tryLocsList) {
		    // The root entry object (effectively a try statement without a catch
		    // or a finally block) gives us a place to store values thrown from
		    // locations where there is no enclosing try statement.
		    this.tryEntries = [{ tryLoc: "root" }];
		    tryLocsList.forEach(pushTryEntry, this);
		    this.reset(true);
		  }

		  exports.keys = function(val) {
		    var object = Object(val);
		    var keys = [];
		    for (var key in object) {
		      keys.push(key);
		    }
		    keys.reverse();

		    // Rather than returning an object with a next method, we keep
		    // things simple and return the next function itself.
		    return function next() {
		      while (keys.length) {
		        var key = keys.pop();
		        if (key in object) {
		          next.value = key;
		          next.done = false;
		          return next;
		        }
		      }

		      // To avoid creating an additional object, we just hang the .value
		      // and .done properties off the next function object itself. This
		      // also ensures that the minifier will not anonymize the function.
		      next.done = true;
		      return next;
		    };
		  };

		  function values(iterable) {
		    if (iterable != null) {
		      var iteratorMethod = iterable[iteratorSymbol];
		      if (iteratorMethod) {
		        return iteratorMethod.call(iterable);
		      }

		      if (typeof iterable.next === "function") {
		        return iterable;
		      }

		      if (!isNaN(iterable.length)) {
		        var i = -1, next = function next() {
		          while (++i < iterable.length) {
		            if (hasOwn.call(iterable, i)) {
		              next.value = iterable[i];
		              next.done = false;
		              return next;
		            }
		          }

		          next.value = undefined$1;
		          next.done = true;

		          return next;
		        };

		        return next.next = next;
		      }
		    }

		    throw new TypeError(typeof iterable + " is not iterable");
		  }
		  exports.values = values;

		  function doneResult() {
		    return { value: undefined$1, done: true };
		  }

		  Context.prototype = {
		    constructor: Context,

		    reset: function(skipTempReset) {
		      this.prev = 0;
		      this.next = 0;
		      // Resetting context._sent for legacy support of Babel's
		      // function.sent implementation.
		      this.sent = this._sent = undefined$1;
		      this.done = false;
		      this.delegate = null;

		      this.method = "next";
		      this.arg = undefined$1;

		      this.tryEntries.forEach(resetTryEntry);

		      if (!skipTempReset) {
		        for (var name in this) {
		          // Not sure about the optimal order of these conditions:
		          if (name.charAt(0) === "t" &&
		              hasOwn.call(this, name) &&
		              !isNaN(+name.slice(1))) {
		            this[name] = undefined$1;
		          }
		        }
		      }
		    },

		    stop: function() {
		      this.done = true;

		      var rootEntry = this.tryEntries[0];
		      var rootRecord = rootEntry.completion;
		      if (rootRecord.type === "throw") {
		        throw rootRecord.arg;
		      }

		      return this.rval;
		    },

		    dispatchException: function(exception) {
		      if (this.done) {
		        throw exception;
		      }

		      var context = this;
		      function handle(loc, caught) {
		        record.type = "throw";
		        record.arg = exception;
		        context.next = loc;

		        if (caught) {
		          // If the dispatched exception was caught by a catch block,
		          // then let that catch block handle the exception normally.
		          context.method = "next";
		          context.arg = undefined$1;
		        }

		        return !! caught;
		      }

		      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
		        var entry = this.tryEntries[i];
		        var record = entry.completion;

		        if (entry.tryLoc === "root") {
		          // Exception thrown outside of any try block that could handle
		          // it, so set the completion value of the entire function to
		          // throw the exception.
		          return handle("end");
		        }

		        if (entry.tryLoc <= this.prev) {
		          var hasCatch = hasOwn.call(entry, "catchLoc");
		          var hasFinally = hasOwn.call(entry, "finallyLoc");

		          if (hasCatch && hasFinally) {
		            if (this.prev < entry.catchLoc) {
		              return handle(entry.catchLoc, true);
		            } else if (this.prev < entry.finallyLoc) {
		              return handle(entry.finallyLoc);
		            }

		          } else if (hasCatch) {
		            if (this.prev < entry.catchLoc) {
		              return handle(entry.catchLoc, true);
		            }

		          } else if (hasFinally) {
		            if (this.prev < entry.finallyLoc) {
		              return handle(entry.finallyLoc);
		            }

		          } else {
		            throw new Error("try statement without catch or finally");
		          }
		        }
		      }
		    },

		    abrupt: function(type, arg) {
		      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
		        var entry = this.tryEntries[i];
		        if (entry.tryLoc <= this.prev &&
		            hasOwn.call(entry, "finallyLoc") &&
		            this.prev < entry.finallyLoc) {
		          var finallyEntry = entry;
		          break;
		        }
		      }

		      if (finallyEntry &&
		          (type === "break" ||
		           type === "continue") &&
		          finallyEntry.tryLoc <= arg &&
		          arg <= finallyEntry.finallyLoc) {
		        // Ignore the finally entry if control is not jumping to a
		        // location outside the try/catch block.
		        finallyEntry = null;
		      }

		      var record = finallyEntry ? finallyEntry.completion : {};
		      record.type = type;
		      record.arg = arg;

		      if (finallyEntry) {
		        this.method = "next";
		        this.next = finallyEntry.finallyLoc;
		        return ContinueSentinel;
		      }

		      return this.complete(record);
		    },

		    complete: function(record, afterLoc) {
		      if (record.type === "throw") {
		        throw record.arg;
		      }

		      if (record.type === "break" ||
		          record.type === "continue") {
		        this.next = record.arg;
		      } else if (record.type === "return") {
		        this.rval = this.arg = record.arg;
		        this.method = "return";
		        this.next = "end";
		      } else if (record.type === "normal" && afterLoc) {
		        this.next = afterLoc;
		      }

		      return ContinueSentinel;
		    },

		    finish: function(finallyLoc) {
		      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
		        var entry = this.tryEntries[i];
		        if (entry.finallyLoc === finallyLoc) {
		          this.complete(entry.completion, entry.afterLoc);
		          resetTryEntry(entry);
		          return ContinueSentinel;
		        }
		      }
		    },

		    "catch": function(tryLoc) {
		      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
		        var entry = this.tryEntries[i];
		        if (entry.tryLoc === tryLoc) {
		          var record = entry.completion;
		          if (record.type === "throw") {
		            var thrown = record.arg;
		            resetTryEntry(entry);
		          }
		          return thrown;
		        }
		      }

		      // The context.catch method must only be called with a location
		      // argument that corresponds to a known catch block.
		      throw new Error("illegal catch attempt");
		    },

		    delegateYield: function(iterable, resultName, nextLoc) {
		      this.delegate = {
		        iterator: values(iterable),
		        resultName: resultName,
		        nextLoc: nextLoc
		      };

		      if (this.method === "next") {
		        // Deliberately forget the last sent value so that we don't
		        // accidentally pass it on to the delegate.
		        this.arg = undefined$1;
		      }

		      return ContinueSentinel;
		    }
		  };

		  // Regardless of whether this script is executing as a CommonJS module
		  // or not, return the runtime object so that we can declare the variable
		  // regeneratorRuntime in the outer scope, which allows this module to be
		  // injected easily by `bin/regenerator --include-runtime script.js`.
		  return exports;

		}(
		  // If this script is executing as a CommonJS module, use module.exports
		  // as the regeneratorRuntime namespace. Otherwise create a new empty
		  // object. Either way, the resulting object will be used to initialize
		  // the regeneratorRuntime variable at the top of this file.
		  module.exports 
		));

		try {
		  regeneratorRuntime = runtime;
		} catch (accidentalStrictMode) {
		  // This module should not be running in strict mode, so the above
		  // assignment should always work unless something is misconfigured. Just
		  // in case runtime.js accidentally runs in strict mode, in modern engines
		  // we can explicitly access globalThis. In older engines we can escape
		  // strict mode using a global Function call. This could conceivably fail
		  // if a Content Security Policy forbids using Function, but in that case
		  // the proper solution is to fix the accidental strict mode problem. If
		  // you've misconfigured your bundler to force strict mode and applied a
		  // CSP to forbid Function, and you're not willing to fix either of those
		  // problems, please detail your unique predicament in a GitHub issue.
		  if (typeof globalThis === "object") {
		    globalThis.regeneratorRuntime = runtime;
		  } else {
		    Function("r", "regeneratorRuntime = r")(runtime);
		  }
		} 
	} (runtime));

	/* eslint-disable no-prototype-builtins */
	var g =
	  (typeof globalThis !== 'undefined' && globalThis) ||
	  (typeof self !== 'undefined' && self) ||
	  // eslint-disable-next-line no-undef
	  (typeof global !== 'undefined' && global) ||
	  {};

	var support = {
	  searchParams: 'URLSearchParams' in g,
	  iterable: 'Symbol' in g && 'iterator' in Symbol,
	  blob:
	    'FileReader' in g &&
	    'Blob' in g &&
	    (function() {
	      try {
	        new Blob();
	        return true
	      } catch (e) {
	        return false
	      }
	    })(),
	  formData: 'FormData' in g,
	  arrayBuffer: 'ArrayBuffer' in g
	};

	function isDataView(obj) {
	  return obj && DataView.prototype.isPrototypeOf(obj)
	}

	if (support.arrayBuffer) {
	  var viewClasses = [
	    '[object Int8Array]',
	    '[object Uint8Array]',
	    '[object Uint8ClampedArray]',
	    '[object Int16Array]',
	    '[object Uint16Array]',
	    '[object Int32Array]',
	    '[object Uint32Array]',
	    '[object Float32Array]',
	    '[object Float64Array]'
	  ];

	  var isArrayBufferView =
	    ArrayBuffer.isView ||
	    function(obj) {
	      return obj && viewClasses.indexOf(Object.prototype.toString.call(obj)) > -1
	    };
	}

	function normalizeName(name) {
	  if (typeof name !== 'string') {
	    name = String(name);
	  }
	  if (/[^a-z0-9\-#$%&'*+.^_`|~!]/i.test(name) || name === '') {
	    throw new TypeError('Invalid character in header field name: "' + name + '"')
	  }
	  return name.toLowerCase()
	}

	function normalizeValue(value) {
	  if (typeof value !== 'string') {
	    value = String(value);
	  }
	  return value
	}

	// Build a destructive iterator for the value list
	function iteratorFor(items) {
	  var iterator = {
	    next: function() {
	      var value = items.shift();
	      return {done: value === undefined, value: value}
	    }
	  };

	  if (support.iterable) {
	    iterator[Symbol.iterator] = function() {
	      return iterator
	    };
	  }

	  return iterator
	}

	function Headers(headers) {
	  this.map = {};

	  if (headers instanceof Headers) {
	    headers.forEach(function(value, name) {
	      this.append(name, value);
	    }, this);
	  } else if (Array.isArray(headers)) {
	    headers.forEach(function(header) {
	      if (header.length != 2) {
	        throw new TypeError('Headers constructor: expected name/value pair to be length 2, found' + header.length)
	      }
	      this.append(header[0], header[1]);
	    }, this);
	  } else if (headers) {
	    Object.getOwnPropertyNames(headers).forEach(function(name) {
	      this.append(name, headers[name]);
	    }, this);
	  }
	}

	Headers.prototype.append = function(name, value) {
	  name = normalizeName(name);
	  value = normalizeValue(value);
	  var oldValue = this.map[name];
	  this.map[name] = oldValue ? oldValue + ', ' + value : value;
	};

	Headers.prototype['delete'] = function(name) {
	  delete this.map[normalizeName(name)];
	};

	Headers.prototype.get = function(name) {
	  name = normalizeName(name);
	  return this.has(name) ? this.map[name] : null
	};

	Headers.prototype.has = function(name) {
	  return this.map.hasOwnProperty(normalizeName(name))
	};

	Headers.prototype.set = function(name, value) {
	  this.map[normalizeName(name)] = normalizeValue(value);
	};

	Headers.prototype.forEach = function(callback, thisArg) {
	  for (var name in this.map) {
	    if (this.map.hasOwnProperty(name)) {
	      callback.call(thisArg, this.map[name], name, this);
	    }
	  }
	};

	Headers.prototype.keys = function() {
	  var items = [];
	  this.forEach(function(value, name) {
	    items.push(name);
	  });
	  return iteratorFor(items)
	};

	Headers.prototype.values = function() {
	  var items = [];
	  this.forEach(function(value) {
	    items.push(value);
	  });
	  return iteratorFor(items)
	};

	Headers.prototype.entries = function() {
	  var items = [];
	  this.forEach(function(value, name) {
	    items.push([name, value]);
	  });
	  return iteratorFor(items)
	};

	if (support.iterable) {
	  Headers.prototype[Symbol.iterator] = Headers.prototype.entries;
	}

	function consumed(body) {
	  if (body._noBody) return
	  if (body.bodyUsed) {
	    return Promise.reject(new TypeError('Already read'))
	  }
	  body.bodyUsed = true;
	}

	function fileReaderReady(reader) {
	  return new Promise(function(resolve, reject) {
	    reader.onload = function() {
	      resolve(reader.result);
	    };
	    reader.onerror = function() {
	      reject(reader.error);
	    };
	  })
	}

	function readBlobAsArrayBuffer(blob) {
	  var reader = new FileReader();
	  var promise = fileReaderReady(reader);
	  reader.readAsArrayBuffer(blob);
	  return promise
	}

	function readBlobAsText(blob) {
	  var reader = new FileReader();
	  var promise = fileReaderReady(reader);
	  var match = /charset=([A-Za-z0-9_-]+)/.exec(blob.type);
	  var encoding = match ? match[1] : 'utf-8';
	  reader.readAsText(blob, encoding);
	  return promise
	}

	function readArrayBufferAsText(buf) {
	  var view = new Uint8Array(buf);
	  var chars = new Array(view.length);

	  for (var i = 0; i < view.length; i++) {
	    chars[i] = String.fromCharCode(view[i]);
	  }
	  return chars.join('')
	}

	function bufferClone(buf) {
	  if (buf.slice) {
	    return buf.slice(0)
	  } else {
	    var view = new Uint8Array(buf.byteLength);
	    view.set(new Uint8Array(buf));
	    return view.buffer
	  }
	}

	function Body() {
	  this.bodyUsed = false;

	  this._initBody = function(body) {
	    /*
	      fetch-mock wraps the Response object in an ES6 Proxy to
	      provide useful test harness features such as flush. However, on
	      ES5 browsers without fetch or Proxy support pollyfills must be used;
	      the proxy-pollyfill is unable to proxy an attribute unless it exists
	      on the object before the Proxy is created. This change ensures
	      Response.bodyUsed exists on the instance, while maintaining the
	      semantic of setting Request.bodyUsed in the constructor before
	      _initBody is called.
	    */
	    // eslint-disable-next-line no-self-assign
	    this.bodyUsed = this.bodyUsed;
	    this._bodyInit = body;
	    if (!body) {
	      this._noBody = true;
	      this._bodyText = '';
	    } else if (typeof body === 'string') {
	      this._bodyText = body;
	    } else if (support.blob && Blob.prototype.isPrototypeOf(body)) {
	      this._bodyBlob = body;
	    } else if (support.formData && FormData.prototype.isPrototypeOf(body)) {
	      this._bodyFormData = body;
	    } else if (support.searchParams && URLSearchParams.prototype.isPrototypeOf(body)) {
	      this._bodyText = body.toString();
	    } else if (support.arrayBuffer && support.blob && isDataView(body)) {
	      this._bodyArrayBuffer = bufferClone(body.buffer);
	      // IE 10-11 can't handle a DataView body.
	      this._bodyInit = new Blob([this._bodyArrayBuffer]);
	    } else if (support.arrayBuffer && (ArrayBuffer.prototype.isPrototypeOf(body) || isArrayBufferView(body))) {
	      this._bodyArrayBuffer = bufferClone(body);
	    } else {
	      this._bodyText = body = Object.prototype.toString.call(body);
	    }

	    if (!this.headers.get('content-type')) {
	      if (typeof body === 'string') {
	        this.headers.set('content-type', 'text/plain;charset=UTF-8');
	      } else if (this._bodyBlob && this._bodyBlob.type) {
	        this.headers.set('content-type', this._bodyBlob.type);
	      } else if (support.searchParams && URLSearchParams.prototype.isPrototypeOf(body)) {
	        this.headers.set('content-type', 'application/x-www-form-urlencoded;charset=UTF-8');
	      }
	    }
	  };

	  if (support.blob) {
	    this.blob = function() {
	      var rejected = consumed(this);
	      if (rejected) {
	        return rejected
	      }

	      if (this._bodyBlob) {
	        return Promise.resolve(this._bodyBlob)
	      } else if (this._bodyArrayBuffer) {
	        return Promise.resolve(new Blob([this._bodyArrayBuffer]))
	      } else if (this._bodyFormData) {
	        throw new Error('could not read FormData body as blob')
	      } else {
	        return Promise.resolve(new Blob([this._bodyText]))
	      }
	    };
	  }

	  this.arrayBuffer = function() {
	    if (this._bodyArrayBuffer) {
	      var isConsumed = consumed(this);
	      if (isConsumed) {
	        return isConsumed
	      } else if (ArrayBuffer.isView(this._bodyArrayBuffer)) {
	        return Promise.resolve(
	          this._bodyArrayBuffer.buffer.slice(
	            this._bodyArrayBuffer.byteOffset,
	            this._bodyArrayBuffer.byteOffset + this._bodyArrayBuffer.byteLength
	          )
	        )
	      } else {
	        return Promise.resolve(this._bodyArrayBuffer)
	      }
	    } else if (support.blob) {
	      return this.blob().then(readBlobAsArrayBuffer)
	    } else {
	      throw new Error('could not read as ArrayBuffer')
	    }
	  };

	  this.text = function() {
	    var rejected = consumed(this);
	    if (rejected) {
	      return rejected
	    }

	    if (this._bodyBlob) {
	      return readBlobAsText(this._bodyBlob)
	    } else if (this._bodyArrayBuffer) {
	      return Promise.resolve(readArrayBufferAsText(this._bodyArrayBuffer))
	    } else if (this._bodyFormData) {
	      throw new Error('could not read FormData body as text')
	    } else {
	      return Promise.resolve(this._bodyText)
	    }
	  };

	  if (support.formData) {
	    this.formData = function() {
	      return this.text().then(decode)
	    };
	  }

	  this.json = function() {
	    return this.text().then(JSON.parse)
	  };

	  return this
	}

	// HTTP methods whose capitalization should be normalized
	var methods = ['CONNECT', 'DELETE', 'GET', 'HEAD', 'OPTIONS', 'PATCH', 'POST', 'PUT', 'TRACE'];

	function normalizeMethod(method) {
	  var upcased = method.toUpperCase();
	  return methods.indexOf(upcased) > -1 ? upcased : method
	}

	function Request(input, options) {
	  if (!(this instanceof Request)) {
	    throw new TypeError('Please use the "new" operator, this DOM object constructor cannot be called as a function.')
	  }

	  options = options || {};
	  var body = options.body;

	  if (input instanceof Request) {
	    if (input.bodyUsed) {
	      throw new TypeError('Already read')
	    }
	    this.url = input.url;
	    this.credentials = input.credentials;
	    if (!options.headers) {
	      this.headers = new Headers(input.headers);
	    }
	    this.method = input.method;
	    this.mode = input.mode;
	    this.signal = input.signal;
	    if (!body && input._bodyInit != null) {
	      body = input._bodyInit;
	      input.bodyUsed = true;
	    }
	  } else {
	    this.url = String(input);
	  }

	  this.credentials = options.credentials || this.credentials || 'same-origin';
	  if (options.headers || !this.headers) {
	    this.headers = new Headers(options.headers);
	  }
	  this.method = normalizeMethod(options.method || this.method || 'GET');
	  this.mode = options.mode || this.mode || null;
	  this.signal = options.signal || this.signal || (function () {
	    if ('AbortController' in g) {
	      var ctrl = new AbortController();
	      return ctrl.signal;
	    }
	  }());
	  this.referrer = null;

	  if ((this.method === 'GET' || this.method === 'HEAD') && body) {
	    throw new TypeError('Body not allowed for GET or HEAD requests')
	  }
	  this._initBody(body);

	  if (this.method === 'GET' || this.method === 'HEAD') {
	    if (options.cache === 'no-store' || options.cache === 'no-cache') {
	      // Search for a '_' parameter in the query string
	      var reParamSearch = /([?&])_=[^&]*/;
	      if (reParamSearch.test(this.url)) {
	        // If it already exists then set the value with the current time
	        this.url = this.url.replace(reParamSearch, '$1_=' + new Date().getTime());
	      } else {
	        // Otherwise add a new '_' parameter to the end with the current time
	        var reQueryString = /\?/;
	        this.url += (reQueryString.test(this.url) ? '&' : '?') + '_=' + new Date().getTime();
	      }
	    }
	  }
	}

	Request.prototype.clone = function() {
	  return new Request(this, {body: this._bodyInit})
	};

	function decode(body) {
	  var form = new FormData();
	  body
	    .trim()
	    .split('&')
	    .forEach(function(bytes) {
	      if (bytes) {
	        var split = bytes.split('=');
	        var name = split.shift().replace(/\+/g, ' ');
	        var value = split.join('=').replace(/\+/g, ' ');
	        form.append(decodeURIComponent(name), decodeURIComponent(value));
	      }
	    });
	  return form
	}

	function parseHeaders(rawHeaders) {
	  var headers = new Headers();
	  // Replace instances of \r\n and \n followed by at least one space or horizontal tab with a space
	  // https://tools.ietf.org/html/rfc7230#section-3.2
	  var preProcessedHeaders = rawHeaders.replace(/\r?\n[\t ]+/g, ' ');
	  // Avoiding split via regex to work around a common IE11 bug with the core-js 3.6.0 regex polyfill
	  // https://github.com/github/fetch/issues/748
	  // https://github.com/zloirock/core-js/issues/751
	  preProcessedHeaders
	    .split('\r')
	    .map(function(header) {
	      return header.indexOf('\n') === 0 ? header.substr(1, header.length) : header
	    })
	    .forEach(function(line) {
	      var parts = line.split(':');
	      var key = parts.shift().trim();
	      if (key) {
	        var value = parts.join(':').trim();
	        try {
	          headers.append(key, value);
	        } catch (error) {
	          console.warn('Response ' + error.message);
	        }
	      }
	    });
	  return headers
	}

	Body.call(Request.prototype);

	function Response(bodyInit, options) {
	  if (!(this instanceof Response)) {
	    throw new TypeError('Please use the "new" operator, this DOM object constructor cannot be called as a function.')
	  }
	  if (!options) {
	    options = {};
	  }

	  this.type = 'default';
	  this.status = options.status === undefined ? 200 : options.status;
	  if (this.status < 200 || this.status > 599) {
	    throw new RangeError("Failed to construct 'Response': The status provided (0) is outside the range [200, 599].")
	  }
	  this.ok = this.status >= 200 && this.status < 300;
	  this.statusText = options.statusText === undefined ? '' : '' + options.statusText;
	  this.headers = new Headers(options.headers);
	  this.url = options.url || '';
	  this._initBody(bodyInit);
	}

	Body.call(Response.prototype);

	Response.prototype.clone = function() {
	  return new Response(this._bodyInit, {
	    status: this.status,
	    statusText: this.statusText,
	    headers: new Headers(this.headers),
	    url: this.url
	  })
	};

	Response.error = function() {
	  var response = new Response(null, {status: 200, statusText: ''});
	  response.ok = false;
	  response.status = 0;
	  response.type = 'error';
	  return response
	};

	var redirectStatuses = [301, 302, 303, 307, 308];

	Response.redirect = function(url, status) {
	  if (redirectStatuses.indexOf(status) === -1) {
	    throw new RangeError('Invalid status code')
	  }

	  return new Response(null, {status: status, headers: {location: url}})
	};

	var DOMException = g.DOMException;
	try {
	  new DOMException();
	} catch (err) {
	  DOMException = function(message, name) {
	    this.message = message;
	    this.name = name;
	    var error = Error(message);
	    this.stack = error.stack;
	  };
	  DOMException.prototype = Object.create(Error.prototype);
	  DOMException.prototype.constructor = DOMException;
	}

	function fetch(input, init) {
	  return new Promise(function(resolve, reject) {
	    var request = new Request(input, init);

	    if (request.signal && request.signal.aborted) {
	      return reject(new DOMException('Aborted', 'AbortError'))
	    }

	    var xhr = new XMLHttpRequest();

	    function abortXhr() {
	      xhr.abort();
	    }

	    xhr.onload = function() {
	      var options = {
	        statusText: xhr.statusText,
	        headers: parseHeaders(xhr.getAllResponseHeaders() || '')
	      };
	      // This check if specifically for when a user fetches a file locally from the file system
	      // Only if the status is out of a normal range
	      if (request.url.indexOf('file://') === 0 && (xhr.status < 200 || xhr.status > 599)) {
	        options.status = 200;
	      } else {
	        options.status = xhr.status;
	      }
	      options.url = 'responseURL' in xhr ? xhr.responseURL : options.headers.get('X-Request-URL');
	      var body = 'response' in xhr ? xhr.response : xhr.responseText;
	      setTimeout(function() {
	        resolve(new Response(body, options));
	      }, 0);
	    };

	    xhr.onerror = function() {
	      setTimeout(function() {
	        reject(new TypeError('Network request failed'));
	      }, 0);
	    };

	    xhr.ontimeout = function() {
	      setTimeout(function() {
	        reject(new TypeError('Network request timed out'));
	      }, 0);
	    };

	    xhr.onabort = function() {
	      setTimeout(function() {
	        reject(new DOMException('Aborted', 'AbortError'));
	      }, 0);
	    };

	    function fixUrl(url) {
	      try {
	        return url === '' && g.location.href ? g.location.href : url
	      } catch (e) {
	        return url
	      }
	    }

	    xhr.open(request.method, fixUrl(request.url), true);

	    if (request.credentials === 'include') {
	      xhr.withCredentials = true;
	    } else if (request.credentials === 'omit') {
	      xhr.withCredentials = false;
	    }

	    if ('responseType' in xhr) {
	      if (support.blob) {
	        xhr.responseType = 'blob';
	      } else if (
	        support.arrayBuffer
	      ) {
	        xhr.responseType = 'arraybuffer';
	      }
	    }

	    if (init && typeof init.headers === 'object' && !(init.headers instanceof Headers || (g.Headers && init.headers instanceof g.Headers))) {
	      var names = [];
	      Object.getOwnPropertyNames(init.headers).forEach(function(name) {
	        names.push(normalizeName(name));
	        xhr.setRequestHeader(name, normalizeValue(init.headers[name]));
	      });
	      request.headers.forEach(function(value, name) {
	        if (names.indexOf(name) === -1) {
	          xhr.setRequestHeader(name, value);
	        }
	      });
	    } else {
	      request.headers.forEach(function(value, name) {
	        xhr.setRequestHeader(name, value);
	      });
	    }

	    if (request.signal) {
	      request.signal.addEventListener('abort', abortXhr);

	      xhr.onreadystatechange = function() {
	        // DONE (success or failure)
	        if (xhr.readyState === 4) {
	          request.signal.removeEventListener('abort', abortXhr);
	        }
	      };
	    }

	    xhr.send(typeof request._bodyInit === 'undefined' ? null : request._bodyInit);
	  })
	}

	fetch.polyfill = true;

	if (!g.fetch) {
	  g.fetch = fetch;
	  g.Headers = Headers;
	  g.Request = Request;
	  g.Response = Response;
	}

	var eventsource = {};

	/*
	   * EventSource polyfill version 0.9.6
	   * Supported by sc AmvTek srl
	   * :email: devel@amvtek.com
	 */
	(function (global) {

	    if (global.EventSource && !global._eventSourceImportPrefix){
	        return;
	    }

	    var evsImportName = (global._eventSourceImportPrefix||'')+"EventSource";

	    var EventSource = function (url, options) {

	        if (!url || typeof url != 'string') {
	            throw new SyntaxError('Not enough arguments');
	        }

	        this.URL = url;
	        this.setOptions(options);
	        var evs = this;
	        setTimeout(function(){evs.poll();}, 0);
	    };

	    EventSource.prototype = {

	        CONNECTING: 0,

	        OPEN: 1,

	        CLOSED: 2,

	        defaultOptions: {

	            loggingEnabled: false,

	            loggingPrefix: "eventsource",

	            interval: 500, // milliseconds

	            bufferSizeLimit: 256*1024, // bytes

	            silentTimeout: 300000, // milliseconds

	            getArgs:{
	                'evs_buffer_size_limit': 256*1024
	            },

	            xhrHeaders:{
	                'Accept': 'text/event-stream',
	                'Cache-Control': 'no-cache',
	                'X-Requested-With': 'XMLHttpRequest'
	            }
	        },

	        setOptions: function(options){

	            var defaults = this.defaultOptions;
	            var option;

	            // set all default options...
	            for (option in defaults){

	                if ( defaults.hasOwnProperty(option) ){
	                    this[option] = defaults[option];
	                }
	            }

	            // override with what is in options
	            for (option in options){

	                if (option in defaults && options.hasOwnProperty(option)){
	                    this[option] = options[option];
	                }
	            }

	            // if getArgs option is enabled
	            // ensure evs_buffer_size_limit corresponds to bufferSizeLimit
	            if (this.getArgs && this.bufferSizeLimit) {

	                this.getArgs['evs_buffer_size_limit'] = this.bufferSizeLimit;
	            }

	            // if console is not available, force loggingEnabled to false
	            if (typeof console === "undefined" || typeof console.log === "undefined") {

	                this.loggingEnabled = false;
	            }
	        },

	        log: function(message) {

	            if (this.loggingEnabled) {

	                console.log("[" + this.loggingPrefix +"]:" + message);
	            }
	        },

	        poll: function() {

	            try {

	                if (this.readyState == this.CLOSED) {
	                    return;
	                }

	                this.cleanup();
	                this.readyState = this.CONNECTING;
	                this.cursor = 0;
	                this.cache = '';
	                this._xhr = new this.XHR(this);
	                this.resetNoActivityTimer();

	            }
	            catch (e) {

	                // in an attempt to silence the errors
	                this.log('There were errors inside the pool try-catch');
	                this.dispatchEvent('error', { type: 'error', data: e.message });
	            }
	        },

	        pollAgain: function (interval) {

	            // schedule poll to be called after interval milliseconds
	            var evs = this;
	            evs.readyState = evs.CONNECTING;
	            evs.dispatchEvent('error', {
	                type: 'error',
	                data: "Reconnecting "
	            });
	            this._pollTimer = setTimeout(function(){evs.poll();}, interval||0);
	        },


	        cleanup: function() {

	            this.log('evs cleaning up');

	            if (this._pollTimer){
	                clearInterval(this._pollTimer);
	                this._pollTimer = null;
	            }

	            if (this._noActivityTimer){
	                clearInterval(this._noActivityTimer);
	                this._noActivityTimer = null;
	            }

	            if (this._xhr){
	                this._xhr.abort();
	                this._xhr = null;
	            }
	        },

	        resetNoActivityTimer: function(){

	            if (this.silentTimeout){

	                if (this._noActivityTimer){
	                    clearInterval(this._noActivityTimer);
	                }
	                var evs = this;
	                this._noActivityTimer = setTimeout(
	                        function(){ evs.log('Timeout! silentTImeout:'+evs.silentTimeout); evs.pollAgain(); },
	                        this.silentTimeout
	                        );
	            }
	        },

	        close: function () {

	            this.readyState = this.CLOSED;
	            this.log('Closing connection. readyState: '+this.readyState);
	            this.cleanup();
	        },

	        ondata: function() {

	            var request = this._xhr;

	            if (request.isReady() && !request.hasError() ) {
	                // reset the timer, as we have activity
	                this.resetNoActivityTimer();

	                // move this EventSource to OPEN state...
	                if (this.readyState == this.CONNECTING) {
	                    this.readyState = this.OPEN;
	                    this.dispatchEvent('open', { type: 'open' });
	                }

	                var buffer = request.getBuffer();

	                if (buffer.length > this.bufferSizeLimit) {
	                    this.log('buffer.length > this.bufferSizeLimit');
	                    this.pollAgain();
	                }

	                if (this.cursor == 0 && buffer.length > 0){

	                    // skip byte order mark \uFEFF character if it starts the stream
	                    if (buffer.substring(0,1) == '\uFEFF'){
	                        this.cursor = 1;
	                    }
	                }

	                var lastMessageIndex = this.lastMessageIndex(buffer);
	                if (lastMessageIndex[0] >= this.cursor){

	                    var newcursor = lastMessageIndex[1];
	                    var toparse = buffer.substring(this.cursor, newcursor);
	                    this.parseStream(toparse);
	                    this.cursor = newcursor;
	                }

	                // if request is finished, reopen the connection
	                if (request.isDone()) {
	                    this.log('request.isDone(). reopening the connection');
	                    this.pollAgain(this.interval);
	                }
	            }
	            else if (this.readyState !== this.CLOSED) {

	                this.log('this.readyState !== this.CLOSED');
	                this.pollAgain(this.interval);

	                //MV: Unsure why an error was previously dispatched
	            }
	        },

	        parseStream: function(chunk) {

	            // normalize line separators (\r\n,\r,\n) to \n
	            // remove white spaces that may precede \n
	            chunk = this.cache + this.normalizeToLF(chunk);

	            var events = chunk.split('\n\n');

	            var i, j, eventType, datas, line, retry;

	            for (i=0; i < (events.length - 1); i++) {

	                eventType = 'message';
	                datas = [];
	                parts = events[i].split('\n');

	                for (j=0; j < parts.length; j++) {

	                    line = this.trimWhiteSpace(parts[j]);

	                    if (line.indexOf('event') == 0) {

	                        eventType = line.replace(/event:?\s*/, '');
	                    }
	                    else if (line.indexOf('retry') == 0) {

	                        retry = parseInt(line.replace(/retry:?\s*/, ''));
	                        if(!isNaN(retry)) {
	                            this.interval = retry;
	                        }
	                    }
	                    else if (line.indexOf('data') == 0) {

	                        datas.push(line.replace(/data:?\s*/, ''));
	                    }
	                    else if (line.indexOf('id:') == 0) {

	                        this.lastEventId = line.replace(/id:?\s*/, '');
	                    }
	                    else if (line.indexOf('id') == 0) { // this resets the id

	                        this.lastEventId = null;
	                    }
	                }

	                if (datas.length) {
	                    // dispatch a new event
	                    var event = new MessageEvent(eventType, datas.join('\n'), window.location.origin, this.lastEventId);
	                    this.dispatchEvent(eventType, event);
	                }
	            }

	            this.cache = events[events.length - 1];
	        },

	        dispatchEvent: function (type, event) {
	            var handlers = this['_' + type + 'Handlers'];

	            if (handlers) {

	                for (var i = 0; i < handlers.length; i++) {
	                    handlers[i].call(this, event);
	                }
	            }

	            if (this['on' + type]) {
	                this['on' + type].call(this, event);
	            }

	        },

	        addEventListener: function (type, handler) {
	            if (!this['_' + type + 'Handlers']) {
	                this['_' + type + 'Handlers'] = [];
	            }

	            this['_' + type + 'Handlers'].push(handler);
	        },

	        removeEventListener: function (type, handler) {
	            var handlers = this['_' + type + 'Handlers'];
	            if (!handlers) {
	                return;
	            }
	            for (var i = handlers.length - 1; i >= 0; --i) {
	                if (handlers[i] === handler) {
	                    handlers.splice(i, 1);
	                    break;
	                }
	            }
	        },

	        _pollTimer: null,

	        _noactivityTimer: null,

	        _xhr: null,

	        lastEventId: null,

	        cache: '',

	        cursor: 0,

	        onerror: null,

	        onmessage: null,

	        onopen: null,

	        readyState: 0,

	        // ===================================================================
	        // helpers functions
	        // those are attached to prototype to ease reuse and testing...

	        urlWithParams: function (baseURL, params) {

	            var encodedArgs = [];

	            if (params){

	                var key, urlarg;
	                var urlize = encodeURIComponent;

	                for (key in params){
	                    if (params.hasOwnProperty(key)) {
	                        urlarg = urlize(key)+'='+urlize(params[key]);
	                        encodedArgs.push(urlarg);
	                    }
	                }
	            }

	            if (encodedArgs.length > 0){

	                if (baseURL.indexOf('?') == -1)
	                    return baseURL + '?' + encodedArgs.join('&');
	                return baseURL + '&' + encodedArgs.join('&');
	            }
	            return baseURL;
	        },

	        lastMessageIndex: function(text) {

	            var ln2 =text.lastIndexOf('\n\n');
	            var lr2 = text.lastIndexOf('\r\r');
	            var lrln2 = text.lastIndexOf('\r\n\r\n');

	            if (lrln2 > Math.max(ln2, lr2)) {
	                return [lrln2, lrln2+4];
	            }
	            return [Math.max(ln2, lr2), Math.max(ln2, lr2) + 2]
	        },

	        trimWhiteSpace: function(str) {
	            // to remove whitespaces left and right of string

	            var reTrim = /^(\s|\u00A0)+|(\s|\u00A0)+$/g;
	            return str.replace(reTrim, '');
	        },

	        normalizeToLF: function(str) {

	            // replace \r and \r\n with \n
	            return str.replace(/\r\n|\r/g, '\n');
	        }

	    };

	    if (!isOldIE()){

	        EventSource.isPolyfill = "XHR";

	        // EventSource will send request using XMLHttpRequest
	        EventSource.prototype.XHR = function(evs) {

	            request = new XMLHttpRequest();
	            this._request = request;
	            evs._xhr = this;

	            // set handlers
	            request.onreadystatechange = function(){
	                if (request.readyState > 1 && evs.readyState != evs.CLOSED) {
	                    if (request.status == 200 || (request.status>=300 && request.status<400)){
	                        evs.ondata();
	                    }
	                    else {
	                        request._failed = true;
	                        evs.readyState = evs.CLOSED;
	                        evs.dispatchEvent('error', {
	                            type: 'error',
	                            data: "The server responded with "+request.status
	                        });
	                        evs.close();
	                    }
	                }
	            };

	            request.onprogress = function () {
	            };

	            request.open('GET', evs.urlWithParams(evs.URL, evs.getArgs), true);

	            var headers = evs.xhrHeaders; // maybe null
	            for (var header in headers) {
	                if (headers.hasOwnProperty(header)){
	                    request.setRequestHeader(header, headers[header]);
	                }
	            }
	            if (evs.lastEventId) {
	                request.setRequestHeader('Last-Event-Id', evs.lastEventId);
	            }

	            request.send();
	        };

	        EventSource.prototype.XHR.prototype = {

	            useXDomainRequest: false,

	            _request: null,

	            _failed: false, // true if we have had errors...

	            isReady: function() {


	                return this._request.readyState >= 2;
	            },

	            isDone: function() {

	                return (this._request.readyState == 4);
	            },

	            hasError: function() {

	                return (this._failed || (this._request.status >= 400));
	            },

	            getBuffer: function() {

	                var rv = '';
	                try {
	                    rv = this._request.responseText || '';
	                }
	                catch (e){}
	                return rv;
	            },

	            abort: function() {

	                if ( this._request ) {
	                    this._request.abort();
	                }
	            }
	        };
	    }
	    else {

		EventSource.isPolyfill = "IE_8-9";

	        // patch EventSource defaultOptions
	        var defaults = EventSource.prototype.defaultOptions;
	        defaults.xhrHeaders = null; // no headers will be sent
	        defaults.getArgs['evs_preamble'] = 2048 + 8;

	        // EventSource will send request using Internet Explorer XDomainRequest
	        EventSource.prototype.XHR = function(evs) {

	            request = new XDomainRequest();
	            this._request = request;

	            // set handlers
	            request.onprogress = function(){
	                request._ready = true;
	                evs.ondata();
	            };

	            request.onload = function(){
	                this._loaded = true;
	                evs.ondata();
	            };

	            request.onerror = function(){
	                this._failed = true;
	                evs.readyState = evs.CLOSED;
	                evs.dispatchEvent('error', {
	                    type: 'error',
	                    data: "XDomainRequest error"
	                });
	            };

	            request.ontimeout = function(){
	                this._failed = true;
	                evs.readyState = evs.CLOSED;
	                evs.dispatchEvent('error', {
	                    type: 'error',
	                    data: "XDomainRequest timed out"
	                });
	            };

	            // XDomainRequest does not allow setting custom headers
	            // If EventSource has enabled the use of GET arguments
	            // we add parameters to URL so that server can adapt the stream...
	            var reqGetArgs = {};
	            if (evs.getArgs) {

	                // copy evs.getArgs in reqGetArgs
	                var defaultArgs = evs.getArgs;
	                    for (var key in defaultArgs) {
	                        if (defaultArgs.hasOwnProperty(key)){
	                            reqGetArgs[key] = defaultArgs[key];
	                        }
	                    }
	                if (evs.lastEventId){
	                    reqGetArgs['evs_last_event_id'] = evs.lastEventId;
	                }
	            }
	            // send the request

	            request.open('GET', evs.urlWithParams(evs.URL,reqGetArgs));
	            request.send();
	        };

	        EventSource.prototype.XHR.prototype = {

	            useXDomainRequest: true,

	            _request: null,

	            _ready: false, // true when progress events are dispatched

	            _loaded: false, // true when request has been loaded

	            _failed: false, // true if when request is in error

	            isReady: function() {

	                return this._request._ready;
	            },

	            isDone: function() {

	                return this._request._loaded;
	            },

	            hasError: function() {

	                return this._request._failed;
	            },

	            getBuffer: function() {

	                var rv = '';
	                try {
	                    rv = this._request.responseText || '';
	                }
	                catch (e){}
	                return rv;
	            },

	            abort: function() {

	                if ( this._request){
	                    this._request.abort();
	                }
	            }
	        };
	    }

	    function MessageEvent(type, data, origin, lastEventId) {

	        this.bubbles = false;
	        this.cancelBubble = false;
	        this.cancelable = false;
	        this.data = data || null;
	        this.origin = origin || '';
	        this.lastEventId = lastEventId || '';
	        this.type = type || 'message';
	    }

	    function isOldIE () {

	        //return true if we are in IE8 or IE9
	        return (window.XDomainRequest && (window.XMLHttpRequest && new XMLHttpRequest().responseType === undefined)) ? true : false;
	    }

	    global[evsImportName] = EventSource;
	})(commonjsGlobal);

	/*
	   * CommonJS module that exports EventSource polyfill version 0.9.6
	   * This module is intended for browser side use
	   * =====================================================================
	   * THIS IS A POLYFILL MODULE, SO IT HAS SIDE EFFECTS
	   * IT AUTOMATICALLY CHECKS IF window OBJECT DEFINES EventSource
	   * AND ADD THE EXPORTED ONE IN CASE IT IS UNDEFINED
	   * =====================================================================
	   * Supported by sc AmvTek srl
	   * :email: devel@amvtek.com
	 */

	var PolyfillEventSource = eventsource.EventSource;

	// Add EventSource to window if it is missing...
	if (window && !window.EventSource){
	    window.EventSource = PolyfillEventSource;
	    if (console){
		console.log("polyfill-eventsource added missing EventSource to window");
	    }
	}

	// Polyfill entrypoint for legacy browsers (Tizen, webOS)
	// Imports polyfills for language features, Promises, fetch, EventSource, etc.

	// Element.closest polyfill for very old WebKit browsers.
	if (typeof Element !== 'undefined' && !Element.prototype.closest) {
	  Element.prototype.closest = function closest(selector) {
	    var node = this;
	    while (node && node.nodeType === 1) {
	      if (node.matches(selector)) return node;
	      node = node.parentElement || node.parentNode;
	    }
	    return null;
	  };
	}

	// Element.matches polyfill
	if (typeof Element !== 'undefined' && !Element.prototype.matches) {
	  var proto = Element.prototype;
	  proto.matches = proto.matchesSelector || proto.mozMatchesSelector || proto.msMatchesSelector || proto.oMatchesSelector || proto.webkitMatchesSelector || function matches(selector) {
	    var matchesList = (this.document || this.ownerDocument).querySelectorAll(selector);
	    var i = matchesList.length - 1;
	    while (i >= 0 && matchesList.item(i) !== this) {
	      i -= 1;
	    }
	    return i > -1;
	  };
	}

	// NodeList.forEach polyfill (for older browsers)
	if (typeof window !== 'undefined' && window.NodeList && !NodeList.prototype.forEach) {
	  NodeList.prototype.forEach = Array.prototype.forEach;
	}

	// HTMLCollection.forEach polyfill for convenience
	if (typeof window !== 'undefined' && window.HTMLCollection && !HTMLCollection.prototype.forEach) {
	  HTMLCollection.prototype.forEach = Array.prototype.forEach;
	}

	// dataset polyfill for elements (very old WebKit)
	if (typeof document !== 'undefined' && !document.documentElement.dataset) {
	  Object.defineProperty(Element.prototype, 'dataset', {
	    get: function get() {
	      var attributes = this.attributes;
	      var map = {};
	      for (var i = 0; i < attributes.length; i += 1) {
	        var attr = attributes[i];
	        if (attr && attr.name && attr.name.indexOf('data-') === 0) {
	          var name = attr.name.slice(5).replace(/-([a-z])/g, function (g) {
	            return g[1].toUpperCase();
	          });
	          map[name] = attr.value;
	        }
	      }
	      return map;
	    }
	  });
	}

	// textContent fallback for older browsers
	if (typeof Element !== 'undefined' && !('textContent' in Element.prototype)) {
	  Object.defineProperty(Element.prototype, 'textContent', {
	    get: function get() {
	      return this.innerText;
	    },
	    set: function set(value) {
	      this.innerText = value;
	    }
	  });
	}
	var index = {};

	return index;

})();
//# sourceMappingURL=polyfills.legacy.js.map

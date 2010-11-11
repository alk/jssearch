Math.popcount = function (n) {
  n = (n >> 0);
  n = n - ((n>>1) & 0x55555555)
  n = (n & 0x33333333) + ((n>>2) & 0x33333333)
  n = (n + (n>>4)) & 0x0f0f0f0f
  n = n + (n>>8)
  n = (n + (n>>16)) & 0x000000ff
  return n;
}
// Math.ceil(Math.log2(n))
Math.intLog2 = function (n) {
  n = (n >> 0) - 1;
  if (n < 0)
    return 0; // not exactly right, but ok for our case
  n |= (n >> 16);
  n |= (n >> 8);
  n |= (n >> 4);
  n |= (n >> 2);
  n |= (n >> 1);
  return Math.popcount(n);
}

function BUG() {
  if (confirm('bug')) {
    debugger
  }
  throw new Error();
}

function constantly(c) {return function () {return c;}}

function graphDistancesFloyd(nodesMax, arcDistanceF) {
  var i,j,k;
  var tt = _.range(nodesMax);
  var arcDistances = _.map(tt, function (j) {
    return _.map(tt, function (k) {
      return (j == k) ? 0 : arcDistanceF(j, k);
    });
  });
  var distances = _.map(arcDistances, function (row) {
    return _.clone(row);
  });
  distances.arcDistances = arcDistances;
  for (i=0;i<nodesMax;i++) {
    for (j=0;j<nodesMax;j++) {
      if (j == i)
        continue;
      var a = distances[j][i];
      if (a == null)
        continue;
      for (k=0;k<nodesMax;k++) {
        // we're trying to improve distance from j to k by going through i
        var b = distances[i][k];
        if (b == null)
          continue;
        b += a;
        var c = distances[j][k];
        if (c == null || c > b)
          distances[j][k] = b;
      }
    }
  }
  return distances;
}

function shortestPath(i,j,distances) {
  var rv = [];
  rv.push(i);
  var len = distances.length;
  var arcDistances = distances.arcDistances;
  while (i != j) {
    var k;
    var bestK = -1;
    var bestDistance = Number.POSITIVE_INFINITY;
    var targetD = distances[i][j];
    for (k=0;k<len;k++) {
      if (k == i)
        continue;

      var ad = arcDistances[i][k];
      if (ad == null)
        continue;
      var d = distances[k][j];
      if (ad + d == targetD && d < bestDistance) {
        bestK = k;
        bestDistance = d;
      }
    }
    rv.push(bestK);
    i = bestK;
  }
  return rv;
}

Hash = function (hashF, equals) {
  if (hashF)
    this.hashF = hashF;
  if (!this.equals)
    this.equals = equals || Hash.normalEquals;
  this.slave = {};
}

Hash.normalEquals = function (a,b) {
  return a == b;
}

_.extend(Hash.prototype, {
  __findSlot: function (k,f,defaultValue) {
    var hash = this.hashF(k);
    var slot = this.slave[hash];
    var i;
    if (!slot)
      return defaultValue;
    for (i=slot.length-2;i>=0;i -= 2)
      if (this.equals(slot[i], k))
        return f(slot, i, hash);
    return defaultValue;
  },
  put: function (k, v) {
    var i = this.hashF(k);
    var slot = this.slave[i];

    if (!slot) {
      this.slave[i] = [k, v];
      return;
    }

    for (i=slot.length-2;i>=0;i--) {
      if (this.equals(slot[i], k)) {
        slot[i+1] = v;
        return;
      }
    }

    var i = slot.length;
    slot[i+1] = v;
    slot[i] = k;
  },
  remove: function (k) {
    var slave = this.slave;
    return this.__findSlot(k, function (slot, i, hash) {
      var value = slot[i+1];
      slave[hash] = slot.splice(i, 2);
      return value;
    });
  },
  get: function (k, defaultValue) {
    var hashF = this.hashF(k);
    var slot = this.slave[hashF];
    if (!slot)
      return defaultValue;
    if (this.equals(k, slot[0]))
      return slot[1];
    if (slot.length == 2)
      return defaultValue;

    return this.__findSlot(k, function (slot, i) {
      return slot[i+1];
    }, defaultValue);
  },
  identityGet: function (k, defaultValue) {
    var hashF = this.hashF(k);
    var slot = this.slave[hashF];
    if (!slot)
      return defaultValue;
    if (k == slot[0])
      return slot[1];
    if (slot.length == 2)
      return defaultValue;
    return this.fullGet(k, defaultValue);
  },
  forEach: function (f, context) {
    _.each(this.slave, function (bucket) {
      var i;
      for (i=bucket.length-2; i>=0; i -= 2)
        f.call(context, bucket[i+1], bucket[i]);
    });
  }
});
Hash.prototype.fullGet = Hash.prototype.get;

_.valuesAt = function (obj, keys) {
  return _.map(keys, function (k) {return obj[k];});
}

_.binarySearch = function (l, r, predicate) {
  if (predicate(l))
    return l;
  if (l == r || !predicate(r))
    return null;
  while (true) {
    var x = (l+r) >> 1;
    if (x == l)
      return r;
    if (predicate(x))
      r = x;
    else
      l = x;
  }
}

_.groupBy = function (elements, keyF) {
  var groups = {};
  _.each(elements, function (e, i) {
    var k = keyF(e, i);
    (groups[k] = groups[k] || []).push(e);
  });
  return groups;
}

// NOTE: copied from scjs. Not used.
//
// tests if arrays a and b are isomorphic with respect to
// predicate. hash functions are used to optimize matching. More
// specifically:
//
// ∀x,y predicate(x,y) -> (hashFA(x) == hashFB(y))
// which, obviously, implies:
// ∀x,y (hashFA(x) != hashFB(y)) -> !predicate(x,y)
//
// I.e. matching elements must have same hash
// values. aOrderingGoodnessF is a function which value is used to
// order matching search
_.genericFindMatching = function (a, b, hashFA, hashFB, predicate, aOrderingGoodnessF) {
  var size = a.length;
  if (size != b.length)
    return;

  var hashesA = _.map(a, hashFA);
  var hashesB = _.map(b, hashFB);
  if (!_.isEqual(_.clone(hashesA).sort(), _.clone(hashesB).sort()))
    return;

  var indexProp = '__gfm_i';//_.uniqueId('__gfm_i');

  _.each([a,b], function (elements) {
    _.each(elements, function (e,i) {
      e[indexProp] = i;
    });
  })

  var matches = new Array(size);
  var usedB = new Array(size);

  var aOrdering;
  aOrderingGoodnessF = aOrderingGoodnessF || function (e, groupSize) {
    return -groupSize;
  };
  var hashCounts = {};
  _.each(hashesA, function (h) {
    hashCounts[h] = (hashCounts[h] || 0) + 1;
  });
  aOrdering = _.sortBy(_.range(size), function (i) {
    return -aOrderingGoodnessF(a[i], hashCounts[hashesA[i]]);
  });

  var allImpliedMatches = _.map(a, function () {return []});

  function rec(depth) {
    if (depth >= size)
      return true;

    var i = aOrdering[depth];

    var impliedMatches = allImpliedMatches[depth];
    var matchAdder = mkMatchAdder(impliedMatches);

    if (matches[i] != null) {
      if (predicate(a[i], b[matches[i]], matchAdder) && rec(depth+1))
        return matches;

      clearImplied(impliedMatches);
      return;
    }

    var k;
    var hashI = hashesA[i];
    for (k = 0; k < size; k++) {
      if (hashesB[k] != hashI || usedB[k])
        continue;
      matches[i] = k;
      if (predicate(a[i], b[k], matchAdder)) {
        usedB[k] = true;

        if (rec(depth+1))
          return matches;

        usedB[k] = false;
      }
      clearImplied(impliedMatches);
    }
    matches[i] = undefined;
  }

  function clearImplied(impliedMatches) {
    for (var j = impliedMatches.length-2; j >= 0; j -= 2) {
      usedB[impliedMatches[j+1]] = false;
      matches[impliedMatches[j]] = undefined;
    }
    impliedMatches.length = 0;
  }

  function mkMatchAdder(impliedMatches) {
    return function (ea, eb) {
      if (ea == null)
        return eb == null;
      if (eb == null)
        return false;

      var i = ea[indexProp];
      var k = eb[indexProp];

      if (matches[i] != null) {
        return matches[i] == k;
      }
      if (usedB[k])
        return false;

      if (hashesA[i] != hashesB[k])
        return false;

      matches[i] = k;
      usedB[k] = true;
      impliedMatches.push(i, k);

      return true;
    }
  }

  var rv = rec(0);

  _.each([a,b], function (elements) {
    _.each(elements, function (e) {
      delete e[indexProp];
    });
  });

  return rv;
}

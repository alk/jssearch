
_.objectWithProto = function (proto) {
  var maker = new Function();
  maker.prototype = proto;
  return new maker();
}

var SearchProblem = function (options, otherOptions) {
  // NOTE: we want _all_ properties
  for (var k in options) {
    var v = options[k];
    if (this[k] !== v)
      this[k] = v;
  }
  if (otherOptions) {
    for (var k in otherOptions) {
      var v = otherOptions[k];
      if (this[k] !== v)
        this[k] = v;
    }
  }
  if (!('initialState' in this && typeof(this.goalP) === 'function' && typeof(this.childStatesIterMaker) === 'function'))
    throw new Error("missing required options");
}
SearchProblem.raw = function () {}
SearchProblem.raw.prototype = SearchProblem.prototype;

SearchProblem.prototype.visitState = function (state) {return true;}
SearchProblem.prototype.forgetState = function (state) {}
SearchProblem.prototype.goalBackwardPathCB = function (state) {}
SearchProblem.prototype.shallowCopy = function (into) {
  if (!into)
    into = _.objectWithProto(this.constructor.prototype);
  _.extend(into, this);
  return into;
}

var TreeSearch = {};

TreeSearch.iteratedDeepeningDFS = function (problem, failure, depthLimit) {
  var goalP = problem.goalP;
  var childStatesIterMaker = problem.childStatesIterMaker;

  var endMarker = {};

  function rec(state, limit) {
    if (!problem.visitState(state, limit))
      return failure;
    if (goalP(state))
      return state;
    if (!limit)
      return failure;
    var iter = childStatesIterMaker(state, endMarker);
    var child;
    limit--;
    while ((child = iter()) !== endMarker) {
      var result = rec(child, limit);
      if (result !== failure) {
        problem.goalBackwardPathCB(state);
        return result;
      }
      problem.forgetState(child);
    }
  }

  if (depthLimit === undefined)
    depthLimit = (1/0);

  for (var limit = 1; limit <= depthLimit; limit++) {
    var result = rec(problem.initialState, limit);
    if (result !== failure)
      return result;
  }

  return failure;
}

function Oracle() {
}
Oracle.State = function (oracle, v, body) {
  if (oracle.current)
    BUG();
  try {
    oracle.current = this;
    body(v);
    if (this.visited === undefined)
      BUG();
  } finally {
    oracle.current = null;
  }
}
Oracle.State.prototype.childsMkIter = function (over) {return function () {return over}};
Oracle.prototype = {
  constructor: Oracle,
  failedState: {},
  stateConstructor: Oracle.State,
  mustCurrentState: function () {
    if (!this.current)
      BUG();
    return this.current;
  },
  pick: function (choices, body) {
    var ostate = this.mustCurrentState();

    var oracle = this;
    if (ostate.hasOwnProperty('childsMkIter'))
      BUG();
    ostate.childsMkIter = function (over) {
      var i = 0;
      return function () {
        while (i < choices.length) {
          var v = choices[i++];
          var rv = new (oracle.stateConstructor)(oracle, v, body);
          if (rv.visited !== oracle.failedState)
            return rv;
        }
        return over;
      }
    }
  },
  pickState: function (choices, body) {
    var oracle = this;
    this.pick(choices, function (v) {
      oracle.visit(v);
      body(v);
    });
  },
  visit: function (state) {
    var ostate = this.mustCurrentState();
    if (ostate.visited)
      BUG();
    ostate.visited = state;
  },
  goal: function (state) {
    var ostate = this.mustCurrentState();
    if (ostate.visited && ostate.visited !== state)
      BUG();
    ostate.visited = state;
    ostate.isGoal = true;
  },
  fail: function () {
    var ostate = this.mustCurrentState();
    if (ostate.visited)
      BUG();
    ostate.visited = this.failedState;
  }
};

function oracleSearchProblem(body) {
  var rv = new (SearchProblem.raw)();

  var oracle = new Oracle();
  rv.initialState = new (oracle.stateConstructor)(oracle, oracle, body);

  rv.goalP = function (ostate) {
    return ostate.isGoal;
  }

  rv.childStatesIterMaker = function (ostate, over) {
    var childsMkIter = ostate.childsMkIter;
    return childsMkIter(over);
  }

  return rv;
}

var GraphSearchProblem = function (options, otherOptions) {
// initialState, goalP, childStatesIterMaker,
//                                    stateEquality, stateHash
  SearchProblem.call(this, options, otherOptions);
  if (typeof(this.stateEquality) !== 'function' || typeof(this.stateHash) !== 'function')
    throw new Error("missing required options");
}
GraphSearchProblem.fromTreeProblem = function (treeProblem, stateEquality, stateHash) {
  var self = new (GraphSearchProblem.raw)();
  SearchProblem.call(self, treeProblem);
  self.stateEquality = stateEquality;
  self.stateHash = stateHash;
  if (typeof(self.stateEquality) !== 'function' || typeof(self.stateHash) !== 'function')
    throw new Error("missing required options");
  return self;
}

GraphSearchProblem.prototype = (function () {
  var prototype = new (SearchProblem.raw)();
  prototype.constructor = GraphSearchProblem;
  return prototype;
})();
GraphSearchProblem.raw = function () {}
GraphSearchProblem.raw.prototype = GraphSearchProblem.prototype;

GraphSearchProblem.prototype.mkStatesHash = function () {
  return new Hash(this.stateHash, this.stateEquality);
}

var GraphSearch = {};
GraphSearch.iteratedDeepeningDFS = function (problem, failure, depthLimit, seenHash) {
  var treeProblem = _.clone(problem);
  var seen = seenHash || problem.mkStatesHash();
  treeProblem.visitState = function (state, limit) {
    if (seen.get(state, -1) >= limit)
        return false;
    if (!problem.visitState(state, limit))
      return false;
    seen.put(state, limit);
    return true;
  }
  treeProblem.forgetState = function (state) {
    problem.forgetState(state);
  }

  return TreeSearch.iteratedDeepeningDFS(treeProblem, failure, depthLimit);
}

GraphSearch.SimpleFIFO = function () {
  this.pushes = []
  this.pops = []
}

GraphSearch.SimpleFIFO.prototype = {
  constructor: GraphSearch.SimpleFIFO,
  push: function (e) {
    this.pushes.push(e);
  },
  pop: function () {
    if (this.pops.length == 0) {
      if (this.pushes.length == 0)
        throw new Error("FIFO is empty!");
      this.pops = this.pushes.reverse();
      this.pushes = [];
    }
    return this.pops.pop();
  },
  getSize: function () {
    return this.pushes.length + this.pops.length;
  },
  isEmpty: function () {
    return !this.pushes.length && !this.pops.length;
  }
}

GraphSearch.bfs = function (problem, failure, seenHash) {
  var pending = new GraphSearch.SimpleFIFO();
  var goalP = problem.goalP;

  seenHash = seenHash || problem.mkStatesHash();

  seenHash.put(problem.initialState, true);
  pending.push(problem.initialState);

  while (!pending.isEmpty()) {
    var state = pending.pop();
    var child;
    var over = {};
    var iter = problem.childStatesIterMaker(state, over);
    while ((child = iter()) !== over) {
      if (seenHash.get(child))
        continue;
      if (!problem.visitState(state))
        continue;
      if (goalP(state))
        return state;
      seenHash.put(state, true);
      pending.push(state);
    }
  }

  return failure;
}

function AStarSearchProblem(initialState, goalP, childStatesIterMaker,
                            badness, getParentState,
                            stateEquality, stateHash) {
  this.initialState = initialState;
  this.goalP = goalP;
  this.childStatesIterMaker = childStatesIterMaker;
  this.badness = badness;
  this.getParentState = getParentState;
  this.stateEquality = stateEquality;
  this.stateHash = stateHash;
}

GraphSearch.astar = function (problem, failure, seenHash) {
  seenHash = seenHash || new Hash(problem.stateHash, problem.stateEquality);

  var badness = problem.badness;
  var goalP = problem.goalP;

  var pending = new BinaryHeap(function (a,b) {
    return badness(a) < badness(b);
  });

  seenHash.put(problem.initialState, true);
  pending.add(problem.initialState);

  while (!pending.isEmpty()) {
    var state = pending.popLeast();
    var child;
    var over = {};
    var iter = problem.childStatesIterMaker(state, over);
    while ((child = iter()) !== over) {
      if (seenHash.get(child))
        continue;
      if (goalP(state))
        return state;
      seenHash.put(state, true);
      pending.add(state);
    }
  }

  return failure;
}

// TODO: need some helpers for #badness

// TODO: need some helpers to handle 'nesting' state for #badness helper and oracleSearchProblem

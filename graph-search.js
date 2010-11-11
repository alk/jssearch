
var SearchProblem = function (initialState, goalP, childStatesIterMaker) {
  this.initialState = initialState;
  this.goalP = goalP;
  this.childStatesIterMaker = childStatesIterMaker;
}
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
    if (this.visited === undefined) {
      debugger
      body(v);
      BUG();
    }
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
    ostate.visited = state;
  },
  goal: function (state) {
    var ostate = this.mustCurrentState();
    ostate.visited = state;
    ostate.isGoal = true;
  },
  fail: function () {
    this.mustCurrentState().visited = this.failedState;
    return this.pick([], null);
  }
};

function oracleSearchProblem(body) {
  var oracle = new Oracle();
  var initialState = new (oracle.stateConstructor)(oracle, oracle, body);
  var goalP = function (ostate) {
    return ostate.isGoal;
  }
  var childStatesIterMaker = function (ostate, over) {
    var childsMkIter = ostate.childsMkIter;
    return childsMkIter(over);
  }
  return new SearchProblem(initialState, goalP, childStatesIterMaker);
}

var GraphSearchProblem = function (initialState, goalP, childStatesIterMaker,
                                   stateEquality, stateHash) {
  SearchProblem.call(this, initialState, goalP, childStatesIterMaker);
  this.stateEquality = stateEquality;
  this.stateHash = stateHash;
}
GraphSearchProblem.fromTreeProblem = function (treeProblem, stateEquality, stateHash) {
  var self = new GraphSearchProblem.plainConstructor();
  treeProblem.shallowCopy(self);
  self.stateEquality = stateEquality;
  self.stateHash = stateHash;
  return self;
}

_.objectWithProto = function (proto) {
  var maker = new Function();
  maker.prototype = proto;
  return new maker();
}

GraphSearchProblem.prototype = (function () {
  var prototype = _.objectWithProto(SearchProblem.prototype);
  prototype.constructor = GraphSearchProblem;
  return prototype;
})();
GraphSearchProblem.plainConstructor = (function () {
  var rv = new Function();
  rv.prototype = GraphSearchProblem.prototype;
  return rv;
})();
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


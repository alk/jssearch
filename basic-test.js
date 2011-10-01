var BasicTest = TestCase("BasicTest");

BasicTest.prototype.testSetup = function () {
  assert(true);
}

BasicTest.mkNineProblem = function () {
  var initialState = [5,6,2,3,8,1,4,0,7,4];
  function goalP(state) {
    for (var i=0;i<9;i++)
      if (state[i] != i)
        return false;
    return true;
  }
  function swapPositions(state, hole, y) {
    var rv = [].concat(state);
    rv[hole] = state[y];
    rv[y] = state[hole];
    rv[9] = y;
    return rv;
  }
  function mkArrayIter(array, over) {
    var i = 0;
    var length = array.length;
    return function () {
      if (i < length)
        return array[i++];
      return over;
    }
  }
  function mkChildsIter(state, over) {
    var childs = [];
    var hole = state[9];
    var x = hole % 3;
    var y = (hole / 3) >> 0;

    if (x < 2)
      childs.push(swapPositions(state, hole, hole+1));
    if (x > 0)
      childs.push(swapPositions(state, hole, hole-1));
    if (y > 0)
      childs.push(swapPositions(state, hole, hole-3));
    if (y < 2)
      childs.push(swapPositions(state, hole, hole+3));

    return mkArrayIter(childs, over);
  }
  var problem = new SearchProblem({
    initialState: initialState,
    goalP: goalP,
    childStatesIterMaker: mkChildsIter});

  problem.goalBackwardPathCB = function (state) {
    console.log("intermediate state: ", state);
  }
  problem.swapPositions = swapPositions;
  return problem;
}

BasicTest.prototype.testSimplifiedNineTreeDFS = function () {
  var finalState = [0,1,2,3,4,5,6,7,8,8];
  var simpleProblem = BasicTest.mkNineProblem();

  simpleProblem.initialState = simpleProblem.swapPositions(finalState, 8, 7);
  assertEquals([0,1,2,3,4,5,6,7,8,8], finalState);
  assertEquals([0,1,2,3,4,5,6,8,7,7], simpleProblem.initialState);

  simpleProblem.initialState = simpleProblem.swapPositions(simpleProblem.initialState, 7, 4);
  assertEquals([0,1,2,3,4,5,6,7,8,8], finalState);
  assertEquals([0,1,2,3,8,5,6,4,7,4], simpleProblem.initialState);

  var visitedCounter = 0;
  simpleProblem.visitState = function (state) {
    visitedCounter++;
    return true;
  }

  var result = TreeSearch.iteratedDeepeningDFS(simpleProblem, undefined, 2);
  assertEquals(finalState, result);

  console.log("visitedCounter: ", visitedCounter);
}

BasicTest.mkNineGraphProblem = function (useConstructor) {
  function hashF(state) {
    var rv = 3211;
    for (var i = 9; i >= 0; i--)
      rv = (((rv * 7) >> 0) + state[i]) >> 0;
    return rv;
  }
  function equal(a, b) {
    for (var i = 9; i >= 0; i--)
      if (a[i] !== b[i])
        return false;
    return true;
  }
  var treeProblem = BasicTest.mkNineProblem();
  if (useConstructor) {
    var problem = new GraphSearchProblem(treeProblem, {
      stateEquality: equal,
      stateHash: hashF
    });
  } else {
    var problem = GraphSearchProblem.fromTreeProblem(treeProblem, equal, hashF);
  }
  return problem;
}

BasicTest.prototype.testSimplifiedNineGraphDFS = function () {
  var finalState = [0,1,2,3,4,5,6,7,8,8];
  var simpleProblem = BasicTest.mkNineGraphProblem();

  simpleProblem.initialState = simpleProblem.swapPositions(finalState, 8, 7);
  assertEquals([0,1,2,3,4,5,6,7,8,8], finalState);
  assertEquals([0,1,2,3,4,5,6,8,7,7], simpleProblem.initialState);

  simpleProblem.initialState = simpleProblem.swapPositions(simpleProblem.initialState, 7, 4);
  assertEquals([0,1,2,3,4,5,6,7,8,8], finalState);
  assertEquals([0,1,2,3,8,5,6,4,7,4], simpleProblem.initialState);

  var visitedCounter = 0;
  simpleProblem.visitState = function (state) {
    visitedCounter++;
    return true;
  }

  var result = GraphSearch.iteratedDeepeningDFS(simpleProblem, undefined, 2);
  assertEquals(finalState, result);

  console.log("visitedCounter: ", visitedCounter);
}

BasicTest.prototype.testSimplifiedNineGraphDFSWithProblem2 = function () {
  var finalState = [0,1,2,3,4,5,6,7,8,8];
  var simpleProblem = BasicTest.mkNineGraphProblem(true);

  simpleProblem.initialState = simpleProblem.swapPositions(finalState, 8, 7);
  assertEquals([0,1,2,3,4,5,6,7,8,8], finalState);
  assertEquals([0,1,2,3,4,5,6,8,7,7], simpleProblem.initialState);

  simpleProblem.initialState = simpleProblem.swapPositions(simpleProblem.initialState, 7, 4);
  assertEquals([0,1,2,3,4,5,6,7,8,8], finalState);
  assertEquals([0,1,2,3,8,5,6,4,7,4], simpleProblem.initialState);

  var visitedCounter = 0;
  simpleProblem.visitState = function (state) {
    visitedCounter++;
    return true;
  }

  var result = GraphSearch.iteratedDeepeningDFS(simpleProblem, undefined, 2);
  assertEquals(finalState, result);

  console.log("visitedCounter: ", visitedCounter);
}

BasicTest.prototype.testNineGraphDFS = function () {
  var finalState = [0,1,2,3,4,5,6,7,8,8];
  var problem = BasicTest.mkNineGraphProblem();

  var visitedCounter = 0;
  problem.visitState = function (state) {
    visitedCounter++;
    return true;
  }

  var result = GraphSearch.iteratedDeepeningDFS(problem, undefined, 24);
  assertEquals(finalState, result);

  console.log("visitedCounter: ", visitedCounter);
}

BasicTest.prototype.testNineGraphDFSOracle = function () {
  var treeProblem = oracleSearchProblem(function (oracle) {
    function goalP(state) {
      for (var i=0;i<9;i++)
        if (state[i] != i)
          return false;
      return true;
    }
    function swapPositions(state, hole, y) {
      if (y > 8)
        BUG();
      var rv = [].concat(state);
      rv[hole] = state[y];
      rv[y] = state[hole];
      rv[9] = y;
      return rv;
    }

    function walk(state) {
      if (goalP(state))
        return oracle.goal(state);
      oracle.visit(state);

      var hole = state[9];
      var x = hole % 3;
      var y = (hole / 3) >> 0;
      return oracle.pick(["right", "left", "up", "down"], function (v) {
        switch (v) {
        case "left":
          if (x == 0)
            return oracle.fail();
          return walk(swapPositions(state, hole, hole-1));
        case "right":
          if (x == 2)
            return oracle.fail();
          return walk(swapPositions(state, hole, hole+1));
        case "up":
          if (y == 0)
            return oracle.fail();
          return walk(swapPositions(state, hole, hole-3));
        case "down":
          if (y == 2)
            return oracle.fail();
          return walk(swapPositions(state, hole, hole+3));
        }
      });
    }

    return walk([5,6,2,3,8,1,4,0,7,4]);
  });

  console.log("treeProblem: ", treeProblem);

  var nineGraphProblem = BasicTest.mkNineGraphProblem();
  var stateEquality = nineGraphProblem.stateEquality;
  var stateHash = nineGraphProblem.stateHash;

  function thisEqual(a, b) {
    if (!a.visited)
      BUG();
    if (!b.visited)
      BUG();
    return stateEquality(a.visited, b.visited);
  }
  function thisHash(state) {
    return stateHash(state.visited);
  }

  var graphProblem = GraphSearchProblem.fromTreeProblem(treeProblem,
                                                        thisEqual,
                                                        thisHash);

  var visitedCounter = 0;
  graphProblem.visitState = function (state) {
    visitedCounter++;
    return true;
  }

  graphProblem.goalBackwardPathCB = function (state) {
    console.log("intermediate state: ", state);
  }

  var rv = GraphSearch.iteratedDeepeningDFS(graphProblem, undefined, 24);
  assertEquals([0,1,2,3,4,5,6,7,8,8], rv.visited);

  console.log("visitedCounter: ", visitedCounter);
}

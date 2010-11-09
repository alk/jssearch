ifdef LOC
TEST_LOC=--server $(LOC)
else
TEST_LOC=
endif

TESTS = all

test:
	java -jar lib/JsTestDriver.jar --tests $(TESTS) --captureConsole $(TEST_LOC) --verbose

run_browser:
	java -jar lib/JsTestDriver.jar --port 11981 --browser google-chrome

run_server:
	java -jar lib/JsTestDriver.jar --port 11981

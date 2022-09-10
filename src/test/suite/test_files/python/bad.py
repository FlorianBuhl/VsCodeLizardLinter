"""Module holding test class"""


class BadTestClass:
    """test class"""

    def __init__(self, test):
        self.test = test
        self.entries = []

    def add_entry(self, entry):
        """add entry"""
        self.entries.append(entry)

    def get_test(self):
        """get test"""
        return self.test

    def bad_function(self, date):
        """ Reports an entry which was done at the given date """

        for entry in self.entries:
            if entry["date"] == date:
                return entry["value"]

        return 0

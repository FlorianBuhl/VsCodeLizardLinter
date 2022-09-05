"""Module holding test class"""


class GoodTestClass:
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

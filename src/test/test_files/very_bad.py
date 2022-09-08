"""Module holding test class"""


def too_many_parameters(par1, par2, par3, par4, par5, par6):
    """ Reports an entry which was done at the given date """
    print("par 1" + par1 + "par 2" + par2 + "par 3" + par3, "par 4" + par4
            + "par 5" + par5 + "par 6" + par6)


def exactly_number_of_parameters(par1, par2, par3, par4, par5):
    """ Reports an entry which was done at the given date """
    print("par 1" + par1 + "par 2" + par2 + "par 3" + par3, "par 4" + par4
    + "par 5" + par5)


def too_long_function():       
    """ Reports an entry which was done at the given date """
    print("1")
    print("2")
    print("3")
    print("4")
    print("5")
    print("6")
    print("7")
    print("8")
    print("9")
    print("10")


def exactly_long_function(par1, par2, par3, par4, par5):
    """ Reports an entry which was done at the given date """
    print("1")
    print("2")
    print("3")
    print("4")
    print("5")
    print("6")
    print("7")
    print("8")
    print("9")


def too_many_tokens(a_a, b_b, c_c, d_d):
    """ This function has too many tokens """
    bad_class = BadTestClass("test")
    print("return" + bad_class.bad_function("hello") + a_a)
    print("return" + bad_class.bad_function("hello") + b_b)
    print("return" + bad_class.bad_function("hello") + c_c)
    print("return" + bad_class.bad_function("hello") + d_d)


class BadTestClass:
    """test class"""

    def __init__(self, test):
        self.test = test
        self.entries = []

    def bad_function(self, date):
        """ Reports an entry which was done at the given date """

        for entry in self.entries:
            if entry["date"] == date:
                return entry["value"]
        return 0

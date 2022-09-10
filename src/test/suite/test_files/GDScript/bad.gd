func bad_function(param1, param2):
    var local_var = 5

    for i in range(20):
      if param1 < local_var:
          print(param1)
          
    var local_var2 = param1 + 3
    return local_var2

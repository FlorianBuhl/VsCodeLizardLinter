function bad_function() {
  let i = 0;
  let toReturn;
  for (i = 0; i < 10; i += 1) {
    if (i === 3) {
      toReturn = 10;
    }
  }
  return toReturn;
}
